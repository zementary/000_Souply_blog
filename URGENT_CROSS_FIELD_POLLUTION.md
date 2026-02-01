# 🚨 紧急：跨职位字段污染问题

**发现日期**: 2026-01-17  
**严重程度**: 高  
**影响范围**: 至少 2 个文件（可能更多）

---

## 🔍 问题描述

### 典型案例

**文件**: `2024-hana-vu-care.mdx`

```yaml
# ❌ 当前（错误）
director: "Maegan Houang Producer: John J. Lozada, Ade Macalinao"
production_company: "John J"

# ✅ 应该是
director: "Maegan Houang"
# Producer: John J. Lozada, Ade Macalinao （需要单独处理或忽略）
production_company: "（需查 YouTube 原文）"
```

---

## 🐛 根本原因

### YouTube 描述格式

当 YouTube 描述将多个职位写在**同一行**时：

```
Director: Maegan Houang Producer: John J. Lozada, Ade Macalinao
```

### Ingest.js 的问题

**文件**: `scripts/ingest.js` 第 64 行

```javascript
// ❌ 当前正则（有问题）
/(?:Directed\s+by|Director)[:\s]+(.+?)(?:\n|$)/i

// 问题：终止条件只有换行（\n）或行尾（$）
// 如果同行有 "Producer:"，会一起捕获
```

**捕获结果**:
```javascript
match[1] = "Maegan Houang Producer: John J. Lozada, Ade Macalinao"
```

---

## 📊 影响评估

### 已确认的问题文件

运行检测发现 **2 处**字段前缀污染：

```bash
npm run check-quality
```

1. ❌ `2024-amyl-and-the-sniffers-big-dreams.mdx`
   ```yaml
   editor: "Cinematographer - John Angus Stewart"
   ```

2. ❌ `2024-hana-vu-care.mdx`
   ```yaml
   director: "Maegan Houang Producer: John J. Lozada, Ade Macalinao"
   ```

### 可能的未检测问题

如果职位标签不在已知列表中（如 "Stylist:", "Choreographer:"），检测脚本会遗漏。

**建议手动检查**:
```bash
# 查找可能的跨职位污染
grep -E '(director|editor|dop|vfx):\s*"[^"]{60,}"' src/content/videos/*.mdx
```

---

## 🔧 紧急修复方案

### 方案 1: 手动修复（立即）

**步骤**:

1. **检测问题文件**
   ```bash
   npm run check-quality
   ```

2. **查看 YouTube 原视频描述**
   - 打开对应的 YouTube 视频
   - 复制完整的 Credits 部分

3. **手动分离职位**
   ```yaml
   # 原始描述可能是：
   # Director: Maegan Houang Producer: John J. Lozada, Ade Macalinao
   # Production Company: XYZ Studio
   
   # 手动分离为：
   director: "Maegan Houang"
   # producer 字段当前 schema 不支持，可以忽略或添加到 curator_note
   production_company: "XYZ Studio"  # 从下一行获取
   ```

---

### 方案 2: 临时修复正则（短期）

**文件**: `scripts/ingest.js` 第 62-98 行

```javascript
// ✅ 临时修复版本
const directorPatterns = [
  // 添加前瞻断言，在遇到其他职位标签时停止
  /(?:Directed\s+by|Director)[:\s]+(.+?)(?=\n|$|\b(?:Producer|DOP|Editor|Cinematographer|Production|VFX|Sound|Colorist)\b)/i,
  /(?:Writer\s+&\s+Director|Written\s+&\s+Directed\s+by)[:\s]+(.+?)(?=\n|$|\b(?:Producer|DOP|Editor)\b)/i,
  /\bDir[:\.\s]+(.+?)(?=\n|$|\b(?:Producer|DOP|Editor)\b)/i
];
```

**优点**: 快速修复
**缺点**: 
- 治标不治本
- 需要维护职位标签列表
- 仍然可能遗漏未知职位

---

### 方案 3: v4.0 架构重构（长期）

参考 `INGEST_V4.0_BLUEPRINT.md` 的完整解决方案：

