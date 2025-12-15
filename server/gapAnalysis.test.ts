import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergeGapFilledContent } from './services/gapAnalysisService';

describe('Gap Analysis Service', () => {
  describe('mergeGapFilledContent', () => {
    it('should add new sections at appropriate positions', () => {
      const originalSections = [
        { type: 'quickGlance', title: 'Quick Glance', content: 'Summary content' },
        { type: 'executiveSummary', title: 'Executive Summary', content: 'Executive content' },
      ];

      const gapFilledContent = [
        { type: 'foundationalNarrative', title: 'Story Behind', content: 'Narrative content' },
      ];

      const merged = mergeGapFilledContent(originalSections, gapFilledContent);

      expect(merged.length).toBe(3);
      // foundationalNarrative should be between quickGlance and executiveSummary
      expect(merged[0].type).toBe('quickGlance');
      expect(merged[1].type).toBe('foundationalNarrative');
      expect(merged[2].type).toBe('executiveSummary');
    });

    it('should replace existing sections with same type and title', () => {
      const originalSections = [
        { type: 'quickGlance', title: 'Quick Glance', content: 'Original content' },
        { type: 'executiveSummary', title: 'Executive Summary', content: 'Executive content' },
      ];

      const gapFilledContent = [
        { type: 'quickGlance', title: 'Quick Glance', content: 'Enhanced content with more detail' },
      ];

      const merged = mergeGapFilledContent(originalSections, gapFilledContent);

      expect(merged.length).toBe(2);
      expect(merged[0].content).toBe('Enhanced content with more detail');
    });

    it('should handle empty gap-filled content', () => {
      const originalSections = [
        { type: 'quickGlance', title: 'Quick Glance', content: 'Summary content' },
      ];

      const merged = mergeGapFilledContent(originalSections, []);

      expect(merged.length).toBe(1);
      expect(merged[0].content).toBe('Summary content');
    });

    it('should add action boxes after concept explanations', () => {
      const originalSections = [
        { type: 'quickGlance', title: 'Quick Glance', content: 'Summary' },
        { type: 'conceptExplanation', title: 'Concept 1', content: 'Explanation' },
        { type: 'keyTakeaways', title: 'Takeaways', content: 'Key points' },
      ];

      const gapFilledContent = [
        { type: 'actionBox', title: 'Apply Concept 1', content: 'Action steps' },
      ];

      const merged = mergeGapFilledContent(originalSections, gapFilledContent);

      expect(merged.length).toBe(4);
      // actionBox should come after conceptExplanation but before keyTakeaways
      const actionBoxIndex = merged.findIndex(s => s.type === 'actionBox');
      const conceptIndex = merged.findIndex(s => s.type === 'conceptExplanation');
      const takeawaysIndex = merged.findIndex(s => s.type === 'keyTakeaways');
      
      expect(actionBoxIndex).toBeGreaterThan(conceptIndex);
      expect(actionBoxIndex).toBeLessThan(takeawaysIndex);
    });

    it('should preserve visual data and metadata when merging', () => {
      const originalSections = [
        { 
          type: 'visualFramework', 
          title: 'Flow Chart', 
          content: 'Visual content',
          visualType: 'flowDiagram',
          visualData: { nodes: [], edges: [] },
          metadata: { conceptName: 'Test Concept' }
        },
      ];

      const gapFilledContent = [
        { type: 'actionBox', title: 'Actions', content: 'Steps', metadata: { actionSteps: ['Step 1', 'Step 2'] } },
      ];

      const merged = mergeGapFilledContent(originalSections, gapFilledContent);

      expect(merged.length).toBe(2);
      expect(merged[0].visualData).toEqual({ nodes: [], edges: [] });
      expect(merged[0].metadata).toEqual({ conceptName: 'Test Concept' });
      expect(merged[1].metadata).toEqual({ actionSteps: ['Step 1', 'Step 2'] });
    });
  });
});
