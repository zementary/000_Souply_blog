#!/usr/bin/env node

import 'dotenv/config';

/**
 * BATCH RETAG SCRIPT (LLM-powered)
 *
 * 用途：
 * - 批量为视频推断内部 tags（仅用于内部筛选，不对外展示）
 * - 基于 title / artist / director / production / 年份 等元数据调用 LLM
 *
 * 用法：
 *   node scripts/batch-retag.js --dry-run --limit 5 --year 2026
 *   node scripts/batch-retag.js --limit 100 --year 2026
 *
 * 约定：
 * - 只处理 tags 含有 "uncategorized" 的文件，避免覆盖已人工整理的标签
 * - --dry-run 只打印拟议变更，不写回文件
 * - --limit 控制最大处理文件数
 * - --year 按文件名前缀年份过滤（例如 2026-xxx.mdx）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

import { inferTagsWithLLM } from './lib/llm-tags.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');

/**
 * 简单解析 frontmatter，返回 { rawFrontmatter, data }。
 * 仅支持形如 key: value 的扁平字段；tags 单独处理。
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return { rawFrontmatter: null, data: {} };

  const rawFrontmatter = match[1];
  const lines = rawFrontmatter.split('\n');
  const data = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();

    // tags: [...] 保留原样，由专门逻辑解析
    if (key === 'tags') {
      data.tagsRaw = value;
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    data[key] = value;
  }

  return { rawFrontmatter, data };
}

/**
 * 从 frontmatter 中解析 tags 数组
 */
function parseTagsFromFrontmatter(rawFrontmatter) {
  if (!rawFrontmatter) return [];

  const match = rawFrontmatter.match(/^tags:\s*(\[[^\]]*\])/m);
  if (!match) return [];

  const arrayText = match[1];
  try {
    const parsed = JSON.parse(arrayText);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn('   ⚠️ [TAGS] Failed to parse tags array, raw:', arrayText);
    return [];
  }
}

/**
 * 用新的 tags 数组替换 frontmatter 中的 tags 行
 */
function replaceTagsInContent(content, newTags) {
  const tagsString = JSON.stringify(newTags);
  if (/^tags:\s*\[[^\]]*\]/m.test(content)) {
    return content.replace(/^tags:\s*\[[^\]]*\]/m, `tags: ${tagsString}`);
  }
  // 如果没有 tags 行，则插入到 frontmatter 底部（--- 之前）
  return content.replace(/^---\n([\s\S]*?)\n---/, (full, inner) => {
    const updatedInner = `${inner}\ntags: ${tagsString}`;
    return `---\n${updatedInner}\n---`;
  });
}

/**
 * 从文件名推断年份（例如 2026-xxx.mdx → 2026）
 */
function inferYearFromFilename(fileName) {
  const prefix = fileName.split('-')[0];
  if (/^\d{4}$/.test(prefix)) {
    return Number(prefix);
  }
  return null;
}

async function processFile(filePath, options) {
  const fileName = path.basename(filePath);
  const rawContent = fs.readFileSync(filePath, 'utf-8');

  const { rawFrontmatter, data } = parseFrontmatter(rawContent);
  if (!rawFrontmatter) {
    console.warn(`   ⚠️ [SKIP] ${fileName} - Missing or invalid frontmatter`);
    return { skipped: true };
  }

  const existingTags = parseTagsFromFrontmatter(rawFrontmatter);

  // 只处理含有 "uncategorized" 的文件，避免覆盖人工标签
  const hasUncategorized = existingTags.includes('uncategorized');
  if (!hasUncategorized) {
    console.log(`⏭  ${fileName} - tags already curated, skipping`);
    return { skipped: true };
  }

  const publishYear =
    (data.publishDate && Number(String(data.publishDate).slice(0, 4))) ||
    inferYearFromFilename(fileName);

  if (options.year && publishYear && publishYear !== options.year) {
    console.log(`⏭  ${fileName} - year ${publishYear} does not match filter ${options.year}`);
    return { skipped: true };
  }

  console.log(`\n🎬 Processing: ${fileName}`);
  console.log(`   Title: ${data.title || '(unknown)'}`);
  console.log(`   Artist: ${data.artist || '(unknown)'}`);
  if (data.director) {
    console.log(`   Director: ${data.director}`);
  }
  if (data.production) {
    console.log(`   Production: ${data.production}`);
  }

  const llmInput = {
    title: data.title || '',
    artist: data.artist || '',
    director: data.director || null,
    production: data.production || null,
    year: publishYear || null,
    existingTags,
  };

  const { tags } = await inferTagsWithLLM(llmInput);

  if (!tags || tags.length === 0) {
    console.log('   ⚠️ [TAGS] LLM returned no tags, keeping existing tags');
    return { skipped: false, updated: false, tags: existingTags };
  }

  console.log(`   ✅ Suggested tags: ${JSON.stringify(tags)}`);

  if (options.dryRun) {
    console.log('   💡 DRY-RUN: not writing changes to file');
    return { skipped: false, updated: false, tags };
  }

  const updatedContent = replaceTagsInContent(rawContent, tags);

  if (updatedContent !== rawContent) {
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log('   💾 Tags updated on disk');
    return { skipped: false, updated: true, tags };
  }

  console.log('   ℹ️  Content unchanged after tag replacement');
  return { skipped: false, updated: false, tags };
}

async function main() {
  const args = minimist(process.argv.slice(2), {
    boolean: ['dry-run'],
    alias: {
      n: 'limit',
      y: 'year',
    },
  });

  const dryRun = Boolean(args['dry-run']);
  const limit = args.limit ? Number(args.limit) : null;
  const year = args.year ? Number(args.year) : null;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  BATCH RETAG (LLM-powered internal tags)                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Options: dry-run=${dryRun ? 'yes' : 'no'} limit=${limit ?? '∞'} year=${year ?? 'any'}`);

  if (!fs.existsSync(VIDEOS_DIR)) {
    console.error(`❌ Videos directory not found: ${VIDEOS_DIR}`);
    process.exit(1);
  }

  const allFiles = fs
    .readdirSync(VIDEOS_DIR)
    .filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
    .sort();

  let processed = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const file of allFiles) {
    if (limit != null && processed >= limit) {
      break;
    }

    const filePath = path.join(VIDEOS_DIR, file);
    // 粗略按文件名前缀年份过滤，加速扫描
    if (year) {
      const filenameYear = inferYearFromFilename(file);
      if (filenameYear && filenameYear !== year) {
        continue;
      }
    }

    // eslint-disable-next-line no-await-in-loop
    const result = await processFile(filePath, { dryRun, year });
    processed++;

    if (result.skipped) {
      skippedCount++;
    } else if (result.updated) {
      updatedCount++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`📁 Scanned files (within filters): ${processed}`);
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`⏭  Skipped: ${skippedCount}`);
  console.log('');

  if (dryRun) {
    console.log('💡 DRY-RUN mode: No files were modified.');
  }
}

main().catch((err) => {
  console.error('❌ Unhandled error in batch-retag:', err);
  process.exit(1);
});

