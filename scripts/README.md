# Auto-Ingest System Documentation

## Overview

The Auto-Ingest script automatically extracts metadata from YouTube videos and generates properly formatted `.mdx` files for the Souply archive.

## Features

### ✅ Automatic Data Extraction
- **Video Title** - Extracted from YouTube metadata
- **Artist/Channel** - YouTube channel name
- **Publish Date** - Year of upload
- **Thumbnail** - Downloaded to `src/assets/covers/[year]/[slug].jpg`
- **Description** - Full video description

### 🧠 Intelligent Processing
- **Credits Detection** - Scans description for Director, DoP, Editor, etc.
- **Mood Tags Mapping** - Auto-assigns tags based on keywords:
  - `['bw', 'black and white']` → `b&w`
  - `['animation', '3d', 'cgi']` → `animation`
  - `['dance', 'choreography']` → `performance`
  - `['long take', 'one shot']` → `one-shot`
  - `['vfx', 'visual effects']` → `vfx-heavy`
  - And more...

### 🛡️ Safety Features
- **Idempotency** - Skips videos already in database
- **Rate Limiting** - 2-second delay between batch requests
- **Error Handling** - Continues processing even if individual videos fail

## Usage

### Single Video Mode

```bash
npm run ingest https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Or with short URL:

```bash
npm run ingest https://youtu.be/dQw4w9WgXcQ
```

### Batch Mode

Create a text file with one URL per line:

**Example: `my-videos.txt`**
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/YkLjqFpBh84
https://www.youtube.com/watch?v=TTAU7lLDZYU
# This is a comment - it will be ignored
https://www.youtube.com/watch?v=tvTRZJ-4EyI
```

Then run:

```bash
npm run ingest --file my-videos.txt
```

## Output Example

For a video like "Cellophane" by FKA twigs, the script generates:

**Filename:** `2019-fka-twigs-cellophane.mdx`

```yaml
---
title: "Cellophane"
artist: "FKA twigs"
video_url: "https://www.youtube.com/watch?v=YkLjqFpBh84"
publishDate: 2019-01-01
cover: "~/assets/covers/2019/fka-twigs-cellophane.jpg"
curator_note: ""
director: "Andrew Thomas Huang"
production_company: "Prettybird"
tags: ["performance", "surreal", "vfx-heavy"]
---
```

## Manual Curation Workflow

After running the script:

1. **Review Generated Files** - Check `src/content/videos/`
2. **Fill Curator Note** - Add your editorial commentary
3. **Verify Credits** - Auto-extraction isn't perfect - double-check
4. **Adjust Publish Date** - Script defaults to Jan 1st - update to exact date
5. **Add Director Link** - Manually add `director_link` if available
6. **Refine Tags** - Adjust or add additional mood tags

## Advanced: Custom Tag Mappings

Edit `scripts/ingest.js` to customize tag detection:

```javascript
const TAG_MAPPINGS = {
  'your-tag': ['keyword1', 'keyword2', 'keyword3'],
  // ...
};
```

## Troubleshooting

### "Could not find ytInitialPlayerResponse"
- YouTube changed their page structure
- Try updating the regex pattern in `fetchYouTubeData()`

### "Invalid YouTube URL"
- Ensure URL format is correct
- Supported formats: `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`

### Thumbnail Download Fails
- Check internet connection
- Some videos may not have `maxresdefault.jpg` - script will fallback to `hqdefault.jpg`

### Credits Not Detected
- Description must use keywords like "Director:", "Directed by:", "Dir:"
- Capitalization doesn't matter
- Credits must be on their own line

## Rate Limiting

The script waits 2 seconds between batch requests to avoid YouTube rate limiting. For large batches (100+ videos), consider:

1. Split into multiple files
2. Run during off-peak hours
3. Monitor for HTTP 429 errors

## File Naming Convention

Generated files follow: `[year]-[artist-slug]-[title-slug].mdx`

Examples:
- `2019-fka-twigs-cellophane.mdx`
- `2016-radiohead-daydreaming.mdx`
- `2018-childish-gambino-this-is-america.mdx`

Slugs are lowercase, hyphenated, with special characters removed.
