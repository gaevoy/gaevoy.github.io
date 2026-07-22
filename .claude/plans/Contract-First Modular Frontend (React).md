# Plan: blog post — Contract-First Modular Frontend (React)

## Context

The repo [tmp/react/](/workspaces/gaevoy.github.io/tmp/react/) (from `gaevoy/gaev-modular-arch`, source: <https://github.com/gaevoy/gaev-modular-arch/tree/main/react>) is a complete, working demo of a modular React architecture: npm workspaces + Vite + inversify, three features, 11 ESLint architectural rules, contract/impl package split, lazy-loaded feature chunks resolved through an IoC container. It has never been written up. This post does that.

**Hard constraint, from the user:** the article is **fully independent** and written for React frontend developers who have never touched .NET and don't care that it exists. No comparisons to .NET, no C# snippets, no "the equivalent of `internal sealed`", no `Program.cs`/`AddUserFeature()` analogues, no "unlike the compiler-enforced version", and **no link** to the earlier .NET post. Every idea must stand on React/TypeScript terms alone. If a beat only makes sense as a contrast with another ecosystem, it doesn't belong in this post.

The demo repo happens to contain a `dotnet/` folder; always link to `.../tree/main/react` specifically and never draw attention to the sibling.

**Decisions already made with the user:**
- Name the pattern **"Contract-First Modular Frontend"** — leads with structure rather than claiming a guarantee.
- **Own "Gotchas" section** for the Vite/bundling war stories and the honest costs (mirrors the upcasting post's structure).
- Section skeleton: intro → Problem → Solution → Alternatives (+ Gotchas, Takeaways, Useful Links).
- Intro voice adapted from [2026-07-14-upcasting-frontend-schema-evolution.md](/workspaces/gaevoy.github.io/_posts/2026-07-14-upcasting-frontend-schema-evolution.md), plus a joke about why frontend candidates never get asked about SOLID.

## Deliverable

One new file: `/workspaces/gaevoy.github.io/_posts/2026-07-17-contract-first-modular-frontend-react.md`

Front matter, matching the two recent posts:

```yaml
---
published: true
title: "Contract-First Modular Frontend: Enforcing Boundaries in React"
description: How to stop your shared/utils folder from becoming a dumping ground — split a React app by business feature, expose contracts only, and let npm workspaces plus ESLint hold the boundary.
layout: post
tags: [react, typescript, frontend, architecture, modular-monolith, solid, vite]
comments: true
ai_assisted: true
---
```

No image needed — mermaid diagrams carry the visuals, and both recent posts render mermaid fine.

## Section-by-section

### Intro (before `<!--more-->`)

Adapt the upcasting post's opening move — backend and frontend developers are supposed to be different species, but we mostly borrow each other's tricks and rename them — rewritten so it doesn't read as a copy of that post. This is generic backend/frontend framing; it must not name a specific backend stack. Land on: the borrowed trick this time is the Dependency Inversion Principle, applied at the *bundle* level.

Then the joke. Angle: nobody asks a frontend candidate about SOLID. The interview is too busy with `useEffect` firing twice in StrictMode, `==` vs `===`, and centering a div. So the "D" quietly never comes up — not because frontend devs can't answer it, but because the interview never gets there. Two or three sentences, dry, no exclamation marks. Per [[writing-tone-no-overselling]]: a wry observation, not a dunk on frontend interviews.

`<!--more-->` after the intro.

### Problem

Open with the frontend black hole: `shared/`, `utils/`, `common/`, `components/common/`. It's the cheapest place to drop a thing, so everything drifts there, and it grows a kind of gravity. Two pains, stated briefly — cognitive overload (everything depends on `shared/`, `shared/` slowly depends on everything, the graph is a hairball) and ownership (shared means everyone owns it, which means nobody does).

Then the four problems that make this a React post. These carry the section:

1. **Every React tutorial teaches package-by-layer.** `components/`, `hooks/`, `services/`, `utils/`, `types/` is the default `src/` shape. A single "user" feature is smeared across five folders, none of which is *about* users. The dumping ground isn't an accident — it's the scaffold you started from.
2. **Nothing physically stops an import.** TypeScript has no `internal` and no package-private visibility. `import { UserService } from '../../features/user/UserService'` compiles, typechecks, and ships. Every module in the repo is reachable from every other by a relative path, so "don't import that" is a code-review opinion, not a rule.
3. **Barrel files are a boundary that isn't one.** An `index.ts` re-exporting a folder *looks* like a public API but re-exports everything — it hides nothing. It invites circular imports (file → barrel → file), and it defeats tree-shaking, so importing one symbol can drag in the whole chunk. Cite [tkdodo's "Please Stop Using Barrel Files"](https://tkdodo.eu/blog/please-stop-using-barrel-files) and the [Next.js tree-shaking issue](https://github.com/vercel/next.js/issues/12557). The rule of thumb worth quoting: a barrel belongs at the *published edge* of a package, not inside app code.
4. **On the frontend, coupling has a runtime price.** The one that makes this urgent rather than aesthetic: a stray import isn't just an architectural smell, it's bytes downloaded by every user on every route. You add `React.lazy` and a dynamic import, get a clean split, and then months later someone adds one innocent static import from a shared module — the split collapses, the build still passes, the tests still pass, and nobody notices. Architectural erosion here is *measurable in the Network tab*, which is unusual and worth leaning on. This sets up the Solution's real argument: the problem isn't getting a code split, it's keeping one.

Close by naming the axis change: split by business feature, not technical layer. Bridge into Solution.

### Solution

State DIP first — quote the [Wikipedia definition](https://en.wikipedia.org/wiki/Dependency_inversion_principle), it's the spine of the argument — then the reframing: features depend on each other's *contracts*, never on each other's *implementations*. Demo: three features — User, Currency, Dashboard — source at <https://github.com/gaevoy/gaev-modular-arch/tree/main/react>.

Package-type table, then the mermaid dependency graph adapted from [tmp/react/README.md](/workspaces/gaevoy.github.io/tmp/react/README.md) lines 73–115. Use brighter `classDef` colors than the README's (its palette is dark-mode-only); the blog needs both themes legible.

| Type | Allowed dependencies | Contains |
|---|---|---|
| `*-contract` | none | interfaces, props types, hook types, IoC symbols |
| `*-impl` | own contract + other contracts + `@gaev/container` | services, components, hooks, `register.ts` |
| `@gaev/app` | container + all contracts | `bootstrap.ts`, `App.tsx` |

Subsections, each anchored to real code quoted from the demo:

- **The contract is the public API** — `user-contract` in full (`IUser`, `IUserService`, `UserAvatarProps`, `UseCurrentUser`, `USER_SYMBOLS`). Two things to call out: contracts never import React (props are plain TS types; `*-impl` composes `ComponentType<Props>` at its own call site, which keeps the contract a pure description of *what a feature is*), and `Symbol.for()` uses the global symbol registry, so symbol identity survives chunk boundaries.
- **An entry point that exports nothing** — the key structural move, justified on TypeScript's own terms. TypeScript gives you no way to mark a module internal, so the demo inverts the barrel: `user-impl/src/index.ts` is one line, `import './register';`. It exports nothing at all. There is no name to import, so the container is the only door in. Contrast this with the barrel problem raised in Problem #3 — same file name, opposite job: a normal barrel exposes everything, this one exposes nothing and just wires the feature up as a side effect.
- **The container** — quote `container/src/index.ts` (47 lines, [tmp/react/container/src/index.ts](/workspaces/gaevoy.github.io/tmp/react/container/src/index.ts)). Two functions: `registerBundle` declares which symbols live in a lazy chunk, `resolveAsync` loads the chunk on demand and returns the binding. Highlight `bundle.loading ??= bundle.loader()` — one shared in-flight promise per bundle, and the settled promise doubles as the "already loaded" marker.
- **One wiring hook per feature** — `user-impl/src/register.ts`: `container.bind(...)` per symbol, using `toDynamicValue`/`toConstantValue`, no decorators and no `reflect-metadata` emit from user code. The React-specific point: *components and hooks are container-bound values too*, not just services. `USER_AVATAR` resolves to a `ComponentType`, `USE_CURRENT_USER` resolves to a hook function. Dependency injection usually stops at services; here it covers the UI.
- **The composition root** — `app/src/bootstrap.ts`. The only file in the app that names an implementation, and only behind `() => import(...)`. Everything else in the app knows contracts and symbols.
- **Pages come from the container** — `createLazyPage` in `App.tsx`. `React.lazy` accepts any async function returning `{ default: ComponentType }`, which is exactly what `resolveAsync` wrapped gives you. So Suspense becomes the loading UI for container resolution for free, and the app ends up with no page files at all.
- **Cross-feature calls go through contracts only** — `DashboardWidget.tsx`, with top-level `await Promise.all([...])` at module scope. Explain why it matters: by the time React renders, the injected values are plain module constants — no `useState` for dependencies, no loading flag, no wrapper component. The async work happens once, at module init, not per render.
- **Injecting a hook across a feature boundary** — `DashboardPage.tsx`, deserves its own short subsection. Because the hook is resolved *before* the component renders, it can be called unconditionally at the top — no Rules of Hooks violation, no conditional wrapper. That's the thing you normally can't do with an asynchronously-resolved hook.
- **Where the boundary meets the bundle** — the payoff section, and the one to get *right*. An earlier draft of this plan claimed "the DIP boundary and the code-split boundary are the same line" and that `user-impl` stays a separate chunk *because* dashboard can't reach in. **Both are false** — verified against source. Do not write them.

  What's actually true is three independent mechanisms that the demo lines up:

  1. **`manualChunks` creates the chunks.** [vite.config.ts:34](/workspaces/gaevoy.github.io/tmp/react/app/vite.config.ts) matches file paths with `/\/([\w-]+-impl)\//`. It splits on *path*, so it would produce a `user-impl` chunk whether or not contracts existed.
  2. **The dynamic `import()` makes them lazy.** `() => import('@gaev/user-impl')` in `bootstrap.ts` is what defers the fetch. Plain `React.lazy(() => import('./UserPage'))` gets you this with no contracts and no container.
  3. **The contract boundary keeps the split from silently collapsing.** This is the only part DIP contributes, and it's worth the section.

  So the honest framing: **the boundary doesn't create the split, it protects it.** Make that the argument. In a normal React app, code splitting is quietly fragile — one careless `import { UserService } from '../user/UserService'` anywhere reachable from the entry merges the feature back into the main chunk. The build still succeeds. The app still works. It's just slower, and nothing tells you. Here that import can't happen: `user-impl` isn't in `app`'s `package.json` dependencies, and `ARCH_APP_1` rejects it by name. The split survives contact with a team.

  **Also correct this, prominently:** contracts do *not* make `/dashboard` cheaper. `DashboardPage` and `DashboardWidget` top-level-`await` user and currency symbols, so visiting `/dashboard` fetches `dashboard-impl`, `user-impl` and `currency-impl`. A contract dependency is a build-time abstraction; at runtime the feature still needs a real implementation, and the bytes still arrive. What the contract buys is that dashboard is coupled to `IUserService`, not to `UserService` — replaceable, not free.

  The one genuinely new thing versus plain `React.lazy`: **`App.tsx` never names a module path.** It resolves `USER_PAGE`, a symbol. `bootstrap.ts` alone knows the path. Swap which bundle provides `USER_PAGE` and `App.tsx` doesn't change. That's a real, if modest, gain — state it at that size, don't inflate it.

  **No sizes anywhere in this section — no kB, no gzip figures, no build-summary paste.** Node isn't available in this container, so any number here would be invented. List the bundles and what's in each, nothing more.

  **No sizes anywhere in this section — no kB, no gzip figures, no build-summary paste.** Node isn't available in this container, so any number here would be invented. List the bundles and what's in each, nothing more.

  Two tables, in this order. First, every bundle the build produces and its contents (from [README.md](/workspaces/gaevoy.github.io/tmp/react/README.md) lines 240–247, cross-checked against the `manualChunks` rules in [app/vite.config.ts](/workspaces/gaevoy.github.io/tmp/react/app/vite.config.ts)):

  | Chunk | Contains | Comes from |
  |---|---|---|
  | `app` | `main.tsx`, `bootstrap.ts`, `App.tsx` | the entry, via `entryFileNames` |
  | `vendor` | react, react-dom | `manualChunks` rule |
  | `container` | `@gaev/container`, inversify, reflect-metadata | `manualChunks` rule — pinned deliberately, see Gotchas |
  | `contracts` | all three `*-contract` packages | `manualChunks` rule |
  | `user-impl` | `UserPage`, `UserService`, `UserAvatar`, `useCurrentUser` | the `/([\w-]+-impl)/` regex rule |
  | `currency-impl` | `CurrencyPage`, `CurrencyService`, `CurrencyInput`, `useConversion` | same regex rule |
  | `dashboard-impl` | `DashboardPage`, `DashboardWidget`, `DashboardService` | same regex rule |

  Worth calling out: the impl rule is a single regex, so a new feature gets its own named chunk with no config change. The first four chunks are the initial load; the impl chunks are not.

  Second, what the browser actually fetches per route — this is the table that makes the runtime story land:

  | Route | Chunks fetched | Notes |
  |---|---|---|
  | `/` | `app`, `vendor`, `container`, `contracts` | in parallel, all preloaded; **zero feature code** |
  | `/user` | `+ user-impl` | `createLazyPage` → `resolveAsync(USER_PAGE)`; Suspense fallback shows briefly |
  | `/currency` | `+ currency-impl` | same path, different symbol |
  | `/dashboard` | `+ dashboard-impl`, `user-impl`, `currency-impl` | three chunks, in parallel, one fallback — see below |
  | revisit any route | nothing | `bundle.loading` is already settled; no refetch |

  (Route paths are hash-based — `HashRouter` in `App.tsx` — so these are `/#/user` etc. in the address bar. Worth one clause, not a paragraph.)

  Then explain the dashboard row in prose — it's the design working end to end, *and* the honest limit. `dashboard-impl`'s modules top-level-`await` user and currency symbols, so its own loader promise can't settle until those chunks have loaded and registered too. All three arrive in parallel behind a single `<Suspense>` fallback, and by the time `DashboardPage` renders, everything it needs is already a resolved module constant. Nobody wrote that orchestration — it falls out of the contract graph. But say the other half plainly: this route costs three chunks. Depending on a contract instead of an implementation didn't remove the dependency, it just made it swappable.

  Land the point on what *is* defensible: the app entry ships zero feature code, and it isn't discipline keeping it that way. `app`'s dependencies are the container, three contracts, react and react-router — no impl. `bootstrap.ts` names impls only behind `() => import(...)`, and `ARCH_APP_1` rejects a static one by name. The interesting claim isn't that the split exists; it's that it can't quietly stop existing.
- **Enforcement: two layers** — (1) `package.json` dependencies, which is real and works at module-resolution level: `user-impl` simply has no currency package in its deps, so the import can't resolve. (2) `eslint.config.js` — 11 `ARCH_*` rules built from `no-restricted-imports` + `no-restricted-syntax` only, zero plugins. Include the rule-ID table (README lines 28–61). Quote two or three representative rule blocks rather than all eleven: the contract block (`ARCH_CON_3`/`ARCH_CON_4` — no classes, no functions, keeping contracts pure description) and `ARCH_APP_2` (dynamic impl imports only in `bootstrap.ts`, which needs `no-restricted-syntax` because `no-restricted-imports` never sees an `ImportExpression`). The `ARCH_*` tags surface verbatim in editor errors, so a violation traces straight back to a documented rule.
- **The folder is the feature** — one short paragraph. Feature folder = code + README + owner + CODEOWNERS entry, and it doubles as a clean context window for AI tooling: one self-contained feature loads without dragging in the app.

Then name it: **Contract-First Modular Frontend**. Be straight about the guarantee on TypeScript's own terms — `tsc` will happily compile a deep import into another feature's impl; nothing in the language refuses. What holds the line is the workspace dependency graph plus an ESLint rule, which means it holds exactly as long as `npm run lint` runs in CI. Leave it out of CI and it's a suggestion. Say this plainly rather than burying it.

### Alternatives

Prose intro, then the table. In the intro, place micro-frontends on the far side of a line: everything else in the table organizes *one* build, micro-frontends splits into *many* — separate builds composed at runtime, which is a different and usually larger bill (version drift, a shared React singleton to keep aligned across teams, integration contracts on top). The current mainstream guidance is a modular monolith by default and micro-frontends only when independent deployment is a genuine requirement — which is the same conclusion this post argues from the inside. One sentence, positioning not polemic; it also keeps "the container isn't free" honest by showing what a heavier boundary actually costs.

Close with "these compose, they don't compete": FSD answers *how do I organize files inside the app*; this answers *how do I stop features reaching into each other and make that boundary a bundle boundary*. Run FSD inside a feature's impl if you like — the contract at the edge doesn't care what happens behind it.

| Approach | Organizing idea | Pros | Cons |
|---|---|---|---|
| **`shared/` + folder-by-layer** (*the "before"*) | `components/`, `hooks/`, `services/`, `utils/` | Familiar; every tutorial's default | Features smeared across layers; `shared/` becomes the dumping ground; no owner |
| [Feature-Sliced Design](https://feature-sliced.design/) (+ [Steiger](https://github.com/feature-sliced/steiger)) | Layers × slices × segments; public API per slice; imports only point down | Real methodology, well documented, lintable; `@x` notation for cross-imports | Convention + linter, not the module system; the public API is still a barrel; says nothing about bundling |
| [Nx `enforce-module-boundaries`](https://nx.dev/docs/features/enforce-module-boundaries) | Tag libraries, declare which tags may depend on which | Mature, graph-aware, CI-friendly | Buys the whole Nx toolchain; tag rules get coarse as the repo grows |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) / [Sheriff](https://sheriff.softarc.io/) | Framework-agnostic rule engine over the import graph | Most flexible; finds cycles and orphans; folder-level rules | Another config language to learn; still advisory — it reports, it doesn't refuse |
| Barrel-file public API by convention | Each feature exposes `index.ts`; agree not to deep-import | Zero tooling | Nothing enforces it; barrels bring cycles and break tree-shaking |
| [Module Federation](https://module-federation.io/) / micro-frontends | Separate builds composed at runtime | True independent deployment | Heavy: version drift, duplicate React, integration contracts. Right answer only when independent deploys are a hard requirement |
| **Contract-First Modular Frontend** (this post) | Feature = contract package + impl package, wired in a composition root | One folder = one owner; the code split can't silently collapse; features are swappable at the composition root | More packages; an IoC container in the initial bundle; `resolveAsync` trades static checking for indirection; enforcement is lint, not the language |

### Gotchas

Sourced from [tmp/react/docs/ISSUES.md](/workspaces/gaevoy.github.io/tmp/react/docs/ISSUES.md), **each point re-verified against current source** — every fix that doc describes is present in today's `vite.config.ts`, so the file is accurate, not stale. Verification results are noted per point below; don't re-litigate them, but don't add unverified ones either. First-class content, not filler — the bundler quietly fighting the architecture is the most interesting part of the demo.

- **Rollup will bury your container inside a feature chunk.** The best story in the repo, and it pays off the `container` row in the bundle table. Without a `manualChunks` rule pinning `@gaev/container`, Rollup drops it — plus inversify and reflect-metadata — into whichever dynamic chunk wins its split, in practice `user-impl`. The app entry then cross-imports `user-impl` just to reach `registerBundle`, so the entire user feature loads on every route, including routes that never use it. The tell was the DevTools initiator flipping from the preload tag to `app-[hash].js`; confirmed by grepping the built chunks for the `Container` symbol and finding it in `user-impl`, not `app`. Pinning it to a named chunk restores the intent. The architecture was correct and the bundler quietly undid it — which is the real lesson: on the frontend the boundary isn't done until you've checked what shipped.
- **Vite preloads your lazy chunks.** *(Verified: `modulePreload.resolveDependencies` present at vite.config.ts:22–24.)* Vite statically reads the literal string in `() => import('@gaev/user-impl')` and injects `<link rel="modulepreload">` into `index.html`, so the impl fetches on the root page before anyone visits the route. The tell in DevTools is the initiator: `(index)`, i.e. a tag in the HTML. Fix: `modulePreload.resolveDependencies` filtering `-impl-` out. Note *why* this filter is right rather than a blanket disable — `vendor`, `container` and `contracts` are always needed and genuinely benefit from preloading; only impl chunks are meant to be lazy.
- **`build.target` is not `tsconfig`'s `target`.** *(Verified: `target: 'es2022'` present at vite.config.ts:21; Vite 5's default target independently confirmed as `['chrome87','edge88','es2020','firefox78','safari14']`, and top-level await needs es2022.)* TypeScript's `target` only affects typechecking; the actual transform is esbuild's, with its own target. Symptom: *"Top-level await is not available in the configured target environment."* A good one-line lesson: two tools, two `target` fields, and only one of them decides what ships.
- **Top-level `await` makes the whole module async.** It's what buys the clean injection, and it's a real constraint on what may import an impl module.
- **`reflect-metadata` is required even with zero decorators.** *(Verified: imported at container/src/index.ts:4 and again at main.tsx:1; the demo uses `toDynamicValue`/`toConstantValue` and no decorators anywhere.)* Surprising and worth a sentence: inversify's `Container` reads `Reflect.getMetadata` unconditionally at module load, so the polyfill has to be imported before any inversify code runs — decorators or not. (Skip ISSUES.md's issue #2 itself, which is a plan-vs-code doc inconsistency, not something a reader hits.)
- **`resolveAsync<T>(SYMBOL)` is a cast, not a check.** *(Verified at container/src/index.ts:36–43 — the generic is unconstrained, and `container.get<T>` is the only thing behind it.)* The strongest honest criticism of the approach, and it belongs in the post. Symbol-keyed resolution means TypeScript is trusting you about what's behind the symbol — a wrong or missing binding is a runtime error, not a red squiggle. You trade some static checking for the boundary. The demo's own JSDoc says it out loud: *"the bound value cast to `T`."*
- **A relative path walks straight through both guards.** *(Found by reading [eslint.config.js](/workspaces/gaevoy.github.io/tmp/react/eslint.config.js) — not documented in the repo. Verify once more before publishing, and mention it as an observation, not as a defect report.)* Every `ARCH_*` pattern anchors on `^@gaev/` or `^react`, so `import { UserService } from '../../features/user/user-impl/src/UserService'` matches none of them. And because a relative specifier never goes through node module resolution, the missing `package.json` dependency can't object either. Both layers of enforcement are keyed to *package names*, so a path that skips package names skips the enforcement. Closing it means an extra `no-restricted-imports` pattern for relative specifiers reaching into `*-impl`. This is the most honest thing in the post: it shows exactly where the guarantee ends, and it fits the "lint is not the language" theme rather than undercutting it.
- **The container isn't free.** inversify + reflect-metadata sit in the initial load on every page, and they're the largest thing the architecture itself adds. For three features that's a poor trade; it starts paying off as features multiply. Say this qualitatively — no size figure.
- **Lint only holds if it runs.** Restate as an operational fact: this is a CI job, not a language guarantee.
- Optional, brief: a lazy page load can fail (network), and `createLazyPage` has no error handling — an error boundary is the missing piece. Documented in the repo's `docs/plans/Page Error Handling.md` but **not implemented** in `App.tsx`, so phrase it as a known gap, never as something the demo does.

### Takeaways

Five or six bullets: don't feed the `shared/` black hole; slice by business feature, not technical layer; contracts are the only thing features share; an impl package that exports nothing has no way to be reached around; **code splitting is easy to get and easy to lose — the contract boundary is what stops a stray import from silently undoing it** (phrase it this way, not as "the boundary is the bundle"); enforcement is lint plus the workspace dependency graph, keyed to package names, so put it in CI and know its limits; it composes with FSD rather than replacing it.

Final bullet — the "baseline, not dogma" close, carried from the .NET post's last takeaway *("This is a baseline, not dogma. Stepping away from it is perfectly fine — just estimate the risk before you do.")* but **reworded so it doesn't read as a copy** — different sentence shape and wording, same idea. Reach for something like: reserve this weight for an app that has earned it — several features, more than one team, bundles you actually watch. On a small app the container and the extra packages cost more than the boundary returns, and reaching for a plain feature folder instead is a judgement call, not a failure — make it with the trade-off in front of you. Keep it to one or two sentences; don't reuse the phrases "baseline, not dogma", "perfectly fine", or "estimate the risk".

### Useful Links

Source code ([the react folder specifically](https://github.com/gaevoy/gaev-modular-arch/tree/main/react)), [DIP](https://en.wikipedia.org/wiki/Dependency_inversion_principle), [SOLID](https://en.wikipedia.org/wiki/SOLID), [tkdodo on barrel files](https://tkdodo.eu/blog/please-stop-using-barrel-files), [Feature-Sliced Design](https://feature-sliced.design/), [Steiger](https://github.com/feature-sliced/steiger), [Nx enforce-module-boundaries](https://nx.dev/docs/features/enforce-module-boundaries), [dependency-cruiser](https://github.com/sverweij/dependency-cruiser), [Sheriff](https://sheriff.softarc.io/), [inversify](https://inversify.io/), [Vite code splitting / `manualChunks`](https://rollupjs.org/configuration-options/#output-manualchunks), [Module Federation](https://module-federation.io/), [Modular Monolith](https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer). **No link to the .NET post.**

Close with a question inviting comments, matching both existing posts.

## Accuracy constraints

Two discrepancies surfaced during research — do **not** propagate them into the post:

- The demo README's Getting Started lists `npm run typecheck`, but **no such script exists** in `tmp/react/package.json` (only `dev`, `build`, `serve`, `lint`). Don't mention `typecheck`. Also: every package tsconfig sets `composite: true` but declares no `references`, so it isn't a real TS project-references graph — don't claim TS project references enforce anything here.
- README says the `vendor` chunk; a plan doc says `vendor-react`. The **code** says `vendor` — follow the code. Chunk names in both tables must come from the `manualChunks` rules in `app/vite.config.ts`, not from prose in the docs.

**No invented numbers.** Node isn't installed in this container (`node -v` → command not found), there's no `node_modules` and no `dist`, so the build cannot be run and no size can be verified. Per the user: list the bundles and their contents, and skip figures entirely. Do not paste a plausible-looking `vite build` summary, and do not carry over the `~52 kB` / `53 kB → 0.8 kB` figures that appear in `docs/ISSUES.md` — the Rollup story works on its mechanism and its DevTools evidence without them.

More generally: quote code from the actual files under [tmp/react/](/workspaces/gaevoy.github.io/tmp/react/), never from `tmp/react/docs/plans/*.md`. Those plan docs describe earlier drafts the code moved past — e.g. they show `export abstract class IUserService`, while the code uses a plain `interface`, per `ARCH_CON_3`.

## Verification

1. `jekyll serve` from the repo root (or the **🌐 Jekyll Serve** VSCode task) and open the post — confirm front matter parses, the excerpt cuts at `<!--more-->`, the mermaid diagram renders, both bundle tables render, and code fences highlight (`ts`, `tsx`, `json`, `js`).
2. Check the rendered page in **both light and dark** themes — the mermaid `classDef` colors must stay legible in each.
3. Cross-check every code snippet against its source file under [tmp/react/](/workspaces/gaevoy.github.io/tmp/react/) — verbatim, or honestly elided with `…`.
4. Confirm each external link resolves (particularly Steiger, Sheriff, and the Nx docs URL, which moved recently).
5. **Grep the finished post for `.NET`, `dotnet`, `C#`, `csproj`, `internal sealed`, `Program.cs`, `MSBuild`, `NuGet`, `assembly` — expect zero hits.** Then read it start to finish as if you'd never heard of .NET: every concept must be motivated by React/TypeScript facts alone.
6. **Grep the post for `kB`, `KB`, `kb`, `gzip`, and bare digit-plus-unit patterns — expect zero hits.** Every chunk name in the two bundle tables must appear in a `manualChunks` rule in `app/vite.config.ts`; every route row must correspond to a real `createLazyPage` call in `App.tsx`. Nothing in these tables may come from memory or plausibility.
7. **Re-check the two causal claims that were wrong in an earlier draft**, since they're the easiest to slip back into: (a) the post must never say the boundary *causes* the code split — `manualChunks` splits on file path and would do so regardless; (b) the post must never imply contracts stop `user-impl` loading on `/dashboard` — `DashboardPage.tsx` top-level-awaits `USE_CURRENT_USER`, so it loads. If a sentence sounds like either, rewrite it toward "the boundary protects the split" and "the dependency is swappable, not absent."
8. Read once more for tone against [[writing-tone-no-overselling]]: trade-offs prominent, no hype, the lint-isn't-the-language weakness and the relative-import hole stated plainly rather than buried.
