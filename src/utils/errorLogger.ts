/**
 * Production-safe error logging utility
 * Only logs errors in development mode
 * In production, errors should be sent to a logging service
 */

type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorLogEntry {
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: string;
  stack?: string;
}

class ErrorLogger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Log an error with context
   */
  logError(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
    severity: ErrorSeverity = 'error'
  ): void {
    const logEntry: ErrorLogEntry = {
      message,
      severity,
      context,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    };

    if (this.isDevelopment) {
      // In development, log to console with appropriate styling
      const style = this.getConsoleStyle(severity);
      console.error(`[${severity.toUpperCase()}] ${message}`, {
        ...logEntry,
        error,
      });
    } else {
      // In production, you would send to a logging service
      // Example: Sentry, LogRocket, CloudWatch, etc.
      // this.sendToLoggingService(logEntry);
    }
  }

  /**
   * Log informational messages (development only)
   */
  logInfo(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, context);
    }
  }

  /**
   * Log warnings (development only)
   */
  logWarning(message: string, context?: Record<string, unknown>): void {
    if (this.isDevelopment) {
      console.warn(`[WARNING] ${message}`, context);
    }
  }

  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      info: 'color: #3b82f6',
      warning: 'color: #f59e0b',
      error: 'color: #ef4444',
      critical: 'color: #dc2626; font-weight: bold',
    };
    return styles[severity];
  }

  // Placeholder for production logging service integration
  // private sendToLoggingService(entry: ErrorLogEntry): void {
  //   // Implementation would send to your logging service
  // }
}

export const errorLogger = new ErrorLogger();

/**
 * Helper to safely extract error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Helper to check if error is a specific type
 */
export function isSupabaseError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}
