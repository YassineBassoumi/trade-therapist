import { Router, type IRouter } from "express";
import { db, tradesTable, journalsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { analyzeTradeWithGroq } from "../lib/groq";
import { CreateTradeBody, DeleteTradeParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /trades — list all trades with journals for the authenticated user
router.get("/trades", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const trades = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, req.user.id))
      .orderBy(desc(tradesTable.openedAt));

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

    const result = trades.map((trade) => {
      const journal = journalByTradeId.get(trade.id) ?? null;
      return {
        id: trade.id,
        userId: trade.userId,
        ticker: trade.ticker,
        side: trade.side,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice ?? null,
        size: trade.size,
        pnl: trade.pnl ?? null,
        openedAt: trade.openedAt.toISOString(),
        closedAt: trade.closedAt ? trade.closedAt.toISOString() : null,
        createdAt: trade.createdAt.toISOString(),
        journal: journal
          ? {
              id: journal.id,
              tradeId: journal.tradeId,
              transcript: journal.transcript,
              emotion: journal.emotion,
              emotionScore: journal.emotionScore,
              planFollowingScore: journal.planFollowingScore,
              tags: journal.tags,
              verdict: journal.verdict,
              createdAt: journal.createdAt.toISOString(),
            }
          : null,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list trades");
    res.status(500).json({ error: "Failed to list trades" });
  }
});

// POST /trades — create trade + run AI analysis
router.post("/trades", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateTradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = parsed.data;

  try {
    // Auto-calculate PnL if entry and exit provided
    let pnl = body.pnl ?? null;
    if (pnl === null && body.exitPrice != null) {
      const directionMultiplier = body.side === "long" ? 1 : -1;
      const priceDiff = body.exitPrice - body.entryPrice;
      const ticker = body.ticker.replace("/", "").toUpperCase();
      const isForex = /^[A-Z]{6}$/.test(ticker);
      const isJPYPair = isForex && ticker.endsWith("JPY");
      if (isForex) {
        // JPY-quoted pairs (GBP/JPY, USD/JPY, EUR/JPY):
        //   price is in JPY (e.g. 192.45), 1 pip = 0.01
        //   pip value ≈ $10 per lot → use ×1,000 for USD approximation
        // All other Forex pairs: price quoted in USD (EUR/USD etc.)
        //   1 pip = 0.0001, pip value = $10 per lot → use ×100,000
        const lotMultiplier = isJPYPair ? 1000 : 100000;
        pnl = directionMultiplier * priceDiff * body.size * lotMultiplier;
      } else {
        // Equity / crypto: size is shares or coins
        pnl = directionMultiplier * priceDiff * body.size;
      }
      pnl = Math.round(pnl * 100) / 100; // round to cents
    }

    const [trade] = await db
      .insert(tradesTable)
      .values({
        userId: req.user.id,
        ticker: body.ticker.toUpperCase(),
        side: body.side,
        entryPrice: body.entryPrice,
        exitPrice: body.exitPrice ?? null,
        size: body.size,
        pnl,
        openedAt: new Date(body.openedAt),
        closedAt: body.closedAt ? new Date(body.closedAt) : null,
      })
      .returning();

    // Run AI analysis
    const analysis = await analyzeTradeWithGroq(
      trade.ticker,
      trade.side,
      trade.entryPrice,
      trade.exitPrice,
      trade.size,
      trade.pnl,
      body.transcript,
    );

    const emotion = (["calm", "fomo", "fear", "greed", "revenge", "hope", "frustration", "confidence"].includes(analysis.emotion)
      ? analysis.emotion
      : "calm") as typeof journalsTable.$inferInsert["emotion"];

    const [journal] = await db
      .insert(journalsTable)
      .values({
        tradeId: trade.id,
        transcript: body.transcript,
        emotion,
        emotionScore: Math.min(1, Math.max(0, analysis.emotion_score)),
        planFollowingScore: Math.min(1, Math.max(0, analysis.plan_following_score)),
        tags: analysis.tags ?? [],
        verdict: analysis.verdict ?? "No verdict.",
      })
      .returning();

    res.status(201).json({
      id: trade.id,
      userId: trade.userId,
      ticker: trade.ticker,
      side: trade.side,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice ?? null,
      size: trade.size,
      pnl: trade.pnl ?? null,
      openedAt: trade.openedAt.toISOString(),
      closedAt: trade.closedAt ? trade.closedAt.toISOString() : null,
      createdAt: trade.createdAt.toISOString(),
      journal: {
        id: journal.id,
        tradeId: journal.tradeId,
        transcript: journal.transcript,
        emotion: journal.emotion,
        emotionScore: journal.emotionScore,
        planFollowingScore: journal.planFollowingScore,
        tags: journal.tags,
        verdict: journal.verdict,
        createdAt: journal.createdAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create trade");
    res.status(500).json({ error: "Failed to create trade" });
  }
});

// DELETE /trades/:id
router.delete("/trades/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = DeleteTradeParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid trade ID" });
    return;
  }

  try {
    const [trade] = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.id, parsed.data.id));

    if (!trade || trade.userId !== req.user.id) {
      res.status(404).json({ error: "Trade not found" });
      return;
    }

    await db.delete(tradesTable).where(eq(tradesTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete trade");
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

export default router;
