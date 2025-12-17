# Insight Atlas Web

AI-powered book analysis and insight generation platform with premium design, audio narration, and comprehensive visual frameworks.

## Overview

Insight Atlas transforms books into comprehensive, actionable insights using AI. Upload PDF, EPUB, or TXT files and receive detailed analysis with visual frameworks, audio narration, and premium formatting.

## Features

- **AI-Powered Analysis**: Uses Anthropic Claude for deep book analysis and insight generation
- **Premium Content Generation**: 9,000-12,000 word comprehensive guides with 20+ sections
- **Visual Frameworks**: 30+ visual types including flow diagrams, mind maps, comparison tables, timelines
- **Audio Narration**: ElevenLabs text-to-speech integration with 6 voice options
- **Multiple Export Formats**: PDF, Markdown, Plain Text, HTML
- **Library Management**: Organize books with favorites, search, filtering, and reading status
- **Mobile Optimized**: Full iPhone/iPad support with touch gestures and responsive design
- **No Login Required**: Immediate access without authentication

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Wouter (routing)
- **Backend**: Node.js, Express, tRPC 11
- **Database**: MySQL/TiDB with Drizzle ORM
- **AI Services**: Anthropic Claude, ElevenLabs
- **Build Tools**: Vite, pnpm
- **Testing**: Vitest

## Platform Requirements

**This application is designed to run on the Manus platform** and uses several platform-specific features:

### Manus Platform Features

1. **vite-plugin-manus-runtime**: Custom Vite plugin that handles:
   - Environment variable injection into HTML (`%VITE_*%` syntax)
   - Build-time configuration
   - Runtime optimizations

2. **Auto-Injected Environment Variables**:
   - `DATABASE_URL` - MySQL connection string
   - `ANTHROPIC_API_KEY` - Claude API key
   - `JWT_SECRET` - Session signing secret
   - `VITE_APP_ID` - OAuth application ID
   - `OAUTH_SERVER_URL` - Manus OAuth server
   - `VITE_OAUTH_PORTAL_URL` - OAuth portal URL
   - `BUILT_IN_FORGE_API_URL` - Storage proxy URL
   - `BUILT_IN_FORGE_API_KEY` - Storage API key
   - `VITE_ANALYTICS_ENDPOINT` - Analytics endpoint
   - `VITE_ANALYTICS_WEBSITE_ID` - Analytics website ID

3. **Manus Storage Proxy**: File uploads use the Manus storage service (S3-compatible)

4. **Manus OAuth**: Authentication flow integrated with Manus OAuth server

### Running Outside Manus Platform

If you want to run this outside the Manus platform, you'll need to:

1. Replace `vitePluginManusRuntime()` in `vite.config.ts`
2. Set up all environment variables manually
3. Replace the storage service with direct S3 or local file storage
4. Implement your own OAuth or remove authentication
5. Remove or replace the analytics script in `client/index.html`

## Development

### Prerequisites

- Node.js 22+
- pnpm 9+
- MySQL/TiDB database

### Installation

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test server/books.test.ts
```

### Database Management

```bash
# Push schema changes to database
pnpm db:push

# Generate migrations
pnpm db:generate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## Project Structure

```
client/
  src/
    pages/          # Page components (Home, Book, Insight, Library)
    components/     # Reusable UI components
    lib/            # Utilities and tRPC client
  index.html        # HTML entry point
server/
  routers.ts        # tRPC API routes
  db.ts             # Database operations
  services/         # Business logic services
  _core/            # Platform integration
drizzle/
  schema.ts         # Database schema
shared/             # Shared types and constants
```

## Key Services

### Insight Generation Pipeline

The insight generation uses a multi-stage pipeline:

1. **Stage 0: Book Analysis** - Claude analyzes the book and extracts core concepts
2. **Stage 1: Premium Content Generation** - Claude generates 20+ comprehensive sections
3. **Gap Analysis** - Validates all 9 quality dimensions and fills missing content
4. **Stage 2: Audio Script** - Generates narration script for ElevenLabs

### Visual Framework System

30+ visual types automatically selected based on content:
- Flow diagrams, mind maps, hierarchies
- Timelines, comparison matrices, radar charts
- Network graphs, Venn diagrams, decision trees
- And 20+ more types

## API Integration

### Anthropic Claude

Used for primary content generation:
- Book analysis (Stage 0)
- Premium content generation (Stage 1)
- Gap analysis and content completion

### ElevenLabs

Text-to-speech audio narration with 6 voice options:
- Rachel (Calm Female)
- Adam (Deep Male)
- Domi (Strong Female)
- Fin (Warm Male)
- Sarah (Soft Female)
- Antoni (Smooth Male)

## Deployment

This application is designed for deployment on the Manus platform:

1. Create checkpoint: `webdev_save_checkpoint`
2. Click "Publish" button in Manus UI
3. Configure custom domain (optional)

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team or visit https://help.manus.im
