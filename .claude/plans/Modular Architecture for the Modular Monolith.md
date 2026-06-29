# Plan: Blog post — Modular Architecture for the Modular Monolith

## Context

Volodymyr wants a new technical blog post for gaevoy.com about **modular architecture
applied to a modular monolith** in .NET. The motivation is 20 years of pain with
catch-all `Core`/`Kernel`/`Shared`/`Common`/`Utils` libraries that grow unbounded and
end up owned by everyone (i.e. no one). The post argues for splitting by **business
feature** instead of technical layer, enforcing boundaries with the **Dependency
Inversion Principle (DIP)** at the assembly level, and uses the demo project in
`tmp/dotnet` (published at https://github.com/gaevoy/gaev-modular-arch) as the worked
example.

Audience: strong juniors and mid-level C# devs. Tone: easy to read, light humour,
matching Volodymyr's existing voice (see the three reference posts). Structure must
follow his usual shape: **intro/background → Problem → Solution → Takeaways**.

Decisions confirmed with the user:
- **Diagram:** use a Mermaid `flowchart` (he will add Mermaid rendering support to the
  blog later). Reuse the graph already in the demo README.
- **Source link:** https://github.com/gaevoy/gaev-modular-arch
- **Scope:** keep it pure .NET — no React/npm references (the demo README mentions a
  React origin; do NOT carry that into the article).
- **Comparison section (new ask):** research similar named architectures (Hexagonal /
  Ports & Adapters, Clean / Onion, Vertical Slice, layered/package-by-layer, Modular
  Monolith) and add a *separate section* with a quick pros/cons table. Suggest a name
  for our approach, suggest where the section goes, and address whether it belongs
  inside Solution. Recommendations below — all open to the user's edits on review.
- **DIP quote (new ask):** add a short blockquote defining DIP with a Wikipedia link,
  in the same style as the "Beware of decimals" post
  (`> quote — [Source](url){:target="_blank"}`).
- **Link reliability (new ask):** prefer **Wikipedia** for concept links (stable, low
  link-rot). Wikipedia has dedicated articles for DIP, SOLID, Hexagonal architecture
  (which also documents Clean/Onion as variants), and Multitier/layered architecture.
  Use canonical author/blog links **only** where Wikipedia has no article — that's just
  Vertical Slice (Jimmy Bogard) and Modular Monolith (Kamil Grzybek).
- **Name the `Core`/`Shared`/`Common` pattern (new ask):** identify and compare the
  thing the article argues against. It's an *abused DDD Shared Kernel* that decays into
  a *Big Ball of Mud*. Add it as the "before" row in the comparison table and name it in
  the Problem section. Big Ball of Mud has a Wikipedia article; Shared Kernel does not
  (link DevIQ).
- **Coined name (new ask):** coin a funny, reusable label; finalists **The Black Hole**
  and **The Death Star** (final pick deferred — "keep it in plan for now"). 10 candidates
  recorded below.
- **Multiple shared projects → chaos (new ask):** in the Problem section, speculate on
  the realistic escalation — one `Common` becomes many (`Common.Core`, `Shared.Models`,
  `Utils`, `Framework`…), producing dependency hell / circular references, a convention
  vacuum (no one knows where a new class goes), and lost rationale (no one knows why a
  class is where it is).

## Style notes distilled from reference posts

- First person, conversational, a joke or two per section but never goofy
  ("our trusty old friend that refuses to retire", "Good job SQL Server team confusing
  people"). Keep humour in the prose, not in code.
- Opens with a relatable real-world framing before any code.
- `## Problem` then `## Solution` are explicit H2 sections; ends with `## Takeaways`
  (bullets) or `## Conclusion` + a warm "drop a comment" closing line.
- Code fences are tight and real; prose explains the *why* after each snippet.
- Links use `{:target="_blank"}`. Inline code with backticks for type/keyword names.
- Often a "Useful Links" / source-code section near the end.

## Deliverable

One new file: `_posts/2026-06-29-modular-architecture-for-modular-monolith.md`
(Jekyll requires `YYYY-MM-DD-title.markdown|.md`; existing posts use `.md`. Date
2026-06-29 = today.)

### Front matter

```yaml
---
published: true
title: Modular Architecture that fits a Modular Monolith
description: How to stop your Core/Shared/Common library from becoming a dumping ground — split a .NET modular monolith by business feature and enforce boundaries with the Dependency Inversion Principle and project references.
layout: post
tags: [dotnet, dotnet-core, csharp, architecture, modular-monolith, solid]
comments: true
---
```

### Section-by-section outline

1. **Intro / background (no heading, before `## Problem`)**
   - 20 years in .NET, dozens of projects; the most irritating recurring sight is the
     project named `Core` / `Kernel` / `Shared` / `Common` / `Utils`.
   - Why it happens: devs want to reuse code across projects, so they grow a shared
     library. Totally reasonable at first.
   - Optional small image hook (Volodymyr often adds one — leave a placeholder comment
     noting an image *could* go here under `/img/`, but do not invent an asset).

2. **`## Problem`**
   - The shared lib keeps growing until nobody knows what's inside ("the junk drawer of
     the codebase").
   - Two concrete pains: (a) cognitive overload / tangled dependency graph where
     everything depends on everything; (b) **ownership** — it's shared, so everyone owns
     it, which means no one does. A change in `Common` can ripple anywhere.
   - Frame it around layering: splitting by technical layer (`Data`, `Models`,
     `Services`) pushes every feature's bits into shared horizontal buckets, which is
     what feeds the catch-all libraries.
   - **It rarely stays ONE shared project (user ask — speculate a bit).** The first
     circular-reference forces a split: `Common` can't reference `DataAccess` without a
     cycle, so someone spawns `Common.Core`. Then `Common.Utils`, `Shared`,
     `Shared.Models`, `SharedKernel`, `Company.Framework`… a whole constellation of
     catch-alls. Three things follow, and they compound:
     - **Dependency hell & cycles:** the reference graph turns to spaghetti; sooner or
       later you get `Utils → Core → Utils` (or, if they're NuGet packages, the
       version-conflict flavour), and the build fights back. The usual "fix" is to merge
       two of them — which just makes the ball bigger.
     - **Convention vacuum:** there's no written rule for *where a new class goes*. Does
       a new DTO belong in `Common.Models`, `Shared.Contracts`, or `Core.Dto`? Devs pick
       "wherever it compiles" or copy the nearest neighbour — cargo-culting that speeds
       up the entropy.
     - **Lost rationale:** *why is `StringExtensions` in `Core` but `DateExtensions` in
       `Utils`?* Nobody knows. `git blame` says it moved during some 2019 refactor and
       the reason left with the dev who did it. Archaeology, not architecture.
   - **Name the beast (user ask — give the pattern a name to compare against):** the
     catch-all `Common`/`Core` is really an *abused DDD Shared Kernel*. A Shared Kernel
     is meant to be a tiny, deliberately-coordinated shared subset between modules; in
     practice `Common` becomes an unbounded dumping ground. Land the research line:
     *a utility library is not a Shared Kernel* — mixing technical commonality with
     domain sharedness is the category error. Left unchecked it slides into a
     *Big Ball of Mud*. Link both (Big Ball of Mud → Wikipedia; Shared Kernel → DevIQ,
     no WP page). This is the named "before" that the comparison table contrasts with.
   - **Coin the funny name here** so the rest of the article can call back to it. Pick
     one of the finalists (**The Black Hole** / **The Death Star** — final choice TBD,
     see candidate list further down). Introduce it once, then reuse it in the table row
     and Takeaways.
   - Keep it short and punchy; land the "no owner" point hard.

3. **`## Solution`**
   - DIP is the "D" in SOLID — everyone quotes it in interviews, few apply it daily.
   - **DIP blockquote** (style matches the decimals post). Use the canonical Wikipedia
     definition, verbatim:
     ```markdown
     > High-level modules should not import anything from low-level modules. Both should depend on abstractions (e.g., interfaces). Abstractions should not depend on details. Details (concrete implementations) should depend on abstractions. — [Wikipedia: Dependency inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle){:target="_blank"}
     ```
     Then one plain-English line: depend on abstractions, not concretions — in our case
     features depend on each other's `*.Contracts`, never on `*.Impl`.
   - Key reframing: **split by business feature, not by layer.** One folder per feature
     = one boundary = one owner.
   - Walk through the demo (`gaev-modular-arch`), three features: **User**, **Currency**,
     **Dashboard**.
   - **Project types table** (from demo README): `*.Contracts` (interfaces + DTOs, zero
     deps), `*.Impl` (own contracts + other features' *contracts* only, never another
     Impl), `Gaev.Host` (the only place wiring contracts→impls).
   - **Mermaid dependency graph** — reuse the `flowchart BT` from
     `tmp/dotnet/README.md` (User/Currency/Dashboard contracts+impl, Host on top, with
     the classDef colouring). This is the centrepiece visual.
   - **Code walkthrough** (small, real snippets pulled from the demo):
     - A contract: `IUserService` + `UserDto`/`CreateUserRequest`
       (`features/user/Gaev.User.Contracts/`).
     - The `RegistrationExtensions` convention — `AddUserFeature()` /
       `UseUserFeature()` (`features/user/Gaev.User.Impl/RegistrationExtensions.cs`).
       Explain it's the one wiring seam each feature exposes.
     - **Cross-feature injection**: `DashboardService` ctor takes `IUserService` +
       `ICurrencyService` from *contracts* and never references the other Impls
       (`features/dashboard/Gaev.Dashboard.Impl/DashboardService.cs`). Pair with the
       `.csproj` showing it references only `*.Contracts`.
     - `Program.cs` in Host: the two chains (`AddXxxFeature()` then `UseXxxFeature()`)
       — the host orchestrates, doesn't know concrete types.
   - **The boundary is enforced by `.csproj` references, not by code review** — an Impl
     simply has no `<ProjectReference>` to another Impl, so it physically cannot reach
     in. This is the punchline of the whole approach.
   - Briefly mention the `internal sealed` service choice (boundary made tangible; the
     only way to get an instance is via the interface through DI) — quote the demo's
     note, keep it short, mention `[InternalsVisibleTo]` for tests as the escape hatch.

4. **`## How this compares to the usual suspects`** (NEW section — see naming/position
   recommendations below)
   - One-paragraph framing: this isn't a brand-new architecture; it's a **Modular
     Monolith** organized **by feature** with a **contract/impl split** and **DIP**
     holding the boundary. Worth knowing where it sits next to the names people throw
     around in design reviews.
   - **Link each architecture name the first time it appears** (inline,
     `{:target="_blank"}`, matching his habit of linking concepts). **Wikipedia-first**
     for stability; canonical author link only where Wikipedia has no article. Verified
     URLs:
     - Hexagonal / Ports & Adapters → https://en.wikipedia.org/wiki/Hexagonal_architecture_(software) (Wikipedia)
     - Clean / Onion → same Wikipedia article (documents Onion & Clean as variants; no standalone WP page). Optional deeper dive: Uncle Bob — https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
     - Layered / package-by-layer → https://en.wikipedia.org/wiki/Multitier_architecture (Wikipedia)
     - Vertical Slice → *no Wikipedia article* → https://www.jimmybogard.com/vertical-slice-architecture/ (Jimmy Bogard, canonical)
     - Modular Monolith → *no Wikipedia article* → https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer (Kamil Grzybek, canonical)
     - Shared Kernel (DDD) → *no Wikipedia article* → https://deviq.com/domain-driven-design/shared-kernel/ (DevIQ, canonical)
     - Big Ball of Mud → https://en.wikipedia.org/wiki/Big_ball_of_mud (Wikipedia; redirects to "Spaghetti code", which calls out promiscuously-shared global code)
   - **Suggested name for our approach:** *Feature-sliced Modular Monolith* (primary).
     The distinguishing trait to call out: each feature's `*.Contracts` project is its
     **public API / port**, `*.Impl` is private. Alternatives to offer the user:
     *Contract-first feature modules*, *Package-by-feature with DIP*. (User asked me to
     suggest — these are suggestions, not locked.)
   - **Comparison table** (quick pros/cons; keep it scannable):

     | Approach | Organizing idea | Pros | Cons |
     |---|---|---|---|
     | **The Black Hole / The Death Star** (coined name TBD; catch-all `Core`/`Common` = abused DDD Shared Kernel — the "before") | One shared project every feature references — then several (`Common.Core`, `Utils`, `Shared.Models`…) | Reuse is instant; one obvious home for cross-cutting helpers | Grows unbounded; multiplies into cyclic dependency-hell spaghetti; owned by everyone = owned by no one; no convention for where classes go; one change ripples everywhere |
     | Layered / package-by-layer | Group by technical role: `Data`, `Services`, `Models` | Familiar, fast to start | Features smeared across layers; breeds `Core`/`Shared` dumping grounds; no per-feature owner |
     | Clean / Onion | Concentric layers, dependencies point inward to the domain | Domain isolated from I/O; testable core | Ceremony-heavy; tells you *how to layer*, not *how to split features* |
     | Hexagonal (Ports & Adapters) | Domain core + ports (interfaces) + adapters (impls) | Swappable I/O; tech-agnostic core | Same gap on feature split; overkill for small apps |
     | Vertical Slice | Organize end-to-end by request/feature | High cohesion, little indirection | Boundaries by convention — drift unless enforced |
     | **Feature-sliced Modular Monolith (this post)** | Feature modules, `Contracts`/`Impl` split, wired in a Host | One folder = one owner; boundary enforced by project refs; extract to a service later with little churn | More projects; DI wiring lives in the Host |

   - **They compose — they don't compete.** Hexagonal/Clean answer "how do I structure
     the *inside* of a module"; this answers "how do I split the system into modules and
     stop them reaching into each other." The `*.Contracts` project *is* the Hexagonal
     "port", applied per feature. If one feature's `Impl` gets hairy, run Clean
     Architecture inside it — the boundary doesn't care.
   - **Position recommendation:** standalone `##` section placed **after `## Solution`,
     before `## Takeaways`**. Keep it a sibling, **not** a subsection of Solution — the
     Solution stays focused on the demo; this section is reflective context. It builds on
     Solution, so it reads naturally right after it. (Directly answers the user's "can it
     be part of solution?" — recommend *no*, keep it adjacent.)

5. **`## Takeaways`** (bullets — suggested, user asked me to suggest)
   - Catch-all `Core`/`Shared`/`Common` libraries scale badly: no clear contents, no
     clear owner. (Call back to the coined name — The Black Hole / The Death Star.)
   - Slice by **business feature**, not by technical layer.
   - Make `*.Contracts` the only thing features share; keep `*.Impl` private.
   - Let **project references be the guardrail** — the compiler enforces the boundary
     for free, no discipline required.
   - DIP isn't just an interview answer; the Host wiring is where you actually apply it.
   - It **composes** with Clean/Hexagonal — use them inside a feature's `Impl`; the
     `Contracts` boundary doesn't care.
   - **This is a baseline, not dogma.** Stepping away from it is fine — just estimate
     the risk before you do (this is the user's explicit closing message).

6. **`## Useful Links`** (matches the csharp12 post's "Useful Links" section; all
   `{:target="_blank"}`; **Wikipedia-first** for reliability)
   - Source code — https://github.com/gaevoy/gaev-modular-arch
   - Dependency Inversion Principle — https://en.wikipedia.org/wiki/Dependency_inversion_principle (Wikipedia)
   - SOLID — https://en.wikipedia.org/wiki/SOLID (Wikipedia)
   - Hexagonal architecture (also covers Clean/Onion) — https://en.wikipedia.org/wiki/Hexagonal_architecture_(software) (Wikipedia)
   - Multitier (layered) architecture — https://en.wikipedia.org/wiki/Multitier_architecture (Wikipedia)
   - Vertical Slice Architecture — https://www.jimmybogard.com/vertical-slice-architecture/ (Jimmy Bogard; no WP article)
   - Modular Monolith — https://www.kamilgrzybek.com/blog/posts/modular-monolith-primer (Kamil Grzybek; no WP article)
   - Shared Kernel (DDD) — https://deviq.com/domain-driven-design/shared-kernel/ (DevIQ; no WP article)
   - Big Ball of Mud — https://en.wikipedia.org/wiki/Big_ball_of_mud (Wikipedia)

7. **Closing line** — warm, "tried this in your monolith? drop a comment" in his voice.

### Coined name for the anti-pattern (user pick — 10 candidates)

Coin a funny, memorable label for the `Core`/`Shared`/`Common` catch-all so the article
can name it once and call back to it (Problem → comparison table row → Takeaways). The
chosen name replaces the table row label "Shared `Core`/`Common` library" and gets
introduced in the Problem section (still parenthetically tying it to *abused Shared
Kernel → Big Ball of Mud* for credibility).

> **Finalists (user's pick — final choice deferred, "keep it in plan for now"):**
> **#5 The Black Hole** and **#6 The Death Star**. Decide between them when drafting —
> or use one as the primary coined name and drop the other in as a one-line aside (they
> share a "gravity / single point everything orbits" vibe, so they pair well).

1. **The Tragedy of the Commons** *(strong alternative)* — real economics term for a
   shared resource everyone overuses and nobody maintains; puns on `Common`; nails the
   "owned by everyone = owned by no one" point.
2. **The Junk Drawer** — the kitchen drawer of dead batteries, takeout menus, and
   mystery keys. You *know* it's in there. Good luck finding it. (Already hinted in the
   Problem section; safe classic.)
3. **The Kitchen Sink** — because it contains everything but.
4. **The God Library** (a.k.a. `God.dll`) — the God Object's bigger cousin: one assembly
   that knows everything and does everything.
5. **The Black Hole** ⭐ *(finalist)* — code falls in, every dependency bends toward it,
   nothing escapes.
6. **The Death Star** ⭐ *(finalist)* — one project the whole solution depends on; a tiny
   change is the thermal-exhaust-port that blows up the build.
7. **The Utility Belt** — Batman's `Utils`: a gadget for every occasion, strapped onto
   everyone.
8. **The Everything Bagel** — everything, everywhere, all in one assembly.
9. **The Common Cold** — a `Common` that infects every project; reference it once and you
   can never shake it.
10. **The Hoarder's Attic** — "we might need this someday" storage that never gets
    cleaned out.

(Spare ideas if none land: The Gravity Well, The Landfill, Pandora's Box, Frankenlib.)

### Things to reuse verbatim/near-verbatim from the demo
- Mermaid `flowchart BT` block → `tmp/dotnet/README.md` lines 32–72.
- Project-types table → README lines 19–24.
- Snippets already minimal in the repo; copy and trim, don't invent new APIs.

### Things to avoid
- No React / npm workspaces / inversify mentions.
- Don't oversell ("microservices killer", etc.) — it's a pragmatic monolith pattern.
- Don't enumerate every file; show the representative ones above.

## Critical files

- **Create:** `_posts/2026-06-29-modular-architecture-for-modular-monolith.md`
- **Read/reuse (source material, do not modify):**
  - `tmp/dotnet/README.md` (graph, tables, narrative)
  - `tmp/dotnet/Gaev.Host/Program.cs`
  - `tmp/dotnet/features/user/Gaev.User.Contracts/{IUserService.cs,UserDto.cs}`
  - `tmp/dotnet/features/user/Gaev.User.Impl/RegistrationExtensions.cs`
  - `tmp/dotnet/features/dashboard/Gaev.Dashboard.Impl/{DashboardService.cs,Gaev.Dashboard.Impl.csproj}`
  - `tmp/dotnet/features/currency/Gaev.Currency.Contracts/ICurrencyService.cs`
- **Reference patterns:** the three reference posts for tone/structure; existing
  `_posts/*.md` for front-matter conventions.

## Research (for the comparison section)

- DIP canonical definition — https://en.wikipedia.org/wiki/Dependency_inversion_principle
- Vertical Slice vs Clean vs Ports & Adapters — https://codeopinion.com/is-vertical-slice-architecture-better-than-clean-architecture-or-ports-and-adapters/
- Clean Architecture + Modular Monolith experience — https://www.thereformedprogrammer.net/my-experience-of-using-the-clean-code-architecture-with-a-modular-monolith/
- Compare architecture styles (Clean / Modular Monolith / VSA) — https://sachinsu.github.io/posts/comparearchitecturestyles/
- Package by Layer vs Package by Feature — https://medium.com/sahibinden-technology/package-by-layer-vs-package-by-feature-7e89cde2ae3a
- Modular Monolith & "package by component" (Simon Brown) — https://simonbrown.je/modular-monolith/
- Shared Kernel (DDD) — https://deviq.com/domain-driven-design/shared-kernel/ ; "a utility library is not a Shared Kernel" — https://mehmetozkaya.medium.com/shared-kernel-pattern-in-domain-driven-design-ddd-21cba2a9f92a
- Big Ball of Mud (Wikipedia → Spaghetti code) — https://en.wikipedia.org/wiki/Big_ball_of_mud

Takeaway from research: our approach is a **Modular Monolith** using **package-by-feature**
+ a **contract/impl split** enforced by **DIP**. It is complementary to Clean/Hexagonal
(which govern intra-module structure), closest in spirit to Vertical Slice + Simon Brown's
"package by component". The article should present it as "where it fits", not "the one true
way".

## Verification

- `jekyll build` (or the **🌐 Jekyll Serve** VSCode task) builds with no errors and the
  post appears in `_site/`.
- Confirm front matter parses and the post shows on the index (date not in the future
  relative to Jekyll's `future: false` if set — today is 2026-06-29, so fine).
- Eyeball the rendered Markdown: H2 sections (Problem/Solution/Takeaways), code fences
  highlight as C#, links open in new tabs. Mermaid block will render once the user adds
  Mermaid support (expected to show as a plain code block until then — acceptable per
  user).
- Proofread for voice/length against the reference posts.
