import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";
import { useGenerateWeeklyReport } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Loader2, Sparkles, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

export default function Report() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [generatedDate, setGeneratedDate] = useState<string | null>(null);

  const generateReport = useGenerateWeeklyReport();

  if (!authLoading && !isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleGenerate = () => {
    generateReport.mutate(undefined, {
      onSuccess: (data) => {
        setReportHtml(data.markdown);
        setGeneratedDate(data.generatedAt);
        toast.success("Weekly report generated");
      },
      onError: () => {
        toast.error("Failed to generate report. Make sure you have enough trade data.");
      }
    });
  };

  if (authLoading) return null;

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Weekly Psychology Report</h1>
          <p className="text-muted-foreground mt-1">A deep dive into your emotional performance.</p>
        </div>
        
        {reportHtml && (
          <Button onClick={handleGenerate} disabled={generateReport.isPending} variant="outline" className="border-border">
            {generateReport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
            Regenerate
          </Button>
        )}
      </div>

      {!reportHtml ? (
        <Card className="border-border bg-card overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary/50 to-blue-500/50" />
          <CardContent className="flex flex-col items-center justify-center p-16 text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Ready for your review?</h2>
            <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
              Dr. Trade will analyze your entire week of journaling, cross-reference it with your P&L, and synthesize a brutally honest assessment of your behavioral patterns.
            </p>
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg font-semibold gap-2" 
              onClick={handleGenerate} 
              disabled={generateReport.isPending}
            >
              {generateReport.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Data...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Weekly Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <Card className="border-border bg-card/50 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardContent className="p-8 sm:p-12">
              <div className="flex items-center gap-2 text-muted-foreground mb-8 font-mono text-sm border-b border-border/50 pb-6">
                <Calendar className="h-4 w-4" />
                Generated on {generatedDate ? format(new Date(generatedDate), "MMMM d, yyyy 'at' h:mm a") : "Unknown date"}
              </div>
              
              <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-foreground/90 prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground/90">
                <ReactMarkdown>{reportHtml}</ReactMarkdown>
              </article>
            </CardContent>
          </Card>
        </div>
      )}
    </Layout>
  );
}
