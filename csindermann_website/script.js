const siteScript = document.currentScript;
const pageLanguage = (siteScript?.dataset.language || document.documentElement.lang || "en").startsWith("de") ? "de" : "en";
const publicationDataUrl = siteScript?.dataset.publicationsUrl || "data/publications.json";

const body = document.body;
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const navLinks = [...document.querySelectorAll(".site-nav a")];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const strings = {
  en: {
    noYear: "No year",
    citations: "citations",
    venueMissing: "Venue not listed on Google Scholar",
    scholarRecord: "Google Scholar record",
    noMatches: "No publications match the current filter.",
    showing: (visible, total, format) => `Showing ${format.format(visible)} of ${format.format(total)} publications.`,
    source: (date) => `Data source: Google Scholar. Last refreshed: ${date}.`,
    loadError: "Publication data could not be loaded. Please use the Google Scholar link above.",
  },
  de: {
    noYear: "Kein Jahr",
    citations: "Zitationen",
    venueMissing: "Publikationsort nicht bei Google Scholar gelistet",
    scholarRecord: "Google-Scholar-Eintrag",
    noMatches: "Keine Publikationen entsprechen dem aktuellen Filter.",
    showing: (visible, total, format) => `${format.format(visible)} von ${format.format(total)} Publikationen werden angezeigt.`,
    source: (date) => `Datenquelle: Google Scholar. Zuletzt aktualisiert: ${date}.`,
    loadError: "Die Publikationsdaten konnten nicht geladen werden. Bitte nutzen Sie den Google-Scholar-Link oben.",
  },
}[pageLanguage];

const numberFormat = new Intl.NumberFormat(pageLanguage === "de" ? "de-DE" : "en-US");

menuToggle?.addEventListener("click", () => {
  const isOpen = body.classList.toggle("nav-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    body.classList.remove("nav-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }
});

document.querySelectorAll("[data-language-option]").forEach((link) => {
  link.addEventListener("click", () => {
    localStorage.setItem("preferredLanguage", link.dataset.languageOption);
  });
});

const setActiveLink = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
  });
};

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible?.target?.id) {
      setActiveLink(visible.target.id);
    }
  },
  {
    rootMargin: "-30% 0px -55% 0px",
    threshold: [0.08, 0.18, 0.32],
  }
);

sections.forEach((section) => observer.observe(section));

const publicationList = document.querySelector("#publication-list");
const publicationCount = document.querySelector("#publication-count");
const publicationMeta = document.querySelector("#publication-meta");
const publicationSearch = document.querySelector("#publication-search");
const publicationYear = document.querySelector("#publication-year");

const setMetric = (name, value) => {
  const node = document.querySelector(`[data-metric="${name}"]`);
  if (node && Number.isFinite(value)) {
    node.textContent = numberFormat.format(value);
  }
};

const createPublicationCard = (publication) => {
  const article = document.createElement("article");
  article.className = "publication";

  const meta = document.createElement("div");
  meta.className = "publication-meta-line";

  const year = document.createElement("span");
  year.textContent = publication.year || strings.noYear;
  meta.append(year);

  if (publication.citedBy) {
    const citations = document.createElement("span");
    citations.textContent = `${numberFormat.format(publication.citedBy)} ${strings.citations}`;
    meta.append(citations);
  }

  const title = document.createElement("h3");
  title.textContent = publication.title;

  const authors = document.createElement("p");
  authors.textContent = publication.authors;

  const venue = document.createElement("p");
  venue.textContent = publication.venue || strings.venueMissing;

  article.append(meta, title, authors, venue);

  if (publication.url) {
    const link = document.createElement("a");
    link.href = publication.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = strings.scholarRecord;
    article.append(link);
  }

  return article;
};

const renderPublications = (publications) => {
  const searchTerm = publicationSearch?.value.trim().toLowerCase() || "";
  const selectedYear = publicationYear?.value || "";
  const filtered = publications.filter((publication) => {
    const haystack = [
      publication.title,
      publication.authors,
      publication.venue,
      publication.year,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!searchTerm || haystack.includes(searchTerm)) &&
      (!selectedYear || String(publication.year) === selectedYear)
    );
  });

  publicationList?.replaceChildren(
    ...(filtered.length
      ? filtered.map(createPublicationCard)
      : [Object.assign(document.createElement("p"), { textContent: strings.noMatches })])
  );

  if (publicationCount) {
    publicationCount.textContent = strings.showing(filtered.length, publications.length, numberFormat);
  }
};

const loadPublications = async () => {
  if (!publicationList) return;

  try {
    const response = await fetch(publicationDataUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Publication data request failed with ${response.status}`);
    }

    const data = await response.json();
    const publications = Array.isArray(data.publications) ? data.publications : [];
    const years = [...new Set(publications.map((item) => item.year).filter(Boolean))]
      .sort((a, b) => b - a);

    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = String(year);
      option.textContent = String(year);
      publicationYear?.append(option);
    });

    setMetric("publicationCount", publications.length);
    setMetric("citationsAll", data.metrics?.citationsAll);
    setMetric("hIndexAll", data.metrics?.hIndexAll);
    setMetric("i10IndexAll", data.metrics?.i10IndexAll);

    if (publicationMeta && data.fetchedAt) {
      publicationMeta.textContent = strings.source(data.fetchedAt);
    }

    publicationSearch?.addEventListener("input", () => renderPublications(publications));
    publicationYear?.addEventListener("change", () => renderPublications(publications));
    renderPublications(publications);
  } catch (error) {
    if (publicationCount) {
      publicationCount.textContent = strings.loadError;
    }
  }
};

loadPublications();
