import React, { useState } from 'react';
import { Wifi, Copy, Check, RefreshCw, Server, Shield, Globe, Layers, AlertTriangle } from 'lucide-react';
import { DeduplicatedNode } from '../types/subscription';
import { detectLocationMismatch } from '../utils/geo';

interface NodeCardProps {
  node: DeduplicatedNode;
  onTestSingleNode: (node: DeduplicatedNode) => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({ node, onTestSingleNode }) => {
  const [copied, setCopied] = useState(false);
  const primary = node.primaryNode;

  const handleCopy = () => {
    navigator.clipboard.writeText(primary.rawUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get protocol badge style
  const getProtocolBadge = (protocol: string) => {
    switch (protocol.toLowerCase()) {
      case 'vmess':
        return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      case 'vless':
        return 'bg-blue-950/80 text-blue-300 border-blue-800/60';
      case 'trojan':
        return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'ss':
      case 'ssr':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
      case 'hy2':
      case 'hysteria':
      case 'hysteria2':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Get latency badge style
  const getLatencyBadge = () => {
    if (node.status === 'testing') {
      return (
        <span className="flex items-center gap-1 rounded-md bg-indigo-950/80 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-800/60 animate-pulse-subtle">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>测速中...</span>
        </span>
      );
    }

    if (node.status === 'timeout' || node.status === 'error') {
      return (
        <span className="flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-800">
          <span>超时 / 脱机</span>
        </span>
      );
    }

    if (node.status === 'ok' && node.latency !== null) {
      const lat = node.latency;
      let colorClass = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 shadow-sm shadow-emerald-900/20';
      if (lat > 150 && lat <= 300) {
        colorClass = 'bg-amber-950/80 text-amber-400 border-amber-800/80';
      } else if (lat > 300) {
        colorClass = 'bg-rose-950/80 text-rose-400 border-rose-800/80';
      }

      return (
        <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono font-semibold border ${colorClass}`}>
          <Wifi className="h-3 w-3" />
          <span>{lat} ms</span>
        </span>
      );
    }

    return (
      <span className="rounded-md bg-slate-900/60 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-800">
        未测速
      </span>
    );
  };

  return (
    <div className="glass-card flex flex-col justify-between rounded-xl p-3.5 shadow-md hover:shadow-indigo-900/10">
      
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${getProtocolBadge(primary.protocol)}`}>
              {primary.protocol}
            </span>
            <h4 className="text-xs font-semibold text-white truncate font-sans" title={primary.name}>
              {primary.name}
            </h4>
          </div>

          <div>{getLatencyBadge()}</div>
        </div>

        {/* Server Host & Port */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1 truncate" title={`${primary.server}:${primary.port}`}>
            <Server className="h-3 w-3 text-slate-500 shrink-0" />
            <span className="truncate">{primary.server}</span>
            <span className="text-slate-600">:{primary.port}</span>
          </div>

          {primary.tls && (
            <span className="flex items-center gap-0.5 text-[10px] text-cyan-400 shrink-0">
              <Shield className="h-3 w-3" /> TLS
            </span>
          )}
        </div>

        {/* IP Geolocation & Location Mismatch Warning */}
        {node.geo ? (
          <div className="mt-2 flex flex-col gap-1 text-[11px] border-t border-slate-800/60 pt-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-300 font-medium">
                <Globe className="h-3 w-3 text-cyan-400" />
                <span>{node.geo.flag || '🌐'} {node.geo.country || '未知归属地'}</span>
                {node.geo.city && <span className="text-slate-500 text-[10px]">({node.geo.city})</span>}
              </span>
              {node.geo.countryCode && (
                <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-slate-800">
                  {node.geo.countryCode}
                </span>
              )}
            </div>

            {/* Check Mismatch */}
            {(() => {
              const mismatch = detectLocationMismatch(primary.name, node.geo);
              if (mismatch.isMismatch) {
                return (
                  <div className="flex items-center gap-1 rounded bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 text-[10px] text-amber-300 mt-0.5">
                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                    <span className="truncate">
                      位置不一致: 命名[{mismatch.nameClaim}] ≠ 真实IP[{mismatch.realLocation}]
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        ) : null}

        {/* Source Subscriptions Badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-800/60 pt-2">
          <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
            <Layers className="h-3 w-3 text-indigo-400" /> 来源:
          </span>
          {node.sourceSubscriptions.map((sub) => (
            <span
              key={sub.id}
              className="rounded-full bg-slate-900/90 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-800 truncate max-w-[140px]"
              title={sub.name}
            >
              {sub.name}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2">
        <button
          onClick={() => onTestSingleNode(node)}
          disabled={node.status === 'testing'}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-300 transition-colors"
          title="单独测速此节点"
        >
          <RefreshCw className={`h-3 w-3 ${node.status === 'testing' ? 'animate-spin' : ''}`} />
          <span>重新测速</span>
        </button>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
          title="复制节点链接"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">已复制</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 text-slate-400" />
              <span>复制链接</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
