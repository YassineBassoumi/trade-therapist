import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SEED_TRADES = [
  {
    ticker: "TSLA",
    side: "long" as const,
    entryPrice: 248.5,
    exitPrice: 261.2,
    size: 50,
    pnl: 635,
    openedAt: new Date("2025-04-28T10:15:00Z"),
    closedAt: new Date("2025-04-28T14:30:00Z"),
    transcript: "I bought TSLA because everyone on Twitter was saying it was going to squeeze past 250. I didn't have a real plan, just jumped in because I was afraid of missing out.",
    emotion: "fomo" as const,
    emotionScore: 0.88,
    planFollowingScore: 0.15,
    tags: ["fomo_entry", "chasing"],
    verdict: "You traded the crowd, not the chart.",
  },
  {
    ticker: "AAPL",
    side: "long" as const,
    entryPrice: 172.3,
    exitPrice: 175.8,
    size: 100,
    pnl: 350,
    openedAt: new Date("2025-04-27T09:45:00Z"),
    closedAt: new Date("2025-04-27T15:20:00Z"),
    transcript: "Followed my setup perfectly. Waited for the pullback to the 50 EMA, got my entry, set my stop below the low, and took profit at my target. Felt calm and in control the whole time.",
    emotion: "calm" as const,
    emotionScore: 0.9,
    planFollowingScore: 0.95,
    tags: ["followed_plan", "disciplined"],
    verdict: "Clean setup, clean execution. Do this 100 more times.",
  },
  {
    ticker: "SPY",
    side: "short" as const,
    entryPrice: 512.0,
    exitPrice: 508.5,
    size: 30,
    pnl: 105,
    openedAt: new Date("2025-04-26T13:00:00Z"),
    closedAt: new Date("2025-04-26T15:45:00Z"),
    transcript: "I shorted SPY after the market opened flat. My thesis was that the afternoon weakness pattern holds. I was confident in my read and stuck to the plan.",
    emotion: "confidence" as const,
    emotionScore: 0.82,
    planFollowingScore: 0.9,
    tags: ["followed_plan"],
    verdict: "Thesis-driven, executed well. This is what control looks like.",
  },
  {
    ticker: "NVDA",
    side: "long" as const,
    entryPrice: 875.0,
    exitPrice: 851.2,
    size: 20,
    pnl: -476,
    openedAt: new Date("2025-04-25T10:30:00Z"),
    closedAt: new Date("2025-04-25T11:00:00Z"),
    transcript: "I lost $200 on AMD yesterday and I was furious. I jumped into NVDA to try to make it back quickly. I sized up too much and the trade went against me immediately. I held too long hoping it'd come back.",
    emotion: "revenge" as const,
    emotionScore: 0.92,
    planFollowingScore: 0.05,
    tags: ["revenge_trade", "size_too_big", "broke_rules"],
    verdict: "Revenge entry. The market doesn't owe you the loss back.",
  },
  {
    ticker: "META",
    side: "long" as const,
    entryPrice: 495.0,
    exitPrice: 502.3,
    size: 40,
    pnl: 292,
    openedAt: new Date("2025-04-24T09:35:00Z"),
    closedAt: new Date("2025-04-24T13:00:00Z"),
    transcript: "I saw the breakout forming pre-market and waited for the confirmation candle. I was a little nervous when it pulled back to the breakout level but I trusted my analysis and held.",
    emotion: "calm" as const,
    emotionScore: 0.75,
    planFollowingScore: 0.85,
    tags: ["followed_plan", "disciplined"],
    verdict: "Good hold under pressure. That's how breakouts work.",
  },
  {
    ticker: "AMZN",
    side: "long" as const,
    entryPrice: 182.5,
    exitPrice: 179.8,
    size: 60,
    pnl: -162,
    openedAt: new Date("2025-04-23T14:00:00Z"),
    closedAt: new Date("2025-04-23T15:30:00Z"),
    transcript: "I was scared the Fed was going to say something bad and I bailed on my position early. I had a target at 188 and I exited at 179 just because I was anxious about the news.",
    emotion: "fear" as const,
    emotionScore: 0.84,
    planFollowingScore: 0.2,
    tags: ["panic_sell", "exit_too_early", "broke_rules"],
    verdict: "Fear exit. You paid a $162 lesson in trusting your stops, not your anxiety.",
  },
  {
    ticker: "QQQ",
    side: "long" as const,
    entryPrice: 438.0,
    exitPrice: 441.5,
    size: 80,
    pnl: 280,
    openedAt: new Date("2025-04-22T09:30:00Z"),
    closedAt: new Date("2025-04-22T10:15:00Z"),
    transcript: "Opening bell momentum trade. I had my level pre-planned and executed at the open. Quick in, quick out. No drama.",
    emotion: "calm" as const,
    emotionScore: 0.88,
    planFollowingScore: 0.92,
    tags: ["followed_plan", "disciplined"],
    verdict: "Pre-planned, executed cleanly. The boring trades are the profitable ones.",
  },
  {
    ticker: "COIN",
    side: "long" as const,
    entryPrice: 215.0,
    exitPrice: 208.5,
    size: 35,
    pnl: -227.5,
    openedAt: new Date("2025-04-21T11:00:00Z"),
    closedAt: new Date("2025-04-21T13:30:00Z"),
    transcript: "Bitcoin was pumping and I thought COIN would rocket. I bought without checking the technicals, no stop loss set, just hoping it would moon with crypto. It didn't.",
    emotion: "greed" as const,
    emotionScore: 0.79,
    planFollowingScore: 0.1,
    tags: ["no_stop_loss", "fomo_entry", "broke_rules"],
    verdict: "Hope is not a strategy. Where was your stop?",
  },
  {
    ticker: "AMD",
    side: "short" as const,
    entryPrice: 158.0,
    exitPrice: 152.3,
    size: 50,
    pnl: 285,
    openedAt: new Date("2025-04-18T10:00:00Z"),
    closedAt: new Date("2025-04-18T15:00:00Z"),
    transcript: "I'd been watching AMD break down for two days. This was a planned short with a clear level. I set my stop, held through the noise, and hit my target. This is what patience looks like.",
    emotion: "confidence" as const,
    emotionScore: 0.87,
    planFollowingScore: 0.94,
    tags: ["followed_plan", "disciplined"],
    verdict: "Patience, planning, execution. You finally trusted your process.",
  },
  {
    ticker: "GOOG",
    side: "long" as const,
    entryPrice: 162.0,
    exitPrice: 164.5,
    size: 70,
    pnl: 175,
    openedAt: new Date("2025-04-17T13:30:00Z"),
    closedAt: new Date("2025-04-17T15:00:00Z"),
    transcript: "Bought GOOG after the dip on AI news. I felt hopeful that it would recover. Lucky it did but I didn't really have a clear level, I was just guessing it was oversold.",
    emotion: "hope" as const,
    emotionScore: 0.7,
    planFollowingScore: 0.35,
    tags: ["chasing", "broke_rules"],
    verdict: "Lucky this time. Hope won't carry you through the bad weeks.",
  },
  {
    ticker: "MSFT",
    side: "long" as const,
    entryPrice: 398.0,
    exitPrice: 394.2,
    size: 25,
    pnl: -95,
    openedAt: new Date("2025-04-16T09:45:00Z"),
    closedAt: new Date("2025-04-16T10:30:00Z"),
    transcript: "I was already frustrated from a bad morning. This trade never should have happened. I was just clicking buttons. No setup, no reason, just needed to feel like I was doing something.",
    emotion: "frustration" as const,
    emotionScore: 0.86,
    planFollowingScore: 0.05,
    tags: ["revenge_trade", "broke_rules", "no_stop_loss"],
    verdict: "Trading while frustrated is gambling. Step away next time.",
  },
  {
    ticker: "SPY",
    side: "long" as const,
    entryPrice: 508.5,
    exitPrice: 511.2,
    size: 100,
    pnl: 270,
    openedAt: new Date("2025-04-15T09:30:00Z"),
    closedAt: new Date("2025-04-15T11:00:00Z"),
    transcript: "Textbook morning trade. SPY bounced off the VWAP exactly where I expected, I entered with a tight stop and took 60% off at the first target, let the rest run. Everything felt right.",
    emotion: "calm" as const,
    emotionScore: 0.92,
    planFollowingScore: 0.97,
    tags: ["followed_plan", "disciplined"],
    verdict: "Textbook. When you operate this way, let the wins compound.",
  },
];

router.post("/seed", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Check if user already has trades
    const existing = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id));

    if (existing.length > 0) {
      res.json({ message: "Already seeded", count: existing.length });
      return;
    }

    let seeded = 0;
    for (const seed of SEED_TRADES) {
      const [trade] = await db
        .insert(tradesTable)
        .values({
          userId: req.user.id,
          ticker: seed.ticker,
          side: seed.side,
          entryPrice: seed.entryPrice,
          exitPrice: seed.exitPrice,
          size: seed.size,
          pnl: seed.pnl,
          openedAt: seed.openedAt,
          closedAt: seed.closedAt,
        })
        .returning();

      await db.insert(journalsTable).values({
        tradeId: trade.id,
        transcript: seed.transcript,
        emotion: seed.emotion,
        emotionScore: seed.emotionScore,
        planFollowingScore: seed.planFollowingScore,
        tags: seed.tags,
        verdict: seed.verdict,
      });

      seeded++;
    }

    res.json({ message: "Seeded successfully", count: seeded });
  } catch (err) {
    req.log.error({ err }, "Failed to seed data");
    res.status(500).json({ error: "Failed to seed data" });
  }
});

export default router;
