import { storagePut } from "../storage";
import { InsightSection } from "./insightGeneration";

export interface PDFExportOptions {
  title: string;
  author: string | null;
  summary: string;
  sections: InsightSection[];
  keyThemes: string[];
  bookTitle: string;
  generatedAt: Date;
}

export interface PDFExportResult {
  pdfUrl: string;
  pdfKey: string;
  pageCount: number;
}

/**
 * Generate premium-styled PDF from insight content
 * Uses HTML-to-PDF approach for rich styling
 */
export async function generatePremiumPDF(
  options: PDFExportOptions,
  insightId: number
): Promise<PDFExportResult> {
  const html = generatePremiumHTML(options);
  
  // For now, we'll store the HTML and let the client render/print
  // In production, this would use puppeteer or similar for server-side PDF generation
  const htmlKey = `insights/${insightId}/export-${Date.now()}.html`;
  const { url: pdfUrl } = await storagePut(htmlKey, Buffer.from(html), "text/html");
  
  return {
    pdfUrl,
    pdfKey: htmlKey,
    pageCount: Math.ceil(options.sections.length / 3),
  };
}

/**
 * Generate premium HTML for PDF export
 */
function generatePremiumHTML(options: PDFExportOptions): string {
  const { title, author, summary, sections, keyThemes, bookTitle, generatedAt } = options;
  
  const sectionHTML = sections.map(section => renderSection(section)).join("\n");
  const themesHTML = keyThemes.map(theme => `<span class="theme-tag">${theme}</span>`).join("");
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Insight Atlas</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --gold: #C9A227;
      --gold-light: #E8D48A;
      --gold-dark: #8B7355;
      --cream: #FDF8F0;
      --charcoal: #2C2C2C;
      --warm-gray: #6B6B6B;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Cormorant Garamond', Georgia, serif;
      background: var(--cream);
      color: var(--charcoal);
      line-height: 1.7;
      font-size: 16px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    
    /* Premium Header */
    .header {
      text-align: center;
      padding: 60px 40px;
      border: 3px solid var(--gold);
      border-radius: 8px;
      margin-bottom: 40px;
      position: relative;
      background: linear-gradient(135deg, rgba(201, 162, 39, 0.05) 0%, transparent 50%);
    }
    
    .header::before,
    .header::after {
      content: "◆";
      position: absolute;
      color: var(--gold);
      font-size: 14px;
    }
    
    .header::before {
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--cream);
      padding: 0 10px;
    }
    
    .header::after {
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--cream);
      padding: 0 10px;
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 600;
      color: var(--charcoal);
      margin-bottom: 16px;
      letter-spacing: 0.02em;
    }
    
    .header .book-info {
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      color: var(--warm-gray);
      margin-bottom: 8px;
    }
    
    .header .date {
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      color: var(--gold-dark);
    }
    
    /* Themes */
    .themes {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin: 24px 0;
    }
    
    .theme-tag {
      font-family: 'Inter', sans-serif;
      font-size: 0.75rem;
      padding: 6px 14px;
      background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
      color: white;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    /* Summary */
    .summary {
      padding: 32px;
      background: white;
      border-left: 4px solid var(--gold);
      margin-bottom: 40px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    
    .summary h2 {
      font-size: 1.3rem;
      color: var(--gold-dark);
      margin-bottom: 16px;
      font-weight: 600;
    }
    
    .summary p {
      font-size: 1.1rem;
      color: var(--charcoal);
    }
    
    /* Section Styles */
    .section {
      margin-bottom: 32px;
    }
    
    .section-heading {
      font-size: 1.8rem;
      font-weight: 600;
      color: var(--charcoal);
      margin: 48px 0 24px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--gold);
      position: relative;
    }
    
    .section-heading::after {
      content: "";
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 60px;
      height: 4px;
      background: var(--gold);
    }
    
    .paragraph {
      font-size: 1.1rem;
      margin-bottom: 20px;
      text-align: justify;
    }
    
    /* Quote Block */
    .quote-block {
      padding: 32px 40px;
      background: linear-gradient(135deg, rgba(201, 162, 39, 0.1) 0%, rgba(201, 162, 39, 0.05) 100%);
      border-left: 4px solid var(--gold);
      margin: 32px 0;
      position: relative;
    }
    
    .quote-block::before {
      content: """;
      position: absolute;
      top: 10px;
      left: 20px;
      font-size: 4rem;
      color: var(--gold);
      opacity: 0.3;
      font-family: Georgia, serif;
    }
    
    .quote-block .quote-text {
      font-size: 1.3rem;
      font-style: italic;
      color: var(--charcoal);
      position: relative;
      z-index: 1;
    }
    
    .quote-block .quote-attribution {
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      color: var(--gold-dark);
      margin-top: 16px;
      font-style: normal;
    }
    
    /* Author Spotlight */
    .author-spotlight {
      padding: 32px;
      background: white;
      border: 2px solid var(--gold);
      border-radius: 8px;
      margin: 32px 0;
      position: relative;
    }
    
    .author-spotlight::before {
      content: "Author Spotlight";
      position: absolute;
      top: -12px;
      left: 24px;
      background: var(--cream);
      padding: 0 12px;
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      color: var(--gold);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    
    /* Insight Note */
    .insight-note {
      padding: 24px 32px;
      background: linear-gradient(135deg, #FFF9E6 0%, #FFF5D6 100%);
      border-radius: 8px;
      margin: 24px 0;
      border: 1px solid var(--gold-light);
    }
    
    .insight-note .note-title {
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      color: var(--gold-dark);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .insight-note .note-title::before {
      content: "💡";
    }
    
    /* Alternative Perspective */
    .alternative-perspective {
      padding: 24px 32px;
      background: #F5F5F5;
      border-left: 4px solid var(--warm-gray);
      margin: 24px 0;
    }
    
    .alternative-perspective::before {
      content: "Alternative Perspective";
      display: block;
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      color: var(--warm-gray);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    
    /* Research Insight */
    .research-insight {
      padding: 24px 32px;
      background: #E8F4F8;
      border-radius: 8px;
      margin: 24px 0;
      border: 1px solid #B8D4E3;
    }
    
    .research-insight::before {
      content: "📊 Research Insight";
      display: block;
      font-family: 'Inter', sans-serif;
      font-size: 0.8rem;
      color: #4A7C8F;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    
    /* Key Takeaways */
    .key-takeaways {
      padding: 32px;
      background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
      border-radius: 8px;
      margin: 32px 0;
      color: white;
    }
    
    .key-takeaways h3 {
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 20px;
    }
    
    .key-takeaways ul {
      list-style: none;
    }
    
    .key-takeaways li {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.2);
      font-size: 1.1rem;
    }
    
    .key-takeaways li:last-child {
      border-bottom: none;
    }
    
    .key-takeaways li::before {
      content: "✓ ";
      margin-right: 8px;
    }
    
    /* Exercise */
    .exercise {
      padding: 32px;
      background: #FFF0F5;
      border: 2px dashed #D4A5B9;
      border-radius: 8px;
      margin: 32px 0;
    }
    
    .exercise .exercise-title {
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      color: #9B6B7D;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    
    .exercise .exercise-title::before {
      content: "✏️ ";
    }
    
    /* Lists */
    .bullet-list, .numbered-list {
      padding: 24px 32px;
      background: white;
      border-radius: 8px;
      margin: 24px 0;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    
    .bullet-list h4, .numbered-list h4 {
      font-size: 1.2rem;
      color: var(--charcoal);
      margin-bottom: 16px;
    }
    
    .bullet-list ul, .numbered-list ol {
      padding-left: 24px;
    }
    
    .bullet-list li, .numbered-list li {
      margin-bottom: 8px;
      font-size: 1.05rem;
    }
    
    /* Section Divider */
    .section-divider {
      text-align: center;
      margin: 48px 0;
      color: var(--gold);
      font-size: 1.5rem;
      letter-spacing: 0.5em;
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 40px;
      margin-top: 60px;
      border-top: 2px solid var(--gold);
    }
    
    .footer .logo {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--gold);
      margin-bottom: 8px;
    }
    
    .footer .tagline {
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      color: var(--warm-gray);
    }
    
    @media print {
      body {
        background: white;
      }
      
      .container {
        max-width: 100%;
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .key-takeaways {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>${escapeHtml(title)}</h1>
      <p class="book-info">Insights from "${escapeHtml(bookTitle)}"${author ? ` by ${escapeHtml(author)}` : ""}</p>
      <p class="date">Generated on ${generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      <div class="themes">
        ${themesHTML}
      </div>
    </header>
    
    <section class="summary">
      <h2>Executive Summary</h2>
      <p>${escapeHtml(summary)}</p>
    </section>
    
    <main>
      ${sectionHTML}
    </main>
    
    <footer class="footer">
      <div class="logo">Insight Atlas</div>
      <p class="tagline">Transform books into wisdom</p>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Render a single section to HTML
 */
function renderSection(section: InsightSection): string {
  switch (section.type) {
    case "heading":
      return `<h2 class="section-heading">${escapeHtml(section.content)}</h2>`;
      
    case "paragraph":
      return `<p class="paragraph">${escapeHtml(section.content)}</p>`;
      
    case "quote":
      return `
        <blockquote class="quote-block">
          <p class="quote-text">${escapeHtml(section.content)}</p>
          ${section.title ? `<p class="quote-attribution">— ${escapeHtml(section.title)}</p>` : ""}
        </blockquote>`;
      
    case "authorSpotlight":
      return `
        <div class="author-spotlight">
          <p>${escapeHtml(section.content)}</p>
        </div>`;
      
    case "insightNote":
      return `
        <div class="insight-note">
          ${section.title ? `<div class="note-title">${escapeHtml(section.title)}</div>` : ""}
          <p>${escapeHtml(section.content)}</p>
        </div>`;
      
    case "alternativePerspective":
      return `
        <div class="alternative-perspective">
          <p>${escapeHtml(section.content)}</p>
        </div>`;
      
    case "researchInsight":
      return `
        <div class="research-insight">
          <p>${escapeHtml(section.content)}</p>
        </div>`;
      
    case "keyTakeaways":
      const takeawayItems = section.items?.map(item => `<li>${escapeHtml(item)}</li>`).join("") || "";
      return `
        <div class="key-takeaways">
          <h3>Key Takeaways</h3>
          <ul>${takeawayItems}</ul>
        </div>`;
      
    case "exercise":
      return `
        <div class="exercise">
          ${section.title ? `<div class="exercise-title">${escapeHtml(section.title)}</div>` : ""}
          <p>${escapeHtml(section.content)}</p>
        </div>`;
      
    case "bulletList":
      const bulletItems = section.items?.map(item => `<li>${escapeHtml(item)}</li>`).join("") || "";
      return `
        <div class="bullet-list">
          ${section.title ? `<h4>${escapeHtml(section.title)}</h4>` : ""}
          <ul>${bulletItems}</ul>
        </div>`;
      
    case "numberedList":
      const numberedItems = section.items?.map(item => `<li>${escapeHtml(item)}</li>`).join("") || "";
      return `
        <div class="numbered-list">
          ${section.title ? `<h4>${escapeHtml(section.title)}</h4>` : ""}
          <ol>${numberedItems}</ol>
        </div>`;
      
    case "sectionDivider":
      return `<div class="section-divider">◆ ◆ ◆</div>`;
      
    case "visual":
      return `
        <div class="visual-placeholder">
          <p><em>[Visual: ${section.visualType || "Diagram"}]</em></p>
        </div>`;
      
    default:
      return `<p class="paragraph">${escapeHtml(section.content || "")}</p>`;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
