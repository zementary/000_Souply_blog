# Parser V6.0 改进日志

## 概述
基于用户反馈的批量错误案例，系统性改进了 `parser.js` 的解析逻辑，解决了标题清理、艺术家识别和Credits提取中的多个问题。

## 测试结果
- **通过率**: 100% (22/22 测试通过)
- **测试脚本**: `scripts/test-parser-fixes.js`

---

## 主要改进

### 1. 标题清理 (cleanSongTitle)

#### ✅ 质量标签过滤增强
**问题**: HD, 4K, 8K, 120fps, DTS-HD 等质量标签被保留在标题中

**解决方案**:
```javascript
// 新增过滤规则
- HD, 4K, 8K, UHD, FHD
- 分辨率标签: 1080p, 720p, 480p
- 帧率标签: 60fps, 120fps
- 音频格式: DTS-HD, DTS HD, 5.1, 7.1, Dolby, Atmos
- Explicit 标签
```

**案例修复**:
- `Blackstar [HD]` → `Blackstar` ✅
- `Taste (4K 120fps DTS-HD 5.1)` → `Taste` ✅

#### ✅ 管道分隔符支持
**问题**: `BICEP | APRICOTS` 格式未被识别

**解决方案**: 添加对 `Artist | Song` 格式的专门处理

**案例修复**:
- `BICEP | APRICOTS` → `APRICOTS` ✅

#### ✅ 艺术家名去重增强
**问题**: 
1. 艺术家名重复时标题为空 (e.g., `Brodinski - Brodinski - Can't Help Myself`)
2. 艺术家名在标题末尾未被移除 (e.g., `Captain Ants - AntsLive`)

**解决方案**:
- 添加标题开头和末尾的艺术家名移除逻辑
- 当标题为空时，尝试从原始标题中提取最后一个分隔符后的内容
- 支持 `Song - Artist` 格式（艺术家在末尾）

**案例修复**:
- `Brodinski - Can't Help Myself` (artist: Brodinski) → `Can't Help Myself` ✅
- `Captain Ants - AntsLive` (artist: AntsLive) → `Captain Ants` ✅

---

### 2. 艺术家识别 & 标准化

#### ✅ Fan Repost 频道识别
**问题**: ASAPROCKYUPTOWN, GambinoArchive 等 fan repost 频道被当作艺术家

**解决方案** (ingest.js):
```javascript
// 新增 Fan Repost 模式识别
const fanRepostPatterns = [
  /^(.+?)(?:UPTOWN|ARCHIVE|FAN|LIVE|VIDEOS?|CHANNEL|HD|OFFICIAL)$/i,
  /^(.+?)(?:Music|Videos?|Channel|Archive|Fan|Live|HD)$/i
];
```

**案例修复**:
- ASAPROCKYUPTOWN → A$AP Rocky ✅
- GambinoArchive → Childish Gambino ✅

#### ✅ 艺术家名标准化扩展
**新增映射**:
```javascript
'asaprockyuptown': 'A$AP Rocky'    // Fan channel
'gambinoarchive': 'Childish Gambino' // Fan channel
'antslive': 'AntsLive'
'bicep': 'BICEP'
'childish gambino': 'Childish Gambino'
```

---

### 3. Credits 解析 (parseCredits)

#### ✅ 避免 "Co-ordinator" 被截断为 "ordinator"
**问题**: "Co-ordinator: Laura Clery" 被错误提取为 production_company

**解决方案**:
- 在所有正则模式中添加 `(?:^|\n)` 确保从行首开始匹配
- 添加 `\b` 词边界确保完整单词匹配
- 清理过程中移除 "Co-ordinator:" 等角色前缀

**案例修复**:
- ❌ 之前: 提取到 "ordinator"
- ✅ 现在: 跳过，不提取

#### ✅ "Editor:" 污染 director 字段
**问题**: "Editor: Tom Emmerson" 被提取为 director

**解决方案**:
- 在清理过程中添加角色前缀移除: `Editor`, `Producer`, `DOP`, `Cinematographer`
- 在验证中添加 "editor" 关键词黑名单

**案例修复**:
- `Editor: Tom Emmerson` → 正确提取为 `Tom Emmerson` ✅
- `Director: Tom Emmerson\nEditor: Sarah Johnson` → 只提取 director ✅

#### ✅ "Produced by" 公司名提取
**问题**: 无法从 "Produced by ICONOCLAST" 中提取公司名

**解决方案**:
- 添加专门的 "Produced by" 模式，匹配全大写公司名
- 添加 Executive Producers 模式
- 扩展公司关键词识别（支持全大写格式如 ICONOCLAST, DIVISION）

**案例修复**:
- `Produced by DIVISION` → production_company: `DIVISION` ✅
- `Produced by ICONOCLAST` → production_company: `ICONOCLAST` ✅
- `Executive Producers: Pavel Brenner, Ania Markham` → production_company: `Pavel Brenner, Ania Markham` ✅

#### ✅ 社交媒体标识清理
**问题**: "(Insta: @markjenkin Twitter: @mark)" 被保留在 director 字段

**解决方案**: 添加括号内容移除逻辑

**案例修复**:
- `Mark Jenkin (Insta: Twitter: )` → `Mark Jenkin` ✅

---

### 4. 垃圾视频过滤 (hunter.js)

#### ✅ Awards 宣传视频过滤
**问题**: 非MV内容（如奖项宣传视频）被错误抓取

**解决方案**: 在 BLOCKLIST 中添加关键词:
```javascript
'music video awards',
'award winner',
'best director',
'best music video'
```

**案例修复**:
- `Best Director at the London Music Video Awards 2025` → 应被过滤 ✅

---

## 通用改进原则

### 1. 模式匹配精确性
- 使用 `(?:^|\n)` 确保从行首匹配，避免部分词匹配
- 使用 `\b` 词边界确保完整单词匹配
- 使用 word boundary 避免 "Co-ordinator" → "ordinator" 这类错误

### 2. 清理流程标准化
所有提取的字段都经过统一清理:
1. 移除前导/尾随标点和空格
2. 移除 URL 和社交媒体标识
3. 移除括号内的说明文字
4. 移除角色前缀（Editor:, Producer: 等）
5. 在换行符或特定分隔符处截断

### 3. 验证增强
- 长度验证 (2-80 字符)
- 关键词黑名单（避免误提取描述性文本）
- 格式验证（公司 vs 人名）

---

## 测试覆盖

### 标题清理 (9 个测试)
- ✅ 艺术家名去重
- ✅ HD/4K 质量标签移除
- ✅ 管道分隔符处理
- ✅ Explicit 标签移除
- ✅ Fan repost 格式
- ✅ 艺术家在标题末尾
- ✅ 复杂音频格式标签

### Credits 解析 (6 个测试)
- ✅ Editor 前缀移除
- ✅ Produced by 提取
- ✅ Executive Producers 提取
- ✅ Co-ordinator 避免
- ✅ 社交媒体标识移除
- ✅ 公司 vs 人名识别

### 艺术家标准化 (7 个测试)
- ✅ Fan channel 映射
- ✅ 大小写标准化
- ✅ 特殊字符处理

---

## 向后兼容性
✅ 所有修改保持向后兼容，现有功能不受影响

## 性能影响
⚡ 添加的正则表达式经过优化，性能影响可忽略

## 下一步建议
1. 定期更新艺术家映射表（发现新的特殊大小写）
2. 监控新的质量标签格式并添加到过滤列表
3. 扩展 Fan Repost 模式识别规则
4. 建立用户反馈收集机制，持续改进解析逻辑
