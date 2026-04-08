/**
 * Custom NextAuth v4 adapter using @neondatabase/serverless.
 * Implements the full Adapter interface against the schema in scripts/init-db.js.
 */
import { sql } from './postgres';
import type { Adapter, AdapterUser, AdapterSession, VerificationToken } from 'next-auth/adapters';
import type { Account } from 'next-auth';

function mapUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: String(row.id),
    name: (row.name as string) ?? null,
    email: row.email as string,
    emailVerified: row.emailVerified ? new Date(row.emailVerified as string) : null,
    image: (row.image as string) ?? null,
  };
}

export function PgAdapter(): Adapter {
  return {
    // ── Users ──────────────────────────────────────────────────────────────

    async createUser(user: Omit<AdapterUser, 'id'>) {
      const rows = await sql`
        INSERT INTO users (name, email, "emailVerified", image)
        VALUES (${user.name ?? null}, ${user.email}, ${user.emailVerified?.toISOString() ?? null}, ${user.image ?? null})
        RETURNING *
      `;
      return mapUser(rows[0]);
    },

    async getUser(id: string) {
      const rows = await sql`SELECT * FROM users WHERE id = ${parseInt(id)}`;
      return rows[0] ? mapUser(rows[0]) : null;
    },

    async getUserByEmail(email: string) {
      const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
      return rows[0] ? mapUser(rows[0]) : null;
    },

    async getUserByAccount({ providerAccountId, provider }: Pick<Account, 'provider' | 'providerAccountId'>) {
      const rows = await sql`
        SELECT u.* FROM users u
        JOIN accounts a ON a."userId" = u.id
        WHERE a.provider = ${provider} AND a."providerAccountId" = ${providerAccountId}
      `;
      return rows[0] ? mapUser(rows[0]) : null;
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>) {
      const rows = await sql`
        UPDATE users SET
          name = ${user.name ?? null},
          email = ${user.email!},
          "emailVerified" = ${user.emailVerified?.toISOString() ?? null},
          image = ${user.image ?? null}
        WHERE id = ${parseInt(user.id)}
        RETURNING *
      `;
      return mapUser(rows[0]);
    },

    async deleteUser(userId: string) {
      await sql`DELETE FROM users WHERE id = ${parseInt(userId)}`;
    },

    // ── Accounts ───────────────────────────────────────────────────────────

    async linkAccount(account: Account & { userId: string }) {
      await sql`
        INSERT INTO accounts (
          "userId", type, provider, "providerAccountId",
          refresh_token, access_token, expires_at,
          token_type, scope, id_token, session_state
        ) VALUES (
          ${parseInt(account.userId)},
          ${account.type},
          ${account.provider},
          ${account.providerAccountId},
          ${account.refresh_token ?? null},
          ${account.access_token ?? null},
          ${account.expires_at ?? null},
          ${account.token_type ?? null},
          ${account.scope ?? null},
          ${account.id_token ?? null},
          ${account.session_state ?? null}
        )
      `;
      return account;
    },

    async unlinkAccount({ providerAccountId, provider }: Pick<Account, 'provider' | 'providerAccountId'>) {
      await sql`
        DELETE FROM accounts
        WHERE provider = ${provider} AND "providerAccountId" = ${providerAccountId}
      `;
    },

    // ── Sessions ───────────────────────────────────────────────────────────

    async createSession(session: { sessionToken: string; userId: string; expires: Date }) {
      const rows = await sql`
        INSERT INTO sessions ("userId", expires, "sessionToken")
        VALUES (${parseInt(session.userId)}, ${session.expires.toISOString()}, ${session.sessionToken})
        RETURNING *
      `;
      return {
        sessionToken: rows[0].sessionToken as string,
        userId: String(rows[0].userId),
        expires: new Date(rows[0].expires as string),
      };
    },

    async getSessionAndUser(sessionToken: string) {
      const sRows = await sql`
        SELECT * FROM sessions WHERE "sessionToken" = ${sessionToken} AND expires > NOW()
      `;
      if (!sRows[0]) return null;
      const uRows = await sql`SELECT * FROM users WHERE id = ${sRows[0].userId as number}`;
      if (!uRows[0]) return null;

      const session: AdapterSession = {
        sessionToken: sRows[0].sessionToken as string,
        userId: String(sRows[0].userId),
        expires: new Date(sRows[0].expires as string),
      };
      return { session, user: mapUser(uRows[0]) };
    },

    async updateSession(session: Partial<AdapterSession> & Pick<AdapterSession, 'sessionToken'>) {
      const rows = await sql`
        UPDATE sessions SET expires = ${session.expires!.toISOString()}
        WHERE "sessionToken" = ${session.sessionToken}
        RETURNING *
      `;
      if (!rows[0]) return null;
      return {
        sessionToken: rows[0].sessionToken as string,
        userId: String(rows[0].userId),
        expires: new Date(rows[0].expires as string),
      };
    },

    async deleteSession(sessionToken: string) {
      await sql`DELETE FROM sessions WHERE "sessionToken" = ${sessionToken}`;
    },

    // ── Verification tokens ────────────────────────────────────────────────

    async createVerificationToken(token: VerificationToken) {
      const rows = await sql`
        INSERT INTO verification_token (identifier, token, expires)
        VALUES (${token.identifier}, ${token.token}, ${token.expires.toISOString()})
        RETURNING *
      `;
      return {
        identifier: rows[0].identifier as string,
        token: rows[0].token as string,
        expires: new Date(rows[0].expires as string),
      } as VerificationToken;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }) {
      const rows = await sql`
        DELETE FROM verification_token
        WHERE identifier = ${identifier} AND token = ${token}
        RETURNING *
      `;
      if (!rows[0]) return null;
      return {
        identifier: rows[0].identifier as string,
        token: rows[0].token as string,
        expires: new Date(rows[0].expires as string),
      } as VerificationToken;
    },
  };
}
