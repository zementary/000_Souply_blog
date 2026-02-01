# 🏗️ Ingest v4.0 架构蓝图

**创建日期**: 2026-01-17  
**状态**: 📋 设计阶段（未实施）

---

## 🎯 设计目标

从根本上解决录入时产生的数据质量问题，建立一套**防御性**、**可测试**、**可维护**的抓取系统。

---

## 🐛 当前问题诊断

### 问题分类

#### 类型 A: 字段前缀污染
```yaml
# 原始 YouTube 描述
Editor: John Doe
Cinematographer - Jane Smith

# ❌ 当前输出
editor: "Cinematographer - Jane Smith"

# ✅ 期望输出
editor: "Jane Smith"
```

**根本原因**: 正则表达式捕获了**相邻行**的职位标签。

---

#### 类型 B: 首字母截断
```yaml
# 原始描述
Sound Design: Studio Genius

# ❌ 当前输出
sound_design: "tupid Genius"  # "Studio" 的 "S" 被截断

# ✅ 期望输出
sound_design: "Studio Genius"
```

**根本原因**: 正则表达式**非贪婪匹配**吞掉了首字母。

---

#### 类型 C: 组织前缀混入
```yaml
# 原始描述
Sound Design: Playback Studio - Kostadin Separevski

# ❌ 当前输出
sound_design: "Playback: Kostadin Separevski"

# ✅ 期望输出
sound_design: "Kostadin Separevski"
```

**根本原因**: 清洗逻辑只处理冒号后的内容，没有识别 "Org - Person" 模式。

---

#### 类型 D: 前导符号残留
```yaml
# ❌ 当前输出
director: "- David Helman"

# ✅ 期望输出
director: "David Helman"
```

**根本原因**: 清洗逻辑在移除前缀后没有再次清理前导符号。

---

#### 类型 E: Artist/Title 混淆

**E1: Title 中包含 Artist 名字**
```yaml
# YouTube 标题: "Captain Ants - AntsLive"
# 频道: AntsLive

# ❌ 当前输出
title: "Captain Ants - AntsLive"
artist: "AntsLive"

# ✅ 期望输出
title: "Captain Ants"
artist: "AntsLive"
```

**E2: 混淆频道和艺术家**
```yaml
# YouTube 标题: "LISA - ROCKSTAR"
# 频道: LLOUD Official

# ❌ 当前输出
title: "LISA - ROCKSTAR"
artist: "LLOUD Official"

# ✅ 期望输出
title: "ROCKSTAR"
artist: "LISA"
```

**根本原因**: 
1. `cleanSongTitle()` 没有处理 "Song - Artist" 格式
2. K-Pop 清洗逻辑优先级低于通用逻辑

---

## 🛡️ 防御性设计原则

### 1. 分阶段处理管道（Pipeline Pattern）

```
YouTube 原始数据
    ↓
【Stage 1: 粗提取】正则匹配（宽松）
    ↓
【Stage 2: 语义清洗】移除职位标签、组织前缀
    ↓
【Stage 3: 符号清洗】移除标点、社交 handle
    ↓
【Stage 4: 验证】长度检查、黑名单过滤
    ↓
最终输出
```

### 2. 独立清洗器（Role-Specific Cleaners）

每个字段使用**独立的清洗函数**，而非通用逻辑：

```javascript
cleanDirector(raw)      // 特殊处理: "Creative Director" 误匹配
cleanEditor(raw)        // 特殊处理: "Editor" 半词匹配
cleanDOP(raw)           // 特殊处理: "DOP" vs "Director of Photography"
cleanVFX(raw)           // 特殊处理: "Studio: Name" 模式
cleanSoundDesign(raw)   // 特殊处理: "Playback Studio - Name" 模式
```

### 3. 黑名单 + 白名单机制

```javascript
// 黑名单: 不允许出现在最终输出的词
const FORBIDDEN_PATTERNS = [
  /^-+\s/,                    // 前导破折号
  /@[\w.]+/,                  // 社交 handle
  /^(?:by|and|with)\s+/i,     // 介词前缀
  /^\w{1,4}:/,                // 残留标签（如 "tudio:"）
];

// 白名单: 允许的职位标签（用于识别职位边界）
const VALID_ROLES = [
  'Director', 'DOP', 'Editor', 'Colorist',
  'Art Director', 'VFX', 'Sound Design',
  'Production Company', 'Label'
];
```

### 4. 正则表达式原则

**旧模式** (不精确):
```javascript
/Editor\s*[:.\-]?\s*(.+?)(?:\n|$)/
```

