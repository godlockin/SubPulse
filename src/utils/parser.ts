import jsYaml from 'js-yaml';
import { VPNNode, NodeProtocol } from '../types/subscription';

// Filter out informational/traffic/announcement nodes (e.g. 剩余流量, 官网, 直连)
export function isInformationalNode(name: string): boolean {
  if (!name) return false;
  const keywords = [
    '剩余流量', '流量', '到期', '过期', '官网', '直连', '公告', '重置', '客服', 
    '官方', '网站', '通知', '地址', '账号', '续费', '说明', '规则', '更新', 
    'expire', 'traffic', 'site', 'website', 'notice', 'info', 'announcement'
  ];
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

// Helper to decode Base64 safely (handles URL-safe base64 & padding)
export function safeBase64Decode(str: string): string {
  try {
    let clean = str.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }
    // Handle UTF-8 decoding
    return decodeURIComponent(
      atob(clean)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch (e) {
    try {
      return atob(str.trim());
    } catch {
      return str;
    }
  }
}

// Generate simple deterministic fingerprint for node deduplication
export function generateNodeFingerprint(protocol: string, server: string, port: number, secret?: string, path?: string, sni?: string): string {
  const normServer = (server || '').toLowerCase().trim();
  const normPort = port || 443;
  const normProto = (protocol || 'unknown').toLowerCase().trim();
  const normSecret = (secret || '').trim();
  const normPath = (path || '').trim();
  const normSni = (sni || '').toLowerCase().trim();

  const rawKey = `${normProto}://${normServer}:${normPort}?secret=${normSecret}&path=${normPath}&sni=${normSni}`;
  
  // Simple fast string hash
  let hash = 0;
  for (let i = 0; i < rawKey.length; i++) {
    const char = rawKey.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `node_${Math.abs(hash).toString(16)}_${normServer}_${normPort}`;
}

// Parse VMess link
function parseVmess(url: string, subId: string, subName: string, index: number): VPNNode | null {
  try {
    const base64Data = url.replace(/^vmess:\/\//i, '');
    const jsonStr = safeBase64Decode(base64Data);
    const obj = JSON.parse(jsonStr);

    const server = obj.add || obj.host || '';
    const port = parseInt(obj.port, 10) || 443;
    const name = obj.ps || `VMess-${server}:${port}`;
    const uuid = obj.id || '';
    const path = obj.path || '';
    const sni = obj.sni || obj.host || '';

    if (!server) return null;

    return {
      id: `${subId}_vmess_${index}`,
      fingerprint: generateNodeFingerprint('vmess', server, port, uuid, path, sni),
      name,
      protocol: 'vmess',
      server,
      port,
      uuid,
      path,
      sni,
      tls: obj.tls === 'tls',
      rawUrl: url,
      subscriptionId: subId,
      subscriptionName: subName
    };
  } catch {
    return null;
  }
}

// Parse standard URL scheme (vless, trojan, ss, hy2)
function parseStandardScheme(urlStr: string, subId: string, subName: string, index: number): VPNNode | null {
  try {
    const parsedUrl = new URL(urlStr);
    const protocolScheme = parsedUrl.protocol.replace(':', '').toLowerCase();
    
    let protocol: NodeProtocol = 'unknown';
    if (protocolScheme === 'vless') protocol = 'vless';
    else if (protocolScheme === 'trojan') protocol = 'trojan';
    else if (protocolScheme === 'ss') protocol = 'ss';
    else if (protocolScheme === 'ssr') protocol = 'ssr';
    else if (protocolScheme === 'hy2' || protocolScheme === 'hysteria2') protocol = 'hy2';
    else if (protocolScheme === 'hysteria') protocol = 'hysteria';
    else return null;

    const server = parsedUrl.hostname;
    const port = parseInt(parsedUrl.port, 10) || (protocol === 'trojan' ? 443 : 80);
    const name = decodeURIComponent(parsedUrl.hash.replace(/^#/, '')) || `${protocol.toUpperCase()}-${server}:${port}`;

    const uuid = parsedUrl.username || parsedUrl.password || '';
    const searchParams = parsedUrl.searchParams;
    const path = searchParams.get('path') || '';
    const sni = searchParams.get('sni') || searchParams.get('peer') || searchParams.get('host') || '';

    if (!server) return null;

    return {
      id: `${subId}_${protocol}_${index}`,
      fingerprint: generateNodeFingerprint(protocol, server, port, uuid, path, sni),
      name,
      protocol,
      server,
      port,
      uuid,
      path,
      sni,
      tls: searchParams.get('security') === 'tls' || searchParams.get('tls') === '1',
      rawUrl: urlStr,
      subscriptionId: subId,
      subscriptionName: subName
    };
  } catch {
    return null;
  }
}

// Parse Clash YAML config
function parseClashYaml(content: string, subId: string, subName: string): VPNNode[] {
  const nodes: VPNNode[] = [];
  try {
    const doc = jsYaml.load(content) as any;
    if (doc && Array.isArray(doc.proxies)) {
      doc.proxies.forEach((p: any, idx: number) => {
        if (!p || !p.server || !p.port) return;
        
        let protocol: NodeProtocol = 'unknown';
        const type = (p.type || '').toLowerCase();
        if (type === 'vmess') protocol = 'vmess';
        else if (type === 'vless') protocol = 'vless';
        else if (type === 'trojan') protocol = 'trojan';
        else if (type === 'ss' || type === 'shadowsocks') protocol = 'ss';
        else if (type === 'hysteria2' || type === 'hy2') protocol = 'hy2';
        else protocol = 'clash';

        const server = p.server;
        const port = parseInt(p.port, 10);
        const name = p.name || `Node-${server}:${port}`;
        const secret = p.uuid || p.password || '';
        const path = p['ws-opts']?.path || p['grpc-opts']?.['grpc-service-name'] || '';
        const sni = p.sni || p.servername || '';

        nodes.push({
          id: `${subId}_clash_${idx}`,
          fingerprint: generateNodeFingerprint(protocol, server, port, secret, path, sni),
          name,
          protocol,
          server,
          port,
          uuid: p.uuid,
          password: p.password,
          path,
          sni,
          tls: Boolean(p.tls),
          rawUrl: `clash://${server}:${port}`,
          subscriptionId: subId,
          subscriptionName: subName
        });
      });
    }
  } catch {
    // Ignore YAML parse errors
  }
  return nodes;
}

// Main subscription parser
export function parseSubscriptionContent(content: string, subId: string, subName: string): VPNNode[] {
  if (!content || typeof content !== 'string') return [];

  const text = content.trim();

  // Try Clash YAML first if it contains proxies key
  if (text.includes('proxies:') || text.startsWith('port:') || text.startsWith('mixed-port:')) {
    const clashNodes = parseClashYaml(text, subId, subName);
    if (clashNodes.length > 0) return clashNodes;
  }

  // Try Base64 decoding if the string doesn't look like plain URLs
  let decodedText = text;
  if (!text.includes('://') && !text.includes('\n')) {
    decodedText = safeBase64Decode(text);
  }

  const lines = decodedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nodes: VPNNode[] = [];

  lines.forEach((line, idx) => {
    if (line.toLowerCase().startsWith('vmess://')) {
      const node = parseVmess(line, subId, subName, idx);
      if (node) nodes.push(node);
    } else if (
      line.toLowerCase().startsWith('vless://') ||
      line.toLowerCase().startsWith('trojan://') ||
      line.toLowerCase().startsWith('ss://') ||
      line.toLowerCase().startsWith('ssr://') ||
      line.toLowerCase().startsWith('hy2://') ||
      line.toLowerCase().startsWith('hysteria2://') ||
      line.toLowerCase().startsWith('hysteria://')
    ) {
      const node = parseStandardScheme(line, subId, subName, idx);
      if (node) nodes.push(node);
    }
  });

  return nodes;
}
