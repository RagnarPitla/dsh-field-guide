/**
 * Registers this package's bundled Markdown skills as runtime skills on `ctx.skills`.
 *
 * The skill files use SKILL.md-compatible frontmatter, so the same directory also works
 * when copied into a filesystem skill root. Registration happens once at apply time;
 * the registry's disposers are tracked by the calling context and released on teardown.
 *
 * @module dsh-plugin-dev
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'plugin-dev-skills'
export const inject = ['skills']

const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), 'skills')

/** Frontmatter keys this pack understands. Any other key is ignored rather than rejected. */
const SCALAR_KEYS = new Set(['name', 'description', 'whenToUse'])

/**
 * Split SKILL.md-compatible frontmatter from a Markdown body.
 *
 * Deliberately handles only the flat `key: value` scalars this pack ships rather than
 * depending on a YAML parser, which would give the plugin a runtime dependency that the
 * host does not supply as a peer. A file without a leading `---` fence is all body.
 *
 * @param text - full file contents.
 * @returns parsed scalar frontmatter and the remaining Markdown body.
 */
function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text)
  if (!match) return { meta: {}, body: text.trim() }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line)
    if (!pair) continue
    const key = pair[1]
    if (!SCALAR_KEYS.has(key)) continue
    meta[key] = pair[2].trim().replace(/^(['"])([\s\S]*)\1$/, '$2')
  }
  return { meta, body: text.slice(match[0].length).trim() }
}

/**
 * Read every `*.md` file in the bundled skill directory.
 * @returns one entry per readable skill file, sorted by file name.
 * @throws when the bundled skill directory is missing, which means a broken install.
 */
function readBundledSkills() {
  return readdirSync(SKILL_DIR)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const path = join(SKILL_DIR, file)
      const { meta, body } = parseFrontmatter(readFileSync(path, 'utf8'))
      return { file, path, meta, body }
    })
}

/**
 * Register the bundled skills.
 *
 * A skill missing `name` or `description` is skipped with a warning instead of aborting the
 * mount, so one malformed file cannot cost the agent the rest of the pack.
 *
 * @param ctx - the mounting context, which must provide `skills`.
 * @param config - optional selection and invocation controls.
 */
export function apply(ctx, config = {}) {
  const logger = ctx.logger('plugin-dev-skills')
  const include = config.include
  const invocation = {
    modelInvocable: config.modelInvocable ?? true,
    userInvocable: config.userInvocable ?? true,
  }

  let registered = 0
  for (const skill of readBundledSkills()) {
    const { name: skillName, description, whenToUse } = skill.meta
    if (!skillName || !description) {
      logger.warn('skipping %s: frontmatter requires both name and description', skill.file)
      continue
    }
    if (include && !include.includes(skillName)) continue

    ctx.skills.register({
      name: skillName,
      description,
      ...whenToUse ? { whenToUse } : {},
      content: skill.body,
      source: 'bundled',
      path: skill.path,
      invocation,
    })
    registered += 1
  }

  logger.info('registered %d skill(s) from %s', registered, SKILL_DIR)
}
