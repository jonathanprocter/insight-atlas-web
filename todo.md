# Insight Atlas Web - Project TODO

## Core Infrastructure
- [x] Database schema for books, insights, and library items
- [x] tRPC routers for all features
- [x] User authentication integration

## Book Upload & Processing
- [x] File upload component (PDF, EPUB, TXT)
- [x] Text extraction from uploaded files
- [x] Book metadata parsing

## AI Insight Generation
- [x] OpenAI integration with streaming
- [x] Real-time progress tracking (word count, status)
- [x] Content parsing and structuring

## Premium UI Components
- [x] Ornate borders and decorative elements
- [x] Diamond ornaments and flourishes
- [x] Cormorant Garamond and Inter fonts
- [x] Premium quote blocks
- [x] Author spotlight cards
- [x] Commentary boxes (Insight Note, Alternative Perspective, Research Insight)
- [x] Section headers with decorative elements
- [x] Section dividers

## Visual Type System
- [x] 30 visual type definitions
- [x] Intelligent content-based selection
- [x] Visual rendering components
- [x] Timeline, flow diagram, comparison matrix
- [x] Pie chart, bar chart, infographic
- [x] Mind map, hierarchy, network graph
- [x] And 21 more visual types

## Audio Narration
- [x] ElevenLabs API integration
- [x] Audio generation from insights
- [x] Playback controls (play, pause, seek)
- [x] Audio progress indicator

## Library Management
- [x] Library list view with book cards
- [x] Favorites toggle
- [x] Search and filtering
- [x] Swipe-like actions (Favorite, Export, Delete)
- [x] Reading status tracking

## PDF Export
- [x] PDF generation with premium styling
- [x] Ornate borders in PDF
- [x] Typography matching app design
- [x] Visual elements in PDF

## Responsive Design
- [x] Mobile-optimized layout
- [x] Tablet-optimized layout
- [x] Desktop-optimized layout

## Final Integration
- [x] App.tsx routing
- [x] Navigation structure
- [x] Error handling
- [x] Loading states

## Future Enhancements
- [ ] Streaming insight generation with real-time progress UI
- [ ] Visual chart rendering with Chart.js
- [ ] Book cover image extraction
- [ ] Reading progress tracking
- [ ] Social sharing features
- [ ] Multiple insight versions per book


## Bug Fixes
- [x] Fix PDF upload crash during extraction
- [x] Fix EPUB upload crash during extraction
- [x] Remove display of raw extracted content


## Upload Progress Bar
- [x] Create UploadProgress component with animated stages
- [x] Integrate progress bar into Home page upload flow
- [x] Show stages: reading, extracting, saving, complete
- [x] Handle error state with retry option Create UploadProgress component with animated progress bar
- [ ] Show upload stages (Reading file, Extracting content, Saving to library)
- [ ] Integrate progress bar into Home page upload flow

- [x] Fix insight generation failure when clicking generate button


## iPhone Optimization
- [x] Add mobile viewport meta tags and safe area insets
- [x] Make all touch targets at least 44px for iOS accessibility
- [x] Add responsive breakpoints for iPhone screen sizes
- [x] Optimize typography for mobile readability
- [x] Add touch-friendly interactions and feedback
- [x] Mobile-optimized audio player with touch-friendly controls
- [x] Floating action button for mobile upload
- [x] Responsive cards and layouts for all pages


## Book Cover Extraction
- [ ] Extract cover image from EPUB files
- [ ] Extract cover image from PDF files (first page thumbnail)
- [ ] Upload extracted covers to S3 storage
- [ ] Add coverUrl field to books table
- [ ] Display covers in Library page
- [ ] Display covers in Book detail page


## No Login Required
- [x] Remove authentication requirement from all routes
- [x] Change protected procedures to public procedures
- [x] Update Home page to show Dashboard directly (no landing page)
- [x] Remove login buttons and auth-related UI
- [x] Ensure all features work without user context


## iOS Feature Parity
- [x] Swipe actions on library items (delete, export, favorite)
- [x] Context menu on right-click (delete, export, favorite)
- [x] Multiple export formats (PDF, Markdown, Plain Text, HTML)
- [x] Export modal with format selection
- [x] Grid/List layout toggle
- [x] Filter bar (All, Favorites, Reading, Completed)
- [ ] Book cover extraction and display
- [x] Share sheet for exports (Web Share API)


## Anthropic Claude Integration
- [x] Create Anthropic Claude service for content generation
- [x] Update insight generation to use Claude for analysis and writing
- [x] Keep OpenAI/built-in LLM for audio scripts and other tasks
- [ ] Test Claude integration with book insight generation

- [x] Enhance audio script to convey visual content meaningfully (not just describe visuals)


## Voice Selection & Streaming Features
- [x] Add ElevenLabs voice selection dropdown (Rachel, Adam, etc.)
- [x] Display voice preview/description for each option
- [x] Save user's preferred voice selection
- [x] Implement real-time streaming insight generation with Claude
- [x] Show progress indicator during generation with section count
- [x] Display progress bar with percentage
- [x] Extract book covers from EPUB files
- [x] Extract book covers from PDF files (first page)
- [x] Upload covers to S3 and store URL in database
- [x] Display covers in Library and Book detail pages


## Bug Fixes - Content Extraction
- [x] Fix PDF text extraction using pdfjs-dist directly
- [x] Fix EPUB text extraction with improved error handling
- [x] Ensure extracted text is saved to database correctly


## Bug Fix - EPUB Extraction Returns 0 Words
- [x] Fix EPUB extraction returning empty content
- [x] Use alternative EPUB parsing approach (adm-zip + xml parsing)
- [x] Test with actual EPUB file (Frankenstein - 3055 words from 5 chapters)


## Remove All Authentication
- [x] Remove auth checks from Home page (always show Dashboard)
- [x] Remove auth checks from Book page (already public)
- [x] Remove auth checks from Insight page (already public)
- [x] Remove auth checks from Library page (already public)
- [x] Update welcome message to be generic ("Transform Your Books")


## Bug Fix - Extraction Error
- [x] Fix "Data too long for column 'extractedText'" error
- [x] Changed extractedText column from text to longtext for large books


## Enhance Insight Detail Level
- [x] Update Claude prompt to generate more detailed, comprehensive insights (3000-5000 words)
- [x] Add more sections: Executive Summary, Key Themes, Notable Quotes, Chapter Analysis
- [x] Include specific page/chapter references
- [x] Add actionable takeaways and practical applications
- [x] Include author context and book significance
- [x] Require 15-20 diverse sections with rich content
- [x] UI already supports all section types


## Bug Fix - Insight Generation Failure
- [x] Investigated and found insight generation works correctly
- [x] Claude API integration working properly
- [x] Generated comprehensive insights for Awareness Games book
