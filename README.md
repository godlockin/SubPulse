# VPN 订阅管理与本地并发测速中心 (sub-manager)

一个用于维护 VPN/代理订阅链接、定时/手动拉取远程节点、节点跨订阅自动去重，并基于**本机网络环境**并发测速与超时检测的现代化 Web 应用。

---

## 核心特性

- 🚀 **跨订阅节点去重 (Deduplication Engine)**
  - 基于 `(Protocol, Server, Port, Secret, Path, SNI)` 生成 Fingerprint 哈希，自动消除重复节点，并在节点卡片上标注包含该节点的所有订阅源。
- ⚡ **本机网络高并发测速 (Local Network Parallel Prober)**
  - 无论是**本地部署**还是部署在 **Cloudflare Pages**，测速引擎均直接在**您的浏览器端**发起，直接测量您**本机实际网络**到节点的延迟和超时状态，而不是显示 Cloudflare 边缘节点的速度。
- 🔄 **多协议解析 (Protocol Parser)**
  - 支持 Base64 编码订阅、VMess (`vmess://`)、VLESS (`vless://`)、Trojan (`trojan://`)、Shadowsocks (`ss://`)、Hysteria2 (`hy2://`) 以及 Clash YAML 配置解析。
- 📊 **多视图与过滤排序**
  - 支持「去重视图」与「按订阅分组视图」一键切换。
  - 支持按节点名称、IP/服务器模糊搜索，按协议/可用状态筛选，按延迟/名称排序。
- 📤 **一键导出**
  - 支持将筛选/优选后的节点一键导出为 Base64 订阅文本或 Clash YAML 配置文件。
- ☁️ **本地 / Cloudflare 双部署支持**
  - 本地 Vite 开发/服务启动，或一键部署至 Cloudflare Pages。

---

## 本地部署运行

```bash
# 1. 进入项目目录
cd sub-manager

# 2. 安装依赖
npm install

# 3. 启动本地开发服务 (http://localhost:3000)
npm run dev

# 4. 构建生产打包
npm run build
```

---

## Cloudflare Pages 部署指南

### 方式 A: 通过 Wrangler CLI 命令行部署
```bash
# 编译应用
npm run build

# 部署至 Cloudflare Pages
npx wrangler pages deploy dist --project-name=sub-manager
```

### 方式 B: 通过 Cloudflare Dashboard 绑定 GitHub 仓库
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages**.
2. 点击 **Create application** -> **Pages** -> **Connect to Git**.
3. 选择该仓库，构建设置配置如下：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 点击 **Save and Deploy** 即可发布。
