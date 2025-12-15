/**
 * Debug Logger Service
 * Stores logs in memory for real-time debugging of extraction and generation pipeline
 */

export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'extraction' | 'generation' | 'api' | 'llm' | 'audio' | 'general';
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
}

// In-memory log storage (circular buffer)
const MAX_LOGS = 500;
const logs: DebugLogEntry[] = [];
let logIdCounter = 0;

/**
 * Add a log entry
 */
export function debugLog(
  level: DebugLogEntry['level'],
  category: DebugLogEntry['category'],
  message: string,
  data?: Record<string, unknown>
): void {
  const entry: DebugLogEntry = {
    id: `log-${++logIdCounter}`,
    timestamp: new Date(),
    level,
    category,
    message,
    data
  };

  logs.push(entry);

  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift();
  }

  // Also log to console for server-side visibility
  const prefix = `[${category.toUpperCase()}]`;
  const dataStr = data ? ` ${JSON.stringify(data)}` : '';
  
  switch (level) {
    case 'error':
      console.error(`${prefix} ${message}${dataStr}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${message}${dataStr}`);
      break;
    case 'debug':
      console.debug(`${prefix} ${message}${dataStr}`);
      break;
    default:
      console.log(`${prefix} ${message}${dataStr}`);
  }
}

/**
 * Get all logs (newest first)
 */
export function getDebugLogs(
  options?: {
    category?: DebugLogEntry['category'];
    level?: DebugLogEntry['level'];
    limit?: number;
    since?: Date;
  }
): DebugLogEntry[] {
  let filtered = [...logs].reverse();

  if (options?.category) {
    filtered = filtered.filter(l => l.category === options.category);
  }

  if (options?.level) {
    filtered = filtered.filter(l => l.level === options.level);
  }

  if (options?.since) {
    const sinceDate = options.since;
    filtered = filtered.filter(l => l.timestamp >= sinceDate);
  }

  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Clear all logs
 */
export function clearDebugLogs(): void {
  logs.length = 0;
  logIdCounter = 0;
}

/**
 * Helper to time an async operation and log it
 */
export async function timedOperation<T>(
  category: DebugLogEntry['category'],
  operationName: string,
  operation: () => Promise<T>,
  additionalData?: Record<string, unknown>
): Promise<T> {
  const startTime = Date.now();
  debugLog('info', category, `Starting: ${operationName}`, additionalData);

  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    debugLog('info', category, `Completed: ${operationName}`, { 
      ...additionalData, 
      duration: `${duration}ms` 
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    debugLog('error', category, `Failed: ${operationName}`, {
      ...additionalData,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Convenience functions
export const logExtraction = (message: string, data?: Record<string, unknown>) => 
  debugLog('info', 'extraction', message, data);

export const logGeneration = (message: string, data?: Record<string, unknown>) => 
  debugLog('info', 'generation', message, data);

export const logLLM = (message: string, data?: Record<string, unknown>) => 
  debugLog('info', 'llm', message, data);

export const logAPI = (message: string, data?: Record<string, unknown>) => 
  debugLog('info', 'api', message, data);

export const logError = (category: DebugLogEntry['category'], message: string, data?: Record<string, unknown>) => 
  debugLog('error', category, message, data);
