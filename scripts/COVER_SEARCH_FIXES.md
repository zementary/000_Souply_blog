# 封面和搜索质量修复 - 变更说明

## 📋 概述

此次更新解决了三个核心问题:
1. **缺失的封面图** - 特别是Vimeo视频
2. **低质量搜索结果** - "Audio Only"、"歌词视频"等非官方内容
3. **可追溯性差** - 难以定位CSV中的问题行

---

## 🎯 任务1: 通用封面逻辑 (`ingest.js`)

### 问题
- YouTube封面使用硬编码URL (`img.youtube.com/...`)
- Vimeo封面逻辑不完整
- 无法获取最高分辨率的缩略图

### 解决方案
**新逻辑 (第292-372行):**

```javascript
// 1. 优先使用 yt-dlp 的 thumbnails 数组
if (data.thumbnails && Array.isArray(data.thumbnails)) {
  // 按 preference/height/width 排序,选择最高分辨率
  const sortedThumbs = [...data.thumbnails].sort((a, b) => {
    if (a.preference !== undefined && b.preference !== undefined) {
      return b.preference - a.preference;
    }
    const aRes = (a.height || 0) * (a.width || 0);
    const bRes = (b.height || 0) * (b.width || 0);
    return bRes - aRes;
  });
  coverUrl = sortedThumbs[0].url;
}

// 2. Fallback: 使用单一 thumbnail 字段
else if (data.thumbnail) {
  coverUrl = data.thumbnail;
}

// 3. 终极 Fallback: 平台特定构造URL
else {
  // YouTube: img.youtube.com/vi/{id}/maxresdefault.jpg
  // Vimeo: vumbnail.com/{id}.jpg
}
```

### 改进
- ✅ **统一逻辑** - YouTube和Vimeo使用相同的处理流程
- ✅ **高分辨率优先** - 自动选择最佳质量缩略图
- ✅ **双重Fallback** - 主URL失败时尝试备用URL
- ✅ **文件大小检查** - 确保下载的文件 > 0 字节
- ✅ **详细日志** - 显示缩略图尺寸和下载大小

---

## 🔍 任务2: 更严格的搜索过滤 (`scripts/lib/search.js`)

### 问题
- 搜索结果经常返回"Audio Only"、"Lyric Video"等非MV内容
- 无法过滤Shorts (<60秒) 或专辑合集 (>20分钟)

### 解决方案
**新增过滤器 (第40-96行):**

#### 2.1 负面关键词过滤
```javascript
const negativeKeywords = [
  'audio only',
  'official audio',
  'lyrics',
  'lyric video',
  'visualizer',
  '1 hour',
  'one hour',
  'loop',
  'fan made',
  'fan video',
  'fan edit',
  'reupload',
  'extended version',
  'compilation',
  'playlist',
  'full album'
];

videos = videos.filter(video => {
  const titleLower = video.title.toLowerCase();
  return !negativeKeywords.some(kw => titleLower.includes(kw));
});
```

#### 2.2 时长过滤
```javascript
videos = videos.filter(video => {
  const duration = video.duration?.seconds || 0;
  const isDirectorsCut = titleLower.includes("director's cut");
  
  if (duration < 60) {
    return false; // 跳过 Shorts/Teaser (<60秒)
  }
  
  if (duration > 1200 && !isDirectorsCut) {
    return false; // 跳过专辑/合集 (>20分钟)
  }
  
  return true;
});
```

#### 2.3 Vimeo缩略图支持
```javascript
// 在 searchVimeo() 方法中 (第107-122行)
let thumbnail = null;
if (data.thumbnails && Array.isArray(data.thumbnails)) {
  const sortedThumbs = [...data.thumbnails].sort((a, b) => {
    const aRes = (a.height || 0) * (a.width || 0);
    const bRes = (b.height || 0) * (b.width || 0);
    return bRes - aRes;
  });
  thumbnail = sortedThumbs[0].url;
}

return {
  url: data.webpage_url,
  platform: 'vimeo',
  title: data.title,
  thumbnail: thumbnail  // 新增字段
};
```

### 改进
- ✅ **质量保证** - 自动过滤非官方内容
- ✅ **时长合理性** - 避免超短/超长视频
- ✅ **特殊情况处理** - 允许"Director's Cut"长视频
- ✅ **详细日志** - 显示过滤原因和视频时长

---

## 🛠️ 任务3: 修复模式工具

### 新功能: `--repair-covers` 标志

#### 3.1 单视频修复
```bash
npm run ingest <video-url> --repair-covers
```

**行为:**
- ✅ 检查 `.mdx` 文件是否存在
- ✅ 检查封面文件是否存在或是否损坏 (0字节)
- ✅ 只重新下载封面,不重新生成 `.mdx`
- ✅ 如果封面已存在且有效,跳过

#### 3.2 批量修复所有缺失封面
```bash
npm run repair-covers --yes
```

**新脚本: `scripts/repair-covers.js`**

功能:
1. 扫描 `src/content/videos/*.mdx` 文件
2. 检测以下情况:
   - ❌ 封面字段缺失
   - ❌ 封面是远程URL (未下载)
   - ❌ 本地文件缺失
   - ❌ 文件大小为0字节 (损坏)
3. 对每个问题视频调用 `ingestVideo()` 的修复模式
4. 显示详细的修复报告

