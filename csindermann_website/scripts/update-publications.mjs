import { mkdir, writeFile } from "node:fs/promises";

const USER_ID = "ymA6CQMAAAAJ";
const SCHOLAR_ORIGIN = "https://scholar.google.com";
const PAGE_SIZE = 100;

const decodeHtml = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const textFromHtml = (html = "") =>
  decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();

const numberFromText = (text) => {
  const digits = String(text || "").replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
};

const buildUrl = (cstart) => {
  const url = new URL("/citations", SCHOLAR_ORIGIN);
  url.search = new URLSearchParams({
    user: USER_ID,
    hl: "en",
    oi: "ao",
    cstart: String(cstart),
    pagesize: String(PAGE_SIZE),
    sortby: "pubdate",
  }).toString();
  return url;
};

const fetchScholarPage = async (cstart) => {
  const response = await fetch(buildUrl(cstart), {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; CSindermannPublicationUpdater/1.0; +https://www.c-sindermann.com/)",
    },
  });

  if (!response.ok) {
    throw new Error(`Google Scholar returned HTTP ${response.status}`);
  }

  const html = await response.text();
  if (/unusual traffic|recaptcha|captcha/i.test(html)) {
    throw new Error("Google Scholar returned an anti-automation page.");
  }

  return html;
};

const parseMetrics = (html) => {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((match) =>
    textFromHtml(match[1])
  );
  const metric = (label, index) => {
    const row = rows.find((entry) => entry.startsWith(label));
    if (!row) return null;
    const values = (row.match(/\d[\d,]*/g) || []).slice(-2);
    return values[index] ? numberFromText(values[index]) : null;
  };

  return {
    citationsAll: metric("Citations", 0),
    citationsSince2021: metric("Citations", 1),
    hIndexAll: metric("h-index", 0),
    hIndexSince2021: metric("h-index", 1),
    i10IndexAll: metric("i10-index", 0),
    i10IndexSince2021: metric("i10-index", 1),
  };
};

const parsePublications = (html) => {
  const rows = [...html.matchAll(/<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g)];

  return rows
    .map(([, row]) => {
      const titleMatch = row.match(/<a\b[^>]*class="gsc_a_at"[^>]*>[\s\S]*?<\/a>/);
      const titleTag = titleMatch?.[0] || "";
      const hrefMatch = titleTag.match(/\bhref="([^"]+)"/);
      const gray = [...row.matchAll(/<div class="gs_gray">([\s\S]*?)<\/div>/g)].map(
        (match) => textFromHtml(match[1])
      );
      const citedMatch = row.match(/<td[^>]*class="gsc_a_c"[^>]*>([\s\S]*?)<\/td>/);
      const yearMatch = row.match(/<td[^>]*class="gsc_a_y"[^>]*>([\s\S]*?)<\/td>/);

      return {
        title: titleTag ? textFromHtml(titleTag) : "",
        authors: gray[0] || "",
        venue: gray[1] || "",
        year: numberFromText(textFromHtml(yearMatch?.[1])) || null,
        citedBy: numberFromText(textFromHtml(citedMatch?.[1])),
        url: hrefMatch ? new URL(decodeHtml(hrefMatch[1]), SCHOLAR_ORIGIN).href : "",
      };
    })
    .filter((publication) => publication.title);
};

const main = async () => {
  const allPublications = [];
  let metrics = null;

  for (let cstart = 0; cstart < 1000; cstart += PAGE_SIZE) {
    const html = await fetchScholarPage(cstart);
    if (cstart === 0) {
      metrics = parseMetrics(html);
    }

    const publications = parsePublications(html);
    allPublications.push(...publications);

    if (publications.length < PAGE_SIZE) {
      break;
    }
  }

  const seen = new Set();
  const publications = allPublications.filter((publication) => {
    const key = `${publication.title}|${publication.authors}|${publication.year}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (publications.length === 0) {
    throw new Error("No publications were parsed; keeping the existing data file untouched.");
  }

  const output = {
    source: `https://scholar.google.com/citations?user=${USER_ID}&hl=en&oi=ao`,
    fetchedAt: new Date().toISOString().slice(0, 10),
    metrics,
    publications,
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/publications.json", `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${publications.length} publications to data/publications.json`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
