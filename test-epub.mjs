import AdmZip from 'adm-zip';
import https from 'https';
import http from 'http';
import fs from 'fs';

// Download a file and return buffer
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
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

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function testEpubExtraction() {
  console.log("Testing EPUB extraction with adm-zip...\n");
  
  try {
    // Download a sample EPUB
    console.log("Downloading sample EPUB...");
    const epubBuffer = await downloadFile('https://www.gutenberg.org/ebooks/84.epub.noimages');
    console.log("Downloaded", epubBuffer.length, "bytes");
    
    const zip = new AdmZip(epubBuffer);
    const entries = zip.getEntries();
    
    console.log("\nEPUB entries:");
    entries.forEach(e => {
      console.log(" -", e.entryName);
    });
    
    // Find container.xml
    const containerEntry = entries.find(e => e.entryName.toLowerCase().includes("container.xml"));
    if (containerEntry) {
      const containerXml = containerEntry.getData().toString("utf-8");
      console.log("\ncontainer.xml content:");
      console.log(containerXml);
      
      const rootfileMatch = containerXml.match(/rootfile[^>]*full-path="([^"]+)"/i);
      if (rootfileMatch) {
        console.log("\nOPF path:", rootfileMatch[1]);
        
        // Find and parse OPF
        const opfEntry = entries.find(e => e.entryName === rootfileMatch[1]);
        if (opfEntry) {
          const opfXml = opfEntry.getData().toString("utf-8");
          
          // Extract title
          const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
          if (titleMatch) {
            console.log("Title:", stripHtml(titleMatch[1]));
          }
          
          // Extract author
          const authorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
          if (authorMatch) {
            console.log("Author:", stripHtml(authorMatch[1]));
          }
          
          // Find HTML files
          const htmlFiles = entries.filter(e => /\.(x?html?)$/i.test(e.entryName));
          console.log("\nHTML files found:", htmlFiles.length);
          
          // Extract text from first few chapters
          let totalWords = 0;
          for (const htmlEntry of htmlFiles.slice(0, 5)) {
            const content = htmlEntry.getData().toString("utf-8");
            const text = stripHtml(content);
            const words = text.split(/\s+/).filter(w => w.length > 0).length;
            totalWords += words;
            console.log(` - ${htmlEntry.entryName}: ${words} words`);
            if (text.length > 0) {
              console.log(`   Preview: ${text.substring(0, 200)}...`);
            }
          }
          
          console.log("\nTotal words from first 5 files:", totalWords);
        }
      }
    }
    
    console.log("\n✓ EPUB extraction test complete!");
  } catch (error) {
    console.error("EPUB extraction failed:", error);
  }
}

testEpubExtraction();
