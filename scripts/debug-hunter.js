#!/usr/bin/env node

/**
 * DEBUG HUNTER - FORENSIC PROBE FOR MISSING VIDEOS
 * Target: M.I.A. - Borders
 * Mission: Diagnose why this video shows as MISSING
 */

import yts from 'yt-search';
import { execSync } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================================================
// CONFIGURATION - THE TEST SUBJECT
// ============================================================================

const TEST_ARTIST = "M.I.A.";
const TEST_TITLE = "Borders";

// Copy the exact filters from HybridSearcher
const STRICT_NEGATIVE_KEYWORDS = [
  'audio only', 'official audio', 'audio',
  'lyrics', 'lyric video', 'visualizer', 'official visualizer',
  'behind the scenes', 'bts', 'making of', 'making-of', 'the making of',
  'teaser', 'trailer', 'preview',
  '1 hour', 'one hour', 'loop', 'extended version', 'extended',
  'fan made', 'fan video', 'fan edit', 'reupload',
  'compilation', 'playlist', 'full album', 'best of',
];

const DURATION_MIN = 60;  // 1 minute
const DURATION_MAX = 900; // 15 minutes

// ============================================================================
// STEP 1: SIMULATE YOUTUBE SEARCH
// ============================================================================

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  DEBUG HUNTER v1.0 - FORENSIC PROBE                        ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`🎯 TEST SUBJECT: ${TEST_ARTIST} - ${TEST_TITLE}`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

