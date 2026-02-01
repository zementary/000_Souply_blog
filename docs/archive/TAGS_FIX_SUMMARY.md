# 标签系统修复总结

修复日期: 2026-01-17

## 问题

用户发现所有视频都有 `"music-video"` 这个无意义的通用标签，而智能化的标签生成逻辑被忽略了。

## 根本原因

在 `scripts/ingest.js` 第 347 行：

```javascript
// ❌ 旧代码
const allTags = ['music-video', ...additionalTags];
```

这导致：
1. 所有视频都强制添加 `"music-video"` 标签
2. 即使有智能标签（从 CSV Visual_Hook 生成），也会被这个废话标签污染

## 解决方案

### 1. 移除通用标签

**修改**: `scripts/ingest.js` 第 347-360 行

```javascript
// ✅ 新代码
// Generate smart tags (no generic "music-video" tag)
const allTags = [...additionalTags];

// Add auto-generated tags if no custom tags provided
if (allTags.length === 0) {
  // Generate tags based on director, year, or other metadata
  if (credits.director) {
    allTags.push(`dir-${credits.director.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 20)}`);
  }
  // Add year tag
  allTags.push(year);
}
```

### 2. 清理现有视频

**脚本**: `scripts/remove-music-video-tag.js`

移除所有现有视频的 `"music-video"` 标签，保留智能标签。

**结果**:
- ✅ 更新了 5 个文件
- ✅ 所有视频现在只有有意义的标签

## 修复前后对比

### 修复前
```yaml
tags: ["music-video", "era-defining-internet-panopticon"]
tags: ["music-video", "manic-spitting-montage"]
tags: ["music-video", "surreal-office-maze"]
```

### 修复后
```yaml
tags: ["era-defining-internet-panopticon"]
tags: ["manic-spitting-montage"]
tags: ["surreal-office-maze"]
```

## 智能标签系统工作流程

### 方式 1: CSV 批量导入 (推荐)

```bash
npm run hunter -- --file src/data/2024.csv
```

**CSV 格式**:
```csv
Artist,Title,Director,Year,Authority_Signal,Visual_Hook
Charli XCX,360,Aidan Zamiri,2024,UKMVA Video of Year,Era-Defining Internet Panopticon
```

**Visual_Hook 自动转换为标签**:
- `Era-Defining Internet Panopticon` → `["era-defining-internet-panopticon"]`

**代码位置**: `scripts/hunter.js` 第 164 行
```javascript
const options = {
  additionalTags: [slugifyTag(Visual_Hook)]
};
```

### 方式 2: 手动导入

```bash
npm run ingest https://youtube.com/watch?v=<video-id>
```

**自动生成规则**:
- 如果有导演: `["dir-{director-slug}", "{year}"]`
- 如果无导演: `["{year}"]`

## 现有视频标签示例

| 视频 | 标签 | 来源 |
|------|------|------|
| Charli XCX - 360 | `["era-defining-internet-panopticon"]` | CSV Visual_Hook |
| Fontaines D.C. - Starburster | `["manic-spitting-montage"]` | CSV Visual_Hook |
| RM - LOST! | `["surreal-office-maze"]` | CSV Visual_Hook |
| Captain Ants - AntsLive | `["alpine-rap-stunt"]` | CSV Visual_Hook |
| The Chemical Brothers - Skipping Like A Stone | `["stone-skipping-physics"]` | CSV Visual_Hook |

## 标签设计原则

### ✅ 好的标签
- **描述性强**: 能准确描述视频的视觉特色
- **独特性**: 帮助用户发现类似风格的作品
- **简洁有力**: 2-5 个单词

**示例**:
- `era-defining-internet-panopticon` ✅
- `manic-spitting-montage` ✅
- `one-take-choreography` ✅

### ❌ 避免的标签
- **通用标签**: `music-video`, `video`, `official` ❌
- **重复信息**: `charli-xcx`, `360` (已有专门字段) ❌
- **技术性**: `4k`, `hd` (除非是视觉特色) ❌

## 未来导入

### Hunter.js 批量导入
✅ 自动从 CSV Visual_Hook 生成智能标签
✅ 无通用标签污染

### 手动导入
✅ 如果提供 additionalTags: 使用智能标签
✅ 如果未提供: 自动生成基于导演/年份的标签
✅ 无通用标签污染

## 相关文件

- `scripts/ingest.js` - 主导入脚本（已更新）
- `scripts/hunter.js` - CSV 批量导入（使用 Visual_Hook）
- `scripts/remove-music-video-tag.js` - 清理脚本
- `TAGS_SYSTEM.md` - 完整标签系统文档

## 验证

运行以下命令验证标签系统：

```bash
# 查看所有标签
grep "^tags:" src/content/videos/*.mdx

# 确认没有 "music-video" 标签
grep "music-video" src/content/videos/*.mdx
# 应该返回空结果
```
