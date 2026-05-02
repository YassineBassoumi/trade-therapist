# Trade Therapist — FINAL Buildathon Brief (Groq + Web Speech, $0 cost)

> Voice-journal after every trade. AI detects your emotional state, tags behavioral patterns (FOMO, revenge, discipline), and gives you a weekly psychology report. **Differentiator: emotional/behavioral, not numerical.**

This is the single source of truth. Everything is consolidated. Just start building.

---

## 1. Why this can win

Most trading journals are spreadsheets with charts. Judges have seen 50 of those. **Yours is a therapist.** That's the hook in one sentence — and one-sentence hooks win demos.

The wow moment: judge speaks 20 seconds of "I bought TSLA at 250 because everyone on Twitter was pumping it and I didn't want to miss out…" → 4 seconds later the screen shows: **Emotion: FOMO (0.91) · Plan-following: 0.12 · Tag: revenge-adjacent · Verdict: "You traded the crowd, not the chart."**

That single beat sells the product.

---

## 2. Brutal 24h scope

### IN scope (ship these)
1. **Auth** — Replit Auth, single user table.
2. **Trade entry form** — ticker, side (long/short), entry, exit (optional, can mark "open"), size, P&L (auto-calc if exit filled), date.
3. **Voice journal** — record reflection in browser via Web Speech API; transcript appears live in a textbox; submit transcript with the trade. **No audio file is uploaded to the server.**
4. **AI analysis** — for each journal, return:
   - emotion (one of: calm, fomo, fear, greed, revenge, hope, frustration, confidence)
   - emotion_score (0–1)
   - plan_following_score (0–1)
   - tags[] (e.g. `["chasing", "no_stop_loss", "averaged_down"]`)
   - one-line verdict (Dr. Trade voice — see prompt below)
5. **Dashboard** — list of trades with emotion chips, P&L, and verdict.
6. **Insights view** — 3 hard-coded but real charts:
   - Win rate by emotion (bar)
   - P&L by hour-of-day (bar)
   - Trigger word frequency (e.g. "everyone", "should have", "I knew it") (cloud or bar)
7. **Weekly report button** — generates a markdown report in Dr. Trade's voice ("This week you traded with FOMO 6 times. You won 1 of those…").
8. **Demo seed data** — pre-populate ~12 fake trades with varied emotional profiles so charts look real on first login. Critical for demo.

### OUT of scope (cut ruthlessly)
- Real broker integration. Don't even open the IBKR/Alpaca docs.
- Real-time prices. Not needed.
- Multi-user / social. Save for v2.
- Mobile app. Web only, but make it look good on a phone-width screen.
- Backtesting. Not the angle.
- Payments / Stripe. Show "Pro $19/mo" button that opens a modal "coming soon" — that's enough to signal monetization to judges.
- Server-side audio handling, file uploads, Whisper. Web Speech does it all in the browser.

---

## 3. 60-second demo script (work backwards from this)

```
[0:00] "Trading journals tell you what you traded.
        Trade Therapist tells you WHY — and stops you from doing it again."

[0:08] *Click "New Trade" → fill ticker TSLA, long, +$420*
        *Click mic → speak 15s of clearly-FOMO-coded reflection*
        *Live transcript appears in the textbox as you speak*

[0:30] *Click Submit → AI analysis card pops in*
        "Emotion: FOMO 0.91. Plan-following: 0.12.
         Dr. Trade says: 'You traded the crowd, not the chart.'"

[0:38] *Click Insights tab*
        "Across my last 12 trades, I win 71% when I'm calm — and 14% when I'm in FOMO."

[0:50] *Click Weekly Report*
        *Markdown report fades in, judge reads first sentence*
        "This week, FOMO cost you $1,840."

[0:58] "That's Trade Therapist. Thank you."
```

Build this demo path **first**, then add everything else. If you're behind at hour 18, the demo path still has to work.

