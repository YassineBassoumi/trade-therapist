import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

const SEED_TRADES = [
  // --- Equities ---
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
    ticker: "MSFT",
    side: "long" as const,
    entryPrice: 398.0,
    exitPrice: 394.2,
    size: 25,
    pnl: -95,
    openedAt: new Date("2025-04-21T09:45:00Z"),
    closedAt: new Date("2025-04-21T10:30:00Z"),
    transcript: "I was already frustrated from a bad morning. This trade never should have happened. I was just clicking buttons. No setup, no reason, just needed to feel like I was doing something.",
    emotion: "frustration" as const,
    emotionScore: 0.86,
    planFollowingScore: 0.05,
    tags: ["revenge_trade", "broke_rules", "no_stop_loss"],
    verdict: "Trading while frustrated is gambling. Step away next time.",
  },
  // --- Forex ---
  {
    ticker: "EUR/USD",
    side: "long" as const,
    entryPrice: 1.0842,
    exitPrice: 1.0891,
    size: 1.0,
    pnl: 490,
    openedAt: new Date("2025-04-28T08:02:00Z"),
    closedAt: new Date("2025-04-28T10:45:00Z"),
    transcript: "London open setup. I spotted the Asian range breakout on EUR/USD forming right as London came in. Waited for the retest of the breakout level, entered at 1.0842 with a 15 pip stop, targeted 50 pips. Felt calm, no news risk on the calendar. Held through the pullback and hit target cleanly.",
    emotion: "calm" as const,
    emotionScore: 0.91,
    planFollowingScore: 0.96,
    tags: ["followed_plan", "disciplined"],
    verdict: "London open, clean retest, disciplined hold. That's the game.",
  },
  {
    ticker: "GBP/JPY",
    side: "long" as const,
    entryPrice: 192.45,
    exitPrice: 191.20,
    size: 0.5,
    pnl: -625,
    openedAt: new Date("2025-04-25T13:30:00Z"),
    closedAt: new Date("2025-04-25T14:15:00Z"),
    transcript: "I jumped into GBP/JPY at the New York open because it was flying. I saw it run 80 pips and I wanted in. No real setup, no defined stop, just chasing the spike. It reversed hard and I panicked out 125 pips down. That's basically $625 gone in 45 minutes.",
    emotion: "fomo" as const,
    emotionScore: 0.93,
    planFollowingScore: 0.04,
    tags: ["fomo_entry", "chasing", "no_stop_loss", "session_violation"],
    verdict: "Chasing pips after a move is how accounts die slowly.",
  },
  {
    ticker: "USD/CAD",
    side: "short" as const,
    entryPrice: 1.3658,
    exitPrice: 1.3612,
    size: 0.5,
    pnl: 230,
    openedAt: new Date("2025-04-24T13:45:00Z"),
    closedAt: new Date("2025-04-24T16:00:00Z"),
    transcript: "Oil inventory data was bearish for USD/CAD — I watched the data drop and waited for the initial spike to fade before shorting. Tight stop above the spike high, 45 pip target. Went smoothly. I stayed patient and let the setup come to me.",
    emotion: "confidence" as const,
    emotionScore: 0.85,
    planFollowingScore: 0.93,
    tags: ["followed_plan", "disciplined"],
    verdict: "Data-driven, patient entry. That's how fundamentals and technicals meet.",
  },
  {
    ticker: "EUR/GBP",
    side: "short" as const,
    entryPrice: 0.8534,
    exitPrice: 0.8571,
    size: 1.0,
    pnl: -370,
    openedAt: new Date("2025-04-23T07:00:00Z"),
    closedAt: new Date("2025-04-23T08:30:00Z"),
    transcript: "I shorted EUR/GBP right at the London open but honestly I hadn't done my homework. There was a UK inflation print due and I ignored it. The number came in hotter than expected, GBP spiked, and I was stopped out instantly. I knew about the news and traded anyway.",
    emotion: "greed" as const,
    emotionScore: 0.77,
    planFollowingScore: 0.1,
    tags: ["news_gamble", "broke_rules", "spread_ignored"],
    verdict: "You knew the news was coming. Trading into it was your choice and your loss.",
  },
  {
    ticker: "AUD/USD",
    side: "long" as const,
    entryPrice: 0.6412,
    exitPrice: 0.6388,
    size: 2.0,
    pnl: -480,
    openedAt: new Date("2025-04-22T22:15:00Z"),
    closedAt: new Date("2025-04-22T23:50:00Z"),
    transcript: "I was up on the week and I wanted to squeeze one more trade before the Sydney/Tokyo overlap. Saw AUD/USD looking weak and went long for a reversal. No real reason. I was bored and greedy. Lost 24 pips times two lots. Classic late-session mistake.",
    emotion: "greed" as const,
    emotionScore: 0.81,
    planFollowingScore: 0.08,
    tags: ["overtrading", "session_violation", "broke_rules"],
    verdict: "Boredom is expensive in Forex. The session was over — so was your edge.",
  },
];

router.post("/seed", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Delete all existing trades for this user (journals cascade automatically)
    const existing = await db
      .select({ id: tradesTable.id })
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id));

    if (existing.length > 0) {
      const ids = existing.map((t) => t.id);
      await db.delete(tradesTable).where(
        ids.length === 1
          ? eq(tradesTable.id, ids[0])
          : inArray(tradesTable.id, ids)
      );
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
