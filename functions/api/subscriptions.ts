// Cloudflare Pages Function for Device-Keyed KV / D1 Storage
export interface Env {
  SUB_MANAGER_KV: KVNamespace;
  DB?: D1Database; // Cloudflare D1 Database binding (optional)
}

function getDeviceIdFromRequest(request: Request): string {
  const url = new URL(request.url);
  const queryDeviceId = url.searchParams.get('deviceId');
  if (queryDeviceId) return queryDeviceId;

  const headerDeviceId = request.headers.get('X-Device-Id');
  if (headerDeviceId) return headerDeviceId;

  return 'device_default';
}

function isSampleSubscription(sub: any): boolean {
  if (!sub) return false;
  const id = String(sub.id || '').toLowerCase();
  const name = String(sub.name || '').toLowerCase();
  const url = String(sub.url || '').toLowerCase();
  return (
    id === 'sub_demo_1' ||
    id.startsWith('sub_demo_') ||
    name.includes('示例订阅') ||
    name.includes('demo sub') ||
    url.includes('free-vpn-subscriptions')
  );
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const deviceId = getDeviceIdFromRequest(context.request);
    const kv = context.env.SUB_MANAGER_KV;

    // Optional D1 Database support
    if (context.env.DB) {
      const { results } = await context.env.DB
        .prepare('SELECT id, name, url, enabled, lastUpdated, nodeCount, autoUpdateHours, error FROM device_subscriptions WHERE device_id = ?')
        .bind(deviceId)
        .all();
      const cleaned = (results || []).filter((s: any) => !isSampleSubscription(s));
      return new Response(JSON.stringify(cleaned), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!kv) {
      return new Response(JSON.stringify({ error: 'SUB_MANAGER_KV binding not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const key = `sub_${deviceId}`;
    const data = await kv.get(key, { type: 'json' });
    const cleaned = (Array.isArray(data) ? data : []).filter((s: any) => !isSampleSubscription(s));
    return new Response(JSON.stringify(cleaned), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const deviceId = getDeviceIdFromRequest(context.request);
    const kv = context.env.SUB_MANAGER_KV;
    const subs = await context.request.json();

    // 订阅信息数组需要判断是否为空数组，如果是空数组则不上传/保存到 cf 存储里
    if (!Array.isArray(subs) || subs.length === 0) {
      return new Response(JSON.stringify({ success: false, skipped: 'Empty subscriptions array rejected' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const cleanSubs = subs.filter((s: any) => !isSampleSubscription(s));
    if (cleanSubs.length === 0) {
      return new Response(JSON.stringify({ success: false, skipped: 'Empty or sample-only subscriptions rejected' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Optional D1 Database support
    if (context.env.DB) {
      await context.env.DB.exec(`
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

      // Delete old and insert new for device
      await context.env.DB.prepare('DELETE FROM device_subscriptions WHERE device_id = ?').bind(deviceId).run();
      for (const item of cleanSubs) {
        await context.env.DB.prepare(`
          INSERT INTO device_subscriptions (device_id, id, name, url, enabled, lastUpdated, nodeCount, autoUpdateHours, error)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          deviceId, item.id, item.name, item.url, item.enabled ? 1 : 0,
          item.lastUpdated || null, item.nodeCount || 0, item.autoUpdateHours || 6, item.error || null
        ).run();
      }

      return new Response(JSON.stringify({ success: true, count: cleanSubs.length }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!kv) {
      return new Response(JSON.stringify({ error: 'SUB_MANAGER_KV binding not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const key = `sub_${deviceId}`;
    await kv.put(key, JSON.stringify(cleanSubs));

    return new Response(JSON.stringify({ success: true, deviceId, count: cleanSubs.length }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Device-Id'
    }
  });
};
