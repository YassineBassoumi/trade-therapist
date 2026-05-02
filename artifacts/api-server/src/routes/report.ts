import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable } from "@workspace/db";
import { eq, gte } from "drizzle-orm";
import { generateWeeklyReportWithGroq } from "../lib/groq";

const router: IRouter = Router();

router.post("/report/weekly", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trades = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id));

    const recentTrades = trades.filter((t) => new Date(t.openedAt) >= sevenDaysAgo);

    if (recentTrades.length === 0) {
      const fallback = trades.slice(0, 12); // Show most recent 12 if no trades this week
      if (fallback.length === 0) {
        res.json({
          markdown: "## No trades found\n\nStart journaling your trades to get a weekly psychology report from Dr. Trade.",
          generatedAt: new Date().toISOString(),
        });
        return;
      }
    }

    const tradesToReport = recentTrades.length > 0 ? recentTrades : trades.slice(0, 12);
    const tradeIds = tradesToReport.map((t) => t.id);

    const journals = tradeIds.length
      ? await db
          .select()
          .from(journalsTable)
          .where(
            tradeIds.length === 1
              ? eq(journalsTable.tradeId, tradeIds[0])
              : journalsTable.tradeId.in(tradeIds),
          )
      : [];

    const journalByTradeId = new Map(journals.map((j) => [j.tradeId, j]));

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

    const tradesData = lines.join("\n");
    const markdown = await generateWeeklyReportWithGroq(tradesData);

    res.json({
      markdown,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate weekly report");
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
