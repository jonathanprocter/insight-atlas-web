/**
 * Premium Section Renderers
 * 
 * Renders all the premium section types from the Insight Atlas pipeline:
 * - Quick Glance Summary
 * - Foundational Narrative
 * - Executive Summary
 * - Concept Explanations with Visuals
 * - Practical Examples
 * - Insight Atlas Notes
 * - Action Boxes
 * - Self-Assessments
 * - Visual Frameworks
 * - Structure Map
 */

import React from 'react';
import { BookOpen, Lightbulb, Target, Quote, ArrowRight, CheckCircle, Brain, Compass, List, BarChart3, GitBranch, Users, Sparkles, BookMarked, Zap, FileText, Map } from 'lucide-react';

interface SectionProps {
  title: string;
  content: string;
  visualType?: string;
  visualData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Quick Glance Summary - standalone overview
export function QuickGlanceSummary({ title, content }: SectionProps) {
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 md:p-8 border-2 border-amber-200 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-amber-900">{title}</h2>
          <p className="text-amber-700 text-sm">Your 2-minute overview</p>
        </div>
      </div>
      <div className="prose prose-amber max-w-none">
        <div className="whitespace-pre-wrap text-amber-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
    </div>
  );
}

// Foundational Narrative - origin story
export function FoundationalNarrative({ title, content }: SectionProps) {
  return (
    <div className="bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl p-6 md:p-8 border border-stone-200 shadow-md">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-stone-600 rounded-xl flex items-center justify-center">
          <BookMarked className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-800">{title}</h2>
          <p className="text-stone-600 text-sm">The story behind the ideas</p>
        </div>
      </div>
      <div className="prose prose-stone max-w-none italic">
        <div className="whitespace-pre-wrap text-stone-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
    </div>
  );
}

// Executive Summary
export function ExecutiveSummary({ title, content }: SectionProps) {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border-2 border-gray-200 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 text-sm">Comprehensive overview</p>
        </div>
      </div>
      <div className="prose prose-lg max-w-none">
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
    </div>
  );
}

// Concept Explanation with Visual
export function ConceptExplanation({ title, content, visualType, visualData, metadata }: SectionProps) {
  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-serif font-bold text-gray-900">{title}</h3>
          {metadata?.chapterSource ? (
            <p className="text-blue-600 text-sm">From: {String(metadata.chapterSource)}</p>
          ) : null}
        </div>
      </div>
      
      <div className="prose max-w-none mb-6">
        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
      
      {visualType && visualData && (
        <VisualFramework visualType={visualType} visualData={visualData} />
      )}
    </div>
  );
}

// Practical Example
export function PracticalExample({ title, content }: SectionProps) {
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-l-4 border-green-500 ml-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-green-600" />
        <h4 className="font-semibold text-green-800">{title}</h4>
      </div>
      <div className="text-green-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
    </div>
  );
}