**示例输出:**
```
📂 Scanning 450 MDX files for missing covers...

⚠️  2015-lisa-rockstar.mdx: Cover file missing
⚠️  2016-vimeo-test.mdx: Cover is remote URL

📊 Found 23 files with missing/corrupted covers

[1/23] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 File: 2015-lisa-rockstar.mdx
🔗 URL: https://www.youtube.com/watch?v=...
📸 Using yt-dlp thumbnail (1280x720)
✅ Downloaded cover: 124.5 KB
✅ Successfully repaired cover

REPAIR SUMMARY:
✅ Successfully repaired: 21
⏭️  Skipped: 2
❌ Failed: 0
```

---

## 📍 任务4: 改进日志追踪 (`hunter.js`)

### 问题
- CSV处理错误时,无法定位到原始行号

### 解决方案
**CSV行号注入 (第122行):**
```javascript
.on('data', (row) => {
  lineNumber++;
  
  // 将CSV行号附加到row对象
  row.__csvLineNumber = lineNumber + 1; // +1 因为有header
  
  rows.push(row);
})
```

**日志显示 (第195-200行):**
```javascript
const { __csvLineNumber } = row;
const lineInfo = __csvLineNumber ? ` [CSV Line ${__csvLineNumber}]` : '';

console.log(`\n[${index + 1}/${total}]${lineInfo} ━━━━━━━━━━━━━━━━━━`);
console.log(`📼 Processing: ${Artist} - ${Title}`);
```

### 效果
**修改前:**
```
[42/150] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📼 Processing: LISA - ROCKSTAR
```

**修改后:**
```
[42/150] [CSV Line 43] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📼 Processing: LISA - ROCKSTAR
```

---

## 🚀 使用方法

### 方法1: 正常使用 (自动应用新逻辑)
```bash
# 单视频导入 - 自动使用新封面逻辑
npm run ingest https://www.youtube.com/watch?v=xxxxx

# 批量导入 - 自动应用搜索过滤器
npm run hunter 2024
```

### 方法2: 修复现有的缺失封面
```bash
# 扫描并显示问题 (不修复)
npm run repair-covers

# 自动修复所有缺失封面
npm run repair-covers --yes
```

### 方法3: 单个视频封面修复
```bash
npm run ingest https://vimeo.com/123456789 --repair-covers
```

---

## 📊 技术细节

### 封面下载优先级

1. **优先:** yt-dlp `thumbnails` 数组 → 按preference/分辨率排序
2. **Fallback:** yt-dlp `thumbnail` 单字段
3. **终极Fallback:**
   - YouTube: `https://img.youtube.com/vi/{id}/maxresdefault.jpg`
   - Vimeo: `https://vumbnail.com/{id}.jpg`

### 搜索质量评分

| 类型 | 处理方式 |
|------|---------|
| Official Music Video | ✅ 保留 |
| Director's Cut (长视频) | ✅ 保留 |
| Audio Only | ❌ 过滤 |
| Lyric Video | ❌ 过滤 |
| Fan Made | ❌ 过滤 |
| YouTube Shorts (<60s) | ❌ 过滤 |
| Full Album (>20min) | ❌ 过滤 |

### 文件结构

```
scripts/
├── ingest.js              # 主导入逻辑 (新增: 修复模式)
├── hunter.js              # 批量处理 (新增: CSV行号追踪)
├── repair-covers.js       # 新增: 批量封面修复工具
└── lib/
    └── search.js          # 搜索引擎 (新增: 质量过滤)
```

---

## ⚠️ 注意事项

1. **向后兼容:** 所有现有脚本和工作流程无需修改即可工作
2. **性能:** 搜索过滤可能导致"未找到"结果增加 (这是预期行为,确保质量)
3. **速率限制:** `repair-covers` 自动在请求之间等待3秒
4. **yt-dlp依赖:** 确保已安装 `yt-dlp` 命令行工具

---

## 🧪 测试建议

### 测试1: Vimeo封面下载
```bash
npm run ingest https://vimeo.com/123456789
# 检查: public/covers/{year}/xxx.jpg 是否下载成功
```

### 测试2: 搜索过滤器
```bash
npm run hunter 2024
# 观察日志中是否有 "⚠️ Filtered out" 消息
```

### 测试3: 封面修复
```bash
# 删除一个封面文件进行测试
rm public/covers/2024/test-video.jpg

# 运行修复
npm run repair-covers --yes

# 验证文件是否重新下载
ls -lh public/covers/2024/test-video.jpg
```

---

## 📝 变更文件清单

| 文件 | 变更类型 | 描述 |
|------|---------|------|
| `scripts/ingest.js` | 🔄 重构 | 通用封面逻辑 + 修复模式 |
| `scripts/lib/search.js` | ✨ 新功能 | 搜索质量过滤器 |
| `scripts/hunter.js` | ✨ 新功能 | CSV行号追踪 |
| `scripts/repair-covers.js` | 🆕 新建 | 批量封面修复工具 |
| `package.json` | ✨ 新功能 | 新增 `repair-covers` 脚本 |

---

## 🎉 预期效果

1. **Vimeo视频** → 现在应该有高质量缩略图
2. **搜索结果** → 更少的"Audio Only"垃圾结果
3. **调试** → 可以快速定位CSV问题行
4. **维护** → 可以批量修复缺失的封面

---

**作者:** AI Assistant  
**日期:** 2026-01-19  
**版本:** v2.0
