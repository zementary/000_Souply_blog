# 📋 录入规则重新设计 - 总结文档

**日期**: 2026-01-17  
**任务**: 全面回顾录入规则，从根本上解决数据质量问题

---

## 🎯 问题诊断

根据您提供的示例，当前录入系统存在以下**8 类核心问题**：

### 1️⃣ 字段前缀污染（跨职位污染）

**类型 A: 相邻职位截断**
```yaml
# ❌ 问题
editor: "Cinematographer - John Angus Stewart"

# ✅ 应该
editor: "John Angus Stewart"
```

**类型 B: 同行多职位污染** 🚨 新发现
```yaml
# YouTube 描述: "Director: Name Producer: Name2"
# ❌ 问题
director: "Maegan Houang Producer: John J. Lozada, Ade Macalinao"

# ✅ 应该
director: "Maegan Houang"
```

### 2️⃣ 组织前缀混入
```yaml
# ❌ 问题
sound_design: "Playback Supply - Dsl Audio"

# ✅ 应该
sound_design: "Dsl Audio"
```

### 3️⃣ Title 重复 Artist
```yaml
# ❌ 问题
title: "Captain Ants - AntsLive"
artist: "AntsLive"

# ✅ 应该
title: "Captain Ants"
artist: "AntsLive"
```

### 4️⃣ 混淆频道和艺术家
```yaml
# ❌ 问题
title: "LISA - ROCKSTAR"
artist: "LLOUD Official"

# ✅ 应该
title: "ROCKSTAR"
artist: "LISA"
```

### 5️⃣ 首字母截断
```yaml
# ❌ 问题
dop: "ergei Medvedev"
vfx: "elected Works"
art_director: "am Stone"

# ✅ 应该
dop: "Sergei Medvedev"
vfx: "Selected Works"
art_director: "Sam Stone"
```

### 6️⃣ 前导符号残留
```yaml
# ❌ 问题
director: "- David Helman"

# ✅ 应该
director: "David Helman"
```

### 7️⃣ 字段内容不明
```yaml
# ❌ 问题
sound_design: "Playback: Kostadin Separevski"

# ✅ 应该
sound_design: "Kostadin Separevski"
```

### 8️⃣ 残缺字段
```yaml
# ❌ 问题
sound_design: "tupid"  # 完全截断，无法恢复

# ✅ 需要
手动回查 YouTube 视频描述
```

---

## 📦 交付内容

我为您创建了**3 份文档** + **1 个检测工具**：

### 📘 文档 1: 架构蓝图（长期方案）

**文件**: `INGEST_V4.0_BLUEPRINT.md`

**内容**:
- 🛡️ 防御性设计原则
- 🔧 v4.0 技术方案（分阶段管道、清洗器链）
- 🧪 测试策略（单元测试 + 集成测试 + 回归测试）
- 📋 实施计划（5 个阶段）
- 🎯 成功指标（错误率从 38% → < 5%）

**适用场景**:
- 当您准备**彻底重构** `ingest.js` 时
- 作为技术参考和长期规划

---

### 📗 文档 2: 质量检查清单（日常使用）

**文件**: `INGEST_QUALITY_CHECKLIST.md`

**内容**:
- ✅ 8 大检查项目（每项配有检测命令）
- 🛠️ 批量修复工具说明
- 📊 质量评分机制
- 🎓 最佳实践（录入后工作流）

**适用场景**:
- **每次录入新视频后**立即检查
- 作为快速参考手册（建议加入书签）

---

### 📙 文档 3: 问题诊断与方案总结

**文件**: `INGEST_REDESIGN_SUMMARY.md`（本文档）

**内容**:
- 🎯 问题诊断（您提出的所有问题）
- 📦 交付内容概览
- 🚀 立即可用的工具
- 💡 下一步建议

---

### 🛠️ 工具: 质量检测脚本

**文件**: `scripts/check-quality.js`

