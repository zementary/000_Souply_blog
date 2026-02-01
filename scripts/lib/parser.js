/**
 * PARSER MODULE (V8.0 - "THE BRAIN")
 * Credit parsing and title cleaning utilities with Knowledge Base
 */

// ============================================================================
// KNOWLEDGE BASE - Channel-to-Artist Mapping
// ============================================================================

/**
 * Known channel-to-artist mappings
 * Use this to force correct artist names when channel names don't match
 */
const KNOWN_MAPPINGS = {
  // Fan Channels
  'jungle4eva': 'Jungle',
  'pp_rocksxx': 'PinkPantheress',
  'asaprockyuptown': 'A$AP Rocky',
  'gambinoarchive': 'Childish Gambino',
  
  // Labels/Official but should use specific artist
  'foreign family collective': null, // Keep as label, extract from title
  
  // Band names that match channel names (keep as-is)
  'the shoes': 'The Shoes',
  
  // Add more mappings as needed
};

/**
 * Known channel suffixes/prefixes to strip
 * These are common fan channel patterns
 */
const CHANNEL_NOISE_PATTERNS = [
  /4eva$/i,
  /VEVO$/i,
  /Official$/i,
  /Music$/i,
  /TV$/i,
  /HD$/i,
  /Videos?$/i,
  /Channel$/i,
  /Archive$/i,
  /Fan$/i,
  /Live$/i,
  /Uptown$/i,
];

/**
 * Title noise patterns to remove (clips, quality tags, etc.)
 */
const TITLE_NOISE_PATTERNS = [
  /\[?CLIP OFFICIEL\]?/gi,
  /\(CLIP OFFICIEL\)/gi,
  /\(Clip officiel\)/gi,
  /\[Official Video\]/gi,
  /\(Official Video\)/gi,
  /\[4K\]/gi,
  /\(4K\)/gi,
  /\[HD\]/gi,
  /\(HD\)/gi,
  /\[8K\]/gi,
  /\(8K\)/gi,
  /\[UHD\]/gi,
  /\(UHD\)/gi,
];

/**
 * Normalize channel name using Knowledge Base
 * @param {string} channelName - Raw channel name from YouTube/Vimeo
 * @returns {string|null} Normalized artist name or null if should extract from title
 */
export function normalizeChannelName(channelName) {
  if (!channelName) return null;
  const lowerChannel = channelName.toLowerCase().trim();
  
  // Check exact mapping first
  if (KNOWN_MAPPINGS.hasOwnProperty(lowerChannel)) {
    const mappedValue = KNOWN_MAPPINGS[lowerChannel];
    if (mappedValue) {
      console.log(`   🧠 [BRAIN] Mapped channel "${channelName}" → "${mappedValue}"`);
      return mappedValue;
    }
    return null; // Explicitly mapped to null (extract from title)
  }
  
  // Try to clean channel name by removing known suffixes
  let cleanedChannel = channelName;
  for (const pattern of CHANNEL_NOISE_PATTERNS) {
    const before = cleanedChannel;
    cleanedChannel = cleanedChannel.replace(pattern, '').trim();
    if (before !== cleanedChannel) {
      console.log(`   🧹 [BRAIN] Cleaned channel "${channelName}" → "${cleanedChannel}"`);
      // Check if cleaned version has a mapping
      const cleanedLower = cleanedChannel.toLowerCase();
      if (KNOWN_MAPPINGS.hasOwnProperty(cleanedLower)) {
        return KNOWN_MAPPINGS[cleanedLower];
      }
      return cleanedChannel;
    }
  }
  
  return channelName; // Return as-is if no cleaning applied
}

/**
 * VALIDATOR: Strict Director Name Validation (V8.1 - Post-Processing Filter)
 * Filters out job titles, assistants, and obviously wrong extractions
 * 
 * @param {string} name - Candidate director name extracted by regex
 * @returns {string|null} Clean director name or null if invalid
 */