---

## 4. Tech stack (zero cost, Replit-friendly)

| Layer | Pick | Why |
|---|---|---|
| Runtime | Node.js + Express | Whatever Replit Agent defaults to — don't fight it |
| DB | Postgres (Replit-hosted) | Real charts need it |
| Frontend | Plain HTML + Tailwind via CDN | Avoid heavy SPA setup |
| Auth | Replit Auth | One line, done |
| Transcription | **Browser Web Speech API** | FREE, no key, instant, runs in Chrome |
| Analysis | **Groq + `llama-3.3-70b-versatile`** | FREE tier, ~600 tok/sec, OpenAI-compatible |
| Charts | Chart.js via CDN | One script tag, done |

**Get your free Groq key:** https://console.groq.com/keys (no credit card). Add to Replit Secrets as `GROQ_API_KEY`.

---

## 5. Replit Agent build prompt (paste this in)

> Build a web app called **"Trade Therapist"** — an AI-powered trading journal that analyzes the trader's emotional state from voice reflections.
>
> **Stack:** Node.js + Express backend, vanilla HTML + Tailwind (CDN) frontend, Postgres for storage, Replit Auth for login. Use **Groq's OpenAI-compatible API** for analysis (model `llama-3.3-70b-versatile`, base URL `https://api.groq.com/openai/v1`, key from env var `GROQ_API_KEY`). Use the **browser Web Speech API** for transcription — do **not** upload audio to the server, just send the transcribed text as a form field.
>
> **Pages:**
> 1. `/` — landing page with hero "Your trades have feelings. We listen." and a "Start journaling" CTA.
> 2. `/dashboard` — list of trades, each row showing ticker, side, P&L, emotion chip (color-coded), and Dr. Trade's one-line verdict. "New Trade" button at the top.
> 3. `/trades/new` — form for ticker, side (long/short), entry price, exit price, size, date. Below the form, a big mic button that toggles Web Speech API recording (max 60s). Live transcript appears in a textarea below the mic button as the user speaks. On submit, send `{trade fields, transcript}` as JSON.
> 4. `/insights` — three Chart.js charts: win rate by emotion (bar), P&L by hour-of-day (bar), top trigger words (horizontal bar).
> 5. `/report/weekly` — generates and displays a markdown psychology report for the past 7 days, written in the Dr. Trade voice (see system prompt below).
>
> **DB schema:**
> - `users`: id, email, created_at
> - `trades`: id, user_id, ticker, side, entry_price, exit_price, size, pnl, opened_at, closed_at, created_at
> - `journals`: id, trade_id, transcript, emotion, emotion_score, plan_following_score, tags (json), verdict, created_at
>
> **API endpoints:**
> - `POST /api/trades` — accept JSON body with trade fields + `transcript` string. Run analysis prompt against Groq, save trade + journal rows, return the full analyzed trade.
> - `GET /api/trades` — list user's trades + their journals.
> - `GET /api/insights` — return aggregated data for the 3 charts.
> - `POST /api/report/weekly` — generate markdown report via Groq.
>
> **Seed data:** insert 12 fake trades with realistic transcripts spanning multiple emotions (calm, fomo, fear, greed, revenge, hope) on first login so the dashboard looks alive immediately.
>
> **Styling:** dark theme, accent color emerald-400 for wins, rose-400 for losses, slate-900 background. Use Inter font from Google Fonts. Make emotion chips colored: calm=blue, fomo=orange, fear=purple, greed=yellow, revenge=red, hope=pink, frustration=rose, confidence=emerald.
>
> **Dr. Trade persona:** see the system prompt section. Use it for both per-trade verdict generation and the weekly report.
>
> **Groq client init (Node.js):**
> ```js
> import OpenAI from "openai";
> const groq = new OpenAI({
>   apiKey: process.env.GROQ_API_KEY,
>   baseURL: "https://api.groq.com/openai/v1",
> });
> ```
>
> Ship a working demo end-to-end before adding polish. The critical path is: log in → new trade → record voice (browser transcribes) → submit → see analysis → view insights → view weekly report.

