# 搜索功能集成指南

## ✅ 已完成的工作

搜索功能已经完全集成到 Souply 项目中，无需额外配置即可使用。

### 已创建的文件

```
✅ src/features/search/
   ├── components/
   │   └── SearchPalette.tsx          # 搜索 UI 组件
   ├── utils/
   │   ├── search-engine.ts           # 搜索引擎核心
   │   └── transform-data.ts          # 数据转换工具
   ├── index.ts                       # 模块导出
   └── README.md                      # 详细文档

✅ src/pages/api/
   └── search.json.ts                 # 搜索数据 API

✅ 已集成到:
   ├── src/layouts/BaseLayout.astro   # 全局布局
   └── src/components/Header.astro    # 导航栏
```

## 🎯 使用方法

### 1. 快捷键（推荐）

按下 `Cmd+K` (Mac) 或 `Ctrl+K` (Windows/Linux) 即可打开搜索面板。

### 2. 点击搜索按钮

点击导航栏右侧的"搜索"按钮。

### 3. 搜索操作

- **输入查询** - 开始输入即可实时搜索
- **↑ / ↓** - 上下选择结果
- **Enter** - 打开选中的视频
- **Esc** - 关闭搜索面板

## 🔍 搜索功能特性

### 支持的搜索字段

搜索引擎会在以下字段中查找：

1. **标题** (Title) - 权重最高 (2.5x)
2. **艺术家** (Artist) - 高权重 (2.0x)
3. **导演** (Director) - 中等权重 (1.5x)
4. **标签** (Tags) - 较低权重 (1.2x)
5. **制作公司** (Production) - 基础权重 (1.0x)

### 搜索特性

- ✅ **实时搜索** - 输入即搜索
- ✅ **模糊匹配** - 允许轻微拼写错误
- ✅ **前缀搜索** - 输入前几个字符即可匹配
- ✅ **中文支持** - 完整的中文分词支持
- ✅ **暗黑模式** - 自动适配系统主题

### 搜索示例

```
# 搜索艺术家
"周杰伦" → 找到所有周杰伦的作品

# 搜索标题
"七里香" → 找到标题包含"七里香"的视频

# 搜索导演
"Bill Fishman" → 找到该导演的所有作品

# 模糊搜索
"jay cho" → 可以找到 "Jay Chou"

# 前缀搜索
"周杰" → 可以匹配 "周杰伦"
```

## 🎨 UI 设计

搜索面板采用现代化的 Cmd+K 风格设计：

- **浮动面板** - 居中显示，不遮挡内容
- **毛玻璃效果** - 背景模糊，视觉优雅
- **暗黑模式** - 完整支持明暗主题切换
- **响应式设计** - 在手机、平板、桌面端都有良好体验
- **键盘友好** - 完整的键盘导航支持

## 📊 技术架构

### 数据流

```
getCollection('videos')              # Astro Content Collection
    ↓
transformVideosToSearchItems()       # 转换数据
    ↓
/api/search.json                     # API Endpoint (缓存 5 分钟)
    ↓
setupSearchEngine()                  # 初始化搜索引擎
    ↓
SearchPalette 组件                   # 用户界面
    ↓
engine.search(query)                 # 实时搜索
    ↓
显示结果 + 导航                       # 用户交互
```

### 技术栈

- **搜索引擎**: MiniSearch (轻量级全文搜索)
- **UI 框架**: React 19 + Astro 5
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **类型安全**: TypeScript

## 🚀 性能优化

- ✅ **API 缓存** - 搜索数据缓存 5 分钟
- ✅ **单例模式** - 搜索引擎只初始化一次
- ✅ **异步索引** - 大数据集使用异步方法
- ✅ **结果限制** - 最多显示 10 条结果
- ✅ **懒加载** - 组件按需加载 (client:load)

## 🛠️ 故障排查

### 搜索不可用？

1. 确保开发服务器正在运行: `npm run dev`
2. 检查浏览器控制台是否有错误
3. 访问 `/api/search.json` 确认 API 正常工作

### 快捷键不工作？

1. 确保没有其他应用占用 Cmd+K
2. 尝试点击搜索按钮
3. 检查是否在输入框内（可能拦截快捷键）

### 搜索结果不准确？

1. 尝试使用更精确的关键词
2. 使用引号进行精确搜索（如 `"周杰伦"`）
3. 调整搜索选项（编辑 `SearchPalette.tsx` 中的 fuzzy 和 prefix 参数）

## 📝 自定义配置

### 调整搜索权重

编辑 `src/features/search/utils/search-engine.ts`:

```typescript
boost: {
  title: 2.5,      // 标题权重
  artist: 2.0,     // 艺术家权重
  director: 1.5,   // 导演权重
  tags: 1.2,       // 标签权重
  production: 1.0, // 制作公司权重
}
```

### 调整模糊匹配程度

编辑 `SearchPalette.tsx` 中的搜索调用:

```typescript
const searchResults = engineRef.current.search(query, {
  fuzzy: 0.2,  // 0-1 之间，越大越宽松
  prefix: true,
  limit: 10,   // 最大结果数
});
```

### 修改 UI 样式

所有样式都使用 Tailwind CSS，直接在 `SearchPalette.tsx` 中修改类名即可。

## 🎯 下一步

搜索功能已经完全可用！你可以：

1. **启动开发服务器**: `npm run dev`
2. **按 Cmd+K** 打开搜索面板
3. **开始搜索** 你的视频内容

---

**功能状态**: ✅ 已完成并集成  
**文档更新**: 2026-01-28  
**维护者**: Souply Team
