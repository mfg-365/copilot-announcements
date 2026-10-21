// Builds a customer-ready monthly Copilot newsletter from the site's existing
// announcements, official blog feed and roadmap data. The current month is
// refreshed on every feed run; closed months are preserved as stable history.
// No npm dependencies.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data");
const OUT = path.join(DATA, "newsletters.json");
const MAX_EDITIONS = 24;
const MONTHS_TO_BACKFILL = 12;

const PROMPTS = [
  {
    title: "Turn updates into an executive brief",
    text: "Using these updates, create a one-page executive brief with: what changed, why it matters, decisions needed, and three actions for our organization. Keep it concrete and link every recommendation to an update.",
  },
  {
    title: "Find the best scenarios for my team",
    text: "Based on my role as [role] and these Microsoft Copilot updates, recommend five scenarios my team should test this month. For each, include the business outcome, who should try it, and a simple success measure.",
  },
  {
    title: "Build an adoption campaign",
    text: "Turn these Copilot updates into a four-week adoption campaign. Include one weekly theme, a short Teams post, a live-demo idea, and one measurable behavior we want users to adopt.",
  },
  {
    title: "Assess readiness and risk",
    text: "Review these Copilot capabilities as an IT and change-management lead. Create a readiness checklist covering licensing, data, security, governance, communications, training, and measurement.",
  },
  {
    title: "Create a role-based demo",
    text: "Design a 15-minute Copilot demo for [audience]. Choose three capabilities from these updates, write the demo storyline, sample prompts, expected outputs, and the business value to emphasize.",
  },
  {
    title: "Turn news into a leadership update",
    text: "Draft a concise leadership email summarizing these Copilot updates. Lead with the business impact, separate what is available now from what is coming, and end with three recommended next steps.",
  },
  {
    title: "Prioritize a pilot backlog",
    text: "Create a prioritized pilot backlog from these Copilot updates. Score each idea for user value, implementation effort, risk, and time to learn. Recommend the top three pilots and explain why.",
  },
  {
    title: "Prepare a champion session",
    text: "Create a 30-minute Champion community session from these updates: opening message, three demos, discussion questions, a hands-on challenge, and a follow-up resource list.",
  },
  {
    title: "Map capabilities to outcomes",
    text: "Map these Copilot capabilities to the outcomes of productivity, quality, employee experience, revenue, and risk reduction. Identify the strongest evidence we should collect for each.",
  },
  {
    title: "Create customer talking points",
    text: "Turn these updates into customer-ready talking points. For each major item, provide: a plain-language description, who benefits, a realistic example, and one question to ask the customer.",
  },
  {
    title: "Plan enablement by audience",
    text: "Create an enablement plan for executives, end users, champions, makers, and IT based on these updates. Give each audience the message, demo, resource, and call to action they need.",
  },
  {
    title: "Design a monthly impact review",
    text: "Using these updates, design a monthly Copilot impact review. Include adoption signals, qualitative feedback, business outcome measures, risks to watch, and decisions leaders should make.",
  },
];

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA, file), "utf8"));
  } catch {
    return fallback;
  }
}

function monthId(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthAtOffset(now, back) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

function dateValue(item) {
  return Date.parse(item.date || item.modified || 0) || 0;
}

function shorten(text, max = 260) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function cleanTitle(title) {
  return String(title || "").replace(/^Microsoft (?:365 )?Copilot(?: \([^)]*\))?:\s*/i, "").trim();
}

function storyFrom(item, kind) {
  return {
    title: cleanTitle(item.title),
    summary: shorten(item.summary || item.description, 280),
    link: item.link || "",
    date: item.date || "",
    label: kind === "announcement" ? item.category || "Announcement" : item.source || "Official Microsoft blog",
    kind,
  };
}

