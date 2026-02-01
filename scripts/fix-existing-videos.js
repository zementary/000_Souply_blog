#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VIDEOS_DIR = path.join(__dirname, '..', 'src', 'content', 'videos');

// Artist name normalization
const artistMappings = {
  'charli xcx': 'Charli XCX',
  'asap rocky': 'A$AP Rocky',
  'a$ap rocky': 'A$AP Rocky',
  'rm': 'RM',
  'bts': 'BTS',
  'blackpink': 'BLACKPINK',
  'twice': 'TWICE',
  'txt': 'TXT',
  'itzy': 'ITZY',
  'nct': 'NCT',
  'exo': 'EXO',
  'idles': 'IDLES',
  'haim': 'HAIM',
  'muna': 'MUNA',
  'chvrches': 'CHVRCHES',
  'jpegmafia': 'JPEGMAFIA',
  'mgmt': 'MGMT',
  'sbtrkt': 'SBTRKT',
  'fontaines dc': 'Fontaines D.C.',
  'fontaines d.c.': 'Fontaines D.C.'
};

function normalizeArtistName(artistName) {
  const lowerArtist = artistName.toLowerCase().trim();
  return artistMappings[lowerArtist] || artistName;
}

function cleanSongTitle(title, artistName) {
  let cleanTitle = title.trim();
  
  // Remove leading commas, dashes, spaces
  cleanTitle = cleanTitle.replace(/^[,\s-]+/, '');
  
  // Remove artist name from beginning (case-insensitive)
  const escapedArtist = artistName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const artistPattern = new RegExp(`^${escapedArtist}\\s*[-:,–—]?\\s*`, 'i');
  cleanTitle = cleanTitle.replace(artistPattern, '');
  
  // Remove trailing punctuation
  cleanTitle = cleanTitle.replace(/[-–—,]+$/, '').trim();
  
  return cleanTitle;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  if (!match) return null;
  
  const frontmatter = {};
  const lines = match[1].split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    let value = line.substring(colonIndex + 1).trim();
    
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    frontmatter[key] = value;
  }
  
  return frontmatter;
}

function generateFrontmatter(data) {
  const lines = ['---'];
  
  const fields = [
    'title', 'artist', 'video_url', 'publishDate', 'cover', 'curator_note',
    'director', 'production_company', 'dop', 'editor', 'art_director', 'vfx', 'sound_design', 'tags'
  ];
  
  for (const field of fields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      if (field === 'tags' || field === 'publishDate') {
        lines.push(`${field}: ${data[field]}`);
      } else {
        // Escape quotes in values
        const escapedValue = data[field].replace(/"/g, '\\"');
        lines.push(`${field}: "${escapedValue}"`);
      }
    }
  }
  
  lines.push('---');
  lines.push('');
  
  return lines.join('\n');
}

