# DSH Field Guide

An independent, evidence-marked field guide to **DeepSeek Harness** (`dsh`), plus a working
plugin built and verified against it.

**[Read the guide](https://ragnarpitla.github.io/dsh-field-guide/)**

---

## What this is

DeepSeek Harness is a plugin-based agent harness published by DeepSeek. It is moving fast —
eight release candidates shipped in the week this was written — and most of what circulates
about it is compressed from a handful of secondary sources, some of it wrong.

This repository is an attempt to do better on one narrow axis: **say how each claim was
checked**. Every factual statement in the guide carries a badge marking it as verified by
running the shipped binary, read from source, or taken from an external source. Where a
widely repeated claim turned out to be wrong, the correction is shown with its citation.

It is a photograph, not a map. The guide is pinned to commit `b150a55` of 2026-08-21
(version `0.1.1-rc.2`) and dated 2026-08-24. It is not maintained against later releases.

## Contents

| Path | What it is |
|---|---|
| [`docs/index.html`](docs/index.html) | The field guide. A single self-contained HTML file with no external CSS, JS or fonts — it opens offline by double-click, and is also served as the GitHub Pages site |
| [`plugins/dsh-plugin-dev/`](plugins/dsh-plugin-dev) | A working dsh plugin that teaches an agent how to extend dsh, verified against the real skill registry |

## The guide covers

- What a harness is, and three corrections to the usual framing
- What `dsh` is, at accurate scale — a real web session boots **104 active plugins**, not the 227 packages usually quoted
- Why "everything is a plugin" is precise shorthand rather than a literal claim, and where the genuine novelty probably is
- **Bundle vs profile vs agent preset** — the distinction nearly every secondary explanation conflates
- **Host plane vs agent plane**, and the `isolate` realm rule that makes a second session collide with the first
- The four presets that actually ship, read from the installed package
- Composition, layer order, and the no-deep-merge rule that will cost you an afternoon
- Writing a plugin: the proven three-file recipe and three traps
- The plugin ecosystem, measured rather than guessed
- **Security posture**, consolidated from a dozen package READMEs into one table
- How it compares to Claude Code, Codex CLI and Copilot CLI
- Six commonly repeated errors, corrected with citations
- How all of it was verified, including what was not

## The plugin

[`dsh-plugin-dev`](plugins/dsh-plugin-dev) ships two skills that teach an agent how to extend
the harness it is running inside — writing and installing a plugin, and debugging what a
profile actually loaded.

```sh
dsh plugin --profile <profile> add ./plugins/dsh-plugin-dev
```

Its content is the one body of knowledge that was verified end to end while writing the
guide, which is why it exists: the skills are accurate because each claim in them was
executed rather than read.

Verification is reproducible:

```sh
cd plugins/dsh-plugin-dev && node verify.mjs
```

This mounts the real `@deepseek-ai/dsh-skill` registry on a bare Cordis context and asserts
that both skills are discoverable, that bodies load with frontmatter stripped, and that the
config fields are honoured.

## Corrections

If something here is wrong, please open an issue. Claims are pinned to a commit and marked
with how they were checked specifically so that they can be argued with.

Known gaps are listed in the guide's final section. The largest: the binary exercised was
`0.1.0-rc.7` rather than the checkout's `0.1.1-rc.2`, and no model was ever invoked, so
nothing here describes how the agent behaves on a real task — only how the system is
assembled.

## Scope

This is a deep-dive on one harness. It is deliberately not a general treatment of harness
design — section 01 covers only enough of that to make the DeepSeek-specific material
legible, and stops there.

## Licence

MIT. See [LICENSE](LICENSE).

Independent and unofficial. **Not affiliated with, endorsed by, or sponsored by DeepSeek.**
"DeepSeek Harness" is used descriptively to identify the software described. Quoted
documentation and source excerpts remain the property of their respective authors and are
reproduced under the terms of the project's MIT licence for the purpose of commentary and
instruction.
