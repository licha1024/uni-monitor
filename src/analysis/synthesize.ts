import Anthropic from '@anthropic-ai/sdk';
import { config } from '../util/config.js';
import { ANALYST_SYSTEM_PROMPT } from './system-prompt.js';
import { renderSnapshotForAI } from './format.js';
import type { UniSnapshot, DailyAnalysis } from '../types/snapshot.js';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    headline: {
      type: 'string',
      description: 'One-sentence takeaway (max 30 words).',
    },
    stance: {
      type: 'string',
      enum: ['bullish', 'neutral', 'bearish'],
      description: 'Directional bias over 1-4 weeks.',
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
    },
    keyChanges: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Exactly 3 most important changes vs. prior baseline. Concrete, with numbers.',
    },
    contrarianObservation: {
      type: 'string',
      description:
        "One observation that cuts against the day's dominant reading. Required.",
    },
    watchNext: {
      type: 'array',
      items: { type: 'string' },
      description:
        '2-3 specific events or thresholds to watch tomorrow.',
    },
    fullReasoning: {
      type: 'string',
      description:
        'A tight paragraph (150-250 words) walking through the logic connecting the metrics to your stance.',
    },
  },
  required: [
    'headline',
    'stance',
    'confidence',
    'keyChanges',
    'contrarianObservation',
    'watchNext',
    'fullReasoning',
  ],
  additionalProperties: false,
};

export async function synthesize(snapshot: UniSnapshot): Promise<DailyAnalysis> {
  const rendered = renderSnapshotForAI(snapshot);

  const userMessage = `Today's UNI data snapshot follows. Analyze it and produce the JSON brief per the schema. Do NOT include any text outside the JSON object.

${rendered}

Reminder: your contrarian observation must genuinely cut against your headline stance. If you say bullish, find the specific reason someone smart could be short. If bearish, find the specific reason someone smart could be long. Don't produce mush.`;

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
    output_config: {
      format: {
        type: 'json_schema',
        schema: RESPONSE_SCHEMA,
      },
    },
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

  const parsed = JSON.parse(textBlock.text);
  return parsed as DailyAnalysis;
}
