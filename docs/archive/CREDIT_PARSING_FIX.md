# Credit 字段解析修复总结

修复日期: 2026-01-17

## 问题发现

用户发现 YouTube 视频描述的 credit 信息抓取有多个问题：

### 问题示例

1. **VFX 字段有 "by" 前缀**
   ```yaml
   vfx: "by Corduroy Studio"  # ❌ 应该是 "Corduroy Studio"
   ```

2. **Director 字段有 "and [Job]:" 前缀和 Instagram handle**
   ```yaml
   director: "and Editor: Tom Emmerson @tom.emmerson"  # ❌ 应该是 "Tom Emmerson"
   ```

3. **VFX 字段有截断的 "tudio:" (Studio: 被截断)**
   ```yaml
   vfx: "tudio: Frame 23 @frame23"  # ❌ 应该是 "Frame 23"
   ```

4. **DOP 和 Editor 字段有 Instagram handles**
   ```yaml
   dop: "Jaime Ackroyd @jaimeackroyd"  # ❌ 应该是 "Jaime Ackroyd"
   editor: "Tom Emmerson @tom"         # ❌ 应该是 "Tom Emmerson"
   ```

---

## 根本原因

### 1. 正则表达式不够精确

**VFX 正则**:
```javascript
// ❌ 旧版
regex: /\b(?:VFX|Visual\s+Effects|CGI)(?:\s+Supervisor)?\b/

// ✅ 新版
regex: /\b(?:VFX|Visual\s+Effects|CGI)(?:\s+(?:Supervisor|Studio|Company))?\b/
```

旧版没有考虑到 "VFX Studio:" 这种格式，导致只匹配到 "VFX"，而 "Studio: Frame 23" 被当作捕获内容。

### 2. 清洗逻辑不完整

旧的清洗逻辑只处理了部分情况：
- ❌ 没有清理 "by", "and", "with" 等前缀词
- ❌ 没有清理 "Studio:", "Company:" 等组织前缀
- ❌ 没有清理 Instagram handles (@username)
- ❌ 没有清理 "and [Job]:" 这种复合前缀

---

## 解决方案

### 1. 增强正则表达式

**文件**: `scripts/ingest.js` 第 103-105 行

```javascript
{ 
  key: 'vfx', 
  regex: /\b(?:VFX|Visual\s+Effects|CGI)(?:\s+(?:Supervisor|Studio|Company))?\b\.?\s*[:.\-]?\s*(.+?)(?:\n|$|\.|,)/im,
}
```

现在可以正确匹配：
- `VFX: Name`
- `VFX Supervisor: Name`
- `VFX Studio: Name` ✅ 新增
- `VFX Company: Name` ✅ 新增

### 2. 全面的清洗逻辑

**文件**: `scripts/ingest.js` 第 112-153 行

```javascript
// 🧹 Enhanced cleaning logic

// 1. Remove common prefixes (by, and, with, etc.)
cleanName = cleanName.replace(/^(?:by|and|with|&)\s+/i, '');

// 2. Remove job/organization prefixes with colon (Studio:, Company:, etc.)
cleanName = cleanName.replace(/^(?:Studio|Company|Team|Agency|House|Collective):\s*/i, '');

// 3. Remove job title suffixes
cleanName = cleanName.replace(/\b(?:Supervisor|Lead|Engineer|Mixer|Designer|Colorist|Editor|Co\.|Inc\.|Ltd\.)\b/gi, '');

// 4. Remove "and [Job Title]:" patterns (e.g., "and Editor:")
cleanName = cleanName.replace(/^and\s+\w+:\s*/i, '');

// 5. Remove partial words at the beginning (artifacts from regex matching)
cleanName = cleanName.replace(/^[a-z]{1,6}:\s*/i, '');

// 6. Remove Instagram/social media handles (@username)
cleanName = cleanName.replace(/\s*@[\w.]+\s*/g, ' ');

// 7. Remove leftover punctuation
cleanName = cleanName.replace(/^s\s*[:.\-]?\s*/i, '');
cleanName = cleanName.replace(/^[:.\-,\s&]+|[:.\-,\s&]+$/g, '');

// 8. Final trim and normalize whitespace
cleanName = cleanName.trim().replace(/\s{2,}/g, ' ');
```

### 3. Director 字段同样增强

**文件**: `scripts/ingest.js` 第 69-93 行

Director 解析也应用了相同的清洗逻辑：
- 移除 "and [Job]:" 前缀
- 移除 "by", "and" 等前缀词
- 移除 Instagram handles
- 清理尾部标点

---

## 测试验证

### 测试脚本

**文件**: `scripts/test-credit-parsing.js`

创建了 4 个测试用例，覆盖所有问题场景：

