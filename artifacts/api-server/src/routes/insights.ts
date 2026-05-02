import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

const TRIGGER_WORDS = [
  "everyone", "should have", "i knew it", "fomo", "revenge", "panic",
  "missed", "should", "twitter", "reddit", "pump", "moon", "squeeze",
  "chasing", "too late", "waited", "broke rules", "emotional",
];

router.get("/insights", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const trades = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id));

    const tradeIds = trades.map((t) => t.id);
    const journals = tradeIds.length
      ? await db
          .select()
          .from(journalsTable)
          .where(
            tradeIds.length === 1
              ? eq(journalsTable.tradeId, tradeIds[0])
              : inArray(journalsTable.tradeId, tradeIds),
          )
      : [];

    const journalByTradeId = new Map(journals.map((j) => [j.tradeId, j]));

    // Win rate by emotion
    const emotionStats = new Map<string, { wins: number; total: number }>();
    for (const trade of trades) {
      const journal = journalByTradeId.get(trade.id);
      if (!journal) continue;
      const emotion = journal.emotion;
      if (!emotionStats.has(emotion)) emotionStats.set(emotion, { wins: 0, total: 0 });
      const stats = emotionStats.get(emotion)!;
      stats.total++;
      if ((trade.pnl ?? 0) > 0) stats.wins++;
    }

    const winRateByEmotion = Array.from(emotionStats.entries()).map(([emotion, stats]) => ({
      emotion,
      winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) / 100 : 0,
      tradeCount: stats.total,
    }));

    // P&L by hour
    const hourStats = new Map<number, { total: number; count: number }>();
    for (const trade of trades) {
      if (trade.pnl == null) continue;
      const hour = new Date(trade.openedAt).getHours();
      if (!hourStats.has(hour)) hourStats.set(hour, { total: 0, count: 0 });
      const h = hourStats.get(hour)!;
      h.total += trade.pnl;
      h.count++;
    }

    const pnlByHour = Array.from(hourStats.entries())
      .sort(([a], [b]) => a - b)
      .map(([hour, stats]) => ({
        hour,
        avgPnl: stats.count > 0 ? Math.round((stats.total / stats.count) * 100) / 100 : 0,
        tradeCount: stats.count,
      }));

    // Trigger word frequency
    const wordCounts = new Map<string, number>();
    for (const journal of journals) {
      const lower = journal.transcript.toLowerCase();
      for (const word of TRIGGER_WORDS) {
        const regex = new RegExp(word, "gi");
        const matches = lower.match(regex);
        if (matches) {
          wordCounts.set(word, (wordCounts.get(word) ?? 0) + matches.length);
        }
      }
    }

    const triggerWords = Array.from(wordCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Summary stats
    const totalTrades = trades.length;
    const tradesWithPnl = trades.filter((t) => t.pnl != null);
    const totalPnl = tradesWithPnl.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const wins = tradesWithPnl.filter((t) => (t.pnl ?? 0) > 0).length;
    const winRate = tradesWithPnl.length > 0 ? wins / tradesWithPnl.length : 0;

    const emotionCounts = new Map<string, number>();
    for (const j of journals) {
      emotionCounts.set(j.emotion, (emotionCounts.get(j.emotion) ?? 0) + 1);
    }
    const mostCommonEmotion = Array.from(emotionCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "calm";

    const calmStats = emotionStats.get("calm");
    const fomoStats = emotionStats.get("fomo");

    res.json({
      winRateByEmotion,
      pnlByHour,
      triggerWords,
      summary: {
        totalTrades,
        totalPnl: Math.round(totalPnl * 100) / 100,
        winRate: Math.round(winRate * 100) / 100,
        mostCommonEmotion,
        calmWinRate: calmStats && calmStats.total > 0 ? Math.round((calmStats.wins / calmStats.total) * 100) / 100 : null,
        fomoWinRate: fomoStats && fomoStats.total > 0 ? Math.round((fomoStats.wins / fomoStats.total) * 100) / 100 : null,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get insights");
    res.status(500).json({ error: "Failed to get insights" });
  }
});

export default router;
