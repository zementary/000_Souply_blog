#!/usr/bin/env node

import fetch from 'node-fetch';

async function testThumbnailDownload(videoId) {
  const urls = [
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  
  console.log(`Testing thumbnail download for video: ${videoId}\n`);
  
  for (const url of urls) {
    try {
      console.log(`Trying: ${url}`);
      const response = await fetch(url, { headers });
      
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Content-Type: ${response.headers.get('content-type')}`);
      console.log(`  Content-Length: ${response.headers.get('content-length')} bytes`);
      
      if (response.ok) {
        console.log(`  ✅ SUCCESS - Image is accessible\n`);
        return true;
      } else {
        console.log(`  ❌ FAILED - Will try next URL\n`);
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}\n`);
    }
  }
  
  console.log('❌ All attempts failed');
  return false;
}

// Test with Charli XCX - 360
const testVideoId = 'WJW-VvmRKsE';
testThumbnailDownload(testVideoId);
