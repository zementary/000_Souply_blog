# 智能标签系统说明

## 核心理念

**移除所有废话标签！**

- ❌ 不使用 `"music-video"` 这种所有条目都有的通用标签
- ✅ 使用描述性、独特的视觉风格标签
- ✅ 每个标签都应该能让用户发现类似风格的视频

## 标签来源

### 1. 主要来源：CSV 的 Visual_Hook 字段 (通过 hunter.js)

当使用 `npm run hunter` 批量导入时，标签会自动从 CSV 的 `Visual_Hook` 列生成：

**CSV 示例**:
```csv
Artist,Title,Director,Year,Authority_Signal,Visual_Hook
Charli XCX,360,Aidan Zamiri,2024,UKMVA Video of Year,Era-Defining Internet Panopticon
Fontaines D.C.,Starburster,Aube Perrie,2024,Best Alt Video,Manic Spitting Montage
```

**生成的标签**:
- `Era-Defining Internet Panopticon` → `"era-defining-internet-panopticon"`
- `Manic Spitting Montage` → `"manic-spitting-montage"`

### 2. 手动导入时的自动标签

当使用 `npm run ingest <url>` 手动导入时，如果没有提供额外标签：

**自动生成规则** (scripts/ingest.js 第 348-355 行):
```javascript
if (allTags.length === 0) {
  // 基于导演生成标签
  if (credits.director) {
    allTags.push(`dir-${director-slug}`);
  }
  // 添加年份标签
  allTags.push(year);
}
```

**示例**:
- 导演 Aidan Zamiri → `["dir-aidan-zamiri", "2024"]`
- 无导演信息 → `["2024"]`

## 标签转换规则

**函数**: `slugifyTag()` (hunter.js 第 198-205 行)

```javascript
function slugifyTag(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')           // 空格转破折号
    .replace(/[^a-z0-9-]/g, '')     // 移除特殊字符
    .replace(/--+/g, '-')           // 合并多个破折号
    .replace(/^-|-$/g, '');         // 移除首尾破折号
}
```

**示例**:
| Visual Hook | 生成的标签 |
|-------------|-----------|
| `Era-Defining Internet Panopticon` | `era-defining-internet-panopticon` |
| `Manic Spitting Montage` | `manic-spitting-montage` |
| `Alpine Rap Stunt` | `alpine-rap-stunt` |
| `Stone-Skipping Physics` | `stone-skipping-physics` |

## 当前视频的标签示例

| 视频 | 标签 | 描述 |
|------|------|------|
| Charli XCX - 360 | `era-defining-internet-panopticon` | 定义时代的互联网全景监控风格 |
| Fontaines D.C. - Starburster | `manic-spitting-montage` | 狂躁吐字蒙太奇 |
| RM - LOST! | `surreal-office-maze` | 超现实主义办公室迷宫 |
| Captain Ants - AntsLive | `alpine-rap-stunt` | 阿尔卑斯说唱特技 |
| The Chemical Brothers - Skipping Like A Stone | `stone-skipping-physics` | 打水漂物理学 |

## 标签设计原则

### ✅ 好的标签

1. **描述性强**
   - ✅ `era-defining-internet-panopticon`
   - ✅ `manic-spitting-montage`
   - ✅ `one-take-choreography`

2. **独特性**
   - 能区分不同视频的视觉风格
   - 帮助用户发现类似美学的作品

3. **简洁有力**
   - 2-5 个单词
   - 易于理解和记忆

### ❌ 避免的标签

1. **通用标签** (所有视频都适用)
   - ❌ `music-video`
   - ❌ `video`
   - ❌ `official`

2. **艺术家/歌曲名称** (已有专门字段)
   - ❌ `charli-xcx`
   - ❌ `360`

3. **技术性标签** (除非是视觉特色)
   - ❌ `4k`
   - ❌ `hd`

## CSV Visual_Hook 填写指南

当为 hunter.js 准备 CSV 时，Visual_Hook 字段应该填写：

**格式**: 2-5 个单词，描述视频的核心视觉特征

**示例**:

| 风格类型 | Visual_Hook 示例 |
|---------|-----------------|
| 舞蹈编排 | `Synchronized Mirror Choreography` |
| 视觉效果 | `Liquid CGI Morphing` |
| 拍摄手法 | `Single-Take Tracking Shot` |
| 美学风格 | `Brutalist Black & White` |
| 叙事主题 | `Dystopian Office Satire` |

## 使用方式

### Hunter.js 批量导入
```bash
npm run hunter -- --file src/data/2024.csv
```

CSV 中的 Visual_Hook 自动转换为标签。

### 手动导入
```bash
npm run ingest https://youtube.com/watch?v=<video-id>
```

如果没有提供标签，自动生成基于导演和年份的标签。

### 手动指定标签
目前不支持直接通过命令行传入标签，但可以：
1. 先导入视频
2. 手动编辑 `.mdx` 文件的 `tags` 字段

## 未来改进方向

1. **AI 自动标签生成**
   - 使用 Claude/GPT-4V 分析视频截图
   - 自动提取视觉风格特征

2. **标签层级系统**
   - 主标签：视觉风格
   - 次标签：技术手法、情感基调

3. **标签推荐**
   - 根据导演历史作品推荐标签
   - 基于相似视频推荐标签

## 标签维护

定期审查标签：
```bash
# 查看所有标签
grep "^tags:" src/content/videos/*.mdx | sort | uniq

# 统计标签使用频率
grep "^tags:" src/content/videos/*.mdx | \
  sed 's/.*\[//' | sed 's/\]//' | \
  tr ',' '\n' | sort | uniq -c | sort -rn
```
