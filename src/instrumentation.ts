export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("./lib/prefs");
    const { startMetricsCache } = await import("./lib/metrics-cache");
    initDb();
    await startMetricsCache();
  }
}
