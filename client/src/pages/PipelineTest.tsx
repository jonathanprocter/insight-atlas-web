import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BookOpen,
  ArrowLeft,
  Upload,
  FileDown,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Brain,
  FileText,
  Mic,
  BarChart3,
  Zap,
} from "lucide-react";

type PipelineStage = 
  | "idle" 
  | "uploading" 
  | "extracting" 
  | "analyzing" 
  | "generating" 
  | "gapAnalysis" 
  | "audio" 
  | "complete" 
  | "error";

const STAGE_INFO: Record<PipelineStage, { label: string; description: string; icon: React.ReactNode; percent: number }> = {
  idle: { label: "Ready", description: "Upload a PDF to test the pipeline", icon: <Upload className="w-5 h-5" />, percent: 0 },
  uploading: { label: "Uploading", description: "Reading and uploading your book...", icon: <Upload className="w-5 h-5 animate-pulse" />, percent: 5 },
  extracting: { label: "Extracting", description: "Extracting text content from PDF...", icon: <FileText className="w-5 h-5 animate-pulse" />, percent: 15 },
  analyzing: { label: "Stage 0: Analysis", description: "Analyzing book structure and concepts with Claude...", icon: <Brain className="w-5 h-5 animate-pulse" />, percent: 25 },
  generating: { label: "Stage 1: Content", description: "Generating premium content with Claude...", icon: <Sparkles className="w-5 h-5 animate-pulse" />, percent: 50 },
  gapAnalysis: { label: "Gap Analysis", description: "Checking all 9 dimensions and filling gaps...", icon: <BarChart3 className="w-5 h-5 animate-pulse" />, percent: 75 },
  audio: { label: "Stage 2: Audio", description: "Generating audio narration script...", icon: <Mic className="w-5 h-5 animate-pulse" />, percent: 90 },
  complete: { label: "Complete", description: "Pipeline finished successfully!", icon: <CheckCircle className="w-5 h-5 text-green-500" />, percent: 100 },
  error: { label: "Error", description: "Something went wrong", icon: <AlertCircle className="w-5 h-5 text-red-500" />, percent: 0 },
};

