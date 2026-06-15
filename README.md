# Microsoft 365 Copilot Announcements

An interactive, **Microsoft 365 Copilot–branded** site that replaces the running
"Copilot Announcements" PowerPoint with an easy-to-navigate web feed. Built as a
static site for **GitHub Pages**.

## Tabs
- **Announcements** – a curated, searchable, filter-by-area feed of the big Copilot
  announcements (the content migrated from the deck). Driven by `data/announcements.json`.
- **Roadmap** – live feed of Copilot features from the public Microsoft 365 Roadmap.
- **Copilot Blogs** – the latest official Microsoft Copilot/agent blog posts.
- **Resources** – official Microsoft links and a link to the source deck.

## Updating announcements (the part you maintain)
When there's a big announcement, add an entry to the top of the `items` array in
[`data/announcements.json`](data/announcements.json) and commit. Each entry:

```json
{
  "id": "short-unique-slug",
  "date": "2026-06-15",
  "title": "Announcement title",
  "category": "Agents",
  "summary": "One or two sentences for quick scanning.",
  "link": "https://aka.ms/official-source",
  "source": "Build 2026"
}
```

- **category** must be one of the values in the `categories` array (used for the
  filter chips and the colored badge). Add a new category there if you need one.
- Newest items first. The site shows items in file order.

> The summaries and dates in this initial set were drafted from the deck's slide
> titles for quick migration — review and refine them to match your source deck.

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
