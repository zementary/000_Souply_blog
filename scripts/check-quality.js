#!/usr/bin/env node

/**
 * 数据质量检测脚本
 * 
 * 用途: 扫描所有视频文件，检测常见的数据质量问题
 * 
 * 使用:
 *   node scripts/check-quality.js                    # 检测所有文件
 *   node scripts/check-quality.js --file path.mdx    # 检测单个文件
 *   node scripts/check-quality.js --verbose          # 显示详细信息
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const VIDEOS_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');

// Quality check rules
const QUALITY_CHECKS = {
  // 1. 前导符号残留
  leadingPunctuation: {
    name: '前导符号残留',
    severity: 'error',
    fields: ['director', 'editor', 'dop', 'vfx', 'sound_design', 'art_director', 'production_company'],
    pattern: /^["'][-–—,\s]+[A-Z]/,
    description: '字段值以符号开头（破折号、逗号等）',
  },
  
  // 2. 社交 Handle 残留
  socialHandles: {
    name: '社交 Handle 残留',
    severity: 'error',
    fields: ['director', 'editor', 'dop', 'vfx', 'sound_design', 'art_director'],
    pattern: /@[\w.]+/,
    description: '字段值包含 @username 格式的社交账号',
  },
  
  // 3. 字段前缀污染（跨职位污染）
  fieldPrefixPollution: {
    name: '字段前缀污染',
    severity: 'error',
    fields: ['director', 'editor', 'dop', 'vfx', 'sound_design', 'art_director', 'production_company'],
    pattern: /\b(Cinematographer|Editor|Director|DOP|VFX|Sound|Art Director|Producer|Production|Colorist|Gaffer|Camera)\s*[-:]/,
    description: '字段值包含其他职位标签（跨职位污染）',
  },
  
  // 4. 组织前缀混入
  orgPrefix: {
    name: '组织前缀混入',
    severity: 'warning',
    fields: ['vfx', 'sound_design', 'production_company'],
    pattern: /^["'][A-Z][a-z]+\s*:\s*/,
    description: '字段值包含组织冒号前缀（Studio:, Company: 等）',
  },
  
  // 5. 首字母截断（启发式）
  missingFirstLetter: {
    name: '首字母截断（疑似）',
    severity: 'critical',
    fields: ['director', 'editor', 'dop', 'vfx', 'sound_design', 'art_director', 'production_company'],
    pattern: /^["'][a-z]/,
    description: '字段值以小写字母开头（可能缺少首字母）',
  },
  
  // 6. Title 中包含 " - "（可能重复 Artist）
  titleHasDash: {
    name: 'Title 包含分隔符',
    severity: 'warning',
    fields: ['title'],
    pattern: /\s+-\s+/,
    description: 'Title 包含 " - "，可能重复了 Artist 名字',
  },
  
  // 7. Artist 是频道名（VEVO, Official 等）
  artistIsChannel: {
    name: 'Artist 疑似频道名',
    severity: 'warning',
    fields: ['artist'],
    pattern: /\b(official|vevo|label|entertainment|records)\b/i,
    description: 'Artist 字段包含频道关键词，可能误识别',
  },
  
  // 8. 日期占位符
  datePlaceholder: {
    name: '日期占位符',
    severity: 'info',
    fields: ['publishDate'],
    pattern: /-01-01$/,
    description: '日期为 YYYY-01-01（需手动更新为精确日期）',
  },
  
  // 9. curator_note 为空
  emptyCuratorNote: {
    name: 'curator_note 为空',
    severity: 'info',
    fields: ['curator_note'],
    pattern: /^["']?\s*["']?$/,
    description: 'curator_note 未填写',
  },
};

// ============================================================================
// FILE PARSING
// ============================================================================

function parseVideoFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extract frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('Invalid frontmatter format');
  }
  
  const frontmatter = frontmatterMatch[1];
  const metadata = {};
  
  // Parse YAML-like fields
  const lines = frontmatter.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      metadata[key] = value;
    }
  }
  
  return metadata;
}

// ============================================================================
// QUALITY CHECKS
// ============================================================================

function checkFile(filePath, verbose = false) {
  const fileName = path.basename(filePath);
  const issues = [];
  
  try {
    const metadata = parseVideoFile(filePath);
    
    // Run each quality check
    for (const [checkId, check] of Object.entries(QUALITY_CHECKS)) {
      for (const field of check.fields) {
        const value = metadata[field];
        
        if (!value) {
          // Special case: curator_note empty
          if (field === 'curator_note') {
            issues.push({
              file: fileName,
              field,
              severity: check.severity,
              issue: check.name,
              description: check.description,
              value: '(empty)',
            });
          }
          continue;
        }
        
        // Check pattern
        if (check.pattern.test(value)) {
          issues.push({
            file: fileName,
            field,
            severity: check.severity,
            issue: check.name,
            description: check.description,
            value,
          });
          
          if (verbose) {
            console.log(`  ⚠️  [${check.severity.toUpperCase()}] ${field}: ${check.name}`);
            console.log(`      Value: ${value}`);
            console.log(`      Reason: ${check.description}\n`);
          }
        }
      }
    }
    
    return { fileName, issues, success: true };
    
  } catch (error) {
    return { fileName, issues: [], success: false, error: error.message };
  }
}

