/**
 * CART DEBUG UTILITY
 * Comprehensive logging and performance tracking for cart operations
 * 
 * This utility helps diagnose:
 * - State mutation issues
 * - API request/response cycles
 * - Performance bottlenecks
 * - Race conditions
 * - UI freezing causes
 */

interface DebugLog {
  timestamp: number;
  category: 'USER_ACTION' | 'STATE_CHANGE' | 'API_REQUEST' | 'API_RESPONSE' | 'ERROR' | 'PERFORMANCE';
  message: string;
  data?: any;
  duration?: number;
}

class CartDebugger {
  private logs: DebugLog[] = [];
  private pendingRequests: Map<string, number> = new Map();
  private stateSnapshots: any[] = [];
  private performanceMarks: Map<string, number> = new Map();
  
  // Enable/disable debug mode
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      // Expose to window for easy console access
      (window as any).__cartDebugger = this;
      console.log('🔍 Cart Debugger initialized. Access via window.__cartDebugger');
    }
  }

  /**
   * Log user interactions (button clicks, form submissions)
   */
  logUserAction(action: string, details?: any) {
    if (!this.enabled) return;
    
    const log: DebugLog = {
      timestamp: Date.now(),
      category: 'USER_ACTION',
      message: `👆 USER ACTION: ${action}`,
      data: details
    };
    
    this.logs.push(log);
    console.log(log.message, log.data || '');
  }

  /**
   * Track state changes with before/after snapshots
   */
  logStateChange(description: string, newState: any, previousState?: any) {
    if (!this.enabled) return;
    
    const log: DebugLog = {
      timestamp: Date.now(),
      category: 'STATE_CHANGE',
      message: `🔄 STATE CHANGE: ${description}`,
      data: { newState, previousState }
    };
    
    this.logs.push(log);
    this.stateSnapshots.push({ timestamp: Date.now(), state: newState });
    
    console.log(log.message, {
      previous: previousState,
      current: newState
    });
  }

  /**
   * Track API request initiation
   */
  logAPIRequest(endpoint: string, method: string, payload?: any) {
    if (!this.enabled) return;
    
    const requestId = `${method}:${endpoint}:${Date.now()}`;
    this.pendingRequests.set(requestId, Date.now());
    
    const log: DebugLog = {
      timestamp: Date.now(),
      category: 'API_REQUEST',
      message: `📤 API REQUEST: ${method} ${endpoint}`,
      data: { requestId, payload }
    };
    
    this.logs.push(log);
    console.log(log.message, { requestId, payload });
    
    return requestId;
  }

  /**
   * Track API response completion
   */
  logAPIResponse(requestId: string, success: boolean, response?: any, error?: any) {
    if (!this.enabled) return;
    
    const startTime = this.pendingRequests.get(requestId);
    const duration = startTime ? Date.now() - startTime : 0;
    this.pendingRequests.delete(requestId);
    
    const log: DebugLog = {
      timestamp: Date.now(),
      category: 'API_RESPONSE',
      message: `📥 API RESPONSE: ${success ? '✅ Success' : '❌ Failed'} (${duration}ms)`,
      data: { requestId, response, error },
      duration
    };
    
    this.logs.push(log);
    
    if (success) {
      console.log(log.message, { requestId, duration, response });
    } else {
      console.error(log.message, { requestId, duration, error });
    }

    // Warn about slow requests
    if (duration > 2000) {
      console.warn(`⚠️ SLOW REQUEST: Request took ${duration}ms, which may cause UI freezing`);
    }
  }

  /**
   * Log errors with context
   */
  logError(error: any, context: string, additionalData?: any) {
    if (!this.enabled) return;
    
    const log: DebugLog = {
      timestamp: Date.now(),
      category: 'ERROR',
      message: `❌ ERROR in ${context}`,
      data: { error, additionalData }
    };
    
    this.logs.push(log);
    console.error(log.message, {
      error: error?.message || error,
      stack: error?.stack,
      context,
      additionalData
    });
  }

  /**
   * Track performance metrics
   */
  startPerformanceTrace(label: string) {
    if (!this.enabled) return;
    
    this.performanceMarks.set(label, Date.now());
    console.time(`⏱️ ${label}`);
  }

  endPerformanceTrace(label: string, warnThreshold: number = 100) {
    if (!this.enabled) return;
    
    const startTime = this.performanceMarks.get(label);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    this.performanceMarks.delete(label);
    
    const log: DebugLog = {
      timestamp: Date.now(),
      category: 'PERFORMANCE',
      message: `⏱️ PERFORMANCE: ${label}`,
      duration
    };
    
    this.logs.push(log);
    console.timeEnd(`⏱️ ${label}`);
    
    // Warn if operation took too long
    if (duration > warnThreshold) {
      console.warn(`⚠️ SLOW OPERATION: "${label}" took ${duration}ms (threshold: ${warnThreshold}ms)`);
      console.warn('This may cause UI freezing. Consider optimizing or debouncing this operation.');
    }
  }

  /**
   * Get all pending API requests (helps identify stuck requests)
   */
  getPendingRequests() {
    const pending = Array.from(this.pendingRequests.entries()).map(([id, startTime]) => ({
      requestId: id,
      duration: Date.now() - startTime,
      isStuck: Date.now() - startTime > 5000
    }));
    
    console.table(pending);
    return pending;
  }

  /**
   * Export logs for analysis
   */
  exportLogs() {
    const report = {
      logs: this.logs,
      pendingRequests: Array.from(this.pendingRequests.entries()),
      stateHistory: this.stateSnapshots,
      summary: {
        totalLogs: this.logs.length,
        errors: this.logs.filter(l => l.category === 'ERROR').length,
        apiRequests: this.logs.filter(l => l.category === 'API_REQUEST').length,
        slowOperations: this.logs.filter(l => l.duration && l.duration > 1000).length
      }
    };
    
    console.log('📊 Debug Report:', report);
    return report;
  }

  /**
   * Get recent logs (last N entries)
   */
  getRecentLogs(count: number = 20) {
    const recent = this.logs.slice(-count);
    console.table(recent.map(l => ({
      time: new Date(l.timestamp).toLocaleTimeString(),
      category: l.category,
      message: l.message,
      duration: l.duration ? `${l.duration}ms` : '-'
    })));
    return recent;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    this.stateSnapshots = [];
    this.performanceMarks.clear();
    this.pendingRequests.clear();
    console.log('🧹 Debug logs cleared');
  }

  /**
   * Detect potential issues
   */
  detectIssues() {
    const issues: string[] = [];
    
    // Check for stuck API requests
    const stuckRequests = Array.from(this.pendingRequests.entries())
      .filter(([_, startTime]) => Date.now() - startTime > 5000);
    
    if (stuckRequests.length > 0) {
      issues.push(`⚠️ ${stuckRequests.length} stuck API request(s) detected`);
    }

    // Check for rapid state changes (potential thrashing)
    const recentStateChanges = this.logs
      .filter(l => l.category === 'STATE_CHANGE' && Date.now() - l.timestamp < 1000)
      .length;
    
    if (recentStateChanges > 5) {
      issues.push(`⚠️ Rapid state changes detected (${recentStateChanges} in last second) - possible thrashing`);
    }

    // Check for errors
    const recentErrors = this.logs
      .filter(l => l.category === 'ERROR' && Date.now() - l.timestamp < 5000)
      .length;
    
    if (recentErrors > 0) {
      issues.push(`❌ ${recentErrors} error(s) in last 5 seconds`);
    }

    // Check for slow operations
    const slowOps = this.logs
      .filter(l => l.duration && l.duration > 1000 && Date.now() - l.timestamp < 10000)
      .length;
    
    if (slowOps > 0) {
      issues.push(`🐌 ${slowOps} slow operation(s) detected (>1s)`);
    }

    if (issues.length > 0) {
      console.warn('🚨 POTENTIAL ISSUES DETECTED:', issues);
    } else {
      console.log('✅ No issues detected');
    }

    return issues;
  }

  /**
   * Enable/disable debugging
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`🔍 Cart debugging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
export const cartDebugger = new CartDebugger();

// Helper functions for common debug scenarios
export const debugHelpers = {
  /**
   * Wrap an async function with automatic logging
   */
  wrapAsync: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    label: string
  ): T => {
    return (async (...args: any[]) => {
      cartDebugger.startPerformanceTrace(label);
      try {
        const result = await fn(...args);
        cartDebugger.endPerformanceTrace(label);
        return result;
      } catch (error) {
        cartDebugger.logError(error, label, { args });
        cartDebugger.endPerformanceTrace(label);
        throw error;
      }
    }) as T;
  },

  /**
   * Detect if multiple rapid calls are happening (debounce warning)
   */
  createRapidCallDetector: (label: string, threshold: number = 500) => {
    let lastCall = 0;
    let rapidCallCount = 0;

    return () => {
      const now = Date.now();
      if (now - lastCall < threshold) {
        rapidCallCount++;
        if (rapidCallCount >= 3) {
          console.warn(
            `⚠️ RAPID CALLS DETECTED: "${label}" called ${rapidCallCount} times within ${threshold}ms. Consider debouncing!`
          );
        }
      } else {
        rapidCallCount = 0;
      }
      lastCall = now;
    };
  }
};
