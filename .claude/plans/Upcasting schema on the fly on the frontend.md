# Blog post: Upcasting schema on the fly on the frontend

## Context

Volodymyr wants a new blog post for gaevoy.com (Jekyll/Pixyll) aimed at **frontend / TypeScript developers**, teaching **upcasting** — transforming an old persisted schema into the latest shape *on the fly, in the client, at read time* — as a way to evolve a frontend-owned data schema **without** backend SQL migrations or coordinated releases.

The angle he chose is cross-pollination: upcasting is a battle-tested **backend** trick (event-sourcing upcasters, Avro/Protobuf schema evolution) that solves a real **frontend** headache. This pairs naturally with his previous (backend-flavored) modular-monolith post and his stated full-stack journey.

Decisions locked with the user:
- **Title (final):** **"Evolving a Frontend Schema with Upcasting"** — plain and descriptive, no overselling.
- **Code:** **inline snippets only** — no companion repo, no playground link.
- **Framing:** **pure TypeScript** — barely mention React; frontend-native libs (redux-persist/zustand/IndexedDB) appear only as short "you already do this" callouts, not React-centric examples.
- **Tone: do not oversell.** Measured and honest — avoid hype verbs ("unblocks", "frees you", "no more"), don't pitch it as a silver bullet, keep trade-offs prominent (it's a technique with real costs, not a win), and let the humor stay dry rather than salesy.

Reference reading gathered: `parse, don't guess` (event-driven.io), Axon/Marten event versioning & upcaster chains, "The Dark Side of Event Sourcing" (SANER 2017) tactic taxonomy, Avro/Protobuf/Kafka schema-evolution compatibility, redux-persist & zustand persisted-state migrations. The `roninsway.dev/article/fe4f0735c499` link is a JS-rendered SPA that could not be auto-extracted — it will be included as a "related reading" link (ask user for its gist if it must be built upon).

## Deliverable

One new post file:

- **Path:** `_posts/2026-07-14-upcasting-frontend-schema-evolution.md` (Jekyll `YYYY-MM-DD-title` convention; permalink → `/2026/07/14/upcasting-frontend-schema-evolution.html`)

### Front matter (match existing posts, e.g. `_posts/2026-06-30-modular-monolith-dotnet-enforcing-boundaries-dependency-inversion.md`)

```yaml
---
published: true            # their convention; set false to stage first
title: "Evolving a Frontend Schema with Upcasting"
description: <1–2 measured SEO sentences: how to evolve a frontend-persisted state schema on the fly with upcasting, moving schema changes out of the backend migration/release cycle — trade-offs included>
layout: post
tags: [typescript, frontend, schema-evolution, upcasting, event-sourcing, zustand]
comments: true
ai_assisted: true
---
```

## Article structure

Follow the house pattern: personal intro → `<!--more-->` → `## Problem` → `## Solution` (with `###` steps) → backend-lineage enrichment → a dedicated **zustand** section (same example, in a tool readers use) → **comparison table** of alternatives → gotchas → `## Takeaways` → `## Useful Links` → closing question. Light humor throughout, **bold** key terms, inline `code` for identifiers, external links with `{:target="_blank"}`.