export default function PipelineTestPage() {
  const [, navigate] = useLocation();
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [filename, setFilename] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [bookId, setBookId] = useState<number | null>(null);
  const [insightId, setInsightId] = useState<number | null>(null);
  const [sectionCount, setSectionCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [generationLog, setGenerationLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setGenerationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Upload mutation
  const uploadMutation = trpc.books.upload.useMutation({
    onSuccess: (data) => {
      setBookId(data.bookId);
      addLog(`Book uploaded successfully. ID: ${data.bookId}`);
      setStage("analyzing");
      // Start insight generation
      generateMutation.mutate({ bookId: data.bookId });
    },
    onError: (error) => {
      setStage("error");
      setErrorMessage(error.message);
      addLog(`Upload error: ${error.message}`);
    },
  });

  // Generate insights mutation
  const generateMutation = trpc.insights.generate.useMutation({
    onSuccess: (data) => {
      setInsightId(data.insightId);
      setSectionCount(data.sectionCount);
      setWordCount(data.wordCount);
      addLog(`Insights generated! ID: ${data.insightId}, Sections: ${data.sectionCount}, Words: ${data.wordCount}`);
      setStage("complete");
      toast.success("Pipeline completed successfully!");
    },
    onError: (error) => {
      setStage("error");
      setErrorMessage(error.message);
      addLog(`Generation error: ${error.message}`);
    },
  });

  // Poll for progress updates when generating
  const { data: progressData } = trpc.insights.getGenerationProgress.useQuery(
    { insightId: insightId! },
    {
      enabled: !!insightId && stage !== "complete" && stage !== "error",
      refetchInterval: 2000,
    }
  );

  useEffect(() => {
    if (progressData) {
      setSectionCount(progressData.sectionCount);
      setWordCount(progressData.wordCount || 0);
      
      if (progressData.isComplete) {
        setStage("complete");
        addLog("Generation complete!");
      } else if (progressData.isFailed) {
        setStage("error");
        setErrorMessage("Generation failed");
      }
    }
  }, [progressData]);

  // Simulate stage progression based on mutation state
  useEffect(() => {
    if (generateMutation.isPending && stage === "analyzing") {
      const timer1 = setTimeout(() => {
        setStage("generating");
        addLog("Stage 1: Generating premium content...");
      }, 3000);
      
      const timer2 = setTimeout(() => {
        setStage("gapAnalysis");
        addLog("Running gap analysis on all 9 dimensions...");
      }, 15000);
      
      const timer3 = setTimeout(() => {
        setStage("audio");
        addLog("Generating audio narration script...");
      }, 25000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [generateMutation.isPending, stage]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await uploadFile(file);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  }, []);

  const uploadFile = async (file: File) => {
    // Validate file type
    const validTypes = ["application/pdf", "application/epub+zip", "text/plain"];
    const validExtensions = [".pdf", ".epub", ".txt"];
    
    const isValidType = validTypes.includes(file.type) || 
      validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast.error("Please upload a PDF, EPUB, or TXT file");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File size must be less than 50MB");
      return;
    }

    // Reset state
    setFilename(file.name);
    setErrorMessage("");
    setGenerationLog([]);
    setBookId(null);
    setInsightId(null);
    setSectionCount(0);
    setWordCount(0);
    
    setStage("uploading");
    addLog(`Starting upload: ${file.name}`);

    try {
      const buffer = await file.arrayBuffer();
      setStage("extracting");
      addLog("Extracting text content...");
      
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      uploadMutation.mutate({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileData: base64,
      });
    } catch (error) {
      setStage("error");
      setErrorMessage("Failed to read file");
      addLog("Error reading file");
    }
  };

  const resetTest = () => {
    setStage("idle");
    setFilename("");
    setErrorMessage("");
    setGenerationLog([]);
    setBookId(null);
    setInsightId(null);
    setSectionCount(0);
    setWordCount(0);
  };

  const stageInfo = STAGE_INFO[stage];
  const isProcessing = stage !== "idle" && stage !== "complete" && stage !== "error";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card safe-area-top">
        <div className="container py-3 md:py-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="touch-target">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg md:text-2xl font-semibold text-foreground">Pipeline Test</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 md:py-12 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Test Insight Generation Pipeline
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Upload a PDF to test the complete Stage 0 → Stage 1 → Gap Analysis → Audio pipeline
            </p>
          </div>

          {/* Pipeline Stages Overview */}
          <Card className="premium-card mb-6">
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4">
                {(["analyzing", "generating", "gapAnalysis", "audio"] as PipelineStage[]).map((s, i) => {
                  const info = STAGE_INFO[s];
                  const isActive = stage === s;
                  const isComplete = STAGE_INFO[stage].percent > info.percent || stage === "complete";
                  
                  return (
                    <div 
                      key={s}
                      className={`text-center p-2 md:p-3 rounded-lg transition-all ${
                        isActive ? "bg-primary/20 border border-primary" : 
                        isComplete ? "bg-green-500/10 border border-green-500/30" : 
                        "bg-muted/50"
                      }`}
                    >
                      <div className={`w-8 h-8 md:w-10 md:h-10 mx-auto mb-1 md:mb-2 rounded-full flex items-center justify-center ${
                        isActive ? "bg-primary text-primary-foreground" :
                        isComplete ? "bg-green-500 text-white" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {isComplete && !isActive ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5" /> : info.icon}
                      </div>
                      <p className="text-xs md:text-sm font-medium truncate">{info.label.replace("Stage ", "").replace(": ", "\n")}</p>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>{stageInfo.label}</span>
                  <span>{stageInfo.percent}%</span>
                </div>
                <Progress value={stageInfo.percent} className="h-2" />
              </div>

              {/* Status Message */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                {stageInfo.icon}
                <span>{stageInfo.description}</span>
              </div>
            </CardContent>
          </Card>

          {/* Upload Area */}
          {stage === "idle" && (
            <div
              className={`
                relative p-8 md:p-12 rounded-xl border-2 border-dashed transition-all duration-300 mb-6
                ${isDragging 
                  ? "border-primary bg-primary/5 scale-[1.02]" 
                  : "border-border hover:border-primary/50 hover:bg-card"
                }
              `}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf,.epub,.txt"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                </div>
                
                <h3 className="font-serif text-xl md:text-2xl font-semibold text-foreground mb-2">
                  Drop your book here
                </h3>
                <p className="text-muted-foreground mb-4">
                  or tap to browse your files
                </p>
                <div className="flex items-center justify-center gap-3 md:gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileDown className="w-4 h-4" /> PDF
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" /> EPUB
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" /> TXT
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <Card className="premium-card mb-6">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{filename}</h3>
                    <p className="text-sm text-muted-foreground">Processing...</p>
                  </div>
                </div>

                {sectionCount > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-primary">{sectionCount}</p>
                      <p className="text-xs text-muted-foreground">Sections</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-primary">{wordCount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Words</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Complete State */}
          {stage === "complete" && insightId && (
            <Card className="premium-card mb-6 border-green-500/30">
              <CardContent className="p-4 md:p-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                    Pipeline Complete!
                  </h3>
                  <p className="text-muted-foreground">
                    Generated {sectionCount} sections with {wordCount.toLocaleString()} words
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 justify-center">
                  <Button 
                    className="btn-gold"
                    onClick={() => navigate(`/insight/${insightId}`)}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    View Insights
                  </Button>
                  <Button variant="outline" onClick={resetTest}>
                    Test Another Book
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {stage === "error" && (
            <Card className="premium-card mb-6 border-red-500/30">
              <CardContent className="p-4 md:p-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                    Pipeline Error
                  </h3>
                  <p className="text-red-500">{errorMessage}</p>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline" onClick={resetTest}>
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generation Log */}
          {generationLog.length > 0 && (
            <Card className="premium-card">
              <CardContent className="p-4 md:p-6">
                <h3 className="font-semibold text-foreground mb-3">Pipeline Log</h3>
                <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-xs">
                  {generationLog.map((log, i) => (
                    <div key={i} className="text-muted-foreground py-0.5">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
