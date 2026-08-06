import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  Search,
  Zap,
  Layers,
  Globe,
  Download,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Terminal,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Server
} from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayTour?: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
  onReplayTour
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'architecture' | 'faq' | 'deployment'>('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<Record<string, boolean>>({
    faq_1: true,
    faq_2: true
  });

  if (!isOpen) return null;

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const faqList = [
    {
      id: 'faq_1',
      category: '测速原理',
      question: '为什么部分节点会显示“超时”或 9999ms 延迟？',
      answer: `浏览器环境测速受 HTTPS/Mixed Content 安全机制约束：
1. 若当前页面通过 HTTPS 访问，直接探针部分非 HTTP/WebSocket 协议或未部署 CORS/SSL 的节点时，浏览器会因安全限制阻断请求，从而标记为超时。
2. 节点的服务器网络可能设置了禁 Ping 或限制来源 IP 的防火墙规则。
3. <b>解决方法</b>：建议切换到 HTTP 环境访问，或者关注显示 OK 可用且具有真实延迟响应的优质节点。`
    },
    {
      id: 'faq_2',
      category: '去重逻辑',
      question: 'SubPulse 是如何精准剔除跨订阅重复节点的？',
      answer: `SubPulse 不简单根据节点名称比对，而是提取节点的物理连接核心元数据计算 Fingerprint 哈希：
指纹计算公式：SHA256(Protocol + Server + Port + Secret/UUID + Path/SNI)
如果来自不同订阅源的两个节点拥有完全相同的核心连接属性，无论名称是否被修改（例如订阅A叫“HK-01”，订阅B叫“香港01”），系统都会将其判定为同一个物理节点，并在卡片上聚合显示两个订阅源标签。`
    },
    {
      id: 'faq_3',
      category: '客户端导入',
      question: '导出的 Clash YAML 或 Base64 订阅如何在客户端中使用？',
      answer: `1. <b>Clash / Clash Verge / Stash</b>：在 Header 点击「导出」 -> 「Clash 配置 (YAML)」，将下载的 yaml 文件直接拖入 Clash 的 Profile 配置文件列表中即可。
2. <b>v2rayN / Shadowrocket / Quantumult X</b>：点击「导出」 -> 「Base64 订阅」，会导出包含当前筛选节点 URI 的加密订阅，可以直接复制并填入客户端的订阅地址链接中。`
    },
    {
      id: 'faq_4',
      category: '隐私安全',
      question: '使用 SubPulse 是否会泄露我的订阅链接或密码？',
      answer: `<b>完全零泄露、纯本地执行</b>：
1. 节点解析、指纹去重以及并发测速全部在您的浏览器 Client-Side 端实时计算。
2. 没有任何后端服务器或第三方平台记录您的节点 Secret 或订阅地址。
3. 如果使用了 API 模式，数据仅使用您本地生成的匿名 Device-ID 保存在您自己的 SQLite 或 Cloudflare KV 中。`
    },
    {
      id: 'faq_5',
      category: 'IP 归属地与诈骗识别',
      question: '什么是“节点名称与 IP 归属地不符”警示？',
      answer: `部分免费或劣质订阅供应商会将节点命名为“香港 01”或“日本 02”，但其真实 Server IP 实际上映射到其他高延迟地区（如美国、阿根廷）。SubPulse 在执行 IP Geo 检测后，会自动核对节点名称中的地名与 IP 真实归属，发现明显冲突时会在卡片上标红预警，帮您避开虚假宣传节点。`
    }
  ];

  const filteredFaqs = faqList.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel relative w-full max-w-4xl rounded-2xl border border-slate-700/70 bg-slate-950/95 shadow-2xl overflow-hidden flex flex-col h-[88vh]">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                SubPulse 使用指南与帮助中心
              </h2>
              <p className="text-xs text-slate-400">系统的核心机制解析、快速上手步骤与常见问题答疑</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onReplayTour && (
              <button
                onClick={() => {
                  onClose();
                  onReplayTour();
                }}
                className="hidden sm:flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>重新播放 5 步动画 Tour</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-900/20">
          
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🚀 快速上手
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🧠 原理解析
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'faq'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ❓ FAQ 答疑 ({faqList.length})
            </button>
            <button
              onClick={() => setActiveTab('deployment')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'deployment'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ☁️ 部署指南
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索指南或 FAQ 关键词..."
              className="w-full rounded-lg bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-slate-200 border border-slate-800 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 text-slate-200 space-y-6 text-xs">
          
          {/* TAB 1: 快速上手 (Quick Start) */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-cyan-950/40 p-4 border border-indigo-500/20">
                <h3 className="text-sm font-bold text-white mb-1">SubPulse 4 步高效工作流</h3>
                <p className="text-slate-400">仅需几秒钟即可完成订阅解析、重复剔除与优选导出</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs">1</span>
                    <span>添加/导入订阅地址</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    点击 Header 顶部的 <b>「订阅管理」</b> 按钮，支持批量填入通用 HTTP/HTTPS 订阅链接或 Base64 文本。系统会自动进行 CORS 备用代理探测，确保订阅能顺利被拉取。
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-cyan-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-xs">2</span>
                    <span>查看去重后节点列表</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    拉取到的原始节点将自动通过 Fingerprint 引擎去重。您可以在节点卡片上直观看到该节点被多少个订阅源共同包含，避免重复测试。
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs">3</span>
                    <span>执行本机高并发测速</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    点击 <b>「并发测速」</b> 按钮，浏览器端将以 25 并发连接池并发对节点发起探测。同时可点击 <b>「检测 IP 归属地」</b> 查验节点地理真实性。
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900/60 p-4 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs">4</span>
                    <span>最佳节点识别与导出</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    界面顶部的 <b>BestNodeSelector</b> 会实时高亮延迟最低、质量最好的最优节点。筛选满意后点击 <b>「导出」</b> 保存为 Clash 配置或 Base64。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 原理解析 (Architecture) */}
          {activeTab === 'architecture' && (
            <div className="space-y-6">
              
              <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-400">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>为什么直接在浏览器端 (Browser-side Local Prober) 测速？</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  许多在线代理测试工具部署在云端服务器或 Cloudflare 边缘 Node 上，它们测出来的延迟是 <b>“Cloudflare 到节点的延迟”</b>，与您在家中/公司网络使用时的实际延迟天差地别。
                </p>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300">
                  [您的设备/浏览器] --(真实宽带延迟 Ping)--&gt; [VPN代理节点 Server]
                </div>
                <p className="text-slate-400">
                  SubPulse 的核心创新是将所有探针逻辑写入浏览器 JavaScript 中。无论应用部署在哪里，发起 HTTP/TCP 请求的都是您本人的物理网络。
                </p>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                  <Layers className="h-4 w-4" />
                  <span>Fingerprint 指纹算法如何进行节点去重？</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  在许多场景中，不同机场/订阅提供商会给同一个真正的服务器取不同的名字。如果简单按节点名称去重，必然遗漏或者产生误杀。
                </p>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <div>Fingerprint = Hash(Protocol + Server + Port + Secret/UUID + Path/SNI)</div>
                  <div className="text-emerald-400">✅ 只要底层连接三要素一致，即判定为相同节点并融合展现</div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                  <Globe className="h-4 w-4" />
                  <span>IP 归属地核验与 Location Mismatch 检测原理</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  节点名称常常包含“香港”、“日本”等旗帜。SubPulse 通过高并发 IP Geo API 提取节点 <code>Server Host/IP</code> 的真实物理国家 (Country Code) 和 ISP 运营商信息。如果节点名称宣称为香港 (HK) 但物理 IP 属于美国 (US)，系统将自动高亮显示警告。
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: FAQ 答疑 */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400 mb-2">
                共找到 {filteredFaqs.length} 条常见问题答疑：
              </div>
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedFaq[faq.id];
                return (
                  <div
                    key={faq.id}
                    className="rounded-xl bg-slate-900/70 border border-slate-800 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex items-center gap-2 font-semibold text-slate-200">
                        <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0" />
                        <span>[{faq.category}] {faq.question}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div
                        className="px-4 pb-4 text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3 bg-slate-950/40"
                        dangerouslySetInnerHTML={{ __html: faq.answer }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: 部署指南 (Deployment) */}
          {activeTab === 'deployment' && (
            <div className="space-y-6">
              
              <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
                  <Server className="h-4 w-4" />
                  <span>一键部署至 Cloudflare Pages (推荐)</span>
                </div>
                <p className="text-slate-300">
                  SubPulse 完全兼容 Cloudflare Pages 免费托管服务，且提供强大的 Edge Function 支持！
                </p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-2 text-slate-300">
                  <div className="text-slate-500"># 编译打包</div>
                  <div>npm run build</div>
                  <div className="text-slate-500 mt-2"># Wrangler 部署</div>
                  <div>npx wrangler pages deploy dist --project-name=sub-pulse</div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-5 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-400">
                  <Terminal className="h-4 w-4" />
                  <span>本地 Docker / Node 开发运行</span>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                  <div>git clone &lt;repo_url&gt;</div>
                  <div>npm install</div>
                  <div>npm run dev</div>
                  <div className="text-emerald-400 mt-1"># 访问 http://localhost:3000</div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>SubPulse v1.0.0 • 开源全本地隐私安全的 VPN 订阅与测速中心</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 font-semibold text-white hover:bg-indigo-500 transition-all shadow-sm"
          >
            知道了 / 关闭文档
          </button>
        </div>

      </div>
    </div>
  );
};
