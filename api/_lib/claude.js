import Anthropic from '@anthropic-ai/sdk'
import { HttpError } from './http.js'
import { SYSTEM_PROMPT } from './prompts.js'

// Sonnet 5 is noticeably more accurate on facts than Haiku 4.5 for ~2x the cost (~2¢ vs ~1¢ per post).
// The app sends the model chosen in the UI; this is the fallback. Override with ANTHROPIC_MODEL in .env.
const DEFAULT_MODEL = 'claude-sonnet-5'

// Models the app may request per post (anything else falls back to the default).
export const ALLOWED_MODELS = ['claude-haiku-4-5', 'claude-sonnet-5']

function pickModel(requested) {
  if (ALLOWED_MODELS.includes(requested)) return requested
  return process.env.ANTHROPIC_MODEL || DEFAULT_MODEL
}

// $ per million tokens [input, output], for the cost estimate shown in the app.
const PRICES = {
  'claude-haiku-4-5': [1, 5],
  'claude-sonnet-5': [2, 10],
  'claude-opus-5': [5, 25],
}

let client
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HttpError('ANTHROPIC_API_KEY is missing. Add it to .env and restart the dev server.', 500)
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

/** One structured-output call. Returns the parsed JSON plus token usage. */
export async function generateJson({ user, schema, maxTokens = 6000, model: requested }) {
  const model = pickModel(requested)
  let response
  try {
    response = await getClient().messages.create({
      model,
      max_tokens: maxTokens,
      // Sonnet 5 thinks by default; short copywriting doesn't need it and it multiplies output cost.
      // Haiku 4.5 doesn't think unless asked, so the param is omitted there.
      ...(model.startsWith('claude-sonnet-5') ? { thinking: { type: 'disabled' } } : {}),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema } },
    })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new HttpError('Anthropic rejected the API key in .env.', 401)
    if (e instanceof Anthropic.RateLimitError) throw new HttpError('Anthropic rate limit hit. Wait a moment and retry.', 429)
    if (e instanceof Anthropic.BadRequestError) throw new HttpError(`Anthropic request error: ${e.message}`, 400)
    if (e instanceof Anthropic.APIError) throw new HttpError(`Anthropic API error (${e.status ?? 'network'}): ${e.message}`, 502)
    throw e
  }

  if (response.stop_reason === 'refusal') {
    throw new HttpError('The model declined to write about this topic. Try rephrasing it.', 422)
  }
  if (response.stop_reason === 'max_tokens') {
    throw new HttpError('The response was cut off. Try again.', 502)
  }
  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new HttpError('Empty response from the model.', 502)

  const { input_tokens: inputTokens, output_tokens: outputTokens } = response.usage
  const price = PRICES[model]
  return {
    data: JSON.parse(text),
    usage: {
      model,
      inputTokens,
      outputTokens,
      costUsd: price ? (inputTokens * price[0] + outputTokens * price[1]) / 1e6 : null,
    },
  }
}
