import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export const HAS_DB = !!process.env.POSTGRES_URL;

// Returns a no-op tagged template when DB is not configured (build-time safety).
// All callers that touch real data guard with HAS_DB first.
function noopSql(): NeonQueryFunction<false, false> {
  const fn = async () => [] as unknown[];
  return fn as unknown as NeonQueryFunction<false, false>;
}

export const sql: NeonQueryFunction<false, false> = HAS_DB
  ? neon(process.env.POSTGRES_URL!)
  : noopSql();
