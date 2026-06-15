// Optional: make the "Source deck" card on the Resources tab clickable.
// Paste the internal SharePoint URL of the Copilot Announcements deck below.
// Leave it empty to keep the card as a non-clickable label.
window.DECK_LINKS = {
  announcements: "" // e.g. "https://microsoft-my.sharepoint.com/:p:/p/cowi/...."
};

// Wire the deck card (runs after the DOM, since this script is at the end of <body>).
(function wireDecks() {
  const links = window.DECK_LINKS || {};
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
      card.replaceWith(a);
      enabled++;
    }
  });
  if (note && enabled) note.textContent = "Click the deck to open it.";
})();