**功能**:
- ✅ 扫描所有视频文件
- ✅ 检测 **9 种数据质量问题**
- ✅ 生成详细报告（问题统计 + 修复建议）
- ✅ 计算数据质量评分

**使用方法**:

```bash
# 检测所有视频
npm run check-quality

# 检测单个文件
npm run check-quality -- --file src/content/videos/2024-xxx.mdx

# 显示详细信息
npm run check-quality -- --verbose
```

**输出示例**:

```
╔════════════════════════════════════════════════════════╗
║  数据质量检测报告                                      ║
╚════════════════════════════════════════════════════════╝

📁 总文件数: 24
✅ 完全正确: 18 (75%)
⚠️  存在问题: 6 (25%)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 问题统计 (共 12 个):

   🚨 严重: 2
   ❌ 错误: 4
   ⚠️  警告: 3
   ℹ️  提示: 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 首字母截断（疑似） (2 处):

   📄 2024-reeve-wax-on-you.mdx
      字段: dop
      值: "ergei Medvedev"

   📄 2024-jade-angel-of-my-dreams.mdx
      字段: vfx
      值: "elected Works"

❌ 字段前缀污染 (1 处):

   📄 2024-amyl-and-the-sniffers-big-dreams.mdx
      字段: editor
      值: "Cinematographer - John Angus Stewart"

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 建议:

   1. 运行自动修复脚本:
      npm run fix-quality

   2. 手动修复"首字母截断"问题:
      回到 YouTube 视频描述原文核对完整内容

   3. 完善必填字段:
      - 更新 publishDate 为精确日期
      - 撰写 curator_note

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 数据质量评分: 73%
   👍 良好，但还有改进空间。
```

---

## 🚀 立即可用

### ✅ 现在就可以做

1. **运行质量检测**
   ```bash
   npm run check-quality
   ```
   立即发现所有问题。

2. **查阅检查清单**
   打开 `INGEST_QUALITY_CHECKLIST.md`，了解每种问题的修复方法。

3. **手动修复严重问题**
   - 首字母截断：回 YouTube 核对原文
   - 字段前缀污染：手动删除职位标签

---

## 💡 下一步建议

### 短期（本周）

1. **运行质量检测**
   ```bash
   npm run check-quality
   ```

2. **手动修复严重问题**（首字母截断、字段前缀污染）
   - 您提到的 8 个问题文件
   - 使用检测脚本发现的其他问题

3. **创建自动修复脚本**（可选）
   ```bash
   # 创建 scripts/fix-quality.js
   # 自动修复：前导符号、社交 handle、组织前缀等
   ```

### 中期（未来 1-2 周）

4. **实施 v4.0 架构改进**
   - 参考 `INGEST_V4.0_BLUEPRINT.md`
   - 分阶段实施（Phase 1-5）
   - 每个阶段配有测试

5. **扩展 K-Pop 检测逻辑**
   - 更新 `ingest.js` 的 `extractArtistAndTitle()` 函数
   - 处理 "Artist - Song" 格式

### 长期（持续改进）

6. **建立数据质量监控**
   - 录入后自动运行 `npm run check-quality`
   - 质量评分低于 80% 时发出警告

7. **扩展自动清洗规则**
   - 遇到新问题时更新清洗逻辑
   - 添加到测试用例

---

## 📊 问题优先级

根据您提供的示例，建议按以下优先级修复：

### 🚨 优先级 1（严重）- 需立即手动修复

| 文件 | 问题 | 类型 |
|------|------|------|
| `2024-reeve-wax-on-you.mdx` | `dop: "ergei Medvedev"` | 首字母截断 |
| `2024-jade-angel-of-my-dreams.mdx` | `vfx: "elected Works"` | 首字母截断 |
| `2024-mette-bet.mdx` | `art_director: "am Stone"` | 首字母截断 |
| `2024-mette-bet.mdx` | `sound_design: "tupid"` | 严重截断 |

**修复方法**: 必须回到 YouTube 视频描述原文核对

---

### ❌ 优先级 2（错误）- 部分可自动修复