1. **Intro (before `<!--more-->`)** — full-stack story: bouncing between backend and frontend, noticing good patterns cross-pollinate both ways; here a backend event-sourcing trick fixes a frontend pain. Set up the hook with humor. (No hero image asset required — use the mermaid diagram in the Solution instead; a hero PNG under `/img/upcasting/` is optional and left to the user since assets can't be generated here.)

2. **`## Problem`** — Frontend persists its state through an API that stores it as an **opaque string** (JSON blob) — no server-side schema. The frontend wants to **evolve** that shape (rename, nest, restructure) over time. But the store/DB is another team's: frontenders can't touch the DB, backend must hand-write SQL to rewrite blobs, and running it must be **coordinated with the frontend release**. That cross-team + release-pipeline coupling is the pain. Land the core tension: **the data outlives the code that wrote it** — old blobs keep their old shape.

3. **`## Solution` — upcast on the fly** — Don't migrate stored data at all; read it as-is and **transform old shapes into the latest at the boundary**, every load. Walk the user's TS snippet in `###` steps:
   - `### Tag every version` — `schemaVer` discriminant + discriminated union `AnySchema = SchemaV1 | SchemaV2 | SchemaV3`; why a discriminator makes it type-safe/exhaustive.
   - `### One small step per version` — `upcastToV2`, `upcastToV3`: each a pure function moving exactly one version forward (this is the event-sourcing **upcaster chain** — one hop per version).
   - `### Chain to the latest` — the `upcast()` switch composing the hops (V1→V2→V3, V2→V3, V3 passthrough); note the `default` passthrough.
   - `### Upcast at the boundary` — the `reduce` over `apiResults` → everything becomes `SchemaV3`; the rest of the app only ever sees the newest shape. This is the **"parse, don't guess/validate"** boundary: parse the untyped blob into a typed, current-version model once.
   - Include a **mermaid diagram** of the chain (V1 →upcastToV2→ V2 →upcastToV3→ V3(latest); V2 →upcastToV3→ V3; V3 passthrough) — renders without an asset, matching the recent post's mermaid usage.
   - Payoff, stated plainly (not oversold): a shape change no longer needs a backend ticket or a coordinated release — traded against having to carry the upcasters yourself.

4. **`### Saving makes the upgrade stick`** (the key practical point) — The upcast is **virtual on read**, but you can **save the upcasted data at any point**, and since every save writes the **latest** shape, that record is now permanently V3 in the store. So a record is only upcast *until its next save*; from then on, reads return the latest schema directly with **no transform needed**. The store therefore **migrates itself organically** as users go about saving — old versions die out through normal usage, with no big-bang script and no backend involvement. (zustand's persist middleware does this automatically — it writes the upgraded state back right after migrating; the dedicated zustand section below shows exactly how.) Caveat for multiple consumers: if another client still reads the raw blob expecting an old shape, keep readers tolerant or **downcast on write** (write old+new for a transition window = Expand-and-Contract / Parallel Change; the "downcasting" from parse-don't-guess).

5. **`## An old backend trick`** (the "where else" enrichment) — short tour establishing upcasting is battle-tested on the backend:
   - Event sourcing: the **upcaster / upcaster chain** — Axon, Marten (upcast-on-read), EventStoreDB, RailsEventStore; the SANER-2017 taxonomy (versioned events, weak schema, upcasting, in-place transform, copy-and-transform).
   - Serialization / streaming: Avro (reader vs writer schema, defaults, aliases), Protobuf (field numbers), Kafka Schema Registry compatibility modes.
   - One-line bridge: it isn't only a backend move — your own frontend tools ship it, which is the next section.

6. **`## The same pattern, with zustand`** (dedicated section, user-requested; reuses the plain-TS example; **pure TypeScript, vanilla** `zustand/vanilla` `createStore`, no React hooks). Research verdict — it fits, on two verified points: (a) zustand's own docs demo `persist` on a **vanilla** store, so it stays pure-TS; (b) `StateStorage`/`PersistStorage` type `getItem`/`setItem` as `… | Promise<…>`, so a custom **async storage over the backend API** covers the article's persisted-blob case honestly, not just localStorage.
   - Reuse the **same** `upcastToV2`/`upcastToV3`/`upcast()` from the Solution — wire them straight into `persist`'s `migrate(persistedState, version)` with `version: 3`. Make it explicit: `migrate` ≈ the article's `upcast()`; you hand zustand the transforms, it decides *when* to run them.
   - Back `persist` with a tiny **custom async `PersistStorage`** over the API (`getItem`/`setItem` calling stub `apiGet`/`apiSet`), matching the article's scenario. zustand then detects the version mismatch, runs the chain, and **writes the upgraded blob back automatically** (the "saving makes the upgrade stick" behavior, confirmed in `persist.ts`).
   - Payoff (measured, not oversold): the `upcast()` you already wrote drops into `migrate` unchanged — the logic is portable; the tool only automates *when* it runs and *writing it back*. zustand doesn't replace the pattern, it hosts it.
   - Honest caveats: `persist` wraps state in its own `{ state, version }` envelope — fine if you own the blob, but if the backend expects raw domain JSON, map to/from it inside the custom storage; and the lib gives plumbing, you still own the transforms. One-liner relatives: `redux-persist` (`version` + `migrations` + `createMigrate`) does the same; browser-native **IndexedDB** `onupgradeneeded` is the eager version-bump cousin (not lazy-on-read).

7. **`## Alternatives`** — signature comparison **table** (Approach | How it works | Pros | Cons):
   - Backend SQL migration (eager/big-bang) — the status quo pain.
   - Versioned API endpoints (server owns schema) — clear contract, still backend-owned/coordinated.
   - Additive-only / **Tolerant Reader** (Postel's Law) — cheap, but schema rots (add-only, no restructure).
   - **Expand & Contract / Parallel Change** — write old+new, migrate, drop old; safe for many consumers, transition bookkeeping.
   - **Upcast on read (this post)** — frontend-owned, no SQL, restructure freely, lazy; cost is a growing upcaster chain.

8. **`## Gotchas`** (honesty beat) — growing upcaster stack (maintenance + tiny per-read cost; largely self-limiting because saves persist upgrades, per the "Saving makes the upgrade stick" section — records that are still being touched migrate themselves); must keep old shapes documented while un-saved old blobs exist; **test each hop** with per-version fixtures — internal-link to his own [How to test serialization](/2019/06/27/how-to-test-serialization.html); add a TS `never` exhaustiveness check in `default` so a new `SchemaV4` without an upcaster is a compile error; do the upcast at **one** boundary, don't sprinkle `schemaVer` checks everywhere.

9. **`## Takeaways`** — bulleted recap (API-as-string means the frontend owns the schema; tag + one pure upcaster per hop + chain at the boundary; upcasting is virtual on read but **saving persists the upgrade**, so the store migrates itself and old versions fade out on their own; removes the backend-SQL-and-coordination step for a schema change; same proven pattern as event sourcing/Avro/redux-persist; mind the growing chain, test every hop).

10. **`## Useful Links`** — curated, `{:target="_blank"}`: parse-don't-guess (event-driven.io), Axon event versioning, Marten event versioning, "Dark Side of Event Sourcing" (SANER 2017), redux-persist migrations, zustand persist, Confluent/Avro schema evolution, Fowler's Tolerant Reader & Parallel Change, Alexis King "Parse, don't validate", the roninsway.dev related article.

11. **Closing question** inviting comments (e.g. "Ever smuggled a backend pattern into your frontend — or the reverse? Tell me below.").

## Conventions to reuse (with sources)

- Post skeleton, front-matter keys, `<!--more-->`, `## Useful Links`, closing question, mermaid usage: `_posts/2026-06-30-modular-monolith-dotnet-enforcing-boundaries-dependency-inversion.md`.
- Humor/tone calibration: `_posts/2024-10-22-using-csharp-12-in-dotnet-framework-guide.md`.
- Comparison-table format ("How this compares to the usual suspects"): same modular-monolith post.
- Internal-link format `](/YYYY/MM/DD/title.html)` (from `_config.yml` permalink) → tie-in to `_posts/2019-06-27-how-to-test-serialization.md`.
- Excerpt separator + kramdown/GFM/Rouge per `_config.yml` and `.claude/CLAUDE.md`.

## Verification

- Preview locally: run `jekyll serve` (VSCode task **🌐 Jekyll Serve**) and open the post at `/2026/07/14/upcasting-frontend-schema-evolution.html`.
- Confirm: excerpt cut at `<!--more-->` on the index; front matter renders (title/tags); all TypeScript code blocks are Rouge-highlighted and the snippets are self-contained and type-check (sanity-check by pasting into the TS Playground — no playground link is shipped, per the inline-only decision); the mermaid chain diagram renders; every external link opens in a new tab; the internal 2019 link resolves.
- Sanity-check `published: true` before pushing (pushing `master` publishes the site).
