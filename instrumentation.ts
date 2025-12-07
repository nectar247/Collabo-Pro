// Polyfill self for server-side
if (typeof self === 'undefined') {
  (global as any).self = global;
}

export async function register() {
  // This runs before any server code
}
