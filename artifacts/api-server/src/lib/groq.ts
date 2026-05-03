import OpenAI from "openai";
import { logger } from "./logger";

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "missing",
  baseURL: "https://api.groq.com/openai/v1",
});

const TRADE_ANALYSIS_SYSTEM = `You are Dr. Trade, a sharp, slightly tough-love trading psychologist.
You receive (a) the structured details of a trade and (b) the trader's voice-transcribed reflection about that trade.

You understand ALL markets: equities (stocks, ETFs), crypto, and Forex (currency pairs like EUR/USD, GBP/JPY).
For Forex trades: interpret "size" as lot size (standard=1.0, mini=0.1, micro=0.01). Price movement is in pips (0.0001 for most pairs, 0.01 for JPY pairs). P&L is typically in account currency.
For equities: size is shares or contracts.
For crypto: size is coin quantity.

Your job is to return a JSON object with EXACTLY this shape:

{
  "emotion": "calm" | "fomo" | "fear" | "greed" | "revenge" | "hope" | "frustration" | "confidence",
  "emotion_score": 0.0-1.0,
  "plan_following_score": 0.0-1.0,
  "tags": string[],
  "verdict": string
}

Tags should be 1-4 snake_case behavioral tags from: chasing, no_stop_loss, averaged_down, revenge_trade, fomo_entry, exit_too_early, broke_rules, followed_plan, size_too_big, panic_sell, overconfident, disciplined, overtrading, session_violation, news_gamble, spread_ignored.

Verdict: ONE sentence, max 14 words, in Dr. Trade voice. Direct, observational, no fluff, no emojis, no "I think". Always end with a period.
Bad examples (never output these): "Great job!", "It seems you were…", "It looks like…", "I think you…", "Well done!"
Good examples — undisciplined equities: "You traded the crowd, not the chart." | "Revenge entry. The market doesn't owe you the loss back." | "Held on hope, not a level." | "Greed doubled your size and halved your edge."
Good examples — disciplined equities: "Waited for the pullback, sized right, took the trade. That's the process." | "Plan-to-execution ratio: perfect. Results follow consistency, not this trade." | "Small size, clean entry — this is what good trading looks like."
Good examples — Forex: "You traded the NY session open like it was a slot machine." | "Chasing pips after a loss is how accounts die slowly." | "London open, clean setup, tight stop. That's the game."

Emotion rules: use "calm" or "confidence" when the trader followed their plan, regardless of P&L. Reserve "frustration" for when they express frustration explicitly. "fomo" = chased. "revenge" = traded to recover a loss. "greed" = oversized or broke rules due to excitement. "fear" = exited too early or froze.

Return ONLY valid JSON. No prose, no markdown fences.`;

const WEEKLY_REPORT_SYSTEM = `You are Dr. Trade. Write a trading psychology report for one trader based on the data provided.

You understand ALL markets: equities, crypto, and Forex. When the trader trades Forex, reference session-specific behavior (London, New York, Tokyo, Sydney opens), pip discipline, lot sizing, and spread awareness.

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

Write a markdown report (max ~450 words) with these 4 sections:

## The headline
One bold sentence summarizing the period emotionally and financially using the exact P&L from the data.
Good examples: "**FOMO cost you $1,095 this period while your disciplined trades made $1,612.**" | "**You followed your plan 7 out of 12 trades and it showed in the P&L.**" | "**A net positive week — but three undisciplined trades nearly erased it.**"

## What I noticed
3-5 bullet points of behavioral patterns, grounded in specific trade examples from the data. Reference ticker names, dollar amounts, and emotions. Show the contrast between disciplined and undisciplined trades if both exist.

## The number that matters
Pick ONE statistic that most clearly tells the psychological story of this period. Display it prominently. Could be win rate, plan adherence score, the P&L gap between emotional vs calm trades, or cost of undisciplined trades.

## Your assignment for next week
2-3 concrete, specific, actionable behavior changes — not generic advice. Examples: "No Forex entries within 15 minutes of a high-impact news event." | "If your plan adherence score would be below 60%, don't take the trade." | "After a losing trade, take a 30-minute break before re-entering."

Voice: direct, observational, slightly tough-love. Reference real data. No emojis. No fluff. No invented statistics.`;

export interface TradeAnalysis {
  emotion: "calm" | "fomo" | "fear" | "greed" | "revenge" | "hope" | "frustration" | "confidence";
  emotion_score: number;
  plan_following_score: number;
  tags: string[];
  verdict: string;
}

export async function analyzeTradeWithGroq(
  ticker: string,
  side: string,
  entryPrice: number,
  exitPrice: number | null | undefined,
  size: number,
  pnl: number | null | undefined,
  transcript: string,
): Promise<TradeAnalysis> {
  const isForex = /^[A-Z]{3}[/]?[A-Z]{3}$/.test(ticker.replace("/", ""));
  const marketContext = isForex
    ? `Forex pair (lot size: ${size}, pips-based)`
    : ticker.includes("-") || ["BTC", "ETH", "SOL", "XRP"].some(c => ticker.startsWith(c))
      ? `Crypto (quantity: ${size})`
      : `Equity (shares: ${size})`;

  const userMessage = `Trade: ${ticker} ${side} | Market: ${marketContext} | entry=${entryPrice} exit=${exitPrice ?? "open"} pnl=${pnl ?? "open"}
Reflection: """
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

export async function generateWeeklyReportWithGroq(tradesData: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: WEEKLY_REPORT_SYSTEM },
        { role: "user", content: tradesData },
      ],
      max_tokens: 800,
    });
    return response.choices[0]?.message?.content ?? "No report generated.";
  } catch (err) {
    logger.error({ err }, "Weekly report generation failed");
    return "## Report unavailable\n\nCould not connect to AI service. Please try again.";
  }
}
