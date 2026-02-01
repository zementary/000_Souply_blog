# 🚀 开始使用：录入质量改进系统

**5 分钟快速上手指南**

---

## 📊 当前状态

刚刚运行了质量检测，发现：

```
📁 总文件数: 21
🚨 严重问题: 10 个（首字母截断，含 production_company）
❌ 错误: 2 个（字段前缀污染，含新发现的跨职位污染）
⚠️  警告: 7 个（Title/Artist 混淆）
ℹ️  提示: 21 个（curator_note 为空）
```

**数据质量评分**: 94%（因为大部分是 curator_note 空值，技术错误较少）

---

## ✅ 第一步：运行质量检测

```bash
npm run check-quality
```

这会显示所有问题的详细报告。

---

## 🔧 第二步：修复问题（按优先级）

### 优先级 1：首字母截断（需手动修复）

这些文件需要回 YouTube 核对原文：

| 文件 | 字段 | 当前值 | 需要修复 |
|------|------|--------|---------|
| `2024-jade-angel-of-my-dreams.mdx` | vfx | `elected Works` | 查原文补全 |
| `2024-jade-angel-of-my-dreams.mdx` | art_director | `arah Asmail` | 查原文补全 |
| `2024-mette-bet.mdx` | sound_design | `tupid` | 查原文补全 |
| `2024-mette-bet.mdx` | art_director | `am Stone` | 查原文补全 |
| `2024-ravyn-lenae-one-wish.mdx` | editor | `ofia Kerpan` | 查原文补全 |
| `2024-reeve-wax-on-you.mdx` | director | `ataka51` | 查原文补全 |
| `2024-reeve-wax-on-you.mdx` | dop | `ergei Medvedev` | 查原文补全 |
| `2024-ywiec-sponsoruje-myl-sobie---brodka-x-igo.mdx` | vfx | `zymon Kołdej` | 查原文补全 |

**修复步骤**:
1. 打开对应的 YouTube 视频
2. 查看视频描述
3. 找到对应的职位信息
4. 手动编辑 `.mdx` 文件补全名字

---

### 优先级 2：字段污染（可手动快速修复）

#### 1. `2024-hana-vu-care.mdx` 🚨 新发现

```yaml
# ❌ 当前（跨职位污染）
director: "Maegan Houang Producer: John J. Lozada, Ade Macalinao"
production_company: "John J"

# ✅ 修复为（需查 YouTube 原文）
director: "Maegan Houang"
production_company: "（查原文补全）"
```

**修复步骤**：
1. 打开 YouTube: https://youtube.com/watch?v=pM9nj3Pddrc
2. 查看描述 Credits 部分
3. 手动分离职位信息

#### 2. `2024-amyl-and-the-sniffers-big-dreams.mdx`

```yaml
# ❌ 当前
editor: "Cinematographer - John Angus Stewart"

# ✅ 修复为
editor: "John Angus Stewart"
```

#### 3. `2024-idles-gift-horse.mdx`

```yaml
# ❌ 当前
director: "- David Helman"

# ✅ 修复为
director: "David Helman"
```

---

### 优先级 3：组织前缀（可手动快速修复）

#### 1. `2024-jade-angel-of-my-dreams.mdx`

```yaml
# ❌ 当前
sound_design: "Recordist: Simon Haggis"

# ✅ 修复为
sound_design: "Simon Haggis"
```

#### 2. `2024-porter-robinson-cheerleader.mdx`

```yaml
# ❌ 当前
sound_design: "Playback: Kostadin Separevski"

# ✅ 修复为
sound_design: "Kostadin Separevski"
```

---

### 优先级 4：Title/Artist 混淆（需手动判断）

#### 1. `2023-antslive-captain-ants---antslive.mdx`

```yaml
# ❌ 当前
title: "Captain Ants - AntsLive"
artist: "AntsLive"

# ✅ 修复为
title: "Captain Ants"
artist: "AntsLive"
```

#### 2. `2024-lloud-official-lisa---rockstar.mdx`

```yaml
# ❌ 当前
title: "LISA - ROCKSTAR"
artist: "LLOUD Official"

# ✅ 修复为
title: "ROCKSTAR"
artist: "LISA"
```

#### 3. `2024-free-nationals-aap-rocky-anderson-paak---gangsta.mdx`

```yaml
# ❌ 当前
title: "A$AP Rocky, Anderson .Paak - Gangsta"
artist: "Free Nationals"

# ✅ 修复为（判断：这个可能是对的，因为主要艺术家是 Free Nationals）
# 或者改为:
title: "Gangsta"
artist: "Free Nationals, A$AP Rocky, Anderson .Paak"
```

---

## 📝 第三步：填写 curator_note

所有 21 个文件的 `curator_note` 都是空的，这是**正常的**（脚本不自动生成）。

**建议工作流**:
1. 先修复技术错误（优先级 1-4）
2. 然后逐个文件撰写 curator_note
3. 每个文件 2-3 句话即可

---

## 🔄 第四步：验证修复

修复完成后，再次运行检测：

```bash
npm run check-quality
```

目标：
- 🚨 严重问题：0 个
- ❌ 错误：0 个
- ⚠️  警告：0 个
- ℹ️  提示：仅 curator_note 空值（可以慢慢填）

---

## 📚 详细文档

修复过程中遇到问题，查阅以下文档：

| 文档 | 用途 |
|------|------|
| `INGEST_REDESIGN_SUMMARY.md` | **入口文档**，问题总览和解决方案 |
| `INGEST_QUALITY_CHECKLIST.md` | **快速参考**，每种问题的修复方法 |
| `INGEST_V4.0_BLUEPRINT.md` | **技术参考**，长期架构改进方案 |

---

## 🛠️ 工具使用

### 检测单个文件

```bash
npm run check-quality -- --file src/content/videos/2024-xxx.mdx
```

### 显示详细信息

```bash
npm run check-quality -- --verbose
```

---

## 💡 最佳实践

### 录入新视频后的工作流

1. **录入**
   ```bash
   npm run ingest https://youtube.com/watch?v=xxx
   ```

2. **立即检测**
   ```bash
   npm run check-quality -- --file src/content/videos/2024-xxx.mdx
   ```

3. **修复问题**（如果有）

4. **填写 curator_note**

5. **最终验证**
   ```bash
   npm run check-quality -- --file src/content/videos/2024-xxx.mdx
   ```

---

## ⏱️ 预估时间

| 任务 | 预估时间 |
|------|---------|
| 修复 8 个首字母截断 | ~20 分钟（查 YouTube 原文）|
| 修复 3 个字段污染 | ~5 分钟（含 1 个需查原文）|
| 修复 2 个组织前缀 | ~2 分钟（删除前缀）|
| 修复 4 个 Title/Artist 混淆 | ~5 分钟（调整字段）|
| **技术修复总计** | **~30 分钟** |
| 填写 21 个 curator_note | ~2-3 小时（根据深度）|

---

## 🎯 完成标准

✅ 技术错误全部修复（严重/错误/警告 = 0）  
✅ 所有字段值干净（无前缀、符号、截断）  
✅ Title/Artist 准确分离  
⏳ curator_note 逐步填写（不着急）

---

## 🚀 现在就开始！

```bash
# 第一步：看看问题
npm run check-quality

# 第二步：打开第一个问题文件
code src/content/videos/2024-jade-angel-of-my-dreams.mdx

# 第三步：查 YouTube 原文，修复
# https://youtube.com/watch?v=xxx

# 第四步：保存，继续下一个
```

---

**提示**: 不用一次性全部修复完，可以分批进行。优先修复严重问题（首字母截断）！
