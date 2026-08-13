/**
 * Diagnostic In-Memory Logger for DiaryNote
 * Captures structured logs in a circular memory buffer for diagnostics & export.
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  context?: Record<string, unknown>;
}

const MAX_LOG_ENTRIES = 200;
const logBuffer: LogEntry[] = [];

function appendLog(level: LogEntry['level'], category: string, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    context: sanitizeContext(context),
  };

  if (logBuffer.length >= MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }
  logBuffer.push(entry);

  if (process.env.NODE_ENV !== 'production' && level === 'error') {
    console.error(`[${category}] ${message}`, context);
  }
}

/**
 * Strips potential credentials, keys, or passwords from logged objects.
 */
function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('key') ||
      lowerKey.includes('pass') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('auth')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value) ? `Array(${value.length})` : '[Object]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const logger = {
  info: (category: string, message: string, context?: Record<string, unknown>) =>
    appendLog('info', category, message, context),
  warn: (category: string, message: string, context?: Record<string, unknown>) =>
    appendLog('warn', category, message, context),
  error: (category: string, message: string, context?: Record<string, unknown>) =>
    appendLog('error', category, message, context),
  debug: (category: string, message: string, context?: Record<string, unknown>) =>
    appendLog('debug', category, message, context),

  getRecentLogs: (): LogEntry[] => [...logBuffer],

  exportDiagnostics: (): string => {
    const diagnostics = {
      app: 'DiaryNote',
      generatedAt: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown',
      logsCount: logBuffer.length,
      logs: logBuffer,
    };
    return JSON.stringify(diagnostics, null, 2);
  },

  clearLogs: () => {
    logBuffer.length = 0;
  },
};