1. **双阶段提取**
   - Stage 1: 粗提取（宽松匹配）
   - Stage 2: 边界检测（裁剪到下一个职位）

2. **配置驱动**
   ```javascript
   const CREDIT_ROLES = {
     director: {
       patterns: [...],
       nextRoles: ['Producer', 'DOP', 'Editor', 'Production'],  // 明确的边界
       cleaners: [...]
     }
   };
   ```

---

## ✅ 当前修复清单

### 文件 1: `2024-hana-vu-care.mdx`

**步骤**:

1. 打开 YouTube: https://youtube.com/watch?v=pM9nj3Pddrc
2. 查看描述的 Credits 部分
3. 手动修复字段：

```yaml
# 当前
director: "Maegan Houang Producer: John J. Lozada, Ade Macalinao"
production_company: "John J"

# 修复为（需查原文）
director: "Maegan Houang"
production_company: "（查原文填写）"
# 注意: Producer 信息可以添加到 curator_note 或忽略（schema 不支持）
```

---

### 文件 2: `2024-amyl-and-the-sniffers-big-dreams.mdx`

```yaml
# 当前
editor: "Cinematographer - John Angus Stewart"

# 修复为
editor: "John Angus Stewart"
```

这个问题已在 `START_HERE.md` 的优先级 2 中列出。

---

## 📋 预防措施

### 短期（本周）

1. ✅ **更新检测规则**（已完成）
   - 添加 "Producer" 到职位标签黑名单
   - 扩展 `production_company` 字段的检测

2. ⏳ **手动修复现有问题**
   - 使用 `npm run check-quality` 识别所有问题
   - 回查 YouTube 原文

3. ⏳ **临时修复正则**
   - 参考方案 2
   - 添加前瞻断言

### 长期（未来 1-2 周）

4. ⏳ **实施 v4.0 架构**
   - 参考 `INGEST_V4.0_BLUEPRINT.md`
   - 双阶段提取 + 配置驱动

5. ⏳ **建立回归测试**
   - 为每种跨职位污染场景添加测试用例
   - 确保未来不再发生

---

## 🧪 测试用例

### 测试场景 1: 同行多职位

**YouTube 描述**:
```
Director: John Doe Producer: Jane Smith Editor: Bob Lee
```

**期望输出**:
```yaml
director: "John Doe"
# producer: "Jane Smith"  # 如果 schema 支持
editor: "Bob Lee"
```

---

### 测试场景 2: 职位+破折号

**YouTube 描述**:
```
Editor: Cinematographer - John Doe
```

**期望输出**:
```yaml
editor: "John Doe"
```

---

### 测试场景 3: 多行混合

**YouTube 描述**:
```
Director: John Doe
Producer: Jane Smith DOP: Bob Lee
Editor: Alice Wong
```

**期望输出**:
```yaml
director: "John Doe"
dop: "Bob Lee"
editor: "Alice Wong"
```

---

## 📊 更新后的质量统计

运行 `npm run check-quality` 后的最新统计：

```
📁 总文件数: 21
🚨 严重: 10 个（首字母截断，增加了 production_company）
❌ 错误: 2 个（字段前缀污染，包括新发现的 hana-vu-care）
⚠️  警告: 7 个（Title/Artist 混淆）
ℹ️  提示: 21 个（curator_note 空）
```

---

## 🚀 立即行动

1. **运行检测**
   ```bash
   npm run check-quality
   ```

2. **修复 hana-vu-care**
   ```bash
   # 查看 YouTube 原视频
   # 手动编辑 src/content/videos/2024-hana-vu-care.mdx
   ```

3. **验证修复**
   ```bash
   npm run check-quality -- --file src/content/videos/2024-hana-vu-care.mdx
   ```

---

## 📚 相关文档

- `START_HERE.md` - 快速上手指南（已更新，包含此问题）
- `INGEST_V4.0_BLUEPRINT.md` - 长期架构方案（双阶段提取）
- `INGEST_QUALITY_CHECKLIST.md` - 质量检查清单

---

**下一步**: 立即修复 `2024-hana-vu-care.mdx`，然后考虑实施方案 2（临时修复正则）。