**新模式** (防御性):
```javascript
/\bEditor\b          # 完整单词边界
  \s*[:.\-]?\s*      # 可选分隔符
  (.+?)              # 捕获内容
  (?=\n|$|\bDirector\b|\bDOP\b)  # 明确终止条件
/ix
```

**关键改进**:
- `\b` 确保完整单词匹配
- `(?=...)` 前瞻断言，不消耗字符
- 明确终止条件（换行 OR 下一个职位标签）

---

## 🔧 V4.0 技术方案

### 核心改进 1: 双阶段正则匹配

```javascript
function extractCredit(description, roleConfig) {
  const { patterns, nextRoles, cleaners } = roleConfig;
  
  // Stage 1: 粗提取（宽松匹配）
  let rawValue = null;
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      rawValue = match[1];
      break;
    }
  }
  
  if (!rawValue) return null;
  
  // Stage 2: 裁剪到下一个职位标签（防止跨行捕获）
  for (const nextRole of nextRoles) {
    const boundary = rawValue.indexOf(nextRole);
    if (boundary > 0) {
      rawValue = rawValue.substring(0, boundary);
    }
  }
  
  // Stage 3: 应用清洗器链
  let cleaned = rawValue;
  for (const cleaner of cleaners) {
    cleaned = cleaner(cleaned);
  }
  
  // Stage 4: 最终验证
  return validate(cleaned) ? cleaned : null;
}
```

### 核心改进 2: 清洗器链（Cleaner Chain）

```javascript
// 通用清洗器
const universalCleaners = [
  removeLeadingPunctuation,   // "- Name" → "Name"
  removeTrailingPunctuation,  // "Name," → "Name"
  removeSocialHandles,        // "Name @handle" → "Name"
  normalizeWhitespace,        // "Name  Name" → "Name Name"
];

// 职位专用清洗器
const directorCleaners = [
  ...universalCleaners,
  removeAndJobPrefix,         // "and Editor: Name" → "Name"
  removeByPrefix,             // "by Name" → "Name"
];

const vfxCleaners = [
  ...universalCleaners,
  extractPersonFromOrg,       // "Studio: Name" → "Name"
  removeSupervisionTitles,    // "VFX Supervisor" → ""
];

const soundCleaners = [
  ...universalCleaners,
  extractPersonFromPlayback,  // "Playback Studio - Name" → "Name"
  removeEngineerTitles,       // "Sound Engineer" → ""
];
```

### 核心改进 3: Artist/Title 智能分离

```javascript
function extractArtistAndTitle(rawTitle, channel) {
  // Rule 1: K-Pop 频道检测（LABEL 关键词）
  const isLabelChannel = /LABEL|ENTERTAINMENT|OFFICIAL|VEVO/i.test(channel);
  
  if (isLabelChannel) {
    // Pattern A: "Artist - Song"
    const matchA = rawTitle.match(/^(.+?)\s+-\s+(.+?)(?:\s+\(|$)/);
    if (matchA) {
      return { artist: matchA[1], title: matchA[2] };
    }
    
    // Pattern B: "[MV] Artist - Song"
    const matchB = rawTitle.match(/^\[MV\]\s*(.+?)\s+-\s+(.+?)(?:\s+\(|$)/);
    if (matchB) {
      return { artist: matchB[1], title: matchB[2] };
    }
    
    // Pattern C: "Artist 'Song'"
    const matchC = rawTitle.match(/^(.+?)\s+['''""""](.+?)['''""""]/);
    if (matchC) {
      return { artist: matchC[1], title: matchC[2] };
    }
  }
  
  // Rule 2: 通用艺术家频道
  let artist = channel;
  let title = rawTitle;
  
  // 移除艺术家名字前缀（如果 title 以频道名开头）
  const artistPattern = new RegExp(`^${escapeRegex(artist)}\\s*[-:,–—]?\\s*`, 'i');
  title = title.replace(artistPattern, '');
  
  // 移除 "Song - Artist" 模式的尾部艺术家
  title = title.replace(/\s*[-–—]\s*[^-]+$/, '');
  
  // 标准化艺术家名
  artist = normalizeArtistName(artist);
  
  // 清理 title
  title = cleanSongTitle(title);
  
  return { artist, title };
}
```

### 核心改进 4: 配置驱动的职位定义

