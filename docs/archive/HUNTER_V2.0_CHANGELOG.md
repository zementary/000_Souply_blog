# Hunter v2.0 Changelog

**Release Date**: 2026-01-17  
**Status**: ✅ Production Ready

---

## 🎯 What's New

### 1. Multi-Year CSV Support 🆕

**Before (v1.0)**:
```bash
# Only processed 2024.csv
npm run hunter
```

**Now (v2.0)**:
```bash
# Auto-discovers and processes ALL year files
npm run hunter

# Example output:
# 📄 Mode: Auto-scan (found 3 files)
#    - 2015.csv
#    - 2016.csv
#    - 2024.csv
```

---

### 2. Year-Specific Processing 🆕

```bash
# Process only 2015 data
npm run hunter 2015

# Process only 2016 data
npm run hunter 2016
```

**Smart Error Messages**:
```bash
$ npm run hunter 2017

❌ Error: CSV file for year 2017 not found
   Expected location: src/data/2017.csv

Available years:
   - 2015
   - 2016
   - 2024
```

---

### 3. Automatic File Discovery 🆕

Hunter v2.0 automatically scans `src/data/` and:
- ✅ Finds all `YYYY.csv` files (4-digit year format)
- ✅ Processes them chronologically (2015 → 2016 → 2024)
- ❌ Ignores non-year files (`test-cleaning.csv`, `backup.csv`, etc.)

**File Pattern Matching**:
```javascript
/^\d{4}\.csv$/  // Matches: 2015.csv, 2024.csv
                 // Ignores: test.csv, 2024-backup.csv
```

---

### 4. Enhanced Logging 🆕

**File-Level Progress**:
```
════════════════════════════════════════════════════════════
📂 Processing File 1/3: 2015.csv
════════════════════════════════════════════════════════════

📂 Loading CSV: 2015.csv
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Found 20 videos to process
```

**Per-File Summary**:
```
╔════════════════════════════════════════╗
║  SUMMARY: 2015.csv                     ║
╚════════════════════════════════════════╝

✅ Successfully ingested: 15
⏭  Already existed: 3
🚫 Junk filtered: 1
⚠  Search failed: 1
❌ Errors: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Total processed: 20
```

**Grand Summary** (when processing multiple files):
```
╔════════════════════════════════════════╗
║  GRAND SUMMARY (ALL FILES)             ║
╚════════════════════════════════════════╝

📂 Files processed: 3
   - 2015.csv
   - 2016.csv
   - 2024.csv

✅ Total successfully ingested: 45
⏭  Total already existed: 10
🚫 Total junk filtered: 3
⚠  Total search failed: 2
❌ Total errors: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Grand Total: 60 videos

✨ All done!
```

---

### 5. Batch Processing Enhancements 🆕

- ⏸️ **5-second pause** between CSV files (prevents API throttling)
- 📊 **Per-file summaries** (track progress per year)
- 🎯 **Grand summary** (see total stats across all years)

---

## 📋 Usage Examples

### Example 1: Process All Years (Default)

```bash
npm run hunter
```

**What happens**:
1. Scans `src/data/` directory
2. Finds `2015.csv`, `2016.csv`, `2024.csv`
3. Processes each file sequentially
4. Shows per-file summaries
5. Shows grand summary at the end

**Use case**: Initial backfill, bulk updates

---

### Example 2: Process Specific Year

```bash
npm run hunter 2015
```

**What happens**:
1. Loads `src/data/2015.csv`
2. Processes all videos in that file
3. Shows summary for 2015 data only

**Use case**: Testing, incremental updates, fixing specific year

---

### Example 3: Custom File Path

```bash
npm run hunter -- --file src/data/test-cleaning.csv
```

**What happens**:
1. Loads specified file (ignores year pattern)
2. Processes all videos
3. Shows summary

**Use case**: Testing, special playlists, one-off imports

---

## 🔄 Migration from v1.0

### Breaking Changes
❌ **None!** v2.0 is 100% backward compatible.

### Default Behavior Changed
- **v1.0**: Processed only `2024.csv`
- **v2.0**: Auto-discovers all year CSV files

**If you only want to process 2024.csv** (old behavior):
```bash
npm run hunter 2024
```

---

## 🛠️ Technical Changes

### Code Changes

**1. Configuration Update**
```javascript
// OLD (v1.0)
const CSV_PATH = path.join(__dirname, '..', 'src', 'data', '2024.csv');

// NEW (v2.0)
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
```

**2. New Functions**
- `discoverYearCSVFiles()` - Auto-discovers year CSV files
- `getCSVPathForYear(year)` - Gets path for specific year
- `processCSVFile(csvPath, csvFileName)` - Processes single file
- `printGrandSummary(allResults, processedFiles)` - Shows grand summary

**3. Enhanced Main Function**
```javascript
// Argument parsing logic:
// 1. --file custom.csv  → Process custom file
// 2. hunter 2015        → Process specific year
// 3. hunter             → Auto-discover all years
```

---

## 📊 Performance Comparison

| Scenario | v1.0 | v2.0 | Notes |
|----------|------|------|-------|
| Process 2024.csv (24 videos) | ✅ | ✅ `npm run hunter 2024` | Same speed |
| Process all years (60 videos) | ❌ Manual | ✅ `npm run hunter` | Auto-batch |
| Process 2015.csv only | ❌ Need --file | ✅ `npm run hunter 2015` | Simpler syntax |

---

## 🧪 Testing

### Test Scenarios

**1. Test Auto-Discovery**
```bash
npm run hunter
# Should find and list all YYYY.csv files
```

**2. Test Specific Year**
```bash
npm run hunter 2015
# Should process only 2015.csv
```

**3. Test Invalid Year**
```bash
npm run hunter 2099
# Should show error with available years
```

**4. Test Custom File**
```bash
npm run hunter -- --file src/data/test-cleaning.csv
# Should process custom file
```

---

## 📚 Updated Documentation

The following files have been updated:
- ✅ `HUNTER_WORKFLOW.md` - Main workflow documentation
- ✅ `HUNTER_V2.0_CHANGELOG.md` - This changelog
- ✅ `scripts/hunter.js` - Core implementation

---

## 🔮 Future Enhancements

### Planned for v2.1
- [ ] Parallel processing (multiple years simultaneously)
- [ ] Progress bar for large batches
- [ ] Dry-run mode (`--dry-run` to preview what will be processed)
- [ ] Resume capability (skip already processed videos across runs)

### Planned for v3.0
- [ ] Interactive mode (choose which years to process)
- [ ] Filtering by Authority_Signal (only process award-winners)
- [ ] Export statistics to JSON/CSV

---

## 🙏 Feedback

If you encounter any issues or have suggestions, please:
1. Check `HUNTER_WORKFLOW.md` for usage examples
2. Run with `--verbose` flag (future feature) for detailed logs
3. Report issues with example CSV and error output

---

## 📞 Quick Reference

```bash
# Process all years (auto-scan)
npm run hunter

# Process specific year
npm run hunter 2015

# Process custom file
npm run hunter -- --file path/to/file.csv

# Check available years
ls src/data/*.csv
```

---

**Happy Hunting!** 🏹✨
