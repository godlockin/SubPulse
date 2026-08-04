import React from 'react';
import { Search, Filter, ArrowUpDown, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { FilterOptions, Subscription } from '../types/subscription';

interface FilterBarProps {
  options: FilterOptions;
  subscriptions: Subscription[];
  protocols: string[];
  onChangeOptions: (newOptions: Partial<FilterOptions>) => void;
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  options,
  subscriptions,
  protocols,
  onChangeOptions,
  totalFilteredCount
}) => {
  return (
    <div className="glass-panel my-4 rounded-xl border border-slate-800/80 p-3.5 shadow-lg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索节点名称、IP 服务器或端口..."
            value={options.search}
            onChange={(e) => onChangeOptions({ search: e.target.value })}
            className="w-full rounded-lg bg-slate-950/80 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Subscription Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">订阅:</span>
            <select
              value={options.subscriptionId}
              onChange={(e) => onChangeOptions({ subscriptionId: e.target.value })}
              className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">全部订阅</option>
              {subscriptions.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Protocol Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400">协议:</span>
            <select
              value={options.protocol}
              onChange={(e) => onChangeOptions({ protocol: e.target.value })}
              className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none uppercase"
            >
              <option value="all">全部协议</option>
              {protocols.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                onChangeOptions({
                  status: options.status === 'ok' ? 'all' : 'ok'
                })
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                options.status === 'ok'
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>仅看可用</span>
            </button>

            {/* Mismatch Filter */}
            <button
              onClick={() =>
                onChangeOptions({
                  mismatchOnly: !options.mismatchOnly
                })
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                options.mismatchOnly
                  ? 'bg-amber-950/70 border-amber-800/80 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="只查看节点名称与真实 IP 归属地不一致的节点"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>仅看位置不符</span>
            </button>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-400" />
            <select
              value={options.sortBy}
              onChange={(e) => onChangeOptions({ sortBy: e.target.value as any })}
              className="rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="latency">按延迟排序</option>
              <option value="name">按节点名称</option>
              <option value="protocol">按协议类型</option>
              <option value="subscription">按所属订阅</option>
            </select>

            <button
              onClick={() =>
                onChangeOptions({
                  sortOrder: options.sortOrder === 'asc' ? 'desc' : 'asc'
                })
              }
              className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5 text-xs text-slate-400 hover:text-white"
              title="切换升序/降序"
            >
              {options.sortOrder === 'asc' ? '↑ 升序' : '↓ 降序'}
            </button>
          </div>

        </div>

        {/* Count Label */}
        <div className="text-right text-xs text-slate-500 font-mono">
          当前展示: <span className="text-indigo-400 font-bold">{totalFilteredCount}</span> 个节点
        </div>

      </div>
    </div>
  );
};
