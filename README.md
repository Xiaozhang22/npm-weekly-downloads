# NPM Weekly Downloads Tracker

部署在 Cloudflare Pages 上的 npm 包周下载量追踪与对比工具。
无需本地安装任何工具，所有操作在 GitHub + Cloudflare Dashboard 中完成。

## 功能

- 按周（周四 ~ 周三）展示多个 npm 包的下载量对比
- 动态添加 / 删除要追踪的 npm 包
- 自动刷新：数据超过 12 小时自动在后台更新，超过 24 小时访问时同步更新
- 支持导出 CSV 文件
- 响应式设计，支持移动端

## 技术栈

| 组件 | 技术 |
|------|------|
| 托管 & 部署 | Cloudflare Pages（连接 GitHub 自动部署） |
| API | Pages Functions（functions/ 目录） |
| 数据存储 | Cloudflare KV |
| 前端 | 原生 HTML / CSS / JS（无框架） |
| 数据来源 | npm registry API |

## 项目结构

```
npm-weekly-downloads/
├── README.md
├── package.json
├── wrangler.toml              # 仅本地开发用（可选）
├── functions/                 # Pages Functions（API）
│   ├── _lib.js                # 共享工具：npm 数据获取、按周汇总
│   └── api/
│       ├── _middleware.js     # CORS 中间件
│       ├── packages.js        # GET / POST / DELETE /api/packages
│       └── refresh.js         # POST /api/refresh
└── public/                    # 静态前端
    ├── index.html
    ├── style.css
    └── script.js
```

---

## 部署流程

> 全程无需在本地安装 Node.js、Wrangler 或任何依赖。
> 只需一个 GitHub 账号和一个 Cloudflare 账号。

---

### 第一步：上传代码到 GitHub

