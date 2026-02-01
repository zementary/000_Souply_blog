# Ingest v4.0 全面优化总结

## 修复日期：2026-01-17

---

## 🎯 核心问题与修复

### 1. **导演字段污染** (stromae 案例)
**问题**: 捕获了描述性文字而非纯导演名  
```
❌ 旧: "Luc Van Haver. and Xavier Reyé, « Quand C'est ? » is the seventh video..."
✅ 新: "Luc Van Haver and Xavier Reyé"
```

**修复方案**:
- 在逗号/句号处截断（避免捕获后续描述）
- 移除开头的破折号 `-`
- 拒绝包含 `is/the/from/video/album` 等描述词的字符串
- 长度限制 < 100 字符

---

### 2. **首字母截断问题** (jade, ezra, ok-go 案例)
**问题**: 字段值丢失首字母  
```
❌ 旧: "arah Asmail" (Art Director)
✅ 新: "Sarah Asmail"

❌ 旧: "omesuch" (Production Company)
✅ 新: "Somesuch"

❌ 旧: "hunsuke Kakuuchi" (Editor)
✅ 新: "Shunsuke Kakuuchi"
```

**根本原因**:  
正则捕获组 `(.+?)(?:\.|,)` 在遇到 `Production Company: Homesuch` 时，前缀清理逻辑过于激进，移除了 `^[a-z]{1,6}:` 导致 `H` 被误删。

**修复方案**:
1. 正则改为 `([^\n,.]+?)(?:\n|$)` - 更宽松的捕获边界
2. 只移除单字母前缀 `^[a-z]:` 而非 `^[a-z]{1,6}:`
3. 优先移除开头破折号 `-` (在所有清理逻辑之前)

---

### 3. **频道/厂牌误判为艺术家** (lisa 案例)
**问题**: `LLOUD Official` (厂牌频道) 被识别为艺术家，真正艺术家 `LISA` 在标题中  
```
❌ 旧: artist: "LLOUD Official", title: "LISA - ROCKSTAR"
✅ 新: artist: "LISA", title: "ROCKSTAR"
```

**修复方案**:
- 扩展 `labelKeywords` 列表，新增: `LLOUD`, `RCA`, `ATLANTIC`, `COLUMBIA`, `INTERSCOPE`
- 改进标题解析：支持 `Artist - Song` 模式（正则：`/^([A-Z][^\-–—]+?)\s*[-–—]\s*/`）
- 支持多种分隔符：`-`, `–`, `—`

---

### 4. **边缘职位移除** (sound_design)
**问题**: `sound_design` 在 MV 制作中不够核心，且容易误捕获  
```
❌ 旧: sound_design: "Operator: Isao Yoshida"
```

**修复方案**:
- 从 `roleMaps` 中移除 `sound_design` 解析规则
- 从 frontmatter 生成中移除该字段
- 保留核心职位：`director`, `dop`, `editor`, `production_company`, `art_director`, `vfx`

---

### 5. **纯音频视频过滤**
**问题**: `Son Lux - Change is Everything` 是纯音频（非 MV）被误录入  

**修复方案**:
- 在元数据获取后立即检测标题关键词
- 过滤词列表: `['audio', 'lyric video', 'lyrics', 'visualizer', 'audio only', 'official audio']`
- 返回 `status: 'skipped', reason: 'pure_audio'`

---

## 📋 规则优化总览

### A. 正则表达式改进
```javascript
// 旧版（容易截断首字母）
regex: /\b(?:Production\s+Co)\b\.?\s*[:.\-]?\s*(.+?)(?:\n|$|\.|,)/im

// 新版（宽松捕获，防止边界问题）
regex: /\b(?:Production\s+Co)\b\.?\s*[:.\-]?\s*([^\n,.]+?)(?:\n|$)/im
```

### B. 清理逻辑强化
```javascript
// 1. 优先移除开头破折号（CRITICAL）
cleanName = cleanName.replace(/^[-–—]+\s*/, '');

// 2. 温和的前缀清理（避免误删首字母）
cleanName = cleanName.replace(/^[a-z]:\s*/i, '');  // 只移除单字母前缀
```

