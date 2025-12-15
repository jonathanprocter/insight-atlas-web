/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";


// Visual Types - 30 types for intelligent content visualization
export const VISUAL_TYPES = [
  "timeline",
  "flowDiagram",
  "comparisonMatrix",
  "barChart",
  "quadrant",
  "conceptMap",
  "pieChart",
  "lineChart",
  "areaChart",
  "scatterPlot",
  "radarChart",
  "vennDiagram",
  "hierarchy",
  "networkGraph",
  "ganttChart",
  "funnelDiagram",
  "pyramidDiagram",
  "cycleDiagram",
  "mindMap",
  "fishboneDiagram",
  "swotMatrix",
  "sankeyDiagram",
  "treemap",
  "heatmap",
  "bubbleChart",
  "infographic",
  "storyboard",
  "comparisonTable",
  "journeyMap",
  "processFlow",
] as const;

export type VisualType = (typeof VISUAL_TYPES)[number];

// Content Block Types for premium rendering
export const CONTENT_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "quote",
  "authorSpotlight",
  "insightNote",
  "alternativePerspective",
  "researchInsight",
  "keyTakeaways",
  "exercise",
  "sectionDivider",
  "visual",
  "bulletList",
  "numberedList",
] as const;

export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

// Reading status for library items
export const READING_STATUSES = ["new", "reading", "completed"] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];

// Insight generation status
export const INSIGHT_STATUSES = ["pending", "generating", "completed", "failed"] as const;
export type InsightStatus = (typeof INSIGHT_STATUSES)[number];

// Visual type metadata for intelligent selection
export interface VisualTypeInfo {
  type: VisualType;
  name: string;
  description: string;
  keywords: string[];
  icon: string;
}

export const VISUAL_TYPE_INFO: VisualTypeInfo[] = [
  { type: "timeline", name: "Timeline", description: "Sequential events over time", keywords: ["history", "evolution", "progression", "dates", "chronological"], icon: "Clock" },
  { type: "flowDiagram", name: "Flow Diagram", description: "Process or decision flow", keywords: ["process", "steps", "workflow", "decision", "sequence"], icon: "GitBranch" },
  { type: "comparisonMatrix", name: "Comparison Matrix", description: "Compare multiple items", keywords: ["compare", "versus", "differences", "similarities", "contrast"], icon: "Grid3X3" },
  { type: "barChart", name: "Bar Chart", description: "Categorical data comparison", keywords: ["statistics", "amounts", "quantities", "ranking"], icon: "BarChart3" },
  { type: "quadrant", name: "Quadrant", description: "2x2 matrix analysis", keywords: ["priority", "urgency", "importance", "matrix", "categories"], icon: "LayoutGrid" },
  { type: "conceptMap", name: "Concept Map", description: "Related concepts and ideas", keywords: ["concepts", "relationships", "connections", "ideas", "theory"], icon: "Network" },
  { type: "pieChart", name: "Pie Chart", description: "Parts of a whole", keywords: ["percentage", "proportion", "distribution", "share", "breakdown"], icon: "PieChart" },
  { type: "lineChart", name: "Line Chart", description: "Trends over time", keywords: ["trend", "growth", "decline", "change", "over time"], icon: "TrendingUp" },
  { type: "areaChart", name: "Area Chart", description: "Cumulative trends", keywords: ["cumulative", "stacked", "total", "accumulation"], icon: "AreaChart" },
  { type: "scatterPlot", name: "Scatter Plot", description: "Correlation between variables", keywords: ["correlation", "relationship", "variables", "distribution"], icon: "ScatterChart" },
  { type: "radarChart", name: "Radar Chart", description: "Multi-dimensional comparison", keywords: ["skills", "attributes", "dimensions", "profile", "assessment"], icon: "Radar" },
  { type: "vennDiagram", name: "Venn Diagram", description: "Overlapping sets", keywords: ["overlap", "intersection", "common", "shared", "unique"], icon: "Circle" },
  { type: "hierarchy", name: "Hierarchy", description: "Organizational structure", keywords: ["organization", "structure", "levels", "hierarchy", "tree"], icon: "GitFork" },
  { type: "networkGraph", name: "Network Graph", description: "Interconnected nodes", keywords: ["network", "connections", "nodes", "links", "social"], icon: "Share2" },
  { type: "ganttChart", name: "Gantt Chart", description: "Project timeline", keywords: ["project", "schedule", "tasks", "deadlines", "planning"], icon: "Calendar" },
  { type: "funnelDiagram", name: "Funnel Diagram", description: "Conversion stages", keywords: ["funnel", "conversion", "stages", "pipeline", "sales"], icon: "Filter" },
  { type: "pyramidDiagram", name: "Pyramid Diagram", description: "Hierarchical levels", keywords: ["pyramid", "levels", "hierarchy", "foundation", "layers"], icon: "Triangle" },
  { type: "cycleDiagram", name: "Cycle Diagram", description: "Recurring process", keywords: ["cycle", "loop", "recurring", "circular", "continuous"], icon: "RefreshCw" },
  { type: "mindMap", name: "Mind Map", description: "Branching ideas", keywords: ["brainstorm", "ideas", "branches", "creative", "exploration"], icon: "Brain" },
  { type: "fishboneDiagram", name: "Fishbone Diagram", description: "Cause and effect", keywords: ["cause", "effect", "root cause", "analysis", "problem"], icon: "Fish" },
  { type: "swotMatrix", name: "SWOT Matrix", description: "Strategic analysis", keywords: ["strengths", "weaknesses", "opportunities", "threats", "strategy"], icon: "Target" },
  { type: "sankeyDiagram", name: "Sankey Diagram", description: "Flow quantities", keywords: ["flow", "energy", "resources", "transfer", "movement"], icon: "ArrowRightLeft" },
  { type: "treemap", name: "Treemap", description: "Hierarchical proportions", keywords: ["proportions", "nested", "categories", "size", "composition"], icon: "LayoutDashboard" },
  { type: "heatmap", name: "Heatmap", description: "Intensity patterns", keywords: ["intensity", "density", "concentration", "patterns", "hot spots"], icon: "Flame" },
  { type: "bubbleChart", name: "Bubble Chart", description: "Three-dimensional data", keywords: ["size", "magnitude", "three variables", "comparison"], icon: "CircleDot" },
  { type: "infographic", name: "Infographic", description: "Visual summary", keywords: ["summary", "overview", "visual", "comprehensive", "key points"], icon: "FileImage" },
  { type: "storyboard", name: "Storyboard", description: "Narrative sequence", keywords: ["story", "narrative", "sequence", "scenes", "journey"], icon: "Film" },
  { type: "comparisonTable", name: "Comparison Table", description: "Feature comparison", keywords: ["features", "specifications", "options", "pros cons"], icon: "Table" },
  { type: "journeyMap", name: "Journey Map", description: "User experience flow", keywords: ["journey", "experience", "touchpoints", "user", "customer"], icon: "Map" },
  { type: "processFlow", name: "Process Flow", description: "Step-by-step process", keywords: ["steps", "procedure", "instructions", "how to", "method"], icon: "Workflow" },
];

// File types supported for upload
export const SUPPORTED_FILE_TYPES = ["application/pdf", "application/epub+zip", "text/plain"] as const;
export const SUPPORTED_EXTENSIONS = [".pdf", ".epub", ".txt"] as const;
