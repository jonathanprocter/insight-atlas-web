import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { FileText, Sparkles, Database, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadStage = "idle" | "reading" | "extracting" | "saving" | "complete" | "error";

interface UploadProgressProps {
  stage: UploadStage;
  filename?: string;
  error?: string;
  onComplete?: () => void;
}

const STAGES = [
  { id: "reading", label: "Reading file", icon: FileText, progress: 25 },
  { id: "extracting", label: "Extracting content", icon: Sparkles, progress: 60 },
  { id: "saving", label: "Saving to library", icon: Database, progress: 90 },
  { id: "complete", label: "Complete!", icon: CheckCircle2, progress: 100 },
];

export function UploadProgress({ stage, filename, error, onComplete }: UploadProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [animatedStage, setAnimatedStage] = useState<UploadStage>("idle");

  // Get target progress based on stage
  const getTargetProgress = (currentStage: UploadStage): number => {
    const stageInfo = STAGES.find(s => s.id === currentStage);
    return stageInfo?.progress || 0;
  };

  // Animate progress smoothly
  useEffect(() => {
    if (stage === "idle") {
      setDisplayProgress(0);
      setAnimatedStage("idle");
      return;
    }

    setAnimatedStage(stage);
    const target = getTargetProgress(stage);
    
    // Animate to target
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        if (prev >= target) {
          clearInterval(interval);
          return target;
        }
        // Smooth easing
        const diff = target - prev;
        const step = Math.max(1, Math.ceil(diff / 10));
        return Math.min(prev + step, target);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [stage]);

  // Call onComplete when animation finishes
  useEffect(() => {
    if (stage === "complete" && displayProgress === 100 && onComplete) {
      const timeout = setTimeout(onComplete, 1000);
      return () => clearTimeout(timeout);
    }
  }, [stage, displayProgress, onComplete]);

  if (stage === "idle") return null;

  const currentStageIndex = STAGES.findIndex(s => s.id === animatedStage);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border-2 border-primary/20 p-6 shadow-lg">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="font-serif text-xl text-foreground mb-1">
          {stage === "error" ? "Upload Failed" : "Processing Your Book"}
        </h3>
        {filename && (
          <p className="text-sm text-muted-foreground truncate max-w-[280px] mx-auto">
            {filename}
          </p>
        )}
      </div>

      {/* Error state */}
      {stage === "error" && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Progress bar */}
      {stage !== "error" && (
        <>
          <div className="mb-6">
            <Progress 
              value={displayProgress} 
              className="h-3 bg-primary/10"
            />
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted-foreground">
                {displayProgress}%
              </span>
              <span className="text-xs text-primary font-medium">
                {STAGES.find(s => s.id === animatedStage)?.label || "Processing..."}
              </span>
            </div>
          </div>

          {/* Stage indicators */}
          <div className="flex justify-between items-center">
            {STAGES.map((stageInfo, index) => {
              const Icon = stageInfo.icon;
              const isActive = stageInfo.id === animatedStage;
              const isComplete = index < currentStageIndex || (stage === "complete" && index <= currentStageIndex);
              const isPending = index > currentStageIndex;

              return (
                <div
                  key={stageInfo.id}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-300",
                    isActive && "scale-110",
                    isPending && "opacity-40"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                      isComplete && "bg-primary text-white",
                      isActive && !isComplete && "bg-primary/20 text-primary animate-pulse",
                      isPending && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isActive && !isComplete ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-medium text-center max-w-[60px]",
                      isActive && "text-primary",
                      isComplete && "text-primary",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {stageInfo.label.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Success animation */}
      {stage === "complete" && displayProgress === 100 && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 text-primary font-medium">
            <CheckCircle2 className="w-5 h-5" />
            <span>Book added to your library!</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadProgress;
