// Optional: make the "Source deck" card on the Resources tab clickable.
// Paste the share URL of the Copilot Announcements deck below.
// Leave it empty to keep the card as a non-clickable label.
window.DECK_LINKS = {
  announcements: "https://livesend.microsoft.com/i/QA50DnJHqqsstg2J6mhGcltXSOtXZ6OxxwO___N5Y3weRsYallCBFcWy0mYQw8i7___nKzixGtQ7vYGRLpQD8PbbzQ9R27bC5mmZX4T04GG1mF6XpoZ___fvwMFX___MPLUSSIGNuR3XfKz"
};

// Date the source deck itself was last updated. Shown on the deck callout blocks
// so readers know how current the downloadable PowerPoint is. Update this
// whenever a new version of the deck is published.
window.DECK_UPDATED = {
  announcements: "2026-11-11"
};

function formatDeckDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return "";
  // Construct in local time so the date never shifts a day via UTC parsing.
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(d)) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Wire the deck card (runs after the DOM, since this script is at the end of <body>).
(function wireDecks() {
  const links = window.DECK_LINKS || {};
  const updated = window.DECK_UPDATED || {};
  const note = document.getElementById("decksNote");
  let enabled = 0;
  document.querySelectorAll(".deck-card").forEach((card) => {
    const url = links[card.dataset.deck];
    if (url) {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "deck-card enabled";
      a.innerHTML = card.innerHTML;
      a.dataset.deck = card.dataset.deck;
      card.replaceWith(a);
      enabled++;
    }
  });
  if (note && enabled) note.textContent = "Click the deck to open it.";

  // Wire the download callout banner(s) on the announcements page.
  document.querySelectorAll("[data-deck-link]").forEach((el) => {
    const url = links[el.dataset.deckLink];
    if (url) {
      el.href = url;
      el.hidden = false;
    }
  });

  // Stamp the deck's last-updated date onto every callout block. Queried after
  // the card swap above so replacement nodes are included.
  document.querySelectorAll("[data-deck-updated]").forEach((el) => {
    const key = el.dataset.deckUpdated || "announcements";
    const text = formatDeckDate(updated[key]);
    if (text) {
      el.textContent = "Deck last updated " + text;
      el.hidden = false;
    }
  });
})();

// Spotlight: a featured-launch banner on the Announcements landing page, plus a
// pinned "Featured" card at the top of the Copilot Blogs tab.
// To feature a different launch, edit this object. Set enabled:false to hide it.
window.SPOTLIGHT = {
  enabled: true,
  pinBlog: true, // also pin this post to the top of the Blogs tab
  kicker: "Featured from Microsoft Ignite",
  date: "2026-11-17",
  title: "Copilot at Microsoft Ignite",
  lead: "Expanding what\u2019s possible with intelligence built for work.",
  link: "https://www.microsoft.com/en-us/copilot/blog/2026/11/17/copilot-at-microsoft-ignite-expanding-whats-possible-with-intelligence-built-for-work/",
  source: "Microsoft Copilot Blog",
  blogTitle: "Copilot at Microsoft Ignite: Expanding what\u2019s possible with intelligence built for work",
  blogDescription:
    "Explore the Microsoft Ignite 2026 announcements for Copilot, including Home, Office, Autopilot, Workspaces, Code, Work IQ, and new business-focused plugins and skills.",
  pillars: [
    {
      icon: "home",
      name: "Home",
      text: "Chat, Cowork and Office come together in one starting place for work, powered by intelligent Auto routing.",
      status: "Generally available",
      tone: "available"
    },
    {
      icon: "autopilot",
      name: "Autopilot",
      text: "A trusted autonomous agent that can follow through on recurring work across Teams, Outlook and documents.",
      status: "Rolling out to Frontier",
      tone: "frontier"
    },
    {
      icon: "code",
      name: "Code",
      text: "Build apps, dashboards and automations in natural language, hosted securely with Copilot Managed Runtime.",
      status: "Generally available soon",
      tone: "available"
    }
  ],
  alsoNew: [
    "Workspaces",
    "Dynamics 365 in Copilot",
    "Salesforce in Copilot",
    "Expanded Agent 365"
  ]
};
