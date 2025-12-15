import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BookOpen,
  ArrowLeft,
  Sparkles,
  Headphones,
  FileDown,
  Clock,
  FileText,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function BookPage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const bookId = parseInt(params.id || "0");

  const { data: book, isLoading: bookLoading } = trpc.books.get.useQuery(
    { id: bookId },
    { enabled: !!bookId && !!user }
  );

  const { data: insights } = trpc.insights.getByBook.useQuery(
    { bookId },
    { enabled: !!bookId && !!user }
  );

  const generateMutation = trpc.insights.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Insights generated successfully!");
      navigate(`/insight/${data.insightId}`);
    },
    onError: (error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  if (authLoading || bookLoading) {
    return <LoadingState />;
  }

  if (!book) {
    return <NotFoundState onBack={() => navigate("/")} />;
  }

  const latestInsight = insights?.[0];
  const hasInsight = !!latestInsight;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-serif text-2xl font-semibold text-foreground">Insight Atlas</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-12">
        <div className="max-w-4xl mx-auto">
          {/* Book Info Card */}
          <Card className="premium-card mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Book Cover Placeholder */}
                <div className="w-48 h-64 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  <BookOpen className="w-16 h-16 text-primary/40" />
                </div>

                {/* Book Details */}
                <div className="flex-1">
                  <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                    {book.title}
                  </h1>
                  {book.author && (
                    <p className="text-lg text-muted-foreground mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {book.author}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      {book.wordCount?.toLocaleString() || 0} words
                    </div>
                    {book.pageCount && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        {book.pageCount} pages
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Uploaded {new Date(book.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-4">
                    {!hasInsight ? (
                      <Button
                        className="btn-gold"
                        onClick={() => generateMutation.mutate({ bookId })}
                        disabled={generateMutation.isPending}
                      >
                        {generateMutation.isPending ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Generating Insights...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5 mr-2" />
                            Generate Insights
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        className="btn-gold"
                        onClick={() => navigate(`/insight/${latestInsight.id}`)}
                      >
                        <CheckCircle className="w-5 h-5 mr-2" />
                        View Insights
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generation Progress */}
          {generateMutation.isPending && (
            <Card className="mb-8 border-primary/30">
              <CardContent className="p-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                    Generating Insights
                  </h3>
                  <p className="text-muted-foreground">
                    Our AI is analyzing your book and extracting key insights...
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This may take 1-2 minutes depending on book length.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Insights */}
          {insights && insights.length > 0 && (
            <div>
              <h2 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Generated Insights
              </h2>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <Card
                    key={insight.id}
                    className="premium-card cursor-pointer hover:shadow-xl transition-all"
                    onClick={() => navigate(`/insight/${insight.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-serif text-lg font-semibold text-foreground mb-1">
                            {insight.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {insight.summary}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(insight.createdAt).toLocaleDateString()}
                            </span>
                            {insight.audioUrl && (
                              <span className="flex items-center gap-1 text-primary">
                                <Headphones className="w-4 h-4" />
                                Audio Available
                              </span>
                            )}
                            {insight.pdfUrl && (
                              <span className="flex items-center gap-1 text-primary">
                                <FileDown className="w-4 h-4" />
                                PDF Available
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          insight.status === "completed" 
                            ? "bg-green-100 text-green-700" 
                            : insight.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {insight.status}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground font-serif text-lg">Loading book...</p>
      </div>
    </div>
  );
}

function NotFoundState({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">Book Not Found</h2>
        <p className="text-muted-foreground mb-4">The book you're looking for doesn't exist.</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    </div>
  );
}
