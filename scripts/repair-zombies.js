#!/usr/bin/env node

/**
 * ZOMBIE IMAGE REPAIR SCRIPT
 * 扫描并修复所有僵尸封面图片（< 8KB）
 * 自动重新下载对应的视频封面
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ingestVideo } from './ingest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 控制台颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const ZOMBIE_THRESHOLD_KB = 8;

/**
 * 解析 MDX frontmatter
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return null;
  }
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    // 移除引号
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    frontmatter[key] = value;
  }
  
  return frontmatter;
}

/**
 * 递归查找所有文件
 */
function findFiles(dir, pattern, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findFiles(fullPath, pattern, baseDir));
    } else if (entry.isFile() && entry.name.endsWith(pattern)) {
      files.push({
        relativePath: path.relative(baseDir, fullPath),
        fullPath
      });
    }
  }
  
  return files;
}

// ============================================================================
// 主执行流程
// ============================================================================

console.log('\n🔍 僵尸图片修复脚本 - 启动\n');
console.log('='.repeat(70));

const projectRoot = path.join(__dirname, '..');
const coversDir = path.join(projectRoot, 'public/covers');
const videosDir = path.join(projectRoot, 'src/content/videos');

// 1. 扫描所有封面图片
console.log(`\n📂 扫描封面目录: ${coversDir}\n`);

const coverFiles = findFiles(coversDir, '.jpg', coversDir);

console.log(`   找到 ${coverFiles.length} 个封面图片\n`);
console.log('='.repeat(70));

// 2. 检测僵尸图片
const zombies = [];

for (const { relativePath, fullPath } of coverFiles) {
  const stats = fs.statSync(fullPath);
  const sizeKB = stats.size / 1024;
  
  if (sizeKB < ZOMBIE_THRESHOLD_KB) {
    zombies.push({
      path: fullPath,
      relativePath,
      sizeKB
    });
    console.log(`${colors.red}🚨 ZOMBIE${colors.reset} ${relativePath} (${sizeKB.toFixed(1)} KB)`);
  }
}

console.log('\n' + '='.repeat(70));
console.log(`\n📊 检测结果: 发现 ${zombies.length} 个僵尸图片\n`);

if (zombies.length === 0) {
  console.log(`${colors.green}🎉 没有发现僵尸图片！所有封面图片都正常。${colors.reset}\n`);
  process.exit(0);
}

// 3. 为每个僵尸图片找到对应的 MDX 文件
console.log('='.repeat(70));
console.log('\n🔗 匹配 MDX 文件...\n');

const zombiesWithMdx = [];

for (const zombie of zombies) {
  // 从文件路径提取 slug (e.g., covers/2025/artist-title.jpg → artist-title)
  const fileName = path.basename(zombie.relativePath, '.jpg');
  const year = path.dirname(zombie.relativePath).split(path.sep).pop();
  
  // 尝试找到匹配的 MDX 文件
  const expectedMdxName = `${year}-${fileName}.mdx`;
  const mdxPath = path.join(videosDir, expectedMdxName);
  
  if (fs.existsSync(mdxPath)) {
    const content = fs.readFileSync(mdxPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    
    if (frontmatter && frontmatter.video_url) {
      zombiesWithMdx.push({
        ...zombie,
        mdxPath: expectedMdxName,
        videoUrl: frontmatter.video_url,
        title: frontmatter.title,
        artist: frontmatter.artist
      });
      console.log(`${colors.green}✅${colors.reset} ${zombie.relativePath}`);
      console.log(`   → ${expectedMdxName}`);
      console.log(`   → ${frontmatter.video_url}\n`);
    } else {
      console.log(`${colors.yellow}⚠️${colors.reset}  ${zombie.relativePath}`);
      console.log(`   MDX found but missing video_url: ${expectedMdxName}\n`);
    }
  } else {
    console.log(`${colors.yellow}⚠️${colors.reset}  ${zombie.relativePath}`);
    console.log(`   No matching MDX found: ${expectedMdxName}\n`);
  }
}

console.log('='.repeat(70));
console.log(`\n📋 可修复的僵尸图片: ${zombiesWithMdx.length} / ${zombies.length}\n`);

if (zombiesWithMdx.length === 0) {
  console.log(`${colors.yellow}⚠️  没有找到可修复的僵尸图片（缺少对应的 MDX 文件或 video_url）${colors.reset}\n`);
  process.exit(0);
}

// 4. 询问用户是否继续
console.log('='.repeat(70));
console.log('\n🔧 准备修复以下视频的封面:\n');

zombiesWithMdx.forEach((z, i) => {
  console.log(`${i + 1}. ${z.artist} - ${z.title}`);
  console.log(`   文件: ${z.relativePath} (${z.sizeKB.toFixed(1)} KB)`);
  console.log(`   视频: ${z.videoUrl}\n`);
});

console.log('='.repeat(70));
console.log(`\n${colors.cyan}💡 将使用 --repair-covers 模式重新下载封面图片${colors.reset}\n`);
console.log(`   按 Ctrl+C 取消，或按 Enter 继续...`);

// 简化版：自动继续（如果需要交互式确认，使用 readline）
console.log('\n🚀 开始修复...\n');
console.log('='.repeat(70));

// 5. 修复每个僵尸图片
const results = [];

for (let i = 0; i < zombiesWithMdx.length; i++) {
  const z = zombiesWithMdx[i];
  
  console.log(`\n${colors.cyan}[${i + 1}/${zombiesWithMdx.length}] 修复中: ${z.artist} - ${z.title}${colors.reset}`);
  console.log(`   视频: ${z.videoUrl}`);
  
  try {
    const result = await ingestVideo(z.videoUrl, { 
      force: true,
      repairCovers: false // 使用 force 模式重新下载
    });
    
    if (result.status === 'success' || result.status === 'repaired') {
      console.log(`${colors.green}   ✅ 修复成功${colors.reset}\n`);
      results.push({ success: true, zombie: z });
    } else {
      console.log(`${colors.yellow}   ⚠️  修复失败: ${result.reason || 'unknown'}${colors.reset}\n`);
      results.push({ success: false, zombie: z, reason: result.reason });
    }
  } catch (error) {
    console.error(`${colors.red}   ❌ 修复失败: ${error.message}${colors.reset}\n`);
    results.push({ success: false, zombie: z, error: error.message });
  }
  
  // 在请求之间添加短暂延迟
  if (i < zombiesWithMdx.length - 1) {
    console.log(`   ⏸️  等待 2 秒后继续...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// 6. 输出统计
console.log('\n' + '='.repeat(70));
console.log('\n📊 修复完成\n');

const successCount = results.filter(r => r.success).length;
const failCount = results.filter(r => !r.success).length;

console.log(`${colors.green}✅ 成功: ${successCount} 个${colors.reset}`);
console.log(`${colors.red}❌ 失败: ${failCount} 个${colors.reset}`);
console.log(`📁 总计: ${zombiesWithMdx.length} 个\n`);

// 显示失败的项（如果有）
if (failCount > 0) {
  console.log(`${colors.yellow}⚠️  失败列表:${colors.reset}\n`);
  results.filter(r => !r.success).forEach(({ zombie, reason, error }) => {
    console.log(`   • ${zombie.artist} - ${zombie.title}`);
    console.log(`     原因: ${reason || error || 'unknown'}\n`);
  });
}

console.log('='.repeat(70));
console.log('\n✅ 僵尸图片修复脚本执行完毕!\n');
