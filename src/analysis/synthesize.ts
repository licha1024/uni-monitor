import Anthropic from '@anthropic-ai/sdk';
import { config } from '../util/config.js';
import { ANALYST_SYSTEM_PROMPT } from './system-prompt.js';
import { renderSnapshotForAI } from './format.js';
import type { UniSnapshot, DailyAnalysis } from '../types/snapshot.js';

const client = new Anthropic({
  apiKey: config.anthropicApiKey,
  ...(config.anthropicBaseUrl ? { baseURL: config.anthropicBaseUrl } : {}),
});

/**
 * Normalize alternative field names to the canonical DailyAnalysis shape.
 * Different providers/proxies sometimes let the model use variant schemas —
 * we accept snake_case and a few common aliases.
 */
function normalize(raw: Record<string, unknown>): DailyAnalysis {
  const pick = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (raw[k] != null) return raw[k];
    }
    return undefined;
  };

  const asArray = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.map((x) => String(x));
    if (typeof v === 'string') return [v];
    if (v && typeof v === 'object') return Object.values(v).map((x) => String(x));
    return [];
  };

  const asString = (v: unknown, fallback = ''): string => {
    if (typeof v === 'string') return v;
    if (v == null) return fallback;
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  };

  const stance = asString(pick('stance'), 'neutral').toLowerCase();
  const confidence = asString(pick('confidence'), 'low').toLowerCase();

  const keyChanges = asArray(pick('keyChanges', 'key_changes', 'key_metrics', 'keyMetrics'));
  const watchNext = asArray(pick('watchNext', 'watch_next', 'catalysts_bullish', 'catalystsBullish'));

  // Build fullReasoning from whatever prose fields exist
  const reasoningParts = [
    asString(pick('fullReasoning', 'full_reasoning', 'reasoning')),
    asString(pick('action_bias', 'actionBias')),
    asString(pick('data_quality_note', 'dataQualityNote')),
  ].filter(Boolean);

  return {
    headline: asString(pick('headline'), '(no headline)'),
    stance: (['bullish', 'bearish', 'neutral'].includes(stance) ? stance : 'neutral') as DailyAnalysis['stance'],
    confidence: (['low', 'medium', 'high'].includes(confidence) ? confidence : 'low') as DailyAnalysis['confidence'],
    keyChanges: keyChanges.slice(0, 3),
    contrarianObservation: asString(pick('contrarianObservation', 'contrarian_observation'), ''),
    watchNext: watchNext.slice(0, 3),
    fullReasoning: reasoningParts.join('\n\n'),
  };
}

export async function synthesize(snapshot: UniSnapshot): Promise<DailyAnalysis> {
  const rendered = renderSnapshotForAI(snapshot);

  const userMessage = `Today's UNI data snapshot follows. Analyze it, then output ONLY a JSON object (no prose, no markdown code fences) matching this exact schema:

{
  "headline": string,                 // one-sentence takeaway, max 30 words
  "stance": "bullish" | "neutral" | "bearish",
  "confidence": "low" | "medium" | "high",
  "keyChanges": string[],             // exactly 3, concrete with numbers
  "contrarianObservation": string,    // MUST cut against your headline stance
  "watchNext": string[],              // 2-3 items
  "fullReasoning": string             // tight paragraph 150-250 words
}

${rendered}

Reminder: your contrarian observation must genuinely cut against your headline stance. If you say bullish, find the specific reason someone smart could be short. If bearish, find the specific reason someone smart could be long. Don't produce mush.

Output ONLY the JSON object. No preamble, no code fences, nothing else.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    // effort defaults to high (xhigh is best for coding/agentic; high is best for intelligence-sensitive analysis)
    system: [
      {
        type: 'text',
        text: ANALYST_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  });

  // Log cache stats (helps confirm caching works across runs)
  const u = response.usage;
  if (u) {
    const cacheRead = (u as unknown as { cache_read_input_tokens?: number })
      .cache_read_input_tokens ?? 0;
    const cacheWrite = (u as unknown as { cache_creation_input_tokens?: number })
      .cache_creation_input_tokens ?? 0;
    console.log(
      `[claude] input=${u.input_tokens} output=${u.output_tokens} cache_read=${cacheRead} cache_write=${cacheWrite}`
    );
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text block in Claude response');
  }

  const parsed = extractJson(textBlock.text);
  return normalize(parsed as Record<string, unknown>);
}

/**
 * Robust JSON extractor. Handles:
 *  - pure JSON
 *  - JSON wrapped in ```json ... ``` fences (proxies without structured-output support)
 *  - JSON with prose before/after the object
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch { /* fall through */ }

  // Strip markdown code fences
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch { /* fall through */ }
  }

  // Grab first {...} block
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    const candidate = trimmed.slice(first, last + 1);
    return JSON.parse(candidate);
  }

  throw new Error(`Could not extract JSON from Claude response:\n${text.slice(0, 500)}`);
}
