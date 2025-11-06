// Secure console: disable logs in non-local environments to prevent leaking sensitive data
(function () {
  if (typeof window === 'undefined') return;
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal) return;

  const noop = () => {};
  const methods: (keyof Console)[] = [
    'log', 'info', 'debug', 'warn', 'error', 'trace', 'table', 'time', 'timeEnd',
  ];

  try {
    methods.forEach((m) => {
      try { (console as any)[m] = noop; } catch {}
    });
    // Harden access
    (window as any).console = new Proxy(console, {
      get(target, prop) {
        if (methods.includes(prop as any)) return noop;
        // @ts-ignore
        return target[prop];
      },
    });
  } catch {}
})();
