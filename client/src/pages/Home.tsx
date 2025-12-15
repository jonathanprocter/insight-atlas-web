import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
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
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
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
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"></div>
        <div className="container py-8">
          <nav className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-2xl font-semibold text-foreground">Insight Atlas</span>
            </div>
            <Button asChild className="btn-gold">
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
          </nav>

          <div className="max-w-4xl mx-auto text-center py-16 relative">
            <div className="premium-border inline-block px-8 py-16 mb-8">
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
                Transform Books<br />
                <span className="text-primary">Into Wisdom</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 font-sans">
                Upload any book and receive AI-powered insights with premium visualizations, 
                audio narration, and beautifully crafted PDF exports.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="btn-gold text-lg px-8">
                  <a href={getLoginUrl()}>
                    Start Your Journey
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </a>
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8 border-primary/30 hover:bg-primary/5">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              Premium Features
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every feature designed to help you extract maximum value from your reading
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Sparkles className="w-8 h-8" />}
              title="AI-Powered Insights"
              description="Advanced AI analyzes your books to extract key themes, actionable takeaways, and profound insights"
            />
            <FeatureCard
              icon={<BarChart3 className="w-8 h-8" />}
              title="30 Visual Types"
              description="Intelligent visualization selection from timelines to mind maps, automatically matched to your content"
            />
            <FeatureCard
              icon={<Headphones className="w-8 h-8" />}
              title="Audio Narration"
              description="Premium ElevenLabs voices bring your insights to life with natural, engaging audio summaries"
            />
            <FeatureCard
              icon={<FileDown className="w-8 h-8" />}
              title="PDF Export"
              description="Beautifully designed exports with ornate borders, elegant typography, and premium styling"
            />
          </div>
        </div>
      </section>

      {/* Visual Types Preview */}
      <section className="py-24 bg-background">
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
                className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors text-center"
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
      <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-6">
              Ready to Transform Your Reading?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of readers who have discovered the power of AI-enhanced book insights.
            </p>
            <Button asChild size="lg" className="btn-gold text-lg px-12">
              <a href={getLoginUrl()}>
                Get Started Free
                <Zap className="ml-2 w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-semibold text-foreground">Insight Atlas</span>
            </div>
            <p className="text-muted-foreground text-sm">
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
    <Card className="premium-card hover:shadow-xl transition-shadow">
      <CardContent className="p-8">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 text-primary">
          {icon}
        </div>
        <h3 className="font-serif text-xl font-semibold text-foreground mb-3">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = trpc.books.upload.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.title}" uploaded successfully!`);
      navigate(`/book/${data.bookId}`);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setIsUploading(false);
    },
  });

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

    setIsUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      uploadMutation.mutate({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileData: base64,
      });
    } catch (error) {
      toast.error("Failed to read file");
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-2xl font-semibold text-foreground">Insight Atlas</span>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/library")}>
                <Library className="w-5 h-5 mr-2" />
                Library
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground hidden md:block">
                  {user?.name || "User"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl font-bold text-foreground mb-4">
              Welcome back, {user?.name?.split(" ")[0] || "Reader"}
            </h1>
            <p className="text-lg text-muted-foreground">
              Upload a book to generate AI-powered insights
            </p>
          </div>

          {/* Upload Area */}
          <div
            className={`
              relative p-12 rounded-xl border-2 border-dashed transition-all duration-300
              ${isDragging 
                ? "border-primary bg-primary/5 scale-[1.02]" 
                : "border-border hover:border-primary/50 hover:bg-card"
              }
              ${isUploading ? "opacity-50 pointer-events-none" : ""}
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
              disabled={isUploading}
            />
            
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                {isUploading ? (
                  <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-primary" />
                )}
              </div>
              
              <h3 className="font-serif text-2xl font-semibold text-foreground mb-2">
                {isUploading ? "Uploading..." : "Drop your book here"}
              </h3>
              <p className="text-muted-foreground mb-4">
                or click to browse your files
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
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

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
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
      className="premium-card cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
