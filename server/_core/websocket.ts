/**
 * WebSocket Server for Real-time Progress Updates
 *
 * Provides real-time progress updates for insight generation via WebSocket.
 * Supports subscribe/unsubscribe patterns for individual insights.
 */

import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { progressCache } from './redis';

// Store active WebSocket connections
let wss: WebSocketServer | null = null;

// Map of insightId to connected clients
const subscriptions = new Map<number, Set<WebSocket>>();

/**
 * Progress update message structure
 */
export interface ProgressUpdate {
  insightId: number;
  status: 'generating' | 'completed' | 'failed';
  percent: number;
  currentStep: string;
  sectionCount?: number;
  wordCount?: number;
  error?: string;
}

/**
 * Client message types
 */
interface ClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'getProgress';
  insightId: number;
}

/**
 * Initialize WebSocket server
 */
export function initWebSocket(server: Server): WebSocketServer {
  if (wss) {
    console.log('[WebSocket] Server already initialized');
    return wss;
  }

  wss = new WebSocketServer({
    server,
    path: '/ws',
    clientTracking: true,
  });

  console.log('[WebSocket] Server initialized on /ws');

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected');

    ws.on('message', async (data: Buffer) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (error) {
        console.error('[WebSocket] Invalid message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      unsubscribeAll(ws);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
      unsubscribeAll(ws);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'WebSocket connection established',
    }));
  });

  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });

  return wss;
}

/**
 * Handle incoming client messages
 */
async function handleClientMessage(ws: WebSocket, message: ClientMessage): Promise<void> {
  const { type, insightId } = message;

  switch (type) {
    case 'subscribe':
      subscribe(ws, insightId);
      // Send current progress if available
      const progress = await progressCache.getProgress(insightId);
      if (progress) {
        ws.send(JSON.stringify({
          type: 'progress',
          insightId,
          ...progress,
        }));
      }
      break;

    case 'unsubscribe':
      unsubscribe(ws, insightId);
      break;

    case 'getProgress':
      const currentProgress = await progressCache.getProgress(insightId);
      ws.send(JSON.stringify({
        type: currentProgress ? 'progress' : 'noProgress',
        insightId,
        ...(currentProgress || {}),
      }));
      break;

    default:
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
  }
}

/**
 * Subscribe a client to an insight's progress updates
 */
function subscribe(ws: WebSocket, insightId: number): void {
  if (!subscriptions.has(insightId)) {
    subscriptions.set(insightId, new Set());
  }
  subscriptions.get(insightId)!.add(ws);
  console.log(`[WebSocket] Client subscribed to insight ${insightId}`);

  ws.send(JSON.stringify({
    type: 'subscribed',
    insightId,
  }));
}

/**
 * Unsubscribe a client from an insight's progress updates
 */
function unsubscribe(ws: WebSocket, insightId: number): void {
  const subs = subscriptions.get(insightId);
  if (subs) {
    subs.delete(ws);
    if (subs.size === 0) {
      subscriptions.delete(insightId);
    }
  }
  console.log(`[WebSocket] Client unsubscribed from insight ${insightId}`);

  ws.send(JSON.stringify({
    type: 'unsubscribed',
    insightId,
  }));
}

/**
 * Unsubscribe a client from all insights
 */
function unsubscribeAll(ws: WebSocket): void {
  const entries = Array.from(subscriptions.entries());
  for (const [insightId, subs] of entries) {
    subs.delete(ws);
    if (subs.size === 0) {
      subscriptions.delete(insightId);
    }
  }
}

/**
 * Broadcast progress update to all subscribed clients
 */
export async function broadcastProgress(update: ProgressUpdate): Promise<void> {
  // Store in cache for late subscribers
  await progressCache.setProgress(update.insightId, {
    status: update.status,
    percent: update.percent,
    currentStep: update.currentStep,
    sectionCount: update.sectionCount,
    wordCount: update.wordCount,
  });

  // Broadcast to connected clients
  const subs = subscriptions.get(update.insightId);
  if (subs && subs.size > 0) {
    const message = JSON.stringify({
      type: 'progress',
      ...update,
    });

    const subscribers = Array.from(subs);
    for (const ws of subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        subs.delete(ws);
      }
    }

    console.log(`[WebSocket] Broadcast progress to ${subs.size} clients for insight ${update.insightId}: ${update.percent}%`);
  }

  // Clear progress cache on completion or failure
  if (update.status === 'completed' || update.status === 'failed') {
    setTimeout(() => {
      progressCache.clearProgress(update.insightId);
    }, 60000); // Keep for 1 minute after completion
  }
}

/**
 * Send completion notification
 */
export async function notifyComplete(insightId: number, data: {
  sectionCount: number;
  wordCount: number;
  hasAudio?: boolean;
}): Promise<void> {
  await broadcastProgress({
    insightId,
    status: 'completed',
    percent: 100,
    currentStep: 'Complete',
    sectionCount: data.sectionCount,
    wordCount: data.wordCount,
  });
}

/**
 * Send failure notification
 */
export async function notifyFailed(insightId: number, error: string): Promise<void> {
  await broadcastProgress({
    insightId,
    status: 'failed',
    percent: 0,
    currentStep: 'Failed',
    error,
  });
}

/**
 * Get current connection stats
 */
export function getConnectionStats(): {
  totalConnections: number;
  activeSubscriptions: number;
  subscriptionsByInsight: Record<number, number>;
} {
  const stats: Record<number, number> = {};
  let totalSubs = 0;

  const entries = Array.from(subscriptions.entries());
  for (const [insightId, subs] of entries) {
    stats[insightId] = subs.size;
    totalSubs += subs.size;
  }

  return {
    totalConnections: wss?.clients.size || 0,
    activeSubscriptions: totalSubs,
    subscriptionsByInsight: stats,
  };
}

/**
 * Check if WebSocket server is running
 */
export function isWebSocketRunning(): boolean {
  return wss !== null;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return wss;
}