function validateDirector(name) {
  if (!name) return null;
  
  // Blocklist: Job titles and roles that are NOT directors
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
  
  // Check if name contains any blocklisted words (case-insensitive)
  const lowerName = name.toLowerCase();
  for (const blocked of DIRECTOR_BLOCKLIST) {
    if (lowerName.includes(blocked.toLowerCase())) {
      console.log(`   ❌ [VALIDATOR] Rejected director: "${name}" (contains "${blocked}")`);
      return null;
    }
  }
  
  // Clean up: remove leading/trailing punctuation
  let cleaned = name
    .replace(/^[-–—:.\s]+/, '')
    .replace(/[-–—:.\s]+$/, '')
    .trim();
  
  // Length check: too long = likely a sentence, too short = invalid
  if (cleaned.length < 2 || cleaned.length > 50) {
    console.log(`   ❌ [VALIDATOR] Rejected director: "${name}" (length: ${cleaned.length})`);
    return null;
  }
  
  // Additional sanity checks
  if (/^(?:the|a|an|is|this|official|music|video|album|song)\b/i.test(cleaned)) {
    console.log(`   ❌ [VALIDATOR] Rejected director: "${name}" (starts with article/common word)`);
    return null;
  }
  
  console.log(`   ✅ [VALIDATOR] Approved director: "${cleaned}"`);
  return cleaned;
}

/**
 * Parse credits from video description (V8.1 - Strict Post-Processing Validation)
 * Only extracts 3 fields:
 * - director (primary creative)
 * - production (production company/producer/executive producer - unified field)
 * - label (music label/record company)
 * 
 * Priority Waterfall Strategy for "production":
 * 1. Production Company / Prod Co / Production House (highest priority)
 * 2. Produced by / Producer
 * 3. Executive Producer (lowest priority, only if above not found)
 * 
 * CRITICAL: Strictly filters out Coordinator, Manager, Supervisor, Assistant roles
 * NEW: Post-processing validation via validateDirector()
 * 
 * @param {string} description - Video description text
 * @returns {object} Credits object with extracted fields
 */