```javascript
const CREDIT_ROLES = {
  director: {
    patterns: [
      /\bDirected\s+by\b[:\s]+(.+?)(?=\n|$|\bDOP\b|\bEditor\b)/i,
      /\bDirector\b[:\s]+(.+?)(?=\n|$|\bDOP\b)/i,
      /\bDir\b\.?[:\s]+(.+?)(?=\n|$)/i,
    ],
    nextRoles: ['DOP', 'Cinematographer', 'Editor', 'Production'],
    cleaners: directorCleaners,
    blacklist: [
      /Creative\s+Director/i,
      /Art\s+Director/i,
      /Technical\s+Director/i,
    ],
  },
  
  editor: {
    patterns: [
      /\bEditor\b[:\s]+(.+?)(?=\n|$|\bColorist\b)/i,
      /\bEdited\s+by\b[:\s]+(.+?)(?=\n|$)/i,
    ],
    nextRoles: ['Colorist', 'VFX', 'Sound'],
    cleaners: universalCleaners,
    blacklist: [],
  },
  
  dop: {
    patterns: [
      /\bDOP\b[:\s]+(.+?)(?=\n|$|\bEditor\b)/i,
      /\bCinematographer\b[:\s]+(.+?)(?=\n|$)/i,
      /\bDirector\s+of\s+Photography\b[:\s]+(.+?)(?=\n|$)/i,
    ],
    nextRoles: ['Editor', 'Gaffer', 'Camera'],
    cleaners: universalCleaners,
    blacklist: [],
  },
  
  vfx: {
    patterns: [
      /\bVFX(?:\s+(?:Supervisor|Studio|Company))?\b[:\s]+(.+?)(?=\n|$|\bSound\b)/i,
      /\bVisual\s+Effects\b[:\s]+(.+?)(?=\n|$)/i,
    ],
    nextRoles: ['Sound', 'Mix', 'Label'],
    cleaners: vfxCleaners,
    blacklist: [],
  },
  
  sound_design: {
    patterns: [
      /\bSound\s+Design(?:er)?\b[:\s]+(.+?)(?=\n|$|\bLabel\b)/i,
      /\bSound\b[:\s]+(.+?)(?=\n|$|\bLabel\b)/i,
      /\bAudio\b[:\s]+(.+?)(?=\n|$)/i,
    ],
    nextRoles: ['Label', 'Copyright'],
    cleaners: soundCleaners,
    blacklist: [],
  },
};
```

---

## 🧪 测试策略

### 1. 单元测试（每个清洗器）

```javascript
// test-cleaners.js
describe('removeLeadingPunctuation', () => {
  test('removes leading dash', () => {
    expect(clean('- David Helman')).toBe('David Helman');
  });
  
  test('removes multiple leading symbols', () => {
    expect(clean('-- Name')).toBe('Name');
  });
});

describe('extractPersonFromOrg', () => {
  test('extracts person from "Org - Person"', () => {
    expect(clean('Playback Studio - Kostadin')).toBe('Kostadin');
  });
  
  test('extracts person from "Org: Person"', () => {
    expect(clean('Studio: Name')).toBe('Name');
  });
});
```

### 2. 集成测试（端到端）

```javascript
// test-ingest-e2e.js
describe('Credit Extraction E2E', () => {
  test('handles complex description with all roles', async () => {
    const mockDescription = `
      Directed by Hiro Murai
      DOP: Larkin Seiple
      Editor: Isaac Hagy
      VFX Studio: The Mill
      Sound Design: Playback - Kostadin Separevski
    `;
    
    const credits = parseCredits(mockDescription);
    
    expect(credits.director).toBe('Hiro Murai');
    expect(credits.dop).toBe('Larkin Seiple');
    expect(credits.editor).toBe('Isaac Hagy');
    expect(credits.vfx).toBe('The Mill');
    expect(credits.sound_design).toBe('Kostadin Separevski');
  });
});
```

### 3. 回归测试（真实数据）

```javascript
// test-real-videos.js
const testCases = [
  {
    videoId: 'YkLjqFpBh84',
    expected: {
      title: 'Cellophane',
      artist: 'FKA twigs',
      director: 'Andrew Thomas Huang',
    },
  },
  {
    videoId: 'CzJbz9qSsd0',
    expected: {
      title: 'Cheerleader',
      artist: 'Porter Robinson',
      sound_design: 'Kostadin Separevski', // Not "Playback: Kostadin"
    },
  },
];
```

---

## 📋 实施计划

### Phase 1: 清洗器基础设施 (1 天)
- [ ] 创建 `src/utils/cleaners.js`
- [ ] 实现通用清洗器（8 个函数）
- [ ] 实现职位专用清洗器（3 个函数）
- [ ] 单元测试（20+ 测试用例）

