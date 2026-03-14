# Souply Crawler Library

这个目录包含了 Souply 爬虫系统的核心模块化组件。

## 📦 模块说明

### 1. `proxy.js` - 代理配置模块
**功能**: 管理 HTTP/HTTPS 代理配置（防止被封禁层）

**导出函数**:
- `setupProxy()` - 设置代理环境变量
- `getProxyUrl()` - 获取当前代理 URL
- `isProxyEnabled()` - 检查代理是否已启用
- `disableProxy()` - 禁用代理

**使用示例**:
```javascript
import { setupProxy } from './lib/proxy.js';

// 在脚本开始时设置代理
setupProxy(); // 输出: 🔐 Proxy enabled: http://127.0.0.1:7897
```

---

### 2. `search.js` - 混合搜索引擎模块
**功能**: 支持 YouTube（主要）+ Vimeo（回退）视频搜索

**导出类**:
- `HybridSearcher` - 混合搜索器类

**导出函数**:
- `hybridSearch(query, options)` - 快速单次搜索

**搜索流程**:
```
1. 尝试 YouTube 搜索（使用 yt-search 库）
   ↓ 失败
2. 回退到 Vimeo 搜索（使用 yt-dlp vimeosearch1:）
   ↓ 失败
3. 返回 null（两个平台都未找到）
```

**返回格式**:
```javascript
{
  url: 'https://www.youtube.com/watch?v=...',
  platform: 'youtube', // 或 'vimeo'
  title: '视频标题',
  author: '频道名称'
}
```

**使用示例**:
```javascript
import { HybridSearcher } from './lib/search.js';

const searcher = new HybridSearcher({ verbose: true });

// 方法 1: 直接搜索查询字符串
const result1 = await searcher.search('Massive Attack Teardrop official video');

// 方法 2: 结构化搜索（推荐）
const result2 = await searcher.searchByMetadata({
  artist: 'Massive Attack',
  title: 'Teardrop',
  director: 'Walter Stern'
});

if (result2) {
  console.log(`找到视频在 ${result2.platform}: ${result2.url}`);
} else {
  console.log('YouTube 和 Vimeo 都未找到');
}
```

**Vimeo 搜索技术细节**:
- 使用 `yt-dlp` 的 `vimeosearch1:` 提取器
- 自动返回搜索结果的第一个视频
- 命令格式: `yt-dlp --dump-json "vimeosearch1:搜索查询"`

---

### 3. `parser.js` - 解析与清理模块
**功能**: 解析视频描述中的制作人员信息，清理歌曲标题

**导出函数**:
- `parseCredits(description, context?)` - 解析导演、制作公司、唱片公司（可选传入 `{ title, artist }` 供 LLM fallback 使用）
- `cleanSongTitle(originalTitle, artistName)` - 清理歌曲标题
- `normalizeArtistName(artistName)` - 规范化艺术家名称

**parseCredits 提取字段** (V5.0 策略):
1. `director` - 导演/主要创意人员
2. `production_company` - 制作公司/工作室
3. `label` - 音乐厂牌/唱片公司

**使用示例**:
```javascript
import { parseCredits, cleanSongTitle, normalizeArtistName } from './lib/parser.js';

// 解析制作人员
const description = `
Official Music Video for "Teardrop" by Massive Attack
Directed by: Walter Stern
Production Company: Ridley Scott Associates
Label: Virgin Records
`;

const credits = parseCredits(description);
// 返回: { director: 'Walter Stern', production_company: 'Ridley Scott Associates', label: 'Virgin Records' }

// 清理标题
const rawTitle = 'Massive Attack - Teardrop (Official Music Video)';
const cleanedTitle = cleanSongTitle(rawTitle, 'Massive Attack');
// 返回: 'Teardrop'

// 规范化艺术家名称
const artist = normalizeArtistName('charli xcx');
// 返回: 'Charli XCX'
```

---

## 🔧 架构升级

### 重构前（单体架构）
```
ingest.js (500+ 行)
├── 代理配置逻辑
├── 搜索逻辑（仅 YouTube）
├── 解析逻辑
└── 摄取逻辑

hunter.js (500+ 行)
├── 代理配置逻辑（重复）
├── 搜索逻辑（重复）
└── 批处理逻辑
```

### 重构后（模块化架构）
```
scripts/lib/
├── proxy.js      (代理管理)
├── search.js     (混合搜索 YouTube + Vimeo)
└── parser.js     (解析与清理)

ingest.js         (视频摄取 Worker)
├── 导入 proxy.js
├── 导入 parser.js
└── 异步处理（execAsync 替代 execSync）

hunter.js         (批处理 Manager)
├── 导入 proxy.js
├── 导入 search.js (HybridSearcher)
├── 自动回退到 Vimeo
└── 生成 missing_report.json
```

---

## ✨ 新功能

### 1. **混合搜索（Hybrid Search）**
- YouTube 失败时自动尝试 Vimeo
- 提高视频查找成功率
- 支持多平台（可扩展）

### 2. **异步处理（Async Processing）**
- `execSync` → `execAsync` (promisified)
- 避免阻塞事件循环
- 提升性能和响应性

### 3. **缺失报告（Missing Report）**
- 自动记录两个平台都找不到的视频
- 保存到 `data/missing_report.json`
- 支持增量追加（避免重复）

**Missing Report 格式**:
```json
[
  {
    "artist": "Artist Name",
    "title": "Song Title",
    "director": "Director Name",
    "year": "2023",
    "visual_hook": "Visual Hook Description",
    "timestamp": "2026-01-19T12:34:56.789Z"
  }
]
```

---

## 🛡️ 保留的现有功能

✅ **代理逻辑** - PROXY_URL (端口 7897) 完整保留  
✅ **Brave Cookie** - 身份验证层完整保留  
✅ **Visual Hook 标签** - 分类系统完整保留  
✅ **解析规则** - 所有正则表达式逻辑完整保留  
✅ **向后兼容** - CLI 模式仍然可以直接传 URL  

---

## 📋 使用指南

### 运行 Hunter（批处理模式）
```bash
# 处理所有年份的 CSV 文件
npm run hunter

# 处理特定年份
npm run hunter 2024

# 处理自定义文件
npm run hunter --file=/path/to/custom.csv
```

### 运行 Ingest（单个视频模式）
```bash
# 摄取单个视频（YouTube）
npm run ingest https://www.youtube.com/watch?v=...

# 摄取单个视频（Vimeo）
npm run ingest https://vimeo.com/123456789

# 强制覆盖已存在的文件
npm run ingest <url> --force
```

---

## 🎯 技术亮点

1. **解耦设计**: 每个模块职责单一，易于测试和维护
2. **可扩展性**: 未来可轻松添加其他平台（Dailymotion, Bilibili 等）
3. **错误恢复**: 多重回退机制（YouTube → Vimeo → 记录缺失）
4. **异步优先**: 使用 Promise 和 async/await 避免阻塞
5. **数据追踪**: Missing Report 帮助分析未找到视频的模式

---

## 🚀 后续优化建议

- [ ] 添加单元测试（使用 Jest 或 Vitest）
- [ ] 实现更多平台支持（Dailymotion, Bilibili）
- [ ] 添加重试机制（网络失败时自动重试）
- [ ] 实现进度保存（中断后可恢复）
- [ ] 优化搜索算法（使用 LLM 改进查询构建）

---

**重构完成时间**: 2026-01-19  
**重构者**: Phoenix Project Team  
**状态**: ✅ 生产就绪
