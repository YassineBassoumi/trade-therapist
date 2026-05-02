import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGetInsights, getGetInsightsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { emotionColors } from "@/components/emotion-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Percent, DollarSign, Brain } from "lucide-react";
import { useEffect } from "react";

export default function Insights() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: insights, isLoading: insightsLoading } = useGetInsights({
    query: {
      enabled: isAuthenticated,
      queryKey: getGetInsightsQueryKey(),
    }
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || insightsLoading) {
    return (
      <Layout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Psychology Insights</h1>
          <p className="text-muted-foreground mt-1">Analyzing your behavioral patterns.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full bg-card" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-[400px] w-full bg-card" />
          <Skeleton className="h-[400px] w-full bg-card" />
        </div>
      </Layout>
    );
  }

  if (!insights || insights.summary.totalTrades === 0) {
    return (
      <Layout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Psychology Insights</h1>
          <p className="text-muted-foreground mt-1">Analyzing your behavioral patterns.</p>
        </div>
        <Card className="border-border bg-card/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center h-64">
            <BarChart className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <CardTitle className="text-xl mb-2">Not enough data</CardTitle>
            <CardDescription className="max-w-md">
              Log more trades to unlock psychological insights, win rates by emotion, and trigger word analysis.
            </CardDescription>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-xl">
          <p className="font-semibold mb-1 text-foreground capitalize">{label}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].name}: <span className="font-mono font-medium text-foreground">{payload[0].value}{payload[0].name.includes('Rate') ? '%' : ''}</span>
          </p>
          {payload[0].payload.tradeCount && (
            <p className="text-xs text-muted-foreground mt-1">
              Sample size: {payload[0].payload.tradeCount} trades
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Psychology Insights</h1>
        <p className="text-muted-foreground mt-1">Data-driven analysis of your trading behavior.</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium tracking-tight text-muted-foreground">Total Trades</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold font-mono">{insights.summary.totalTrades}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium tracking-tight text-muted-foreground">Total P&L</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={`text-3xl font-bold font-mono ${insights.summary.totalPnl >= 0 ? "text-primary" : "text-destructive"}`}>
              {insights.summary.totalPnl >= 0 ? "+" : ""}{insights.summary.totalPnl.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium tracking-tight text-muted-foreground">Global Win Rate</p>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold font-mono">{insights.summary.winRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium tracking-tight text-muted-foreground">Dominant Emotion</p>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold font-mono capitalize" style={{ color: emotionColors[insights.summary.mostCommonEmotion || ""] || "inherit" }}>
              {insights.summary.mostCommonEmotion || "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Win Rate by Emotion Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Win Rate by Emotion</CardTitle>
            <CardDescription>How your feelings dictate your success</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.winRateByEmotion} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="emotion" type="category" tick={{ fill: '#f8fafc', textTransform: 'capitalize' }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={insights.summary.winRate} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar dataKey="winRate" name="Win Rate" radius={[0, 4, 4, 0]}>
                    {insights.winRateByEmotion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={emotionColors[entry.emotion] || "#64748b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Trigger Words Chart */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Frequent Trigger Words</CardTitle>
            <CardDescription>Words you commonly use in your reflections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.triggerWords} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94a3b8' }} />
                  <YAxis dataKey="word" type="category" tick={{ fill: '#f8fafc' }} width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Occurrences" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PnL by Hour Chart */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>P&L by Hour of Day</CardTitle>
          <CardDescription>Identify your most profitable (and destructive) trading hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.pnlByHour} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `$${val}`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="avgPnl" name="Avg P&L" radius={[4, 4, 0, 0]}>
                  {insights.pnlByHour.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgPnl >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}