### Phase 2: 正则匹配重构 (1 天)
- [ ] 重写 `CREDIT_ROLES` 配置
- [ ] 实现 `extractCredit()` 管道函数
- [ ] 添加 `nextRoles` 边界检测
- [ ] 集成测试（10+ 复杂场景）

### Phase 3: Artist/Title 逻辑重构 (半天)
- [ ] 重写 `extractArtistAndTitle()`
- [ ] 扩展 K-Pop 检测规则
- [ ] 处理 "Song - Artist" 尾部模式
- [ ] 回归测试（现有 24 个视频）

### Phase 4: 集成与部署 (半天)
- [ ] 更新 `ingest.js` 主流程
- [ ] 更新 `hunter.js` 集成
- [ ] 运行完整测试套件
- [ ] 更新文档（INGEST_QUICKSTART.md）

### Phase 5: 批量修复现有数据 (半天)
- [ ] 创建 `fix-v4-migration.js`
- [ ] 修复现有 24 个视频文件
- [ ] 验证所有字段质量
- [ ] 提交修复

---

## 🎯 成功指标

### 数据质量目标

| 指标 | v3.0 | v4.0 目标 |
|------|------|-----------|
| Director 误匹配率 | 0% | 0% |
| 字段首字母截断 | 5% | **0%** |
| 组织前缀污染 | 15% | **0%** |
| 前导符号残留 | 10% | **0%** |
| Artist/Title 混淆 | 8% | **0%** |
| **总体错误率** | **38%** | **< 5%** |

### 可维护性目标

- ✅ 100% 单元测试覆盖（清洗器函数）
- ✅ 端到端测试套件（10+ 场景）
- ✅ 配置驱动（无硬编码正则）
- ✅ 模块化架构（可独立测试每个组件）

---

## 🚨 风险评估

### 低风险
- **清洗器重构**: 纯函数，易测试
- **配置化**: 提高可维护性

### 中风险
- **Artist/Title 逻辑**: 边缘情况可能很多，需要大量测试

### 高风险
- **正则表达式重写**: 可能引入新的匹配失败
  - **缓解**: 保留旧代码作为备份，逐步迁移

---

## 📚 附录

### A. 清洗器完整列表

```javascript
// Universal Cleaners
- removeLeadingPunctuation(str)
- removeTrailingPunctuation(str)
- removeSocialHandles(str)
- normalizeWhitespace(str)
- removeByPrefix(str)
- removeAndPrefix(str)

// Role-Specific Cleaners
- removeAndJobPrefix(str)         // "and Editor: Name" → "Name"
- extractPersonFromOrg(str)       // "Studio: Name" → "Name"
- extractPersonFromPlayback(str)  // "Playback - Name" → "Name"
- removeSupervisionTitles(str)    // "VFX Supervisor" → ""
- removeEngineerTitles(str)       // "Sound Engineer" → ""

// Validation
- validate(str)                   // 长度检查、黑名单过滤
```

### B. 测试覆盖矩阵

| 清洗器 | 测试用例数 | 边缘情况 |
|--------|-----------|----------|
| removeLeadingPunctuation | 5 | 多个符号、Unicode |
| extractPersonFromOrg | 8 | 多种分隔符、嵌套组织 |
| extractPersonFromPlayback | 6 | "Playback Studio", "Playback Supply" |
| Artist/Title 分离 | 12 | K-Pop、VEVO、括号内容 |

### C. 预期问题 Checklist

运行以下命令检测问题：

```bash
# 检测前导符号
grep -E '^(director|editor|dop|vfx|sound_design|art_director):\s*"[-–—]' src/content/videos/*.mdx

# 检测社交 handle
grep -E '@[\w.]+' src/content/videos/*.mdx

# 检测残留职位标签
grep -E ':\s*"[a-z]{1,6}:' src/content/videos/*.mdx

# 检测组织前缀
grep -E ':\s*"(Studio|Company|Team|Agency):' src/content/videos/*.mdx

# 检测 Artist/Title 混淆（Title 包含 " - "）
grep -E '^title:.*\s+-\s+' src/content/videos/*.mdx
```

---

**下一步**: 获得批准后开始 Phase 1 实施。

---

## 📖 参考文档

- `CREDIT_PARSING_FIX.md` - v3.x 修复历史
- `VIDEO_FIX_SUMMARY.md` - 数据质量问题总结
- `INGEST_QUICKSTART.md` - 用户使用指南