export function parseCredits(description) {
  const credits = {};
  
  // ============================================================================
  // 1. DIRECTOR EXTRACTION (Industry Standard with Negative Lookahead)
  // ============================================================================
  // Priority Queue:
  // A. Explicit "Directed by:" or "Dir:"
  // B. Strict "Director:" with negative lookahead to exclude:
  //    - Director of Photography
  //    - Art Director
  //    - Creative Director
  //    - Assistant Director
  //    - Casting Director
  //    - Director's Assistant/Rep
  // C. Fallback: "Video by" / "Film by" (only if no other roles found)
  // ============================================================================
  
  const directorPatterns = [
    // Priority A: Explicit "Directed by" (highest confidence)
    /(?:^|\n)\s*(?:Directed\s+by|Dir)\s*[:.\-]\s*([^\n]+?)(?:\n|$)/i,
    
    // Priority B: Strict "Director:" with Negative Lookahead
    // MUST NOT match:
    // - "Director of Photography"
    // - "Art Director"
    // - "Creative Director"
    // - "Assistant Director"
    // - "Casting Director"
    // - "Director's Assistant"
    // - "Director's Rep"
    /(?:^|\n)\s*(?<!Art\s)(?<!Creative\s)(?<!Assistant\s)(?<!Casting\s)(?<!Executive\s)(?<!Technical\s)(?<!Music\s)Director(?!'s\s+(?:Assistant|Rep))(?!\s+of\s+Photography)\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i,
    
    // Priority A2: "Written & Directed by" (artist as director)
    /(?:^|\n)\s*(?:Written\s*(?:and|&)\s*Directed\s*by)\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i,
    
    // Priority C: Fallback - "Video by" / "Film by" (only if above patterns fail)
    /(?:^|\n)\s*(?:Video|Film)\s+by\s+([^\n]+?)(?:\n|$)/i,
  ];
  
  for (const pattern of directorPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      let director = match[1].trim();
      
      // Clean up process
      director = director
        // Remove leading punctuation/dashes
        .replace(/^[-–—:.\s]+/, '')
        // Remove "by/and/with" prefixes
        .replace(/^(?:by|and|with|&)\s+/i, '')
        // Remove URLs (common issue: "Dom & Nic http://...")
        .replace(/\s*https?:\/\/\S+/g, '')
        // Remove social media handles
        .replace(/\s*@[\w.]+/g, '')
        // Remove role prefixes that shouldn't be there (e.g., "Editor: Name")
        .replace(/^(?:Editor|Producer|DOP|Cinematographer)\s*[:.\-]?\s*/i, '')
        // Remove parenthetical info like "(Insta: ...)"
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        // Stop at first newline, comma, or "and [Role]:" pattern
        .split(/\n/)[0]
        .split(/\s+and\s+(?:Producer|Editor|DOP|Cinematographer):/i)[0]
        .trim();
      
      // Remove trailing punctuation
      director = director.replace(/[,.\-–—:]+$/, '').trim();
      
      // NEW: Pass through strict validator (V8.1)
      const validatedDirector = validateDirector(director);
      
      if (validatedDirector) {
        credits.director = validatedDirector;
        break;
      }
    }
  }
  
  // ============================================================================
  // 2. PRODUCTION EXTRACTION (Unified Field - Priority Waterfall Strategy V7.0)
  // ============================================================================
  // Priority 1: Production Company / Prod Co / Production House
  // Priority 2: Produced by / Producer
  // Priority 3: Executive Producer (only if above not found)
  //
  // ⛔️ CRITICAL FILTER: Strictly IGNORE lines containing coordinator/manager roles
  // ============================================================================
  
  // Helper function: Check if line contains blacklisted role keywords
  function isBlacklistedRole(text) {
    const blacklist = [
      /\bCoordinator\b/i,
      /\bCo-ordinator\b/i,
      /\bManager\b/i,
      /\bSupervisor\b/i,
      /\bAssistant\b/i,
      /\bLine\s+Producer\b/i,
      /\bAssociate\b/i,
      /\bProduction\s+Coordinator\b/i,
      /\bProduction\s+Manager\b/i,
    ];
    return blacklist.some(pattern => pattern.test(text));
  }
  
  // Priority 1: Production Company / Prod Co / Production House (HIGHEST)
  const priority1Patterns = [
    /(?:^|\n)\s*(?:Production\s+(?:Company|Co|House)|Prod\s+Co)\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i,
  ];
  
  for (const pattern of priority1Patterns) {
    const match = description.match(pattern);
    if (match && match[1] && !isBlacklistedRole(match[0])) {
      let production = match[1].trim();
      
      // Clean up
      production = production
        .replace(/^[-–—:.\s]+/, '')
        .replace(/^(?:by|and|with|&)\s+/i, '')
        .replace(/\s*https?:\/\/\S+/g, '')
        .replace(/\s*@[\w.]+/g, '')
        .replace(/\s*\([^)]*\)\s*/g, ' ')
        .split(/\n/)[0]
        .trim();
      
      production = production.replace(/[,.\-–—:]+$/, '').trim();
      
      if (production.length >= 2 && production.length <= 80) {
        credits.production = production;
        break;
      }
    }
  }
  
  // Priority 2: Produced by / Producer (if Priority 1 not found)
  if (!credits.production) {
    const priority2Patterns = [
      // "Produced by COMPANY" or "Produced by Name"
      /(?:^|\n)\s*Produced\s+by\s+([A-Z][^\n]+?)(?:\s*\n|$|,|\s+for\s+)/i,
      // Generic "Producer:"
      /(?:^|\n)\s*\bProducer\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i,
    ];
    
    for (const pattern of priority2Patterns) {
      const match = description.match(pattern);
      if (match && match[1] && !isBlacklistedRole(match[0])) {
        let production = match[1].trim();
        
        // Clean up
        production = production
          .replace(/^[-–—:.\s]+/, '')
          .replace(/^(?:by|and|with|&)\s+/i, '')
          .replace(/\s*https?:\/\/\S+/g, '')
          .replace(/\s*@[\w.]+/g, '')
          .replace(/\s*\([^)]*\)\s*/g, ' ')
          .split(/\n/)[0]
          .trim();
        
        production = production.replace(/[,.\-–—:]+$/, '').trim();
        
        if (production.length >= 2 && production.length <= 80) {
          credits.production = production;
          break;
        }
      }
    }
  }
  
  // Priority 3: Executive Producer (LOWEST - only if Priority 1 & 2 not found)
  if (!credits.production) {
    const priority3Patterns = [
      /(?:^|\n)\s*Executive\s+Producers?\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i,
    ];
    
    for (const pattern of priority3Patterns) {
      const match = description.match(pattern);
      if (match && match[1] && !isBlacklistedRole(match[0])) {
        let production = match[1].trim();
        
        // Clean up
        production = production
          .replace(/^[-–—:.\s]+/, '')
          .replace(/^(?:by|and|with|&)\s+/i, '')
          .replace(/\s*https?:\/\/\S+/g, '')
          .replace(/\s*@[\w.]+/g, '')
          .replace(/\s*\([^)]*\)\s*/g, ' ')
          .split(/\n/)[0]
          .trim();
        
        production = production.replace(/[,.\-–—:]+$/, '').trim();
        
        if (production.length >= 2 && production.length <= 80) {
          credits.production = production;
          break;
        }
      }
    }
  }
  
  // ============================================================================
  // 3. LABEL EXTRACTION (Music Label/Record Company)
  // ============================================================================
  
  const labelPatterns = [
    /\b(?:Label|Record\s+Label)\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i,
    /\b(?:Released\s+(?:by|on)|Distributed\s+by)\s*[:.\-]?\s*([^\n]+?)(?:\n|$)/i,
  ];
  
  for (const pattern of labelPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      let label = match[1].trim();
      
      label = label
        .replace(/^[-–—:.\s]+/, '')
        .replace(/^(?:by|and|with|&|on)\s+/i, '')
        .replace(/\s*https?:\/\/\S+/g, '')
        .split(/\n/)[0]
        .trim();
      
      label = label.replace(/[,.\-–—:]+$/, '').trim();
      
      if (label.length >= 2 && label.length <= 80) {
        credits.label = label;
        break;
      }
    }
  }
  
  return credits;
}

