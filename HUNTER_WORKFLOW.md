# 🏹 Hunter Workflow: CSV Batch Ingest

**Version**: 2.0 (Multi-Year Support)

## Quick Start

### Process All Years (Default)
```bash
npm run hunter
# Auto-scans: src/data/*.csv (all year files)
# Time: ~3s per video
```

### Process Specific Year
```bash
npm run hunter 2015
# Processes: src/data/2015.csv only
```

### Process Custom File
```bash
npm run hunter -- --file path/to/custom.csv
# Processes: specified file
```

## What Hunter v2.0 Does

### 1. Automatic Search & Download
- Reads CSV file(s) (Artist, Title, Director, etc.)
- Searches YouTube for best match
- Downloads video metadata + thumbnail
- Generates clean `.mdx` files

### 2. Smart Data Injection
- **Visual_Hook** → Converted to `tags` (for Smart Shuffle algorithm)
- **Credits** → Auto-extracted from YouTube description
- **curator_note** → Left EMPTY for manual curation

### 3. Multi-Year Support 🆕
- ✓ Auto-discovers all year CSV files (2015.csv, 2016.csv, etc.)
- ✓ Ignores non-year files (test-cleaning.csv)
- ✓ Processes files chronologically
- ✓ Grand summary for batch operations

### 4. Safety Features
- ✓ Skips existing videos (idempotent)
- ✓ Rate limiting (3s delay between requests)
- ✓ Error recovery (continues on failure)
- ✓ 5s pause between CSV files

---

## Output Example

**CSV Input:**
```csv
Artist,Title,Director,Year,Authority_Signal,Visual_Hook
Charli XCX,360,Aidan Zamiri,2024,UKMVA Video of Year,Era-Defining Internet Panopticon
```

**Generated File:** `src/content/videos/2024-charli-xcx-360.mdx`
```yaml
---
title: "360"
artist: "Charli xcx"
video_url: "https://www.youtube.com/watch?v=WJW-VvmRKsE"
publishDate: 2024-01-01
cover: "~/assets/covers/2024/charli-xcx-360.jpg"
curator_note: ""
director: "Aidan Zamiri"
production_company: "Object & Animal"
dop: "Ben Carey"
editor: "Neal Farmer"
colorist: "Myles Bevan"
vfx: "Corduroy Studio"
tags: ["vfx-heavy", "era-defining-internet-panopticon"]
---
```

---

## Post-Ingest Checklist

After running Hunter, you MUST manually edit each file:

### 1. Write Curator Note ✍️
```yaml
curator_note: "Aidan Zamiri orchestrates a digital hall of mirrors..."
```

### 2. Verify Metadata ✓
- [ ] Check if artist name is correct (V2.0 auto-cleans VEVO channels)
- [ ] Verify credits (auto-extraction isn't 100% accurate)
- [ ] Adjust `publishDate` to exact date (defaults to Jan 1st)

### 3. Add Director Link (Optional) 🔗
```yaml
director_link: "https://www.aidanzamiri.com"
```

### 4. Review Tags 🏷️
- [ ] Visual_Hook tag is appropriate
- [ ] Auto-detected tags make sense (vfx-heavy, animation, etc.)
- [ ] Add/remove tags as needed

---

## Advanced Usage

### Process Specific Years
```bash
# Single year
npm run hunter 2015

# Or use multiple terminal windows for parallel processing
# Terminal 1:
npm run hunter 2015

# Terminal 2:
npm run hunter 2016
```

### Process All Years (Auto-Scan)
```bash
# Automatically finds and processes all YYYY.csv files
npm run hunter

# Example output:
# 📄 Mode: Auto-scan (found 3 files)
#    - 2015.csv
#    - 2016.csv
#    - 2024.csv
```

### Custom CSV File
```bash
npm run hunter -- --file src/data/custom-list.csv
```

### CSV Format Requirements
```csv
Artist,Title,Director,Year,Authority_Signal,Visual_Hook
# Required columns: Artist, Title, Director, Year
# Optional: Authority_Signal (not used in output, for internal filtering)
# Optional: Visual_Hook (converted to tag)
```

### File Naming Convention
Hunter v2.0 auto-discovers CSV files following this pattern:
- ✅ `2015.csv` - Valid (4-digit year)
- ✅ `2024.csv` - Valid (4-digit year)
- ❌ `test-cleaning.csv` - Ignored (not a year)
- ❌ `backup.csv` - Ignored (not a year)

---

## Performance Notes

| Videos | Estimated Time | Notes |
|--------|----------------|-------|
| 1-5    | 15-30 seconds  | Quick testing |
| 10     | ~30 seconds    | Small batch |
| 24     | ~72 seconds    | Single year (e.g., 2024.csv) |
| 50+    | 2-3 minutes    | Multiple years |
| 100+   | 5+ minutes     | All years combined |

**Note**: When processing multiple CSV files, there's a 5-second pause between files.

---

## Troubleshooting

### "Search failed" for a video
- **Cause**: YouTube search couldn't find a match
- **Solution**: 
  1. Check if video title/artist is correct in CSV
  2. Try different search terms
  3. Manually ingest with `npm run ingest <url>`

### "Already exists" message
- **Cause**: Video was already ingested
- **Solution**: This is expected behavior (idempotent)
- Delete existing file if you want to re-ingest

### Credits are incomplete
- **Cause**: YouTube description format varies
- **Solution**: Manually add missing credits after ingest

### Wrong artist name (still shows VEVO)
- **Cause**: V2.0 cleaner missed edge case
- **Solution**: Manually correct in generated `.mdx` file
- Report pattern to improve V2.0 logic

---

## Data Flow Diagram

```
CSV File
   ↓
Read Row → Construct Search Query
   ↓
YouTube Search → Find Best Match
   ↓
Extract Video ID → Check if Exists
   ↓
Fetch Metadata → V2.0 Cleaning
   ↓
Download Thumbnail → Extract Credits
   ↓
Inject Visual_Hook as Tag
   ↓
Generate .mdx File ✅
```

---

## Important Notes

### Authority_Signal is NOT Public
- The `Authority_Signal` column (awards info) is **only for internal filtering**
- It does **NOT** appear in `curator_note`
- Use it to prioritize curation, but write custom notes

### Visual_Hook Powers Smart Shuffle
- Each `Visual_Hook` becomes a tag (e.g., "era-defining-internet-panopticon")
- Tags enable the 70/30 Smart Shuffle algorithm
- Well-chosen Visual_Hooks = better video recommendations

### curator_note is Sacred
- Hunter leaves this field **empty** intentionally
- This is YOUR creative space as curator
- Write insightful, contextual commentary for each video

---

**Ready to process 24 curated videos?**

```bash
npm run hunter
```

Then settle in for ~2 minutes of automated magic! ✨
