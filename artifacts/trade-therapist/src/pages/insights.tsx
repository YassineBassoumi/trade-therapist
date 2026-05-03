import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGetInsights, getGetInsightsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { emotionColors } from "@/components/emotion-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Percent, DollarSign, Brain, TrendingUp, TrendingDown, Hash, Clock } from "lucide-react";
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
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full bg-card" />)}
        </div>
        <Skeleton className="h-20 w-full bg-card mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Skeleton className="h-[380px] w-full bg-card" />
          <Skeleton className="h-[380px] w-full bg-card" />
        </div>
        <Skeleton className="h-[320px] w-full bg-card" />
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
          <CardContent className="flex flex-col items-center justify-center p-16 text-center h-64">
            <Brain className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
            <p className="text-lg font-semibold mb-1">Not enough data yet</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Log at least one trade to unlock emotion analytics, win rates by state, and trigger word patterns.
            </p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  const winRate = insights.summary.winRate;
  const pnlPositive = insights.summary.totalPnl >= 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0f1923] border border-border/60 px-4 py-3 rounded-xl shadow-2xl text-sm">
          <p className="font-semibold text-foreground capitalize mb-1">{label}</p>
          <p className="text-muted-foreground">
            {payload[0].name}:{" "}
            <span className="font-mono font-bold text-foreground">
              {payload[0].value}{payload[0].name.includes("Rate") || payload[0].name.includes("%") ? "%" : payload[0].name.includes("P&L") ? "" : ""}
            </span>
          </p>
          {payload[0].payload.tradeCount && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{payload[0].payload.tradeCount} trades</p>
          )}
        </div>
      );
    }
    return null;
  };

  const PnlTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value as number;
      return (
        <div className="bg-[#0f1923] border border-border/60 px-4 py-3 rounded-xl shadow-2xl text-sm">
          <p className="font-semibold text-foreground mb-1">{label}:00</p>
          <p className={`font-mono font-bold ${val >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {val >= 0 ? "+" : ""}${val.toFixed(2)} avg P&L
          </p>
          {payload[0].payload.tradeCount && (
            <p className="text-xs text-muted-foreground/70 mt-0.5">{payload[0].payload.tradeCount} trades</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Dr. Trade diagnosis line
  const calmWr = insights.summary.calmWinRate;
  const fomoWr = insights.summary.fomoWinRate;
  let diagnosisLine = "";
  if (calmWr != null && fomoWr != null) {
    diagnosisLine = `Calm trades win ${calmWr.toFixed(0)}% of the time. FOMO trades: ${fomoWr.toFixed(0)}%. That gap is your entire edge.`;
  } else if (calmWr != null) {
    diagnosisLine = `When you're calm, you win ${calmWr.toFixed(0)}% of the time. The data doesn't lie — emotion is the variable.`;
  } else if (winRate >= 50) {
    diagnosisLine = `${winRate.toFixed(0)}% win rate across ${insights.summary.totalTrades} trades. The question is: which emotional states are dragging it down?`;
  } else {
    diagnosisLine = `${winRate.toFixed(0)}% win rate. Below breakeven — but the breakdown by emotion below shows exactly where it's leaking.`;
  }

  return (
    <Layout>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Psychology Insights</p>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Your behavioral report</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {insights.summary.totalTrades} trades analyzed — emotion, discipline, and P&L correlated.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Trades */}
        <Card className="border-border bg-card overflow-hidden">
          <div className="h-0.5 w-full bg-slate-600" />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total Trades</p>
              <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <Activity className="h-4 w-4 text-slate-400" />
              </div>
            </div>
            <div className="text-4xl font-bold font-mono text-foreground">{insights.summary.totalTrades}</div>
            <p className="text-xs text-muted-foreground mt-1">all markets combined</p>
          </CardContent>
        </Card>

        {/* Total P&L */}
        <Card className="border-border bg-card overflow-hidden">
          <div className={`h-0.5 w-full ${pnlPositive ? "bg-emerald-500" : "bg-red-500"}`} />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total P&L</p>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${pnlPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                {pnlPositive
                  ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                  : <TrendingDown className="h-4 w-4 text-red-400" />}
              </div>
            </div>
            <div className={`text-4xl font-bold font-mono ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
              {pnlPositive ? "+" : "-"}${Math.abs(insights.summary.totalPnl).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">across all closed trades</p>
          </CardContent>
        </Card>

        {/* Global Win Rate */}
        <Card className="border-border bg-card overflow-hidden">
          <div className={`h-0.5 w-full ${winRate >= 50 ? "bg-emerald-500" : winRate >= 40 ? "bg-yellow-500" : "bg-red-500"}`} />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Win Rate</p>
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${winRate >= 50 ? "bg-emerald-500/10" : "bg-yellow-500/10"}`}>
                <Percent className={`h-4 w-4 ${winRate >= 50 ? "text-emerald-400" : "text-yellow-400"}`} />
              </div>
            </div>
            <div className={`text-4xl font-bold font-mono ${winRate >= 50 ? "text-emerald-400" : winRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
              {winRate.toFixed(1)}%
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${winRate >= 50 ? "bg-emerald-500" : winRate >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(winRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dominant Emotion */}
        <Card className="border-border bg-card overflow-hidden">
          <div className="h-0.5 w-full" style={{ backgroundColor: emotionColors[insights.summary.mostCommonEmotion || ""] || "#64748b" }} />
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Dominant Emotion</p>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${emotionColors[insights.summary.mostCommonEmotion || ""] || "#64748b"}20` }}>
                <Brain className="h-4 w-4" style={{ color: emotionColors[insights.summary.mostCommonEmotion || ""] || "#94a3b8" }} />
              </div>
            </div>
            <div className="text-4xl font-bold font-mono capitalize" style={{ color: emotionColors[insights.summary.mostCommonEmotion || ""] || "inherit" }}>
              {insights.summary.mostCommonEmotion || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">most frequent state</p>
          </CardContent>
        </Card>
      </div>

      {/* Dr. Trade diagnosis banner */}
      {diagnosisLine && (
        <div className="mb-8 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4 flex items-start gap-4">
          <Brain className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Dr. Trade Diagnosis</p>
            <p style={{
              fontStyle: "italic",
              fontSize: "1rem",
              fontWeight: 600,
              borderLeft: "3px solid #10b981",
              paddingLeft: "14px",
              color: "#f8fafc",
              fontFamily: "'Newsreader', 'Georgia', serif",
              lineHeight: 1.5,
            }}>
              "{diagnosisLine}"
            </p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Win Rate by Emotion */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Win Rate by Emotion</CardTitle>
                <CardDescription className="text-xs mt-0.5">How your emotional state predicts outcomes</CardDescription>
              </div>
              <div className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">
                avg {winRate.toFixed(0)}%
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div style={{ height: Math.max(280, insights.winRateByEmotion.length * 52) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={insights.winRateByEmotion}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <YAxis dataKey="emotion" type="category" tick={({ x, y, payload }: any) => (
                    <text x={x} y={y} dy={4} textAnchor="end" fill="#cbd5e1" fontSize={12}>
                      {String(payload.value).charAt(0).toUpperCase() + String(payload.value).slice(1)}
                    </text>
                  )} width={90} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine x={winRate} stroke="#475569" strokeDasharray="4 3" strokeWidth={1} />
                  <Bar dataKey="winRate" name="Win Rate" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {insights.winRateByEmotion.map((entry, i) => (
                      <Cell key={i} fill={emotionColors[entry.emotion] || "#64748b"} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">Dashed line = your overall average</p>
          </CardContent>
        </Card>

        {/* Trigger Words */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold tracking-tight">Trigger Word Frequency</CardTitle>
                <CardDescription className="text-xs mt-0.5">Words that appear most in your reflections</CardDescription>
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Hash className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={insights.triggerWords}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#1e293b" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="word" type="category" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" name="Occurrences" fill="#10b981" fillOpacity={0.75} radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">High frequency = recurring pattern worth examining</p>
          </CardContent>
        </Card>
      </div>

      {/* P&L by Hour — full width */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">P&L by Hour of Day</CardTitle>
              <CardDescription className="text-xs mt-0.5">Average realized P&L per session hour — find your edge window</CardDescription>
            </div>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.pnlByHour} margin={{ top: 8, right: 16, left: 8, bottom: 4 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(h) => `${h}:00`}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => `$${v}`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<PnlTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <ReferenceLine y={0} stroke="#334155" strokeWidth={1} />
                <Bar dataKey="avgPnl" name="Avg P&L" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {insights.pnlByHour.map((entry, i) => (
                    <Cell key={i} fill={entry.avgPnl >= 0 ? "#10b981" : "#ef4444"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">Green = profitable hours · Red = destructive hours · Trade more in green, less in red</p>
        </CardContent>
      </Card>
    </Layout>
  );
}
