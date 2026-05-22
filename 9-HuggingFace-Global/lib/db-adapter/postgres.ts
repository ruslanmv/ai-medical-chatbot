/**
 * PostgresAdapter — stub for batch 5 of the DB migration.
 *
 * The real implementation uses `pg` (added to package.json in batch 6)
 * and wires up the schema_migrations bookkeeping table. Until then this
 * stub keeps the module graph type-correct so the Next.js build passes;
 * constructing it throws at runtime, but nothing in the app calls
 * getDbAdapter() yet — the legacy lib/db.ts path is still authoritative.
 */

import type { DbAdapter } from './interface';

export class PostgresAdapter implements DbAdapter {
  constructor(_databaseUrl: string) {
    throw new Error(
      'PostgresAdapter is not implemented yet (batch 5 of the DB migration). ' +
        'See 9-HuggingFace-Global/docs/DEPLOYMENT_DB.md.',
    );
  }

  driver(): 'postgres' { return 'postgres'; }
  migrate(): Promise<void> { throw new Error('not implemented'); }
  seedAdmin(): Promise<void> { throw new Error('not implemented'); }
  close(): Promise<void> { throw new Error('not implemented'); }

  findUserByEmail(): Promise<any> { throw new Error('not implemented'); }
  findUserById(): Promise<any> { throw new Error('not implemented'); }
  findUserPublicById(): Promise<any> { throw new Error('not implemented'); }
  insertUser(): Promise<void> { throw new Error('not implemented'); }
  updateUserPassword(): Promise<void> { throw new Error('not implemented'); }
  setVerificationCode(): Promise<void> { throw new Error('not implemented'); }
  markEmailVerified(): Promise<void> { throw new Error('not implemented'); }
  setResetToken(): Promise<void> { throw new Error('not implemented'); }
  setLastLogin(): Promise<void> { throw new Error('not implemented'); }
  deleteUser(): Promise<void> { throw new Error('not implemented'); }

  insertSession(): Promise<void> { throw new Error('not implemented'); }
  findSessionWithUser(): Promise<any> { throw new Error('not implemented'); }
  deleteSession(): Promise<void> { throw new Error('not implemented'); }
  deleteSessionsForUser(): Promise<void> { throw new Error('not implemented'); }
  pruneExpiredSessions(): Promise<void> { throw new Error('not implemented'); }

  insertAuditLog(): Promise<void> { throw new Error('not implemented'); }
  listAuditForUser(): Promise<any[]> { throw new Error('not implemented'); }

  insertHealthData(): Promise<void> { throw new Error('not implemented'); }
  listHealthDataForUser(): Promise<any[]> { throw new Error('not implemented'); }
  deleteHealthData(): Promise<void> { throw new Error('not implemented'); }

  insertChatHistory(): Promise<void> { throw new Error('not implemented'); }
  listChatHistoryForUser(): Promise<any[]> { throw new Error('not implemented'); }
  getChatHistory(): Promise<any> { throw new Error('not implemented'); }
  deleteChatHistory(): Promise<void> { throw new Error('not implemented'); }

  getUserSettings(): Promise<any> { throw new Error('not implemented'); }
  upsertUserSettings(): Promise<void> { throw new Error('not implemented'); }

  insertScanLog(): Promise<void> { throw new Error('not implemented'); }

  listUsers(): Promise<any[]> { throw new Error('not implemented'); }
  countUsers(): Promise<number> { throw new Error('not implemented'); }
  setUserActive(): Promise<void> { throw new Error('not implemented'); }
  setUserAdmin(): Promise<void> { throw new Error('not implemented'); }
}