1. 登录 [GitHub](https://github.com)，点击右上角 **+** → **New repository**
2. 仓库名填 `npm-weekly-downloads`，可见性选 Public 或 Private，点击 **Create repository**
3. 将本项目所有文件上传到仓库（可以用 GitHub 网页拖拽上传，或本地 git push）

如果用本地 git：

```bash
cd npm-weekly-downloads
git init
git add .
git commit -m "init"
git remote add origin https://github.com/<你的用户名>/npm-weekly-downloads.git
git push -u origin main
```

---

### 第二步：在 Cloudflare 创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单点击 **Workers & Pages**
3. 点击 **KV** 标签页
4. 点击 **Create a namespace**
5. 名称填 `NPM_DATA`，点击 **Add**
6. 创建成功，记住这个名称，后续绑定用

---

### 第三步：创建 Pages 项目并连接 GitHub

1. 在 Cloudflare Dashboard 左侧点击 **Workers & Pages**
2. 点击 **Create** 按钮
3. 选择 **Pages** 标签页，点击 **Connect to Git**
4. 授权 Cloudflare 访问你的 GitHub 账号
5. 选择 `npm-weekly-downloads` 仓库
6. 配置构建设置：

| 配置项 | 值 |
|--------|-----|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | 留空（不填） |
| Build output directory | `public` |

7. 点击 **Save and Deploy**
8. 等待部署完成（通常 1~2 分钟）

部署成功后会得到一个访问地址，如：
```
https://npm-weekly-downloads.pages.dev
```

> 此时访问页面会提示 KV 未绑定，这是正常的，继续下一步。

---

### 第四步：绑定 KV 到 Pages Functions

1. 在 Workers & Pages 页面，点击刚创建的 `npm-weekly-downloads` 项目
2. 进入 **Settings** 标签页
3. 左侧找到 **Bindings**
4. 点击 **Add**
5. 选择 **KV namespace**
6. 填写：

| 配置项 | 值 |
|--------|-----|
| Variable name | `NPM_DATA` |
| KV namespace | 选择第二步创建的 `NPM_DATA` |

7. 点击 **Save**

> **重要**：绑定后需要重新部署才能生效。
> 进入 **Deployments** 标签页，找到最新的部署，点击右侧 **...** 菜单 → **Retry deployment**。

---

### 第五步：访问页面，数据自动初始化

1. 打开你的 Pages 地址（如 `https://npm-weekly-downloads.pages.dev`）
2. 首次访问时，后端会自动从 npm 拉取 3 个默认包的下载数据
3. 首次加载可能需要几秒钟，之后访问会很快（数据缓存在 KV 中）

如果数据未自动加载，点击页面上的 **Refresh** 按钮手动触发。

---

### 第六步：绑定自定义域名

1. 在 Pages 项目页面，进入 **Custom domains** 标签页
2. 点击 **Set up a custom domain**
3. 输入你的域名，如 `npm-down.zx1993.top`
4. 点击 **Continue**
5. Cloudflare 会自动添加 DNS CNAME 记录，点击 **Activate domain**
6. 等待 DNS 生效（通常几分钟，最长 24 小时）

生效后即可通过 `https://npm-down.zx1993.top` 访问。

> 前提：域名 `zx1993.top` 必须已托管在 Cloudflare DNS 上。

---

## 操作完成后的检查清单

- [ ] GitHub 仓库已创建，代码已上传
- [ ] KV 命名空间 `NPM_DATA` 已创建
- [ ] Pages 项目已创建并连接 GitHub
- [ ] KV 已绑定到 Pages Functions（Variable name = `NPM_DATA`）
- [ ] 绑定后已重新部署（Retry deployment）
- [ ] 页面可正常访问，数据已加载
- [ ] 自定义域名已绑定（可选）

---

## Dashboard 操作速查

| 操作 | 路径 |
|------|------|
| 查看项目 | Workers & Pages → npm-weekly-downloads |
| 查看部署日志 | 项目 → Deployments → 点击某次部署 |
| 管理 KV 数据 | Workers & Pages → KV → NPM_DATA |
| 修改 KV 绑定 | 项目 → Settings → Bindings |
| 绑定自定义域名 | 项目 → Custom domains |
| 查看 Functions 日志 | 项目 → Functions (beta) |

---

## 使用说明

| 功能 | 操作 |
|------|------|
| 添加包 | 输入框输入完整包名（如 `react` 或 `@scope/name`），点击 Add |
| 删除包 | 点击包名标签右侧的 x |
| 手动刷新 | 点击 Refresh 按钮 |
| 下载数据 | 点击 Download CSV 按钮 |

---

## 数据自动更新机制

由于 Pages Functions 不支持 Cron 定时任务，本项目使用**访问时自动刷新**：

| 数据年龄 | 行为 |
|----------|------|
| < 12 小时 | 直接返回缓存数据 |
| 12 ~ 24 小时 | 立即返回缓存数据，后台异步刷新 |
| > 24 小时 或 无数据 | 同步刷新后返回最新数据（稍慢几秒） |

只要每天有人访问页面，数据就会保持最新。也可以随时点击 **Refresh** 按钮手动更新。

---

## 数据说明

- **数据来源**：[npm downloads API](https://github.com/npm/registry/blob/master/docs/download-counts.md)
- **周期**：每周四 ~ 周三（npm 官方统计周期）
- **范围**：最近一年（npm API 限制）
- **当前周**：黄色高亮显示（数据尚不完整）

---

## 免费额度

Cloudflare 免费计划完全够用：

| 资源 | 额度 |
|------|------|
| Pages 部署 | 500 次 / 月 |
| Functions 请求 | 100,000 次 / 天 |
| KV 读取 | 100,000 次 / 天 |
| KV 写入 | 1,000 次 / 天 |

---

## 后续更新

代码推送到 GitHub 后，Pages 会**自动重新部署**。无需手动操作。

```bash
# 修改代码后
git add .
git commit -m "update"
git push
```

Cloudflare Pages 检测到 push 后自动构建部署，通常 1~2 分钟生效。

---

## 常见问题

**Q: 页面显示 "KV not bound"**
KV 未绑定或绑定后未重新部署。按第四步操作，绑定后务必 Retry deployment。

**Q: 添加包提示 "Cannot fetch"**
包名需要和 npm 上完全一致。带 scope 的包用 `@scope/name` 格式。先去 [npmjs.com](https://www.npmjs.com) 搜索确认。

**Q: 首次访问很慢**
正常现象。首次访问需要从 npm API 拉取所有包的数据（约 3~5 秒），之后访问从 KV 缓存读取会很快。

**Q: 自定义域名不生效**
确认域名已托管在 Cloudflare，DNS 记录已添加。新域名 DNS 传播可能需要几分钟到数小时。
