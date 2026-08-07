import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  HelpCircle,
  Play,
  Compass
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocs: () => void;
}

interface StepConfig {
  selector: string;
  badge: string;
  title: string;
  description: string;
  guidance: string;
  icon: React.ReactNode;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onOpenDocs
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: StepConfig[] = [
    {
      selector: '[data-tour="sub-modal-btn"]',
      badge: '第 1 步',
      title: '导入与管理订阅源',
      description: '管理 VPN / 代理订阅源。支持批量添加通用 HTTP/HTTPS 订阅链接、Base64 加密文本或 Clash 配置。系统会自动拉取远程最新节点。',
      guidance: '👉 行为指导：点击此处打开「订阅管理」弹窗，粘贴并同步您的订阅链接。',
      icon: <FolderPlus className="h-5 w-5 text-indigo-400" />
    },
    {
      selector: '[data-tour="speed-test-btn"]',
      badge: '第 2 步',
      title: '一键测速与 IP 归属地定位',
      description: '直接从您的浏览器端并发发起 TCP/HTTP 探针，测量您的物理网络连接节点的真实耗时，同时异步查询 IP 真实物理位置与欺诈重定向告警。',
      guidance: '👉 行为指导：按下该高亮按钮开始「一键测速与 IP 定位」，所有卡片测试结果将实时流式刷新！',
      icon: <Zap className="h-5 w-5 text-amber-400 animate-pulse" />
    },
    {
      selector: '[data-tour="dedup-toggle"]',
      badge: '第 3 步',
      title: '跨订阅智能节点去重',
      description: '基于 Protocol + Server + Port + Secret 计算 Fingerprint 哈希，自动识别不同订阅源中的相同服务器，消除冗余节点并标注源订阅标签。',
      guidance: '👉 行为指导：随时点击此按钮可自由切换「已去重 / 未去重」视图。',
      icon: <Layers className="h-5 w-5 text-cyan-400" />
    },
    {
      selector: '[data-tour="best-node-selector"]',
      badge: '第 4 步',
      title: '多维低延迟节点排行榜',
      description: '系统会自动从全量节点中为您甄选当前响应最快、质量最好的 TOP 最优节点，支持按全网、特定真实地理区域或订阅分组一键提取。',
      guidance: '👉 行为指导：在此区域选择「全网最佳」或「📍 某个真实地区」，可快速复制最低延迟节点链接。',
      icon: <Sparkles className="h-5 w-5 text-amber-400" />
    },
    {
      selector: '[data-tour="export-menu"]',
      badge: '第 5 步',
      title: '优选节点一键打包导出',
      description: '筛选并测速满意后，点击导出菜单即可直接将优选节点转换为通用的 Base64 订阅密文或标准的 Clash YAML 配置文件。',
      guidance: '👉 行为指导：悬停并点击「导出」，选择所需格式下载配置文件，即可直接导入客户端中使用。',
      icon: <Download className="h-5 w-5 text-amber-400" />
    }
  ];

  const currentStepData = steps[currentStep];

  // Update target element positioning box
  const updateTargetPosition = () => {
    if (!isOpen) return;
    const targetEl = document.querySelector(currentStepData.selector);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    // Small delay to allow layout calculation
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 150);

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition);
    };
  }, [currentStep, isOpen]);

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('subpulse_onboarding_seen', 'true');
    onClose();
  };

  // Compute Popover Position relative to target rect
  const isTargetVisible = targetRect && targetRect.width > 0 && targetRect.height > 0;
  const popoverOnTop = targetRect ? targetRect.top > window.innerHeight / 2 : false;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      
      {/* Semi-translucent dark overlay */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity duration-300" />

      {/* Target Element Spotlight Highlight Box */}
      {isTargetVisible && targetRect && (
        <div
          className="absolute z-50 rounded-xl transition-all duration-300 pointer-events-none"
          style={{
            top: `${Math.max(4, targetRect.top - 6)}px`,
            left: `${Math.max(4, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            boxShadow: `0 0 0 9999px rgba(9, 13, 22, 0.82), 0 0 25px 4px rgba(99, 102, 241, 0.6)`,
            border: '2px solid rgba(129, 140, 248, 0.95)'
          }}
        >
          {/* Animated corner glows */}
          <span className="absolute -top-1 -left-1 h-3 w-3 rounded-full bg-indigo-400 animate-ping opacity-75" />
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 animate-ping opacity-75" />
        </div>
      )}

      {/* Floating Popover Step Guidance Card */}
      <div
        className={`fixed z-50 w-full max-w-md p-4 transition-all duration-300 ${
          isTargetVisible && targetRect
            ? 'left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0'
            : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
        }`}
        style={
          isTargetVisible && targetRect
            ? {
                left: `${Math.min(
                  window.innerWidth - 420,
                  Math.max(16, targetRect.left + targetRect.width / 2 - 200)
                )}px`,
                top: popoverOnTop
                  ? `${Math.max(16, targetRect.top - 245)}px`
                  : `${Math.min(window.innerHeight - 260, targetRect.bottom + 16)}px`
              }
            : {}
        }
      >
        <div className="glass-panel relative rounded-2xl border border-indigo-500/40 bg-slate-950/95 p-5 shadow-2xl space-y-4">
          
          {/* Pointer Arrow Indicator */}
          {isTargetVisible && (
            <div
              className={`absolute left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-indigo-500/40 bg-slate-950 ${
                popoverOnTop
                  ? '-bottom-1.5 border-r border-b'
                  : '-top-1.5 border-l border-t'
              }`}
            />
          )}

          {/* Card Top Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {currentStepData.icon}
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-400 tracking-wide uppercase">
                  {currentStepData.badge} / 共 {steps.length} 步
                </span>
                <h3 className="text-sm font-bold text-white leading-snug">{currentStepData.title}</h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              title="关闭引导"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description & Explicit Action Guidance */}
          <div className="space-y-2.5 text-xs">
            <p className="text-slate-300 leading-relaxed">{currentStepData.description}</p>
            
            {/* Highlighted Action Box */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-950/80 to-slate-900 p-3 border border-indigo-500/30 text-indigo-200 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                <Compass className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span>操作指导</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-normal font-medium">{currentStepData.guidance}</p>
            </div>
          </div>

          {/* Step Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep ? 'w-5 bg-indigo-400' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <button
              onClick={() => {
                onClose();
                onOpenDocs();
              }}
              className="text-[11px] text-slate-400 hover:text-indigo-300 font-medium underline underline-offset-4"
            >
              查看完整 FAQ 文档
            </button>

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
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-900/40"
                >
                  <span>下一步 ({currentStep + 1}/{steps.length})</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-bold text-white hover:from-emerald-500 hover:to-teal-500 transition-all shadow-md shadow-emerald-950/40"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>完成引导并体验</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
