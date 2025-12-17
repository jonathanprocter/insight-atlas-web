import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  Quote,
  ListChecks,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface InsightProgressProps {
  insightId: number;
  onComplete: () => void;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  heading: <BookOpen className="w-4 h-4" />,
  paragraph: <Sparkles className="w-4 h-4" />,
  quote: <Quote className="w-4 h-4" />,
  insightNote: <Lightbulb className="w-4 h-4" />,
  bulletList: <ListChecks className="w-4 h-4" />,
  numberedList: <ListChecks className="w-4 h-4" />,
  authorSpotlight: <BookOpen className="w-4 h-4" />,
  alternativePerspective: <Sparkles className="w-4 h-4" />,
  researchInsight: <Lightbulb className="w-4 h-4" />,
};

export function InsightProgress({ insightId, onComplete }: InsightProgressProps) {
  const [sections, setSections] = useState<Array<{ type: string; content?: string }>>([]);
  const [progress, setProgress] = useState(5);
  const [statusMessage, setStatusMessage] = useState("Starting analysis with Claude...");

  // Poll for status updates
  const { data: status, error: statusError } = trpc.insights.getStatus.useQuery(
    { id: insightId },
    {
      refetchInterval: 1000, // Poll every second
      enabled: !!insightId,
      retry: false, // Don't retry failed queries
      refetchOnWindowFocus: false,
    }
  );
  
  // Log errors without throwing
  useEffect(() => {
    if (statusError) {
      console.log('[InsightProgress] Status query error (non-critical):', statusError.message);
    }
  }, [statusError]);

  useEffect(() => {
    if (status) {
      // Safely access progress with fallback
      const progressValue = typeof status.progress === 'number' ? status.progress : 5;
      setProgress(progressValue);
      
      if (status.status === "completed") {
        setStatusMessage("Analysis complete!");
        setTimeout(onComplete, 500);
      } else if (status.status === "failed") {
        setStatusMessage("Generation failed. Please try again.");
      } else if (status.sectionCount && status.sectionCount > 0) {
        setStatusMessage(`Generating section ${status.sectionCount}...`);
      }
    }
  }, [status, onComplete]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardContent className="p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div 
              className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"
              style={{ animationDuration: "1.5s" }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-2">
            Generating Insights
          </h3>
          <p className="text-muted-foreground text-sm md:text-base">
            {statusMessage}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Title and Summary Preview */}
        {status?.title && typeof status.title === 'string' && status.title.trim() && status.title !== `Insights: ` && (
          <div className="mb-4 p-4 bg-background/50 rounded-lg border border-border">
            <h4 className="font-serif text-lg font-semibold text-foreground mb-2">
              {status.title}
            </h4>
            {status.summary && typeof status.summary === 'string' && status.summary.trim() && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {status.summary}
              </p>
            )}
          </div>
        )}

        {/* Section Count */}
        {status?.sectionCount && status.sectionCount > 0 && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span>{status.sectionCount} sections generated</span>
          </div>
        )}

        {/* Animated Dots */}
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
