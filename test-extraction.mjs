import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import https from 'https';

// Download a file and return buffer
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Test with a simple PDF
async function testPDFExtraction() {
  console.log("Testing PDF extraction with pdfjs-dist...\n");
  
  try {
    // Download a sample PDF
    console.log("Downloading sample PDF...");
    const pdfBuffer = await downloadFile('https://www.orimi.com/pdf-test.pdf');
    console.log("Downloaded", pdfBuffer.length, "bytes");
    
    // Load the PDF
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    console.log("PDF loaded, pages:", pdf.numPages);
    
    // Get metadata
    const metadata = await pdf.getMetadata();
    console.log("Metadata:", JSON.stringify(metadata.info, null, 2));
    
    // Extract text from first page
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str || "").join(" ");
    console.log("\nFirst page text:", pageText.substring(0, 500));
    
    console.log("\n✓ PDF extraction works!");
  } catch (error) {
    console.error("PDF extraction failed:", error);
  }
}

testPDFExtraction();
