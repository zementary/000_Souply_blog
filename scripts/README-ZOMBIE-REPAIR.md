# 🔧 Zombie Image Repair Tools

## 问题说明

YouTube 的 `maxresdefault.jpg` 有时会返回"僵尸图片" - 灰色占位符（三个点），这些文件：
- ✅ 技术上是有效的 JPG 文件
- ❌ 文件很小（< 8KB）
- ❌ 在 UI 中显示为灰色占位符

## 🆕 升级内容

### 1. 智能导入（`ingest.js`）
**自动检测和修复僵尸图片**

```bash
# 正常导入（带僵尸检测）
node scripts/ingest.js "https://www.youtube.com/watch?v=VIDEO_ID"

# 强制重新导入
node scripts/ingest.js "https://www.youtube.com/watch?v=VIDEO_ID" --force
```

**工作流程：**
1. 下载 `maxresdefault.jpg`
2. 检查文件大小
3. 如果 < 8KB → 删除 → 自动下载 `hqdefault.jpg`
4. 如果备用也是僵尸 → 使用远程 URL

### 2. 批量修复（`repair-zombies.js`）
**扫描并修复所有现有的僵尸图片**

```bash
# 运行修复脚本
node scripts/repair-zombies.js
```

**功能：**
- 🔍 扫描 `public/covers/` 目录
- 🚨 检测所有 < 8KB 的图片
- 🔗 自动找到对应的 MDX 文件和视频 URL
- 🔄 重新下载封面图片
- 📊 显示修复结果统计

**输出示例：**
```
🔍 僵尸图片修复脚本 - 启动
======================================================================

📂 扫描封面目录: public/covers
   找到 436 个封面图片

======================================================================
🚨 ZOMBIE covers/2025/flea-a-plea.jpg (7.8 KB)

======================================================================

📊 检测结果: 发现 1 个僵尸图片

======================================================================

🔗 匹配 MDX 文件...

✅ covers/2025/flea-a-plea.jpg
   → 2025-flea-a-plea.mdx
   → https://www.youtube.com/watch?v=TmyjzvQv5bA

======================================================================

📋 可修复的僵尸图片: 1 / 1

[修复过程...]

📊 修复完成
✅ 成功: 1 个
❌ 失败: 0 个
```

### 3. 封面审计（`audit-covers.js`）
**验证所有封面图片文件存在**

```bash
# 运行审计脚本
node scripts/audit-covers.js
```

**功能：**
- 检查 MDX 文件的 `cover` 字段
- 验证文件是否存在
- 不检测僵尸图片（需要用 `repair-zombies.js`）

## 🎯 使用场景

### 场景 1：导入新视频
```bash
# 直接使用升级后的 ingest.js（自动检测僵尸图片）
node scripts/ingest.js "https://www.youtube.com/watch?v=VIDEO_ID"
```

### 场景 2：批量导入
```bash
# 将 URLs 添加到 urls.txt，然后运行
node scripts/batch-ingest.js
```
→ 自动使用升级后的 `ingest.js`，自动检测僵尸图片

### 场景 3：修复现有僵尸图片
```bash
# 1. 运行修复脚本
node scripts/repair-zombies.js

# 2. 查看结果
# 脚本会自动扫描、检测、重新下载
```

### 场景 4：验证封面文件完整性
```bash
# 运行审计脚本
node scripts/audit-covers.js
```

## 🔍 检测逻辑

### 僵尸阈值：8 KB
```
文件大小 < 8 KB → 僵尸图片 ✅
文件大小 ≥ 8 KB → 正常图片 ✅
```

### 典型文件大小
- 🚨 僵尸占位符：2-4 KB
- ✅ hqdefault (480p)：30-80 KB
- ✅ maxresdefault (1080p+)：100-300 KB

## 📝 测试记录

### 测试案例：Flea - A Plea
```bash
$ node scripts/ingest.js "https://www.youtube.com/watch?v=TmyjzvQv5bA" --force

结果：
📥 Downloading thumbnail from: https://i.ytimg.com/vi_webp/TmyjzvQv5bA/maxresdefault.webp
⚠️  Detected broken thumbnail (7.8 KB < 8 KB threshold)
🗑️  Deleted zombie thumbnail: public/covers/2025/flea-a-plea.jpg
🔄 Attempting fallback URL: https://img.youtube.com/vi/TmyjzvQv5bA/hqdefault.jpg
⚠️  Fallback thumbnail is also a zombie (5.9 KB)
⚠️  All thumbnails are zombie images (< 8KB), using remote URL

✅ 系统正确处理：检测 → 删除 → 尝试备用 → 使用远程 URL
```

## ⚙️ 配置

### 调整僵尸阈值
如果需要调整检测阈值，修改以下文件：

**ingest.js (行 53):**
```javascript
const ZOMBIE_THRESHOLD_KB = 8; // 调整此值
```

**repair-zombies.js (行 22):**
```javascript
const ZOMBIE_THRESHOLD_KB = 8; // 调整此值
```

### 建议值
- 严格模式：`6 KB` - 捕获所有僵尸，可能误判小图
- 标准模式：`8 KB` - 平衡准确率（推荐）
- 宽松模式：`10 KB` - 只捕获明确的僵尸

## 🚨 注意事项

1. **网络依赖**：修复脚本需要重新下载图片，确保网络稳定
2. **速率限制**：脚本在请求之间有 2 秒延迟，避免触发 YouTube 限制
3. **Cookie 支持**：使用 Brave cookies 提高下载成功率（自动处理）
4. **Proxy 支持**：脚本自动启用代理（如果配置了 `lib/proxy.js`）

## 📚 相关文件

| 文件 | 用途 |
|------|------|
| `scripts/ingest.js` | 主导入脚本（已升级僵尸检测） |
| `scripts/batch-ingest.js` | 批量导入（使用升级后的 ingest.js） |
| `scripts/repair-zombies.js` | 僵尸图片修复工具 ✨ NEW |
| `scripts/audit-covers.js` | 封面文件存在性审计 |
| `UPGRADE_NOTES.md` | 详细升级说明 |

## ✅ 快速开始

### 第一次使用（修复现有问题）
```bash
# 1. 检测现有僵尸图片
node scripts/repair-zombies.js

# 2. 验证修复结果
node scripts/audit-covers.js
```

### 日常使用（导入新视频）
```bash
# 直接使用升级后的导入脚本（自动处理僵尸图片）
node scripts/ingest.js "https://www.youtube.com/watch?v=VIDEO_ID"
```

---

**升级日期**: 2026-01-28  
**版本**: v8.0 - Zombie Detection  
**状态**: ✅ Production Ready
