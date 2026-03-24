const fs = require("fs");
const path = require("path");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");

const RESERVED_TAGS = new Set([
  "all",
  "nav",
  "post",
  "posts",
  "file",
  "collections",
  "updates",
  "projects",
  "tools"
]);

function slugify(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatCaption(caption = "") {
  return caption ? `<figcaption>${caption}</figcaption>` : "";
}

function getDisplayTags(tags = []) {
  return tags.filter((tag) => !RESERVED_TAGS.has(tag));
}

function loadImageManifest() {
  const manifestPath = path.join(__dirname, "src", "_data", "imageManifest.json");
  if (!fs.existsSync(manifestPath)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

const imageManifest = loadImageManifest();

function renderManagedImage(src, alt = "", classes = "", eager = false) {
  const meta = imageManifest[src];
  const loading = eager ? "eager" : "auto";
  const fetchpriority = eager ? "high" : "auto";
  const classAttr = classes ? ` ${classes}` : "";

  if (!meta) {
    return `<img src="${src}" alt="${alt}" loading="${loading}" fetchpriority="${fetchpriority}">`;
  }

  return `<span class="progressive-media${classAttr}" style="--ratio-w:${meta.width}; --ratio-h:${meta.height}; aspect-ratio:${meta.width}/${meta.height};">
<img class="progressive-preview" src="${meta.placeholder}" alt="" aria-hidden="true" loading="eager" decoding="async" width="${meta.width}" height="${meta.height}">
<img class="progressive-full" src="${src}" alt="${alt}" loading="${loading}" fetchpriority="${fetchpriority}" decoding="async" width="${meta.width}" height="${meta.height}">
</span>`;
}

function renderManagedLoop(src, alt = "", classes = "") {
  const meta = imageManifest[src];
  if (!meta || !meta.previewVideo || !meta.fullVideo) {
    return renderManagedImage(src, alt, classes, true);
  }

  const classAttr = classes ? ` ${classes}` : "";
  return `<span class="progressive-loop${classAttr}" style="aspect-ratio:${meta.width}/${meta.height};">
<video class="loop-preview" autoplay muted loop playsinline preload="auto" aria-hidden="true" width="${meta.width}" height="${meta.height}">
<source src="${meta.previewVideo}" type="video/mp4">
</video>
<video class="loop-full" muted loop playsinline preload="auto" width="${meta.width}" height="${meta.height}">
<source src="${meta.fullVideo}" type="video/mp4">
</video>
</span>`;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/images": "images" });
  eleventyConfig.addPassthroughCopy({ "src/generated": "generated" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });

  const md = markdownIt({
    html: true,
    linkify: true,
    typographer: false
  }).use(markdownItAnchor, { slugify });

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addFilter("slugify", slugify);
  eleventyConfig.addFilter("limit", (items = [], count = 3) => items.slice(0, count));
  eleventyConfig.addFilter("displayTags", getDisplayTags);
  eleventyConfig.addFilter("findBySlug", (items = [], slug = "") =>
    items.find((item) => item.data.slug === slug)
  );
  eleventyConfig.addFilter("filterByProject", (items = [], project = "") =>
    project ? items.filter((item) => item.data.project === project) : []
  );
  eleventyConfig.addFilter("excludeSlug", (items = [], slug = "") =>
    items.filter((item) => item.data.slug !== slug)
  );
  eleventyConfig.addFilter("featuredProject", (items = []) =>
    items.find((item) => item.data.featured) || items[0]
  );
  eleventyConfig.addFilter("collectTerms", (items = [], field = "tags") => {
    const values = new Set();

    items.forEach((item) => {
      const source = field === "tags" ? getDisplayTags(item.data.tags || []) : item.data[field];
      const list = Array.isArray(source) ? source : source ? [source] : [];
      list.forEach((entry) => values.add(entry));
    });

    return Array.from(values).sort((left, right) => left.localeCompare(right));
  });
  eleventyConfig.addFilter("readableDate", (value) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(new Date(value))
  );
  eleventyConfig.addFilter("teaserDate", (value) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(new Date(value))
  );

  eleventyConfig.addShortcode("managedImage", (src, alt = "", classes = "", eager = false) =>
    renderManagedImage(src, alt, classes, eager)
  );
  eleventyConfig.addShortcode("managedLoop", (src, alt = "", classes = "") =>
    renderManagedLoop(src, alt, classes)
  );

  eleventyConfig.addShortcode("image", (src, alt = "", caption = "", classes = "") =>
    `<figure class="${["media-frame", classes].filter(Boolean).join(" ")}">
${renderManagedImage(src, alt, "", false)}
${formatCaption(caption)}
</figure>`
  );

  eleventyConfig.addShortcode("gif", (src, alt = "", caption = "") =>
    `<figure class="media-frame media-frame-gif">
${renderManagedImage(src, alt, "", false)}
${formatCaption(caption)}
</figure>`
  );

  eleventyConfig.addPairedShortcode("gallery", (content, caption = "") =>
    `<figure class="media-gallery">
<div class="media-gallery-grid">
${content}
</div>
${formatCaption(caption)}
</figure>`
  );

  eleventyConfig.addPairedShortcode("columns", (content, tone = "text") =>
    `<div class="content-columns content-columns-${tone}">
${content}
</div>`
  );

  eleventyConfig.addPairedShortcode("column", (content, tone = "text") =>
    `<div class="content-column content-column-${tone}">
${content}
</div>`
  );

  eleventyConfig.addShortcode("youtube", (videoId, title = "YouTube video") =>
    `<figure class="embed-frame">
<div class="embed-shell">
<iframe
src="https://www.youtube.com/embed/${videoId}"
title="${title}"
loading="lazy"
allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
allowfullscreen
></iframe>
</div>
</figure>`
  );

  eleventyConfig.addShortcode("sketchfab", (modelId, title = "Sketchfab model") =>
    `<figure class="embed-frame">
<div class="embed-shell">
<iframe
title="${title}"
loading="lazy"
frameborder="0"
allowfullscreen
mozallowfullscreen="true"
webkitallowfullscreen="true"
allow="autoplay; fullscreen; xr-spatial-tracking"
execution-while-out-of-viewport
execution-while-not-rendered
web-share
src="https://sketchfab.com/models/${modelId}/embed"
></iframe>
</div>
</figure>`
  );

  eleventyConfig.addShortcode("cta", (url, label, meta = "") =>
    `<div class="inline-card-wrap">
<a class="inline-card-link" href="${url}" target="_blank" rel="noopener">
<span class="inline-card-label">${label}</span>
${meta ? `<span class="inline-card-meta">${meta}</span>` : ""}
</a>
</div>`
  );

  eleventyConfig.addShortcode("download", (url, label, meta = "") =>
    `<div class="inline-card-wrap">
<a class="inline-card-link inline-card-download" href="${url}">
<span class="inline-card-label">${label}</span>
${meta ? `<span class="inline-card-meta">${meta}</span>` : ""}
</a>
</div>`
  );

  eleventyConfig.addPairedShortcode("callout", (content, tone = "note", title = "") => `
    <aside class="callout callout-${tone}">
      ${title ? `<p class="callout-title">${title}</p>` : ""}
      <div class="callout-body">${content}</div>
    </aside>
  `);

  eleventyConfig.addCollection("updates", (collectionApi) =>
    collectionApi.getFilteredByGlob("./src/content/updates/*.md").sort((left, right) => right.date - left.date)
  );

  eleventyConfig.addCollection("projects", (collectionApi) =>
    collectionApi.getFilteredByGlob("./src/content/projects/*.md").sort((left, right) => right.date - left.date)
  );

  eleventyConfig.addCollection("tools", (collectionApi) =>
    collectionApi.getFilteredByGlob("./src/content/tools/*.md").sort((left, right) => right.date - left.date)
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "dist"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"]
  };
};
