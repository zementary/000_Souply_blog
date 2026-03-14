import 'dotenv/config';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const EMPTY_CREDITS = {
  director: null,
  production: null,
  label: null,
};

/**
 * Extract credits using LLM via OpenRouter.
 * Returns director / production / label or nulls on any failure.
 *
 * @param {string} description
 * @param {string} title
 * @param {string} artist
 * @returns {Promise<{director: string|null, production: string|null, label: string|null}>}
 */
export async function extractCreditsWithLLM(description, title = '', artist = '') {
  if (!description || typeof description !== 'string') {
    return { ...EMPTY_CREDITS };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('   ⚠️ [CREDITS] OPENROUTER_API_KEY not set, skipping LLM extraction');
    return { ...EMPTY_CREDITS };
  }

  const controller = new AbortController();
  // LLM APIs can take 10–30 s; 3 s was always aborting before response
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const systemPrompt = [
    'You are an expert metadata parser for music videos.',
    'Your task is to extract three fields from the given video description:',
    '- "director": the main film/video director (person).',
    '- "production": the production company or producer / executive producer (unified field).',
    '- "label": the music label / record company.',
    '',
    'Rules:',
    '- Use ONLY the information in the description and optional title/artist.',
    '- If you are not sure about a field, set it to null.',
    '- Prefer concise human-readable names (no URLs, no social handles, no job titles).',
    '- Never invent companies or people that are not clearly stated.',
  ].join('\n');

  const userPrompt = [
    'Extract credits from the following music video metadata.',
    '',
    `Title: ${title || '(unknown)'}`,
    `Artist: ${artist || '(unknown)'}`,
    '',
    'Description:',
    '"""',
    description,
    '"""',
    '',
    'Respond with a SINGLE JSON object, with this exact shape:',
    '{',
    '  "director": string | null,',
    '  "production": string | null,',
    '  "label": string | null',
    '}',
    '',
    'Do not include any extra text, comments, or markdown – ONLY the JSON.',
  ].join('\n');

  // Build fetch options
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

  // Apply proxy if configured (node-fetch does NOT pick up HTTPS_PROXY automatically)
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    fetchOptions.agent = new HttpsProxyAgent(proxyUrl);
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', fetchOptions);

    const text = await response.text();

    if (!response.ok) {
      console.warn(`   ⚠️ [CREDITS] LLM API returned ${response.status}: ${text.slice(0, 200)}`);
      return { ...EMPTY_CREDITS };
    }

    const data = JSON.parse(text);
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      return { ...EMPTY_CREDITS };
    }

    // Strip optional markdown code fences the model might add
    const cleaned = rawContent.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn('   ⚠️ [CREDITS] LLM returned non-JSON content:', rawContent.slice(0, 100));
      return { ...EMPTY_CREDITS };
    }

    return {
      director: parsed.director ?? null,
      production: parsed.production ?? null,
      label: parsed.label ?? null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('   ⚠️ [CREDITS] LLM request timed out after 30s');
    } else {
      console.warn(`   ⚠️ [CREDITS] LLM fetch failed: ${err.message}`);
    }
    return { ...EMPTY_CREDITS };
  } finally {
    clearTimeout(timeoutId);
  }
}