/**
 * Normalize artist name with proper capitalization
 * Handles special cases for artists with specific capitalization
 * 
 * @param {string} artistName - Raw artist name
 * @returns {string} Normalized artist name
 */
export function normalizeArtistName(artistName) {
  if (!artistName) return '';
  // Special case mappings for artists with specific capitalization
  const artistMappings = {
    'charli xcx': 'Charli XCX',
    'asap rocky': 'A$AP Rocky',
    'a$ap rocky': 'A$AP Rocky',
    'asaprocky': 'A$AP Rocky',
    'asaprockyuptown': 'A$AP Rocky',  // Fan channel
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
    'fontaines d.c.': 'Fontaines D.C.',
    'bicep': 'BICEP',
    'childish gambino': 'Childish Gambino',
    'gambinoarchive': 'Childish Gambino',  // Fan channel
    'antslive': 'AntsLive',
    'fka twigs': 'FKA twigs',
    'mia': 'M.I.A.',
    'm.i.a': 'M.I.A.',
    'm.i.a.': 'M.I.A.'
  };
  
  const lowerArtist = artistName.toLowerCase().trim();
  return artistMappings[lowerArtist] || artistName;
}

/**
 * Clean song title from YouTube metadata (V8.0 - "THE BRAIN" Enhanced Sanitization)
 * Removes artist name, [MV] markers, quality tags, noise patterns, and redundancy
 * 
 * @param {string} originalTitle - Raw title from YouTube
 * @param {string} artistName - Artist name to remove from title
 * @returns {string} Cleaned title
 */
