#!/usr/bin/env node
/**
 * METADATA AUDIT TOOL
 * Scans all MDX files and validates director metadata
 * Generates METADATA_AUDIT.md report
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Blocklist words that indicate dirty data
const DIRECTOR_BLOCKLIST = [
  'Assistant',
  'Rep',
  'Executive',
  'Photography',
  'DOP',
  'Producer',
  'Editor',
  'Production',
  'Commissioner',
  'Creative',
  'Anim',
  'Coordinator',
  'Manager',
  'Supervisor',
  'Associate',
  'Casting',
  'Technical',
  'Music',
  'Art',
  'Cinematographer',
  'Videographer',
  'Camera',
];

/**
 * Check if director field contains blocklisted words
 */
function isDirtyDirector(director) {
  if (!director) return false;
  const lowerDirector = director.toLowerCase();
  return DIRECTOR_BLOCKLIST.some(blocked => 
    lowerDirector.includes(blocked.toLowerCase())
  );
}

/**
 * Extract frontmatter from MDX file
 */
async function extractFrontmatter(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) return null;
  
  const frontmatter = {};
  const lines = frontmatterMatch[1].split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*['"]?(.*?)['"]?$/);
    if (match) {
      frontmatter[match[1]] = match[2];
    }
  }
  
  return frontmatter;
}

/**
 * Scan all MDX files and audit metadata
 */
async function auditMetadata() {
  const videosDir = path.join(__dirname, '../src/content/videos');
  const files = await fs.readdir(videosDir);
  const mdxFiles = files.filter(f => f.endsWith('.mdx'));
  
  console.log(`\n🔍 Auditing ${mdxFiles.length} MDX files...\n`);
  
  const results = {
    clean: [],
    missing: [],
    dirty: [],
    vimeo: [],
  };
  
  for (const file of mdxFiles) {
    const filePath = path.join(videosDir, file);
    const frontmatter = await extractFrontmatter(filePath);
    
    if (!frontmatter) {
      console.log(`⚠️  ${file}: No frontmatter found`);
      continue;
    }
    
    const director = frontmatter.director || '';
    const videoUrl = frontmatter.videoUrl || '';
    const isVimeo = videoUrl.includes('vimeo.com');
    
    // Check status
    if (!director || director.trim() === '') {
      if (isVimeo) {
        results.vimeo.push({
          file,
          director: '(empty)',
          status: '🔧 VIMEO',
          action: 'Manual Intervention Required',
          videoUrl,
        });
      } else {
        results.missing.push({
          file,
          director: '(empty)',
          status: '⚠️ MISSING',
          action: 'Re-run ingestion or manual fix',
        });
      }
    } else if (isDirtyDirector(director)) {
      results.dirty.push({
        file,
        director,
        status: '❌ DIRTY',
        action: 'Re-run ingestion with new validator',
      });
    } else {
      results.clean.push({
        file,
        director,
        status: '✅ OK',
        action: '-',
      });
    }
  }
  
  // Generate report
  await generateReport(results);
  
  // Print summary
  console.log('\n📊 AUDIT SUMMARY:');
  console.log(`   ✅ Clean: ${results.clean.length}`);
  console.log(`   ❌ Dirty: ${results.dirty.length}`);
  console.log(`   ⚠️  Missing: ${results.missing.length}`);
  console.log(`   🔧 Vimeo (Manual): ${results.vimeo.length}`);
  console.log(`   📝 Total: ${mdxFiles.length}\n`);
  
  return results;
}

/**
 * Generate METADATA_AUDIT.md report
 */
async function generateReport(results) {
  const reportPath = path.join(__dirname, '../METADATA_AUDIT.md');
  
  let report = '# METADATA AUDIT REPORT\n\n';
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  // Summary
  const total = results.clean.length + results.dirty.length + results.missing.length + results.vimeo.length;
  report += '## Summary\n\n';
  report += `- **Total Files:** ${total}\n`;
  report += `- ✅ **Clean:** ${results.clean.length}\n`;
  report += `- ❌ **Dirty:** ${results.dirty.length}\n`;
  report += `- ⚠️ **Missing:** ${results.missing.length}\n`;
  report += `- 🔧 **Vimeo (Manual):** ${results.vimeo.length}\n\n`;
  
  // Dirty entries (show first)
  if (results.dirty.length > 0) {
    report += '## ❌ DIRTY DATA (Priority Fix)\n\n';
    report += 'These files contain blocklisted words (Assistant, Rep, Producer, etc.).\n\n';
    report += '| File | Current Director | Action Needed |\n';
    report += '|------|-----------------|---------------|\n';
    
    for (const entry of results.dirty) {
      report += `| \`${entry.file}\` | ${entry.director} | ${entry.action} |\n`;
    }
    report += '\n';
  }
  
  // Missing entries
  if (results.missing.length > 0) {
    report += '## ⚠️ MISSING DIRECTOR\n\n';
    report += '| File | Action Needed |\n';
    report += '|------|---------------|\n';
    
    for (const entry of results.missing) {
      report += `| \`${entry.file}\` | ${entry.action} |\n`;
    }
    report += '\n';
  }
  
  // Vimeo entries (manual intervention)
  if (results.vimeo.length > 0) {
    report += '## 🔧 VIMEO FILES (Manual Intervention)\n\n';
    report += 'These files are hosted on Vimeo and require manual director lookup.\n\n';
    report += '| File | Video URL | Action Needed |\n';
    report += '|------|-----------|---------------|\n';
    
    for (const entry of results.vimeo) {
      report += `| \`${entry.file}\` | ${entry.videoUrl} | ${entry.action} |\n`;
    }
    report += '\n';
  }
  
  // Clean entries (collapsed)
  if (results.clean.length > 0) {
    report += '## ✅ CLEAN DATA\n\n';
    report += `<details>\n<summary>Show ${results.clean.length} clean entries</summary>\n\n`;
    report += '| File | Director |\n';
    report += '|------|----------|\n';
    
    for (const entry of results.clean) {
      report += `| \`${entry.file}\` | ${entry.director} |\n`;
    }
    report += '\n</details>\n\n';
  }
  
  // Recommendations
  report += '## 🔧 Recommended Actions\n\n';
  report += '1. **For Dirty Data:** Re-run ingestion script with new validator:\n';
  report += '   ```bash\n';
  report += '   node scripts/ingest.js --force\n';
  report += '   ```\n\n';
  report += '2. **For Missing Data:** Check YouTube description format or manual fix\n\n';
  report += '3. **For Vimeo Files:** Manually visit URLs and extract director info\n\n';
  
  await fs.writeFile(reportPath, report, 'utf-8');
  console.log(`\n✅ Report generated: METADATA_AUDIT.md`);
}

// Run audit
auditMetadata().catch(console.error);
