import React, { useState } from 'react';
import { X, Plus, Trash2, Edit3, Link, AlertCircle, Clock, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Subscription } from '../types/subscription';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptions: Subscription[];
  onAddSubscription: (name: string, url: string, autoUpdateHours: number) => void;
  onUpdateSubscription: (id: string, name: string, url: string, autoUpdateHours: number) => void;
  onDeleteSubscription: (id: string) => void;
  onToggleSubscription: (id: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscriptions,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onToggleSubscription
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [hours, setHours] = useState(6);
  const [errorMsg, setErrorMsg] = useState('');

  // Expandable inline edit state
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editHours, setEditHours] = useState(6);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('请输入订阅名称');
      return;
    }
    if (!url.trim() || !url.startsWith('http')) {
      setErrorMsg('请输入有效的订阅 HTTP/HTTPS 链接');
      return;
    }
    setErrorMsg('');
    onAddSubscription(name.trim(), url.trim(), hours);
    setName('');
    setUrl('');
  };

  const handleStartEdit = (sub: Subscription) => {
    setEditingSubId(sub.id);
    setEditName(sub.name);
    setEditUrl(sub.url);
    setEditHours(sub.autoUpdateHours || 6);
    setEditErrorMsg('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      setEditErrorMsg('订阅名称不能为空');
      return;
    }
    if (!editUrl.trim() || !editUrl.startsWith('http')) {
      setEditErrorMsg('请输入有效的 HTTP/HTTPS 链接');
      return;
    }
    setEditErrorMsg('');
    onUpdateSubscription(id, editName.trim(), editUrl.trim(), editHours);
    setEditingSubId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">VPN 订阅链接维护与编辑</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 mt-4 space-y-6">
          {/* Add New Subscription Form */}
          <form onSubmit={handleSubmit} className="rounded-xl bg-slate-900/60 p-4 border border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> 添加新订阅链接
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">订阅名称</label>
                <input
                  type="text"
                  placeholder="例: 香港优选节点包"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">自动更新间隔 (小时)</label>
                <select
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>每 1 小时</option>
                  <option value={6}>每 6 小时</option>
                  <option value={12}>每 12 小时</option>
                  <option value={24}>每 24 小时</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">订阅 URL 链接</label>
              <input
                type="url"
                placeholder="https://example.com/sub/xxx"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            {errorMsg && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>保存订阅</span>
              </button>
            </div>
          </form>

          {/* Existing Subscriptions List */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              已维护订阅列表 ({subscriptions.length})
            </h3>

            <div className="space-y-3">
              {subscriptions.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-500">暂未添加任何订阅源</p>
              ) : (
                subscriptions.map((sub) => {
                  const isEditing = editingSubId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className={`rounded-xl border transition-all ${
                        sub.enabled
                          ? 'bg-slate-900/80 border-slate-800'
                          : 'bg-slate-950/50 border-slate-900 opacity-60'
                      }`}
                    >
                      {/* Subscription Header View */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5">
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white truncate">{sub.name}</span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-cyan-400 font-mono">
                              {sub.nodeCount} 节点
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{sub.url}</p>

                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-indigo-400" />
                              更新频率: {sub.autoUpdateHours} 小时/次
                            </span>
                            <span>
                              上次更新: {sub.lastUpdated ? new Date(sub.lastUpdated).toLocaleTimeString() : '未更新'}
                            </span>
                          </div>

                          {sub.error && (
                            <p className="text-[10px] text-rose-400 mt-1 truncate">错误: {sub.error}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <button
                            onClick={() => onToggleSubscription(sub.id)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                              sub.enabled
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {sub.enabled ? '已启用' : '已禁用'}
                          </button>

                          <button
                            onClick={() => (isEditing ? setEditingSubId(null) : handleStartEdit(sub))}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium border transition-colors ${
                              isEditing
                                ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                            title="编辑订阅配置"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>{isEditing ? '收起' : '编辑'}</span>
                            {isEditing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>

                          <button
                            onClick={() => onDeleteSubscription(sub.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-950/50 hover:text-rose-400 transition-colors"
                            title="删除订阅"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Collapsible Edit Panel */}
                      {isEditing && (
                        <div className="border-t border-slate-800/80 bg-slate-950/80 p-4 rounded-b-xl animate-in fade-in slide-in-from-top-1 duration-150">
                          <h4 className="text-xs font-semibold text-indigo-400 mb-3 flex items-center gap-1">
                            <Edit3 className="h-3.5 w-3.5" /> 展开编辑订阅设置
                          </h4>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">显示名称</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">自动更新间隔</label>
                              <select
                                value={editHours}
                                onChange={(e) => setEditHours(Number(e.target.value))}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                              >
                                <option value={1}>每 1 小时</option>
                                <option value={6}>每 6 小时</option>
                                <option value={12}>每 12 小时</option>
                                <option value={24}>每 24 小时</option>
                              </select>
                            </div>
                          </div>

                          <div className="mt-3">
                            <label className="block text-xs font-medium text-slate-400 mb-1">订阅 URL 链接</label>
                            <input
                              type="url"
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                            />
                          </div>

                          {editErrorMsg && (
                            <p className="mt-2 text-xs text-rose-400">{editErrorMsg}</p>
                          )}

                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingSubId(null)}
                              className="px-3 py-1 text-xs rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
                            >
                              取消
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(sub.id)}
                              className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>保存更新</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
