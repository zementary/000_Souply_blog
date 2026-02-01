# Souply Scripts - 命令参考

## 📚 目录
- [基础导入](#基础导入)
- [批量处理](#批量处理)
- [封面修复](#封面修复)
- [测试工具](#测试工具)
- [质量检查](#质量检查)

---

## 🎬 基础导入

### 单视频导入
```bash
# 导入YouTube视频
npm run ingest https://www.youtube.com/watch?v=xxxxx

# 导入Vimeo视频
npm run ingest https://vimeo.com/123456789

# 强制覆盖现有文件
npm run ingest <url> --force
```

**新增: 封面修复模式**
```bash
# 只重新下载封面,不重新生成.mdx文件
npm run ingest <url> --repair-covers
```

---

## 📦 批量处理

### 处理CSV文件

```bash
# 处理特定年份 (需要 src/data/2024.csv)
npm run hunter 2024

# 自动扫描所有年份CSV
npm run hunter

# 处理自定义CSV文件
npm run hunter --file=/path/to/custom.csv
```

**CSV格式要求:**
```csv
Artist,Title,Director,Year,Authority_Signal,Visual_Hook,Target_URL
LISA,ROCKSTAR,Henry Schofield,2024,High,Neon Desert,
Tyler the Creator,St. Chroma,Wolf Haley,2024,High,Chrome Man,https://www.youtube.com/watch?v=xxxxx
```

**字段说明:**
- `Target_URL` (可选): 如果提供,跳过搜索直接使用此URL
- `Visual_Hook`: 用于生成分类标签
- `Authority_Signal`: 质量指标

---

## 🔧 封面修复

### 批量修复缺失封面

```bash
# 扫描并显示需要修复的文件 (不执行修复)
npm run repair-covers

# 自动修复所有缺失/损坏的封面
npm run repair-covers --yes
```

**检测条件:**
- ❌ 封面字段缺失
- ❌ 封面是远程URL (未本地化)
- ❌ 本地文件不存在
- ❌ 文件大小为0字节 (损坏)

**修复流程:**
1. 扫描 `src/content/videos/*.mdx` 文件
2. 提取 `video_url` 和 `cover` 字段
3. 调用 `yt-dlp --dump-json` 获取缩略图元数据
4. 下载最高分辨率缩略图
5. 保存到 `public/covers/{year}/{slug}.jpg`

---

## 🧪 测试工具

### 测试新功能

```bash
# 运行测试套件
npm run test-features
```

**测试项:**
- ✅ 搜索质量过滤器
- ✅ 缩略图排序逻辑
- ✅ CSV行号追踪

---

## 🔍 质量检查

### CSV验证
```bash
# 验证CSV格式和字段
npm run validate-csv src/data/2024.csv
```

### 质量检查 (如果存在)
```bash
# 检查内容质量
npm run check-quality
```

---

## 🆕 新功能说明

### 1. 通用封面逻辑

**优先级:**
1. yt-dlp `thumbnails[]` 数组 → 按preference/分辨率排序
2. yt-dlp `thumbnail` 单字段
3. 平台特定构造URL (最后手段)

**改进:**
- ✅ YouTube和Vimeo统一处理
- ✅ 自动选择最高分辨率
- ✅ 双重fallback机制
- ✅ 文件大小验证

### 2. 搜索质量过滤

**自动过滤:**
- ❌ Audio Only / Official Audio
- ❌ Lyric Video / Visualizer
- ❌ Fan Made / Fan Edit / Reupload
- ❌ 1 Hour Loop / Compilation
- ❌ YouTube Shorts (<60秒)
- ❌ Full Albums (>20分钟,除非是Director's Cut)

**保留:**
- ✅ Official Music Videos
- ✅ Director's Cut (长版本)
- ✅ 合理时长视频 (60秒-20分钟)

### 3. CSV行号追踪

**日志格式:**
```
[42/150] [CSV Line 43] ━━━━━━━━━━━━━━━━━━━━━━
📼 Processing: LISA - ROCKSTAR
   Director: Henry Schofield
```

**好处:**
- 快速定位CSV中的问题行
- 便于调试和数据修正

---

## 📊 实用技巧

### 查看处理进度
```bash
# hunter会自动显示进度
[42/150] [CSV Line 43] Processing...
```

### 速率限制
- `hunter.js`: 2-7秒随机延迟 (防止被封)
- `repair-covers.js`: 3秒固定延迟

### 跳过已存在的文件
```bash
# hunter自动跳过已存在的视频
⏭  Skipping: Already exists in 2024-lisa-rockstar.mdx
```

### 强制重新处理
```bash
# 使用--force覆盖现有文件
npm run ingest <url> --force
```

---

## 🐛 故障排除

### 问题1: yt-dlp未找到
```bash
# 安装yt-dlp
brew install yt-dlp  # macOS
pip install yt-dlp   # Linux/Windows
```

### 问题2: 搜索无结果
```bash
# 检查日志中的过滤信息
⚠️  Filtered out: "Song Name (Audio Only)"
```

**解决:** 使用 `Target_URL` 列手动指定URL

### 问题3: 封面下载失败
```bash
# 使用repair模式重试
npm run ingest <url> --repair-covers

# 或批量修复
npm run repair-covers --yes
```

### 问题4: CSV解析错误
```bash
# 验证CSV格式
npm run validate-csv src/data/2024.csv

# 检查UTF-8编码
file -I src/data/2024.csv
```

---

## 📝 最佳实践

### 1. 新增视频工作流
```bash
# 步骤1: 准备CSV
vim src/data/2024.csv

# 步骤2: 验证格式
npm run validate-csv src/data/2024.csv

# 步骤3: 批量处理
npm run hunter 2024

# 步骤4: 检查缺失封面
npm run repair-covers

# 步骤5: 修复(如有需要)
npm run repair-covers --yes
```

### 2. 定期维护
```bash
# 每月检查一次封面完整性
npm run repair-covers

# 如有缺失,执行修复
npm run repair-covers --yes
```

### 3. 单视频快速添加
```bash
# 直接导入(搜索功能会自动过滤低质量结果)
npm run ingest https://www.youtube.com/watch?v=xxxxx
```

---

## 🔗 相关文档

- [COVER_SEARCH_FIXES.md](./COVER_SEARCH_FIXES.md) - 详细技术说明
- [PARSER_V6_CHANGELOG.md](./PARSER_V6_CHANGELOG.md) - 解析器变更历史
- [REFACTOR_GUIDE.md](./REFACTOR_GUIDE.md) - 架构重构指南

---

**更新日期:** 2026-01-19  
**版本:** v2.0
