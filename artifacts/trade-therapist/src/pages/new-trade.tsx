import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useState, useRef, useEffect } from "react";
import { useCreateTrade, getListTradesQueryKey, type CreateTradeBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mic, Square, Loader2, ArrowLeft, Save, ChevronDown } from "lucide-react";
import { EmotionChip } from "@/components/emotion-chip";
import { toast } from "sonner";

type MarketType = "equity" | "forex" | "crypto";

const FOREX_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "GBP/JPY", "EUR/AUD", "EUR/CAD", "AUD/JPY", "GBP/AUD",
  "USD/MXN", "USD/ZAR", "EUR/CHF", "GBP/CHF",
];

const CRYPTO_EXAMPLES = ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD", "BNB/USD"];

const MARKET_LABELS: Record<MarketType, { label: string; sizePlaceholder: string; sizeLabel: string; pricePlaceholder: string; tickerPlaceholder: string }> = {
  equity: {
    label: "Stocks / ETFs",
    sizePlaceholder: "Shares",
    sizeLabel: "Shares",
    pricePlaceholder: "0.00",
    tickerPlaceholder: "AAPL, TSLA, SPY…",
  },
  forex: {
    label: "Forex",
    sizePlaceholder: "Lot size (e.g. 0.1)",
    sizeLabel: "Lot Size",
    pricePlaceholder: "1.0842",
    tickerPlaceholder: "EUR/USD, GBP/JPY…",
  },
  crypto: {
    label: "Crypto",
    sizePlaceholder: "Quantity",
    sizeLabel: "Quantity",
    pricePlaceholder: "0.00",
    tickerPlaceholder: "BTC/USD, ETH/USD…",
  },
};

