import fs from 'fs';
import path from 'path';

const ERROR_LOG_PATH = '/tmp/insight-atlas-errors.json';

export interface ErrorLogEntry {
  timestamp: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  requestPath?: string;
  requestInput?: any;
  userId?: number;
  insightId?: number;
  bookId?: number;
  additionalInfo?: Record<string, any>;
}

export function logError(entry: ErrorLogEntry) {
  try {
    const logEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };

    // Read existing logs
    let logs: ErrorLogEntry[] = [];
    if (fs.existsSync(ERROR_LOG_PATH)) {
      const content = fs.readFileSync(ERROR_LOG_PATH, 'utf-8');
      try {
        logs = JSON.parse(content);
      } catch (e) {
        // If parse fails, start fresh
        logs = [];
      }
    }

    // Add new log
    logs.push(logEntry);

    // Keep only last 100 errors
    if (logs.length > 100) {
      logs = logs.slice(-100);
    }

    // Write back
    fs.writeFileSync(ERROR_LOG_PATH, JSON.stringify(logs, null, 2));

    // Also console log for immediate visibility
    console.error('[ERROR LOGGER]', JSON.stringify(logEntry, null, 2));
  } catch (e) {
    console.error('[ERROR LOGGER] Failed to log error:', e);
  }
}

export function getErrorLogs(): ErrorLogEntry[] {
  try {
    if (fs.existsSync(ERROR_LOG_PATH)) {
      const content = fs.readFileSync(ERROR_LOG_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[ERROR LOGGER] Failed to read error logs:', e);
  }
  return [];
}

export function clearErrorLogs() {
  try {
    if (fs.existsSync(ERROR_LOG_PATH)) {
      fs.unlinkSync(ERROR_LOG_PATH);
    }
  } catch (e) {
    console.error('[ERROR LOGGER] Failed to clear error logs:', e);
  }
}
