import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

// A plain node-postgres Pool emits an unhandled "error" when the server
// closes an idle connection (which the local `prisma dev` Postgres does
// periodically) - without a listener that crashes/poisons the pool for all
// subsequent requests. Reuse a single pool across dev hot-reloads and log
// instead of crashing so the pool keeps opening fresh connections.
const pool =
  globalForPrisma.pgPool ??
  new Pool({ connectionString: process.env.DATABASE_URL });

pool.on("error", (err) => {
  console.error("Postgres pool idle client error (recovering):", err.message);
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
