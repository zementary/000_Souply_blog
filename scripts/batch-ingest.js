#!/usr/bin/env node

/**
 * BATCH INGEST SCRIPT
 * 批量导入多个 YouTube/Vimeo 视频
 * 从 urls.txt 文件读取 URL 列表并逐个处理
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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
};

/**
 * 读取并解析 urls.txt 文件
 */
function readUrls(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`URL 文件不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const urls = [];
  for (const line of lines) {
    const trimmed = line.trim();
    
    // 跳过空行和注释行（以 # 开头）
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // 基本 URL 验证
    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be') || trimmed.includes('vimeo.com')) {
      urls.push(trimmed);
    } else {
      console.log(`${colors.yellow}⚠️  跳过无效 URL: ${trimmed}${colors.reset}`);
    }
  }

  return urls;
}

/**
 * 导入单个视频
 */
function ingestVideo(url, index, total) {
  try {
    console.log(`\n${colors.cyan}[${index}/${total}] 处理中: ${url}${colors.reset}`);
    console.log(`   🔄 运行: node scripts/ingest.js "${url}"`);
    
    // 调用现有的 ingest.js 脚本（使用 stdio: 'inherit' 显示实时输出）
    execSync(`node scripts/ingest.js "${url}"`, {
      encoding: 'utf-8',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        PATH: `/Users/eddy/Library/Python/3.12/bin:${process.env.PATH}`
      },
      stdio: 'inherit'
    });
    
    console.log(`${colors.green}   ✅ 成功: ${url}${colors.reset}`);
    return { success: true, url };
  } catch (error) {
    // 错误处理：记录错误但继续处理下一个
    console.error(`${colors.red}   ❌ 失败: ${url}${colors.reset}`);
    console.error(`${colors.red}   错误: ${error.message}${colors.reset}`);
    return { success: false, url, error: error.message };
  }
}

// ============================================================================
// 主执行流程
// ============================================================================

console.log('\n🚀 批量导入脚本 - 启动\n');
console.log('='.repeat(70));

// 读取 urls.txt
const urlsFilePath = path.join(__dirname, '../urls.txt');
let urls;

try {
  urls = readUrls(urlsFilePath);
} catch (error) {
  console.error(`${colors.red}❌ 读取 URL 文件失败: ${error.message}${colors.reset}`);
  console.error(`\n💡 提示: 请在项目根目录创建 urls.txt 文件，每行一个 URL\n`);
  process.exit(1);
}

if (urls.length === 0) {
  console.log(`${colors.yellow}⚠️  urls.txt 中没有找到有效的 URL${colors.reset}\n`);
  console.log('💡 提示: 在 urls.txt 中添加 YouTube 或 Vimeo URL（每行一个）\n');
  process.exit(0);
}

console.log(`\n📋 找到 ${urls.length} 个视频 URL:\n`);
urls.forEach((url, index) => {
  console.log(`   ${index + 1}. ${url}`);
});

console.log('\n' + '='.repeat(70));
console.log('\n🔄 开始处理视频...\n');
console.log('='.repeat(70));

// 处理每个 URL
const results = [];
for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  const result = ingestVideo(url, i + 1, urls.length);
  results.push(result);
  
  // 在请求之间添加短暂延迟（避免触发速率限制）
  if (i < urls.length - 1) {
    console.log(`   ⏸️  等待 2 秒后继续...\n`);
    execSync('sleep 2');
  }
}

// 统计结果
const successCount = results.filter(r => r.success).length;
const failCount = results.filter(r => !r.success).length;

console.log('\n' + '='.repeat(70));
console.log('\n📊 批量导入完成\n');
console.log(`${colors.green}✅ 成功: ${successCount} 个视频${colors.reset}`);
console.log(`${colors.red}❌ 失败: ${failCount} 个视频${colors.reset}`);
console.log(`📁 总计: ${urls.length} 个视频\n`);

// 显示失败的 URL（如果有）
if (failCount > 0) {
  console.log(`${colors.yellow}⚠️  失败的视频:${colors.reset}\n`);
  results.filter(r => !r.success).forEach(({ url, error }) => {
    console.log(`   • ${url}`);
    console.log(`     错误: ${error}\n`);
  });
  console.log('💡 提示: 你可以手动重试失败的视频:');
  console.log('   node scripts/ingest.js <video_url>\n');
}

console.log('✅ 批量导入脚本执行完毕!\n');
