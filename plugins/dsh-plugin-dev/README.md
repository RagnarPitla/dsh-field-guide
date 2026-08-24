# dsh-plugin-dev

Plugin-authoring and composition-debugging skills for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) agents.

This bundle ships two skills that teach an agent how to extend the harness it is
running inside: how to write and install an external plugin, and how to work out
what a profile actually loaded when something does not take effect.

Every claim in the skill bodies was verified by executing the published `dsh`
CLI, not read from documentation. See [How it was verified](#how-it-was-verified).

## Install

```sh
dsh plugin --profile <profile> add dsh-plugin-dev
```

`dsh plugin add` appends the package to your profile's `dsh.profile.bundles` for
you. Confirm it composed:

```sh
dsh --profile <profile> --dump-config | grep -A2 plugin-dev-skills
```

## What it provides

| Skill | Covers |
|---|---|
| `dsh-plugin-authoring` | The three-file minimal plugin, the named-export contract, `dsh plugin add` behaviour, the extension seams, host plane vs agent plane, and the three traps that make a correct plugin appear to do nothing |
| `dsh-composition-debug` | The keyless `--dump-config` workflow, bundle vs profile vs agent preset, patch layer order and the no-deep-merge rule, and counting what actually runs |

Both are model- and user-invocable by default.

## Requirements

The registry (`@deepseek-ai/dsh-skill`) and the model-facing consumer
(`@deepseek-ai/dsh-tool-skill`) must both be in the composition. Both ship in
`@deepseek-ai/dsh-base`, so any standard profile already satisfies this.

Registering skills without `dsh-tool-skill` present mounts cleanly and the model
never sees them — which is one of the traps `dsh-plugin-authoring` documents.

## Config

| Field | Default | Meaning |
|---|---|---|
| `include` | all | Register only the named skills |
| `modelInvocable` | `true` | Whether model-facing catalogs include these skills |
| `userInvocable` | `true` | Whether human-facing command catalogs include these skills |

```yaml
- id: plugin-dev-skills
  name: dsh-plugin-dev
  config:
    include: [dsh-composition-debug]
    userInvocable: false
```

Remember that a patch replaces a row's entire `config`. There is no deep merge.

## Design notes

The skills are registered as **runtime skills** through `ctx.skills.register()`
rather than by adding a filesystem provider root. That keeps the pack
self-contained and independent of `$DSH_HOME` layout, at the cost of the skills
not being editable in place by the user. Fork the package to change them.

The Markdown files use SKILL.md-compatible frontmatter, so `skills/` also works
if copied into a filesystem skill root such as `~/.dsh/skills/`.

Frontmatter is parsed by a small strict reader for three scalar keys rather than
by a YAML library, so the package has **no runtime dependencies**. A plugin
resolves its imports from the profile it is installed into, and depending on a
package the host does not supply as a peer is a common source of install
failures.

## How it was verified

`verify.mjs` imports `@deepseek-ai/cordis` and `@deepseek-ai/dsh-skill`, which a
plugin does not vendor itself: they are peer dependencies the host supplies at
runtime. So run it against a tree that already has them, such as the profile
this plugin is installed into. `NODE_PATH` does not work here, because ESM
resolution ignores it.

```sh
ln -sfn /path/to/host/node_modules node_modules
node verify.mjs
rm node_modules
```

`node_modules/` is gitignored, so the symlink cannot be committed by accident.
Expect a final line of `PASS: dsh-plugin-dev verified against @deepseek-ai/dsh-skill`.

`verify.mjs` mounts the real `@deepseek-ai/dsh-skill` registry and this plugin on
a bare Cordis context, then asserts that both skills are discoverable through
`ctx.skills.list()`, that `ctx.skills.get()` returns bodies with frontmatter
stripped, and that the `include` and invocation config fields are honoured.

It also confirms the documented install behaviour: after
`dsh plugin --profile skilltest add .`, the profile manifest contained

```json
"bundles": ["@deepseek-ai/dsh-base", "dsh-plugin-dev"]
```

and the composed tree carried the row under a `# == dsh-plugin-dev` provenance
comment.

Verified against `dsh` 0.1.0-rc.7 and `@deepseek-ai/dsh-skill` 0.1.0-rc.7 on
2026-08-24. DeepSeek Harness is pre-release and its plugin contracts may change.

## Licence

MIT. Independent and unofficial: not affiliated with, endorsed by, or sponsored
by DeepSeek.
