import { BookOpen } from "lucide-react";

interface CoverPageProps {
  title: string;
  bookTitle?: string;
  author?: string;
  createdAt: Date | string;
  keyThemes?: string[];
}

export function InsightCoverPage({ title, bookTitle, author, createdAt, keyThemes }: CoverPageProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="min-h-[80vh] md:min-h-screen flex flex-col items-center justify-center text-center p-6 md:p-12 bg-gradient-to-b from-background via-background to-card relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 border border-primary rounded-full" />
        <div className="absolute bottom-20 right-10 w-48 h-48 border border-primary rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 border border-primary rounded-full" />
      </div>

      {/* Logo */}
      <div className="mb-6 md:mb-10 relative z-10">
        <img 
          src="/insight-atlas-logo.png" 
          alt="Insight Atlas" 
          className="w-32 h-32 md:w-48 md:h-48 object-contain mx-auto"
        />
      </div>

      {/* Branding */}
      <div className="mb-8 md:mb-12 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          <span className="text-sm md:text-base font-medium tracking-[0.3em] text-primary uppercase">
            Insight Atlas
          </span>
        </div>
        <div className="w-24 h-0.5 bg-primary mx-auto" />
      </div>

      {/* Main Title */}
      <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 md:mb-8 max-w-4xl leading-tight relative z-10">
        {title}
      </h1>

      {/* Ornamental divider */}
      <div className="flex items-center gap-4 mb-6 md:mb-8 relative z-10">
        <div className="w-12 md:w-20 h-px bg-gradient-to-r from-transparent to-primary" />
        <div className="w-2 h-2 md:w-3 md:h-3 rotate-45 bg-primary" />
        <div className="w-12 md:w-20 h-px bg-gradient-to-l from-transparent to-primary" />
      </div>

      {/* Book Info */}
      {bookTitle && (
        <div className="mb-4 md:mb-6 relative z-10">
          <p className="text-lg md:text-xl text-muted-foreground">
            Insights from
          </p>
          <p className="font-serif text-xl md:text-2xl font-semibold text-foreground italic">
            "{bookTitle}"
          </p>
          {author && (
            <p className="text-base md:text-lg text-muted-foreground mt-1">
              by {author}
            </p>
          )}
        </div>
      )}

      {/* Key Themes */}
      {keyThemes && keyThemes.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center mb-6 md:mb-8 max-w-2xl relative z-10">
          {keyThemes.slice(0, 5).map((theme, i) => (
            <span
              key={i}
              className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium border border-primary/30 text-primary bg-primary/5"
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <p className="text-sm md:text-base text-muted-foreground relative z-10">
        {formattedDate}
      </p>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-primary rounded-full" />
        </div>
      </div>
    </div>
  );
}

interface TableOfContentsProps {
  sections: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  onNavigate: (id: string) => void;
}

export function TableOfContents({ sections, onNavigate }: TableOfContentsProps) {
  // Group sections by type for better organization
  const groupedSections = sections.reduce((acc, section) => {
    const type = section.type || 'content';
    if (!acc[type]) acc[type] = [];
    acc[type].push(section);
    return acc;
  }, {} as Record<string, typeof sections>);

  const typeLabels: Record<string, string> = {
    'executive_summary': 'Overview',
    'author_spotlight': 'About the Author',
    'core_thesis': 'Core Thesis',
    'key_concepts': 'Key Concepts',
    'quote_collection': 'Notable Quotes',
    'deep_dive': 'Deep Dive Analysis',
    'chapter_breakdown': 'Chapter Analysis',
    'practical_applications': 'Practical Applications',
    'research_insights': 'Research & Evidence',
    'key_takeaways': 'Key Takeaways',
    'content': 'Content',
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'executive_summary': return '📋';
      case 'author_spotlight': return '👤';
      case 'core_thesis': return '🎯';
      case 'key_concepts': return '💡';
      case 'quote_collection': return '💬';
      case 'deep_dive': return '🔬';
      case 'chapter_breakdown': return '📖';
      case 'practical_applications': return '⚡';
      case 'research_insights': return '📊';
      case 'key_takeaways': return '✨';
      default: return '📝';
    }
  };

  return (
    <div className="premium-border p-6 md:p-10 mb-8 md:mb-12">
      <div className="text-center mb-6 md:mb-8">
        <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-2">
          Table of Contents
        </h2>
        <div className="flex items-center justify-center gap-4">
          <div className="w-12 h-px bg-primary" />
          <div className="w-2 h-2 rotate-45 bg-primary" />
          <div className="w-12 h-px bg-primary" />
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedSections).map(([type, items], groupIndex) => (
          <div key={type} className="space-y-2">
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
              <span>{getTypeIcon(type)}</span>
              {typeLabels[type] || type}
            </h3>
            <div className="space-y-1 pl-6">
              {items.map((section, index) => (
                <button
                  key={section.id}
                  onClick={() => onNavigate(section.id)}
                  className="w-full text-left py-2 px-3 rounded-lg hover:bg-primary/5 transition-colors group flex items-center justify-between"
                >
                  <span className="text-foreground group-hover:text-primary transition-colors">
                    {section.title}
                  </span>
                  <span className="text-muted-foreground text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-border text-center">
        <p className="text-sm text-muted-foreground italic">
          Click any section to navigate directly
        </p>
      </div>
    </div>
  );
}
