import { loadEnv } from "./_env";

async function main() {
  loadEnv();
  const { migrateStandalone } = await import("../src/lib/db");
  migrateStandalone();
  console.log("Migrations appliquées.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
