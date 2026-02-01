# 🚀 Quick Start: Auto-Ingest System

## Single Video (Most Common)

```bash
npm run ingest https://www.youtube.com/watch?v=YkLjqFpBh84
```

**What happens:**
1. ✓ Extracts metadata (title, artist, year)
2. ✓ Downloads thumbnail → `src/assets/covers/[year]/[slug].jpg`
3. ✓ Scans description for credits (Director, DoP, etc.)
4. ✓ Maps keywords to mood tags
5. ✓ Generates `.mdx` file → `src/content/videos/`

## Batch Mode (For Large Imports)

### Step 1: Create your URL list

```bash
# Create a new file
touch scripts/my-videos.txt
```

### Step 2: Add URLs (one per line)

```
https://www.youtube.com/watch?v=YkLjqFpBh84
https://www.youtube.com/watch?v=TTAU7lLDZYU
https://www.youtube.com/watch?v=tvTRZJ-4EyI
```

### Step 3: Run batch ingest

```bash
npm run ingest --file scripts/my-videos.txt
```

**Performance:** ~2 seconds per video (rate limiting)

## Post-Ingest Workflow

After running the script, you MUST manually edit each file:

### 1. Add Curator Note
```yaml
curator_note: ""  # ← Fill this with your editorial insight
```

### 2. Verify Credits
Auto-extraction isn't perfect. Double-check against official sources.

### 3. Adjust Publish Date
Script defaults to `YYYY-01-01`. Update to exact date:
```yaml
publishDate: 2019-04-24  # ← Correct to actual release date
```

### 4. Add Director Links (Optional)
```yaml
director_link: "https://www.andrewthomashuang.com"
```

### 5. Refine Tags
Review auto-generated tags, add/remove as needed.

## Example Output

**Input:**
```bash
npm run ingest https://www.youtube.com/watch?v=YkLjqFpBh84
```

**Generated File:** `src/content/videos/2019-fka-twigs-cellophane.mdx`
```yaml
---
title: "Cellophane"
artist: "FKA twigs"
video_url: "https://www.youtube.com/watch?v=YkLjqFpBh84"
publishDate: 2019-01-01
cover: "~/assets/covers/2019/fka-twigs-cellophane.jpg"
curator_note: ""
tags: ["performance", "surreal"]
---
```

## Tips for 200+ Video Backlog

### Strategy 1: Split by Year
```
scripts/2024-videos.txt
scripts/2023-videos.txt
scripts/2022-videos.txt
```

### Strategy 2: Split by Genre
```
scripts/hip-hop-videos.txt
scripts/experimental-videos.txt
scripts/pop-videos.txt
```

### Strategy 3: Parallel Processing
Run multiple terminal windows with different URL lists (be mindful of rate limits).

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid YouTube URL" | Check URL format (must include video ID) |
| "Video already exists" | Script skips duplicates automatically |
| Thumbnail fails | Check internet connection, fallback to manual upload |
| No credits detected | Description format doesn't match patterns - add manually |

## Advanced: Custom Tag Mapping

Edit `scripts/ingest.js` line 21-31 to add your own tag mappings:

```javascript
const TAG_MAPPINGS = {
  'cyberpunk': ['neon', 'futuristic', 'sci-fi', 'cyber'],
  // Add more...
};
```

## Full Documentation

See `scripts/README.md` for complete technical documentation.

---

**Ready to ingest?** Start with a single video to test the workflow!
