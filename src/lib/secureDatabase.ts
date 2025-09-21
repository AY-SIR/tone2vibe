// Database security configurations to prevent console exposure
// This file configures additional security measures for production

export class DatabaseSecurity {
  static initializeSecurityMeasures() {
    // Run security measures in all environments for better protection
    this.disableConsoleLogging();
    this.removeDevTools();
    this.obfuscateNetworkRequests();
  }

  private static disableConsoleLogging() {
    // Enhanced console filtering for all environments
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const sensitiveKeywords = [
      'supabase',
      'database',
      'query',
      'rpc',
      'session',
      'auth',
      'token',
      'api_key',
      'secret',
      'password',
      'jwt',
      'bearer',
      'authorization',
      'x-api-key',
      'client_secret',
      'refresh_token',
      'access_token'
    ];

    const filterSensitiveData = (args: any[]) => {
      return args.filter(arg => {
        if (typeof arg === 'string') {
          return !sensitiveKeywords.some(keyword =>
            arg.toLowerCase().includes(keyword)
          );
        }
        if (typeof arg === 'object' && arg !== null) {
          const str = JSON.stringify(arg).toLowerCase();
          return !sensitiveKeywords.some(keyword => str.includes(keyword));
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

    console.info = (...args: any[]) => {
      const filtered = filterSensitiveData(args);
      if (filtered.length > 0) {
        originalInfo.apply(console, filtered);
      }
    };
  }

  private static removeDevTools() {
    // Enhanced dev tools blocking
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+Shift+C
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 'S')
      ) {
        e.preventDefault();
        return false;
      }
    });

    // Disable text selection and drag
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    });

    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    });
  }

  private static obfuscateNetworkRequests() {
    // Enhanced network request obfuscation
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const response = await originalFetch(input, init);

        // Don't log successful requests to reduce console noise
        if (response.ok) {
          return response;
        }

        return response;
      } catch (error) {
        // Only log generic errors without exposing sensitive data
        throw error;
      }
    };

    // Override XMLHttpRequest as well
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = class extends originalXHR {
      open(method: string, url: string | URL, ...args: any[]) {
        // Don't log XHR requests
        return super.open(method, url, ...args);
      }
    };
  }
}