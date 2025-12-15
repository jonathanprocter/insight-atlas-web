import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BookOpen,
  ArrowLeft,
  Search,
  Star,
  StarOff,
  Trash2,
  Clock,
  FileText,
  Headphones,
  FileDown,
  Sparkles,
  Library as LibraryIcon,
  Filter,
  MoreVertical,
  CheckCircle,
  BookMarked,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const urlFilter = new URLSearchParams(searchParams).get("filter");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(urlFilter === "favorites" ? "favorites" : "all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const { data: libraryItems, isLoading, refetch } = trpc.library.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const toggleFavoriteMutation = trpc.library.toggleFavorite.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update favorite: ${error.message}`);
    },
  });

  const deleteMutation = trpc.library.delete.useMutation({
    onSuccess: () => {
      toast.success("Item deleted successfully");
      refetch();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const filteredItems = useMemo(() => {
    if (!libraryItems) return [];

    let items = [...libraryItems];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.book?.title.toLowerCase().includes(query) ||
          item.book?.author?.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    if (activeTab === "favorites") {
      items = items.filter((item) => item.isFavorite);
    } else if (activeTab === "completed") {
      items = items.filter((item) => item.readingStatus === "completed");
    } else if (activeTab === "reading") {
      items = items.filter((item) => item.readingStatus === "reading");
    }

    return items;
  }, [libraryItems, searchQuery, activeTab]);

  const handleToggleFavorite = (id: number, currentValue: boolean) => {
    toggleFavoriteMutation.mutate({ id, isFavorite: !currentValue });
  };

  const handleDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate({ id: itemToDelete });
    }
  };

  if (authLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-serif text-2xl font-semibold text-foreground">Library</span>
              </div>
            </div>
            <Button className="btn-gold" onClick={() => navigate("/")}>
              <Sparkles className="w-4 h-4 mr-2" />
              Upload Book
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search books by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <LibraryIcon className="w-4 h-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Reading
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Completed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Library Items */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="w-20 h-28 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            activeTab={activeTab}
            searchQuery={searchQuery}
            onUpload={() => navigate("/")}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <LibraryItemCard
                key={item.id}
                item={item}
                onNavigate={(path) => navigate(path)}
                onToggleFavorite={() => handleToggleFavorite(item.id, item.isFavorite)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the book and all associated insights. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LibraryItemCard({
  item,
  onNavigate,
  onToggleFavorite,
  onDelete,
}: {
  item: any;
  onNavigate: (path: string) => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  const book = item.book;
  const insight = item.insight;
  const hasInsight = !!insight;

  return (
    <Card className="premium-card group hover:shadow-xl transition-all">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Book Cover */}
          <div
            className="w-20 h-28 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 cursor-pointer"
            onClick={() => onNavigate(hasInsight ? `/insight/${insight.id}` : `/book/${book?.id}`)}
          >
            <BookOpen className="w-8 h-8 text-primary/40" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div
                className="cursor-pointer"
                onClick={() => onNavigate(hasInsight ? `/insight/${insight.id}` : `/book/${book?.id}`)}
              >
                <h3 className="font-serif text-lg font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
                  {book?.title || "Untitled"}
                </h3>
                {book?.author && (
                  <p className="text-sm text-muted-foreground mt-1">{book.author}</p>
                )}
              </div>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onToggleFavorite}>
                    {item.isFavorite ? (
                      <>
                        <StarOff className="w-4 h-4 mr-2" />
                        Remove from Favorites
                      </>
                    ) : (
                      <>
                        <Star className="w-4 h-4 mr-2" />
                        Add to Favorites
                      </>
                    )}
                  </DropdownMenuItem>
                  {hasInsight && (
                    <>
                      <DropdownMenuItem onClick={() => onNavigate(`/insight/${insight.id}`)}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        View Insights
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              {book?.wordCount && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {book.wordCount.toLocaleString()} words
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {item.isFavorite && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                  <Star className="w-3 h-3 fill-current" />
                  Favorite
                </span>
              )}
              {hasInsight && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                  <Sparkles className="w-3 h-3" />
                  Insights Ready
                </span>
              )}
              {insight?.audioUrl && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                  <Headphones className="w-3 h-3" />
                  Audio
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  activeTab,
  searchQuery,
  onUpload,
}: {
  activeTab: string;
  searchQuery: string;
  onUpload: () => void;
}) {
  let message = "Your library is empty";
  let description = "Upload your first book to get started";

  if (searchQuery) {
    message = "No results found";
    description = `No books match "${searchQuery}"`;
  } else if (activeTab === "favorites") {
    message = "No favorites yet";
    description = "Star books to add them to your favorites";
  } else if (activeTab === "completed") {
    message = "No completed books";
    description = "Books you've finished reading will appear here";
  } else if (activeTab === "reading") {
    message = "Nothing in progress";
    description = "Books you're currently reading will appear here";
  }

  return (
    <div className="text-center py-16">
      <BookMarked className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="font-serif text-xl font-semibold text-foreground mb-2">{message}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {!searchQuery && activeTab === "all" && (
        <Button className="btn-gold" onClick={onUpload}>
          <Sparkles className="w-4 h-4 mr-2" />
          Upload Your First Book
        </Button>
      )}
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
        <p className="text-muted-foreground font-serif text-lg">Loading library...</p>
      </div>
    </div>
  );
}
