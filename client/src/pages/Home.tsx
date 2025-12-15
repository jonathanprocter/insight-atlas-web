import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UploadProgress, type UploadStage } from "@/components/UploadProgress";
import { 
  BookOpen, 
  Sparkles, 
  Headphones, 
  FileDown, 
  Upload, 
  Library,
  ChevronRight,
  Star,
  Zap,
  Brain,
  BarChart3
} from "lucide-react";

export default function Home() {
  // No auth required - always show Dashboard
  return <Dashboard />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background safe-area-top safe-area-bottom">
      <div className="text-center px-4">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground font-serif text-lg">Loading Insight Atlas...</p>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden safe-area-top">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
        <div className="container py-6 md:py-8">
          <nav className="flex items-center justify-between mb-8 md:mb-16">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl md:text-2xl font-semibold text-foreground">Insight Atlas</span>
            </div>
            <Button asChild className="btn-gold btn-mobile">
              <a href="/">Get Started</a>
            </Button>
          </nav>

          <div className="max-w-4xl mx-auto text-center py-8 md:py-16 relative">
            <div className="premium-border inline-block px-4 md:px-8 py-8 md:py-16 mb-8">
              <h1 className="font-serif text-3xl md:text-5xl lg:text-7xl font-bold text-foreground mb-4 md:mb-6 leading-tight">
                Transform Books<br />
                <span className="text-primary">Into Wisdom</span>
              </h1>
              <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8 font-sans px-2">
                Upload any book and receive AI-powered insights with premium visualizations, 
                audio narration, and beautifully crafted PDF exports.
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:gap-4 justify-center px-4">
                <Button asChild size="lg" className="btn-gold text-base md:text-lg px-6 md:px-8 w-full md:w-auto">
                  <a href="/">
                    Start Your Journey
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="text-base md:text-lg px-6 md:px-8 border-primary/30 hover:bg-primary/5 w-full md:w-auto">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-12 md:py-24 bg-card">
        <div className="container">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
              Premium Features
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto px-4">
              Every feature designed to help you extract maximum value from your reading
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 md:w-8 md:h-8" />}
              title="AI-Powered Insights"
              description="Advanced AI analyzes your books to extract key themes, actionable takeaways, and profound insights"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 md:w-8 md:h-8" />}
              title="30 Visual Types"
              description="Intelligent visualization selection from timelines to mind maps, automatically matched to your content"
            />
            <FeatureCard
              icon={<Headphones className="w-6 h-6 md:w-8 md:h-8" />}
              title="Audio Narration"
              description="Premium ElevenLabs voices bring your insights to life with natural, engaging audio summaries"
            />
            <FeatureCard
              icon={<FileDown className="w-6 h-6 md:w-8 md:h-8" />}
              title="PDF Export"
              description="Beautifully designed exports with ornate borders, elegant typography, and premium styling"
            />
          </div>
        </div>
      </section>

      {/* Visual Types Preview - Hidden on mobile for cleaner experience */}
      <section className="py-12 md:py-24 bg-background hidden md:block">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              30 Intelligent Visualizations
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our AI automatically selects the perfect visualization for your content
            </p>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {[
              "Timeline", "Flow Diagram", "Mind Map", "Bar Chart", "Pie Chart",
              "Comparison", "Hierarchy", "Network", "Radar", "Venn",
              "Gantt", "Funnel", "Pyramid", "Cycle", "SWOT",
              "Sankey", "Treemap", "Heatmap", "Journey Map", "Infographic",
              "Storyboard", "Process Flow", "Quadrant", "Concept Map", "Fishbone",
              "Scatter Plot", "Area Chart", "Line Chart", "Bubble Chart", "Table"
            ].map((type, i) => (
              <div 
                key={type}
                className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center card-mobile"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-4 md:mb-6">
              Ready to Transform Your Reading?
            </h2>
            <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8">
              Join thousands of readers who have discovered the power of AI-enhanced book insights.
            </p>
            <Button asChild size="lg" className="btn-gold text-base md:text-lg px-8 md:px-12 w-full md:w-auto">
              <a href="/">
                Get Started Free
                <Zap className="ml-2 w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 bg-card border-t border-border safe-area-bottom">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg md:text-xl font-semibold text-foreground">Insight Atlas</span>
            </div>
            <p className="text-muted-foreground text-sm text-center md:text-left">
              © 2024 Insight Atlas. Transform books into wisdom.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="premium-card hover:shadow-xl transition-shadow card-mobile">
      <CardContent className="p-6 md:p-8">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 md:mb-6 text-primary">
          {icon}
        </div>
        <h3 className="font-serif text-lg md:text-xl font-semibold text-foreground mb-2 md:mb-3">{title}</h3>
        <p className="text-sm md:text-base text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [, navigate] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadFilename, setUploadFilename] = useState<string>("");
  const [uploadError, setUploadError] = useState<string>("");

  const isUploading = uploadStage !== "idle" && uploadStage !== "error";

  const uploadMutation = trpc.books.upload.useMutation({
    onSuccess: (data) => {
      setUploadStage("complete");
      setTimeout(() => {
        navigate(`/book/${data.bookId}`);
      }, 1500);
    },
    onError: (error) => {
      setUploadStage("error");
      setUploadError(error.message);
    },
  });

  const resetUpload = useCallback(() => {
    setUploadStage("idle");
    setUploadFilename("");
    setUploadError("");
  }, []);

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

    setUploadFilename(file.name);
    setUploadError("");
    setUploadStage("reading");

    try {
      const buffer = await file.arrayBuffer();
      
      setUploadStage("extracting");
      
      // Small delay to show extracting stage
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      setUploadStage("saving");

      uploadMutation.mutate({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileData: base64,
      });
    } catch (error) {
      setUploadStage("error");
      setUploadError("Failed to read file");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card safe-area-top">
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg md:text-2xl font-semibold text-foreground">Insight Atlas</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/library")} className="touch-target">
                <Library className="w-5 h-5 md:mr-2" />
                <span className="hidden md:inline">Library</span>
              </Button>

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 md:py-12 safe-area-bottom">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 md:mb-12">
            <h1 className="font-serif text-2xl md:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Transform Your Books
            </h1>
            <p className="text-base md:text-lg text-muted-foreground">
              Upload a book to generate AI-powered insights
            </p>
          </div>

          {/* Upload Progress */}
          {uploadStage !== "idle" && (
            <div className="mb-8">
              <UploadProgress
                stage={uploadStage}
                filename={uploadFilename}
                error={uploadError}
                onComplete={() => {}}
              />
              {uploadStage === "error" && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={resetUpload}>
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Upload Area - Hidden when uploading */}
          {uploadStage === "idle" && (
            <div
              className={`
                relative p-8 md:p-12 rounded-xl border-2 border-dashed transition-all duration-300
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
                    <Star className="w-4 h-4" /> TXT
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12">
            <QuickActionCard
              icon={<Library className="w-6 h-6" />}
              title="View Library"
              description="Access your uploaded books and insights"
              onClick={() => navigate("/library")}
            />
            <QuickActionCard
              icon={<Sparkles className="w-6 h-6" />}
              title="Recent Insights"
              description="Continue where you left off"
              onClick={() => navigate("/library?filter=recent")}
            />
            <QuickActionCard
              icon={<Star className="w-6 h-6" />}
              title="Favorites"
              description="Your starred books and insights"
              onClick={() => navigate("/library?filter=favorites")}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function QuickActionCard({ 
  icon, 
  title, 
  description, 
  onClick 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  onClick: () => void;
}) {
  return (
    <Card 
      className="premium-card cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 card-mobile"
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3 md:mb-4 text-primary">
          {icon}
        </div>
        <h3 className="font-serif text-base md:text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
