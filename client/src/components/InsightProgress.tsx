import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  const [statusMessage, setStatusMessage] = useState("Connecting to generation service...");
  const [status, setStatus] = useState<'generating' | 'completed' | 'failed' | 'connecting'>('connecting');

  useEffect(() => {
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('[InsightProgress] Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[InsightProgress] WebSocket connected');
      setStatusMessage("Starting analysis with Claude...");
      
      // Subscribe to this insight's progress updates
      ws.send(JSON.stringify({
        type: 'subscribe',
        insightId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[InsightProgress] WebSocket message:', data);

        if (data.type === 'progress') {
          // Update progress from WebSocket
          setProgress(data.percent || 5);
          setStatus(data.status || 'generating');
          
          if (data.currentStep) {
            setStatusMessage(data.currentStep);
          }

          if (data.status === 'completed') {
            setStatusMessage("Analysis complete!");
            setTimeout(() => {
              onComplete();
            }, 500);
          } else if (data.status === 'failed') {
            setStatus('failed');
            setStatusMessage(data.error || "Generation failed. Please try again.");
          }
        } else if (data.type === 'subscribed') {
          console.log('[InsightProgress] Subscribed to insight', data.insightId);
        } else if (data.type === 'connected') {
          console.log('[InsightProgress] WebSocket connection established');
        }
      } catch (error) {
        console.error('[InsightProgress] Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[InsightProgress] WebSocket error:', error);
      setStatusMessage("Connection error. Please refresh the page.");
      setStatus('failed');
    };

    ws.onclose = () => {
      console.log('[InsightProgress] WebSocket disconnected');
      // Only show error if not completed
      if (status !== 'completed') {
        setStatusMessage("Connection lost. Please refresh the page.");
      }
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          insightId,
        }));
      }
      ws.close();
    };
  }, [insightId, onComplete]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardContent className="p-6 md:p-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Generating Insights</h3>
              <p className="text-sm text-muted-foreground">
                Claude is analyzing your book...
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{statusMessage}</span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Status Message */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {status === 'failed' ? (
              <span className="text-destructive">❌ {statusMessage}</span>
            ) : status === 'completed' ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-500">{statusMessage}</span>
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{statusMessage}</span>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">What's happening:</strong>
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Analyzing book structure and themes</li>
              <li>• Extracting key insights and concepts</li>
              <li>• Generating comprehensive summaries</li>
              <li>• Creating visual representations</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              This typically takes 2-5 minutes depending on book length.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
