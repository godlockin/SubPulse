import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, Clock, Gauge } from 'lucide-react';
import { TestProgress } from '../types/subscription';

interface ProgressBarProps {
  progress: TestProgress;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  if (!progress.isRunning && progress.completed === 0) return null;

  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="glass-panel my-3 rounded-xl border border-indigo-500/30 p-3.5 shadow-xl animate-in fade-in duration-300">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className={`h-4 w-4 text-emerald-400 ${progress.isRunning ? 'animate-spin' : ''}`} />
          <span className="text-xs font-semibold text-white">
            {progress.isRunning ? '正在进行本机并发测速...' : '测速完成'}
          </span>
          <span className="text-xs font-mono text-indigo-400 font-bold">
            {progress.completed} / {progress.total} ({percent}%)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> 可用: {progress.success}
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" /> 超时: {progress.timeout}
          </span>
          {progress.avgLatency > 0 && (
            <span className="flex items-center gap-1 text-cyan-300">
              <Gauge className="h-3.5 w-3.5" /> 平均延迟: {progress.avgLatency}ms
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300 shadow-sm"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
