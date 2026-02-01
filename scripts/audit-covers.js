#!/usr/bin/env node

/**
 * COVER IMAGE AUDIT SCRIPT
 * 审计所有 MDX 文件的封面图片
 * 检查 cover 字段是否为空或指向不存在的文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    // 简单的 key: value 解析
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
 * 检查封面图片
 */
function checkCover(coverPath, publicDir) {
  // 检查是否为空字符串
  if (!coverPath || coverPath === '' || coverPath === "''" || coverPath === '""') {
    return { status: 'EMPTY', message: '封面字段为空' };
  }
  
  // 检查是否为本地路径
  if (coverPath.startsWith('./') || coverPath.startsWith('/')) {
    // 解析路径
    let resolvedPath;
    if (coverPath.startsWith('./')) {
      resolvedPath = path.join(publicDir, coverPath.substring(2));
    } else {
      resolvedPath = path.join(publicDir, coverPath);
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(resolvedPath)) {
      return { 
        status: 'MISSING_FILE', 
        message: `文件不存在: ${resolvedPath}`,
        expectedPath: resolvedPath
      };
    }
  }
  
  return { status: 'OK' };
}

// ============================================================================
// 主执行流程
// ============================================================================

console.log('\n🔍 封面图片审计脚本 - 启动\n');
console.log('='.repeat(70));

const projectRoot = path.join(__dirname, '..');
const videosDir = path.join(projectRoot, 'src/content/videos');
const publicDir = path.join(projectRoot, 'public');

// 扫描所有 MDX 文件
console.log(`\n📂 扫描目录: ${videosDir}\n`);

// 递归查找所有 MDX 文件
function findMdxFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findMdxFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  
  return files;
}

const mdxFiles = findMdxFiles(videosDir);

console.log(`   找到 ${mdxFiles.length} 个 MDX 文件\n`);
console.log('='.repeat(70));

const issues = [];
let totalChecked = 0;
let emptyCount = 0;
let missingFileCount = 0;
let okCount = 0;

// 检查每个文件
for (const mdxFile of mdxFiles) {
  const fullPath = path.join(videosDir, mdxFile);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const frontmatter = parseFrontmatter(content);
  
  if (!frontmatter) {
    console.log(`${colors.yellow}⚠️  无法解析 frontmatter: ${mdxFile}${colors.reset}`);
    continue;
  }
  
  totalChecked++;
  
  const cover = frontmatter.cover;
  const videoUrl = frontmatter.video_url;
  const title = frontmatter.title;
  const artist = frontmatter.artist;
  
  const result = checkCover(cover, publicDir);
  
  if (result.status === 'EMPTY') {
    emptyCount++;
    issues.push({
      file: mdxFile,
      status: 'EMPTY',
      message: result.message,
      videoUrl,
      title,
      artist
    });
    console.log(`${colors.red}❌ EMPTY${colors.reset}       ${mdxFile}`);
    console.log(`   ${result.message}`);
    console.log(`   视频: ${videoUrl || 'N/A'}\n`);
  } else if (result.status === 'MISSING_FILE') {
    missingFileCount++;
    issues.push({
      file: mdxFile,
      status: 'MISSING_FILE',
      message: result.message,
      videoUrl,
      title,
      artist,
      cover,
      expectedPath: result.expectedPath
    });
    console.log(`${colors.red}❌ MISSING${colors.reset}     ${mdxFile}`);
    console.log(`   ${result.message}`);
    console.log(`   Cover 字段: ${cover}`);
    console.log(`   视频: ${videoUrl || 'N/A'}\n`);
  } else {
    okCount++;
    // 不打印成功的文件，保持输出简洁
  }
}

// 输出统计
console.log('='.repeat(70));
console.log('\n📊 审计结果:\n');
console.log(`   ${colors.green}✅ 正常: ${okCount} 个文件${colors.reset}`);
console.log(`   ${colors.red}❌ 空封面: ${emptyCount} 个文件${colors.reset}`);
console.log(`   ${colors.red}❌ 文件缺失: ${missingFileCount} 个文件${colors.reset}`);
console.log(`   📁 总计: ${totalChecked} 个文件\n`);

// 如果有问题，生成 YouTube URLs 列表
if (issues.length > 0) {
  console.log('='.repeat(70));
  console.log(`\n${colors.yellow}⚠️  发现 ${issues.length} 个问题${colors.reset}\n`);
  
  console.log('📋 问题列表:\n');
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.file}`);
    console.log(`   状态: ${issue.status}`);
    console.log(`   艺术家: ${issue.artist || 'N/A'}`);
    console.log(`   标题: ${issue.title || 'N/A'}`);
    if (issue.cover) {
      console.log(`   Cover: ${issue.cover}`);
    }
    console.log(`   视频: ${issue.videoUrl || 'N/A'}\n`);
  });
  
  // 生成 YouTube URLs 列表（用于复制到 urls.txt）
  console.log('='.repeat(70));
  console.log(`\n${colors.cyan}📝 YouTube URLs（可复制到 urls.txt 重新导入）:${colors.reset}\n`);
  
  const youtubeUrls = issues
    .filter(issue => issue.videoUrl)
    .map(issue => issue.videoUrl);
  
  if (youtubeUrls.length > 0) {
    youtubeUrls.forEach(url => {
      console.log(url);
    });
    console.log('');
  } else {
    console.log(`${colors.yellow}   （没有找到 video_url）${colors.reset}\n`);
  }
  
  // 保存到文件
  const outputFile = path.join(projectRoot, 'urls-to-fix.txt');
  if (youtubeUrls.length > 0) {
    fs.writeFileSync(outputFile, youtubeUrls.join('\n') + '\n', 'utf-8');
    console.log(`${colors.green}💾 已保存到: urls-to-fix.txt${colors.reset}\n`);
  }
} else {
  console.log(`${colors.green}🎉 所有封面图片检查通过！${colors.reset}\n`);
}

console.log('='.repeat(70));
console.log('\n✅ 审计完成!\n');
