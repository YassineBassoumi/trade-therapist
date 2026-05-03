import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useState, useRef, useEffect, useMemo } from "react";
import { useCreateTrade, getListTradesQueryKey, type CreateTradeBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Loader2, ArrowLeft, Brain, TrendingUp, TrendingDown, CheckCircle2, Circle } from "lucide-react";
import { EmotionChip } from "@/components/emotion-chip";
import { toast } from "sonner";

type MarketType = "equity" | "forex" | "crypto";

const FOREX_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD",
  "EUR/GBP", "EUR/JPY", "GBP/JPY", "EUR/AUD", "AUD/JPY", "GBP/CHF",
];
const CRYPTO_EXAMPLES = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD"];

const MARKET_CONFIG: Record<MarketType, { label: string; icon: string; sizePlaceholder: string; sizeLabel: string; sizeHint: string; pricePlaceholder: string; tickerPlaceholder: string }> = {
  equity: { label: "Stocks / ETFs", icon: "📈", sizePlaceholder: "100", sizeLabel: "Shares", sizeHint: "Number of shares", pricePlaceholder: "0.00", tickerPlaceholder: "AAPL, TSLA, SPY…" },
  forex:  { label: "Forex", icon: "💱", sizePlaceholder: "0.10", sizeLabel: "Lot Size", sizeHint: "Standard=1.0 · Mini=0.1 · Micro=0.01", pricePlaceholder: "1.0842", tickerPlaceholder: "EUR/USD, GBP/JPY…" },
  crypto: { label: "Crypto", icon: "₿", sizePlaceholder: "0.05", sizeLabel: "Quantity", sizeHint: "Coin quantity", pricePlaceholder: "0.00", tickerPlaceholder: "BTC/USD, ETH/USD…" },
};

function calcLivePnl(marketType: MarketType, ticker: string, side: "long" | "short", entry: string, exit: string, size: string): number | null {
  const e = parseFloat(entry), x = parseFloat(exit), s = parseFloat(size);
  if (isNaN(e) || isNaN(x) || isNaN(s) || e <= 0 || x <= 0 || s <= 0) return null;
  const dir = side === "long" ? 1 : -1;
  const diff = x - e;
  if (marketType === "forex") {
    const t = ticker.replace("/", "").toUpperCase();
    const isJPY = t.endsWith("JPY");
    return dir * diff * s * (isJPY ? 1000 : 100000);
  }
  return dir * diff * s;
}

