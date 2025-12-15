import { ArrowDown, CheckCircle, XCircle } from "lucide-react";

// Flow Diagram Component - for showing progressions and journeys
interface FlowDiagramProps {
  title: string;
  steps: Array<{
    label: string;
    description?: string;
  }>;
}

export function FlowDiagram({ title, steps }: FlowDiagramProps) {
  return (
    <div className="premium-border p-4 md:p-6 my-6">
      <h3 className="font-serif text-lg md:text-xl font-semibold text-primary mb-4 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        {title}
      </h3>
      <div className="flex flex-col items-center gap-2">
        {steps.map((step, index) => (
          <div key={index} className="w-full max-w-md">
            <div className="bg-card border border-primary/20 rounded-lg p-3 md:p-4 text-center shadow-sm">
              <p className="font-medium text-foreground">{step.label}</p>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowDown className="w-5 h-5 text-primary" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Comparison Table Component - for contrasting concepts
interface ComparisonTableProps {
  title: string;
  leftHeader: string;
  rightHeader: string;
  rows: Array<{
    left: string;
    right: string;
  }>;
}

export function ComparisonTable({ title, leftHeader, rightHeader, rows }: ComparisonTableProps) {
  return (
    <div className="premium-border p-4 md:p-6 my-6 overflow-x-auto">
      <h3 className="font-serif text-lg md:text-xl font-semibold text-primary mb-4 flex items-center gap-2">
        <span className="text-2xl">⚖️</span>
        {title}
      </h3>
      <table className="w-full min-w-[400px]">
        <thead>
          <tr className="border-b-2 border-primary">
            <th className="text-left py-3 px-4 font-semibold text-foreground bg-primary/5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                {leftHeader}
              </div>
            </th>
            <th className="text-left py-3 px-4 font-semibold text-foreground bg-muted/50">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                {rightHeader}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-border hover:bg-muted/20 transition-colors">
              <td className="py-3 px-4 text-foreground">{row.left}</td>
              <td className="py-3 px-4 text-muted-foreground">{row.right}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Numbered Action List Component
interface ActionListProps {
  title: string;
  items: string[];
  icon?: string;
}

export function ActionList({ title, items, icon = "✓" }: ActionListProps) {
  return (
    <div className="premium-border p-4 md:p-6 my-6">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 rounded-t-lg -mt-6 -mx-4 md:-mx-6 mb-4">
        <h3 className="font-semibold text-base md:text-lg">{title}</h3>
      </div>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
              {index + 1}.
            </span>
            <p className="text-foreground pt-0.5">{item}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Quote Block with Attribution
interface QuoteBlockProps {
  quote: string;
  attribution?: string;
  context?: string;
}

export function QuoteBlock({ quote, attribution, context }: QuoteBlockProps) {
  return (
    <div className="my-6 relative">
      <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full" />
      <blockquote className="pl-6 py-2">
        <p className="font-serif text-lg md:text-xl text-foreground italic leading-relaxed">
          "{quote}"
        </p>
        {attribution && (
          <footer className="mt-3 text-sm text-muted-foreground">
            — {attribution}
          </footer>
        )}
        {context && (
          <p className="mt-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
            {context}
          </p>
        )}
      </blockquote>
    </div>
  );
}

// Key Concept Card
interface ConceptCardProps {
  title: string;
  definition: string;
  example?: string;
  icon?: string;
}

export function ConceptCard({ title, definition, example, icon = "💡" }: ConceptCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 md:p-6 my-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-serif text-lg font-semibold text-foreground mb-2">{title}</h4>
          <p className="text-foreground leading-relaxed">{definition}</p>
          {example && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Example:</span> {example}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Chapter Summary Card
interface ChapterCardProps {
  chapterNumber: number | string;
  title: string;
  summary: string;
  keyPoints?: string[];
}

export function ChapterCard({ chapterNumber, title, summary, keyPoints }: ChapterCardProps) {
  return (
    <div className="premium-border p-4 md:p-6 my-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
          {chapterNumber}
        </div>
        <h4 className="font-serif text-lg md:text-xl font-semibold text-foreground">{title}</h4>
      </div>
      <p className="text-foreground leading-relaxed mb-3">{summary}</p>
      {keyPoints && keyPoints.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm font-medium text-primary mb-2">Key Points:</p>
          <ul className="space-y-1">
            {keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Statistics/Metrics Display
interface MetricDisplayProps {
  metrics: Array<{
    label: string;
    value: string | number;
    description?: string;
  }>;
}

export function MetricDisplay({ metrics }: MetricDisplayProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
      {metrics.map((metric, index) => (
        <div key={index} className="text-center p-4 bg-card border border-border rounded-xl">
          <p className="text-2xl md:text-3xl font-bold text-primary">{metric.value}</p>
          <p className="text-sm font-medium text-foreground mt-1">{metric.label}</p>
          {metric.description && (
            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Takeaway Box
interface TakeawayBoxProps {
  title: string;
  takeaways: string[];
}

export function TakeawayBox({ title, takeaways }: TakeawayBoxProps) {
  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4 md:p-6 my-6">
      <h3 className="font-serif text-lg md:text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-2xl">✨</span>
        {title}
      </h3>
      <div className="space-y-3">
        {takeaways.map((takeaway, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {index + 1}
            </div>
            <p className="text-foreground">{takeaway}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
