import React from 'react';
import {
  X,
  Clock,
  Zap,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  Globe,
  Hourglass,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ScheduleSettings, Subscription } from '../types/subscription';

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ScheduleSettings;
  onUpdateSettings: (newSettings: Partial<ScheduleSettings>) => void;
  isSyncing: boolean;
  isTesting: boolean;
  isSpeedTestQueued: boolean;
  onTriggerSync: () => void;
  onTriggerSpeedTest: () => void;
  subscriptionsCount: number;
  nodesCount: number;
}

export const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isSyncing,
  isTesting,
  isSpeedTestQueued,
  onTriggerSync,
  onTriggerSpeedTest,
  subscriptionsCount,
  nodesCount
}) => {
  if (!isOpen) return null;

  // Format timestamp helper
  const formatTime = (ts?: number | null) => {
    if (!ts) return '尚未执行';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  // Calculate next run countdown
  const getNextCountdown = (lastTime: number | null | undefined, intervalMinutes: number, isEnabled: boolean) => {
    if (!isEnabled) return '已关闭定时';
    const now = Date.now();
    const last = lastTime || now;
    const nextTime = last + intervalMinutes * 60 * 1000;
    const diffSec = Math.max(0, Math.floor((nextTime - now) / 1000));
    if (diffSec === 0) return '即将触发';
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    return `${m}分${s.toString().padStart(2, '0')}秒后`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 p-6 shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white md:text-lg flex items-center gap-2">
                定时自动化与周期任务调度
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                  后台常驻
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                支持分别设定订阅拉取与节点测速周期，内置并发拉取与排队等待防冲突机制
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 pr-1 mt-4 space-y-4">
          
          {/* Status Alert Banner if Queued or Working */}
          {(isSyncing || isTesting || isSpeedTestQueued) && (
            <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/60 p-3.5 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin shrink-0" />
                ) : isSpeedTestQueued ? (
                  <Hourglass className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
                ) : (
                  <Zap className="h-4 w-4 text-emerald-400 animate-bounce shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-white">
                    {isSyncing
                      ? '正在并发拉取各订阅源最新节点...'
                      : isSpeedTestQueued
                      ? '订阅正在更新中，节点测速任务已在队列中排队等待...'
                      : '正在对全量去重节点进行并发测速与真实 IP 回溯...'}
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    {isSpeedTestQueued ? '订阅拉取完成后将立即自动执行最新节点测速' : '多路并发执行中，无需人工干预'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Module 1: 订阅节点自动拉取更新 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">订阅节点自动更新</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        settings.autoSyncEnabled
                          ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.autoSyncEnabled ? '已开启' : '已关闭'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    多订阅源并发拉取，自动解析协议并重构去重指纹库
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSyncEnabled}
                  onChange={(e) => onUpdateSettings({ autoSyncEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            {/* Interval and Status controls */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 pt-3 border-t border-slate-800/80">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  自动拉取更新周期
                </label>
                <select
                  value={settings.autoSyncIntervalMinutes}
                  onChange={(e) => onUpdateSettings({ autoSyncIntervalMinutes: Number(e.target.value) })}
                  disabled={!settings.autoSyncEnabled}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                >
                  <option value={10}>每 10 分钟</option>
                  <option value={15}>每 15 分钟</option>
                  <option value={30}>每 30 分钟</option>
                  <option value={60}>每 1 小时 (60分钟)</option>
                  <option value={120}>每 2 小时 (120分钟)</option>
                  <option value={360}>每 6 小时 (360分钟)</option>
                  <option value={720}>每 12 小时 (720分钟)</option>
                  <option value={1440}>每 24 小时 (1天)</option>
                </select>
              </div>

              <div className="flex flex-col justify-between rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>上次更新:</span>
                  <span className="font-mono text-slate-300">{formatTime(settings.lastSyncTime)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 mt-1">
                  <span>下次调度:</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {getNextCountdown(
                      settings.lastSyncTime,
                      settings.autoSyncIntervalMinutes,
                      settings.autoSyncEnabled
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Trigger Button */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onTriggerSync}
                disabled={isSyncing || subscriptionsCount === 0}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  isSyncing
                    ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-cyan-950/50 hover:bg-cyan-900/60 border-cyan-800/80 text-cyan-300 active:scale-95'
                }`}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '正在并发拉取中...' : '立即并发拉取全部订阅'}</span>
              </button>
            </div>
          </div>

          {/* Module 2: 节点并发测速 + 真实 IP 回溯 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">节点并发测速与 IP 回溯</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        settings.autoSpeedTestEnabled
                          ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {settings.autoSpeedTestEnabled ? '已开启' : '已关闭'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    基于本机网络高并发探测延迟，同时异步回溯真实地理位置与 ISP
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoSpeedTestEnabled}
                  onChange={(e) => onUpdateSettings({ autoSpeedTestEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Interval and Status controls */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 pt-3 border-t border-slate-800/80">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  自动测速周期
                </label>
                <select
                  value={settings.autoSpeedTestIntervalMinutes}
                  onChange={(e) => onUpdateSettings({ autoSpeedTestIntervalMinutes: Number(e.target.value) })}
                  disabled={!settings.autoSpeedTestEnabled}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                >
                  <option value={5}>每 5 分钟</option>
                  <option value={10}>每 10 分钟</option>
                  <option value={15}>每 15 分钟</option>
                  <option value={30}>每 30 分钟</option>
                  <option value={60}>每 1 小时 (60分钟)</option>
                  <option value={120}>每 2 小时 (120分钟)</option>
                  <option value={360}>每 6 小时 (360分钟)</option>
                  <option value={720}>每 12 小时 (720分钟)</option>
                </select>
              </div>

              <div className="flex flex-col justify-between rounded-lg bg-slate-950/60 p-2.5 border border-slate-800/60 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>上次测速:</span>
                  <span className="font-mono text-slate-300">{formatTime(settings.lastSpeedTestTime)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400 mt-1">
                  <span>下次调度:</span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {getNextCountdown(
                      settings.lastSpeedTestTime,
                      settings.autoSpeedTestIntervalMinutes,
                      settings.autoSpeedTestEnabled
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Trigger Button */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onTriggerSpeedTest}
                disabled={isTesting || nodesCount === 0}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  isTesting
                    ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-800/80 text-emerald-300 active:scale-95'
                }`}
              >
                <Zap className={`h-3.5 w-3.5 ${isTesting ? 'animate-bounce' : ''}`} />
                <span>{isTesting ? '正在全量测速中...' : '立即并发测速与 IP 定位'}</span>
              </button>
            </div>
          </div>

          {/* Module 3: 协同联动与防冲突排队机制 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> 自动化协同联动与排队机制
            </h3>

            <div className="space-y-3">
              {/* Auto Test after sync */}
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <div className="pr-3">
                  <span className="text-xs font-medium text-white block">
                    订阅更新完成后自动触发全量测速
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    每当手动或定时完成订阅拉取与节点去重后，自动开始探测新节点延迟与归属地
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoTestOnSync}
                  onChange={(e) => onUpdateSettings({ autoTestOnSync: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>

              {/* Auto Test on startup */}
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <div className="pr-3">
                  <span className="text-xs font-medium text-white block">
                    打开应用完成初始化后自动运行首次测速
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    无需每次打开网页后手动点击，系统将自动对所有节点进行就绪测速
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoTestOnStartup}
                  onChange={(e) => onUpdateSettings({ autoTestOnStartup: e.target.checked })}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </label>
            </div>

            {/* Explanatory Callout */}
            <div className="mt-3 rounded-lg bg-indigo-950/20 border border-indigo-900/30 p-3 text-[11px] text-indigo-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-200">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                <span>任务冲突自动排队保护</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                若节点测速任务触发时，订阅拉取更新尚未结束，测速任务将**自动挂起排队**；待全部订阅拉取与去重完成生成最新节点库后，再无缝开始测速，确保测速数据百分之百准确。
              </p>
            </div>
          </div>

          {/* Module 4: 性能与并发参数微调 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-slate-400" /> 高级并发与超时参数
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  单节点超时阈值
                </label>
                <select
                  value={settings.timeoutMs}
                  onChange={(e) => onUpdateSettings({ timeoutMs: Number(e.target.value) })}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value={2000}>2.0 秒 (极速筛查)</option>
                  <option value={3500}>3.5 秒 (推荐平衡)</option>
                  <option value={5000}>5.0 秒 (高容忍度)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  TCP 测速并发池
                </label>
                <select
                  value={settings.concurrency}
                  onChange={(e) => onUpdateSettings({ concurrency: Number(e.target.value) })}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value={15}>15 线程并发</option>
                  <option value={25}>25 线程并发 (推荐)</option>
                  <option value={40}>40 线程并发</option>
                  <option value={50}>50 线程并发 (高速)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  IP 定位并发池
                </label>
                <select
                  value={settings.geoConcurrency}
                  onChange={(e) => onUpdateSettings({ geoConcurrency: Number(e.target.value) })}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value={6}>6 并发</option>
                  <option value={12}>12 并发 (推荐)</option>
                  <option value={20}>20 并发</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>配置已实时保存在本地存储与云端同步中</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 transition-colors active:scale-95"
          >
            完成并关闭
          </button>
        </div>

      </div>
    </div>
  );
};
