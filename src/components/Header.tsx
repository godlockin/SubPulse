import React from 'react';
import { RefreshCw, Zap, Layers, FolderPlus, Download, CheckCircle2, AlertTriangle, ShieldCheck, Globe, BookOpen, Sparkles } from 'lucide-react';
import { Subscription, DeduplicatedNode, TestProgress } from '../types/subscription';
import { isInformationalNode } from '../utils/parser';

interface HeaderProps {
  subscriptions: Subscription[];
  nodes: DeduplicatedNode[];
  rawTotalNodeCount: number;
  testProgress: TestProgress;
  deduplicate: boolean;
  onToggleDeduplicate: () => void;
  onRefreshAllSubs: () => void;
  onRunSpeedTest: () => void;
  onRunGeoTest: () => void;
  onOpenSubModal: () => void;
  onOpenOnboarding: () => void;
  onOpenDocs: () => void;
  onExport: (format: 'clash' | 'base64') => void;
  isSyncing: boolean;
  isGeoTesting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  subscriptions,
  nodes,
  rawTotalNodeCount,
  testProgress,
  deduplicate,
  onToggleDeduplicate,
  onRefreshAllSubs,
  onRunSpeedTest,
  onRunGeoTest,
  onOpenSubModal,
  onOpenOnboarding,
  onOpenDocs,
  onExport,
  isSyncing,
  isGeoTesting
}) => {
  const activeSubsCount = subscriptions.filter((s) => s.enabled).length;
  const okNodesCount = nodes.filter((n) => n.status === 'ok').length;
  const timeoutCount = nodes.filter((n) => n.status === 'timeout').length;

  // Find node with global lowest latency (excluding informational nodes)
  const bestNode = React.useMemo(() => {
    const okNodes = nodes.filter(
      (n) => n.status === 'ok' && n.latency !== null && !isInformationalNode(n.primaryNode.name)
    );
    if (okNodes.length === 0) return null;
    return okNodes.reduce((min, n) => (n.latency! < min.latency! ? n : min), okNodes[0]);
  }, [nodes]);

  return (
    <header className="glass-panel sticky top-0 z-30 border-b border-slate-800/80 px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white md:text-xl">SubPulse 订阅测速中心</h1>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400">跨订阅去重 • 本地网络高并发测速 • 定时拉取</p>
          </div>
        </div>

        {/* Quick Stats Metrics */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/70 px-3 py-1.5 border border-slate-800">
            <span className="text-slate-400">订阅:</span>
            <span className="font-semibold text-indigo-400">{activeSubsCount}</span>
            <span className="text-slate-600">/ {subscriptions.length}</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/70 px-3 py-1.5 border border-slate-800">
            <span className="text-slate-400">{deduplicate ? '去重节点:' : '全量节点:'}</span>
            <span className="font-semibold text-cyan-400">{nodes.length}</span>
            {deduplicate && rawTotalNodeCount > nodes.length && (
              <span className="text-slate-500 text-[10px]">(原始 {rawTotalNodeCount})</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-950/40 px-3 py-1.5 border border-emerald-900/40 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>可用: {okNodesCount}</span>
          </div>

          {bestNode && (
            <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-950/80 to-teal-950/80 px-3 py-1.5 border border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-900/30">
              <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
              <span>最低延迟:</span>
              <span className="font-bold text-white font-mono">{bestNode.latency} ms</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-900/50 px-1.5 py-0.5 rounded border border-emerald-700/50 max-w-[120px] truncate" title={`所属订阅: ${bestNode.sourceSubscriptions.map((s) => s.name).join(', ')}`}>
                [{bestNode.sourceSubscriptions.map((s) => s.name).join(', ')}]
              </span>
            </div>
          )}

          {timeoutCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-950/40 px-3 py-1.5 border border-rose-900/40 text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>超时: {timeoutCount}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Deduplicate Toggle */}
          <button
            onClick={onToggleDeduplicate}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              deduplicate
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-white'
            }`}
            title={deduplicate ? '跨订阅已开启去重' : '显示全量节点'}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{deduplicate ? '已去重' : '未去重'}</span>
          </button>

          {/* Manage Subscriptions */}
          <button
            onClick={onOpenSubModal}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700/70 hover:bg-slate-700/80 hover:text-white transition-all"
          >
            <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
            <span>订阅管理</span>
          </button>

          {/* Onboarding Tour */}
          <button
            onClick={onOpenOnboarding}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-300 border border-indigo-500/40 hover:bg-indigo-900/60 transition-all shadow-sm relative"
            title="重播 5 步动画引导 Tour"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span>新手引导</span>
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          </button>

          {/* User Guide / Documentation */}
          <button
            onClick={onOpenDocs}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700/70 hover:bg-slate-700/80 hover:text-white transition-all"
            title="查看系统使用指南与常见问题 FAQ"
          >
            <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
            <span>使用指南</span>
          </button>

          {/* Refresh Subs */}
          <button
            onClick={onRefreshAllSubs}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-700/70 hover:bg-slate-700/80 transition-all ${
              isSyncing ? 'opacity-60 cursor-not-allowed' : ''
            }`}
            title="拉取最新远程节点信息"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? '更新中...' : '刷新远程订阅'}</span>
          </button>

          {/* Run Parallel Speed Test */}
          <button
            onClick={onRunSpeedTest}
            disabled={testProgress.isRunning || nodes.length === 0}
            className={`flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 transition-all ${
              testProgress.isRunning ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${testProgress.isRunning ? 'animate-bounce' : ''}`} />
            <span>{testProgress.isRunning ? '测速中...' : '并发测速'}</span>
          </button>

          {/* Run IP Geo Test */}
          <button
            onClick={onRunGeoTest}
            disabled={isGeoTesting || nodes.length === 0}
            className={`flex items-center gap-1.5 rounded-lg bg-slate-800/90 px-3 py-1.5 text-xs font-medium text-cyan-300 border border-cyan-800/60 hover:bg-cyan-950/60 transition-all ${
              isGeoTesting ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            }`}
            title="检测所有节点真实 IP 归属地与位置匹配"
          >
            <Globe className={`h-3.5 w-3.5 text-cyan-400 ${isGeoTesting ? 'animate-spin' : ''}`} />
            <span>{isGeoTesting ? '检测中...' : '检测 IP 归属地'}</span>
          </button>

          {/* Export */}
          <div className="relative group">
            <button className="flex items-center gap-1 rounded-lg bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-300 border border-slate-700/70 hover:text-white transition-all">
              <Download className="h-3.5 w-3.5 text-amber-400" />
              <span>导出</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden w-32 rounded-lg bg-slate-900 p-1 border border-slate-800 shadow-xl group-hover:block z-40">
              <button
                onClick={() => onExport('base64')}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded"
              >
                Base64 订阅
              </button>
              <button
                onClick={() => onExport('clash')}
                className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded"
              >
                Clash 配置 (YAML)
              </button>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
