import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, Brain, TrendingUp, Play, Quote } from "lucide-react";
import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const VERDICTS = [
  {
    ticker: "TSLA",
    side: "LONG",
    emotion: "Fomo",
    emotionColor: "#f97316",
    pnl: "+$635",
    pnlPositive: true,
    transcript: "I bought TSLA because everyone on Twitter was saying it was going to squeeze past 250.",
    verdict: "You traded the crowd, not the chart.",
  },
  {
    ticker: "EUR/USD",
    side: "LONG",
    emotion: "Calm",
    emotionColor: "#3b82f6",
    pnl: "+$490",
    pnlPositive: true,
    transcript: "London open setup. Waited for the retest, entered clean, held through the pullback.",
    verdict: "London open, clean retest, disciplined hold. That's the game.",
  },
  {
    ticker: "NVDA",
    side: "LONG",
    emotion: "Revenge",
    emotionColor: "#ef4444",
    pnl: "-$476",
    pnlPositive: false,
    transcript: "I lost $200 on AMD and I was furious. I jumped into NVDA to make it back quickly.",
    verdict: "Revenge entry. The market doesn't owe you the loss back.",
  },
];

const QUOTE_STRIP = [
  { verdict: "You traded the crowd, not the chart.", ticker: "TSLA", emotion: "FOMO" },
  { verdict: "London open, clean retest, disciplined hold. That's the game.", ticker: "EUR/USD", emotion: "Calm" },
  { verdict: "Revenge entry. The market doesn't owe you the loss back.", ticker: "NVDA", emotion: "Revenge" },
];

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) return null;

  return (
    <Layout noSidebar>
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Subtle radial gradient behind hero */}
        <div className="pointer-events-none absolute inset-0 -z-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(16,185,129,0.13) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-20 sm:py-28 flex flex-col lg:flex-row items-center gap-16">
          {/* Left — headline + CTAs */}
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary tracking-tight">
              <Activity className="mr-2 h-4 w-4" />
              AI-Powered Trading Journal
            </div>

            <h1 className="text-5xl sm:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.08] text-foreground">
              Your trades have feelings.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                We listen.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-xl leading-relaxed tracking-tight">
              Trade Therapist acts as your personal coach. It doesn't ask what you traded — it asks <em>why</em>.
              Record reflections, uncover emotional patterns, and stop letting FOMO drain your P&L.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base h-12 px-7 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold tracking-tight"
                onClick={login}
              >
                Start Journaling
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base h-12 px-7 gap-2 border-border hover:bg-secondary/60 tracking-tight"
                onClick={() => setShowDemoModal(true)}
              >
                <Play className="h-4 w-4 text-primary fill-primary" />
                Watch the demo
              </Button>
            </div>
          </div>

          {/* Right — static trade card preview */}
          <div className="flex-shrink-0 w-full max-w-sm lg:max-w-[360px]">
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Card header */}
              <div className="px-5 pt-5 pb-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold tracking-tight">TSLA</span>
                  <span className="text-[11px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LONG</span>
                  <span
                    className="text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full border"
                    style={{ backgroundColor: "#f9731620", color: "#f97316", borderColor: "#f9731640" }}
                  >
                    Fomo
                  </span>
                </div>
                <span className="text-emerald-400 font-bold font-mono text-base">+$635</span>
              </div>

              {/* Verdict */}
              <div className="px-5 py-4 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Dr. Trade Verdict</div>
                <div className="border-l-2 border-primary pl-3">
                  <p className="text-sm font-medium italic text-foreground leading-snug">
                    "You traded the crowd, not the chart."
                  </p>
                </div>
              </div>

              {/* Transcript */}
              <div className="px-5 pb-4 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Transcript</div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  I bought TSLA because everyone on Twitter was saying it was going to squeeze past 250. I didn't have a real plan, just jumped in because I was afraid of missing out.
                </p>
                <div className="flex gap-2 pt-1">
                  {["#fomo_entry", "#chasing"].map(tag => (
                    <span key={tag} className="text-[11px] text-muted-foreground bg-secondary px-2 py-0.5 rounded font-mono">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Plan score bar */}
              <div className="px-5 pb-5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                  <span className="uppercase tracking-widest font-semibold">Plan Adherence</span>
                  <span className="font-mono">15%</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-destructive" style={{ width: "15%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dr. Trade verdict quote strip */}
      <div className="border-t border-border bg-card/30">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center mb-8">
            What Dr. Trade tells traders — no login required
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {QUOTE_STRIP.map((q, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <Quote className="h-5 w-5 text-primary opacity-60" />
                <p className="text-sm font-medium text-foreground leading-relaxed italic">
                  "{q.verdict}"
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-mono font-bold text-muted-foreground">{q.ticker}</span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{q.emotion} trade</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features strip */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-10 border-t border-border">
        <div className="space-y-3">
          <div className="h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Voice Reflections</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Speak your mind after a trade. The AI analyzes your tone, trigger words, and emotional state instantly.
          </p>
        </div>
        <div className="space-y-3">
          <div className="h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Dr. Trade Verdicts</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Receive brutally honest feedback on whether you followed your plan or succumbed to fear — every single trade.
          </p>
        </div>
        <div className="space-y-3">
          <div className="h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight">Psychology Insights</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Correlate P&L with emotional state. Discover that your "boredom" trades cost you thousands per month.
          </p>
        </div>
      </div>

      {/* Footer CTA — Pro moved below fold */}
      <div className="border-t border-border bg-card/20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground tracking-tight">Ready to understand your trading psychology?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Free to start. No credit card required.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={() => setShowProModal(true)}>
              Pro $19/mo
            </Button>
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={login}>
              Start Journaling
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Demo modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="sm:max-w-3xl bg-card border-border p-0 overflow-hidden">
          <div className="aspect-video w-full bg-background flex items-center justify-center">
            <div className="text-center space-y-3 p-8">
              <Play className="h-12 w-12 text-primary mx-auto opacity-50" />
              <p className="text-muted-foreground text-sm">Demo video coming soon.</p>
              <p className="text-xs text-muted-foreground">Replace this with your Loom embed URL in <code className="bg-secondary px-1 rounded">home.tsx</code>.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pro modal */}
      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <div className="p-6 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Trade Therapist Pro</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Coming soon — Pro will include deep historical analysis, real-time broker integrations, and personalized behavioral plans from Dr. Trade.
            </p>
            <Button className="w-full" onClick={() => setShowProModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
