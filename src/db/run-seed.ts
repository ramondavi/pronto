import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const { seedAcademicPrograms } = await import("./seed");

await seedAcademicPrograms();
process.stdout.write("Academic programs seeded successfully.\n");
process.exit(0);
