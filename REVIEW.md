# BQUIK Theme — Phase 2 Review

## Architecture
Custom OS2.0 theme, not Dawn-based. Single `theme.css` (2381 lines) + `theme.js` (988 lines), vanilla ES2020+, no build pipeline.

## What's Built

### Homepage (index.liquid)
- hero ✓
- marquee-ticker ✓
- featured-collection ✓
- trust-badges ✓
- image-with-text (brand story) ✓
- stats-bar ✓
- newsletter ✓
- **MISSING**: Instagram/UGC strip

### Product Page
- Gallery with thumbnails ✓
- Variant selectors (size + colour) ✓
- Size guide link + modal snippet ✓
- Sticky ATC bar ✓
- Quantity selector ✓
- Related products ✓
- Recently viewed ✓
- **MISSING**: "Complete the Look" upsell block
- **MISSING**: Reviews section

### Collection Page
- Collection banner ✓
- Sort dropdown ✓
- Tag filter chips ✓
- Product grid (24 per page) ✓
- Pagination ✓
- **BUG**: Line 1 of collection.liquid double-loads theme.css (causes render-blocking duplication)
- **MISSING**: Hover second image on product cards

### Footer
- Brand column + social icons ✓
- Link columns via blocks ✓
- Copyright ✓
- **MISSING**: ABN/legal text

## Bugs
1. `templates/collection.liquid` line 1: `{{ 'theme.css' | asset_url | stylesheet_tag }}` — theme.css already loaded in layout/theme.liquid, this is a duplicate
2. `config/settings_data.json` — appears empty/corrupt (0 bytes)

## CSS/JS Assessment
- Sticky ATC: implemented (.sticky-atc, initStickyATC)
- Modal system: implemented (.modal-overlay, .modal)
- Scroll reveal: implemented (data-reveal)
- Typography: Anton + Montserrat + Red Hat Text all self-hosted

## Missing Components vs Best-in-Class
1. Instagram/UGC social proof strip (homepage)
2. Hover second product image on cards
3. ABN/legal in footer
4. Reviews section on PDP

## Assets Required
- Homepage hero: generate with Nano Banana (lifestyle/athlete shot)
- Collection banner: check ~/Desktop/Saved BQUIK/Jersey Flatlays/ first
- About page: lifestyle photo
- OG image: brand logo + tagline
- Email header: BQUIK VOLLEY text graphic