// ============================================================================
// REPORTING
// ============================================================================

function generateReport(results, verbose) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  数据质量检测报告                                      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const totalFiles = results.length;
  const failedFiles = results.filter(r => !r.success).length;
  const filesWithIssues = results.filter(r => r.issues.length > 0).length;
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  
  // Count by severity
  const severityCounts = {
    critical: 0,
    error: 0,
    warning: 0,
    info: 0,
  };
  
  results.forEach(r => {
    r.issues.forEach(i => {
      severityCounts[i.severity]++;
    });
  });
  
  console.log(`📁 总文件数: ${totalFiles}`);
  console.log(`✅ 完全正确: ${totalFiles - filesWithIssues} (${Math.round((totalFiles - filesWithIssues) / totalFiles * 100)}%)`);
  console.log(`⚠️  存在问题: ${filesWithIssues} (${Math.round(filesWithIssues / totalFiles * 100)}%)`);
  
  if (failedFiles > 0) {
    console.log(`❌ 解析失败: ${failedFiles}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`🔍 问题统计 (共 ${totalIssues} 个):\n`);
  if (severityCounts.critical > 0) {
    console.log(`   🚨 严重: ${severityCounts.critical}`);
  }
  if (severityCounts.error > 0) {
    console.log(`   ❌ 错误: ${severityCounts.error}`);
  }
  if (severityCounts.warning > 0) {
    console.log(`   ⚠️  警告: ${severityCounts.warning}`);
  }
  if (severityCounts.info > 0) {
    console.log(`   ℹ️  提示: ${severityCounts.info}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Group issues by type
  const issuesByType = {};
  results.forEach(r => {
    r.issues.forEach(i => {
      if (!issuesByType[i.issue]) {
        issuesByType[i.issue] = [];
      }
      issuesByType[i.issue].push({ file: r.fileName, ...i });
    });
  });
  
  // Print issues by type
  for (const [issueType, issues] of Object.entries(issuesByType)) {
    const severityIcon = {
      critical: '🚨',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    }[issues[0].severity];
    
    console.log(`${severityIcon} ${issueType} (${issues.length} 处):\n`);
    
    issues.forEach(issue => {
      console.log(`   📄 ${issue.file}`);
      console.log(`      字段: ${issue.field}`);
      console.log(`      值: ${issue.value}`);
      if (verbose) {
        console.log(`      说明: ${issue.description}`);
      }
      console.log('');
    });
  }
  
  // Recommendations
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 建议:\n');
  
  if (severityCounts.critical > 0 || severityCounts.error > 0) {
    console.log('   1. 运行自动修复脚本:');
    console.log('      npm run fix-quality\n');
  }
  
  if (severityCounts.critical > 0) {
    console.log('   2. 手动修复"首字母截断"问题:');
    console.log('      回到 YouTube 视频描述原文核对完整内容\n');
  }
  
  if (severityCounts.info > 0) {
    console.log('   3. 完善必填字段:');
    console.log('      - 更新 publishDate 为精确日期');
    console.log('      - 撰写 curator_note\n');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Quality score
  const maxScore = totalFiles * 100;
  const deductions = 
    severityCounts.critical * 10 +
    severityCounts.error * 5 +
    severityCounts.warning * 2 +
    severityCounts.info * 1;
  const score = Math.max(0, maxScore - deductions);
  const scorePercent = Math.round(score / maxScore * 100);
  
  console.log(`📊 数据质量评分: ${scorePercent}%`);
  
  if (scorePercent >= 90) {
    console.log('   🎉 优秀！数据质量很高。\n');
  } else if (scorePercent >= 70) {
    console.log('   👍 良好，但还有改进空间。\n');
  } else if (scorePercent >= 50) {
    console.log('   ⚠️  一般，建议尽快修复问题。\n');
  } else {
    console.log('   🚨 较差，需要立即处理问题。\n');
  }
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = minimist(process.argv.slice(2));
  const verbose = args.verbose || args.v || false;
  
  let filesToCheck = [];
  
  if (args.file) {
    // Check single file
    const filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Error: File not found: ${filePath}`);
      process.exit(1);
    }
    filesToCheck = [filePath];
  } else {
    // Check all files
    if (!fs.existsSync(VIDEOS_DIR)) {
      console.error(`❌ Error: Videos directory not found: ${VIDEOS_DIR}`);
      process.exit(1);
    }
    
    const files = fs.readdirSync(VIDEOS_DIR)
      .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
      .map(f => path.join(VIDEOS_DIR, f));
    
    filesToCheck = files;
  }
  
  console.log(`\n🔍 检测 ${filesToCheck.length} 个文件...\n`);
  
  const results = [];
  
  for (const filePath of filesToCheck) {
    if (verbose) {
      console.log(`📄 ${path.basename(filePath)}`);
    }
    const result = checkFile(filePath, verbose);
    results.push(result);
  }
  
  generateReport(results, verbose);
}

main();