---

## 6. AI prompts

### 6a. Per-trade analysis system prompt

```
You are Dr. Trade, a sharp, slightly tough-love trading psychologist.
You receive (a) the structured details of a trade and (b) the trader's
voice-transcribed reflection about that trade.

Your job is to return a JSON object with EXACTLY this shape:

{
  "emotion": "calm" | "fomo" | "fear" | "greed" | "revenge" | "hope" | "frustration" | "confidence",
  "emotion_score": 0.0-1.0,
  "plan_following_score": 0.0-1.0,
  "tags": string[],   // 1-4 tags, snake_case, from the trader's behavior
                      // e.g. "chasing", "no_stop_loss", "averaged_down",
                      // "revenge_trade", "fomo_entry", "exit_too_early",
                      // "broke_rules", "followed_plan", "size_too_big"
  "verdict": string   // ONE sentence, max 14 words, in Dr. Trade voice.
                      // Direct, observational, no fluff, no emojis,
                      // no "I think". Reads like a coach, not a chatbot.
                      // Examples:
                      //   "You traded the crowd, not the chart."
                      //   "Revenge entry. The market doesn't owe you the loss back."
                      //   "Clean setup, clean execution. Do this 100 more times."
                      //   "You knew the plan. You also knew you'd break it."
}

Return ONLY the JSON. No prose, no markdown fences.
```

User message format:
```
Trade: {ticker} {side} entry={entry} exit={exit} size={size} pnl={pnl}
Reflection: """
{transcript}
"""
```

Call it with `response_format: { type: "json_object" }` for cleaner parsing.

### 6b. Weekly report system prompt

```
You are Dr. Trade. Write a weekly trading psychology report for one trader.

You are given a list of their trades and journal entries from the past 7 days.
Write a markdown report (max ~400 words) with these sections:

## The headline
One bold sentence summarizing the week emotionally and financially.
Example: "This week, FOMO cost you $1,840."

## What I noticed
3-5 bullet points of behavioral patterns, with specific examples
(quote short fragments from their reflections when useful).

## The number that matters
Pick ONE statistic that tells the story. Show it big.
Example: "Win rate when calm: 71%. Win rate in FOMO: 14%."

## Your assignment for next week
2-3 concrete, specific behaviors to change. Not "be more disciplined" —
"no entries within 10 minutes of opening bell on red days," that level.

Voice: direct, observational, slightly tough-love. No emojis. No fluff.
You are a coach who has seen 10,000 traders and has no patience for excuses,
but genuinely wants this person to win.
```

---

## 7. Browser Web Speech transcription (drop in `/trades/new`)

```html
<button id="mic" type="button">Start recording</button>
<textarea id="transcript" name="transcript" placeholder="Your reflection will appear here..." rows="5"></textarea>

<script>
const Recog = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!Recog) {
  document.getElementById("mic").disabled = true;
  document.getElementById("mic").textContent = "Voice not supported — type instead";
} else {
  const recog = new Recog();
  recog.continuous = true;
  recog.interimResults = true;
  recog.lang = "en-US";

  let finalText = "";
  let recording = false;
  const btn = document.getElementById("mic");
  const ta = document.getElementById("transcript");

  recog.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t + " ";
      else interim += t;
    }
    ta.value = finalText + interim;
  };

  recog.onerror = (e) => {
    console.error("Speech recognition error:", e.error);
    btn.textContent = "Start recording";
    recording = false;
  };

  btn.onclick = () => {
    if (recording) {
      recog.stop();
      btn.textContent = "Start recording";
      recording = false;
    } else {
      finalText = ta.value ? ta.value + " " : "";
      recog.start();
      btn.textContent = "Stop";
      recording = true;
      setTimeout(() => { if (recording) { recog.stop(); btn.textContent = "Start recording"; recording = false; } }, 60000);
    }
  };
}
</script>
```

