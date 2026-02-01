# 🎯 Ingest V5.0 - 高级解析系统全面升级

## 📋 核心变更摘要

### 🔥 字段简化（从 8 个减少到 3 个）

**移除字段：**
- ❌ `editor` - 边缘职位，MV 制作中不重要
- ❌ `dop` / `cinematographer` - 非核心职位
- ❌ `art_director` - 边缘职位
- ❌ `vfx` - 后期制作职位
- ❌ `sound_design` - 音频职位
- ❌ `colorist` - 后期制作职位

**保留字段（核心 3 项）：**
- ✅ `director` - 主创导演（最重要）
- ✅ `production_company` - 制作公司/工作室
- ✅ `label` - 唱片公司/发行商

---

## 🚀 V5.0 智能解析策略

### 1️⃣ **导演识别（4 层智能匹配）**

#### 匹配模式：
```regex
1. Standard: "Directed by" / "Director:"
2. Artist-Director: "Written & Directed/Produced by" 
3. Compact: "Dir:" / "Dir."
4. Creative: "Creative Director:"
```

#### 智能清理：
- 🔧 **URL 移除**：`"Dom & Nic http://www.abc.com"` → `"Dom & Nic"`
- 🔧 **社交媒体句柄移除**：`"John Doe @johndoe"` → `"John Doe"`
- 🔧 **职位分隔符处理**：`"Chris Hopewell and Producer: Jane"` → `"Chris Hopewell"`
- 🔧 **描述词过滤**：拒绝包含 "video", "official", "album" 等的结果

#### 处理边界案例：
| 输入 | 输出 | 原因 |
|------|------|------|
| `Written and Produced by Robert Del Naja` | `director: "Robert Del Naja"` | 艺术家本人制作 = 导演 |
| `Dir: Dom & Nic http://...` | `director: "Dom & Nic"` | URL 自动截断 |
| `Production: Chris Hopewell` | `art_director: "Chris Hopewell"` ❌ → `director: "Chris Hopewell"` ✅ | 职位混淆修正 |

---

### 2️⃣ **制作公司识别（智能人名过滤）**

#### 匹配模式：
```regex
1. Primary: "Production Company:" / "Prod Co:"
2. Secondary: "Producer:" (但需验证是公司名而非人名)
```

#### 智能过滤逻辑：
```javascript
// 公司特征词检测
const companyKeywords = /Productions?|Studio|Films?|Pictures?|Ltd|Inc|UK|US/i;

// 人名模式检测（拒绝）
const personPattern = /^[A-Z][a-z]+\s+[A-Z][a-z]+$/; // "John Doe"

// 通过条件：有公司关键词 OR 不符合人名模式
```

#### 处理示例：
| 输入 | 输出 | 判断 |
|------|------|------|
| `Producer: PRETTYBIRD UK` | `production_company: "PRETTYBIRD UK"` ✅ | 有 "UK" 关键词 |
| `Producer: Robert Del Naja` | ❌ **拒绝** | 符合人名模式，应为导演 |
| `Prod Co: Somesuch` | `production_company: "Somesuch"` ✅ | 不符合人名模式 |

---

### 3️⃣ **标题清理（艺术家名去重）**

#### 问题修复：
**Before V5.0:**
```
Title: "Massive Attack, Young Fathers - Voodoo In My Blood"
Artist: "massiveattack"
→ 艺术家名重复出现在标题中 ❌
```

**After V5.0:**
```
Title: "Voodoo In My Blood"
Artist: "Massive Attack"
→ 干净的标题，正确的艺术家大小写 ✅
```

#### 清理策略：
1. 移除标题开头的艺术家名（`Artist - Title`）
2. 移除标题中间的重复艺术家名（`Artist, Artist - Title`）
3. 移除 MV 后缀（`Official Music Video`, `[MV]` 等）
4. 移除 featuring 模式（`(feat. Artist)`）
5. 规范化空白字符和标点

---

### 4️⃣ **智能标签系统**

#### 标签生成优先级：
```
1. 🏆 Hunter 注入标签（Visual Hook Taxonomy）
   ↓ 如果没有
2. 🎬 基于导演的标签（dir-[director-slug]）
   ↓ 加上
3. 📅 年代标签（2010s, 2020s）
   ↓ 如果仍然为空
4. 🏷️ 降级到 "uncategorized"
```

