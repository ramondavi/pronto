import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");

const queryClient = postgres(databaseUrl, { prepare: false });

export const db = drizzle(queryClient, { schema });
