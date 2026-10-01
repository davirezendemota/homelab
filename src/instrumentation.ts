export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("./lib/prefs");
    const { initProjectsDb } = await import("./lib/projects");
    const { startMetricsCache } = await import("./lib/metrics-cache");
    initDb();
    initProjectsDb();
    await startMetricsCache();
  }
}
