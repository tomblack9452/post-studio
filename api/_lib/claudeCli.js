import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { HttpError } from './http.js'

// Runs a prompt through the locally installed Claude Code CLI (`claude -p`), which bills
// against the Claude Pro/Max subscription it is logged in with instead of the API key.
// Local only: the CLI isn't available on Vercel. Log in once with `claude auth login`.

// Max effort on the big models can think for several minutes.
const TIMEOUT_MS = 10 * 60 * 1000

// Env vars that would make the CLI use an API key or another session's credentials
// instead of the subscription login.
const STRIP_ENV = /^(ANTHROPIC_|CLAUDE_CODE_|CLAUDECODE$)/

function cliEnv() {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) if (!STRIP_ENV.test(k)) env[k] = v
  return env
}

/**
 * Same contract as generateJson in claude.js, but through the CLI.
 *
 * The CLI's --json-schema flag validates strictly and gives up after a few misses
 * (error_max_structured_output_retries), which happened often with the large post schema.
 * So the schema goes in the system prompt and the reply is parsed here instead; the
 * normalize step already tolerates small slips. One retry if the JSON is unusable.
 */
export async function generateJsonViaCli({ user, system, schema, model, effort = 'low' }) {
  const args = [
    '-p',
    '--output-format', 'json',
    '--system-prompt', `${system}\n\n${formatInstruction(schema)}`,
    '--model', model,
    '--effort', effort, // faster (low) to smarter (max)
    '--tools', '', // plain text generation: no file, shell or web access
    '--no-session-persistence',
    '--setting-sources', '',
    '--strict-mcp-config',
  ]

  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await runJson(args, user)
    const data = parseJsonText(out.result)
    const missing = data ? (schema.required || []).filter((k) => !(k in data)) : []
    if (data && !missing.length) {
      return {
        data,
        usage: {
          model,
          provider: 'pro',
          effort,
          inputTokens:
            (out.usage?.input_tokens || 0) +
            (out.usage?.cache_read_input_tokens || 0) +
            (out.usage?.cache_creation_input_tokens || 0),
          outputTokens: out.usage?.output_tokens || 0,
          costUsd: null, // covered by the subscription
        },
      }
    }
    lastError = data ? `missing ${missing.join(', ')}` : 'not valid JSON'
  }
  throw new HttpError(`Claude Pro returned an unusable reply (${lastError}). Try again.`, 502)
}

function formatInstruction(schema) {
  return `OUTPUT FORMAT
Reply with a single JSON object that matches this JSON Schema exactly: every required property, no extra properties, no prose and no code fences.
${JSON.stringify(schema)}`
}

async function runJson(args, input) {
  const stdout = await run(process.env.CLAUDE_CLI_PATH || 'claude', args, input)
  let out
  try {
    out = JSON.parse(stdout)
  } catch {
    throw new HttpError(`Unexpected output from the Claude CLI: ${stdout.slice(0, 200)}`, 502)
  }
  if (out.is_error) throw cliError(String(out.result || out.subtype || 'Unknown error'))
  return out
}

function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    let child
    try {
      // Run outside the project so the CLI doesn't pick up CLAUDE.md or project settings.
      child = spawn(cmd, args, { cwd: tmpdir(), env: cliEnv(), windowsHide: true })
    } catch (e) {
      return reject(notFound())
    }

    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new HttpError('The Claude CLI took too long to answer. Try again.', 504))
    }, TIMEOUT_MS)

    child.stdout.on('data', (c) => (stdout += c))
    child.stderr.on('data', (c) => (stderr += c))
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e.code === 'ENOENT' ? notFound() : e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      // With --output-format json, errors still arrive as a JSON result on stdout.
      if (stdout.trim()) return resolve(stdout)
      reject(cliError(stderr.trim() || `Claude CLI exited with code ${code}`))
    })

    child.stdin.end(input)
  })
}

function notFound() {
  return new HttpError(
    'Claude CLI not found. Install Claude Code, run `claude auth login`, or set CLAUDE_CLI_PATH in .env.',
    500,
  )
}

function cliError(message) {
  if (/authenticat|log ?in|oauth|credential/i.test(message)) {
    return new HttpError(`Claude Pro isn't logged in on this machine. Run \`claude auth login\` in a terminal, then retry. (${message})`, 401)
  }
  if (/does not support this model|claude update/i.test(message)) {
    return new HttpError(`Your Claude CLI is too old for this model. Run \`claude update\` in a terminal, then retry. (${message})`, 400)
  }
  if (/usage credits|extra usage|credit balance/i.test(message)) {
    return new HttpError(`This model needs usage credits on your Claude plan. Pick another model or add credits. (${message})`, 402)
  }
  if (/usage limit|rate limit|limit reached|429/i.test(message)) {
    return new HttpError(`Claude Pro usage limit reached. Wait for it to reset or switch to the API. (${message})`, 429)
  }
  return new HttpError(`Claude CLI error: ${message}`, 502)
}

// Pulls the JSON object out of the reply, ignoring any code fences or stray prose around it.
function parseJsonText(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch {
    return null
  }
}
