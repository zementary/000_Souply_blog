# 搜索功能测试指南

## 快速测试

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 访问任意页面

打开浏览器访问 `http://localhost:4321`

### 3. 测试搜索功能

#### 方法 1: 快捷键
- 按下 `Cmd+K` (Mac) 或 `Ctrl+K` (Windows/Linux)
- 搜索面板应该弹出

#### 方法 2: 搜索按钮
- 点击页面右上角的"搜索"按钮
- 搜索面板应该弹出

### 4. 测试搜索查询

尝试以下查询：

```
# 搜索艺术家
"周杰伦"
"Jay Chou"

# 搜索标题
输入视频标题的部分内容

# 模糊搜索
输入拼写略有错误的关键词

# 前缀搜索
只输入前几个字符
```

### 5. 测试键盘导航

- `↑` / `↓` - 应该可以上下选择结果
- `Enter` - 应该能打开选中的视频
- `Esc` - 应该能关闭搜索面板

## 验证清单

- [ ] 快捷键 Cmd+K / Ctrl+K 可以打开/关闭搜索面板
- [ ] 搜索按钮点击可以打开搜索面板
- [ ] 输入文字时实时显示搜索结果
- [ ] 搜索结果包含标题、艺术家、导演信息
- [ ] 方向键可以选择结果
- [ ] Enter 键可以导航到视频详情页
- [ ] Esc 键可以关闭搜索面板
- [ ] 暗黑模式下 UI 正常显示
- [ ] 移动端响应式布局正常

## API 测试

### 检查搜索数据 API

访问 `http://localhost:4321/api/search.json` 应该返回 JSON 格式的视频数据：

```json
[
  {
    "id": "video-slug",
    "title": "Video Title",
    "artist": "Artist Name",
    "director": "Director Name",
    "tags": "tag1 tag2 tag3",
    "production": "Production Company"
  },
  ...
]
```

### 预期响应头

```
Content-Type: application/json
Cache-Control: public, max-age=300
```

## 性能测试

### 搜索引擎初始化

- 打开浏览器控制台
- 刷新页面
- 检查网络请求 `/api/search.json`
- 应该在 1-2 秒内完成加载

### 搜索响应速度

- 输入查询时应该立即显示结果（< 100ms）
- 没有明显的 UI 卡顿

### 内存使用

- 打开浏览器的性能面板
- 搜索引擎初始化后内存应该稳定
- 多次搜索不应该导致内存泄漏

## 常见问题

### 搜索面板打不开？

1. 检查浏览器控制台是否有 JavaScript 错误
2. 确认 React 正确加载（检查 DevTools）
3. 确认 `client:load` 指令已添加

### 搜索无结果？

1. 访问 `/api/search.json` 确认有数据
2. 检查搜索引擎是否初始化成功
3. 尝试使用简单的关键词（如单个字符）

### 样式错误？

1. 确认 Tailwind CSS 正确配置
2. 检查是否有全局样式冲突
3. 清除浏览器缓存重试

## 调试技巧

### 启用调试日志

在 `SearchPalette.tsx` 中添加日志：

```typescript
useEffect(() => {
  console.log('Search query:', query);
  console.log('Search results:', results);
}, [query, results]);
```

### 检查搜索引擎状态

在浏览器控制台中：

```javascript
// 查看搜索引擎统计
console.log(engineRef.current?.getStats());
```

### 测试搜索 API

```bash
curl http://localhost:4321/api/search.json
```

## 预期行为

### 正常工作时

- 快捷键响应迅速
- 搜索结果实时更新
- UI 流畅无卡顿
- 导航跳转正常

### 异常情况处理

- API 失败时显示错误信息
- 无结果时显示友好提示
- 加载中显示状态指示

---

**测试状态**: 待测试  
**创建日期**: 2026-01-28
