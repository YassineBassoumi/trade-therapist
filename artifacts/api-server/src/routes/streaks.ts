import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

const router: IRouter = Router();

interface StreakStat { current: number; best: number }

function computeStreakFromBooleans(flags: boolean[]): StreakStat {
  // flags[0] = most recent trade/day. Count current from front, best over all.
  let current = 0;
  for (const passes of flags) {
    if (passes) current++;
    else break;
  }
  let best = 0;
  let run = 0;
  for (const passes of flags) {
    if (passes) { run++; best = Math.max(best, run); }
    else run = 0;
  }
  return { current, best };
}

router.get("/streaks", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Load all trades for the user, oldest-first for day bucketing
    const trades = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id));

    if (trades.length === 0) {
      res.json({
        calmWinStreak: { current: 0, best: 0 },
        disciplineStreak: { current: 0, best: 0 },
        fomoFreeDays: { current: 0, best: 0 },
      });
      return;
    }

    const tradeIds = trades.map((t) => t.id);
    const journals =
      tradeIds.length === 1
        ? await db.select().from(journalsTable).where(eq(journalsTable.tradeId, tradeIds[0]))
        : await db.select().from(journalsTable).where(inArray(journalsTable.tradeId, tradeIds));

    const journalMap = new Map(journals.map((j) => [j.tradeId, j]));

    // Enrich trades with their journals, sort newest-first for trade-level streaks
    const enriched = trades
      .map((t) => ({ trade: t, journal: journalMap.get(t.id) ?? null }))
      .sort((a, b) => b.trade.openedAt.getTime() - a.trade.openedAt.getTime());

    // ── 1. Calm Win Streak ────────────────────────────────────────────────────
    // Consecutive trades (newest → oldest) where emotion=calm AND pnl > 0
    const calmWinFlags = enriched.map(({ trade, journal }) =>
      journal?.emotion === "calm" && (trade.pnl ?? 0) > 0
    );
    const calmWinStreak = computeStreakFromBooleans(calmWinFlags);

    // ── 2. Discipline Streak ──────────────────────────────────────────────────
    // Consecutive trades where tags include "followed_plan"
    const disciplineFlags = enriched.map(({ journal }) =>
      (journal?.tags ?? []).includes("followed_plan")
    );
    const disciplineStreak = computeStreakFromBooleans(disciplineFlags);

    // ── 3. FOMO-Free Days ─────────────────────────────────────────────────────
    // Group trades by calendar date (UTC). A day is "fomo" if any trade that
    // day has emotion=fomo OR tags includes fomo_entry.
    const dayMap = new Map<string, boolean>(); // date-string → hadFomo
    for (const { trade, journal } of enriched) {
      const dateKey = trade.openedAt.toISOString().slice(0, 10); // "YYYY-MM-DD"
      const isFomo =
        journal?.emotion === "fomo" || (journal?.tags ?? []).includes("fomo_entry");
      if (!dayMap.has(dateKey)) dayMap.set(dateKey, isFomo);
      else if (isFomo) dayMap.set(dateKey, true); // any fomo trade poisons the day
    }

    // Sort days newest-first; flag = true means FOMO-FREE (no fomo that day)
    const sortedDays = [...dayMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]));
    const fomoFreeDayFlags = sortedDays.map(([, hadFomo]) => !hadFomo);
    const fomoFreeDays = computeStreakFromBooleans(fomoFreeDayFlags);

    res.json({ calmWinStreak, disciplineStreak, fomoFreeDays });
  } catch (err) {
    req.log.error({ err }, "Failed to compute streaks");
    res.status(500).json({ error: "Failed to compute streaks" });
  }
});

export default router;
