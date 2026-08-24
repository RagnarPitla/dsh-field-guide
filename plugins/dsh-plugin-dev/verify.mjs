/**
 * Verifies dsh-plugin-dev against the real @deepseek-ai/dsh-skill registry.
 *
 * Mounts the registry and this plugin on a bare Cordis context, then asserts the
 * bundled skills are discoverable and loadable with their Markdown bodies intact.
 */
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as pluginDev from 'dsh-plugin-dev'

const EXPECTED = ['dsh-composition-debug', 'dsh-plugin-authoring']

const ctx = new Context()
ctx.plugin(SkillRegistry)
ctx.plugin(pluginDev)

await ctx.start?.()
await new Promise((resolve) => setTimeout(resolve, 200))

const listed = await ctx.skills.list({})
const names = listed.map((skill) => skill.name).sort()
console.log('discovered:', names)
assert.deepEqual(names, EXPECTED, 'both bundled skills should be discoverable')

for (const summary of listed) {
  assert.equal(summary.source, 'bundled', `${summary.name} source`)
  assert.equal(summary.invocation.modelInvocable, true, `${summary.name} modelInvocable`)
  assert.equal(summary.invocation.userInvocable, true, `${summary.name} userInvocable`)
  assert.ok(summary.description.length > 40, `${summary.name} has a real description`)
  assert.ok(summary.whenToUse, `${summary.name} has whenToUse routing guidance`)

  const definition = await ctx.skills.get(summary.name, {})
  assert.ok(definition, `${summary.name} loads`)
  assert.ok(definition.content.startsWith('#'), `${summary.name} body starts at a heading`)
  assert.ok(!definition.content.includes('---\nname:'), `${summary.name} frontmatter is stripped`)
  assert.ok(definition.content.length > 1500, `${summary.name} body is substantial`)
  console.log(`  ${summary.name}: ${definition.content.length} chars, whenToUse ok`)
}

const filtered = new Context()
filtered.plugin(SkillRegistry)
filtered.plugin(pluginDev, { include: ['dsh-plugin-authoring'], userInvocable: false })
await new Promise((resolve) => setTimeout(resolve, 200))
const only = (await filtered.skills.list({})).map((s) => s.name)
assert.deepEqual(only, ['dsh-plugin-authoring'], 'include filter selects one skill')
assert.equal((await filtered.skills.list({}))[0].invocation.userInvocable, false, 'userInvocable config honoured')
console.log('config: include filter and invocation override both honoured')

console.log('\nPASS: dsh-plugin-dev verified against @deepseek-ai/dsh-skill')
process.exit(0)