// Insight Atlas Note
export function InsightAtlasNote({ title, content, metadata }: SectionProps) {
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-200 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-purple-900">Insight Atlas Note</h3>
      </div>
      
      <div className="prose prose-purple max-w-none mb-4">
        <div className="whitespace-pre-wrap text-purple-800" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
      
      {metadata && (
        <div className="space-y-3 mt-4 pt-4 border-t border-purple-200">
          {metadata.keyDistinction ? (
            <div className="flex gap-2">
              <span className="font-semibold text-purple-700 whitespace-nowrap">Key Distinction:</span>
              <span className="text-purple-800">{String(metadata.keyDistinction)}</span>
            </div>
          ) : null}
          {metadata.practicalImplication ? (
            <div className="flex gap-2">
              <span className="font-semibold text-purple-700 whitespace-nowrap">Practical Implication:</span>
              <span className="text-purple-800">{String(metadata.practicalImplication)}</span>
            </div>
          ) : null}
          {metadata.goDeeper && typeof metadata.goDeeper === 'object' ? (
            <div className="bg-purple-100 rounded-lg p-3">
              <span className="font-semibold text-purple-700">Go Deeper:</span>
              <span className="text-purple-800 ml-2">
                "{(metadata.goDeeper as { title?: string }).title}" by {(metadata.goDeeper as { author?: string }).author}
                {(metadata.goDeeper as { benefit?: string }).benefit && ` — ${(metadata.goDeeper as { benefit?: string }).benefit}`}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Action Box
export function ActionBox({ title, metadata }: SectionProps) {
  const actionSteps = (metadata?.actionSteps as string[]) || [];
  
  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border-2 border-orange-300 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
          <Target className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-orange-900">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {actionSteps.map((step, index) => (
          <div key={index} className="flex items-start gap-3 bg-white/50 rounded-lg p-3">
            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm font-bold">{index + 1}</span>
            </div>
            <p className="text-orange-900">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Self-Assessment
export function SelfAssessment({ title, content, visualType, visualData }: SectionProps) {
  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-200 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-cyan-900">{title}</h3>
      </div>
      
      <div className="prose prose-cyan max-w-none mb-4">
        <div className="whitespace-pre-wrap text-cyan-800" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
      
      {visualType && visualData && (
        <VisualFramework visualType={visualType} visualData={visualData} />
      )}
    </div>
  );
}

// Visual Framework renderer
export function VisualFramework({ visualType, visualData }: { visualType: string; visualData: Record<string, unknown> }) {
  switch (visualType) {
    case 'flowDiagram':
      return <FlowDiagramVisual data={visualData} />;
    case 'comparisonMatrix':
      return <ComparisonMatrixVisual data={visualData} />;
    case 'mindMap':
      return <MindMapVisual data={visualData} />;
    case 'radarChart':
      return <RadarChartVisual data={visualData} />;
    case 'timeline':
      return <TimelineVisual data={visualData} />;
    case 'hierarchy':
      return <HierarchyVisual data={visualData} />;
    default:
      return <GenericVisual type={visualType} data={visualData} />;
  }
}

// Flow Diagram Visual - handles both string[] and {id, label}[] formats
function FlowDiagramVisual({ data }: { data: Record<string, unknown> }) {
  const rawNodes = data.nodes || [];
  
  // Normalize nodes to handle both string[] and object[] formats
  const getNodeLabel = (node: unknown): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'object' && node !== null) {
      const obj = node as Record<string, unknown>;
      return String(obj.label || obj.name || obj.title || obj.id || JSON.stringify(node));
    }
    return String(node);
  };
  
  const nodes = Array.isArray(rawNodes) ? rawNodes : [];
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-600">Process Flow</span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {nodes.map((node, index) => (
          <React.Fragment key={index}>
            <div className="bg-blue-100 border-2 border-blue-300 rounded-lg px-4 py-2 text-blue-800 font-medium text-center min-w-[100px]">
              {getNodeLabel(node)}
            </div>
            {index < nodes.length - 1 && (
              <ArrowRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Comparison Matrix Visual - handles various row formats
function ComparisonMatrixVisual({ data }: { data: Record<string, unknown> }) {
  const rawHeaders = data.headers || [];
  const rawRows = data.rows || [];
  
  const getLabel = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return String(obj.label || obj.name || obj.title || obj.id || JSON.stringify(item));
    }
    return String(item);
  };
  
  const headers = Array.isArray(rawHeaders) ? rawHeaders.map(getLabel) : [];
  const rows = Array.isArray(rawRows) ? rawRows.map(row => {
    if (typeof row === 'object' && row !== null) {
      const obj = row as Record<string, unknown>;
      const values = obj.values || obj.cells || [];
      return {
        label: getLabel(obj.label || obj.name || obj.title || ''),
        values: Array.isArray(values) ? values.map(getLabel) : []
      };
    }
    return { label: String(row), values: [] };
  }) : [];
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-green-500" />
        <span className="text-sm font-medium text-gray-600">Comparison</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 text-left font-semibold text-gray-700"></th>
            {headers.map((header, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-200">
              <td className="px-3 py-2 font-medium text-gray-800">{row.label}</td>
              {row.values.map((value, j) => (
                <td key={j} className="px-3 py-2 text-gray-600">{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Mind Map Visual - handles both string[] and {label, subbranches}[] formats
function MindMapVisual({ data }: { data: Record<string, unknown> }) {
  const center = (data.center as string) || 'Central Concept';
  const rawBranches = data.branches || [];
  
  // Normalize branches to handle both string[] and object[] formats
  const getBranchLabel = (branch: unknown): string => {
    if (typeof branch === 'string') return branch;
    if (typeof branch === 'object' && branch !== null) {
      const obj = branch as Record<string, unknown>;
      return String(obj.label || obj.name || obj.title || JSON.stringify(branch));
    }
    return String(branch);
  };
  
  const getSubbranches = (branch: unknown): string[] => {
    if (typeof branch === 'object' && branch !== null) {
      const obj = branch as Record<string, unknown>;
      const subs = obj.subbranches || obj.children || [];
      if (Array.isArray(subs)) {
        return subs.map(sub => getBranchLabel(sub));
      }
    }
    return [];
  };
  
  const branches = Array.isArray(rawBranches) ? rawBranches : [];
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-gray-600">Concept Map</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-purple-500 text-white rounded-full px-6 py-3 font-bold text-center mb-4">
          {center}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {branches.map((branch, index) => {
            const label = getBranchLabel(branch);
            const subbranches = getSubbranches(branch);
            return (
              <div key={index} className="flex flex-col items-center">
                <div className="bg-purple-100 border border-purple-300 rounded-lg px-4 py-2 text-purple-800">
                  {label}
                </div>
                {subbranches.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {subbranches.map((sub, subIndex) => (
                      <div key={subIndex} className="bg-purple-50 border border-purple-200 rounded px-2 py-1 text-purple-700 text-xs">
                        {sub}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Radar Chart Visual (simplified) - handles both string[] and object[] formats
function RadarChartVisual({ data }: { data: Record<string, unknown> }) {
  const rawDimensions = data.dimensions || [];
  
  const getLabel = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return String(obj.label || obj.name || obj.dimension || obj.id || JSON.stringify(item));
    }
    return String(item);
  };
  
  const dimensions = Array.isArray(rawDimensions) ? rawDimensions : [];
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-4 h-4 text-cyan-500" />
        <span className="text-sm font-medium text-gray-600">Assessment Dimensions</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {dimensions.map((dim, index) => (
          <div key={index} className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
            <p className="text-cyan-800 font-medium text-sm">{getLabel(dim)}</p>
            <div className="mt-2 h-2 bg-cyan-200 rounded-full">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Timeline Visual - handles various event formats
function TimelineVisual({ data }: { data: Record<string, unknown> }) {
  const rawEvents = data.events || [];
  
  const getEventData = (event: unknown): { date: string; title: string; description?: string } => {
    if (typeof event === 'string') return { date: '', title: event };
    if (typeof event === 'object' && event !== null) {
      const obj = event as Record<string, unknown>;
      return {
        date: String(obj.date || obj.time || obj.period || ''),
        title: String(obj.title || obj.label || obj.name || obj.event || ''),
        description: obj.description ? String(obj.description) : undefined
      };
    }
    return { date: '', title: String(event) };
  };
  
  const events = Array.isArray(rawEvents) ? rawEvents.map(getEventData) : [];
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <List className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-gray-600">Timeline</span>
      </div>
      <div className="space-y-3">
        {events.map((event, index) => (
          <div key={index} className="flex gap-3">
            <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800">{event.date ? `${event.date}: ` : ''}{event.title}</p>
              {event.description && <p className="text-gray-600 text-sm">{event.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Hierarchy Visual - handles both string[] and object[] formats
function HierarchyVisual({ data }: { data: Record<string, unknown> }) {
  const rawRoot = data.root;
  const rawChildren = data.children || [];
  
  // Normalize to handle both string and object formats
  const getLabel = (item: unknown): string => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return String(obj.label || obj.name || obj.title || obj.id || JSON.stringify(item));
    }
    return String(item);
  };
  
  const root = getLabel(rawRoot) || 'Root';
  const children = Array.isArray(rawChildren) ? rawChildren : [];
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-medium text-gray-600">Hierarchy</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-indigo-500 text-white rounded-lg px-4 py-2 font-bold mb-4">
          {root}
        </div>
        <div className="w-0.5 h-4 bg-indigo-300" />
        <div className="flex flex-wrap justify-center gap-2">
          {children.map((child, index) => (
            <div key={index} className="bg-indigo-100 border border-indigo-300 rounded-lg px-3 py-1.5 text-indigo-800 text-sm">
              {getLabel(child)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Generic Visual fallback
function GenericVisual({ type, data }: { type: string; data: Record<string, unknown> }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-600">{type}</span>
      </div>
      <pre className="text-xs text-gray-600 overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// Structure Map
export function StructureMap({ title, content }: SectionProps) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl p-6 border border-gray-200 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
          <Map className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-gray-900">{title}</h3>
      </div>
      
      <div className="prose prose-gray max-w-none">
        <div className="whitespace-pre-wrap text-gray-700" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
    </div>
  );
}

// Key Takeaways
export function KeyTakeaways({ title, content }: SectionProps) {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-300 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-serif font-bold text-emerald-900">{title}</h3>
      </div>
      
      <div className="prose prose-emerald max-w-none">
        <div className="whitespace-pre-wrap text-emerald-800" dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
      </div>
    </div>
  );
}

// Helper function to format markdown
function formatMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br/>');
}

// Main section renderer that dispatches to the appropriate component
export function PremiumSectionRenderer({ section }: { section: SectionProps & { type: string } }) {
  switch (section.type) {
    case 'quickGlance':
      return <QuickGlanceSummary {...section} />;
    case 'foundationalNarrative':
      return <FoundationalNarrative {...section} />;
    case 'executiveSummary':
      return <ExecutiveSummary {...section} />;
    case 'conceptExplanation':
      return <ConceptExplanation {...section} />;
    case 'practicalExample':
      return <PracticalExample {...section} />;
    case 'insightAtlasNote':
      return <InsightAtlasNote {...section} />;
    case 'actionBox':
      return <ActionBox {...section} />;
    case 'selfAssessment':
      return <SelfAssessment {...section} />;
    case 'structureMap':
      return <StructureMap {...section} />;
    case 'keyTakeaways':
      return <KeyTakeaways {...section} />;
    case 'visualFramework':
      return section.visualType && section.visualData ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md">
          <h3 className="text-lg font-serif font-bold text-gray-900 mb-4">{section.title}</h3>
          <VisualFramework visualType={section.visualType} visualData={section.visualData} />
        </div>
      ) : null;
    default:
      // Default text section
      return (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-serif font-bold text-gray-900 mb-3">{section.title}</h3>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap text-gray-700" dangerouslySetInnerHTML={{ __html: formatMarkdown(section.content) }} />
          </div>
        </div>
      );
  }
}
