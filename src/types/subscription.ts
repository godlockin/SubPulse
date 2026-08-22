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

export interface ScheduleSettings {
  // 订阅自动拉取更新
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number; // 更新周期 (分钟)，如 15, 30, 60, 120, 360, 720, 1440
  
  // 节点自动测速与 IP 回溯
  autoSpeedTestEnabled: boolean;
  autoSpeedTestIntervalMinutes: number; // 测速周期 (分钟)，如 10, 15, 30, 60, 120, 360
  
  // 联动选项
  autoTestOnSync: boolean; // 订阅更新完成后自动触发测速
  autoTestOnStartup: boolean; // 应用启动初始化完成后自动测速
  
  // 测速性能参数
  timeoutMs: number; // 测速超时毫秒 (默认 3500)
  concurrency: number; // 测速并发数 (默认 25)
  geoConcurrency: number; // IP 归属地检测并发数 (默认 12)
  
  // 上次执行时间戳
  lastSyncTime?: number | null;
  lastSpeedTestTime?: number | null;
}
