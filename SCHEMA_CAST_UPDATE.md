# 🎬 Schema Update: Full Cast Support

## Overview

Schema has been expanded to support a complete cast list, including the new `art_director` field.

---

## Updated Schema

### Complete Credits Fields

```typescript
// src/content/config.ts
const videosCollection = defineCollection({
  type: 'content',
  schema: z.object({
    // ... other fields
    
    // Credits - Full Cast Support (all optional)
    director: z.string().optional(),
    production_company: z.string().optional(),
    dop: z.string().optional(),
    editor: z.string().optional(),
    colorist: z.string().optional(),
    art_director: z.string().optional(),        // ✨ NEW
    vfx: z.string().optional(),
    sound_design: z.string().optional(),
    label: z.string().optional(),
    
    // ... other fields
  }),
});
```

---

## Credits Order

The credits now display in this professional order:

1. **Director** - Primary creative lead
2. **Production Company** - Prod Co
3. **DoP** - Director of Photography
4. **Editor** - Edit
5. **Colorist** - Color
6. **Art Director** - Art Director (NEW)
7. **VFX** - Visual Effects
8. **Sound Design** - Sound
9. **Label** - Record Label

---

## Files Updated

| File | Changes |
|------|---------|
| `src/content/config.ts` | Added `art_director` field |
| `src/pages/videos/[...slug].astro` | Added to credits display |
| `scripts/ingest.js` | Added to auto-extraction patterns |

---

## Auto-Extraction Support

The Ingest script now automatically detects Art Director from video descriptions:

### Pattern Matching
```javascript
art_director: /(?:Art Director)\.?\s*:?\s*(.+?)(?:\n|$)/i
```

### Example
```
Description:
Director: Aube Perrie
Art Director: John Smith
DoP: Jane Doe

Result:
director: "Aube Perrie"
art_director: "John Smith"
dop: "Jane Doe"
```

---

## Usage Examples

### Manual Entry
```yaml
---
title: "360"
artist: "Charli xcx"
director: "Aidan Zamiri"
production_company: "Object & Animal"
dop: "Ben Carey"
editor: "Neal Farmer"
colorist: "Myles Bevan"
art_director: "Sarah Johnson"  # ✨ NEW
vfx: "Corduroy Studio"
label: "Atlantic Records"
---
```

### Auto-Ingest
```bash
npm run ingest https://youtu.be/...
# If description contains "Art Director: X", it will be extracted
```

---

## Display Format

### Video Detail Page
```
┌─────────────────────────────────────┐
│ Credits                             │
├─────────────────────────────────────┤
│ Director         Aidan Zamiri       │
│ Prod Co          Object & Animal    │
│ DoP              Ben Carey          │
│ Edit             Neal Farmer        │
│ Color            Myles Bevan        │
│ Art Director     Sarah Johnson      │ ✨ NEW
│ VFX              Corduroy Studio    │
│ Label            Atlantic Records   │
└─────────────────────────────────────┘
```

---

## K-Pop Context

The `label` field is especially useful for K-Pop and major label releases:

### Example: RM - LOST!
```yaml
---
title: "LOST!"
artist: "RM"
director: "Aube Perrie"
label: "HYBE / Big Hit Music"  # K-Pop label context
---
```

---

## Backward Compatibility

### ✅ Fully Compatible

- All existing videos work without changes
- New field is **optional**
- No migration required
- Old videos display normally (without Art Director line)

---

## Complete Credits List

### All Available Fields

| Field | Display Label | Example |
|-------|--------------|---------|
| `director` | Director | Paul Thomas Anderson |
| `production_company` | Prod Co | Prettybird |
| `dop` | DoP | Pak Lok Liu |
| `editor` | Edit | Elise Butt |
| `colorist` | Color | Sofía Chalkho |
| `art_director` | Art Director | Sarah Johnson |
| `vfx` | VFX | Mathematic |
| `sound_design` | Sound | Nicolas Becker |
| `label` | Label | Young Turks |

---

## Validation

### Build Status
```bash
$ npm run build
✓ 41 page(s) built in 2.54s
✓ No linter errors
✓ Schema validation passed
```

### Testing Checklist
- [x] Schema compiles successfully
- [x] Credits display in correct order
- [x] Auto-extraction pattern works
- [x] Backward compatible with existing videos
- [x] Build succeeds

---

## Migration Guide

### For Existing Videos

If you want to add Art Director to existing videos:

1. **Manual Edit:**
   ```bash
   # Edit the .mdx file
   vim src/content/videos/2024-video-name.mdx
   
   # Add the field
   art_director: "Artist Name"
   ```

2. **Or Re-ingest (if description has it):**
   ```bash
   npm run ingest https://youtu.be/... --force
   ```

### For New Videos

Art Director will be automatically extracted if present in the YouTube description.

---

## Professional Credits Hierarchy

The order follows industry standards:

```
1. Creative Lead
   └─ Director (links to internal archive)

2. Production
   └─ Production Company

3. Camera Department
   └─ DoP (Director of Photography)

4. Post-Production
   ├─ Editor
   ├─ Colorist
   └─ Art Director (design/aesthetic)

5. Technical
   ├─ VFX (Visual Effects)
   └─ Sound Design

6. Business
   └─ Label (Record Label)
```

---

## Future Enhancements

### Potential Additions (Not Implemented)
- [ ] `choreographer` - For dance-heavy videos
- [ ] `producer` - Executive producer
- [ ] `costume_designer` - Fashion-forward videos
- [ ] `makeup_artist` - Beauty/fashion context
- [ ] `stylist` - Fashion direction

These can be added following the same pattern if needed.

---

**Status**: ✅ Implemented  
**Version**: Schema v1.1  
**Date**: 2026-01-17
