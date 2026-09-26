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
