# Microsoft 365 Copilot Announcements

An interactive, **Microsoft 365 Copilot–branded** site that replaces the running
"Copilot Announcements" PowerPoint with an easy-to-navigate web feed. Built as a
static site for **GitHub Pages**.

## Tabs
- **Announcements** – date cards; each opens a dedicated detail page (`#a/<id>`) with its
  full details, **screenshots from the deck**, and **blog/article links** in the header.
- **Timeline** – a horizontal timeline of every announcement (most recent on the right;
  scroll/drag left to go back). Each milestone links to its date page.
- **Roadmap** – live feed of Copilot features from the public Microsoft 365 Roadmap.
- **Copilot Blogs** – the latest official Microsoft Copilot/agent blog posts.
- **Resources** – official Microsoft links and a link to the source deck.

## Media & links
- Screenshots were extracted and optimized from the source deck into `assets/media/`
  (150 images, ~20 MB; longest side ≤1100 px). Each detail block references its images via
  an `images` array in `data/announcements.json`.
- Blog/article hyperlinks were extracted from the deck and split into two tiers:
  - **Header links** (`headerLinks` on an item) come from a section's title/overview slide
    and render under that date's header as "Blogs & articles".
  - **Inline links** (`links` on a detail block) come from a specific feature slide and render
    as active linked bullets within that feature.
  Each link has a short, compelling title (sourced from the destination page's real title).
- Videos from the deck are intentionally **not** included (they exceed GitHub's file-size
  limits — several are >100 MB).

## Updating announcements (the part you maintain)
Announcements are **organized by date**. The main page shows a card per date; clicking a
card opens a dedicated detail page (URL `#a/<id>`) with all the details for that date.

When there's a big announcement, add an entry to the top of the `items` array in
[`data/announcements.json`](data/announcements.json) and commit. Each entry:

```json
{
  "id": "2026-06-02-build-2026-announcements",
  "date": "2026-06-02",
  "dateLabel": "June 2, 2026",
  "title": "Build 2026 Announcements",
  "category": "Platform & SDK",
  "summary": "One or two sentences for the card.",
  "tags": ["Build", "Agents"],
  "details": [
    {
      "heading": "Feature or sub-topic name",
      "status": "Generally available",
      "points": ["Concise bullet.", "Another bullet."]
    }
  ]
}
```

- **id** must be unique and URL-safe (used as the page address `#a/<id>`). Convention: `YYYY-MM-DD-slug`.
- **category** must be one of the values in the top-level `categories` array (drives the
  filter chips and the colored badge). Add a new category there if you need one.
- **details[]** is the body of the date's page — one block per feature/sub-topic, each with a
  `heading`, optional `status` pill, and a `points` array. Add as many blocks as the date needs.
- **tags** and **status** are optional. Newest items first.

> This initial set was generated from the source PowerPoint deck (24 dated announcements,
> 116 detailed updates). Review and refine wording as needed.

## Automated daily refresh
A GitHub Action keeps the live feeds current with **zero effort**:

- **`.github/workflows/update-feeds.yml`** — runs **daily at 12:00 UTC** (and on demand).
  Executes `scripts/update-roadmap.mjs` (public Microsoft 365 Roadmap → `data/roadmap.json`)
  and `scripts/update-blogs.mjs` (official Microsoft blog RSS → `data/blogs.json`).
  Any change is committed automatically, which rebuilds the Pages site.

Run them locally too:

```bash
node scripts/update-roadmap.mjs
node scripts/update-blogs.mjs
```

## Linking the source deck
The deck is an internal asset and isn't hosted here. To make the "Source deck" card
on the Resources tab clickable, set its SharePoint URL in
[`assets/js/decks.config.js`](assets/js/decks.config.js).

## Publish to GitHub Pages
1. Create a new GitHub repo and push this folder.
2. In **Settings → Pages**, set **Source = Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Ensure **Settings → Actions → General → Workflow permissions** is set to
   **Read and write** so the daily refresh can commit.

## Local preview
```bash
npx serve .
```

---
Microsoft, Microsoft 365, and Copilot are trademarks of the Microsoft group of companies.
Content references public Microsoft sources and is for informational purposes only.