function ForexPairGrid({ onSelect }: { onSelect: (pair: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {FOREX_PAIRS.map((pair) => (
        <button
          key={pair}
          type="button"
          onClick={() => onSelect(pair)}
          className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-secondary border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {pair}
        </button>
      ))}
    </div>
  );
}

function CryptoPairGrid({ onSelect }: { onSelect: (pair: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {CRYPTO_EXAMPLES.map((pair) => (
        <button
          key={pair}
          type="button"
          onClick={() => onSelect(pair)}
          className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-secondary border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {pair}
        </button>
      ))}
    </div>
  );
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

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const createTrade = useCreateTrade();
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const meta = MARKET_LABELS[marketType];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + " ";
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please type your reflection instead.");
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        finalTranscriptRef.current = transcript ? transcript + " " : "";
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        toast.error("Failed to start recording");
      }
    }
  };

  const handleMarketChange = (type: MarketType) => {
    setMarketType(type);
    setTicker("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !entryPrice || !size) {
      toast.error("Please fill out ticker, entry price, and size");
      return;
    }
    if (!transcript.trim()) {
      toast.error("Please record or type a reflection");
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    const payload: CreateTradeBody = {
      ticker: ticker.toUpperCase(),
      side,
      entryPrice: Number(entryPrice),
      size: Number(size),
      openedAt: new Date().toISOString(),
      transcript,
    };

    if (exitPrice) payload.exitPrice = Number(exitPrice);
    if (pnl) payload.pnl = Number(pnl);
    if (exitPrice) payload.closedAt = new Date().toISOString();

    createTrade.mutate(
      { data: payload },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
          setAnalysisResult(data.journal);
          toast.success("Trade journaled successfully");
        },
        onError: () => {
          toast.error("Failed to save trade");
        },
      }
    );
  };

  const resetForm = () => {
    setAnalysisResult(null);
    setTicker("");
    setEntryPrice("");
    setExitPrice("");
    setSize("");
    setPnl("");
    setTranscript("");
    finalTranscriptRef.current = "";
  };

  if (authLoading) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-6 -ml-4 text-muted-foreground" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Journal
        </Button>

        {analysisResult ? (
          <div className="animate-in slide-in-from-bottom-8 fade-in duration-700">
            <Card className="border-primary/50 shadow-lg shadow-primary/5 bg-card overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-primary to-blue-500" />
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl font-bold">Analysis Complete</CardTitle>
                <CardDescription>Dr. Trade has reviewed your reflection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex flex-col items-center justify-center p-6 bg-secondary/30 rounded-xl border border-border">
                  <span className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-widest">Detected Emotion</span>
                  <div className="scale-150 origin-top">
                    <EmotionChip emotion={analysisResult.emotion} />
                  </div>
                  <div className="mt-6 flex items-center justify-between w-full max-w-xs px-4">
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-foreground">
                        {Math.round(analysisResult.emotionScore * 10)}/10
                      </div>
                      <div className="text-xs text-muted-foreground">Intensity</div>
                    </div>
                    <div className="w-px h-8 bg-border"></div>
                    <div className="text-center">
                      <div className="text-2xl font-mono font-bold text-foreground">
                        {Math.round(analysisResult.planFollowingScore * 10)}/10
                      </div>
                      <div className="text-xs text-muted-foreground">Plan Score</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2 border-b border-border pb-2">The Verdict</h3>
                  <p className="text-lg font-medium leading-relaxed border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-md">
                    "{analysisResult.verdict}"
                  </p>
                </div>

                {analysisResult.tags && analysisResult.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Trigger Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.tags.map((tag: string) => (
                        <span key={tag} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md text-xs font-medium border border-border">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border p-6 flex justify-between">
                <Button variant="outline" onClick={() => setLocation("/dashboard")}>View Journal</Button>
                <Button onClick={resetForm}>Log Another Trade</Button>
              </CardFooter>
            </Card>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Log a Trade</h1>
              <p className="text-muted-foreground">Enter the details and speak your mind. Be honest about why you took this trade.</p>
            </div>

            {/* Market Type Selector */}
            <div className="flex gap-2 p-1 bg-secondary/50 border border-border rounded-lg">
              {(["equity", "forex", "crypto"] as MarketType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleMarketChange(type)}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    marketType === type
                      ? "bg-card border border-border text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {MARKET_LABELS[type].label}
                </button>
              ))}
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Trade Details</CardTitle>
                {marketType === "forex" && (
                  <CardDescription>
                    Forex: size in lots (standard = 1.0, mini = 0.1, micro = 0.01). Entry/exit prices in quote currency rate.
                  </CardDescription>
                )}
                {marketType === "crypto" && (
                  <CardDescription>
                    Crypto: size in coin quantity. Use pairs like BTC/USD, ETH/USD.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Ticker */}
                <div className="space-y-2">
                  <Label htmlFor="ticker">Instrument</Label>
                  <Input
                    id="ticker"
                    placeholder={meta.tickerPlaceholder}
                    value={ticker}
                    onChange={e => setTicker(e.target.value)}
                    required
                    className="font-mono uppercase"
                  />
                  {marketType === "forex" && (
                    <ForexPairGrid onSelect={(pair) => setTicker(pair)} />
                  )}
                  {marketType === "crypto" && (
                    <CryptoPairGrid onSelect={(pair) => setTicker(pair)} />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Direction */}
                  <div className="space-y-2">
                    <Label>Direction</Label>
                    <RadioGroup value={side} onValueChange={(v: "long" | "short") => setSide(v)} className="flex gap-4 pt-1">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="long" id="long" />
                        <Label htmlFor="long" className="font-mono text-primary cursor-pointer">
                          {marketType === "forex" ? "BUY / LONG" : "LONG"}
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="short" id="short" />
                        <Label htmlFor="short" className="font-mono text-destructive cursor-pointer">
                          {marketType === "forex" ? "SELL / SHORT" : "SHORT"}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Size */}
                  <div className="space-y-2">
                    <Label htmlFor="size">{meta.sizeLabel}</Label>
                    <Input
                      id="size"
                      type="number"
                      step="any"
                      placeholder={meta.sizePlaceholder}
                      value={size}
                      onChange={e => setSize(e.target.value)}
                      required
                    />
                  </div>

                  {/* Entry Price */}
                  <div className="space-y-2">
                    <Label htmlFor="entry">Entry Price</Label>
                    <Input
                      id="entry"
                      type="number"
                      step="any"
                      placeholder={meta.pricePlaceholder}
                      value={entryPrice}
                      onChange={e => setEntryPrice(e.target.value)}
                      required
                    />
                  </div>

                  {/* Exit Price */}
                  <div className="space-y-2">
                    <Label htmlFor="exit">
                      Exit Price <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="exit"
                      type="number"
                      step="any"
                      placeholder={meta.pricePlaceholder}
                      value={exitPrice}
                      onChange={e => setExitPrice(e.target.value)}
                    />
                  </div>

                  {/* P&L */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="pnl">
                      Realized P&L <span className="text-muted-foreground font-normal">(Optional — in your account currency)</span>
                    </Label>
                    <Input
                      id="pnl"
                      type="number"
                      step="any"
                      placeholder="± 0.00"
                      value={pnl}
                      onChange={e => setPnl(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Psychological Reflection</CardTitle>
                <CardDescription>
                  Don't just list the setup. Explain how you felt before, during, and after. Did you follow your rules?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {speechSupported ? (
                  <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-border rounded-xl bg-card/50">
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-lg ${
                        isRecording
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 scale-105"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <div className="absolute inset-0 rounded-full border-4 border-destructive animate-ping opacity-50"></div>
                          <Square className="h-8 w-8 fill-current" />
                        </>
                      ) : (
                        <Mic className="h-8 w-8" />
                      )}
                    </button>
                    <p className="mt-4 font-medium text-sm text-muted-foreground">
                      {isRecording ? "Recording... tap to stop" : "Tap to speak your reflection"}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md text-sm">
                    Speech recognition is not supported in this browser. Please type your reflection below.
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="transcript" className="sr-only">Transcript</Label>
                  <Textarea
                    id="transcript"
                    placeholder="Type your reflection here..."
                    className="min-h-[150px] text-base leading-relaxed resize-y focus-visible:ring-primary"
                    value={transcript}
                    onChange={(e) => {
                      setTranscript(e.target.value);
                      finalTranscriptRef.current = e.target.value;
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" className="w-full sm:w-auto font-semibold px-8 h-12 text-lg" disabled={createTrade.isPending}>
                {createTrade.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Save & Analyze
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
