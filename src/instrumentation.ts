/**
 * Next.js Instrumentation
 * Runs once when the server starts
 */

export async function register() {
  // Only run on server-side (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[INSTRUMENTATION] Starting billboard workers...');

    try {
      const { startBillboardWorkers } = await import('./lib/workers/billboard-worker');
      startBillboardWorkers();
      console.log('[INSTRUMENTATION] Billboard workers started');
    } catch (error) {
      console.error('[INSTRUMENTATION] Failed to start billboard workers:', error);
    }
  }
}
