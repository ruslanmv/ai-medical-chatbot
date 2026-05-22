/**
 * SqliteAdapter — stub for batches 4-5 of the DB migration.
 *
 * The real implementation lands in batch 4 and wraps the existing
 * better-sqlite3 code from lib/db.ts behind the async DbAdapter
 * interface. Until then this stub keeps the module graph type-correct
 * so the Next.js build passes; constructing it throws at runtime, but
 * nothing in the app calls getDbAdapter() yet — the legacy lib/db.ts
 * path is still authoritative.
 */

import type { DbAdapter } from './interface';

export class SqliteAdapter implements DbAdapter {
  constructor(_dbPath: string) {
    throw new Error(
      'SqliteAdapter is not implemented yet (batch 4 of the DB migration). ' +
        'The app currently uses lib/db.ts. ' +
        'See 9-HuggingFace-Global/docs/DEPLOYMENT_DB.md.',
    );
  }

  // Stub bodies — TS requires the interface surface to be present even
  // though the constructor above prevents any instance from existing.
  driver(): 'sqlite' { return 'sqlite'; }
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
