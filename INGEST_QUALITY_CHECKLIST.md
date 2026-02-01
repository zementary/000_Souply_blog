# ✅ 录入质量检查清单

**用途**: 录入后必查项目，确保数据质量  
**更新**: 2026-01-17

---

## 🎯 快速检查命令

### 一键检测所有问题

```bash
# 运行完整质量检查
npm run check-quality

# 或手动运行各项检查
cd src/content/videos && grep -E '<PATTERN>' *.mdx
```

---

## 📋 检查项目

### ✅ 1. 字段前缀污染

**问题**: 字段值包含其他职位标签

```bash
# 检测模式
grep -E '(director|editor|dop|vfx|sound_design|art_director):\s*"[^"]*\b(Cinematographer|Editor|Director|DOP|VFX|Sound)\s*[-:]' *.mdx
```

**常见错误**:
```yaml
# ❌ 错误
editor: "Cinematographer - John Doe"
sound_design: "Playback Supply - Name"

# ✅ 正确
editor: "John Doe"
sound_design: "Name"
```

**修复规则**:
- 字段值中不应出现**其他职位名称**
- 组织名后跟破折号的，保留破折号后的人名

---

### ✅ 2. 前导符号残留

**问题**: 字段值以符号开头

```bash
# 检测模式
grep -E ':\s*"[-–—,\s]+[A-Z]' *.mdx
```

**常见错误**:
```yaml
# ❌ 错误
director: "- David Helman"
editor: ", John Doe"
dop: "  Jane Smith"

# ✅ 正确
director: "David Helman"
editor: "John Doe"
dop: "Jane Smith"
```

**修复规则**:
- 移除所有前导破折号 `-`
- 移除前导逗号 `,`
- 移除前导空格

---

### ✅ 3. 社交 Handle 残留

**问题**: 字段值包含 @ 开头的社交账号

```bash
# 检测模式
grep -E '@[\w.]+' *.mdx
```

**常见错误**:
```yaml
# ❌ 错误
director: "Tom Emmerson @tom.emmerson"
dop: "Jaime Ackroyd @jaimeackroyd"

# ✅ 正确
director: "Tom Emmerson"
dop: "Jaime Ackroyd"
```

**修复规则**:
- 移除所有 `@username` 格式的内容
- 保留其前后的空格标准化

---

### ✅ 4. 首字母截断

**问题**: 字段值缺少首字母

```bash
# 检测模式 (启发式: 小写字母开头)
grep -E ':\s*"[a-z]' *.mdx | grep -v 'video_url' | grep -v 'curator_note'
```

**常见错误**:
```yaml
# ❌ 错误
dop: "ergei Medvedev"        # 应该是 "Sergei"
vfx: "elected Works"         # 应该是 "Selected Works"
art_director: "am Stone"     # 应该是 "Sam Stone" 或 "Pam Stone"
sound_design: "tupid"        # 数据源损坏，需手动重查

# ✅ 正确
dop: "Sergei Medvedev"
vfx: "Selected Works"
art_director: "Sam Stone"
```

**修复规则**:
- 如果字段值以**小写字母**开头（非品牌名如 iPhone），很可能是截断
- 需要回到 YouTube 描述原文核对
- **无法自动修复**，必须手动处理

---

### ✅ 5. Artist/Title 混淆

#### 5a. Title 中重复 Artist 名

```bash
# 检测模式 (Title 包含 " - " 可能是误格式化)
grep -E '^title:.*\s+-\s+' *.mdx
```

**常见错误**:
```yaml
# ❌ 错误
title: "Captain Ants - AntsLive"
artist: "AntsLive"

# ✅ 正确
title: "Captain Ants"
artist: "AntsLive"
```

**修复规则**:
- 如果 title 格式为 "Song - ArtistName"，检查 ArtistName 是否与 artist 字段重复
- 如果重复，移除 " - ArtistName" 部分

---

#### 5b. 混淆频道和艺术家

```bash
# 手动检查: 含 "OFFICIAL"、"VEVO" 的 artist 字段
grep -i 'artist:.*\(official\|vevo\|label\|entertainment\)' *.mdx
```

**常见错误**:
```yaml
# YouTube 标题: "LISA - ROCKSTAR"
# YouTube 频道: LLOUD Official

# ❌ 错误
title: "LISA - ROCKSTAR"
artist: "LLOUD Official"

# ✅ 正确
title: "ROCKSTAR"
artist: "LISA"
```

**修复规则**:
- 如果 artist 包含 `OFFICIAL | VEVO | LABEL | ENTERTAINMENT`
- 检查 title 是否为 "Artist - Song" 格式
- 如果是，提取 Artist 到 artist 字段，提取 Song 到 title 字段

