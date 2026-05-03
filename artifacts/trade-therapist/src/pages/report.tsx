import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import {
  useListReports, getListReportsQueryKey,
  useGetReport, getGetReportQueryKey,
  useGenerateWeeklyReport,
  useDeleteReport,
  type ReportSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Loader2, Sparkles, Calendar,
  TrendingUp, TrendingDown, Brain, ChevronRight,
  RotateCcw, Trash2, AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format, parseISO } from "date-fns";
import { emotionColors } from "@/components/emotion-chip";

function formatDateRange(weekStart: string, weekEnd: string) {
  const s = parseISO(weekStart);
  const e = parseISO(weekEnd);
  if (s.getMonth() === e.getMonth()) {
    return `${format(s, "MMM d")} – ${format(e, "d, yyyy")}`;
  }
  return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

function ReportCard({
  report,
  isSelected,
  onClick,
  onDelete,
  isDeleting,
}: {
  report: ReportSummary;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const pnlPositive = report.totalPnl != null && report.totalPnl >= 0;
  const emotionColor = report.dominantEmotion
    ? emotionColors[report.dominantEmotion] ?? "#64748b"
    : "#64748b";

  function handleTrashClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(true);
  }

  function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(false);
    onDelete();
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirming(false);
  }

  return (
    <div
      className={`w-full rounded-xl border transition-all group ${
        isSelected
          ? "border-primary/50 bg-primary/8 shadow-sm shadow-primary/10"
          : "border-border bg-card/60 hover:border-border/80 hover:bg-card"
      } ${isDeleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Confirm-delete overlay */}
      {confirming ? (
        <div className="px-4 py-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="text-xs font-semibold">Delete this report?</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {formatDateRange(report.weekStart, report.weekEnd)} — this cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 text-xs font-semibold rounded-lg px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-colors"
            >
              {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Yes, delete"}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 text-xs font-semibold rounded-lg px-3 py-1.5 bg-secondary/60 text-muted-foreground border border-border hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Using div + role=button to avoid nested <button> DOM violation */
        <div
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={(e) => e.key === "Enter" && onClick()}
          className="w-full text-left px-4 py-3.5 cursor-pointer"
        >
          {/* Top row: date range + trash */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-foreground">
              {formatDateRange(report.weekStart, report.weekEnd)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleTrashClick}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Delete report"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <ChevronRight className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${isSelected ? "text-primary" : "text-muted-foreground/40 group-hover:text-muted-foreground"}`} />
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {report.tradeCount} {report.tradeCount === 1 ? "trade" : "trades"}
            </span>

            {report.totalPnl != null && (
              <span className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${pnlPositive ? "text-emerald-400" : "text-red-400"}`}>
                {pnlPositive
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {pnlPositive ? "+" : ""}${Math.abs(report.totalPnl).toFixed(0)}
              </span>
            )}

            {report.dominantEmotion && (
              <span
                className="text-xs font-semibold capitalize px-1.5 py-0.5 rounded"
                style={{ color: emotionColor, backgroundColor: `${emotionColor}18` }}
              >
                {report.dominantEmotion}
              </span>
            )}
          </div>

          {/* Generated at */}
          <p className="text-xs text-muted-foreground/50 mt-1.5">
            Generated {format(parseISO(report.generatedAt), "MMM d 'at' h:mm a")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Report() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) setLocation("/");
  }, [authLoading, isAuthenticated, setLocation]);

  const { data: reports, isLoading: listLoading } = useListReports({
    query: {
      enabled: isAuthenticated,
      queryKey: getListReportsQueryKey(),
    },
  });

  // Auto-select the first (newest) report when list loads
  useEffect(() => {
    if (reports && reports.length > 0 && selectedId === null) {
      setSelectedId(reports[0].id);
    }
  }, [reports, selectedId]);

  const { data: selectedReport, isLoading: reportLoading } = useGetReport(
    selectedId ?? 0,
    {
      query: {
        enabled: selectedId !== null,
        queryKey: getGetReportQueryKey(selectedId ?? 0),
      },
    }
  );

  const generateReport = useGenerateWeeklyReport();
  const deleteReport = useDeleteReport();

  const handleGenerate = () => {
    generateReport.mutate(undefined, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        setSelectedId(data.id);
        toast.success("Weekly report saved.");
      },
      onError: () => {
        toast.error("Failed to generate report. Make sure you have enough trade data.");
      },
    });
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    deleteReport.mutate({ id }, {
      onSuccess: () => {
        // Pick the next report to select after deletion
        const remaining = (reports ?? []).filter((r) => r.id !== id);
        const next = remaining[0] ?? null;
        setSelectedId(next ? next.id : null);
        queryClient.invalidateQueries({ queryKey: getListReportsQueryKey() });
        toast.success("Report deleted.");
      },
      onError: () => {
        toast.error("Failed to delete report.");
      },
      onSettled: () => {
        setDeletingId(null);
      },
    });
  };

  if (authLoading) return null;

  const hasReports = reports && reports.length > 0;

  return (
    <Layout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Report History</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Psychology Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Dr. Trade's brutally honest assessment — one report per week, saved forever.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generateReport.isPending}
          className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary/90 font-semibold h-10"
        >
          {generateReport.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
          ) : (
            <><Sparkles className="h-4 w-4" /> New Report</>
          )}
        </Button>
      </div>

      {/* Empty state — no reports at all */}
      {!listLoading && !hasReports && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary/50 via-teal-400/50 to-blue-500/50" />
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">No reports yet</h2>
            <p className="text-muted-foreground max-w-md mb-8 leading-relaxed text-sm">
              Dr. Trade will analyze your week of journaling, cross-reference it with your P&L, and synthesize a brutally honest behavioral assessment. Every report is saved so you can track your progress over time.
            </p>
            <Button
              size="lg"
              className="h-14 px-8 text-base font-semibold gap-2"
              onClick={handleGenerate}
              disabled={generateReport.isPending}
            >
              {generateReport.isPending ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing Data…</>
              ) : (
                <><Sparkles className="h-5 w-5" /> Generate First Report</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Loading skeletons */}
      {listLoading && (
        <div className="flex gap-6">
          <div className="w-72 flex-shrink-0 space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full bg-card" />)}
          </div>
          <Skeleton className="flex-1 h-[500px] bg-card" />
        </div>
      )}

      {/* Two-column layout: sidebar + viewer */}
      {!listLoading && hasReports && (
        <div className="flex gap-5 min-h-[600px]">

          {/* ── LEFT SIDEBAR: Report List ── */}
          <div className="w-64 xl:w-72 flex-shrink-0 flex flex-col gap-3">
            {/* Mobile generate button */}
            <Button
              onClick={handleGenerate}
              disabled={generateReport.isPending}
              className="sm:hidden w-full gap-2 bg-primary hover:bg-primary/90 font-semibold"
            >
              {generateReport.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</>
                : <><Sparkles className="h-4 w-4" />New Report</>}
            </Button>

            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
              {reports.length} {reports.length === 1 ? "Report" : "Reports"}
            </p>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[75vh] pr-1 scrollbar-thin">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  isSelected={selectedId === report.id}
                  onClick={() => setSelectedId(report.id)}
                  onDelete={() => handleDelete(report.id)}
                  isDeleting={deletingId === report.id}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT: Report Viewer ── */}
          <div className="flex-1 min-w-0">
            {/* Loading selected report */}
            {reportLoading && (
              <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
                <Skeleton className="h-6 w-48 bg-secondary" />
                <Skeleton className="h-4 w-full bg-secondary" />
                <Skeleton className="h-4 w-5/6 bg-secondary" />
                <Skeleton className="h-4 w-4/6 bg-secondary" />
                <Skeleton className="h-4 w-full bg-secondary" />
                <Skeleton className="h-4 w-3/4 bg-secondary" />
              </div>
            )}

            {/* Report content */}
            {!reportLoading && selectedReport && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-400">
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
                  {/* Accent bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-primary via-teal-400 to-blue-500" />

                  {/* Report meta header */}
                  <div className="px-8 py-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                          Trades analyzed
                        </p>
                        <p className="text-sm font-bold text-foreground">
                          {formatDateRange(selectedReport.weekStart, selectedReport.weekEnd)}
                        </p>
                      </div>

                      <div className="h-8 w-px bg-border" />

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Trades</p>
                          <p className="text-sm font-bold font-mono">{selectedReport.tradeCount}</p>
                        </div>

                        {selectedReport.totalPnl != null && (
                          <>
                            <div className="h-6 w-px bg-border" />
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Total P&L</p>
                              <p className={`text-sm font-bold font-mono ${selectedReport.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {selectedReport.totalPnl >= 0 ? "+" : ""}${Math.abs(selectedReport.totalPnl).toFixed(2)}
                              </p>
                            </div>
                          </>
                        )}

                        {selectedReport.dominantEmotion && (
                          <>
                            <div className="h-6 w-px bg-border" />
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Dominant</p>
                              <p
                                className="text-sm font-bold capitalize"
                                style={{ color: emotionColors[selectedReport.dominantEmotion] ?? "#f8fafc" }}
                              >
                                {selectedReport.dominantEmotion}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(selectedReport.generatedAt), "MMM d 'at' h:mm a")}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={generateReport.isPending}
                        className="h-8 text-xs gap-1.5"
                      >
                        {generateReport.isPending
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RotateCcw className="h-3 w-3" />}
                        New Report
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(selectedReport.id)}
                        disabled={deletingId === selectedReport.id}
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      >
                        {deletingId === selectedReport.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Trash2 className="h-3 w-3" />}
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Markdown content */}
                  <div className="px-8 py-8 sm:px-10 sm:py-10">
                    <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-base prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:my-3 prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground/90 prose-li:my-1 prose-ul:my-3 prose-blockquote:border-primary prose-blockquote:text-muted-foreground">
                      <ReactMarkdown>{selectedReport.markdown}</ReactMarkdown>
                    </article>
                  </div>
                </div>
              </div>
            )}

            {/* No selection yet */}
            {!reportLoading && !selectedReport && selectedId === null && (
              <div className="rounded-2xl border border-dashed border-border bg-card/30 flex flex-col items-center justify-center h-64 text-center p-8">
                <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Select a report from the list to view it</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
