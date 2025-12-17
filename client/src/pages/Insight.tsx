import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ExportModal } from "@/components/ExportModal";
import { InsightCoverPage, TableOfContents } from "@/components/InsightCoverPage";
import { 
  FlowDiagram, 
  ComparisonTable, 
  ActionList, 
  QuoteBlock, 
  ConceptCard, 
  ChapterCard,
  TakeawayBox,
  MetricDisplay
} from "@/components/InsightVisuals";
import { PremiumSectionRenderer } from "@/components/PremiumSections";
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
  ChevronUp,
  List,
  RefreshCw,
  FileText,
} from "lucide-react";

export default function InsightPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const insightId = parseInt(params.id || "0");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showCover, setShowCover] = useState(true);
  const [showTOC, setShowTOC] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const { data: insight, isLoading: insightLoading } = trpc.insights.get.useQuery(
    { id: insightId },
    { enabled: !!insightId }
  );

  const { data: book } = trpc.books.get.useQuery(
    { id: insight?.bookId || 0 },
    { enabled: !!insight?.bookId }
  );

  const { data: voices } = trpc.audio.voices.useQuery();

  const [selectedVoice, setSelectedVoice] = useState("rachel");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate section IDs for navigation
  const sections = useMemo(() => {
    if (!insight?.contentBlocks) return [];
    return insight.contentBlocks
      .filter((block: any) => block.blockType === 'heading' || block.type === 'heading')
      .map((block: any, index: number) => ({
        id: `section-${index}`,
        title: block.content || block.title || `Section ${index + 1}`,
        type: block.sectionType || block.type || 'content'
      }));
  }, [insight?.contentBlocks]);

  // Scroll tracking for back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
      // Hide cover after scrolling past it
      if (window.scrollY > 200) {
        setShowCover(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const regenerateMutation = trpc.insights.regenerate.useMutation({
    onSuccess: () => {
      toast.success("Insights regenerated successfully!");
      window.location.reload();
    },
    onError: (error: { message: string }) => {
      toast.error(`Regeneration failed: ${error.message}`);
    },
  });

  // Calculate word count from content blocks
  const wordCount = useMemo(() => {
    if (!insight?.contentBlocks) return 0;
    return insight.contentBlocks.reduce((total: number, block: any) => {
      const content = block.content || block.text || '';
      const words = typeof content === 'string' ? content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
      return total + words;
    }, 0);
  }, [insight?.contentBlocks]);

  // Audio player controls
  useEffect(() => {
    // Validate audioUrl is a proper URL before creating Audio element
    const isValidUrl = (url: string | null | undefined): boolean => {
      if (!url) return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    if (!insight?.audioUrl || !isValidUrl(insight.audioUrl)) return;
    
    const audio = new Audio(insight.audioUrl);
    audioRef.current = audio;
    
    const handleTimeUpdate = () => setAudioProgress(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => { 
      setIsPlaying(false); 
      setAudioProgress(0); 
    };
    
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audioRef.current = null;
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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setShowTOC(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (insightLoading) {
    return <LoadingState />;
  }

  if (!insight) {
    return <NotFoundState onBack={() => navigate("/")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cover Page */}
      {showCover && (
        <InsightCoverPage
          title={insight.title}
          bookTitle={book?.title}
          author={book?.author || undefined}
          createdAt={insight.createdAt}
          keyThemes={insight.keyThemes}
        />
      )}

      {/* Sticky Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 safe-area-top">
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="touch-target">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 md:gap-3">
                <img src="/insight-atlas-logo.png" alt="Insight Atlas" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                <span className="font-serif text-lg md:text-xl font-semibold text-foreground hidden sm:block">
                  Insight Atlas
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* TOC Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTOC(!showTOC)}
                className="touch-target text-xs md:text-sm"
              >
                <List className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Contents</span>
              </Button>

              {!insight.audioUrl ? (
                <>
                  {/* Voice Selection */}
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="w-[100px] md:w-[140px] h-9 text-xs md:text-sm">
                      <SelectValue placeholder="Voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices?.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{voice.name}</span>
                            <span className="text-xs text-muted-foreground hidden md:block">{voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAudioMutation.mutate({ insightId, voiceId: selectedVoice })}
                    disabled={generateAudioMutation.isPending}
                    className="touch-target text-xs md:text-sm"
                  >
                    {generateAudioMutation.isPending ? (
                      <Loader2 className="w-4 h-4 md:mr-2 animate-spin" />
                    ) : (
                      <Headphones className="w-4 h-4 md:mr-2" />
                    )}
                    <span className="hidden md:inline">Generate Audio</span>
                  </Button>
                </>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportModalOpen(true)}
                className="touch-target text-xs md:text-sm"
              >
                <FileDown className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => regenerateMutation.mutate({ id: insightId })}
                disabled={regenerateMutation.isPending}
                className="touch-target text-xs md:text-sm"
                title="Regenerate insights with a fresh perspective"
              >
                {regenerateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 md:mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 md:mr-2" />
                )}
                <span className="hidden md:inline">Regenerate</span>
              </Button>
              {/* Word Count Badge */}
              {wordCount > 0 && (
                <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
                  <FileText className="w-3 h-3" />
                  <span>{wordCount.toLocaleString()} words</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Table of Contents Sidebar */}
      {showTOC && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setShowTOC(false)}>
          <div 
            className="absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-card border-l border-border shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-serif text-lg font-semibold">Table of Contents</h3>
            </div>
            <div className="p-4">
              <TableOfContents sections={sections} onNavigate={scrollToSection} />
            </div>
          </div>
        </div>
      )}

      {/* Audio Player Bar - Mobile Optimized */}
      {insight.audioUrl && (
        <div className="sticky top-[57px] md:top-[65px] z-40 bg-card border-b border-border shadow-sm safe-area-top">
          <div className="container py-2 md:py-3">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Play Controls */}
              <div className="flex items-center gap-1 md:gap-2">
                <Button variant="ghost" size="icon" onClick={() => seekAudio(-15)} className="w-8 h-8 md:w-10 md:h-10 touch-target">
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary hover:bg-primary/90 touch-target"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => seekAudio(15)} className="w-8 h-8 md:w-10 md:h-10 touch-target">
                  <SkipForward className="w-4 h-4" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 flex items-center gap-2 md:gap-3">
                <span className="text-xs md:text-sm text-muted-foreground w-10 md:w-12 text-right">
                  {formatTime(audioProgress)}
                </span>
                <div 
                  className="flex-1 h-2 md:h-3 bg-muted rounded-full overflow-hidden touch-target"
                  onClick={(e) => {
                    if (!audioRef.current) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime = percent * audioDuration;
                  }}
                >
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(audioProgress / audioDuration) * 100}%` }}
                  />
                </div>
                <span className="text-xs md:text-sm text-muted-foreground w-10 md:w-12">
                  {formatTime(audioDuration)}
                </span>
              </div>

              {/* Volume - Hidden on mobile */}
              <Button variant="ghost" size="icon" onClick={toggleMute} className="hidden md:flex touch-target">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container py-6 md:py-12 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <div className="premium-border p-4 md:p-8 mb-6 md:mb-8 text-center">
            <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              {insight.title}
            </h1>
            {book && (
              <p className="text-muted-foreground mb-2">
                Insights from <span className="italic">"{book.title}"</span>
                {book.author && <span> by {book.author}</span>}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground">
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
            <div className="flex flex-wrap gap-2 justify-center mb-6 md:mb-8">
              {insight.keyThemes.map((theme: string, i: number) => (
                <span
                  key={i}
                  className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium text-primary-foreground"
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
            <div className="quote-block mb-6 md:mb-8">
              <h2 className="font-serif text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">
                Executive Summary
              </h2>
              <p className="text-foreground text-base md:text-lg leading-relaxed">
                {insight.summary}
              </p>
            </div>
          )}

          {/* Content Blocks */}
          <div className="space-y-4 md:space-y-6">
            {insight.contentBlocks?.map((block: any, index: number) => {
              // Check if this is a premium section type
              const premiumTypes = ['quickGlance', 'foundationalNarrative', 'executiveSummary', 'conceptExplanation', 'practicalExample', 'insightAtlasNote', 'actionBox', 'selfAssessment', 'structureMap', 'keyTakeaways', 'visualFramework'];
              if (premiumTypes.includes(block.blockType)) {
                return (
                  <PremiumSectionRenderer
                    key={block.id || index}
                    section={{
                      type: block.blockType,
                      title: block.title || '',
                      content: block.content || '',
                      visualType: block.visualType,
                      visualData: block.visualData ? (typeof block.visualData === 'string' ? JSON.parse(block.visualData) : block.visualData) : undefined,
                      metadata: block.listItems ? (typeof block.listItems === 'string' ? JSON.parse(block.listItems) : block.listItems) : undefined,
                    }}
                  />
                );
              }
              return <ContentBlock key={block.id || index} block={block} sectionIndex={index} />;
            })}
          </div>

          {/* Footer */}
          <div className="section-divider mt-8 md:mt-12"></div>
          <div className="text-center py-6 md:py-8">
            <img src="/insight-atlas-logo.png" alt="Insight Atlas" className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="font-serif text-base md:text-lg text-muted-foreground italic">
              Generated by Insight Atlas
            </p>
          </div>
        </div>
      </main>

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg"
          onClick={scrollToTop}
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        insightId={insightId}
        title={insight.title}
      />
    </div>
  );
}

function ContentBlock({ block, sectionIndex }: { block: any; sectionIndex: number }) {
  const type = block.blockType || block.type;

  // Generate section ID for navigation
  const sectionId = type === 'heading' ? `section-${sectionIndex}` : undefined;

  switch (type) {
    case "heading":
      return (
        <h2 
          id={sectionId}
          className="font-serif text-xl md:text-2xl font-bold text-foreground mt-8 md:mt-10 mb-3 md:mb-4 pb-2 border-b-2 border-primary scroll-mt-20"
        >
          {block.content}
        </h2>
      );

    case "paragraph":
      return (
        <p className="text-foreground text-base md:text-lg leading-relaxed">
          {block.content}
        </p>
      );

    case "quote":
      return (
        <QuoteBlock 
          quote={block.content} 
          attribution={block.title}
          context={block.context}
        />
      );

    case "bulletList":
    case "numberedList":
      return (
        <ActionList 
          title={block.title || "Key Points"} 
          items={block.items || []}
          icon={type === "numberedList" ? "→" : "•"}
        />
      );

    case "insightNote":
      return (
        <ConceptCard
          title={block.title || "Key Insight"}
          definition={block.content}
          example={block.example}
          icon="💡"
        />
      );

    case "authorSpotlight":
      return (
        <div className="premium-border p-4 md:p-6 my-6">
          <h3 className="font-serif text-lg md:text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            About the Author
          </h3>
          <p className="text-foreground leading-relaxed">{block.content}</p>
        </div>
      );

    case "researchInsight":
      return (
        <div className="bg-card border border-border rounded-xl p-4 md:p-6 my-6">
          <h3 className="font-serif text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Research & Evidence
          </h3>
          <p className="text-foreground leading-relaxed">{block.content}</p>
        </div>
      );

    case "alternativePerspective":
      return (
        <div className="bg-muted/30 border-l-4 border-primary/50 p-4 md:p-6 my-6 rounded-r-lg">
          <h3 className="font-serif text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Alternative Perspectives
          </h3>
          <p className="text-foreground leading-relaxed">{block.content}</p>
        </div>
      );

    case "keyTakeaways":
      return (
        <TakeawayBox 
          title="Key Takeaways" 
          takeaways={block.items || []}
        />
      );

    case "flowDiagram":
      return (
        <FlowDiagram 
          title={block.title || "Process Flow"} 
          steps={block.steps || []}
        />
      );

    case "comparisonTable":
      return (
        <ComparisonTable
          title={block.title || "Comparison"}
          leftHeader={block.leftHeader || "Positive"}
          rightHeader={block.rightHeader || "Negative"}
          rows={block.rows || []}
        />
      );

    case "chapterBreakdown":
      return (
        <ChapterCard
          chapterNumber={block.chapterNumber || ""}
          title={block.title || "Chapter Summary"}
          summary={block.content || block.summary || ""}
          keyPoints={block.keyPoints}
        />
      );

    default:
      // Default paragraph rendering
      if (block.content) {
        return (
          <p className="text-foreground text-base md:text-lg leading-relaxed">
            {block.content}
          </p>
        );
      }
      return null;
  }
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading insights...</p>
      </div>
    </div>
  );
}

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Insight Not Found</h2>
        <p className="text-muted-foreground mb-6">The insight you're looking for doesn't exist.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    </div>
  );
}