async function debugSearch() {
  const query = `${TEST_ARTIST} ${TEST_TITLE} official video`;
  
  console.log(`📡 STEP 1: YouTube Search Query`);
  console.log(`   Query: "${query}"\n`);
  
  try {
    // ============================================================================
    // RAW SEARCH (No filtering)
    // ============================================================================
    console.log(`🔍 Performing raw YouTube search...\n`);
    const results = await yts(query);
    
    if (!results || !results.videos || results.videos.length === 0) {
      console.log(`❌ DIAGNOSIS: No search results found at all`);
      console.log(`   Possible causes:`);
      console.log(`   - YouTube search API is down`);
      console.log(`   - Query is too specific`);
      console.log(`   - Artist/Title name mismatch\n`);
      return;
    }
    
    // Filter for video type only
    let videos = results.videos.filter(v => v.type === 'video');
    
    console.log(`✅ Found ${videos.length} raw video results\n`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // ============================================================================
    // SHOW TOP 3 RAW RESULTS (Before filtering)
    // ============================================================================
    console.log(`📋 TOP 3 RAW SEARCH RESULTS (Before Gatekeeper Filters):\n`);
    
    const top3 = videos.slice(0, 3);
    top3.forEach((video, i) => {
      const duration = video.duration?.seconds || video.seconds || 0;
      const durationStr = duration > 0 
        ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` 
        : 'Unknown';
      
      console.log(`[${i + 1}] Title: "${video.title}"`);
      console.log(`    URL: ${video.url}`);
      console.log(`    Channel: ${video.author?.name || 'Unknown'}`);
      console.log(`    Duration: ${durationStr} (${duration}s)`);
      console.log(`    Views: ${video.views?.toLocaleString() || 'Unknown'}`);
      console.log(``);
    });
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // ============================================================================
    // STEP 2: APPLY GATEKEEPER FILTERS (with detailed logging)
    // ============================================================================
    console.log(`🚦 STEP 2: GATEKEEPER FILTER ANALYSIS\n`);
    
    const filterResults = top3.map((video, i) => {
      console.log(`[${i + 1}] Analyzing: "${video.title}"`);
      
      const titleLower = video.title.toLowerCase();
      const duration = video.duration?.seconds || video.seconds || 0;
      
      let rejected = false;
      let rejectionReason = null;
      
      // ============================================================================
      // FILTER 1: Negative Keywords
      // ============================================================================
      const foundNegativeKeyword = STRICT_NEGATIVE_KEYWORDS.find(kw => titleLower.includes(kw));
      
      if (foundNegativeKeyword) {
        rejected = true;
        rejectionReason = `Contains blocked keyword: "${foundNegativeKeyword}"`;
        console.log(`    ❌ REJECTED: ${rejectionReason}`);
      }
      
      // ============================================================================
      // FILTER 2: Duration Guard
      // ============================================================================
      if (!rejected && duration > 0) {
        if (duration < DURATION_MIN) {
          rejected = true;
          rejectionReason = `Too short: ${duration}s < ${DURATION_MIN}s (min)`;
          console.log(`    ❌ REJECTED: ${rejectionReason}`);
        } else if (duration > DURATION_MAX) {
          // Check for exceptions
          const isException = titleLower.includes("director's cut") || 
                             titleLower.includes('directors cut') ||
                             titleLower.includes('short film');
          
          if (!isException) {
            rejected = true;
            rejectionReason = `Too long: ${Math.round(duration/60)}min > ${DURATION_MAX/60}min (max)`;
            console.log(`    ❌ REJECTED: ${rejectionReason}`);
          } else {
            console.log(`    ✅ EXCEPTION: Long video allowed (contains "director's cut" or "short film")`);
          }
        }
      }
      
      // ============================================================================
      // VERDICT
      // ============================================================================
      if (!rejected) {
        console.log(`    ✅ ACCEPTED: Passed all filters!`);
        console.log(`    🎯 This would be selected by HybridSearcher`);
      }
      
      console.log(``);
      
      return {
        video,
        accepted: !rejected,
        rejectionReason
      };
    });
    
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // ============================================================================
    // STEP 3: FINAL VERDICT
    // ============================================================================
    console.log(`📊 FILTER SUMMARY:\n`);
    
    const accepted = filterResults.filter(r => r.accepted);
    const rejected = filterResults.filter(r => !r.accepted);
    
    console.log(`✅ Accepted: ${accepted.length}`);
    console.log(`❌ Rejected: ${rejected.length}\n`);
    
    if (accepted.length > 0) {
      const winner = accepted[0].video;
      console.log(`🏆 WINNER (Would be ingested):\n`);
      console.log(`   Title: "${winner.title}"`);
      console.log(`   URL: ${winner.url}`);
      console.log(`   Channel: ${winner.author?.name || 'Unknown'}\n`);
      
      // ============================================================================
      // STEP 4: TEST METADATA FETCH (yt-dlp with cookies)
      // ============================================================================
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      console.log(`🍪 STEP 3: METADATA FETCH TEST (yt-dlp)\n`);
      
      await testMetadataFetch(winner.url);
      
    } else {
      console.log(`❌ DIAGNOSIS: ALL RESULTS WERE FILTERED OUT\n`);
      console.log(`   Rejection reasons:`);
      rejected.forEach((r, i) => {
        console.log(`   [${i + 1}] ${r.rejectionReason}`);
      });
      console.log(``);
      console.log(`💡 SOLUTION:`);
      console.log(`   1. Check if filters are too strict for this video`);
      console.log(`   2. Try adding exceptions in HybridSearcher`);
      console.log(`   3. Or provide manual Target_URL in CSV\n`);
    }
    
  } catch (error) {
    console.error(`❌ FATAL ERROR: ${error.message}`);
    console.error(`   Stack trace:\n${error.stack}\n`);
  }
}

// ============================================================================
// STEP 4: TEST YT-DLP METADATA FETCH
// ============================================================================

async function testMetadataFetch(videoUrl) {
  console.log(`📥 Attempting to fetch metadata for:`);
  console.log(`   ${videoUrl}\n`);
  
  // ============================================================================
  // TEST 1: With Brave Cookies
  // ============================================================================
  console.log(`[1] Trying with Brave cookies...\n`);
  
  try {
    const cmdWithCookies = `yt-dlp --cookies-from-browser brave --dump-json "${videoUrl}"`;
    console.log(`   Command: ${cmdWithCookies}\n`);
    
    const { stdout, stderr } = await execAsync(cmdWithCookies);
    
    if (stdout) {
      const data = JSON.parse(stdout);
      console.log(`   ✅ SUCCESS with Brave cookies!\n`);
      console.log(`   Metadata Preview:`);
      console.log(`   - Title: ${data.title}`);
      console.log(`   - Uploader: ${data.uploader}`);
      console.log(`   - Upload Date: ${data.upload_date}`);
      console.log(`   - Duration: ${data.duration}s`);
      console.log(`   - Thumbnail: ${data.thumbnail ? 'Available' : 'Missing'}\n`);
      return true;
    }
  } catch (cookieError) {
    console.log(`   ❌ FAILED with Brave cookies\n`);
    console.log(`   Error message:`);
    
    // Extract meaningful error from stderr
    const errorMsg = cookieError.stderr || cookieError.message || 'Unknown error';
    
    // Check for common issues
    if (errorMsg.includes('Sign in to confirm')) {
      console.log(`   🚨 ISSUE: YouTube requires login ("Sign in to confirm you're not a bot")`);
      console.log(`   💡 SOLUTION: Ensure you're logged into YouTube in Brave browser\n`);
    } else if (errorMsg.includes('429')) {
      console.log(`   🚨 ISSUE: Rate limited (HTTP 429 - Too Many Requests)`);
      console.log(`   💡 SOLUTION: Wait a few minutes and try again\n`);
    } else if (errorMsg.includes('403')) {
      console.log(`   🚨 ISSUE: Forbidden (HTTP 403)`);
      console.log(`   💡 SOLUTION: Video may be geo-blocked or age-restricted\n`);
    } else {
      console.log(`   ${errorMsg.substring(0, 500)}\n`);
    }
  }
  
  // ============================================================================
  // TEST 2: Without Cookies (Fallback)
  // ============================================================================
  console.log(`[2] Trying WITHOUT cookies (fallback mode)...\n`);
  
  try {
    const cmdWithoutCookies = `yt-dlp --dump-json "${videoUrl}"`;
    console.log(`   Command: ${cmdWithoutCookies}\n`);
    
    const { stdout } = await execAsync(cmdWithoutCookies);
    
    if (stdout) {
      const data = JSON.parse(stdout);
      console.log(`   ✅ SUCCESS without cookies!\n`);
      console.log(`   Metadata Preview:`);
      console.log(`   - Title: ${data.title}`);
      console.log(`   - Uploader: ${data.uploader}`);
      console.log(`   - Upload Date: ${data.upload_date}\n`);
      return true;
    }
  } catch (noCookieError) {
    console.log(`   ❌ FAILED without cookies as well\n`);
    console.log(`   Error message:`);
    const errorMsg = noCookieError.stderr || noCookieError.message || 'Unknown error';
    console.log(`   ${errorMsg.substring(0, 500)}\n`);
  }
  
  // ============================================================================
  // FINAL DIAGNOSIS
  // ============================================================================
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log(`💀 DIAGNOSIS: yt-dlp CANNOT FETCH METADATA\n`);
  console.log(`   This explains why the video was marked as MISSING.`);
  console.log(`   Even if search found the video, yt-dlp failed to download it.\n`);
  console.log(`💡 POSSIBLE SOLUTIONS:\n`);
  console.log(`   1. Login to YouTube in Brave browser`);
  console.log(`   2. Check if video is geo-blocked or age-restricted`);
  console.log(`   3. Wait for rate limiting to clear (if HTTP 429)`);
  console.log(`   4. Use a VPN if geo-blocked`);
  console.log(`   5. Add manual Target_URL in CSV to bypass search\n`);
  
  return false;
}

// ============================================================================
// RUN THE PROBE
// ============================================================================

debugSearch().catch(console.error);