function pickRoadmap(items) {
  const order = { "Rolling out": 0, "In development": 1, Launched: 2 };
  const sorted = [...items].sort((a, b) => {
    const status = (order[a.status] ?? 9) - (order[b.status] ?? 9);
    return status || dateValue(b) - dateValue(a);
  });
  const selected = [];
  const products = new Set();
  for (const item of sorted) {
    const product = (item.products && item.products[0]) || "Microsoft 365";
    if (products.has(product) && selected.length < 2) continue;
    selected.push({
      title: cleanTitle(item.title),
      description: shorten(item.description, 240),
      status: item.status,
      availability: item.availability || item.preview || "",
      link: item.link,
      product,
    });
    products.add(product);
    if (selected.length === 3) break;
  }
  return selected;
}

function makeEdition(year, month, isCurrent) {
  const id = monthId(year, month);
  const label = monthLabel(year, month);
  const announcements = readJson("announcements.json", { items: [] });
  const blogs = readJson("blogs.json", { items: [] });
  const roadmap = readJson("roadmap.json", { items: [] });

  const monthAnnouncements = (announcements.items || [])
    .filter((item) => String(item.date || "").startsWith(id))
    .sort((a, b) => dateValue(b) - dateValue(a));
  const monthBlogs = (blogs.items || [])
    .filter((item) => String(item.date || "").startsWith(id))
    .sort((a, b) => dateValue(b) - dateValue(a));

  if (!isCurrent && !monthAnnouncements.length && !monthBlogs.length) return null;

  const featureSource = monthAnnouncements[0] || monthBlogs[0] || (blogs.items || [])[0];
  const featureKind = monthAnnouncements[0] ? "announcement" : "blog";
  const feature = featureSource ? storyFrom(featureSource, featureKind) : null;
  const featureLink = feature && feature.link;

  const storyPool = [
    ...monthAnnouncements.map((item) => storyFrom(item, "announcement")),
    ...monthBlogs.map((item) => storyFrom(item, "blog")),
  ]
    .filter((item) => item.link !== featureLink)
    .sort((a, b) => Date.parse(b.date || 0) - Date.parse(a.date || 0));

  const reads = monthBlogs
    .map((item) => storyFrom(item, "blog"))
    .filter((item) => item.link !== featureLink && !storyPool.slice(0, 3).some((s) => s.link === item.link))
    .slice(0, 4);

  const promptIndex = year * 12 + month - 1;
  const prompt = PROMPTS[promptIndex % PROMPTS.length];

  return {
    id,
    year,
    month,
    monthLabel: label,
    subject: `Microsoft Copilot monthly update — ${label}`,
    title: `${label} Copilot Update`,
    intro: `A customer-ready roundup of the most important Microsoft Copilot news, practical ideas and upcoming capabilities from ${label}.`,
    feature,
    stories: storyPool.slice(0, 3),
    reads,
    prompt,
    roadmap: isCurrent ? pickRoadmap(roadmap.items || []) : [],
  };
}

function main() {
  const existing = readJson("newsletters.json", { editions: [] });
  const byId = new Map((existing.editions || []).map((edition) => [edition.id, edition]));
  const now = new Date();
  const currentId = monthId(now.getUTCFullYear(), now.getUTCMonth() + 1);

  for (let back = 0; back < MONTHS_TO_BACKFILL; back++) {
    const { year, month } = monthAtOffset(now, back);
    const id = monthId(year, month);
    const isCurrent = id === currentId;
    if (!isCurrent && byId.has(id)) continue; // Closed editions are immutable history.
    const fresh = makeEdition(year, month, isCurrent);
    if (fresh) byId.set(id, fresh);
  }

  const editions = [...byId.values()]
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, MAX_EDITIONS);

  if (!editions.length) throw new Error("Refusing to publish an empty newsletter archive.");

  const payload = {
    generatedAt: now.toISOString(),
    count: editions.length,
    currentEdition: currentId,
    editions,
  };
  const json = JSON.stringify(payload, null, 2);
  JSON.parse(json);
  fs.mkdirSync(DATA, { recursive: true });
  const tmp = OUT + ".tmp";
  fs.writeFileSync(tmp, json);
  fs.renameSync(tmp, OUT);
  console.log(`Wrote ${editions.length} monthly newsletter edition(s); current = ${currentId}`);
}

main();
