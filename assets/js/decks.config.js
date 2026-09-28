// Optional: make the "Source deck" card on the Resources tab clickable.
// Paste the share URL of the Copilot Announcements deck below.
// Leave it empty to keep the card as a non-clickable label.
window.DECK_LINKS = {
  announcements: "https://livesend.microsoft.com/i/QA50DnJHqqsstg2J6mhGcltXSOtXZ6OxxwO___N5Y3weQUmhkCM1ae9oUPZLmVwWrtcJnislDEEmUZHA1qoQKo4IgUW7Vcg9C0W___cW5ban___dejDOcP8xXZXWC26eJtTm3m"
};

// Date the source deck itself was last updated. Shown on the deck callout blocks
// so readers know how current the downloadable PowerPoint is. Update this
// whenever a new version of the deck is published.
window.DECK_UPDATED = {
  announcements: "2026-09-26"
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
  kicker: "Spotlight",
  date: "2026-09-25",
  title: "Introducing the new Copilot",
  lead: "Chat, Cowork, Office, building and a proactive agent \u2014 together in one app.",
  link: "https://blogs.microsoft.com/blog/2026/09/25/introducing-the-new-copilot-with-home-code-and-autopilot/",
  source: "Official Microsoft Blog",
  blogTitle: "Introducing the new Copilot with Home, Code and Autopilot",
  blogDescription:
    "Microsoft introduces the new Copilot: Home brings Chat, Cowork and Office together; Code lets anyone build apps, dashboards and automations; and Autopilot is a persistent, proactive agent that keeps working even when you\u2019re not.",
  video: { label: "Watch the video", url: "https://www.youtube.com/watch?v=OgInADh5Tcs" },
  pillars: [
    {
      icon: "home",
      name: "Home",
      text: "Your new starting point, where Chat, Cowork and the full power of Word, Excel and PowerPoint come together.",
      status: "Frontier \u00b7 coming weeks",
      tone: "frontier"
    },
    {
      icon: "code",
      name: "Code",
      text: "Describe an app, dashboard or automation in plain language and Copilot builds it, running safely in your tenant.",
      status: "Frontier \u00b7 end of month",
      tone: "frontier"
    },
    {
      icon: "autopilot",
      name: "Autopilot",
      text: "A persistent, proactive agent with its own identity and memory that keeps working even when you\u2019re not.",
      status: "Private preview",
      tone: "preview"
    }
  ],
  alsoNew: [
    "FinOps for AI",
    "Copilot Managed Runtime",
    "Unified plugin registry",
    "Fabric IQ + Dynamics 365 grounding"
  ]
};
