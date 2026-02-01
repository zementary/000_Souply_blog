#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');

// Mapping based on CSV Visual_Hook data
const videoTagMapping = {
  '2024-charli-xcx-360.mdx': ['meta', 'crowd-scene', 'synchronized', 'social-commentary'],
  '2024-fontaines-dc-starburster.mdx': ['rapid-editing', 'performance', 'high-energy', 'urban'],
  '2024-rm-lost.mdx': ['surreal', 'narrative', 'office-setting', 'dystopian'],
  '2023-the-chemical-brothers-skipping-like-a-stone.mdx': ['vfx-heavy', 'nature', 'abstract', 'slow-motion'],
  '2023-antslive-captain-ants---antslive.mdx': ['action-stunts', 'nature', 'performance', 'extreme-sports']
};

function updateTags(filePath, fileName) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const newTags = videoTagMapping[fileName];
  
  if (!newTags) {
    console.log(`⏭  ${fileName} - No mapping found`);
    return false;
  }
  
  // Replace tags line
  const tagsString = JSON.stringify(newTags);
  const updatedContent = content.replace(
    /tags:\s*\[[^\]]*\]/,
    `tags: ${tagsString}`
  );
  
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    return true;
  }
  return false;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  RE-TAG VIDEOS WITH TAXONOMY                               ║');
  console.log('║  Replace unique tags with reusable classification tags    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const files = fs.readdirSync(VIDEOS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  
  let updatedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(VIDEOS_DIR, file);
    const wasUpdated = updateTags(filePath, file);
    
    if (wasUpdated) {
      console.log(`✅ ${file}`);
      console.log(`   Tags: ${JSON.stringify(videoTagMapping[file])}`);
      updatedCount++;
    } else if (videoTagMapping[file]) {
      console.log(`⚠️  ${file} - Already up to date`);
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`✅ Updated: ${updatedCount} files`);
  console.log(`📊 Total: ${files.length} files\n`);
  
  console.log('📝 Next steps:');
  console.log('   1. Review the new tags');
  console.log('   2. Update TAG_TAXONOMY.md with additional tags as needed');
  console.log('   3. For future imports, manually select tags from the taxonomy\n');
}

main().catch(console.error);
