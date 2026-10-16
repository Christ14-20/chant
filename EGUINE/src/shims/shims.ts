if (typeof globalThis.process === 'undefined') {
  (globalThis as any).process = {
    env: {
      NODE_ENV: 'production',
    },
  };
}