async function fixVideo(fileName) {
  const filePath = path.join(VIDEOS_DIR, fileName);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    console.log(`⚠️  Skipping ${fileName}: Could not parse frontmatter`);
    return null;
  }
  
  let modified = false;
  const originalArtist = frontmatter.artist;
  const originalTitle = frontmatter.title;
  
  // 1. Normalize artist name
  const normalizedArtist = normalizeArtistName(frontmatter.artist);
  if (normalizedArtist !== frontmatter.artist) {
    console.log(`   🎤 Artist: "${frontmatter.artist}" → "${normalizedArtist}"`);
    frontmatter.artist = normalizedArtist;
    modified = true;
  }
  
  // 2. Clean title (remove artist name prefix, leading commas)
  const cleanedTitle = cleanSongTitle(frontmatter.title, normalizedArtist);
  if (cleanedTitle !== frontmatter.title) {
    console.log(`   🎵 Title: "${frontmatter.title}" → "${cleanedTitle}"`);
    frontmatter.title = cleanedTitle;
    modified = true;
  }
  
  // 3. Fix director field (remove artifacts)
  if (frontmatter.director) {
    let fixedDirector = frontmatter.director;
    const originalDirector = fixedDirector;
    
    // Remove "ected by" artifact
    fixedDirector = fixedDirector.replace(/^ected by\s*/i, '');
    // Remove "and Editor:" prefix
    fixedDirector = fixedDirector.replace(/^and\s+Editor:\s*/i, '');
    // Remove social media handles
    fixedDirector = fixedDirector.replace(/\s*@\w+\s*$/, '');
    // Remove trailing punctuation
    fixedDirector = fixedDirector.trim();
    
    if (fixedDirector !== originalDirector) {
      console.log(`   🎬 Director: "${originalDirector}" → "${fixedDirector}"`);
      frontmatter.director = fixedDirector;
      modified = true;
    }
  }
  
  // 4. Fix other credit fields (remove artifacts)
  const creditFields = ['dop', 'editor', 'production_company', 'vfx', 'sound_design', 'art_director'];
  for (const field of creditFields) {
    if (frontmatter[field]) {
      let original = frontmatter[field];
      let fixed = original;
      
      // Check if the field looks corrupted (too short or starts with lowercase fragments)
      const looksCorrupted = fixed.length < 4 || /^[a-z]{1,5}[:\s]/.test(fixed);
      
      if (looksCorrupted) {
        console.log(`   ⚠️  ${field}: "${original}" appears corrupted, removing`);
        delete frontmatter[field];
        modified = true;
        continue;
      }
      
      // Remove "Company:" prefix
      fixed = fixed.replace(/^Company:\s*/i, '');
      // Remove "Studio:" or "tudio:" prefix
      fixed = fixed.replace(/^t?udio:\s*/i, '');
      // Remove social media handles
      fixed = fixed.replace(/\s*@\w+\s*$/, '');
      // Remove leading lowercase fragments
      fixed = fixed.replace(/^[a-z]+:\s*/, '');
      
      fixed = fixed.trim();
      
      if (fixed !== original && fixed) {
        console.log(`   ✂️  ${field}: "${original}" → "${fixed}"`);
        frontmatter[field] = fixed;
        modified = true;
      }
    }
  }
  
  // 5. Update cover path to match new naming convention
  const year = frontmatter.publishDate.split('-')[0];
  const artistSlug = normalizedArtist.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  const titleSlug = cleanedTitle.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  const newCoverPath = `/covers/${year}/${artistSlug}-${titleSlug}.jpg`;
  
  if (frontmatter.cover && frontmatter.cover !== newCoverPath) {
    console.log(`   🖼️  Cover path: "${frontmatter.cover}" → "${newCoverPath}"`);
    frontmatter.cover = newCoverPath;
    modified = true;
  }
  
  // Generate new content if modified
  if (modified) {
    const newContent = generateFrontmatter(frontmatter);
    fs.writeFileSync(filePath, newContent);
  }
  
  // 6. Generate new filename (yyyy-artist-title format)
  const newFileName = `${year}-${artistSlug}-${titleSlug}.mdx`;
  
  // Rename file if needed
  if (newFileName !== fileName) {
    const newFilePath = path.join(VIDEOS_DIR, newFileName);
    
    // Check if new file already exists
    if (fs.existsSync(newFilePath)) {
      console.log(`   ⚠️  Cannot rename: ${newFileName} already exists`);
      return { fileName, modified };
    }
    
    // Update file path for rename
    const currentPath = modified ? path.join(VIDEOS_DIR, fileName) : filePath;
    
    fs.renameSync(currentPath, newFilePath);
    console.log(`   📝 Renamed: ${fileName} → ${newFileName}`);
    
    // Update cover path if needed
    const oldCoverName = fileName.replace('.mdx', '.jpg');
    const newCoverName = newFileName.replace('.mdx', '.jpg');
    const oldCoverPath = path.join(__dirname, '..', 'public', 'covers', year, oldCoverName);
    const newCoverPath = path.join(__dirname, '..', 'public', 'covers', year, newCoverName);
    
    if (fs.existsSync(oldCoverPath) && oldCoverName !== newCoverName) {
      fs.renameSync(oldCoverPath, newCoverPath);
      console.log(`   🖼️  Renamed cover: ${oldCoverName} → ${newCoverName}`);
    }
    
    return { fileName: newFileName, modified: true, renamed: true };
  }
  
  return modified ? { fileName, modified: true } : null;
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  SOUPLY VIDEO FIXER v1.0               ║');
  console.log('║  Fix existing video metadata           ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const files = fs.readdirSync(VIDEOS_DIR)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  
  console.log(`📁 Found ${files.length} video files\n`);
  
  let fixedCount = 0;
  let renamedCount = 0;
  
  for (const file of files) {
    console.log(`\n📼 Processing: ${file}`);
    const result = await fixVideo(file);
    
    if (result && result.modified) {
      fixedCount++;
      if (result.renamed) {
        renamedCount++;
      }
    } else {
      console.log(`   ✓ No changes needed`);
    }
  }
  
  console.log('\n\n╔════════════════════════════════════════╗');
  console.log('║  SUMMARY                               ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`✅ Fixed: ${fixedCount} files`);
  console.log(`📝 Renamed: ${renamedCount} files`);
  console.log(`📊 Total processed: ${files.length} files\n`);
}

main().catch(console.error);
