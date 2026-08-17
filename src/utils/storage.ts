import { Subscription, VPNNode, DeduplicatedNode } from '../types/subscription';
import { getDeviceId } from './deviceId';

const SUBS_KEY = 'sub_manager_subscriptions_v1';
const TEST_CACHE_KEY = 'sub_manager_latency_cache_v1';

// Initial default subscriptions if empty
const DEFAULT_SUBS: Subscription[] = [];

export function isSampleSubscription(sub: Partial<Subscription>): boolean {
  if (!sub) return false;
  const id = (sub.id || '').toLowerCase();
  const name = (sub.name || '').toLowerCase();
  const url = (sub.url || '').toLowerCase();
  return (
    id === 'sub_demo_1' ||
    id.startsWith('sub_demo_') ||
    name.includes('示例订阅') ||
    name.includes('demo sub') ||
    url.includes('free-vpn-subscriptions')
  );
}

export function filterNonSampleSubscriptions(subs: Subscription[]): Subscription[] {
  if (!Array.isArray(subs)) return [];
  return subs.filter((s) => !isSampleSubscription(s));
}

export function getStoredSubscriptions(): Subscription[] {
  try {
    const raw = localStorage.getItem(SUBS_KEY);
    if (!raw) return DEFAULT_SUBS;
    const parsed = JSON.parse(raw);
    const cleaned = filterNonSampleSubscriptions(parsed);
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(SUBS_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return DEFAULT_SUBS;
  }
}

export function saveSubscriptions(subs: Subscription[]): void {
  const cleanSubs = filterNonSampleSubscriptions(subs);
  try {
    localStorage.setItem(SUBS_KEY, JSON.stringify(cleanSubs));
  } catch (e) {
    console.error('Failed to save subscriptions to local storage:', e);
  }

  // Also sync to API asynchronously (SQLite locally / Cloudflare KV on CF) with deviceId
  syncSubscriptionsToApi(subs);
}

// API Sync (SQLite locally / Cloudflare KV on Cloudflare Pages) with deviceId
export async function loadSubscriptionsFromApi(): Promise<Subscription[] | null> {
  try {
    const deviceId = getDeviceId();
    const res = await fetch(`/api/subscriptions?deviceId=${encodeURIComponent(deviceId)}`, {
      headers: {
        'X-Device-Id': deviceId
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const cleaned = filterNonSampleSubscriptions(data);
        localStorage.setItem(SUBS_KEY, JSON.stringify(cleaned));
        return cleaned;
      }
    }
  } catch {
    // API endpoint unavailable
  }
  return null;
}

export async function syncSubscriptionsToApi(subs: Subscription[]): Promise<boolean> {
  if (Array.isArray(subs) && subs.length > 0) {
    const nonSampleSubs = filterNonSampleSubscriptions(subs);
    if (nonSampleSubs.length === 0) {
      // 如果有且只有示例订阅的信息则不保存数据库
      return false;
    }
  }

  const cleanSubs = filterNonSampleSubscriptions(subs);

  try {
    const deviceId = getDeviceId();
    const res = await fetch(`/api/subscriptions?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId
      },
      body: JSON.stringify(cleanSubs)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getStoredLatencyCache(): Map<string, { latency: number | null; status: DeduplicatedNode['status']; errorMsg?: string }> {
  const map = new Map();
  try {
    const raw = localStorage.getItem(TEST_CACHE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      Object.entries(obj).forEach(([fp, val]: [string, any]) => {
        map.set(fp, val);
      });
    }
  } catch (e) {
    console.error('Failed to read latency cache:', e);
  }
  return map;
}

export function saveLatencyCache(nodes: DeduplicatedNode[]): void {
  try {
    const obj: Record<string, any> = {};
    nodes.forEach((n) => {
      if (n.status !== 'idle') {
        obj[n.fingerprint] = {
          latency: n.latency,
          status: n.status,
          errorMsg: n.errorMsg
        };
      }
    });
    localStorage.setItem(TEST_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.error('Failed to save latency cache:', e);
  }
}

// Fetch remote subscription content with CORS fallback and server proxy
export async function fetchSubscriptionContent(url: string): Promise<string> {
  const cleanUrl = url.trim();

  // 1. Try serverless /api/proxy endpoint first (bypasses browser CORS & recovers subconverter 502s)
  try {
    const proxyApiUrl = `/api/proxy?url=${encodeURIComponent(cleanUrl)}`;
    const res = await fetch(proxyApiUrl);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 10 && !text.includes('502 Bad Gateway')) {
        return text;
      }
    }
  } catch {
    // Continue to direct fetch
  }

  // 2. Try direct browser fetch
  try {
    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-pulse'
      }
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    // CORS error or network block, fallback to public proxy
  }

  // 3. Fallback public CORS proxies
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`
  ];

  for (const proxyUrl of proxies) {
    try {
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 10) return text;
      }
    } catch {
      // Continue to next proxy
    }
  }

  throw new Error('无法拉取该订阅链接，请检查链接或网络设置');
}