| 文件 | 问题 | 类型 |
|------|------|------|
| `2024-hana-vu-care.mdx` 🚨 | `director: "...Producer: ..."` | 跨职位污染（需手动） |
| `2024-amyl-and-the-sniffers-big-dreams.mdx` | `editor: "Cinematographer - ..."` | 字段前缀污染 |
| `2024-amyl-and-the-sniffers-big-dreams.mdx` | `sound_design: "Playback Supply - ..."` | 组织前缀 |
| `2024-idles-gift-horse.mdx` | `director: "- David Helman"` | 前导符号 |
| `2024-porter-robinson-cheerleader.mdx` | `sound_design: "Playback: ..."` | 组织前缀 |

**修复方法**: 
- 手动删除前缀（立即）
- 或等待自动修复脚本（未来）

---

### ⚠️ 优先级 3（警告）- 需验证

| 文件 | 问题 | 类型 |
|------|------|------|
| `2023-antslive-captain-ants.mdx` | `title: "Captain Ants - AntsLive"` | Title 重复 Artist |
| `2024-lloud-official-lisa-rockstar.mdx` | `artist: "LLOUD Official"` | 混淆频道和艺术家 |

**修复方法**: 手动调整 title/artist 字段

---

## 🎓 核心经验教训

### 根本原因分析

1. **正则表达式不够精确**
   - 问题: 跨行捕获、半词匹配
   - 解决: 使用 `\b` 边界符 + 明确终止条件

2. **清洗逻辑不够强大**
   - 问题: 只处理常见前缀，忽略组织名模式
   - 解决: 清洗器链 + 职位专用清洗器

3. **Artist/Title 分离逻辑不够健壮**
   - 问题: K-Pop 视频的特殊格式
   - 解决: 规则优先级 + 模式识别

### 设计原则

1. **防御性编程**: 假设 YouTube 描述格式混乱
2. **分阶段处理**: 粗提取 → 语义清洗 → 符号清洗 → 验证
3. **配置驱动**: 职位定义、清洗规则可独立配置
4. **测试优先**: 单元测试 + 集成测试 + 回归测试

---

## 🤝 如何使用这些资料

### 对于日常录入

1. 录入新视频后，运行:
   ```bash
   npm run check-quality -- --file src/content/videos/2024-xxx.mdx
   ```

2. 根据报告修复问题

3. 填写 `curator_note`

### 对于批量修复

1. 运行全量检测:
   ```bash
   npm run check-quality > quality-report.txt
   ```

2. 按优先级修复问题（参考上方优先级表）

3. 再次运行检测验证

### 对于系统改进

1. 阅读 `INGEST_V4.0_BLUEPRINT.md`

2. 按 Phase 1-5 逐步实施

3. 每个阶段运行测试验证

---

## 📞 后续支持

如果您在使用过程中遇到问题：

1. **检测脚本报告了不理解的问题**
   - 查阅 `INGEST_QUALITY_CHECKLIST.md` 对应章节
   - 查看问题描述和修复规则

2. **想要自动修复某类问题**
   - 参考 `INGEST_V4.0_BLUEPRINT.md` 的清洗器示例
   - 创建 `scripts/fix-quality.js`

3. **需要调整检测规则**
   - 编辑 `scripts/check-quality.js` 的 `QUALITY_CHECKS` 配置
   - 添加或移除检查项

---

## 📝 总结

✅ **已交付**:
- 3 份详细文档（架构设计 + 检查清单 + 总结）
- 1 个质量检测工具（立即可用）
- 完整的问题诊断和优先级分析

✅ **立即可用**:
- `npm run check-quality` 检测所有问题
- `INGEST_QUALITY_CHECKLIST.md` 作为修复指南

✅ **长期价值**:
- `INGEST_V4.0_BLUEPRINT.md` 作为重构参考
- 清晰的实施路径和成功指标

---

**下一步**: 运行 `npm run check-quality` 查看当前数据质量状况！ 🚀
