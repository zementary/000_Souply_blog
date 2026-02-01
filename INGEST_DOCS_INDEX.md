# 📚 录入系统文档索引

**快速导航**：找到你需要的文档

---

## 🚀 我想...

### ➡️ 立即开始修复问题

**阅读**: [`START_HERE.md`](./START_HERE.md)

- ✅ 5 分钟快速上手
- ✅ 按优先级列出所有问题
- ✅ 预估修复时间
- ✅ 包含具体修复步骤

**命令**:
```bash
npm run check-quality
```

---

### ➡️ 了解当前有哪些问题

**阅读**: [`INGEST_REDESIGN_SUMMARY.md`](./INGEST_REDESIGN_SUMMARY.md)

- 🎯 8 大问题类型诊断
- 📦 解决方案总览
- 📊 问题优先级表
- 💡 后续支持指南

**命令**:
```bash
npm run check-quality
```

---

### ➡️ 查询如何修复某个具体问题

**阅读**: [`INGEST_QUALITY_CHECKLIST.md`](./INGEST_QUALITY_CHECKLIST.md)

- ✅ 8 大检查项目（每项配检测命令）
- 🔍 快速检查命令大全
- 🛠️ 每种问题的修复规则
- 📊 质量评分机制

**适用场景**:
- "这个字段为什么报错？"
- "如何检测首字母截断？"
- "修复规则是什么？"

---

### ➡️ 日常录入新视频

**阅读**: [`INGEST_QUICKSTART.md`](./INGEST_QUICKSTART.md)（现有文档）

**工作流**:
```bash
# 1. 录入
npm run ingest https://youtube.com/watch?v=xxx

# 2. 检测
npm run check-quality -- --file src/content/videos/2024-xxx.mdx

# 3. 修复（如果有问题）

# 4. 填写 curator_note
```

---

### ➡️ 理解技术架构（长期改进）

**阅读**: [`INGEST_V4.0_BLUEPRINT.md`](./INGEST_V4.0_BLUEPRINT.md)

- 🛡️ 防御性设计原则
- 🔧 v4.0 技术方案
- 🧪 测试策略
- 📋 实施计划（5 个阶段）
- 🎯 成功指标

**适用场景**:
- 准备彻底重构 `ingest.js`
- 理解为什么会有这些问题
- 设计长期解决方案

---

## 📁 文档分类

### 📗 快速上手

| 文档 | 适合 | 阅读时间 |
|------|------|---------|
| `START_HERE.md` | **第一次使用** | 5 分钟 |
| `INGEST_REDESIGN_SUMMARY.md` | 了解全貌 | 10 分钟 |

### 📘 日常参考

| 文档 | 适合 | 阅读时间 |
|------|------|---------|
| `INGEST_QUALITY_CHECKLIST.md` | **每次录入后** | 按需查询 |
| `INGEST_QUICKSTART.md` | 单视频录入 | 3 分钟 |
| `HUNTER_QUICK_GUIDE.md` | **批量录入（CSV）** | 5 分钟 |
| `HUNTER_WORKFLOW.md` | CSV 工作流程 | 10 分钟 |

### 📙 技术深入

| 文档 | 适合 | 阅读时间 |
|------|------|---------|
| `URGENT_CROSS_FIELD_POLLUTION.md` | **跨职位污染紧急修复** | 10 分钟 |
| `HUNTER_V2.0_CHANGELOG.md` | Hunter 升级详情 | 15 分钟 |
| `HUNTER_UPGRADE_SUMMARY.md` | Hunter 升级总结 | 10 分钟 |
| `INGEST_V4.0_BLUEPRINT.md` | 重构参考 | 30 分钟 |
| `CREDIT_PARSING_FIX.md` | v3.x 历史 | 15 分钟 |
| `VIDEO_FIX_SUMMARY.md` | 历史修复 | 10 分钟 |

---

## 🛠️ 工具速查

### 质量检测

```bash
# 检测所有视频
npm run check-quality

# 检测单个视频
npm run check-quality -- --file src/content/videos/2024-xxx.mdx

# 显示详细信息
npm run check-quality -- --verbose
```

### 录入视频

```bash
# 单个视频
npm run ingest https://youtube.com/watch?v=xxx

# 批量录入（所有年份）
npm run hunter

# 批量录入（指定年份）
npm run hunter 2015

# 批量录入（自定义文件）
npm run hunter -- --file path/to/file.csv

# 强制覆盖
npm run ingest https://youtube.com/watch?v=xxx -- --force
```

