# 视频元数据修复总结

## 修复日期
2026-01-17

## 问题概览

原有的 `ingest.js` 脚本存在多个问题，导致生成的视频文件元数据不正确：

### 1. 文件名重复 slug
- **问题**: 文件名格式为 `{year}-{slug}-{slug}.mdx`，slug 重复了两次
- **示例**: `2024-360-360.mdx`, `2024-lost-lost.mdx`
- **修复**: 改为 `{year}-{slug}.mdx`

### 2. 艺术家大小写不正确
- **问题**: 艺术家名字没有标准化处理
- **示例**: 
  - `Charli xcx` → `Charli XCX`
  - `Fontaines DC` → `Fontaines D.C.`
- **修复**: 添加 `normalizeArtistName()` 函数，支持特殊艺术家名称映射

### 3. Title 清洗不彻底
- **问题**: Title 仍包含艺术家名字、前导逗号等
- **示例**: 
  - `Fontaines D.C. - Starburster` → 应为 `Starburster`
  - `, A$AP Rocky, Anderson .Paak - Gangsta` → 应为 `A$AP Rocky, Anderson .Paak - Gangsta`
- **修复**: 增强 `cleanSongTitle()` 函数，移除前导逗号、艺术家名字前缀等

### 4. Director 字段被截断
- **问题**: 正则表达式匹配错误，导致 "Directed by" 被截断为 "ected by"
- **示例**: `ected by FRANÇOIS ROUSSELET`
- **修复**: 重写 director 解析逻辑，使用更精确的模式匹配

### 5. 其他字段问题
- **问题**: 社交媒体 handle、字段前缀被包含
- **示例**: 
  - `Jaime Ackroyd @jaimeackroyd` → `Jaime Ackroyd`
  - `tudio: Frame 23` → `Frame 23`
  - `and Editor: Tom Emmerson` → `Tom Emmerson`

## 修复工具

### 1. 更新 `scripts/ingest.js`
- 添加 `normalizeArtistName()` 函数
- 增强 `cleanSongTitle()` 函数
- 修复 `parseCredits()` 中的 director 解析
- 修复文件名生成逻辑（去除重复 slug）

### 2. 新建 `scripts/fix-existing-videos.js`
批量修复现有视频文件的脚本，包括：
- 标准化艺术家名字
- 清理 title 字段
- 修复损坏的 credits 字段
- 重命名文件（去除重复 slug）
- 同步更新封面文件名

## 修复结果

### 执行统计
- **处理文件数**: 12
- **修复文件数**: 7
- **重命名文件数**: 7

### 具体修复

#### 文件名修复
- `2024-360-360.mdx` → `2024-360.mdx`
- `2024-lost-lost.mdx` → `2024-lost.mdx`
- `2024-bet-bet.mdx` → `2024-bet.mdx`
- `2024-angel-of-my-dreams-angel-of-my-dreams.mdx` → `2024-angel-of-my-dreams.mdx`
- `2024-fontaines-dc---starburster-fontaines-dc---starburster.mdx` → `2024-starburster.mdx`
- 等等...

#### 元数据修复
- Charli XCX: 大小写标准化
- Fontaines D.C.: 艺术家名标准化，title 去除艺术家前缀
- Free Nationals: title 去除前导逗号
- 多个视频: Director、DOP、Editor 等字段清理

### 损坏字段处理
以下字段因严重截断而被移除（需要手动重新获取）：
- `2024-360.mdx`: vfx
- `2024-angel-of-my-dreams.mdx`: art_director
- `2024-bet.mdx`: art_director
- `2024-myl-sobie---brodka-x-igo.mdx`: vfx
- `2024-wax-on-you.mdx`: dop, vfx

## 未来预防措施

### 已实施
1. **标准化流程**: `ingest.js` 现在自动应用所有清理规则
2. **艺术家映射**: 支持常见艺术家的特殊大小写
3. **增强的正则表达式**: 更精确的 credits 字段解析
4. **模块化设计**: `ingest.js` 现在可以作为模块导入，支持 `hunter.js` 批量处理

### 建议
1. 定期检查新导入的视频文件质量
2. 扩展 `artistMappings` 列表，添加更多特殊艺术家
3. 遇到新的清洗问题时更新 `cleanSongTitle()` 函数
4. 对于损坏的字段，考虑使用 YouTube API 重新获取

## 相关文件
- `scripts/ingest.js` - 主导入脚本（已更新）
- `scripts/fix-existing-videos.js` - 批量修复脚本（新建）
- `scripts/hunter.js` - CSV 批量导入（使用 ingest.js 作为模块）
