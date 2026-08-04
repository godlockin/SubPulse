import { Subscription, VPNNode, DeduplicatedNode } from '../types/subscription';
import { getDeviceId } from './deviceId';

const SUBS_KEY = 'sub_manager_subscriptions_v1';
const TEST_CACHE_KEY = 'sub_manager_latency_cache_v1';

// Initial default demo subscriptions if empty
const DEFAULT_SUBS: Subscription[] = [
  {
    id: 'sub_demo_1',
    name: '示例订阅 (Demo Sub)',
    url: 'https://raw.githubusercontent.com/free-vpn-subscriptions/free-vpn/main/sub.txt',
    enabled: true,
    lastUpdated: null,
    nodeCount: 0,
    autoUpdateHours: 6
  }
];

export function getStoredSubscriptions(): Subscription[] {
  try {
    const raw = localStorage.getItem(SUBS_KEY);
    if (!raw) return DEFAULT_SUBS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SUBS;
  }
}

export function saveSubscriptions(subs: Subscription[]): void {
  try {
    localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
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
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(SUBS_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // API endpoint unavailable
  }
  return null;
}

export async function syncSubscriptionsToApi(subs: Subscription[]): Promise<boolean> {
  try {
    const deviceId = getDeviceId();
    const res = await fetch(`/api/subscriptions?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': deviceId
      },
      body: JSON.stringify(subs)
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

// Fetch remote subscription content with CORS fallback handling
export async function fetchSubscriptionContent(url: string): Promise<string> {
  const cleanUrl = url.trim();

  // Try direct fetch first
  try {
    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'ClashforWindows/0.20.39 v2rayN/6.23 sub-manager'
      }
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    // CORS error or network block, fallback to proxy
  }

  // Fallback CORS proxies
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

  throw new Error('无法拉取该订阅链接，请检查链接或网络代理设置');
}
