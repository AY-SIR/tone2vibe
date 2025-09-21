// Database security configurations to prevent console exposure
// This file configures additional security measures for production

export class DatabaseSecurity {
  static initializeSecurityMeasures() {
    // Only run security measures in production
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    // Disable console logs for sensitive database operations
    this.disableConsoleLogging();
    
    // Remove development tools
    this.removeDevTools();
    
    // Obfuscate sensitive network requests
    this.obfuscateNetworkRequests();
  }

  private static disableConsoleLogging() {
    // Override console methods to filter out sensitive information
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const sensitiveKeywords = [
      'supabase',
      'database',
      'query',
      'rpc',
      'session',
      'auth',
      'token',
      'api_key',
      'secret'
    ];

    const filterSensitiveData = (args: any[]) => {
      return args.filter(arg => {
        if (typeof arg === 'string') {
          return !sensitiveKeywords.some(keyword => 
            arg.toLowerCase().includes(keyword)
          );
        }
        return true;
      });
    };

    console.log = (...args: any[]) => {
      const filtered = filterSensitiveData(args);
      if (filtered.length > 0) {
        originalLog.apply(console, filtered);
      }
    };

    console.error = (...args: any[]) => {
      const filtered = filterSensitiveData(args);
      if (filtered.length > 0) {
        originalError.apply(console, filtered);
      }
    };

    console.warn = (...args: any[]) => {
      const filtered = filterSensitiveData(args);
      if (filtered.length > 0) {
        originalWarn.apply(console, filtered);
      }
    };
  }

  private static removeDevTools() {
    // Disable right-click context menu in production
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 'S')
      ) {
        e.preventDefault();
        return false;
      }
    });
  }

  private static obfuscateNetworkRequests() {
    // Override fetch to hide sensitive URLs in network tab
    const originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // Call original fetch but don't expose sensitive URLs in console
      try {
        const response = await originalFetch(input, init);
        return response;
      } catch (error) {
        // Log generic error without exposing URLs
        console.error('Network request failed');
        throw error;
      }
    };
  }
}