---

### ✅ 6. 组织前缀混入

**问题**: 字段值包含组织冒号前缀

```bash
# 检测模式
grep -E ':\s*"[A-Z][a-z]+\s*:\s*' *.mdx
```

**常见错误**:
```yaml
# ❌ 错误
vfx: "Studio: Frame 23"
sound_design: "Playback: Kostadin Separevski"
production_company: "Company: ACME"

# ✅ 正确
vfx: "Frame 23"
sound_design: "Kostadin Separevski"
production_company: "ACME"
```

**修复规则**:
- 移除 `Org:` 前缀（如 `Studio:`, `Company:`, `Team:`）
- 如果格式为 `Org - Name`，保留 Name 部分

---

### ✅ 7. 日期格式错误

```bash
# 检测模式
grep -E 'publishDate:.*[0-9]{4}-01-01' *.mdx
```

**常见错误**:
```yaml
# ❌ 默认值（需手动更新）
publishDate: 2024-01-01

# ✅ 精确日期
publishDate: 2024-03-20
```

**修复规则**:
- 所有 `YYYY-01-01` 格式的日期都是**占位符**
- 需要手动查询视频发布日期并更新

---

### ✅ 8. curator_note 为空

```bash
# 检测模式
grep -E 'curator_note:\s*""' *.mdx
```

**常见情况**:
```yaml
# ⚠️ 需手动填写
curator_note: ""

# ✅ 已完成
curator_note: "Aidan Zamiri 通过数字镜像..."
```

**填写规则**:
- **必须手动填写**，自动录入脚本不生成
- 2-3 句话，突出艺术视角和技术亮点
- 避免仅复述 credits 信息

---

## 🛠️ 批量修复工具

### 创建修复脚本

```bash
# 创建自动修复脚本
node scripts/fix-quality-issues.js

# 或仅检测问题（不修复）
node scripts/fix-quality-issues.js --dry-run
```

### 预期修复项

| 问题类型 | 自动修复 | 手动修复 |
|---------|---------|---------|
| 前导符号残留 | ✅ | |
| 社交 Handle | ✅ | |
| 组织前缀 | ✅ | |
| Artist/Title 重复 | ✅ | |
| 首字母截断 | | ✅ 需回查原文 |
| 日期占位符 | | ✅ 需查询发布日期 |
| curator_note | | ✅ 需人工撰写 |

---

## 📊 质量评分

运行以下命令生成质量报告：

```bash
node scripts/quality-score.js
```

**输出示例**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 数据质量报告

总文件数: 24
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 完全正确: 18 (75%)
⚠️ 需要修复: 6 (25%)

问题分布:
- 前导符号残留: 2
- 社交 Handle: 3
- 首字母截断: 1
- curator_note 空: 24

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
建议: 运行 npm run fix-quality 自动修复
```

---

## 🎓 最佳实践

### 录入后工作流

1. **自动录入**
   ```bash
   npm run ingest https://youtube.com/watch?v=...
   ```

2. **立即检查质量**
   ```bash
   npm run check-quality -- --file src/content/videos/2024-xxx.mdx
   ```

3. **修复自动检测的问题**
   ```bash
   npm run fix-quality -- --file src/content/videos/2024-xxx.mdx
   ```

4. **手动处理剩余问题**
   - 首字母截断：回查 YouTube 描述
   - 日期：查询准确发布日期
   - curator_note：撰写评论

5. **最终验证**
   ```bash
   npm run check-quality -- --file src/content/videos/2024-xxx.mdx
   ```

---

## 🔍 手动检查清单

### 打开文件后逐项检查：

- [ ] **Title** 不包含艺术家名字或 "Official Video" 后缀
- [ ] **Artist** 不是频道名（如 "VEVO"、"Official"）
- [ ] **publishDate** 是精确日期（不是 01-01）
- [ ] **director** 不以符号开头，不包含 "@"
- [ ] **dop** 首字母是大写（如果有）
- [ ] **editor** 不包含 "Cinematographer" 等其他职位
- [ ] **vfx** 不包含 "Studio:" 前缀（如果有）
- [ ] **sound_design** 不包含 "Playback:" 前缀（如果有）
- [ ] **art_director** 首字母是大写（如果有）
- [ ] **curator_note** 已填写（不为空）
- [ ] **tags** 数组包含至少 2 个标签

---

## 📚 相关文档

- `INGEST_V4.0_BLUEPRINT.md` - 长期架构改进计划
- `CREDIT_PARSING_FIX.md` - v3.x 历史修复
- `INGEST_QUICKSTART.md` - 用户使用指南

---

**提示**: 将此清单加入书签，每次录入后检查！
