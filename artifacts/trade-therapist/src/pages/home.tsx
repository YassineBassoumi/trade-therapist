import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Activity, ArrowRight, Brain, TrendingUp, Lock } from "lucide-react";
import { Layout } from "@/components/layout";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Home() {
  const { isAuthenticated, login } = useAuth();
  const [, setLocation] = useLocation();
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) return null;

  return (
    <Layout>
      <div className="flex flex-col min-h-[80vh] justify-center max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="space-y-8 text-center sm:text-left">
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Activity className="mr-2 h-4 w-4" />
            AI-Powered Trading Journal
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
            Your trades have feelings.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-600">We listen.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Trade Therapist acts as your personal coach. It doesn't ask what you traded — it asks <i>why</i> you traded it. Record your reflections, uncover emotional patterns, and stop letting FOMO drain your P&L.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={login}>
              Start Journaling
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-14 px-8 gap-2 border-border" onClick={() => setShowProModal(true)}>
              <Lock className="h-4 w-4 text-muted-foreground" />
              Pro $19/mo
            </Button>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-border pt-16">
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Voice Reflections</h3>
            <p className="text-muted-foreground">Speak your mind after a trade. The AI analyzes your tone, trigger words, and emotional state instantly.</p>
          </div>
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Dr. Trade Verdicts</h3>
            <p className="text-muted-foreground">Receive brutally honest, objective feedback on whether you followed your plan or succumbed to fear.</p>
          </div>
          <div className="space-y-4">
            <div className="h-12 w-12 rounded-xl bg-card border border-border flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Psychology Insights</h3>
            <p className="text-muted-foreground">Correlate your P&L with your emotional state. Discover that your "boredom" trades cost you thousands.</p>
          </div>
        </div>
      </div>

      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl">Trade Therapist Pro</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Coming soon — we'll notify you when Pro launches. Pro will include deep historical analysis, real-time API integrations, and customized behavioral plans.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setShowProModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