---

## 🎯 常见任务

### 任务 1: 新手第一次使用

1. 阅读 [`START_HERE.md`](./START_HERE.md)
2. 运行 `npm run check-quality`
3. 按优先级修复问题
4. 阅读 [`INGEST_QUALITY_CHECKLIST.md`](./INGEST_QUALITY_CHECKLIST.md) 了解修复规则

---

### 任务 2: 录入单个新视频

1. 运行 `npm run ingest <url>`
2. 运行 `npm run check-quality -- --file <生成的文件>`
3. 修复检测到的问题
4. 填写 `curator_note`
5. 再次运行检测验证

---

### 任务 2.5: 批量录入（从 CSV）

1. 创建或更新 CSV 文件 (如 `src/data/2025.csv`)
2. 运行 `npm run hunter 2025` 或 `npm run hunter`
3. 运行 `npm run check-quality` 检查所有新文件
4. 修复问题
5. 填写 `curator_note`

---

### 任务 3: 批量修复现有视频

1. 运行 `npm run check-quality` 生成报告
2. 参考 [`START_HERE.md`](./START_HERE.md) 的优先级表
3. 逐个修复（从严重问题开始）
4. 定期运行检测验证进度

---

### 任务 4: 准备重构录入系统

1. 阅读 [`INGEST_V4.0_BLUEPRINT.md`](./INGEST_V4.0_BLUEPRINT.md)
2. 了解 5 个实施阶段
3. 查看测试策略
4. 按 Phase 1-5 逐步实施

---

## 📊 数据质量目标

### 当前状态（2026-01-17 更新）

```
📁 总文件数: 21
🚨 严重: 10 个（首字母截断，含 production_company）
❌ 错误: 2 个（含新发现的跨职位污染）
⚠️  警告: 7 个
ℹ️  提示: 21 个

数据质量评分: 94%
```

**最新发现**: 跨职位字段污染（同行多职位导致的捕获错误）  
**详见**: `URGENT_CROSS_FIELD_POLLUTION.md`

### 目标状态

```
📁 总文件数: 21
🚨 严重: 0 个
❌ 错误: 0 个
⚠️  警告: 0 个
ℹ️  提示: 逐步减少（curator_note）

数据质量评分: 100%
```

---

## 🔄 文档更新日志

| 日期 | 更新内容 |
|------|---------|
| 2026-01-17 | 创建 v4.0 架构设计、质量检查清单、检测工具 |
| 之前 | v3.x 修复历史（CREDIT_PARSING_FIX.md 等）|

---

## 💬 需要帮助？

### 问题 1: "检测脚本报告了我不理解的问题"

**解决**: 查阅 [`INGEST_QUALITY_CHECKLIST.md`](./INGEST_QUALITY_CHECKLIST.md) 对应章节

### 问题 2: "我想自动修复某类问题"

**解决**: 参考 [`INGEST_V4.0_BLUEPRINT.md`](./INGEST_V4.0_BLUEPRINT.md) 的清洗器示例

### 问题 3: "我想调整检测规则"

**解决**: 编辑 `scripts/check-quality.js` 的 `QUALITY_CHECKS` 配置

---

## 🎓 学习路径

### 路径 1: 快速修复（30 分钟）

1. 阅读 `START_HERE.md`（5 分钟）
2. 运行检测工具（2 分钟）
3. 修复技术错误（20 分钟）
4. 验证修复（3 分钟）

### 路径 2: 深入理解（1 小时）

1. 阅读 `INGEST_REDESIGN_SUMMARY.md`（10 分钟）
2. 阅读 `INGEST_QUALITY_CHECKLIST.md`（15 分钟）
3. 阅读 `INGEST_V4.0_BLUEPRINT.md`（30 分钟）
4. 查看 `scripts/check-quality.js` 源码（5 分钟）

### 路径 3: 系统重构（1 周）

1. 阅读所有技术文档（2 小时）
2. 设计测试用例（1 天）
3. 实施 Phase 1-3（3 天）
4. 测试与部署（1 天）
5. 批量修复数据（1 天）

---

## 📞 快速联系

| 场景 | 操作 |
|------|------|
| 报告 bug | 在对应文档中添加注释 |
| 建议改进 | 更新 `INGEST_V4.0_BLUEPRINT.md` |
| 添加新检查规则 | 编辑 `scripts/check-quality.js` |

---

**提示**: 将本文档加入书签，作为录入系统的中央索引！
