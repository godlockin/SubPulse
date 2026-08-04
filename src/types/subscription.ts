export type NodeProtocol = 'vmess' | 'vless' | 'trojan' | 'ss' | 'ssr' | 'hy2' | 'hysteria' | 'clash' | 'unknown';

export interface Subscription {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastUpdated: number | null;
  nodeCount: number;
  autoUpdateHours: number; // Interval in hours
  error?: string | null;
}

export interface VPNNode {
  id: string;
  fingerprint: string;
  name: string;
  protocol: NodeProtocol;
  server: string;
  port: number;
  uuid?: string;
  password?: string;
  path?: string;
  host?: string;
  sni?: string;
  tls?: boolean;
  type?: string;
  rawUrl: string;
  subscriptionId: string;
  subscriptionName: string;
}

export interface IPGeoInfo {
  ip?: string;
  country?: string; // e.g. "美国", "日本", "香港"
  countryCode?: string; // e.g. "US", "JP", "HK"
  city?: string; // e.g. "Los Angeles"
  isp?: string;
  flag?: string; // Emoji flag e.g. 🇺🇸
  fetchedAt?: number;
}

export interface DeduplicatedNode {
  fingerprint: string;
  primaryNode: VPNNode;
  sourceSubscriptions: Array<{ id: string; name: string }>;
  latency: number | null; // ms, null if untested
  status: 'idle' | 'testing' | 'ok' | 'timeout' | 'error';
  errorMsg?: string;
  lastTested?: number;
  geo?: IPGeoInfo | null;
}

export interface TestProgress {
  total: number;
  completed: number;
  testing: number;
  success: number;
  timeout: number;
  error: number;
  avgLatency: number;
  isRunning: boolean;
}

export interface FilterOptions {
  search: string;
  subscriptionId: string; // 'all' or specific subscription ID
  protocol: string; // 'all' or specific protocol
  deduplicate: boolean;
  status: 'all' | 'ok' | 'timeout';
  mismatchOnly?: boolean;
  sortBy: 'latency' | 'name' | 'protocol' | 'subscription';
  sortOrder: 'asc' | 'desc';
}