export function cleanSongTitle(originalTitle, artistName) {
  if (!originalTitle) return '';
  if (!artistName) artistName = '';
  let cleanTitle = originalTitle.trim();

  // Step 0: Remove all TITLE_NOISE_PATTERNS first (CLIP OFFICIEL, etc.)
  for (const pattern of TITLE_NOISE_PATTERNS) {
    cleanTitle = cleanTitle.replace(pattern, ' ');
  }
  cleanTitle = cleanTitle.replace(/\s{2,}/g, ' ').trim();

  // Step 1: Remove [MV] prefix early
  cleanTitle = cleanTitle.replace(/^\[MV\]\s*/i, '');
  
  // Step 2: Remove quality tags (HD, 4K, UHD, 8K, 120fps, DTS-HD, etc.)
  cleanTitle = cleanTitle
    // Remove quality tags with optional parentheses/brackets
    .replace(/\s*[\(\[]?\s*(?:HD|4K|8K|UHD|FHD|1080p|720p|480p|60fps|120fps|DTS-HD|DTS\s+HD)\s*[\)\]]?\s*/gi, '')
    // Remove standalone [4K], (8K), etc.
    .replace(/\s*[\[\(]\s*\d+K\s*[\]\)]\s*/gi, '')
    // Remove audio format tags like "5.1", "7.1", "Dolby"
    .replace(/\s*[\(\[]?\s*(?:\d+\.\d+|Dolby|Atmos)\s*[\)\]]?\s*/gi, '');
  
  // Step 2.5: REDUNDANCY REMOVAL - Remove artist name from BEGINNING if present
  // This handles cases like "Jane Zhang - Dust My Shoulders Off" → "Dust My Shoulders Off"
  // Also handles collaborations: "Fred again.. & Jozzy - ten" → "ten"
  const beforeRedundancy = cleanTitle;
  
  // Try to match the entire artist/collaboration prefix before the dash
  // Pattern: "Artist1 [& Artist2] - Song" → "Song"
  const collabPattern = /^([^-–—]+?)\s*[-–—]\s*/;
  const collabMatch = cleanTitle.match(collabPattern);
  
  if (collabMatch) {
    const prefix = collabMatch[1].trim();
    const prefixLower = prefix?.toLowerCase() || '';
    const artistLower = artistName?.toLowerCase() || '';
    
    // Check if the prefix contains or starts with the artist name
    // This handles both "Artist - Song" and "Artist1 & Artist2 - Song"
    if (prefixLower.startsWith(artistLower) || 
        prefixLower.startsWith(artistLower.replace(/\.+$/, '')) || // Try without trailing dots
        prefixLower === artistLower) {
      // Remove the entire prefix (artist + collaborators)
      cleanTitle = cleanTitle.replace(collabPattern, '');
    }
  }
  
  if (beforeRedundancy !== cleanTitle) {
    console.log(`   🧹 [BRAIN] Removed redundant artist prefix: "${beforeRedundancy}" → "${cleanTitle}"`);
  }
  
  // Step 3: Remove leading commas, dashes, and spaces
  cleanTitle = cleanTitle.replace(/^[,\s-]+/, '');

  // Step 4: Extract content within quotes (highest priority)
  const quoteMatch = cleanTitle.match(/['''"""]([^'''"""]+)['''"""]/);
  if (quoteMatch && quoteMatch[1]) {
    cleanTitle = quoteMatch[1].trim();
  } else {
    // Step 5: Handle "Artist | Song" format (remove artist if duplicated)
    const escapedArtist = artistName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pipePattern = new RegExp(`^${escapedArtist}\\s*[|]\\s*`, 'i');
    cleanTitle = cleanTitle.replace(pipePattern, '');
    
    // Step 6: Remove artist name from ANYWHERE in title (not just beginning)
    // This handles: "Massive Attack - Song", "Song by Massive Attack", "Massive Attack, Song"
    
    // Pattern 1: Artist at the beginning with separator
    const beginPattern = new RegExp(`^${escapedArtist}\\s*[-:,–—]\\s*`, 'i');
    cleanTitle = cleanTitle.replace(beginPattern, '');
    
    // Pattern 2: Artist at the END with separator (e.g., "Captain Ants - AntsLive")
    const endPattern = new RegExp(`\\s*[-:,–—]\\s*${escapedArtist}$`, 'i');
    cleanTitle = cleanTitle.replace(endPattern, '');
    
    // Pattern 3: Artist repeated in the middle (e.g., "Massive Attack, Young Fathers - Voodoo...")
    // Remove duplicate artist mentions separated by comma/dash
    const duplicatePattern = new RegExp(`${escapedArtist}\\s*[,&]\\s*`, 'gi');
    cleanTitle = cleanTitle.replace(duplicatePattern, '');
    
    // Step 7: Handle fan repost format "Artist - Song" when artist already extracted
    // If title still starts with separator, it means artist was already removed
    cleanTitle = cleanTitle.replace(/^[-:,–—]\s*/, '');
    
    // Step 8: Remove featuring/collaboration patterns
    cleanTitle = cleanTitle.replace(/\s*[\(\[]?\s*(?:feat\.|featuring|ft\.|with)[\s.]+[^\)\]]+[\)\]]?\s*$/i, '');
  }

  // Step 9: Remove common MV/Video suffixes (aggressive cleanup)
  cleanTitle = cleanTitle
    .replace(/\s*[\(\[]?\s*Official\s*(Music\s*)?Video\s*[\)\]]?\s*$/i, '')
    .replace(/\s*[\(\[]?\s*Official\s*MV\s*[\)\]]?\s*$/i, '')
    .replace(/\s*[\(\[]\s*MV\s*[\)\]]\s*$/i, '')
    .replace(/\s*\(MV\)\s*$/i, '')
    .replace(/\s*\[MV\]\s*$/i, '')
    .replace(/\s*M\/V\s*$/i, '')
    .replace(/\s*[-:–—]\s*Official\s*(Music\s*)?Video$/i, '')
    .replace(/\s*[-:–—]\s*Official\s*MV$/i, '')
    .replace(/\s*\[[^\]]*Official[^\]]*\]/gi, '')
    .replace(/\s*\([^)]*Official[^)]*\)/gi, '')
    // Remove "Explicit" tags
    .replace(/\s*[\(\[]?\s*Explicit\s*[\)\]]?\s*$/i, '')
    // Final cleanup: remove trailing dashes, commas, and excess whitespace
    .replace(/^[-–—,:\s]+|[-–—,:\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Step 10: Safety check - if title is now empty or same as artist, try to extract from original
  // This can happen when artist name appears twice (e.g., "Brodinski - Brodinski - Can't Help Myself")
  if (!cleanTitle || cleanTitle?.toLowerCase() === artistName?.toLowerCase()) {
    // Try to find content after the last separator
    const lastSeparatorMatch = originalTitle.match(/[-–—]\s*([^-–—\[\(]+?)(?:\s*[\[\(]|$)/);
    if (lastSeparatorMatch && lastSeparatorMatch[1]) {
      cleanTitle = lastSeparatorMatch[1].trim();
      // Re-apply quality tag removal
      cleanTitle = cleanTitle.replace(/\s*[\(\[]?\s*(?:HD|4K|8K|UHD|FHD)\s*[\)\]]?\s*/gi, '').trim();
    }
  }

  return cleanTitle;
}

/**
 * Enhanced regex parsing for generic video descriptions
 * Extracts credits even when description format is non-standard
 * 
 * @param {string} description - Video description
 * @returns {object} Parsed credits (same format as parseCredits)
 */
export function parseCreditsGeneric(description) {
  // Use the existing robust parser
  // This function exists as an alias for potential future enhancements
  return parseCredits(description);
}
