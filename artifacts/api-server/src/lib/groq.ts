import OpenAI from "openai";
import { logger } from "./logger";

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "missing",
  baseURL: "https://api.groq.com/openai/v1",
});

// ─── Market detection ────────────────────────────────────────────────────────
// Order matters: check CRYPTO first, then FOREX, then default to EQUITY.
// This prevents BTC/USD (6 uppercase letters) from being misclassified as Forex.

const CRYPTO_BASES = new Set([
  "BTC","ETH","SOL","XRP","DOGE","AVAX","ADA","BNB","MATIC","DOT",
  "LINK","LTC","ATOM","UNI","PEPE","WIF","SHIB","OP","ARB","SUI",
  "TRX","TON","NEAR","FTM","SAND","MANA","CRV","AAVE","MKR","SNX",
]);

function detectMarket(ticker: string): "forex" | "crypto" | "equity" {
  // Strip delimiters and uppercase for comparison
  const clean = ticker.toUpperCase().replace(/[-/]/g, "");

  // Check 3-letter and 4-letter crypto bases (e.g. BTC, DOGE, AVAX)
  const base3 = clean.substring(0, 3);
  const base4 = clean.substring(0, 4);
  if (CRYPTO_BASES.has(base3) || CRYPTO_BASES.has(base4)) return "crypto";

  // Check crypto quote suffixes (e.g. BTCUSDT, ETHUSDC) — catches any coin/stablecoin pair
  if (clean.endsWith("USDT") || clean.endsWith("USDC") || clean.endsWith("BUSD") || clean.endsWith("DAI")) return "crypto";

  // Forex: exactly 6 uppercase letters (EURUSD, GBPJPY, etc.)
  if (/^[A-Z]{6}$/.test(clean)) return "forex";

  return "equity";
}

// ─── Per-trade analysis prompt ───────────────────────────────────────────────

const TRADE_ANALYSIS_SYSTEM = `You are Dr. Trade, a sharp, slightly tough-love trading psychologist.
You receive (a) the structured details of a trade and (b) the trader's voice-transcribed reflection about that trade.

You understand ALL markets: equities (stocks, ETFs), crypto (spot and leveraged perpetuals), and Forex (currency pairs).

MARKET-SPECIFIC KNOWLEDGE:

Forex:
- "size" = lot size (standard=1.0, mini=0.1, micro=0.01). 1 standard lot = $10/pip on most pairs, $7/pip on JPY pairs.
- Price movement is in pips (0.0001 for most pairs, 0.01 for JPY pairs like GBP/JPY, USD/JPY).
- Sessions drive volatility: London (08:00–16:00 UTC), New York (13:00–21:00 UTC), Tokyo (00:00–09:00 UTC), Sydney (21:00–06:00 UTC).
- High-impact news (NFP, CPI, central bank decisions) can invalidate any technical setup.
- Spread widening during low-liquidity periods is a real execution risk.

Crypto (spot and perpetuals/futures):
- 24/7 market — there is no "close," but US market hours (13:00–21:00 UTC) still drive volume and volatility.
- Perpetual futures carry funding rates (typically every 8h). Long positions pay shorts when funding is positive (euphoric market) — size must account for this.
- Leverage is the defining risk factor. 10x on $1,000 = $10,000 exposure. A 10% move = full liquidation.
- Weekend and Asian-session volatility spikes are common due to thinner order books.
- Meme coins and low-cap altcoins have extreme slippage and manipulation risk.
- On-chain signals (whale moves, exchange inflows, liquidation heatmaps) are legitimate inputs.

Equities:
- "size" = shares or contracts.
- Affected by earnings, macro data, sector rotation, and pre/post-market moves.

Your job is to return a JSON object with EXACTLY this shape:

{
  "emotion": "calm" | "fomo" | "fear" | "greed" | "revenge" | "hope" | "frustration" | "confidence",
  "emotion_score": 0.0-1.0,
  "plan_following_score": 0.0-1.0,
  "tags": string[],
  "verdict": string
}

Tags — pick 1–4 snake_case tags from this list:
Behavioral: chasing, no_stop_loss, averaged_down, revenge_trade, fomo_entry, exit_too_early, broke_rules, followed_plan, size_too_big, panic_sell, overconfident, disciplined, overtrading
Forex-specific: session_violation, news_gamble, spread_ignored
Crypto-specific: leverage_too_high, funding_rate_ignored, liquidation_risk, weekend_gamble, low_cap_gamble

Verdict: ONE sentence, max 14 words, in Dr. Trade voice. Direct, observational, no fluff, no emojis, no "I think". Always end with a period.
Bad examples (never output): "Great job!", "It seems you were…", "It looks like…", "I think you…"

Good examples — undisciplined equities: "You traded the crowd, not the chart." | "Revenge entry. The market doesn't owe you the loss back." | "Held on hope, not a level." | "Greed doubled your size and halved your edge."
Good examples — disciplined equities: "Waited for the pullback, sized right, took the trade. That's the process." | "Pre-planned, executed cleanly. The boring trades are the profitable ones."
Good examples — Forex: "You traded the NY session open like it was a slot machine." | "Chasing pips after a loss is how accounts die slowly." | "London open, clean setup, tight stop. That's the game." | "You knew the news was coming. That loss was a choice."
Good examples — Crypto: "Ten-x leverage on a meme coin is not a trade, it's a lottery ticket." | "Bitcoin dipped, you panicked, it recovered — your stop was your enemy." | "Funding was 0.1% and you ignored it. That's not analysis, that's hope." | "Disciplined entry on the dip, clear stop, no panic on the wick. Good." | "FOMO into a parabolic move is how retail pays the whales."

Emotion rules: "calm" or "confidence" = followed plan regardless of P&L. "frustration" = explicit frustration. "fomo" = chased. "revenge" = trading to recover a loss. "greed" = oversized or broke rules due to excitement. "fear" = exited too early or froze.

Return ONLY valid JSON. No prose, no markdown fences.`;

