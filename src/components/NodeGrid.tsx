import React, { useState } from 'react';
import { DeduplicatedNode, Subscription } from '../types/subscription';
import { NodeCard } from './NodeCard';
import { Folder, Layers, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, CheckCircle2 } from 'lucide-react';

interface NodeGridProps {
  nodes: DeduplicatedNode[];
  subscriptions: Subscription[];
  deduplicate: boolean;
  onTestSingleNode: (node: DeduplicatedNode) => void;
}

export const NodeGrid: React.FC<NodeGridProps> = ({
  nodes,
  subscriptions,
  deduplicate,
  onTestSingleNode
}) => {
  // Track collapsed subscription IDs
  const [collapsedSubs, setCollapsedSubs] = useState<Record<string, boolean>>({});

  const toggleCollapse = (subId: string) => {
    setCollapsedSubs((prev) => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  if (nodes.length === 0) {
    return (
      <div className="glass-panel my-8 rounded-2xl border border-slate-800 p-12 text-center">
        <Layers className="mx-auto h-12 w-12 text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-slate-300">暂无符合条件的节点</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          请点击右上角「订阅管理」添加 VPN 订阅链接，或点击「刷新远程订阅」拉取节点信息。
        </p>
      </div>
    );
  }

  // Deduplicated View
  if (deduplicate) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {nodes.map((node) => (
          <NodeCard key={node.fingerprint} node={node} onTestSingleNode={onTestSingleNode} />
        ))}
      </div>
    );
  }

  // Grouped by Subscription View
  const subMap = new Map<string, DeduplicatedNode[]>();
  nodes.forEach((node) => {
    node.sourceSubscriptions.forEach((sub) => {
      if (!subMap.has(sub.id)) {
        subMap.set(sub.id, []);
      }
      subMap.get(sub.id)!.push(node);
    });
  });

  const subEntries = Array.from(subMap.entries());

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    subEntries.forEach(([id]) => (next[id] = true));
    setCollapsedSubs(next);
  };

  const handleExpandAll = () => {
    setCollapsedSubs({});
  };

  return (
    <div className="space-y-4">
      {/* Group Actions Bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-slate-400">
          订阅分组列表 ({subEntries.length} 个分组)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ChevronsDown className="h-3.5 w-3.5 text-indigo-400" />
            <span>全部展开</span>
          </button>
          <button
            onClick={handleCollapseAll}
            className="flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ChevronsUp className="h-3.5 w-3.5 text-slate-400" />
            <span>全部折叠</span>
          </button>
        </div>
      </div>

      {/* Subscription Groups */}
      {subEntries.map(([subId, subNodes]) => {
        const subInfo = subscriptions.find((s) => s.id === subId);
        const subName = subInfo ? subInfo.name : '未知订阅';
        const isCollapsed = Boolean(collapsedSubs[subId]);
        const okCount = subNodes.filter((n) => n.status === 'ok').length;

        return (
          <div key={subId} className="glass-panel rounded-2xl border border-slate-800/80 overflow-hidden transition-all">
            
            {/* Collapsible Group Header */}
            <div
              onClick={() => toggleCollapse(subId)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/40 select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <button className="text-slate-400 hover:text-white">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-indigo-400" />
                  )}
                </button>
                <Folder className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">{subName}</h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs text-indigo-300 border border-slate-800 font-mono">
                  共 {subNodes.length} 节点
                </span>
                {okCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-950/60 px-2.5 py-0.5 text-xs text-emerald-400 border border-emerald-900/50 font-mono">
                    <CheckCircle2 className="h-3 w-3" />
                    可用 {okCount}
                  </span>
                )}
              </div>
            </div>

            {/* Collapsible Content */}
            {!isCollapsed && (
              <div className="p-4 pt-0 border-t border-slate-800/40">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-3">
                  {subNodes.map((node) => (
                    <NodeCard
                      key={`${subId}_${node.fingerprint}`}
                      node={node}
                      onTestSingleNode={onTestSingleNode}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
};

