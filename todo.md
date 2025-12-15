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