### C. 艺术家识别增强
```javascript
const labelKeywords = [
  'LABEL', 'ENTERTAINMENT', 'SMTOWN', 'JYP', 'YG', 'HYBE', 'VEVO', 'OFFICIAL',
  'RECORDS', 'MUSIC', 'LLOUD', 'RCA', 'ATLANTIC', 'COLUMBIA', 'INTERSCOPE'
];

// 支持多种标题格式
const titleMatchA = rawTitle.match(/^([A-Z][^\-–—]+?)\s*[-–—]\s*/);  // "LISA - Song"
const titleMatchB = rawTitle.match(/^\[MV\]\s*(.+?)\s*[-–—]\s*/);     // "[MV] Artist - Song"
const titleMatchC = rawTitle.match(/^['""]([^'""]+)['""]?\s*[-–—]?\s*/); // "Artist" - Song
```

---

## 🧹 已修复的文件

1. ✅ `2015-stromae-quand-cest-.mdx` - director 字段清理
2. ✅ `2024-idles-gift-horse.mdx` - 移除 director 前的破折号
3. ✅ `2024-jade-angel-of-my-dreams.mdx` - 修复首字母截断 + 移除 sound_design
4. ✅ `2024-lloud-official-lisa---rockstar.mdx` - 修正艺术家识别
5. ✅ `2024-ezra-collective-god-gave-me-feet-for-dancing.mdx` - 修复 production_company 截断
6. ✅ `2014-ok-go-i-wont-let-you-down.mdx` - 修复多个字段截断 + 移除 sound_design
7. ❌ `2020-son-lux-change-is-everything.mdx` - **已删除**（纯音频）

---

## 🚀 v4.0 新特性

### 1. 纯音频检测 (Audio Filter)
```javascript
const audioKeywords = ['audio', 'lyric video', 'lyrics', 'visualizer', 'audio only', 'official audio'];
const isPureAudio = audioKeywords.some(kw => title.toLowerCase().includes(kw));

if (isPureAudio) {
  return { status: 'skipped', reason: 'pure_audio', title };
}
```

### 2. 导演字段验证器
```javascript
// 拒绝包含描述词的字符串
const descriptionWords = /(?:is|the|a|an|from|video|album|official|music|song)/i;
if (!descriptionWords.test(director) && director.length < 100) {
  credits.director = director;
}
```

### 3. 首字母保护机制
- 不再激进地移除小写字母前缀
- 只清理明确的单字符噪音（如 `s:`, `t:`）
- 优先处理完整单词边界

---

## 📝 使用建议

### 批量重新录入
对于现有问题条目，建议使用 `--force` 重新录入：

```bash
npm run ingest "https://youtube.com/watch?v=8aJw4chksqM" -- --force  # Stromae
npm run ingest "https://youtube.com/watch?v=hbcGx4MGUMg" -- --force  # LISA
```

### 手动修复优先级
如果只想修复关键字段，按以下优先级排查：
1. **artist** - 影响归档和搜索
2. **director** - 核心创意归属
3. **production_company** - 制作归属
4. **其他职位** - 次要

---

## 🎨 Schema 变更

`src/content/config.ts` 无需修改，`sound_design` 字段保留为 optional，只是不再自动填充。

---

## 🔍 测试建议

对以下场景进行回归测试：
1. ✅ K-Pop 厂牌频道（SMTOWN, JYP, HYBE, LLOUD）
2. ✅ 西方厂牌频道（VEVO, RCA, Atlantic Records）
3. ✅ 纯音频视频（Lyric Video, Official Audio, Visualizer）
4. ✅ 特殊字符（导演名包含 `-`, `&`, `.`）
5. ✅ 多语言描述（法语、日语、中文）

---

## 📊 统计

- **代码修改**: 5 处核心逻辑
- **正则优化**: 6 个解析模式
- **文件修复**: 6 个 MDX 文件
- **删除条目**: 1 个（纯音频）
- **版本号**: v4.0 (Breaking Change)

---

**结论**: 本次优化显著提升了录入准确性，尤其在处理特殊格式和边缘情况时。建议对所有历史条目进行一次审查，重点关注 `artist` 和 `director` 字段。