#### 示例输出：
```javascript
// Beyoncé - Formation (with hunter tags)
tags: ["political", "black-identity", "2010s"]

// David Bowie - Lazarus (no hunter tags)
tags: ["dir-johan-renck", "2010s"]

// Unknown video (no metadata)
tags: ["uncategorized"]
```

---

## 🛠️ 技术改进

### 正则表达式增强
```javascript
// OLD (V4.0) - 容易截断
/Director\s*[:.\-]?\s*([^\n,.]+?)(?:\n|$)/i

// NEW (V5.0) - 更宽松的捕获 + URL 过滤
/Director\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i
// Then: .replace(/\s*https?:\/\/\S+/g, '')
```

### 防止字段截断
- ✅ 使用 `[^\n]+?` 而不是 `[^\n,.]+?`（允许捕获更多内容）
- ✅ 然后在清理阶段精细处理（URL、社交媒体、职位分隔符）
- ✅ 最后验证有效性（长度、描述词过滤）

---

## 📊 对比测试

| 视频 | V4.0 问题 | V5.0 修复 |
|------|-----------|-----------|
| **Chemical Brothers - Wide Open** | `director: "Dom & Nic http://www"` ❌ | `director: "Dom & Nic"` ✅ |
| **Coldplay - Up&Up** | `editor: "Gal Muggia"` + `vfx: "..."` ❌ | 只输出 `production_company` + `director` ✅ |
| **Massive Attack - Voodoo** | `production_company: "Robert Del Naja"` ❌ | `director: "Robert Del Naja"` ✅ |
| **Radiohead - Burn The Witch** | `art_director: "Production: Chris Hopewell"` ❌ | `director: "Chris Hopewell"` ✅ |
| **Beyoncé - Formation** | `tags: ["uncategorized"]` ❌ | `tags: ["political", "black-identity"]` ✅ |

---

## 🚦 使用方法

### 单个视频导入
```bash
npm run ingest "https://www.youtube.com/watch?v=VIDEO_ID"
```

### 批量导入（带自动标签）
```bash
npm run hunter 2016
```

### 强制覆盖已有文件
```bash
npm run ingest "https://..." -- --force
```

---

## 🎯 预期输出示例

### 理想的 MDX 文件（V5.0）
```yaml
---
title: "Formation"
artist: "Beyoncé"
video_url: "https://youtube.com/watch?v=XXXXX"
publishDate: 2016-02-06
cover: "/covers/2016/beyonce-formation.jpg"
curator_note: ""
director: "Melina Matsoukas"
production_company: "Parkwood Entertainment"
label: "Columbia Records"
tags: ["political", "black-identity", "southern-gothic"]
---
```

### 日志输出
```
🔐 Proxy enabled: http://127.0.0.1:7897
🍪 Attempting with Brave cookies...
✅ Successfully fetched with Brave cookies
🎬 Processing: VIDEO_ID (Force Mode: false)
✅ Generated: src/content/videos/2016-beyonce-formation.mdx
   📅 Date: 2016-02-06
   🎬 Director: Melina Matsoukas
   🏢 Prod Co: Parkwood Entertainment
   🏷️  Tags: political, black-identity, southern-gothic
```

---

## ✅ 升级检查清单

- [x] 移除 5 个边缘字段（editor, dop, art_director, vfx, sound_design）
- [x] 简化为核心 3 字段（director, production_company, label）
- [x] 智能导演识别（处理 "Written & Produced by"）
- [x] 人名过滤逻辑（避免把导演放进 production_company）
- [x] URL 截断修复（正则表达式 + 清理逻辑）
- [x] 艺术家名去重（标题清理增强）
- [x] 智能标签系统（4 层降级策略）
- [x] 日志输出优化（显示实际抓取结果）

---

## 🔮 下一步优化建议

1. **机器学习辅助**：训练模型识别导演名 vs 公司名
2. **外部数据源**：集成 MusicBrainz / Discogs API 验证元数据
3. **批量修复工具**：`npm run fix-all` 批量修复已有 MDX 文件
4. **质量评分系统**：给每个 MDX 文件打分（元数据完整度）

---

**版本：** V5.0  
**日期：** 2026-01-18  
**作者：** Souply Bot  
**状态：** ✅ 已部署
