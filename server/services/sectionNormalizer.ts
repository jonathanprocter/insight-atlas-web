/**
 * Section Normalizer
 * 
 * Converts premium section types to legacy export format for PDF/HTML generation.
 * Maps quickGlance → heading+paragraph, actionBox → list, etc.
 */

import { PremiumSection } from './stage1ContentGeneration';

// Accept both PremiumSection and InsightSection (from premiumInsightPipeline)
type AnySection = PremiumSection | {
  id?: string;
  type: string;
  title: string;
  content: string;
  visualType?: string;
  visualData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export interface LegacySection {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'table';
  title: string;
  content: string;
  visualType?: string;
  visualData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Normalize premium sections to legacy format for exports
 */
export function normalizeSectionsForExport(sections: AnySection[]): LegacySection[] {
  const normalized: LegacySection[] = [];
  
  for (const section of sections) {
    const sectionId = section.id || `section-${Math.random().toString(36).substr(2, 9)}`;
    
    switch (section.type) {
      case 'quickGlance':
      case 'executiveSummary':
      case 'foundationalNarrative':
        // These become heading + paragraph
        normalized.push({
          id: `${sectionId}-heading`,
          type: 'heading',
          title: section.title,
          content: section.title,
          metadata: section.metadata
        });
        normalized.push({
          id: sectionId,
          type: 'paragraph',
          title: section.title,
          content: cleanMarkdown(section.content),
          visualType: section.visualType,
          visualData: section.visualData,
          metadata: section.metadata
        });
        break;
        
      case 'actionBox':
        // Action boxes become heading + list
        normalized.push({
          id: `${sectionId}-heading`,
          type: 'heading',
          title: section.title,
          content: section.title,
          metadata: section.metadata
        });
        
        if (section.metadata?.actionSteps && Array.isArray(section.metadata.actionSteps)) {
          const listContent = section.metadata.actionSteps
            .map((step, idx) => `${idx + 1}. ${step}`)
            .join('\n');
          normalized.push({
            id: sectionId,
            type: 'list',
            title: section.title,
            content: listContent,
            metadata: section.metadata
          });
        } else {
          normalized.push({
            id: sectionId,
            type: 'paragraph',
            title: section.title,
            content: cleanMarkdown(section.content),
            metadata: section.metadata
          });
        }
        break;
        
      case 'insightAtlasNote':
        // Notes become quote blocks
        normalized.push({
          id: `${sectionId}-heading`,
          type: 'heading',
          title: section.title,
          content: section.title,
          metadata: section.metadata
        });
        normalized.push({
          id: sectionId,
          type: 'quote',
          title: section.title,
          content: cleanMarkdown(section.content),
          metadata: section.metadata
        });
        break;
        
      case 'conceptExplanation':
      case 'practicalExample':
      case 'keyTakeaways':
        // These become heading + paragraph
        normalized.push({
          id: `${sectionId}-heading`,
          type: 'heading',
          title: section.title,
          content: section.title,
          metadata: section.metadata
        });
        normalized.push({
          id: sectionId,
          type: 'paragraph',
          title: section.title,
          content: cleanMarkdown(section.content),
          visualType: section.visualType,
          visualData: section.visualData,
          metadata: section.metadata
        });
        break;
        
      case 'visualFramework':
      case 'selfAssessment':
      case 'trackingTemplate':
        // Visual sections become heading + paragraph with visual metadata
        normalized.push({
          id: `${sectionId}-heading`,
          type: 'heading',
          title: section.title,
          content: section.title,
          metadata: section.metadata
        });
        normalized.push({
          id: sectionId,
          type: 'paragraph',
          title: section.title,
          content: cleanMarkdown(section.content),
          visualType: section.visualType,
          visualData: section.visualData,
          metadata: section.metadata
        });
        break;
        
      case 'structureMap':
      case 'chapterBreakdown':
        // Structure sections become tables if they have data, otherwise paragraphs
        normalized.push({
          id: `${sectionId}-heading`,
          type: 'heading',
          title: section.title,
          content: section.title,
          metadata: section.metadata
        });
        normalized.push({
          id: sectionId,
          type: section.visualType === 'comparisonMatrix' ? 'table' : 'paragraph',
          title: section.title,
          content: cleanMarkdown(section.content),
          visualType: section.visualType,
          visualData: section.visualData,
          metadata: section.metadata
        });
        break;
        
      default:
        // Unknown types become paragraph
        normalized.push({
          id: sectionId,
          type: 'paragraph',
          title: section.title,
          content: cleanMarkdown(section.content),
          visualType: section.visualType,
          visualData: section.visualData,
          metadata: section.metadata
        });
    }
  }
  
  return normalized;
}

/**
 * Clean markdown artifacts from content
 * Converts markdown to clean text suitable for HTML/PDF export
 */
function cleanMarkdown(content: string): string {
  if (!content) return '';
  
  return content
    // Remove code fences
    .replace(/```[\s\S]*?```/g, '')
    // Convert bold to <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert italic to <em>
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Convert headers to proper HTML
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Convert bullet lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive list items in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate table of contents from normalized sections
 * Only includes heading-type sections for proper hierarchy
 */
export function generateTableOfContents(sections: LegacySection[]): Array<{ id: string; title: string; type: string }> {
  return sections
    .filter(s => s.type === 'heading')
    .map(s => ({
      id: s.id,
      title: s.title,
      type: s.type
    }));
}
