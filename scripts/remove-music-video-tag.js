#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');

function removeGenericTag(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace tags array that starts with "music-video"
  const updatedContent = content.replace(
    /tags:\s*\["music-video"(?:,\s*)?([^\]]*)\]/g,
    (match, restTags) => {
      if (restTags.trim()) {
        return `tags: [${restTags}]`;
      } else {
        // If only "music-video" tag exists, remove it or add year
        return `tags: []`;
      }
    }
  );
  
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    return true;
  }
  return false;
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  REMOVE GENERIC TAG                    ║');
  console.log('║  Remove "music-video" from all videos  ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const files = fs.readdirSync(VIDEOS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  
  let updatedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(VIDEOS_DIR, file);
    const wasUpdated = removeGenericTag(filePath);
    
    if (wasUpdated) {
      console.log(`✅ ${file}`);
      updatedCount++;
    } else {
      console.log(`⏭  ${file} (no changes needed)`);
    }
  }
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  SUMMARY                               ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`✅ Updated: ${updatedCount} files`);
  console.log(`📊 Total: ${files.length} files\n`);
}

main().catch(console.error);
