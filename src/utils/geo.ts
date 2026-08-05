import { IPGeoInfo } from '../types/subscription';

const GEO_CACHE_KEY = 'sub_manager_ip_geo_cache_v1';

// Convert country code to emoji flag (e.g. "US" -> "🇺🇸")
export function getCountryFlag(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Get cached Geo info
export function getCachedGeoMap(): Record<string, IPGeoInfo> {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Save cached Geo info
export function saveCachedGeoMap(map: Record<string, IPGeoInfo>): void {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save IP Geo cache:', e);
  }
}

// Fetch IP Geolocation for a host/IP using serverless API endpoint
export async function fetchIPGeo(host: string): Promise<IPGeoInfo | null> {
  const cleanHost = host.trim();
  if (!cleanHost) return null;

  const cache = getCachedGeoMap();
  if (cache[cleanHost]) {
    return cache[cleanHost];
  }

  // 1. Try serverless /api/geo endpoint first (bypasses browser CORS & 429 Rate Limits)
  try {
    const res = await fetch(`/api/geo?ip=${encodeURIComponent(cleanHost)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.countryCode) {
        const geoInfo: IPGeoInfo = {
          ip: data.ip || cleanHost,
          country: data.country || data.countryCode,
          countryCode: data.countryCode,
          city: data.city || '',
          isp: data.isp || '',
          flag: data.flag || getCountryFlag(data.countryCode),
          fetchedAt: Date.now()
        };
        cache[cleanHost] = geoInfo;
        saveCachedGeoMap(cache);
        return geoInfo;
      }
    }
  } catch {
    // Fallback to direct client fetch if serverless endpoint fails
  }

  // 2. Direct client fallback
  try {
    const res = await fetch(`http://ip-api.com/json/${cleanHost}?lang=zh-CN`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.countryCode) {
        const geoInfo: IPGeoInfo = {
          ip: data.query || cleanHost,
          country: data.country || data.countryCode,
          countryCode: data.countryCode,
          city: data.city || '',
          isp: data.isp || data.org || '',
          flag: getCountryFlag(data.countryCode),
          fetchedAt: Date.now()
        };
        cache[cleanHost] = geoInfo;
        saveCachedGeoMap(cache);
        return geoInfo;
      }
    }
  } catch {}

  return null;
}

// Map common keywords in node names to Country Codes for mismatch checking
const LOCATION_KEYWORDS: Array<{ namePattern: RegExp; code: string; label: string }> = [
  { namePattern: /香港|HK|Hong\s*Kong/i, code: 'HK', label: '香港' },
  { namePattern: /日本|JP|Japan|东京|大阪/i, code: 'JP', label: '日本' },
  { namePattern: /美国|US|America|United\s*States|洛杉矶|纽约|西雅图|波特兰/i, code: 'US', label: '美国' },
  { namePattern: /新加坡|SG|Singapore/i, code: 'SG', label: '新加坡' },
  { namePattern: /台湾|TW|Taiwan|台北/i, code: 'TW', label: '台湾' },
  { namePattern: /韩国|KR|Korea|首尔/i, code: 'KR', label: '韩国' },
  { namePattern: /德国|DE|Germany|法兰克福/i, code: 'DE', label: '德国' },
  { namePattern: /英国|UK|GB|Britain|伦敦/i, code: 'GB', label: '英国' },
  { namePattern: /澳大利亚|AU|Australia|悉尼/i, code: 'AU', label: '澳大利亚' },
  { namePattern: /加拿大|CA|Canada|温哥华|多伦多/i, code: 'CA', label: '加拿大' },
  { namePattern: /中国|CN|China/i, code: 'CN', label: '中国' }
];

export interface MismatchResult {
  isMismatch: boolean;
  nameClaim?: string;
  realLocation?: string;
  realCountryCode?: string;
}

export function detectLocationMismatch(nodeName: string, geo?: IPGeoInfo | null): MismatchResult {
  if (!geo || !geo.countryCode) {
    return { isMismatch: false };
  }

  const realCode = geo.countryCode.toUpperCase();

  for (const item of LOCATION_KEYWORDS) {
    if (item.namePattern.test(nodeName)) {
      // If claimed country code differs from real IP country code (e.g. claims HK but IP is US)
      if (item.code !== realCode) {
        return {
          isMismatch: true,
          nameClaim: item.label,
          realLocation: geo.country || geo.countryCode,
          realCountryCode: realCode
        };
      }
      break;
    }
  }

  return { isMismatch: false };
}
