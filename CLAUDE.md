# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A custom Shopify theme for **BQUIK Volley** (`bquikvolley-theme/main`). It is a standard Shopify Online Store 2.0 theme with no build pipeline — all files are edited directly and deployed via the Shopify CLI or pushed to the connected store.

## Deployment

```bash
# Preview/develop against a live store
shopify theme dev --store=bquikvolley.myshopify.com

# Push to store
shopify theme push --store=bquikvolley.myshopify.com

# Pull latest from store (syncs remote edits back)
shopify theme pull --store=bquikvolley.myshopify.com
```

There is no build step. `assets/theme.css` and `assets/theme.js` are the single hand-authored CSS and JS files — edit them directly.

## Architecture

```
layout/theme.liquid      ← Shell HTML: <head>, fonts, CSS/JS tags, body wrapper
assets/theme.css         ← All styles (single file, CSS custom properties for theming)
assets/theme.js          ← All JS (single file, vanilla ES2020+, no jQuery/frameworks)
config/settings_schema.json  ← Theme Editor settings definitions
config/settings_data.json    ← Saved setting values
sections/                ← Shopify sections (independently renderable blocks)
snippets/                ← Reusable Liquid partials (rendered via `render` tag)
templates/               ← Page templates (index, product, collection, cart, 404, page)
locales/                 ← i18n strings
```

**Sections** are the primary building blocks. Each `.liquid` file in `sections/` ends with a `{% schema %}` block that defines its Theme Editor settings and allowed presets.

**Snippets** are stateless partials. They do not have schema blocks. Pass data explicitly via the `render` tag (e.g., `{%- render 'product-card', product: product -%}`).

## Liquid Conventions

- Use `{%- -%}` (dash tags) to strip whitespace around block tags.
- Declare variables at the top of a section with a `{%- liquid ... -%}` block.
- Avoid `{% include %}` — always use `{% render %}` (scoped, no variable bleed).
- Section schema blocks must be valid JSON and placed at the very end of the file.

## JS Conventions

`theme.js` is structured as named `init*` functions, each handling one feature, all called at the bottom of the file on `DOMContentLoaded`. Use the file-level helpers `$()`, `$$()`, `on()`, `off()`, `emit()` instead of raw DOM APIs. Cart mutations use the Shopify AJAX API (`/cart/add.js`, `/cart/change.js`, `/cart.js`).

## Design Tokens

All colours are CSS custom properties set from `settings_data.json` via inline `<style>` in `layout/theme.liquid`. Key tokens:

| Token | Default | Usage |
|---|---|---|
| `--c-bg` | `#0A0A0A` | Page background |
| `--c-accent` | `#F28500` | Brand orange — CTAs, highlights |
| `--c-text` | `#FFFFFF` | Body text |

Typography: **Anton** (display headings), **Montserrat** (body), **Red Hat Text** (UI/buttons).
