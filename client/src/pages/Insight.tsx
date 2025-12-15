import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BookOpen,
  ArrowLeft,
  Headphones,
  FileDown,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Loader2,
  Clock,
  Tag,
  Lightbulb,
  Quote,
  User,
  BookMarked,
  FlaskConical,
  ListChecks,
  Sparkles,
  Brain,
  SkipBack,
  SkipForward,
} from "lucide-react";

export default function InsightPage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const insightId = parseInt(params.id || "0");

  const { data: insight, isLoading: insightLoading } = trpc.insights.get.useQuery(
    { id: insightId },
    { enabled: !!insightId && !!user }
  );

  const { data: voices } = trpc.audio.voices.useQuery();

  const [selectedVoice, setSelectedVoice] = useState("rachel");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateAudioMutation = trpc.audio.generate.useMutation({
    onSuccess: () => {
      toast.success("Audio generated successfully!");
    },
    onError: (error) => {
      toast.error(`Audio generation failed: ${error.message}`);
    },
  });

  const exportPdfMutation = trpc.export.pdf.useMutation({
    onSuccess: (data) => {
      toast.success("PDF generated!");
      window.open(data.pdfUrl, "_blank");
    },
    onError: (error) => {
      toast.error(`PDF export failed: ${error.message}`);
    },
  });

  // Audio player controls
  useEffect(() => {
    if (insight?.audioUrl && !audioRef.current) {
      audioRef.current = new Audio(insight.audioUrl);
      audioRef.current.addEventListener("timeupdate", () => {
        if (audioRef.current) {
          setAudioProgress(audioRef.current.currentTime);
        }
      });
      audioRef.current.addEventListener("loadedmetadata", () => {
        if (audioRef.current) {
          setAudioDuration(audioRef.current.duration);
        }
      });
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setAudioProgress(0);
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [insight?.audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const seekAudio = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.currentTime + seconds, audioDuration));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (authLoading || insightLoading) {
    return <LoadingState />;
  }

  if (!insight) {
    return <NotFoundState onBack={() => navigate("/")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-serif text-xl font-semibold text-foreground hidden md:block">
                  Insight Atlas
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!insight.audioUrl ? (
                <Button
                  variant="outline"
                  onClick={() => generateAudioMutation.mutate({ insightId, voiceId: selectedVoice })}
                  disabled={generateAudioMutation.isPending}
                >
                  {generateAudioMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Headphones className="w-4 h-4 mr-2" />
                  )}
                  Generate Audio
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => exportPdfMutation.mutate({ insightId })}
                disabled={exportPdfMutation.isPending}
              >
                {exportPdfMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Audio Player Bar */}
      {insight.audioUrl && (
        <div className="sticky top-[73px] z-40 bg-card border-b border-border shadow-sm">
          <div className="container py-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => seekAudio(-15)}>
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => seekAudio(15)}>
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {formatTime(audioProgress)}
                </span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(audioProgress / audioDuration) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">
                  {formatTime(audioDuration)}
                </span>
              </div>

              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-3xl mx-auto">
          {/* Title Section */}
          <div className="premium-border p-8 mb-8 text-center">
            <h1 className="font-serif text-4xl font-bold text-foreground mb-4">
              {insight.title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{new Date(insight.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}</span>
            </div>
          </div>

          {/* Key Themes */}
          {insight.keyThemes && insight.keyThemes.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {insight.keyThemes.map((theme: string, i: number) => (
                <span
                  key={i}
                  className="px-4 py-2 rounded-full text-sm font-medium text-primary-foreground"
                  style={{
                    background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%)"
                  }}
                >
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {insight.summary && (
            <div className="quote-block mb-8">
              <h2 className="font-serif text-xl font-semibold text-foreground mb-3">
                Executive Summary
              </h2>
              <p className="text-foreground text-lg leading-relaxed">
                {insight.summary}
              </p>
            </div>
          )}

          {/* Content Blocks */}
          <div className="space-y-6">
            {insight.contentBlocks?.map((block: any, index: number) => (
              <ContentBlock key={block.id || index} block={block} />
            ))}
          </div>

          {/* Footer */}
          <div className="section-divider mt-12"></div>
          <div className="text-center py-8">
            <p className="font-serif text-lg text-muted-foreground italic">
              Generated by Insight Atlas
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function ContentBlock({ block }: { block: any }) {
  const type = block.blockType;

  switch (type) {
    case "heading":
      return (
        <h2 className="font-serif text-2xl font-bold text-foreground mt-8 mb-4 pb-2 border-b-2 border-primary">
          {block.content}
        </h2>
      );

    case "paragraph":
      return (
        <p className="text-foreground text-lg leading-relaxed">
          {block.content}
        </p>
      );

    case "quote":
      return (
        <blockquote className="quote-block">
          <Quote className="w-8 h-8 text-primary/30 mb-2" />
          <p className="text-xl italic text-foreground">{block.content}</p>
          {block.title && (
            <p className="text-sm text-muted-foreground mt-3">— {block.title}</p>
          )}
        </blockquote>
      );

    case "authorSpotlight":
      return (
        <div className="author-spotlight">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <p className="text-foreground">{block.content}</p>
          </div>
        </div>
      );

    case "insightNote":
      return (
        <div className="insight-note">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-primary" />
            <span className="font-medium text-primary uppercase text-sm tracking-wide">
              {block.title || "Key Insight"}
            </span>
          </div>
          <p className="text-foreground">{block.content}</p>
        </div>
      );

    case "alternativePerspective":
      return (
        <div className="alt-perspective">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground uppercase text-sm tracking-wide">
              Alternative Perspective
            </span>
          </div>
          <p className="text-foreground">{block.content}</p>
        </div>
      );

    case "researchInsight":
      return (
        <div className="research-insight">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-600 uppercase text-sm tracking-wide">
              Research Insight
            </span>
          </div>
          <p className="text-foreground">{block.content}</p>
        </div>
      );

    case "keyTakeaways":
      const takeaways = block.listItems || [];
      return (
        <div className="key-takeaways">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-5 h-5" />
            <span className="font-medium uppercase text-sm tracking-wide">
              Key Takeaways
            </span>
          </div>
          <ul className="space-y-3">
            {takeaways.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-lg">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case "exercise":
      return (
        <div className="exercise-box">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-pink-600" />
            <span className="font-medium text-pink-600 uppercase text-sm tracking-wide">
              {block.title || "Exercise"}
            </span>
          </div>
          <p className="text-foreground">{block.content}</p>
        </div>
      );

    case "bulletList":
      const bulletItems = block.listItems || [];
      return (
        <Card className="premium-card">
          <CardContent className="p-6">
            {block.title && (
              <h4 className="font-serif text-lg font-semibold text-foreground mb-4">
                {block.title}
              </h4>
            )}
            <ul className="space-y-2">
              {bulletItems.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <span className="text-primary mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );

    case "numberedList":
      const numberedItems = block.listItems || [];
      return (
        <Card className="premium-card">
          <CardContent className="p-6">
            {block.title && (
              <h4 className="font-serif text-lg font-semibold text-foreground mb-4">
                {block.title}
              </h4>
            )}
            <ol className="space-y-2">
              {numberedItems.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-foreground">
                  <span className="text-primary font-medium">{i + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      );

    case "sectionDivider":
      return <div className="section-divider"></div>;

    default:
      return block.content ? (
        <p className="text-foreground text-lg leading-relaxed">{block.content}</p>
      ) : null;
  }
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground font-serif text-lg">Loading insights...</p>
      </div>
    </div>
  );
}

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <BookMarked className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">Insight Not Found</h2>
        <p className="text-muted-foreground mb-4">The insight you're looking for doesn't exist.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    </div>
  );
}
