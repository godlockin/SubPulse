import React from 'react';
import { RefreshCw, Zap, Layers, FolderPlus, Download, CheckCircle2, AlertTriangle, ShieldCheck, Globe, BookOpen, Sparkles, Clock, Hourglass } from 'lucide-react';
import { Subscription, DeduplicatedNode, TestProgress, ScheduleSettings } from '../types/subscription';
import { isInformationalNode } from '../utils/parser';

interface HeaderProps {
  subscriptions: Subscription[];
  nodes: DeduplicatedNode[];
  rawTotalNodeCount: number;
  testProgress: TestProgress;
  geoProgress?: { total: number; completed: number; isRunning: boolean };
  deduplicate: boolean;
  scheduleSettings: ScheduleSettings;
  isSpeedTestQueued: boolean;
  onToggleDeduplicate: () => void;
  onRefreshAllSubs: () => void;
  onRunSpeedTest: () => void;
  onRunGeoTest: () => void;
  onOpenSubModal: () => void;
  onOpenScheduler: () => void;
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
  geoProgress,
  deduplicate,
  scheduleSettings,
  isSpeedTestQueued,
  onToggleDeduplicate,
  onRefreshAllSubs,
  onRunSpeedTest,
  onRunGeoTest,
  onOpenSubModal,
  onOpenScheduler,
  onOpenOnboarding,
  onOpenDocs,
  onExport,
  isSyncing,
  isGeoTesting
}) => {
  const activeSubsCount = subscriptions.filter((s) => s.enabled).length;
  const okNodesCount = nodes.filter((n) => n.status === 'ok').length;
  const timeoutCount = nodes.filter((n) => n.status === 'timeout').length;
  const isTestingAny = testProgress.isRunning || isGeoTesting;

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
                v1.1.0
              </span>
            </div>
            <p className="text-xs text-slate-400">跨订阅去重 • 本地网络并发测速 • 定时自动化调度</p>
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
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Segment 1: Unified Execution CTA */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner" data-tour="speed-test-btn">
            <button
              onClick={onRunSpeedTest}
              disabled={isTestingAny || nodes.length === 0}
              className={`flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-950/60 hover:from-emerald-500 hover:to-cyan-500 transition-all ${
                isTestingAny ? 'opacity-80 cursor-not-allowed' : 'active:scale-95 hover:shadow-cyan-900/40'
              }`}
              title="一键同时并发检测全量节点的响应延迟与真实 IP 地理归属地"
            >
              <Zap className={`h-4 w-4 text-amber-300 ${isTestingAny ? 'animate-bounce' : ''}`} />
              <Globe className={`h-3.5 w-3.5 text-cyan-200 ${isTestingAny ? 'animate-spin' : ''}`} />
              <span>
                {isTestingAny
                  ? `并发检测中 (测速 ${testProgress.completed}/${testProgress.total}${
                      geoProgress?.total ? ` | IP ${geoProgress.completed}/${geoProgress.total}` : ''
                    })...`
                  : isSpeedTestQueued
                  ? '测速已排队等待更新...'
                  : '一键测速与 IP 定位'}
              </span>
            </button>
          </div>

          {/* Segment 2: Automation & Data Management */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
            
            {/* Scheduler Settings Button */}
            <button
              onClick={onOpenScheduler}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all ${
                isSpeedTestQueued
                  ? 'bg-amber-950/70 border-amber-800/80 text-amber-300 animate-pulse'
                  : scheduleSettings.autoSyncEnabled || scheduleSettings.autoSpeedTestEnabled
                  ? 'bg-indigo-950/60 border-indigo-800/80 text-indigo-300 hover:bg-indigo-900/60'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title="定时更新与自动化测速周期设置"
            >
              {isSpeedTestQueued ? (
                <Hourglass className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Clock className="h-3.5 w-3.5 text-indigo-400" />
              )}
              <span>
                {isSpeedTestQueued
                  ? '测速等待中...'
                  : scheduleSettings.autoSyncEnabled && scheduleSettings.autoSpeedTestEnabled
                  ? `定时: 🔄${scheduleSettings.autoSyncIntervalMinutes}m ⚡${scheduleSettings.autoSpeedTestIntervalMinutes}m`
                  : scheduleSettings.autoSyncEnabled
                  ? `定时更新: ${scheduleSettings.autoSyncIntervalMinutes}m`
                  : scheduleSettings.autoSpeedTestEnabled
                  ? `定时测速: ${scheduleSettings.autoSpeedTestIntervalMinutes}m`
                  : '定时: 已关闭'}
              </span>
            </button>

            {/* Manage Subscriptions */}
            <button
              onClick={onOpenSubModal}
              data-tour="sub-modal-btn"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all"
              title="添加/更新/移除订阅链接"
            >
              <FolderPlus className="h-3.5 w-3.5 text-indigo-400" />
              <span>订阅管理</span>
            </button>

            {/* Refresh Subs */}
            <button
              onClick={onRefreshAllSubs}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-all ${
                isSyncing ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              title="拉取最新远程节点信息"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? '更新中...' : '刷新'}</span>
            </button>

            {/* Deduplicate Toggle */}
            <button
              onClick={onToggleDeduplicate}
              data-tour="dedup-toggle"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                deduplicate
                  ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title={deduplicate ? '跨订阅已开启去重' : '显示全量节点'}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>{deduplicate ? '已去重' : '未去重'}</span>
            </button>
          </div>

          {/* Segment 3: Auxiliary & Export */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
            {/* Export Dropdown */}
            <div className="relative group" data-tour="export-menu">
              <button className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-950/40 transition-all">
                <Download className="h-3.5 w-3.5 text-amber-400" />
                <span>导出</span>
              </button>
              {/* Dropdown Container with seamless hover hit area */}
              <div className="absolute right-0 top-full pt-1.5 hidden w-36 group-hover:block z-40">
                <div className="rounded-xl bg-slate-900 p-1.5 border border-slate-800 shadow-2xl space-y-0.5">
                  <button
                    onClick={() => onExport('base64')}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    Base64 订阅
                  </button>
                  <button
                    onClick={() => onExport('clash')}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    Clash 配置 (YAML)
                  </button>
                </div>
              </div>
            </div>

            {/* Help Menu Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-950/50 transition-all relative">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>帮助</span>
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </button>
              {/* Dropdown Container with seamless hover hit area */}
              <div className="absolute right-0 top-full pt-1.5 hidden w-40 group-hover:block z-40">
                <div className="rounded-xl bg-slate-900 p-1.5 border border-slate-800 shadow-2xl space-y-0.5">
                  <button
                    onClick={onOpenOnboarding}
                    className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 text-xs text-indigo-300 hover:bg-indigo-950/60 rounded-lg transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>新手引导 Tour</span>
                  </button>
                  <button
                    onClick={onOpenDocs}
                    className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>使用指南与 FAQ</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </header>
  );
};
