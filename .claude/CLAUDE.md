# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal technical blog (`gaevoy.com`) built with **Jekyll** and based on the **Pixyll** theme. Deployed via GitHub Pages — the `_config.yml`/`CNAME`/`master` branch are the source of truth and pushing to `master` publishes the site. There is no Gemfile; the build relies on GitHub Pages' Jekyll or the devcontainer's bundled Jekyll.

## Development

A devcontainer (`.devcontainer/devcontainer.json`, image `mcr.microsoft.com/devcontainers/jekyll`) provides the toolchain.

- Serve locally with live reload: `jekyll serve` (also available as the VSCode task **🌐 Jekyll Serve**). Site is served from `_site/`, which is the build output and git-ignored.
- Build only: `jekyll build`.

There is no test or lint step — this is a static content site.

## Content authoring

- Posts live in `_posts/` and **must** follow Jekyll's `YYYY-MM-DD-title.markdown` filename convention.
- Each post starts with YAML front matter. Common keys (see existing posts for the pattern):
  - `layout: post`, `title`, `description`, `tags: [csharp, dotnet, ...]`
  - `published: true` / `false` to control visibility
  - `comments: true` enables the Disqus thread (see `_layouts/post.html`)
- `<!--more-->` marks the excerpt cut-off (`excerpt_separator` in `_config.yml`).
- Markdown is kramdown with GFM input and Rouge syntax highlighting.

## Layout & include structure

- `_layouts/`: `default.html` is the page shell (head, header/nav, footer, theme CSS) → `page.html` and `post.html` wrap content inside it.
- `_includes/`: reusable fragments (`navigation.html`, `footer.html`, `header.html`, social links, `pagination.html`, `cookieconsent.html`, `blog-assistant.html`).
- Pages outside `_posts/` (e.g. `about-me/`, `index.html`, `tags/`, `contact.html`) are standalone Jekyll pages/collections.

## Theming (light/dark)

Dark mode is implemented by toggling a `dark` class on `<body>`:

- `js/theme-selector.js` reads `localStorage["theme"]` (falling back to `prefers-color-scheme`), toggles `body.dark`, and persists the choice. The toggle is bound to `.theme-switcher`.
- CSS is layered in `_layouts/default.html`: base (`basscss.css`, `pixyll.css`, `solarized-light.css`) plus dark overrides (`pixyll-dark.css`, `solarized-dark.css`) that are scoped to `body.dark`.
- When changing CSS, bump the `?v=N` query string on the corresponding `<link>` in `_layouts/default.html` to bust caches.

## Blog assistant widget

`_includes/blog-assistant.html` + `blog-assistant/` implement a "Chat with blog" GPT widget. The front-end (`blog-assistant.js`, `remarkable.js`) is lazy-loaded on click and talks to an **external backend** at `https://app.gaevoy.com/blog-assistant/` — that backend is not in this repo.
