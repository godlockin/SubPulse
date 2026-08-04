import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Subscription } from '../src/types/subscription';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'sub_manager.db');
const db = new Database(dbPath);

// Initialize SQLite Schema keyed by device_id
db.exec(`
  CREATE TABLE IF NOT EXISTS device_subscriptions (
    device_id TEXT NOT NULL,
    id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    lastUpdated INTEGER,
    nodeCount INTEGER DEFAULT 0,
    autoUpdateHours INTEGER DEFAULT 6,
    error TEXT,
    PRIMARY KEY (device_id, id)
  );
`);

export function getSubscriptionsFromSqlite(deviceId: string = 'default'): Subscription[] {
  const rows = db
    .prepare('SELECT * FROM device_subscriptions WHERE device_id = ?')
    .all(deviceId) as any[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url,
    enabled: Boolean(r.enabled),
    lastUpdated: r.lastUpdated ? Number(r.lastUpdated) : null,
    nodeCount: Number(r.nodeCount || 0),
    autoUpdateHours: Number(r.autoUpdateHours || 6),
    error: r.error || null
  }));
}

export function saveSubscriptionsToSqlite(deviceId: string = 'default', subs: Subscription[]): void {
  const insertStmt = db.prepare(`
    INSERT INTO device_subscriptions (device_id, id, name, url, enabled, lastUpdated, nodeCount, autoUpdateHours, error)
    VALUES (@deviceId, @id, @name, @url, @enabled, @lastUpdated, @nodeCount, @autoUpdateHours, @error)
    ON CONFLICT(device_id, id) DO UPDATE SET
      name=excluded.name,
      url=excluded.url,
      enabled=excluded.enabled,
      lastUpdated=excluded.lastUpdated,
      nodeCount=excluded.nodeCount,
      autoUpdateHours=excluded.autoUpdateHours,
      error=excluded.error;
  `);

  const deleteMissingStmt = db.prepare(
    `DELETE FROM device_subscriptions WHERE device_id = ? AND id NOT IN (${subs.map(() => '?').join(',') || "''"})`
  );

  const transaction = db.transaction((items: Subscription[]) => {
    if (items.length > 0) {
      deleteMissingStmt.run(deviceId, ...items.map((i) => i.id));
    } else {
      db.prepare('DELETE FROM device_subscriptions WHERE device_id = ?').run(deviceId);
    }

    for (const item of items) {
      insertStmt.run({
        deviceId,
        id: item.id,
        name: item.name,
        url: item.url,
        enabled: item.enabled ? 1 : 0,
        lastUpdated: item.lastUpdated || null,
        nodeCount: item.nodeCount || 0,
        autoUpdateHours: item.autoUpdateHours || 6,
        error: item.error || null
      });
    }
  });

  transaction(subs);
}

export function deleteSubscriptionFromSqlite(deviceId: string = 'default', id: string): void {
  db.prepare('DELETE FROM device_subscriptions WHERE device_id = ? AND id = ?').run(deviceId, id);
}