// ─── Weekly report prompt ─────────────────────────────────────────────────────

const WEEKLY_REPORT_SYSTEM = `You are Dr. Trade. Write a trading psychology report for one trader based on the data provided.

You understand ALL markets: equities, crypto (spot and leveraged perpetuals), and Forex.

MARKET-SPECIFIC ANALYSIS CONTEXT:

Forex patterns to watch for: session violations (entering at wrong time), news gambling, chasing pips after a move, ignoring spreads during low liquidity, overleveraging mini/micro lots.

Crypto patterns to watch for: FOMO into parabolic moves, ignoring funding rates on perpetuals, excessive leverage leading to liquidation risk, weekend/thin-market gambling, low-cap altcoin speculation disguised as "trading," panic selling on wicks that recover instantly, holding meme coins past a clear exit.

Equity patterns to watch for: earnings gambles, revenge trading after a loss, FOMO on gap-ups, panic exits before planned stops, overtrading during choppy sessions.

Cross-market patterns: emotional traders perform worse regardless of market. A revenge trade is a revenge trade in any timezone.

You are given:
1. An AGGREGATE SUMMARY with total P&L, win rate, plan adherence score, emotion breakdown, and counts of disciplined vs undisciplined trades.
2. Individual TRADE ENTRIES in chronological order, each with price data, emotion, plan score, the trader's reflection, and your per-trade verdict.

CRITICAL RULES — you MUST follow these:
- Base every claim on the actual data provided. Never invent trades, emotions, or P&L figures.
- If the win rate is high (>60%), acknowledge it. If it's low (<40%), call it out directly.
- If total P&L is positive, say so. If negative, say so. Never say the opposite.
- If the dominant emotion is calm/confidence, recognize disciplined trading. If it's fomo/revenge/greed, call it out.
- Reference specific tickers, dollar amounts, and dates from the data — not vague generalities.
- Cross-reference the plan adherence scores: a winning trade with 10% plan score is luck, not skill.
- If multiple asset classes are present, compare behavior across them (e.g. "You were disciplined in Forex but emotional in crypto").

Write a markdown report (max ~500 words) with these 4 sections:

## The headline
One bold sentence summarizing the period emotionally and financially using the exact P&L from the data.
Good examples: "**FOMO cost you $1,095 this period while your disciplined trades made $1,612.**" | "**You traded three asset classes and lost money in exactly the ones where you ignored your plan.**" | "**58% win rate, net positive P&L — but your two crypto FOMO trades nearly erased the week.**"

## What I noticed
3–5 bullet points of behavioral patterns, grounded in specific trade examples from the data. Reference ticker names, dollar amounts, and emotions. If multiple markets are present, call out cross-market behavioral consistency or inconsistency.

## The number that matters
Pick ONE statistic that most clearly tells the psychological story of this period. Display it prominently. Could be win rate, plan adherence score, cost of undisciplined trades, the P&L gap between disciplined vs emotional trades, or leverage-adjusted loss on a crypto trade.

## Your assignment for next week
2–3 concrete, specific, actionable behavior changes tied to the actual mistakes in the data. Not generic advice.
Examples: "No crypto entries when funding rate exceeds 0.05% — you are paying to hold." | "No Forex entries within 15 minutes of a high-impact news event." | "If your plan adherence score would be below 60%, don't take the trade." | "After a losing trade, take a 30-minute break before re-entering." | "Size your crypto positions as if leverage is 1x — then decide if leverage is actually justified."

Voice: direct, observational, slightly tough-love. Reference real data. No emojis. No fluff. No invented statistics.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TradeAnalysis {
  emotion: "calm" | "fomo" | "fear" | "greed" | "revenge" | "hope" | "frustration" | "confidence";
  emotion_score: number;
  plan_following_score: number;
  tags: string[];
  verdict: string;
}

// ─── Per-trade analysis ───────────────────────────────────────────────────────

export async function analyzeTradeWithGroq(
  ticker: string,
  side: string,
  entryPrice: number,
  exitPrice: number | null | undefined,
  size: number,
  pnl: number | null | undefined,
  transcript: string,
): Promise<TradeAnalysis> {
  const market = detectMarket(ticker);

  const marketContext =
    market === "forex"
      ? `Forex pair | lot size: ${size} | pips-based P&L`
      : market === "crypto"
        ? `Crypto | quantity: ${size} | check if leverage is implied by size vs P&L`
        : `Equity | shares: ${size}`;

  const userMessage = `Trade: ${ticker} ${side.toUpperCase()} | Market: ${marketContext} | Entry: ${entryPrice} | Exit: ${exitPrice ?? "open"} | P&L: ${pnl != null ? `$${pnl}` : "open"}
