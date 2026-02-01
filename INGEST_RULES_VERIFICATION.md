# Ingest.js 导入规则验证

## 当前配置验证

### ✅ 1. Artist 标准化 (normalizeArtistName)

**代码位置**: `scripts/ingest.js` 第 137-162 行

**逻辑**:
```javascript
artist = normalizeArtistName(artist);
```

**映射表**:
```javascript
'charli xcx' → 'Charli XCX'
'fontaines dc' → 'Fontaines D.C.'  // ❌ 缺失！需要添加
'asap rocky' → 'A$AP Rocky'
'rm' → 'RM'
// ... 等 20+ 个艺术家
```

**测试用例**:
| 输入 | 输出 | 状态 |
|------|------|------|
| `Charli xcx` | `Charli XCX` | ✅ |
| `Fontaines DC` | `Fontaines DC` | ⚠️ 需要添加映射 |
| `RM` | `RM` | ✅ |

---

### ✅ 2. Title 清洗 (cleanSongTitle)

**代码位置**: `scripts/ingest.js` 第 170-217 行

**清洗步骤**:
1. **移除前导逗号/破折号** (第 174 行)
   - `, A$AP Rocky - Song` → `A$AP Rocky - Song`

2. **提取引号内容** (第 177-179 行)
   - `RM 'LOST!' Official MV` → `LOST!`
   - `Charli XCX "360" Official Video` → `360`

3. **移除 [MV] 前缀** (第 182 行)
   - `[MV] Artist - Song` → `Artist - Song`

4. **移除艺术家名前缀** (第 187-188 行)
   - `Fontaines D.C. - Starburster` → `Starburster`
   - `RM - LOST` → `LOST`
   - `Artist: Song` → `Song`

5. **移除 MV/Video 后缀** (第 196-211 行)
   - `Song Official MV` → `Song`
   - `Song (Official Music Video)` → `Song`
   - `Song - Official Video` → `Song`

**测试用例**:
| 原始 YouTube Title | Artist | 清洗后 Title | 状态 |
|-------------------|--------|-------------|------|
| `Charli xcx - 360 (Official Video)` | `Charli XCX` | `360` | ✅ |
| `Fontaines D.C. - Starburster` | `Fontaines D.C.` | `Starburster` | ✅ |
| `RM 'LOST!' Official MV` | `RM` | `LOST!` | ✅ |
| `, A$AP Rocky, Anderson .Paak - Gangsta` | `Free Nationals` | `A$AP Rocky, Anderson .Paak - Gangsta` | ✅ |

---

### ✅ 3. 文件名格式

**代码位置**: `scripts/ingest.js` 第 303-306 行

**格式**: `${year}-${artistSlug}-${titleSlug}.mdx`

```javascript
const artistSlug = artist.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
const titleSlug = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
const fileName = `${year}-${artistSlug}-${titleSlug}.mdx`;
```

**测试用例**:
| Artist | Title | Year | 文件名 |
|--------|-------|------|-------|
| `Charli XCX` | `360` | `2024` | `2024-charli-xcx-360.mdx` |
| `Fontaines D.C.` | `Starburster` | `2024` | `2024-fontaines-dc-starburster.mdx` |
| `RM` | `LOST!` | `2024` | `2024-rm-lost.mdx` |
| `The Chemical Brothers` | `Skipping Like A Stone ft. Beck` | `2023` | `2023-the-chemical-brothers-skipping-like-a-stone-ft-beck.mdx` |

---

### ✅ 4. 封面路径格式

**代码位置**: `scripts/ingest.js` 第 310-312 行

**格式**: `/covers/${year}/${artistSlug}-${titleSlug}.jpg`

```javascript
const coverSlug = `${artistSlug}-${titleSlug}`;
const publicCoverPath = `/covers/${year}/${coverSlug}.jpg`;
```

**测试用例**:
| Artist | Title | Year | 封面路径 |
|--------|-------|------|---------|
| `Charli XCX` | `360` | `2024` | `/covers/2024/charli-xcx-360.jpg` |
| `Fontaines D.C.` | `Starburster` | `2024` | `/covers/2024/fontaines-dc-starburster.mdx` |

---

## ⚠️ 发现的问题

### 问题 1: Fontaines D.C. 缺少标准化映射

**当前状态**:
- `artistMappings` 中没有 `'fontaines dc'` 的映射
- 导致可能输出为 `Fontaines DC` 而不是 `Fontaines D.C.`

**修复建议**:
在 `scripts/ingest.js` 第 158 行后添加：
```javascript
'fontaines dc': 'Fontaines D.C.',
```

---

## ✅ 预期行为总结

未来使用 `npm run hunter` 或 `npm run ingest <url>` 时：

### 导入示例 1: Charli XCX - 360
**YouTube 数据**:
- Title: `Charli xcx - 360 (Official Video)`
- Channel: `Charli XCX`

**导入结果**:
```yaml
# 文件: 2024-charli-xcx-360.mdx
title: "360"
artist: "Charli XCX"
cover: "/covers/2024/charli-xcx-360.jpg"
```

### 导入示例 2: Fontaines D.C. - Starburster
**YouTube 数据**:
- Title: `Fontaines D.C. - Starburster`
- Channel: `Fontaines DC`

**当前导入结果** (⚠️ 需要修复):
```yaml
# 文件: 2024-fontaines-dc-starburster.mdx
title: "Starburster"
artist: "Fontaines DC"  # ⚠️ 应该是 "Fontaines D.C."
cover: "/covers/2024/fontaines-dc-starburster.jpg"
```

**修复后的预期结果**:
```yaml
# 文件: 2024-fontaines-dc-starburster.mdx
title: "Starburster"
artist: "Fontaines D.C."  # ✅ 正确
cover: "/covers/2024/fontaines-dc-starburster.jpg"
```

### 导入示例 3: RM - LOST!
**YouTube 数据**:
- Title: `RM 'LOST!' Official MV`
- Channel: `HYBE LABELS`

**导入结果**:
```yaml
# 文件: 2024-rm-lost.mdx
title: "LOST!"
artist: "RM"
cover: "/covers/2024/rm-lost.jpg"
```

---

## 🔧 需要立即修复的问题

### 1. 添加 Fontaines D.C. 映射

**文件**: `scripts/ingest.js`
**位置**: 第 158 行后

```javascript
const artistMappings = {
  'charli xcx': 'Charli XCX',
  // ... 其他映射 ...
  'fontaines dc': 'Fontaines D.C.',  // ← 添加这行
  'sbtrkt': 'SBTRKT'
};
```

---

## ✅ 验证方式

运行以下命令测试导入规则：

```bash
# 测试单个视频导入
npm run ingest https://youtube.com/watch?v=<video-id>

# 检查生成的文件名格式
ls -1 src/content/videos/

# 检查文件内容
cat src/content/videos/<filename>.mdx
```

**预期检查点**:
- [ ] 文件名格式: `yyyy-artist-title.mdx`
- [ ] title 字段不包含艺术家名
- [ ] artist 字段使用正确的大小写
- [ ] cover 路径格式: `/covers/yyyy/artist-title.jpg`
