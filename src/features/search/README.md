# 搜索功能模块

基于 MiniSearch 的全文搜索引擎，支持实时 "as you type" 搜索，模糊匹配，前缀搜索。

## 功能特性

- ✅ **实时搜索** - 输入即搜索，无需点击按钮
- ✅ **模糊匹配** - 容错输入，处理拼写错误
- ✅ **前缀搜索** - 支持输入前几个字符即可匹配
- ✅ **多字段搜索** - 标题、艺术家、导演、制作公司、标签
- ✅ **字段权重** - 标题和艺术家权重更高
- ✅ **中文支持** - 友好的中文分词
- ✅ **快捷键** - Cmd+K / Ctrl+K 快速打开
- ✅ **暗黑模式** - 完整的暗黑模式支持
- ✅ **键盘导航** - 方向键选择，Enter 打开

## 目录结构

```
src/features/search/
├── components/
│   └── SearchPalette.tsx      # 搜索 UI 组件
├── utils/
│   ├── search-engine.ts       # 搜索引擎核心
│   └── transform-data.ts      # 数据转换工具
├── index.ts                   # 模块导出
└── README.md                  # 本文档
```

## 快速开始

### 1. 在任意页面中使用

在你的 Astro 页面中导入并使用搜索组件：

```astro
---
// src/pages/index.astro (或任意页面)
import { SearchPalette } from '../features/search';
---

<html>
  <head>
    <title>My Site</title>
  </head>
  <body>
    <!-- 你的页面内容 -->
    <h1>Welcome</h1>
    
    <!-- 添加搜索组件 (使用 client:load 确保交互功能) -->
    <SearchPalette client:load />
  </body>
</html>
```

### 2. 在布局中全局使用

推荐在全局布局中添加，让所有页面都可以使用搜索：

```astro
---
// src/layouts/BaseLayout.astro
import { SearchPalette } from '../features/search';
---

<html>
  <head>
    <slot name="head" />
  </head>
  <body>
    <slot />
    
    <!-- 全局搜索 -->
    <SearchPalette client:load />
  </body>
</html>
```

### 3. 添加触发按钮（可选）

你可以添加一个按钮来提示用户使用搜索功能：

```astro
---
// 在你的导航栏或页面中
---

<button 
  onclick="window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))"
  class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
>
  <svg class="w-4 h-4"><!-- 搜索图标 --></svg>
  <span>搜索</span>
  <kbd class="px-2 py-1 text-xs bg-white dark:bg-gray-900 rounded border">⌘K</kbd>
</button>
```

## API 文档

### SearchPalette 组件

```tsx
import { SearchPalette } from '../features/search';

<SearchPalette client:load />
```

**Props:**
- `defaultOpen?: boolean` - 是否默认打开（可选，默认 `false`）

**快捷键:**
- `Cmd+K` / `Ctrl+K` - 打开/关闭搜索
- `↑` / `↓` - 上下选择结果
- `Enter` - 打开选中的视频
- `Esc` - 关闭搜索面板

### SearchEngine 类

```typescript
import { setupSearchEngine } from '../features/search';

// 初始化搜索引擎
const engine = await setupSearchEngine(searchItems);

// 执行搜索
const results = engine.search('周杰伦', {
  fuzzy: 0.2,
  prefix: true,
  limit: 10,
});
```

**方法:**
- `search(query, options)` - 执行搜索
- `autoSuggest(query, options)` - 自动建议
- `addAll(documents)` - 批量添加文档
- `add(document)` - 添加单个文档
- `remove(document)` - 移除文档
- `clear()` - 清空索引

## 数据源

搜索数据来自 Astro Content Collection：

```typescript
// API Endpoint: /api/search.json
// 数据来源: getCollection('videos')
```

搜索引擎会索引以下字段：
- `title` - 作品标题 (权重: 2.5)
- `artist` - 艺术家 (权重: 2.0)
- `director` - 导演 (权重: 1.5)
- `tags` - 标签 (权重: 1.2)
- `production` - 制作公司 (权重: 1.0)

## 自定义样式

组件使用 Tailwind CSS 构建，完全支持暗黑模式。如需自定义样式，可以：

1. 直接修改 `SearchPalette.tsx` 中的 Tailwind 类名
2. 在你的全局 CSS 中覆盖样式
3. 使用 Tailwind 配置自定义主题颜色

## 性能优化

- ✅ 搜索数据通过 API 端点提供，支持浏览器缓存（5 分钟）
- ✅ 大数据集（>1000 条）自动使用异步索引，避免阻塞 UI
- ✅ 搜索引擎使用单例模式，避免重复初始化
- ✅ 结果限制在 10 条，保持 UI 流畅

## 故障排查

### 搜索无结果？

1. 检查 `/api/search.json` 是否返回数据
2. 打开浏览器控制台查看是否有错误
3. 确认 `minisearch` 依赖已安装

### 快捷键不工作？

1. 确保组件使用了 `client:load` 指令
2. 检查是否有其他快捷键冲突
3. 在某些浏览器中，Cmd+K 可能被系统占用

### 样式错误？

1. 确认 Tailwind CSS 已正确配置
2. 检查是否启用了暗黑模式支持
3. 确保没有全局样式覆盖

## 未来扩展

可能的改进方向：

- [ ] 添加搜索历史记录
- [ ] 支持高级过滤（按年份、标签筛选）
- [ ] 添加搜索建议和热门搜索
- [ ] 支持搜索结果导出
- [ ] 添加搜索分析和统计

## 技术栈

- **搜索引擎**: [MiniSearch](https://github.com/lucaong/minisearch)
- **UI 框架**: React + Astro
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **类型安全**: TypeScript

---

**Created by:** Souply Team  
**Last Updated:** 2026-01-28