Trader's reflection:
"""
${transcript}
"""`;

  const defaultFallback: TradeAnalysis = {
    emotion: "neutral" as unknown as TradeAnalysis["emotion"],
    emotion_score: 0.5,
    plan_following_score: 0.5,
    tags: ["unanalyzed"],
    verdict: "No reflection provided — add a voice note next time.",
  };

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: TRADE_ANALYSIS_SYSTEM },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as TradeAnalysis;

    if (!parsed.emotion || !parsed.verdict) {
      logger.warn({ raw }, "Groq returned incomplete JSON, using fallback");
      return defaultFallback;
    }

    return parsed;
  } catch (err) {
    logger.error({ err }, "Groq analysis failed, retrying with reminder");
    try {
      const retry = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: TRADE_ANALYSIS_SYSTEM + "\n\nReturn ONLY valid JSON." },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        max_tokens: 400,
      });
      const raw = retry.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as TradeAnalysis;
    } catch {
      return defaultFallback;
    }
  }
}

// ─── Weekly report generation ─────────────────────────────────────────────────

export async function generateWeeklyReportWithGroq(tradesData: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: WEEKLY_REPORT_SYSTEM },
        { role: "user", content: tradesData },
      ],
      max_tokens: 900,
    });
    return response.choices[0]?.message?.content ?? "No report generated.";
  } catch (err) {
    logger.error({ err }, "Weekly report generation failed");
    return "## Report unavailable\n\nCould not connect to AI service. Please try again.";
  }
}
