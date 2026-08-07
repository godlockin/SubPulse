import React, { useState, useMemo } from 'react';
import { Zap, Globe, Folder, Copy, Check, ShieldCheck, AlertTriangle } from 'lucide-react';
import { DeduplicatedNode, Subscription } from '../types/subscription';
import { isInformationalNode } from '../utils/parser';
import { detectLocationMismatch } from '../utils/geo';

interface BestNodeSelectorProps {
  nodes: DeduplicatedNode[];
  subscriptions: Subscription[];
}

type DimensionMode = 'all' | 'region' | 'subscription';

export const BestNodeSelector: React.FC<BestNodeSelectorProps> = ({ nodes, subscriptions }) => {
  const [mode, setMode] = useState<DimensionMode>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [selectedSubId, setSelectedSubId] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  // Extract all available real IP regions from tested nodes
  const availableRegions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; flag: string; count: number }>();
    nodes.forEach((n) => {
      if (n.geo && n.geo.countryCode) {
        const code = n.geo.countryCode;
        if (!map.has(code)) {
          map.set(code, {
            code,
            name: n.geo.country || code,
            flag: n.geo.flag || '🌐',
            count: 0
          });
        }
        map.get(code)!.count++;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [nodes]);

  // Compute best node based on mode & filter selection
  const bestNode = useMemo(() => {
    // Filter out non-operational or notice nodes
    const validNodes = nodes.filter(
      (n) => n.status === 'ok' && n.latency !== null && !isInformationalNode(n.primaryNode.name)
    );

    if (validNodes.length === 0) return null;

    let candidates = validNodes;

    if (mode === 'region') {
      if (selectedRegion !== 'all') {
        candidates = candidates.filter((n) => n.geo && n.geo.countryCode === selectedRegion);
      }
    } else if (mode === 'subscription') {
      if (selectedSubId !== 'all') {
        candidates = candidates.filter((n) =>
          n.sourceSubscriptions.some((s) => s.id === selectedSubId)
        );
      }
    }

    if (candidates.length === 0) return null;
    return candidates.reduce((min, n) => (n.latency! < min.latency! ? n : min), candidates[0]);
  }, [nodes, mode, selectedRegion, selectedSubId]);

  const handleCopy = () => {
    if (bestNode) {
      navigator.clipboard.writeText(bestNode.primaryNode.rawUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-panel my-3 rounded-2xl border border-indigo-500/30 p-4 bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 shadow-xl" data-tour="best-node-selector">
      
      {/* Selector Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400 animate-pulse" />
          <h2 className="text-sm font-bold text-white">多维最佳测速榜</h2>
          <span className="text-xs text-slate-400">（选择维度一键选出最佳节点）</span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setMode('all')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              mode === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🌐 全网最佳
          </button>
          <button
            onClick={() => setMode('region')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              mode === 'region'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📍 某个真实地区
          </button>
          <button
            onClick={() => setMode('subscription')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              mode === 'subscription'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📂 某个订阅
          </button>
        </div>
      </div>

      {/* Sub-Filters for Region & Subscription Modes */}
      {mode === 'region' && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">选择真实 IP 地区:</span>
          <button
            onClick={() => setSelectedRegion('all')}
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium ${
              selectedRegion === 'all'
                ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            全部地区
          </button>
          {availableRegions.map((reg) => (
            <button
              key={reg.code}
              onClick={() => setSelectedRegion(reg.code)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all flex items-center gap-1 ${
                selectedRegion === reg.code
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{reg.flag}</span>
              <span>{reg.name}</span>
              <span className="text-[10px] text-slate-500">({reg.count})</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'subscription' && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400">选择订阅分组:</span>
          <select
            value={selectedSubId}
            onChange={(e) => setSelectedSubId(e.target.value)}
            className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-1 text-xs text-white focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">选择订阅...</option>
            {subscriptions.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Best Node Display Banner */}
      {bestNode ? (
        <div className="mt-3 rounded-xl bg-slate-950/80 border border-emerald-500/40 p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-400 font-bold font-mono text-xs">
              {bestNode.latency}ms
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white truncate font-sans">{bestNode.primaryNode.name}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase font-bold text-cyan-300 border border-slate-700">
                  {bestNode.primaryNode.protocol}
                </span>
                {bestNode.geo && (
                  <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] text-emerald-400 border border-slate-800 flex items-center gap-1 font-mono">
                    <Globe className="h-3 w-3 text-cyan-400" />
                    {bestNode.geo.flag} {bestNode.geo.country} {bestNode.geo.city ? `(${bestNode.geo.city})` : ''}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                <span className="font-mono text-slate-500">
                  {bestNode.primaryNode.server}:{bestNode.primaryNode.port}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">来源:</span>
                {bestNode.sourceSubscriptions.map((s) => (
                  <span key={s.id} className="rounded bg-slate-900 px-2 py-0.5 text-[10px] text-indigo-300 border border-slate-800">
                    {s.name}
                  </span>
                ))}

                {/* Mismatch Warning */}
                {(() => {
                  const mismatch = detectLocationMismatch(bestNode.primaryNode.name, bestNode.geo);
                  if (mismatch.isMismatch) {
                    return (
                      <span className="rounded bg-amber-950/80 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-800/80 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-400" />
                        命名[{mismatch.nameClaim}] ≠ 真实IP[{mismatch.realLocation}]
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-all shrink-0"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? '已复制最佳节点' : '复制最佳节点链接'}</span>
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-center text-xs text-slate-500">
          未检测到符合当前维度筛选条件的可用测速节点，请先进行「并发测速」或「检测 IP 归属地」。
        </div>
      )}

    </div>
  );
};
