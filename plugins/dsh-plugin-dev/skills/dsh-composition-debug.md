---
name: dsh-composition-debug
description: Diagnose what a DeepSeek Harness profile actually loads using the keyless config dump, and reason correctly about bundles, profiles, agent presets and patch layer order.
whenToUse: Use when a plugin does not appear to take effect, when configuration seems to be ignored or reset, or when you need to establish which plugins a profile really composes rather than guessing from package counts.
---

# Debugging a DSH composition

Most "my plugin does not work" problems are composition problems, and all of
them are answerable without an API key.

## Start here

```sh
dsh --profile <profile> --dump-config          # composed tree, including your layers
dsh --profile <profile> --dump-default-config  # what the bundles alone produce
```

Both print the fully composed plugin tree **without booting it** and without
calling a model. The output carries provenance comments naming which bundle
contributed each row and which bundle patched it:

```yaml
# == @deepseek-ai/dsh-base
- id: timer
  name: '@deepseek-ai/cordis-plugin-timer'
# == @deepseek-ai/dsh-base, patched by @deepseek-ai/dsh-web-app
- id: hmr
  name: '@deepseek-ai/cordis-plugin-hmr'
  config:
    root: [.]
  disabled: true
```

Three checks, in order:

1. **Is your row present at all?** If not, the bundle is not in
   `dsh.profile.bundles`, or its `cordis.patch.yml` `name` does not match its
   package name exactly.
2. **Is it `disabled: true`?** A later layer can disable a row you inserted.
   The provenance comment names which bundle did it.
3. **Is its `config` what you expect?** If a field you set has vanished, read
   the layer-order section below.

## Three concepts that are easy to conflate

| Concept | What it is | Who owns it |
|---|---|---|
| **Bundle** | An installable npm package contributing one patch layer, declared by `dsh.bundle.patch` | The plugin author — this is what you publish |
| **Profile** | A directory under `$DSH_HOME/profiles/<name>` holding an ordered bundle list plus your own patch layer; selected with `--profile` | The user, maintained via `dsh plugin` |
| **Agent preset** | A per-session composition mounted under one agent's scope — what the UI calls a "mode" | The deployment, or you, by copying one |

Nothing is both. A bundle is what you distribute; a profile is what a user boots;
a preset is what one session sees.

## Layer order

A profile composes over an empty root in this order:

1. each bundle's patch, in `dsh.profile.bundles` order
2. the profile's own `cordis.patch.yml`
3. `$DSH_HOME/cordis.patch.yml`
4. any `--patch` overlays, in the order given

**Later layers win per row, and a patch replaces a row's entire `config`. There
is no deep merge.** If you patch a row to change one field, restate every other
field you want to keep. A silently reset sibling field is almost always this.

## Counting what actually runs

Package counts in the repository are not deployment counts. Ask the binary:

```sh
dsh --profile web --dump-config | grep -c '^- id:'       # composed rows
dsh --profile web --dump-config | grep -c 'disabled: true'
```

For reference, on `dsh` 0.1.0-rc.7: `web` composes 129 rows of which 25 are
disabled (104 active), `headless` composes 81 rows with 2 disabled (79 active),
and `dsh-base` alone composes 78 rows with 1 disabled (77 active). A profile
holding base alone boots cleanly and then idles, because no app bundle means no
interface.

## When the composition is right but nothing happens

If your row is present, enabled and correctly configured, the next suspect is
the provider/consumer split. Registering a provider does not expose a tool to
the model; the matching consumer plugin must also be in that agent's
composition. Grep the dump for it:

```sh
dsh --profile <profile> --dump-config | grep -A1 'id: tool-'
```

After that, check plane placement: a service published from an agent preset
without an `isolate` realm is process-global rather than per-session, and the
preset loader rejects that at mount.

## Useful invariants

- The shipped `web` and `headless` profiles are created on first use; dumping a
  config is enough. An arbitrary profile name is **not** auto-created and
  composes zero rows until `dsh plugin add` seeds it with `dsh-base`.
- `dsh plugin add` appends the package to `dsh.profile.bundles` for you, after
  `dsh-base`, so it patches base rather than being patched by it.
- Misconfiguration is designed to fail loudly at load when it is
  self-contained, so a silent no-op usually means composition, not validation.
