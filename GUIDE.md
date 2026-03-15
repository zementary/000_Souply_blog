# SOUPLY 实用操作指南

## 项目概览

SOUPLY 是一个音乐视频策展网站，基于 Astro + React + Tailwind CSS 构建，部署在 Vercel 上。

| 项目 | 说明 |
|------|------|
| 框架 | Astro 5 (SSG) |
| 样式 | Tailwind CSS 3 |
| 交互组件 | React 19 (仅搜索面板 + 播放器) |
| 搜索 | MiniSearch (客户端全文搜索) |
| 内容管理 | MDX + astro:content |
| 部署 | Vercel (Git push 自动部署) |
| 站点 | https://souply-tv.vercel.app |

---

## 目录结构

```
/
├── src/
│   ├── content/videos/     # 视频内容 (~506 个 .mdx 文件)
│   ├── content/config.ts   # 内容 Schema (Zod)
│   ├── pages/
│   │   ├── index.astro           # 首页 (视频网格)
│   │   ├── about.astro           # 关于页
│   │   ├── 404.astro             # 404 页
│   │   ├── videos/[...slug].astro  # 视频详情页
│   │   ├── directors/[...slug].astro # 导演归档页
│   │   └── api/search.json.ts    # 搜索数据 API
│   ├── components/
│   │   ├── VideoCard.astro       # 视频卡片
│   │   ├── Header.astro          # 页头导航
│   │   ├── NavControls.astro     # 底部浮动导航栏
│   │   └── CinemaPlayer.tsx      # 视频播放器 (YouTube/Vimeo)
│   ├── features/search/         # 搜索功能模块
│   ├── layouts/BaseLayout.astro  # 基础布局
│   ├── utils/                   # 工具函数
│   ├── styles/global.css        # 全局样式
│   ├── data/                    # CSV 源数据 (用于 hunter 批量导入)
│   └── assets/logo.png          # Logo 图片
├── public/
│   ├── covers/                  # 封面图 (按年份目录)
│   ├── Missing_Covers/          # 缺失封面占位图
│   ├── favicon.svg
│   └── robots.txt
├── scripts/                     # 工具脚本 (详见下方)
├── docs/                        # 搜索功能文档
└── .github/workflows/           # GitHub Actions (自动入库)
```

---

## 日常操作

### 1. 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:4321)
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 2. 添加新视频 (单条)

```bash
npm run ingest <YouTube-URL>
# 例如:
npm run ingest https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

脚本会自动：
- 从 YouTube 提取标题、艺术家、发布日期
- 扫描描述提取 credits (Director, DoP, Editor 等)
- 下载封面图到 `public/covers/[年份]/`
- 使用 LLM 推断标签 (需配置代理)
- 生成 `src/content/videos/[年份]-[slug].mdx`

### 3. 批量添加视频

创建 URL 文件 (每行一个 URL)：

```bash
# 创建你的 URL 列表
echo "https://www.youtube.com/watch?v=xxx" > my-urls.txt
echo "https://www.youtube.com/watch?v=yyy" >> my-urls.txt

# 批量导入
npm run ingest -- --file my-urls.txt
```

### 4. 手动创建视频条目

在 `src/content/videos/` 创建 `.mdx` 文件，格式如下：

```yaml
---
title: "视频标题"
artist: "艺术家名"
video_url: "https://www.youtube.com/watch?v=..."
publishDate: 2026-02-27
cover: "/covers/2026/slug-name.jpg"
director: "导演名"
production: "制作公司"
dop: "摄影指导"
editor: "剪辑师"
colorist: "调色师"
art_director: "美术指导"
vfx: "视觉特效"
sound_design: "声音设计"
label: "唱片厂牌"
tags: ["dance-choreography", "urban", "minimal"]
curator_note: "策展人评语"
director_link: "https://..."
---
```

**必填字段：** `title`, `video_url`
**其他字段均为可选。**

### 5. 添加封面图

封面图存放在 `public/covers/[年份]/` 目录，文件名应与 MDX 中的 `cover` 字段对应：

```bash
# 封面图路径格式
public/covers/2026/artist-title.jpg

