import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useListTrades, useDeleteTrade, getListTradesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmotionChip } from "@/components/emotion-chip";
import { PlusCircle, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const { data: trades, isLoading: tradesLoading } = useListTrades({
    query: {
      enabled: isAuthenticated,
      queryKey: getListTradesQueryKey(),
    }
  });

  const deleteTrade = useDeleteTrade();

  if (!authLoading && !isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to seed");
      toast.success("Demo data loaded successfully");
      queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
    } catch (e) {
      toast.error("Failed to seed demo data");
    } finally {
      setSeeding(false);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this journal entry?")) {
      deleteTrade.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Trade deleted");
            queryClient.invalidateQueries({ queryKey: getListTradesQueryKey() });
          },
          onError: () => toast.error("Failed to delete trade")
        }
      );
    }
  };

  if (authLoading || tradesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Journal</h1>
            <p className="text-muted-foreground mt-1">Review your trading psychology.</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full bg-card" />)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-muted-foreground mt-1 text-sm">Review your past trades and Dr. Trade's verdicts.</p>
        </div>
        <div className="flex items-center gap-3">
          {(!trades || trades.length === 0) && (
            <Button variant="outline" onClick={handleSeed} disabled={seeding} className="border-border">
              <RefreshCw className={`mr-2 h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
              Load Demo Data
            </Button>
          )}
          <Button onClick={() => setLocation("/trades/new")} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Trade
          </Button>
        </div>
      </div>

      {!trades || trades.length === 0 ? (
        <Card className="border-border bg-card/50 shadow-none border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl mb-2">No entries yet</CardTitle>
            <CardDescription className="max-w-md mb-6">
              The first step to better trading psychology is logging your thoughts. Record your first trade reflection.
            </CardDescription>
            <Button onClick={() => setLocation("/trades/new")}>Start Journaling</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => (
            <Card key={trade.id} className="border-border bg-card overflow-hidden transition-all hover:border-muted-foreground/30 relative group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(trade.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Left stats column */}
                  <div className="md:w-64 p-6 border-b md:border-b-0 md:border-r border-border bg-card/50 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{trade.ticker.toUpperCase()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${trade.side === 'long' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                          {trade.side.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    {trade.pnl !== undefined && trade.pnl !== null && (
                      <div className={`text-2xl font-bold mb-1 flex items-center ${trade.pnl >= 0 ? "text-primary" : "text-destructive"}`}>
                        {trade.pnl >= 0 ? <ArrowUpRight className="mr-1 h-5 w-5" /> : <ArrowDownRight className="mr-1 h-5 w-5" />}
                        ${Math.abs(trade.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-auto pt-4">
                      {format(new Date(trade.openedAt), "MMM d, yyyy • h:mm a")}
                    </div>
                  </div>

                  {/* Right journal column */}
                  <div className="flex-1 p-6 flex flex-col">
                    {trade.journal ? (
                      <>
                        <div className="flex items-center gap-3 mb-3">
                          <EmotionChip emotion={trade.journal.emotion} />
                          <span className="text-xs text-muted-foreground font-mono">Plan Score: {trade.journal.planFollowingScore}/10</span>
                        </div>
                        
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Dr. Trade Verdict</h4>
                          <p className="text-sm font-medium border-l-2 border-primary pl-3 py-1 italic">
                            "{trade.journal.verdict}"
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Transcript</h4>
                          <p className="text-sm text-foreground/80 line-clamp-2 hover:line-clamp-none transition-all cursor-pointer">
                            {trade.journal.transcript}
                          </p>
                        </div>
                        
                        {trade.journal.tags && trade.journal.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-4">
                            {trade.journal.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-sm">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
                        No psychological reflection recorded for this trade.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