The form just submits `transcript` as a regular field. No audio upload, no multipart, no server-side audio handling.

---

## 8. Hour-by-hour plan (24h)

| Hour | Task |
|---|---|
| 0–2 | Replit Agent scaffold: Express + Postgres + Auth + empty pages. Verify deploy works. Add `GROQ_API_KEY` to Secrets and verify it's loaded. |
| 2–4 | DB schema + `/api/trades` POST/GET. Manually test with Postman or curl. |
| 4–6 | Trade entry form + Web Speech transcription block. Verify live transcript shows in textarea. |
| 6–9 | Wire `/api/trades` POST to Groq with the Dr. Trade system prompt. Verify JSON parses. **Critical path.** |
| 9–11 | Dashboard renders trades + emotion chips + verdict. **Demo path 1 of 3 complete.** |
| 11–13 | Insights page: 3 Chart.js charts wired to `/api/insights`. |
| 13–14 | Weekly report endpoint + page. **Demo path complete.** |
| 14–16 | Seed 12 demo trades + transcripts. Polish dashboard styling. |
| 16–18 | Landing page + onboarding polish. Make the hero unforgettable. |
| 18–20 | Record demo video. Run the 60-second script 5 times until it's clean. |
| 20–22 | Buffer / fix demo bugs / write submission text. |
| 22–24 | Submit. Sleep. |

**If you're behind at hour 13: cut Insights, keep Weekly Report.** The report is the more emotional moment.

---

## 9. Things that will break (pre-debug them)

- **GROQ_API_KEY not set** — add a startup check that crashes loudly with `GROQ_API_KEY missing` rather than failing on the first request.
- **Groq returns non-JSON** — always pass `response_format: { type: "json_object" }`. Wrap the parse in try/catch, retry once with a `"return ONLY valid JSON"` reminder, fall back to a default record so the UI doesn't crash.
- **Web Speech permission denied** — show a clear message: "Allow microphone in your browser." Don't silently fail.
- **Web Speech only works in Chrome/Edge/Safari** — that's fine, you control the demo browser. Add a feature-detect fallback so Firefox users see "type your reflection" instead of a broken mic button.
- **Replit free DB cold starts** — the first request after idle may take 2-3s. Pre-warm by hitting the dashboard once before demo.
- **Demo wifi at the venue is bad** — pre-record a 30-second backup video of the demo flow before you leave home.

---

## 10. Submission copy (already drafted — use this for the form)

**Tagline:** Your trades have feelings. We listen.

**One-liner:** Trade Therapist is the first trading journal that analyzes your *emotional* P&L. Voice-record a 30-second reflection after every trade and our AI coach, Dr. Trade, identifies your emotional state, behavioral patterns, and tells you — bluntly — what's actually losing you money.

**Why we built it:** 90% of retail traders lose money. Almost none of it is because they don't know technical analysis. It's psychology. So we built a journal that takes psychology seriously.

**Tags:** trading-journal, ai-coach, psychology, voice-ai, fintech

---

## 11. Final advice

- **Build the demo path first, polish later.** A working 60s demo with ugly UI beats a beautiful half-finished app.
- **Seed data is not cheating.** It's the difference between "I see what this *would* show" and "holy shit, look at the chart."
- **The voice of Dr. Trade is the moat.** Spend real time on those prompts. Run 10 example trades through them and tune until the verdicts feel like a real coach, not ChatGPT.
- **Record your demo video before you're tired.** Hour 20, not hour 23.
- **One sanity check before hour 9:** make a single test call to Groq with the Dr. Trade system prompt and a fake transcript. Verify the JSON parses. If yes, the rest is plumbing. If no, fix the prompt now, not at hour 22.

Good luck. Go win.
