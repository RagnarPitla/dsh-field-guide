---
name: dsh-plugin-authoring
description: Write, install and troubleshoot an external DeepSeek Harness plugin, including the minimal file set, the named-export contract, and the traps that make a correct plugin appear to do nothing.
whenToUse: Use when creating a new dsh plugin or bundle, when an installed plugin does not appear to load, or when a plugin loads but its tools never reach the model.
---

# Authoring a DeepSeek Harness plugin

An external plugin is three files and one command. There is no build step and no
bundler: the framework packages are peer dependencies supplied by the host at
runtime, so plain ESM JavaScript works.

## Minimal file set

### `package.json`

The `dsh.bundle.patch` key is what makes the package installable as a bundle. A
package without it still installs but contributes no layer and does nothing.

```json
{
  "name": "dsh-my-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

### `cordis.patch.yml`

One patch operation that inserts your plugin as a row. The `name` field must be
the **exact package name**; the `id` is the stable handle other layers use to
patch this row later.

```yaml
- insert:
    - id: my-plugin
      name: dsh-my-plugin
```

### `index.js`

A function plugin uses **named exports only**.

```js
export const name = 'my-plugin'
export const inject = ['skills']

export function apply(ctx, config = {}) {
  ctx.logger('my-plugin').info('loaded')
}
```

## Install it

```sh
dsh plugin --profile <profile> add ./dsh-my-plugin
```

This does more than install a dependency: it **automatically appends the package
to `dsh.profile.bundles`** in the profile manifest. You do not hand-edit that
list. The new bundle lands after `@deepseek-ai/dsh-base`, so it patches base
rather than being patched by it — install order decides layer order.

## The three traps

### 1. Never also default-export

A function plugin exports `name`, optional `inject`, optional `Config`, and
`apply`. A **service** package instead default-exports its class. If a function
plugin also has a default export, the loader treats it as the plugin object and
**silently discards the namespace metadata**, including `inject`. Your declared
dependencies then stop being awaited and you get a confusing crash on an
undefined service rather than an error naming the real problem.

### 2. Provider availability is not model access

Registering a provider for web, skills, subagents or workflows does **not** give
the agent a tool. Provider and consumer are two separate roles:

| You register | The model needs |
|---|---|
| a web search/fetch provider | `@deepseek-ai/dsh-tool-web` |
| a skill provider or runtime skill | `@deepseek-ai/dsh-tool-skill` |
| a subagent provider | a configured delegation tool |
| a workflow engine | `@deepseek-ai/dsh-tool-workflow` |

If the matching consumer is not in that agent's composition, everything mounts
cleanly and the model never sees the capability. This is the single most likely
reason a correctly written plugin appears to do nothing. Confirm with
`--dump-config` before debugging your own code.

### 3. A bundle alone gives you no interface

A newly created profile composes `dsh-base` only. It boots cleanly and then
idles with no surface, because an app bundle — `dsh-web-app` or `dsh-headless` —
is what provides one. Either add an app bundle to the profile or install your
plugin into an existing profile.

## Registrations are effects

Every contribution returns a disposer, and disposal must actually remove the
contribution. Calling a registry method inside `apply` is enough for the common
case: the returned disposer is a Cordis effect tied to the calling context, so
teardown is ordered and automatic. Use `ctx.effect()` explicitly when you own
resources the registry does not know about, such as a watcher or a timer.

For waterfall listeners, **you must call `next()`** to delegate. Returning
without it short-circuits the rest of the chain.

## Where you can attach

- **Tools** — `ctx.tools.register(defineTool({ ... }))`
- **Tool policy** — the `tools/pre-execute`, `tools/execute`, `tools/post-execute` and `tools/result` waterfalls
- **Skills** — `ctx.skills.register(...)` for an embedded skill, or `ctx.skills.registerProvider(...)` for a source
- **Web** — search and fetch providers
- **Subagents** — a provider plus a configured delegation tool
- **Workflows** — an engine plus observation events
- **LLM adapters** — `ctx.llm.registerAdapter(...)`
- **Session events** — declaration-merge your own durable payloads
- **Compaction** — provide or consume the engine
- **Context** — request context, turn-specific injection, and system-prompt sections

## Plane discipline

A **host-plane** registration is process-wide: registries, sandbox, approval
stack, persistence, the model route. Providers belong here, and a bundle patch
mounts here.

An **agent-plane** registration is per-session: tools, prompt sections, persona.
An agent preset mounts here.

If you publish a service from an agent preset, its row **must** sit inside a
group carrying an `isolate` realm. Without one it publishes into the root realm,
where it is process-global rather than per-session, and the second session
mounting that preset collides with the first. The preset loader rejects this at
mount rather than failing later.

The practical rule: mount a provider from a bundle patch on the host plane, and
mount the tool that consumes it from a preset on the agent plane.

## Verify before you debug

```sh
dsh --profile <profile> --dump-config
```

This prints the fully composed plugin tree without booting it, annotated with
which bundle contributed and patched each row. It needs no API key. Confirm your
row is present, is not `disabled: true`, and carries the config you expect
before looking anywhere else.
