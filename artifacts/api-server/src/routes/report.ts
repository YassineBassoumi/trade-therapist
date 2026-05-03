import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable, reportsTable } from "@workspace/db";
import { eq, gte, inArray, desc } from "drizzle-orm";
import { generateWeeklyReportWithGroq } from "../lib/groq";

const router: IRouter = Router();

// POST /api/report/weekly — generate and persist a new report
router.post("/report/weekly", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const weekEnd = new Date();
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trades = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id));

    const recentTrades = trades.filter((t) => new Date(t.openedAt) >= weekStart);
    const tradesToReport = recentTrades.length > 0 ? recentTrades : trades.slice(0, 12);

    if (tradesToReport.length === 0) {
      const emptyReport = await db
        .insert(reportsTable)
        .values({
          userId: req.user.id,
          markdown: "## No trades found\n\nStart journaling your trades to get a weekly psychology report from Dr. Trade.",
          weekStart,
          weekEnd,
          tradeCount: 0,
        })
        .returning();
      res.json(toSavedReport(emptyReport[0]));
      return;
    }

    const tradeIds = tradesToReport.map((t) => t.id);
    const journals = tradeIds.length
      ? await db
          .select()
          .from(journalsTable)
          .where(tradeIds.length === 1 ? eq(journalsTable.tradeId, tradeIds[0]) : inArray(journalsTable.tradeId, tradeIds))
      : [];

    const journalByTradeId = new Map(journals.map((j) => [j.tradeId, j]));

    // Compute summary stats for the report row
    const closedTrades = tradesToReport.filter((t) => t.pnl != null);
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
    const emotionCounts = new Map<string, number>();
    for (const j of journals) {
      emotionCounts.set(j.emotion, (emotionCounts.get(j.emotion) ?? 0) + 1);
    }
    let dominantEmotion: string | null = null;
    let maxCount = 0;
    for (const [emotion, count] of emotionCounts) {
      if (count > maxCount) { maxCount = count; dominantEmotion = emotion; }
    }

    // Build prompt for AI
    const lines: string[] = [`Trades and journal entries:\n`];
    for (const trade of tradesToReport) {
      const journal = journalByTradeId.get(trade.id);
      lines.push(
        `Trade: ${trade.ticker} ${trade.side} | Entry: $${trade.entryPrice} | Exit: ${trade.exitPrice ? `$${trade.exitPrice}` : "open"} | P&L: ${trade.pnl != null ? `$${trade.pnl.toFixed(2)}` : "unknown"} | Date: ${trade.openedAt.toISOString().split("T")[0]}`,
      );
      if (journal) {
        lines.push(`  Emotion: ${journal.emotion} (${(journal.emotionScore * 100).toFixed(0)}%) | Plan adherence: ${(journal.planFollowingScore * 100).toFixed(0)}% | Tags: ${journal.tags.join(", ")}`);
        lines.push(`  Reflection: "${journal.transcript}"`);
        lines.push(`  Dr. Trade said: "${journal.verdict}"`);
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
