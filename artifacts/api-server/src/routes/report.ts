import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable, reportsTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { generateWeeklyReportWithGroq } from "../lib/groq";

const router: IRouter = Router();

// POST /api/report/weekly — generate and persist a new report
router.post("/report/weekly", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all user trades ordered by date descending
    const allTrades = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id))
      .orderBy(desc(tradesTable.openedAt));

    const recentTrades = allTrades.filter((t) => new Date(t.openedAt) >= sevenDaysAgo);

    // Use recent trades if available, otherwise fall back to ALL trades (sorted newest first)
    const tradesToReport = recentTrades.length > 0 ? recentTrades : allTrades;

    if (tradesToReport.length === 0) {
      const emptyReport = await db
        .insert(reportsTable)
        .values({
          userId: req.user.id,
          markdown: "## No trades found\n\nStart journaling your trades to get a weekly psychology report from Dr. Trade.",
          weekStart: sevenDaysAgo,
          weekEnd: now,
          tradeCount: 0,
        })
        .returning();
      res.json(toSavedReport(emptyReport[0]));
      return;
    }

    // Use actual trade date range for weekStart/weekEnd
    const sortedByDate = [...tradesToReport].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime());
    const weekStart = new Date(sortedByDate[0].openedAt);
    const weekEnd = new Date(sortedByDate[sortedByDate.length - 1].openedAt);

    // Fetch journals
    const tradeIds = tradesToReport.map((t) => t.id);
    const journals = tradeIds.length
      ? await db
          .select()
          .from(journalsTable)
          .where(tradeIds.length === 1 ? eq(journalsTable.tradeId, tradeIds[0]) : inArray(journalsTable.tradeId, tradeIds))
      : [];

    const journalByTradeId = new Map(journals.map((j) => [j.tradeId, j]));

    // Compute summary stats
    const closedTrades = tradesToReport.filter((t) => t.pnl != null);
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const winners = closedTrades.filter((t) => (t.pnl ?? 0) > 0);
    const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0;

    const emotionCounts = new Map<string, number>();
    for (const j of journals) {
      emotionCounts.set(j.emotion, (emotionCounts.get(j.emotion) ?? 0) + 1);
    }
    let dominantEmotion: string | null = null;
    let maxCount = 0;
    for (const [emotion, count] of emotionCounts) {
      if (count > maxCount) { maxCount = count; dominantEmotion = emotion; }
    }

    const avgPlanScore = journals.length > 0
      ? journals.reduce((sum, j) => sum + j.planFollowingScore, 0) / journals.length
      : 0;

    const disciplinedCount = journals.filter((j) => j.planFollowingScore >= 0.7).length;
    const undisciplinedCount = journals.filter((j) => j.planFollowingScore < 0.4).length;

    // Build a rich, structured prompt for the AI
    const dateLabel = recentTrades.length > 0
      ? `the past 7 days (${weekStart.toISOString().split("T")[0]} to ${weekEnd.toISOString().split("T")[0]})`
      : `the most recent ${tradesToReport.length} trades on record (${weekStart.toISOString().split("T")[0]} to ${weekEnd.toISOString().split("T")[0]})`;

    const summaryBlock = [
      `PERIOD: ${dateLabel}`,
      `TOTAL TRADES: ${tradesToReport.length} (${closedTrades.length} closed)`,
      `TOTAL P&L: ${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`,
      `WIN RATE: ${winRate.toFixed(1)}% (${winners.length} wins / ${closedTrades.length} closed)`,
      `AVG PLAN ADHERENCE SCORE: ${(avgPlanScore * 100).toFixed(0)}%`,
      `DISCIPLINED TRADES (score ≥ 70%): ${disciplinedCount}`,
      `UNDISCIPLINED TRADES (score < 40%): ${undisciplinedCount}`,
      `DOMINANT EMOTION: ${dominantEmotion ?? "N/A"}`,
      `EMOTION BREAKDOWN: ${Array.from(emotionCounts.entries()).map(([e, c]) => `${e}×${c}`).join(", ")}`,
    ].join("\n");

    // Build trade lines sorted chronologically
    const lines: string[] = [
      `=== AGGREGATE SUMMARY ===`,
      summaryBlock,
      ``,
      `=== INDIVIDUAL TRADES (chronological) ===`,
    ];

    for (const trade of sortedByDate) {
      const journal = journalByTradeId.get(trade.id);
      lines.push(
        `Trade: ${trade.ticker} ${trade.side.toUpperCase()} | Entry: ${trade.entryPrice} | Exit: ${trade.exitPrice ?? "open"} | P&L: ${trade.pnl != null ? `${trade.pnl >= 0 ? "+" : ""}$${trade.pnl.toFixed(2)}` : "unknown"} | Date: ${trade.openedAt.toISOString().split("T")[0]}`,
      );
      if (journal) {
        lines.push(`  Emotion: ${journal.emotion} (intensity ${(journal.emotionScore * 10).toFixed(1)}/10) | Plan score: ${(journal.planFollowingScore * 100).toFixed(0)}% | Tags: ${journal.tags.join(", ")}`);
        lines.push(`  Trader said: "${journal.transcript}"`);
        lines.push(`  Dr. Trade's verdict on this trade: "${journal.verdict}"`);
      } else {
        lines.push(`  No journal entry for this trade.`);
      }
      lines.push("");
    }

    const markdown = await generateWeeklyReportWithGroq(lines.join("\n"));

    const [saved] = await db
      .insert(reportsTable)
      .values({
        userId: req.user.id,
        markdown,
        weekStart,
        weekEnd,
        tradeCount: tradesToReport.length,
        totalPnl: closedTrades.length > 0 ? totalPnl : null,
        dominantEmotion,
      })
      .returning();

    res.json(toSavedReport(saved));
  } catch (err) {
    req.log.error({ err }, "Failed to generate weekly report");
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// GET /api/reports — list all saved reports for the user (newest first)
router.get("/reports", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const reports = await db
      .select({
        id: reportsTable.id,
        weekStart: reportsTable.weekStart,
        weekEnd: reportsTable.weekEnd,
        tradeCount: reportsTable.tradeCount,
        totalPnl: reportsTable.totalPnl,
        dominantEmotion: reportsTable.dominantEmotion,
        generatedAt: reportsTable.generatedAt,
      })
      .from(reportsTable)
      .where(eq(reportsTable.userId, req.user.id))
      .orderBy(desc(reportsTable.generatedAt));

    res.json(reports.map((r) => ({
      ...r,
      weekStart: r.weekStart.toISOString(),
      weekEnd: r.weekEnd.toISOString(),
      generatedAt: r.generatedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "Failed to list reports" });
  }
});

// GET /api/reports/:id — get a single saved report
router.get("/reports/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }
  try {
    const [report] = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.id, id));

    if (!report || report.userId !== req.user.id) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(toSavedReport(report));
  } catch (err) {
    req.log.error({ err }, "Failed to get report");
    res.status(500).json({ error: "Failed to get report" });
  }
});

// DELETE /api/reports/:id — delete a saved report
router.delete("/reports/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid report ID" });
    return;
  }
  try {
    const [report] = await db
      .select({ id: reportsTable.id, userId: reportsTable.userId })
      .from(reportsTable)
      .where(eq(reportsTable.id, id));

    if (!report || report.userId !== req.user.id) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    await db.delete(reportsTable).where(eq(reportsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete report");
    res.status(500).json({ error: "Failed to delete report" });
  }
});

function toSavedReport(r: typeof reportsTable.$inferSelect) {
  return {
    id: r.id,
    markdown: r.markdown,
    weekStart: r.weekStart.toISOString(),
    weekEnd: r.weekEnd.toISOString(),
    tradeCount: r.tradeCount,
    totalPnl: r.totalPnl ?? null,
    dominantEmotion: r.dominantEmotion ?? null,
    generatedAt: r.generatedAt.toISOString(),
  };
}

export default router;
