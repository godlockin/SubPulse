import React, { useState } from 'react';
import {
  X,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Globe,
  Download,
  FolderPlus,
  Shield,
  Sparkles,
  Play
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocs: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenDocs
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('subpulse_onboarding_seen', 'true');
    } else {
      localStorage.setItem('subpulse_onboarding_seen', 'true');
    }
    onClose();
  };

  const steps = [
    {
      title: '欢迎使用 SubPulse 订阅测速中心',
      subtitle: '新一代跨订阅去重与本地高并发测速系统',
      badge: '快速了解',
      content: (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-cyan-950/40 p-6 border border-indigo-500/20 shadow-2xl">
            {/* Animated Background Orbs */}
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl animate-pulse" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl animate-pulse" />

            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 shadow-xl shadow-indigo-500/30">
                <Zap className="h-10 w-10 text-white animate-bounce" />
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-lg font-semibold text-white">告别无效节点，精准测量真实速度</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  SubPulse 解决传统测速工具只看服务器所在国、不测本地真实延迟的痛点。不论应用部署在本地还是 Cloudflare，探针均在<b>您的浏览器端</b>直接对节点发起响应测试。
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left text-xs">
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <Layers className="h-4 w-4" />
                <span>自动去重</span>
              </div>
              <p className="text-[11px] text-slate-400">Fingerprint 哈希跨订阅去重，消除冗余节点</p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Zap className="h-4 w-4" />
                <span>本地测速</span>
              </div>
              <p className="text-[11px] text-slate-400">本机网络高并发探测，呈现真实连接耗时</p>
            </div>
            <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <Download className="h-4 w-4" />
                <span>一键导出</span>
              </div>
              <p className="text-[11px] text-slate-400">优选节点一键打包为 Base64 或 Clash YAML</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '第一步：添加与拉取订阅',
      subtitle: '轻松管理多个 VPN / 代理订阅源',
      badge: '订阅管理',
      content: (
        <div className="space-y-4 text-left">
          <div className="relative rounded-xl bg-slate-900/90 p-5 border border-slate-800">
            {/* Visual Step Illustration */}
            <div className="flex items-center justify-between gap-2 mb-4 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-indigo-300">
                <FolderPlus className="h-4 w-4 text-indigo-400" />
                <span>订阅源 A, B, C...</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 animate-pulse" />
              <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                <RefreshCwIcon />
                <span>CORS 备用代理自动解析</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 animate-pulse" />
              <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>解析多协议节点</span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[10px]">1</span>
                <span>点击顶部 <b>「订阅管理」</b> 按钮，粘贴您的订阅链接 (如通用 Base64、v2rayN、Clash 等格式)。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[10px]">2</span>
                <span>系统支持定时自动刷新，也可以手动点击 <b>「刷新远程订阅」</b> 获取最新节点。</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-[10px]">3</span>
                <span>支持协议：<code>VMess</code>、<code>VLESS</code>、<code>Trojan</code>、<code>SS</code>、<code>Hysteria2</code>、<code>Clash YAML</code>。</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: '第二步：跨订阅智能节点去重',
      subtitle: '精准识别并聚合相同服务器与秘钥的重复节点',
      badge: '去重引擎',
      content: (
        <div className="space-y-4 text-left">
          <div className="rounded-xl bg-slate-900/90 p-5 border border-slate-800 space-y-4">
            {/* Deduplication Visual Demo Card */}
            <div className="rounded-lg bg-slate-950 p-3 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">🔍 独立 Fingerprint 哈希比对</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                  (Protocol + Server + Port + Secret + Path)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300">
                  <div className="font-bold">传统列表 (有重复)</div>
                  <div className="text-[10px] text-slate-400 mt-1">订阅A: HK-01 (1.1.1.1:443)</div>
                  <div className="text-[10px] text-slate-400">订阅B: 香港节点-01 (1.1.1.1:443)</div>
                </div>
                <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
                  <div className="font-bold">SubPulse (自动融合)</div>
                  <div className="text-[10px] text-emerald-200 mt-1 font-semibold">HK-01 [订阅A, 订阅B]</div>
                  <div className="text-[10px] text-emerald-400">已消除冗余测速损耗 ⚡</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              在去重视图下，卡片会自动标出该节点归属的**所有订阅源**。点击顶部工具栏的 <b>「已去重 / 未去重」</b> 开关可随时切换视图。
            </p>
          </div>
        </div>
      )
    },
    {
      title: '第三步：本机并发测速与 IP 归属地检测',
      subtitle: '直接测量您的设备到节点网络的实际响应延迟',
      badge: '并发探针',
      content: (
        <div className="space-y-4 text-left">
          <div className="rounded-xl bg-slate-900/90 p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="relative flex h-12 w-12 items-center justify-center shrink-0 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                <Globe className="h-6 w-6 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-emerald-300">本机网络直连探测 (Local Browser Ping)</div>
                <p className="text-slate-400 text-[11px]">
                  直接在您的浏览器发起 TCP/HTTP 探针，测量您的宽带/移动网络连接节点的<b>真实延迟</b>，而非云端中转速度。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-cyan-400 block mb-1">⚡ 并发测速</span>
                <span className="text-[11px] text-slate-400">点击「并发测速」，几十上百个节点将在数秒内并行测试完成。</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="font-semibold text-amber-400 block mb-1">🌐 IP 归属地检测</span>
                <span className="text-[11px] text-slate-400">检测节点真实物理位置，自动标识“节点名称与 IP 不符”的诱导节点。</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: '第四步：优选节点与一键导出',
      subtitle: '多维过滤排序，快速提取最优质的代理配置',
      badge: '优选导出',
      content: (
        <div className="space-y-4 text-left">
          <div className="rounded-xl bg-slate-900/90 p-5 border border-slate-800 space-y-4">
            <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-950/80 to-indigo-950/80 border border-emerald-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" />
                <div>
                  <div className="font-bold text-white">Lowest Latency Standard 最低延迟推荐</div>
                  <div className="text-[11px] text-slate-300">自动从全量节点中甄选当前响应最快、可用性最高的节点</div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold font-mono">
                TOP NODE
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                <span><b>筛选与排序</b>：按协议 (VLESS/VMess/Trojan/Hysteria2)、模糊名称/IP、延迟排序。</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span><b>一键导出</b>：导出为 <code>Base64 订阅文本</code> 或 <code>Clash YAML 配置文件</code>。</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800">
              <span className="text-slate-400">需要更详细的常见问题解答？</span>
              <button
                onClick={() => {
                  onClose();
                  onOpenDocs();
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4"
              >
                查看完整使用文档 & FAQ →
              </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel relative w-full max-w-2xl rounded-2xl border border-slate-700/70 bg-slate-950/95 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
              {currentStepData.badge} ({currentStep + 1}/{steps.length})
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Title & Subtitle */}
        <div className="py-4 space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white">{currentStepData.title}</h2>
          <p className="text-xs text-slate-400">{currentStepData.subtitle}</p>
        </div>

        {/* Dynamic Step Content */}
        <div className="flex-1 overflow-y-auto py-2">
          {currentStepData.content}
        </div>

        {/* Step Progress Dots */}
        <div className="flex justify-center gap-1.5 py-3">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-6 bg-indigo-500'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>不再自动显示此引导</span>
          </label>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>上一步</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-900/40"
              >
                <span>下一步</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-1.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-900/40"
              >
                <Play className="h-3.5 w-3.5" />
                <span>开始体验 SubPulse</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

function RefreshCwIcon() {
  return (
    <svg className="h-4 w-4 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
