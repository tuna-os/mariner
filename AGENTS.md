# AGENTS.md — agent guide for tuna-os/mariner

A GTK4 + libadwaita file manager, written in **TypeScript running on node-gtk**
(not GJS), shipped as the `org.tunaos.mariner` Flatpak.

Human docs: [`README.md`](README.md) (features, keybindings),
[`CONTRIBUTING.md`](CONTRIBUTING.md), [`ROADMAP.md`](ROADMAP.md),
[`PLAN.md`](PLAN.md).

## Two facts to get right before touching anything

- **The default branch is `master`.** Every workflow targets it. Branch from
  it, target it.
- **This is a fork of [romgrk/mariner](https://github.com/romgrk/mariner)**,
  and `sync-upstream.yml` merges upstream `master` daily, opening a PR when
  there is anything to merge. Local divergence therefore has a recurring cost:
  a change that rewrites code upstream also owns, in a shape upstream would
  not accept, buys a merge conflict every time upstream touches it. Prefer
  changes that are upstreamable, or that live in files upstream does not have.

## Nothing runs the tests

`package.json` declares `test` (`node --test tests/*.test.ts`) and `typecheck`
(`tsc --noEmit`), and `biome.json` configures a formatter and linter. **No
workflow runs any of them.** The repo's three workflows are `publish-flatpak`,
`screenshots`, and `sync-upstream`.

What *does* gate a PR is `publish-flatpak.yml`, which builds (without
publishing) on pull requests — and the Flatpak build's `mariner` module runs
`npm run typecheck` as a build command. So **type errors are caught, but only
as a Flatpak build failure**, several minutes and a lot of unrelated machinery
away from the actual mistake. The unit tests and biome are caught nowhere.

The tests are cheap to run and need **no `node_modules` at all** — they import
`src/core/*.ts` directly and rely on Node's built-in type stripping:

```bash
node --test tests/*.test.ts   # 13 tests across 4 suites, ~0.3s, zero install
```

`npm run typecheck` does need dependencies installed.

## The Flatpak build does not use the committed lockfile

The repo commits `pnpm-lock.yaml`, but the manifest's build command is:

```
npm install --no-fund --no-audit && npm run typecheck && npm prune --omit=dev
```

`npm` reads `package-lock.json` / `npm-shrinkwrap.json` — never a pnpm
lockfile, and there is no npm lockfile here. Combined with
`build-args: ["--share=network"]`, **every Flatpak build resolves
dependencies afresh** against the `^` ranges in `package.json`. Two builds of
the same commit can therefore ship different `node-gtk` or `typescript`
versions, and a bad upstream release lands without a commit here. Updating
`pnpm-lock.yaml` does not change what ships.

## screenshots.yml photographs production, not your branch

It installs the **published** Flatpak from the `tuna-os` remote and captures
that, deliberately: a from-source node-gtk build in CI means native bindings
against GTK4 and gobject-introspection, a lot of moving parts between a code
change and a picture. Consequences worth knowing:

- It is path-filtered to `data/org.tunaos.mariner.metainfo.xml` and itself, so
  it does not run for ordinary changes.
- A failure can mean *the published app* is broken, not your branch.
- It photographs a staged `/tmp/demo-home`, because using the runner's real
  home leaked `actions-runner` and `work` folders into an app-store image.
- Captures are **uploaded as an artifact, never auto-committed** — the
  committed PNG is updated by someone who has looked at the artifact first.
  (Auto-committing is how a bad capture publishes itself; dualcut's captures
  intermittently carry a codec-error toast visible only in the image.)

## Don't "simplify" the publish expression

```yaml
publish: ${{ (github.event_name != 'workflow_dispatch' && github.event_name != 'pull_request') || (github.event_name == 'workflow_dispatch' && inputs.publish) }}
```

The obvious rewrite to `A && B || C` is wrong and was observed publishing from
a `workflow_dispatch` with `publish: false`: when `B` is falsy, `||` falls
through to `C`. Leave the explicit form.

## Sandbox shape

`finish-args` grants `--filesystem=host`, `--filesystem=home`,
`--talk-name=org.freedesktop.Flatpak` and `--system-talk-name=…UDisks2` — a
file manager needs all of it, and the `org.freedesktop.Flatpak` name is what
makes the `ptyxis` wrapper's `flatpak-spawn --host` work. Treat this as
approximately unsandboxed and review new host-facing code accordingly; do not
add permissions casually, and do not remove these expecting the app to work.