export default function NewTrade() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [marketType, setMarketType] = useState<MarketType>("equity");
  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<"long" | "short">("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [size, setSize] = useState("");
  const [pnl, setPnl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const intentionalStopRef = useRef(false);
  const shouldBeRecordingRef = useRef(false);
  const networkRetryRef = useRef(0);
  const createTrade = useCreateTrade();

  const livePnl = useMemo(() =>
    calcLivePnl(marketType, ticker, side, entryPrice, exitPrice, size),
    [marketType, ticker, side, entryPrice, exitPrice, size]
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
  }, [isAuthenticated, authLoading, setLocation]);

  useEffect(() => {
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscriptRef.current += event.results[i][0].transcript + " ";
        else interim += event.results[i][0].transcript;
      }
      setTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        intentionalStopRef.current = true; shouldBeRecordingRef.current = false; networkRetryRef.current = 0;
        setIsRecording(false);
        toast.error("Microphone access denied. Tap the lock icon in your browser address bar to allow it.");
      } else if (event.error === "audio-capture") {
        intentionalStopRef.current = true; shouldBeRecordingRef.current = false; networkRetryRef.current = 0;
        setIsRecording(false);
        toast.error("No microphone found. Check your device settings.");
      } else if (event.error === "network") {
        networkRetryRef.current += 1;
      } else if (event.error !== "aborted") {
        intentionalStopRef.current = true; shouldBeRecordingRef.current = false; networkRetryRef.current = 0;
        setIsRecording(false);
        toast.error("Recording stopped — type your reflection instead.");
      }
    };

    recognition.onend = () => {
      if (shouldBeRecordingRef.current && !intentionalStopRef.current) {
        if (networkRetryRef.current > 0 && networkRetryRef.current <= 3) {
          setTimeout(() => { if (shouldBeRecordingRef.current && recognitionRef.current) try { recognitionRef.current.start(); } catch {} }, 300);
          return;
        }
        if (networkRetryRef.current > 3) {
          networkRetryRef.current = 0; shouldBeRecordingRef.current = false; setIsRecording(false);
          toast.error("Speech recognition keeps dropping. Check your connection and try again.");
          return;
        }
        shouldBeRecordingRef.current = false; setIsRecording(false);
        toast.error("Recording stopped unexpectedly. Make sure microphone permission is allowed.");
        return;
      }
      intentionalStopRef.current = false; networkRetryRef.current = 0; setIsRecording(false);
    };

    recognitionRef.current = recognition;
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      intentionalStopRef.current = true; shouldBeRecordingRef.current = false; networkRetryRef.current = 0;
      recognitionRef.current.stop(); setIsRecording(false);
    } else {
      try {
        intentionalStopRef.current = false; shouldBeRecordingRef.current = true; networkRetryRef.current = 0;
        finalTranscriptRef.current = transcript ? transcript + " " : "";
        recognitionRef.current.start(); setIsRecording(true);
      } catch {
        shouldBeRecordingRef.current = false;
        toast.error("Could not start recording. Make sure microphone access is allowed.");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entryNum = parseFloat(entryPrice), sizeNum = parseFloat(size);
    if (!ticker || !entryPrice || !size) { toast.error("Fill in ticker, entry price, and size"); return; }
    if (isNaN(entryNum) || entryNum <= 0) { toast.error("Entry price must be a positive number"); return; }
    if (isNaN(sizeNum) || sizeNum <= 0) { toast.error("Size must be a positive number"); return; }
    if (exitPrice && (isNaN(parseFloat(exitPrice)) || parseFloat(exitPrice) <= 0)) { toast.error("Exit price must be a positive number"); return; }
    if (!transcript.trim()) { toast.error("Add a voice or written reflection before submitting"); return; }
    if (isRecording && recognitionRef.current) { recognitionRef.current.stop(); setIsRecording(false); }

    const payload: CreateTradeBody = {
      ticker: ticker.toUpperCase(), side, entryPrice: Number(entryPrice),
      size: Number(size), openedAt: new Date().toISOString(), transcript,
    };
    if (exitPrice) { payload.exitPrice = Number(exitPrice); payload.closedAt = new Date().toISOString(); }
    if (pnl) payload.pnl = Number(pnl);

    createTrade.mutate({ data: payload }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
        setAnalysisResult(data.journal);
        toast.success("Trade journaled — Dr. Trade has spoken.");
      },
      onError: () => toast.error("Failed to save trade. Try again."),
    });
  };

  const resetForm = () => {
    setAnalysisResult(null); setTicker(""); setEntryPrice(""); setExitPrice("");
    setSize(""); setPnl(""); setTranscript(""); finalTranscriptRef.current = "";
  };

  const onlyDecimals = (v: string) => v === "" || /^\d*\.?\d*$/.test(v);
  const decimalsOrNeg = (v: string) => v === "" || /^-?\d*\.?\d*$/.test(v);

  if (authLoading) return null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Journal
            </button>
            <div className="flex items-center gap-2 mb-0.5">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-widest text-primary">New Trade</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Log a Trade</h1>
            <p className="text-muted-foreground text-sm mt-1">Enter the details, then speak your mind honestly. Dr. Trade does the rest.</p>
          </div>
        </div>

        {analysisResult ? (
          /* ── ANALYSIS RESULT ── */
          <div className="animate-in slide-in-from-bottom-6 fade-in duration-500 max-w-2xl mx-auto">
            <div className="rounded-2xl border border-primary/30 bg-card overflow-hidden shadow-xl shadow-primary/5">
              {/* Top accent */}
              <div className="h-1 w-full bg-gradient-to-r from-primary via-teal-400 to-blue-500" />

              {/* Emotion hero */}
              <div className="px-8 pt-8 pb-6 text-center border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Dr. Trade detected</p>
                <div className="flex justify-center mb-4">
                  <span className="transform scale-150 inline-block">
                    <EmotionChip emotion={analysisResult.emotion} />
                  </span>
                </div>
                <div className="flex items-center justify-center gap-8 mt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold font-mono">{Math.round(analysisResult.emotionScore * 10)}<span className="text-lg text-muted-foreground">/10</span></div>
                    <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">Intensity</div>
                  </div>
                  <div className="h-10 w-px bg-border" />
                  <div className="text-center">
                    <div className={`text-3xl font-bold font-mono ${analysisResult.planFollowingScore >= 0.7 ? "text-emerald-400" : analysisResult.planFollowingScore >= 0.4 ? "text-yellow-400" : "text-red-400"}`}>
                      {Math.round(analysisResult.planFollowingScore * 10)}<span className="text-lg text-muted-foreground">/10</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">Plan Score</div>
                  </div>
                </div>
                {/* Plan adherence bar */}
                <div className="mt-4 max-w-xs mx-auto">
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${analysisResult.planFollowingScore >= 0.7 ? "bg-emerald-500" : analysisResult.planFollowingScore >= 0.4 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${Math.round(analysisResult.planFollowingScore * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Broke all rules</span><span>Followed the plan</span>
                  </div>
                </div>
              </div>

              {/* Verdict */}
              <div className="px-8 py-6 border-b border-border">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">The Verdict</p>
                <p style={{
                  fontStyle: "italic", fontSize: "1.35rem", fontWeight: 600,
                  borderLeft: "3px solid #10b981", paddingLeft: "18px",
                  paddingTop: "4px", paddingBottom: "4px",
                  color: "#f8fafc", fontFamily: "'Newsreader', 'Georgia', serif", lineHeight: 1.45,
                }}>
                  "{analysisResult.verdict}"
                </p>
              </div>

              {/* Tags */}
              {analysisResult.tags?.length > 0 && (
                <div className="px-8 py-5 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Behavioral Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.tags.map((tag: string) => (
                      <span key={tag} className="bg-secondary border border-border text-muted-foreground px-3 py-1 rounded-md text-xs font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-8 py-5 flex flex-col sm:flex-row gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setLocation("/dashboard")}>
                  View Journal
                </Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 font-semibold" onClick={resetForm}>
                  Log Another Trade
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ── FORM ── */
          <form onSubmit={handleSubmit}>
            {/* Market type tabs */}
            <div className="flex gap-1.5 p-1 bg-card border border-border rounded-xl mb-6">
              {(["equity", "forex", "crypto"] as MarketType[]).map((type) => {
                const cfg = MARKET_CONFIG[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setMarketType(type); setTicker(""); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                      marketType === type
                        ? "bg-primary/10 text-primary border border-primary/30 shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span>{cfg.icon}</span>
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Two-column layout on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── LEFT: Trade Details ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-sm font-semibold tracking-tight">Trade Details</span>
                </div>

                <Card className="border-border bg-card">
                  <CardContent className="p-5 space-y-5">

                    {/* Instrument */}
                    <div className="space-y-1.5">
                      <Label htmlFor="ticker" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Instrument</Label>
                      <Input
                        id="ticker"
                        placeholder={MARKET_CONFIG[marketType].tickerPlaceholder}
                        value={ticker}
                        onChange={e => setTicker(e.target.value)}
                        required
                        className="font-mono uppercase h-11 text-base"
                      />
                      {marketType === "forex" && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {FOREX_PAIRS.map(p => (
                            <button key={p} type="button" onClick={() => setTicker(p)}
                              className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${ticker === p ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                      {marketType === "crypto" && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {CRYPTO_EXAMPLES.map(p => (
                            <button key={p} type="button" onClick={() => setTicker(p)}
                              className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${ticker === p ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Direction toggle */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direction</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSide("long")}
                          className={`flex items-center justify-center gap-2 h-11 rounded-lg border font-semibold text-sm transition-all ${
                            side === "long"
                              ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                              : "border-border text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-400/70"
                          }`}
                        >
                          <TrendingUp className="h-4 w-4" />
                          {marketType === "forex" ? "Buy / Long" : "Long"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSide("short")}
                          className={`flex items-center justify-center gap-2 h-11 rounded-lg border font-semibold text-sm transition-all ${
                            side === "short"
                              ? "bg-red-500/15 border-red-500/50 text-red-400"
                              : "border-border text-muted-foreground hover:border-red-500/30 hover:text-red-400/70"
                          }`}
                        >
                          <TrendingDown className="h-4 w-4" />
                          {marketType === "forex" ? "Sell / Short" : "Short"}
                        </button>
                      </div>
                    </div>

                    {/* Size */}
                    <div className="space-y-1.5">
                      <Label htmlFor="size" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{MARKET_CONFIG[marketType].sizeLabel}</Label>
                      <Input id="size" type="text" inputMode="decimal"
                        placeholder={MARKET_CONFIG[marketType].sizePlaceholder}
                        value={size} onChange={e => { if (onlyDecimals(e.target.value)) setSize(e.target.value); }}
                        required className="h-11 font-mono text-base" />
                      <p className="text-xs text-muted-foreground">{MARKET_CONFIG[marketType].sizeHint}</p>
                    </div>

                    {/* Entry / Exit prices side by side */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="entry" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry Price</Label>
                        <Input id="entry" type="text" inputMode="decimal"
                          placeholder={MARKET_CONFIG[marketType].pricePlaceholder}
                          value={entryPrice} onChange={e => { if (onlyDecimals(e.target.value)) setEntryPrice(e.target.value); }}
                          required className="h-11 font-mono text-base" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="exit" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Exit Price <span className="text-muted-foreground/60 normal-case font-normal">(opt.)</span>
                        </Label>
                        <Input id="exit" type="text" inputMode="decimal"
                          placeholder={MARKET_CONFIG[marketType].pricePlaceholder}
                          value={exitPrice} onChange={e => { if (onlyDecimals(e.target.value)) setExitPrice(e.target.value); }}
                          className="h-11 font-mono text-base" />
                      </div>
                    </div>

                    {/* Live P&L preview */}
                    {livePnl !== null ? (
                      <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${livePnl >= 0 ? "border-emerald-500/30 bg-emerald-500/8" : "border-red-500/30 bg-red-500/8"}`}>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated P&L</span>
                        <span className={`text-lg font-bold font-mono ${livePnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {livePnl >= 0 ? "+" : ""}${Math.abs(livePnl).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label htmlFor="pnl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Realized P&L <span className="normal-case font-normal text-muted-foreground/60">(manual override, opt.)</span>
                        </Label>
                        <Input id="pnl" type="text" inputMode="decimal"
                          placeholder="e.g. 195.75 or -80.00"
                          value={pnl} onChange={e => { if (decimalsOrNeg(e.target.value)) setPnl(e.target.value); }}
                          className="h-11 font-mono text-base" />
                        <p className="text-xs text-muted-foreground">Add exit price above for auto-calculation</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* ── RIGHT: Reflection ── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-sm font-semibold tracking-tight">Psychological Reflection</span>
                </div>

                <Card className="border-border bg-card h-[calc(100%-2.5rem)]">
                  <CardContent className="p-5 space-y-5 flex flex-col h-full">

                    {/* Prompt */}
                    <div className="rounded-lg bg-primary/5 border border-primary/15 px-4 py-3">
                      <p className="text-xs text-primary/80 leading-relaxed font-medium">
                        Don't just log the setup. Speak or type how you felt before, during, and after. Did you follow your plan? Was fear or FOMO involved?
                      </p>
                    </div>

                    {/* Record button */}
                    {speechSupported ? (
                      <div className={`flex flex-col items-center justify-center py-7 rounded-xl border-2 transition-all ${isRecording ? "border-red-500/50 bg-red-500/5" : "border-dashed border-border bg-card/50 hover:border-primary/30"}`}>
                        <button
                          type="button"
                          onClick={toggleRecording}
                          className={`relative flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 shadow-lg ${
                            isRecording
                              ? "bg-red-500 text-white hover:bg-red-600 scale-105"
                              : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                          }`}
                        >
                          {isRecording && <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-40" />}
                          {isRecording ? <Square className="h-6 w-6 fill-current" /> : <Mic className="h-6 w-6" />}
                        </button>
                        <p className="mt-3 text-sm font-medium text-muted-foreground">
                          {isRecording ? (
                            <span className="flex items-center gap-2 text-red-400">
                              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
                              Recording — tap to stop
                            </span>
                          ) : "Tap to speak your reflection"}
                        </p>
                        {!isRecording && <p className="text-xs text-muted-foreground/60 mt-1">30 seconds is enough</p>}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border rounded-xl text-sm text-muted-foreground">
                        <Mic className="h-4 w-4 shrink-0 opacity-40" />
                        Voice not supported in this browser — type your reflection below.
                      </div>
                    )}

                    {/* Transcript textarea */}
                    <div className="space-y-1.5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="transcript" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {speechSupported ? "Transcript" : "Your Reflection"}
                        </Label>
                        {transcript.trim() && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {transcript.trim().split(/\s+/).length} words
                          </span>
                        )}
                      </div>
                      <Textarea
                        id="transcript"
                        placeholder="Your reflection will appear here as you speak, or type directly..."
                        className="flex-1 min-h-[160px] text-sm leading-relaxed resize-none focus-visible:ring-primary bg-secondary/30"
                        value={transcript}
                        onChange={(e) => { setTranscript(e.target.value); finalTranscriptRef.current = e.target.value; }}
                      />
                      {!transcript.trim() && (
                        <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                          <Circle className="h-3 w-3" /> Required — Dr. Trade needs your words to analyze
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Submit */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
              <p className="text-xs text-muted-foreground sm:mr-auto">
                AI analysis typically completes in 2–4 seconds
              </p>
              <Button
                variant="outline"
                type="button"
                onClick={() => setLocation("/dashboard")}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto font-semibold px-10 h-12 bg-primary hover:bg-primary/90"
                disabled={createTrade.isPending}
              >
                {createTrade.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Dr. Trade is analyzing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Save &amp; Analyze
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