1. **Test 1**: "by" 前缀
2. **Test 2**: "and Editor:" 前缀 + Instagram handles
3. **Test 3**: 部分词 "tudio:"
4. **Test 4**: 多个 Instagram handles

### 测试结果

```bash
$ node scripts/test-credit-parsing.js

🧪 Testing Credit Parsing Logic
======================================================================

Test 1: "by" prefix in VFX                          ✅ PASS
Test 2: "and Editor:" prefix + Instagram handles    ✅ PASS
Test 3: Partial word "tudio:"                       ✅ PASS
Test 4: Multiple Instagram handles                  ✅ PASS

======================================================================
📊 Summary: 4 passed, 0 failed
🎉 All tests passed!
```

---

## 现有视频修复

### 手动修复的文件

**1. `2024-charli-xcx-360.mdx`**
```diff
- vfx: "by Corduroy Studio"
+ vfx: "Corduroy Studio"
```

**2. `2023-antslive-captain-ants.mdx`**
```diff
- title: "Captain Ants - AntsLive"
+ title: "Captain Ants"

- director: "and Editor: Tom Emmerson @tom.emmerson"
+ director: "Tom Emmerson"

- dop: "Jaime Ackroyd @jaimeackroyd"
+ dop: "Jaime Ackroyd"

- editor: "Tom Emmerson @tom"
+ editor: "Tom Emmerson"

- vfx: "tudio: Frame 23 @frame23"
+ vfx: "Frame 23"
```

**3. 文件名修复**
```bash
# 修复文件名（符合 yyyy-artist-title 格式）
2023-antslive-captain-ants---antslive.mdx → 2023-antslive-captain-ants.mdx

# 修复封面路径
/covers/2023/antslive-captain-ants---antslive.jpg → /covers/2023/antslive-captain-ants.jpg
```

### 验证

```bash
$ grep -E "@[\w.]|\\band\\b.*:|\\bby\\b |tudio:|ompany:" src/content/videos/*.mdx

✅ All credit fields (except production_company) are clean!
```

---

## 清洗规则总结

### 会被移除的模式

| 模式 | 示例 | 清洗后 |
|------|------|--------|
| 前缀词 | `by Corduroy Studio` | `Corduroy Studio` |
| 前缀词 | `and Tom Emmerson` | `Tom Emmerson` |
| 组织前缀 | `Studio: Frame 23` | `Frame 23` |
| 组织前缀 | `Company: ACME` | `ACME` |
| 复合前缀 | `and Editor: Tom` | `Tom` |
| 部分词 | `tudio: Frame 23` | `Frame 23` |
| Instagram | `Tom @tom.emmerson` | `Tom` |
| 职位后缀 | `Tom Supervisor` | `Tom` |
| 标点 | `Tom,` | `Tom` |

### 保留的内容

| 内容 | 说明 |
|------|------|
| 人名 | `Tom Emmerson` ✅ |
| 公司名 | `Corduroy Studio` ✅ |
| 组合名 | `Object & Animal` ✅ |
| 括号注释 | `Two Happy (Joseph Goldman)` ✅ |

---

## 未来预防

### 1. 持续测试

使用 `test-credit-parsing.js` 验证新的解析逻辑。

### 2. 定期审查

```bash
# 检查可能的问题模式
grep -E "@[\w.]|\\band\\b|\\bby\\b" src/content/videos/*.mdx
```

### 3. 改进建议

如果发现新的问题模式：
1. 添加到 `test-credit-parsing.js`
2. 更新清洗逻辑
3. 运行测试验证
4. 更新文档

---

## 相关文件

### 核心实现
- `scripts/ingest.js` - 主导入脚本（parseCredits 函数）
- `scripts/test-credit-parsing.js` - 测试脚本

### 文档
- `CREDIT_PARSING_FIX.md` - 本文档

---

## 总结

### 修复前后对比

**修复前**:
```yaml
director: "and Editor: Tom Emmerson @tom.emmerson"  ❌
dop: "Jaime Ackroyd @jaimeackroyd"                  ❌
editor: "Tom Emmerson @tom"                         ❌
vfx: "tudio: Frame 23 @frame23"                     ❌
vfx: "by Corduroy Studio"                           ❌
```

**修复后**:
```yaml
director: "Tom Emmerson"      ✅
dop: "Jaime Ackroyd"          ✅
editor: "Tom Emmerson"        ✅
vfx: "Frame 23"               ✅
vfx: "Corduroy Studio"        ✅
```

### 关键改进

1. ✅ **正则表达式更精确**: 支持 "VFX Studio:" 等格式
2. ✅ **清洗逻辑更全面**: 8 种清洗规则
3. ✅ **测试覆盖完整**: 4 个测试用例，100% 通过
4. ✅ **现有视频已修复**: 所有问题字段已清理

🎉 **Credit 字段解析现在更加可靠和准确！**
