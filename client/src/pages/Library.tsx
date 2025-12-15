import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SwipeableCard, ContextMenuWrapper } from "@/components/SwipeableCard";
import { ExportModal } from "@/components/ExportModal";
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
  Sparkles,
  Library as LibraryIcon,
  MoreVertical,
  CheckCircle,
  BookMarked,
  Loader2,
  Plus,
  LayoutGrid,
  LayoutList,
  Share2,
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

type LayoutMode = "list" | "grid";

export default function LibraryPage() {
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const urlFilter = new URLSearchParams(searchParams).get("filter");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(urlFilter === "favorites" ? "favorites" : "all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("list");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportInsightId, setExportInsightId] = useState<number | null>(null);
  const [exportTitle, setExportTitle] = useState("");

  const { data: libraryItems, isLoading, refetch } = trpc.library.list.useQuery();

  const toggleFavoriteMutation = trpc.library.toggleFavorite.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Updated favorites");
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

  const handleExport = (insightId: number, title: string) => {
    setExportInsightId(insightId);
    setExportTitle(title);
    setExportModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate({ id: itemToDelete });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card safe-area-top sticky top-0 z-30">
        <div className="container py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="touch-target">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                </div>
                <span className="font-serif text-lg md:text-2xl font-semibold text-foreground">Library</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Layout Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLayoutMode(layoutMode === "list" ? "grid" : "list")}
                className="touch-target"
              >
                {layoutMode === "list" ? (
                  <LayoutGrid className="w-5 h-5" />
                ) : (
                  <LayoutList className="w-5 h-5" />
                )}
              </Button>
              <Button className="btn-gold btn-mobile hidden md:flex" onClick={() => navigate("/")}>
                <Sparkles className="w-4 h-4 mr-2" />
                Upload Book
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-4 md:py-8 safe-area-bottom">
        {/* Search */}
        <div className="mb-4 md:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 md:h-10 text-base"
            />
          </div>
        </div>

        {/* Tabs - Mobile Optimized */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 md:mb-8">
          <TabsList className="w-full grid grid-cols-4 h-auto p-1">
            <TabsTrigger value="all" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-2 md:px-4 text-xs md:text-sm touch-target">
              <LibraryIcon className="w-4 h-4" />
              <span>All</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-2 md:px-4 text-xs md:text-sm touch-target">
              <Star className="w-4 h-4" />
              <span>Favorites</span>
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-2 md:px-4 text-xs md:text-sm touch-target">
              <BookOpen className="w-4 h-4" />
              <span>Reading</span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex flex-col md:flex-row items-center gap-1 md:gap-2 py-2 px-2 md:px-4 text-xs md:text-sm touch-target">
              <CheckCircle className="w-4 h-4" />
              <span>Done</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Swipe Hint - Mobile Only */}
        {filteredItems.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mb-3 md:hidden">
            Swipe left for actions, swipe right to favorite
          </p>
        )}

        {/* Library Items */}
        {isLoading ? (
          <div className={layoutMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6" : "space-y-3"}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 md:p-6">
                  <div className="flex gap-3 md:gap-4">
                    <div className="w-16 h-22 md:w-20 md:h-28 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2 md:space-y-3">
                      <div className="h-4 md:h-5 bg-muted rounded w-3/4" />
                      <div className="h-3 md:h-4 bg-muted rounded w-1/2" />
                      <div className="h-2 md:h-3 bg-muted rounded w-1/4" />
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
        ) : layoutMode === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            {filteredItems.map((item) => (
              <GridItemCard
                key={item.id}
                item={item}
                onNavigate={(path) => navigate(path)}
                onToggleFavorite={() => handleToggleFavorite(item.id, item.isFavorite)}
                onExport={() => item.insight && handleExport(item.insight.id, item.book?.title || "Insights")}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <SwipeableCard
                key={item.id}
                onFavorite={() => handleToggleFavorite(item.id, item.isFavorite)}
                onExport={() => item.insight && handleExport(item.insight.id, item.book?.title || "Insights")}
                onDelete={() => handleDelete(item.id)}
                isFavorite={item.isFavorite}
              >
                <ContextMenuWrapper
                  onFavorite={() => handleToggleFavorite(item.id, item.isFavorite)}
                  onExport={() => item.insight && handleExport(item.insight.id, item.book?.title || "Insights")}
                  onDelete={() => handleDelete(item.id)}
                  isFavorite={item.isFavorite}
                >
                  <LibraryItemCard
                    item={item}
                    onNavigate={(path) => navigate(path)}
                    onToggleFavorite={() => handleToggleFavorite(item.id, item.isFavorite)}
                    onExport={() => item.insight && handleExport(item.insight.id, item.book?.title || "Insights")}
                    onDelete={() => handleDelete(item.id)}
                  />
                </ContextMenuWrapper>
              </SwipeableCard>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button - Mobile Only */}
      <Button
        className="fab md:hidden w-14 h-14 rounded-full shadow-lg btn-gold p-0"
        onClick={() => navigate("/")}
      >
        <Plus className="w-6 h-6" />
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="mx-4 max-w-sm md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl">Delete this book?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm md:text-base">
              This will permanently delete the book and all associated insights. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

      {/* Export Modal */}
      {exportInsightId && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => {
            setExportModalOpen(false);
            setExportInsightId(null);
          }}
          insightId={exportInsightId}
          title={exportTitle}
        />
      )}
    </div>
  );
}

function LibraryItemCard({
  item,
  onNavigate,
  onToggleFavorite,
  onExport,
  onDelete,
}: {
  item: any;
  onNavigate: (path: string) => void;
  onToggleFavorite: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const book = item.book;
  const insight = item.insight;
  const hasInsight = !!insight;

  return (
    <Card className="premium-card group hover:shadow-xl transition-all card-mobile border-0 shadow-sm">
      <CardContent className="p-4 md:p-6">
        <div className="flex gap-3 md:gap-4">
          {/* Book Cover */}
          <div
            className="w-16 h-22 md:w-20 md:h-28 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 cursor-pointer touch-target shadow-sm"
            onClick={() => onNavigate(hasInsight ? `/insight/${insight.id}` : `/book/${book?.id}`)}
          >
            {book?.coverUrl ? (
              <img
                src={book.coverUrl}
                alt={book.title || "Book cover"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-primary/40" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div
                className="cursor-pointer flex-1 min-w-0"
                onClick={() => onNavigate(hasInsight ? `/insight/${insight.id}` : `/book/${book?.id}`)}
              >
                <h3 className="font-serif text-base md:text-lg font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
                  {book?.title || "Untitled"}
                </h3>
                {book?.author && (
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 truncate">{book.author}</p>
                )}
              </div>

              {/* Actions Menu - Desktop */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 w-8 h-8 md:w-10 md:h-10 touch-target">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={onToggleFavorite} className="py-3">
                      {item.isFavorite ? (
                        <>
                          <StarOff className="w-4 h-4 mr-2" />
                          Remove Favorite
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
                        <DropdownMenuItem onClick={() => onNavigate(`/insight/${insight.id}`)} className="py-3">
                          <Sparkles className="w-4 h-4 mr-2" />
                          View Insights
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onExport} className="py-3">
                          <Share2 className="w-4 h-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive py-3">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2 md:mt-3 text-xs text-muted-foreground">
              {book?.wordCount && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {(book.wordCount / 1000).toFixed(0)}k
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-3">
              {item.isFavorite && (
                <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                  <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-current" />
                  <span className="hidden md:inline">Favorite</span>
                </span>
              )}
              {hasInsight && (
                <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-green-100 text-green-700 text-xs">
                  <Sparkles className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="hidden md:inline">Insights</span>
                </span>
              )}
              {insight?.audioUrl && (
                <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                  <Headphones className="w-2.5 h-2.5 md:w-3 md:h-3" />
                  <span className="hidden md:inline">Audio</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GridItemCard({
  item,
  onNavigate,
  onToggleFavorite,
  onExport,
  onDelete,
}: {
  item: any;
  onNavigate: (path: string) => void;
  onToggleFavorite: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const book = item.book;
  const insight = item.insight;
  const hasInsight = !!insight;

  return (
    <ContextMenuWrapper
      onFavorite={onToggleFavorite}
      onExport={hasInsight ? onExport : undefined}
      onDelete={onDelete}
      isFavorite={item.isFavorite}
    >
      <Card
        className="premium-card group hover:shadow-xl transition-all cursor-pointer overflow-hidden"
        onClick={() => onNavigate(hasInsight ? `/insight/${insight.id}` : `/book/${book?.id}`)}
      >
        {/* Book Cover */}
        <div className="aspect-[3/4] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative overflow-hidden">
          {book?.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title || "Book cover"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <BookOpen className="w-12 h-12 text-primary/30" />
          )}
          
          {/* Favorite Badge */}
          {item.isFavorite && (
            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
              <Star className="w-3 h-3 text-white fill-current" />
            </div>
          )}
          
          {/* Status Badges */}
          <div className="absolute bottom-2 left-2 flex gap-1">
            {hasInsight && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-green-500 text-white text-xs">
                <Sparkles className="w-2.5 h-2.5" />
              </span>
            )}
            {insight?.audioUrl && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-xs">
                <Headphones className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </div>
        
        {/* Content */}
        <CardContent className="p-3">
          <h3 className="font-serif text-sm font-semibold text-foreground line-clamp-2 mb-1">
            {book?.title || "Untitled"}
          </h3>
          {book?.author && (
            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
          )}
        </CardContent>
      </Card>
    </ContextMenuWrapper>
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
    <div className="text-center py-12 md:py-16 px-4">
      <BookMarked className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-muted-foreground" />
      <h3 className="font-serif text-lg md:text-xl font-semibold text-foreground mb-2">{message}</h3>
      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">{description}</p>
      {!searchQuery && activeTab === "all" && (
        <Button className="btn-gold btn-mobile" onClick={onUpload}>
          <Sparkles className="w-4 h-4 mr-2" />
          Upload Your First Book
        </Button>
      )}
    </div>
  );
}
