export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateStandalone } = await import("./lib/db");
    migrateStandalone();
    const { startWorker } = await import("./lib/jobs");
    startWorker();
  }
}