# MDX 中引用
cover: "/covers/2026/artist-title.jpg"
```

如果不提供 cover，YouTube 视频会自动使用 YouTube 缩略图。

### 6. 部署

```bash
# 推送到 main 分支即自动部署
git add .
git commit -m "add: new video entries"
git push origin main
```

Vercel 会自动触发构建和部署。

---

## 维护工具脚本

### 核心脚本

| 命令 | 用途 |
|------|------|
| `npm run ingest <url>` | 导入单个/批量视频 |
| `npm run hunter` | 从 CSV 批量搜索和导入视频 |
| `npm run audit` | 审计所有视频条目的完整性 |
| `npm run check-quality` | 检查内容质量 (缺失字段、格式问题) |

### 修复脚本

| 命令 | 用途 |
|------|------|
| `npm run force-align` | 强制对齐 MDX frontmatter 格式 |
| `npm run repair-covers` | 修复缺失的封面图 |
| `npm run match-orphans` | 匹配孤立的封面图与视频条目 |
| `npm run find-duplicates` | 查找重复的视频条目 |
| `npm run batch-retag` | 批量重新标记视频标签 |
| `npm run validate-csv` | 验证 CSV 源数据格式 |

### 使用示例

```bash
# 审计所有视频，生成报告
npm run audit

# 检查内容质量
npm run check-quality

# 查找重复条目
npm run find-duplicates

# 修复缺失封面
npm run repair-covers

# 验证 CSV 文件
npm run validate-csv src/data/2025.csv
```

---

## 环境配置

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

| 变量 | 用途 | 必需 |
|------|------|------|
| `HTTPS_PROXY` | 代理地址 (用于 ingest 脚本访问 YouTube/LLM) | 视网络环境 |
| `BRAVE_COOKIE_PATH` | yt-dlp cookies 文件路径 | 可选 |

---

## GitHub Actions 自动入库

项目配置了 Scout 自动入库 (`.github/workflows/scout-ingest.yml`)：

1. 在 GitHub Issues 中创建带 `scout-batch` 标签的 Issue
2. 在 Issue body 中用 checklist 格式列出 URL：
   ```
   - [x] URL: https://www.youtube.com/watch?v=xxx
   - [x] URL: https://www.youtube.com/watch?v=yyy
   - [ ] URL: https://www.youtube.com/watch?v=zzz  (未勾选会跳过)
   ```
3. 关闭 Issue 即触发自动导入
4. Bot 会自动 commit 并 push 新内容

---

## 内容 Schema 字段参考

定义在 `src/content/config.ts`：

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 视频标题 |
| `artist` | string | 否 | 艺术家/频道名 |
| `video_url` | string | 是 | 视频 URL (YouTube/Vimeo) |
| `publishDate` | date | 否 | 发布日期 |
| `cover` | string | 否 | 封面图路径 |
| `curator_note` | string | 否 | 策展人评语 |
| `director` | string | 否 | 导演 |
| `production` | string | 否 | 制作公司 |
| `dop` | string | 否 | 摄影指导 |
| `editor` | string | 否 | 剪辑师 |
| `colorist` | string | 否 | 调色师 |
| `art_director` | string | 否 | 美术指导 |
| `vfx` | string | 否 | 视觉特效 |
| `sound_design` | string | 否 | 声音设计 |
| `label` | string | 否 | 唱片厂牌 |
| `tags` | string[] | 否 | 标签数组 |
| `director_link` | string (URL) | 否 | 导演主页 |

---

## 常见问题

### Q: 构建报错 "content schema mismatch"
A: 检查 MDX frontmatter 格式，确保 `publishDate` 是日期格式 (YYYY-MM-DD)，`tags` 是数组格式。

### Q: 视频缩略图不显示
A: 检查 `cover` 字段路径是否正确，文件是否存在于 `public/covers/` 中。无 cover 的 YouTube 视频会自动使用 YouTube 缩略图。

### Q: ingest 脚本超时
A: 检查网络连接和代理设置 (.env 中的 HTTPS_PROXY)。

### Q: 搜索不工作
A: 搜索数据通过 `/api/search.json` 端点提供。确保构建成功，检查浏览器控制台是否有报错。

### Q: 如何删除视频
A: 删除对应的 `src/content/videos/xxx.mdx` 文件，以及 `public/covers/` 中对应的封面图（如有）。

### Q: 导演页面没有某个导演
A: 导演页面是根据视频条目的 `director` 字段自动生成的。确保视频条目中填写了导演名（拼写需一致）。
