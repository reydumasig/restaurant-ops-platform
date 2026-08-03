import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false — required when connecting through Supabase's transaction-mode
// pooler (port 6543); PgBouncer routes each statement to a different backend
// connection, so session-scoped prepared statements aren't safe to rely on.
const queryClient = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(queryClient, { schema });
