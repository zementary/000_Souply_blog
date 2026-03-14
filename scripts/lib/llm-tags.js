import 'dotenv/config';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const EMPTY_RESULT = {
  tags: [],
};

/**
 * 使用 LLM 基于视频元数据推断内部 tags。
 *
 * 设计原则：
 * - 只生成可复用的分类标签（参照 TAG_TAXONOMY / visualHookMapping）
 * - 严格从允许的标签集合中选择，不创造新标签
 * - 推荐 3–6 个标签，最少 2 个，最多 8 个
 *
 * @param {object} metadata
 * @param {string} metadata.title
 * @param {string} metadata.artist
 * @param {string|null} [metadata.director]
 * @param {string|null} [metadata.production]
 * @param {number|string|null} [metadata.year]
 * @param {string[]} [metadata.existingTags]
 * @returns {Promise<{tags: string[]}>}
 */
export async function inferTagsWithLLM(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY_RESULT };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️ [TAGS] OPENROUTER_API_KEY not set, skipping LLM tag inference');
    return { ...EMPTY_RESULT };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  // 允许的标签集合（汇总自 TAG_TAXONOMY + visualHookMapping + 现有实践）
  // 注意：只允许使用这些标签，禁止发明新标签。
  const allowedTags = [
    // 拍摄技术
    'one-take',
    'long-take',
    'split-screen',
    'reverse-motion',
    'slow-motion',
    'time-lapse',
    'drone-shot',
    'fisheye',
    'handheld',
    // 视觉风格
    'black-and-white',
    'high-contrast',
    'neon-lights',
    'minimal',
    'maximalist',
    'retro',
    'futuristic',
    'grainy',
    'chromatic',
    // 动画/特效
    '2d-animation',
    '3d-animation',
    'stop-motion',
    'rotoscope',
    'vfx-heavy',
    'practical-effects',
    'cgi-morphing',
    'mixed-media',
    'glitch',
    // 编舞/表演
    'dance-choreography',
    'synchronized',
    'martial-arts',
    'crowd-scene',
    'solo-performance',
    // 叙事/主题
    'narrative',
    'surreal',
    'dystopian',
    'abstract',
    'documentary-style',
    'political',
    'satirical',
    'nostalgic',
    'social-commentary',
    // 场景/环境
    'urban',
    'nature',
    'studio',
    'desert',
    'water',
    'industrial',
    'domestic',
    'office-setting',
    'suburban',
    // 概念/创意
    'meta',
    'interactive',
    'fourth-wall-break',
    'single-location',
    'found-footage',
    'music-as-character',
    'loop',
    // 其他在现有映射中出现的标签
    'rapid-editing',
    'high-energy',
    'cinematic',
    'body-horror',
    'folk-art',
    'cultural',
    'tableaux-vivants',
    'afrofuturism',
    'maximalist',
    'colorful',
    'ballroom',
    'extreme-sports',
    'reveal',
    'celebration',
    'vehicle',
    'anime-style',
  ];

  const systemPrompt = [
    'You are an expert music video curator and taxonomy designer.',
    'Your job is to assign a small set of reusable tags for INTERNAL filtering, not for end users.',
    '',
    'CRITICAL RULES:',
    '- You MUST ONLY use tags from the allowed vocabulary list provided below.',
    '- Never invent new tags, never change spelling, casing, or hyphenation.',
    '- Tags should describe reusable visual style, technique, theme, or setting – not specific song titles or one-off concepts.',
    '- Prefer 3–6 tags per video; minimum 2, maximum 8.',
    '- If the metadata is too sparse to choose confidently, return an empty list.',
    '',
    'ALLOWED TAG VOCABULARY (examples grouped by category):',
    '- Cinematography: one-take, long-take, split-screen, reverse-motion, slow-motion, time-lapse, drone-shot, fisheye, handheld.',
    '- Visual style: black-and-white, high-contrast, neon-lights, minimal, maximalist, retro, futuristic, grainy, chromatic.',
    '- Animation / VFX: 2d-animation, 3d-animation, stop-motion, rotoscope, vfx-heavy, practical-effects, cgi-morphing, mixed-media, glitch.',
    '- Dance / performance: dance-choreography, synchronized, martial-arts, crowd-scene, solo-performance.',
    '- Narrative / theme: narrative, surreal, dystopian, abstract, documentary-style, political, satirical, nostalgic, social-commentary.',
    '- Setting / environment: urban, nature, studio, desert, water, industrial, domestic, office-setting, suburban.',
    '- Concept / creativity: meta, interactive, fourth-wall-break, single-location, found-footage, music-as-character, loop.',
    '- Additional commonly used tags: rapid-editing, high-energy, cinematic, body-horror, folk-art, cultural, tableaux-vivants, afrofuturism, colorful, ballroom, extreme-sports, reveal, celebration, vehicle, anime-style.',
    '',
    'You are labeling an internal-only "tags" field that is not exposed to end users; it is only used for internal filtering and discovery.',
  ].join('\n');

  const {
    title = '',
    artist = '',
    director = null,
    production = null,
    year = null,
    existingTags = [],
  } = metadata;

  const userPrompt = [
    'Based on the following metadata, choose reusable classification tags from the allowed vocabulary.',
    '',
    `Title: ${title || '(unknown)'}`,
    `Artist: ${artist || '(unknown)'}`,
    `Director: ${director || '(unknown or not specified)'}`,
    `Production: ${production || '(unknown or not specified)'}`,
    `Year: ${year || '(unknown)'}`,
    '',
    'Existing tags (may be ["uncategorized"] or partial):',
    JSON.stringify(existingTags || []),
    '',
    'Return your answer as a SINGLE JSON object with this exact shape:',
    '{',
    '  "tags": string[]  // list of tags from the allowed vocabulary only',
    '}',
    '',
    'Rules:',
    '- Do not include any tags that are not in the allowed vocabulary list.',
    '- Do not include any free-text descriptions, song names, or unique phrases.',
    '- Prioritize combinations that reflect visual style, technique, theme, and setting.',
    '- If you cannot infer anything meaningful, respond with {"tags": []}.',
    '',
    'Respond with JSON only. Do not add explanations or markdown.',
  ].join('\n');

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek/deepseek-v3.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
    }),
    signal: controller.signal,
  };

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', fetchOptions);
    const text = await response.text();

    if (!response.ok) {
      console.warn(`   ⚠️ [TAGS] LLM API returned ${response.status}: ${text.slice(0, 200)}`);
      return { ...EMPTY_RESULT };
    }

    const data = JSON.parse(text);
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      return { ...EMPTY_RESULT };
    }

    const cleaned = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn('   ⚠️ [TAGS] LLM returned non-JSON content:', rawContent.slice(0, 100));
      return { ...EMPTY_RESULT };
    }

    // 结果清洗：只保留允许集合中的标签，并去重
    const resultTags = Array.isArray(parsed.tags) ? parsed.tags : [];
    const normalized = new Set();

    for (const tag of resultTags) {
      if (typeof tag !== 'string') continue;
      const trimmed = tag.trim();
      if (!trimmed) continue;

      if (allowedTags.includes(trimmed)) {
        normalized.add(trimmed);
      }
    }

    return {
      tags: Array.from(normalized),
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('   ⚠️ [TAGS] LLM request timed out after 30s');
    } else {
      console.warn(`   ⚠️ [TAGS] LLM fetch failed: ${err.message}`);
    }
    return { ...EMPTY_RESULT };
  } finally {
    clearTimeout(timeoutId);
  }
}

