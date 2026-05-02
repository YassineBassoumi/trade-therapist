import OpenAI from "openai";
import { logger } from "./logger";

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY ?? "missing",
  baseURL: "https://api.groq.com/openai/v1",
});

const TRADE_ANALYSIS_SYSTEM = `You are Dr. Trade, a sharp, slightly tough-love trading psychologist.
You receive (a) the structured details of a trade and (b) the trader's voice-transcribed reflection about that trade.

Your job is to return a JSON object with EXACTLY this shape:

{
  "emotion": "calm" | "fomo" | "fear" | "greed" | "revenge" | "hope" | "frustration" | "confidence",
  "emotion_score": 0.0-1.0,
  "plan_following_score": 0.0-1.0,
  "tags": string[],
  "verdict": string
}

Tags should be 1-4 snake_case behavioral tags from: chasing, no_stop_loss, averaged_down, revenge_trade, fomo_entry, exit_too_early, broke_rules, followed_plan, size_too_big, panic_sell, overconfident, disciplined.

Verdict: ONE sentence, max 14 words, in Dr. Trade voice. Direct, observational, no fluff, no emojis, no "I think".
Examples: "You traded the crowd, not the chart." | "Revenge entry. The market doesn't owe you the loss back." | "Clean setup, clean execution. Do this 100 more times."

Return ONLY valid JSON. No prose, no markdown fences.`;

const WEEKLY_REPORT_SYSTEM = `You are Dr. Trade. Write a weekly trading psychology report for one trader.

You are given a list of their trades and journal entries from the past 7 days.
Write a markdown report (max ~400 words) with these sections:

## The headline
One bold sentence summarizing the week emotionally and financially.
Example: "**This week, FOMO cost you $1,840.**"

## What I noticed
3-5 bullet points of behavioral patterns, with specific examples.

## The number that matters
Pick ONE statistic that tells the story. Show it prominently.

## Your assignment for next week
2-3 concrete, specific behaviors to change. Not "be more disciplined" — "no entries within 10 minutes of opening bell on red days."

Voice: direct, observational, slightly tough-love. No emojis. No fluff.`;

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
  const userMessage = `Trade: ${ticker} ${side} entry=${entryPrice} exit=${exitPrice ?? "open"} size=${size} pnl=${pnl ?? "open"}
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
