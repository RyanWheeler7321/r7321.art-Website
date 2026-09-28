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

function escapeHtml(value = "") {
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderImageFigure(src, alt = "", caption = "", classes = "") {
  const meta = getMediaMeta(src);
  const classList = ["media-frame", classes, "media-frame-caption-center"].filter(Boolean).join(" ");
  const style = meta ? ` style="--media-ratio-w:${meta.width}; --media-ratio-h:${meta.height};"` : "";
  const captionBlock = caption
    ? `<div class="media-caption-block media-caption-block-bottom media-caption-center"><figcaption class="media-caption-main">${caption}</figcaption></div>`
    : "";

  return `<figure class="${classList}"${style}>
${renderMedia(src, alt)}
${captionBlock}
</figure>`;
}

function getDisplayTags(tags = []) {
  return tags.filter((tag) => !RESERVED_TAGS.has(tag));
}

const manifestPath = path.join(__dirname, "src", "_data", "imageManifest.json");
if (!fs.existsSync(manifestPath)) {
  throw new Error("No image manifest. Run npm run media:prepare first.");
}
const imageManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const siteImagePattern = /^\/images\/.*\.(?:png|jpe?g|webp|gif)$/i;

function getMediaMeta(src = "") {
  const meta = imageManifest.entries[src];
  if (!meta && siteImagePattern.test(src)) {
    throw new Error(`No prepared image for ${src}. Run npm run media:prepare.`);
  }
  return meta || null;
}

function bestImageUrl(src = "") {
  const meta = getMediaMeta(src);
  if (!meta) return src;
  if (meta.type === "loop") return meta.poster.url;
  return meta.images[meta.images.length - 1].url;
}

function renderMedia(src, alt = "", classes = "", priority = "auto", sizes = "100vw") {
  const meta = getMediaMeta(src);
  const eager = priority === "high";
  const loading = `loading="${eager ? "eager" : "lazy"}" fetchpriority="${eager ? "high" : "auto"}"`;
  const extraClasses = classes ? ` ${escapeHtml(classes)}` : "";
  const safeAlt = escapeHtml(alt);

  if (!meta) {
    return `<img src="${escapeHtml(src)}" alt="${safeAlt}" ${loading}>`;
  }

  const style = `--ratio-w:${meta.width}; --ratio-h:${meta.height}; --media-base:${meta.dominantColor}; --media-lqip:url('${meta.lqip}'); background-color:${meta.dominantColor}; background-image:url('${meta.lqip}'); aspect-ratio:${meta.width}/${meta.height};`;
  const size = `width="${meta.width}" height="${meta.height}"`;

  if (meta.type === "still") {
    const full = meta.images[meta.images.length - 1];
    const srcset = meta.images.map((image) => `${image.url} ${image.width}w`).join(", ");
    return `<span class="media media-still${extraClasses}" style="${style}">
<img class="media-image" src="${full.url}" srcset="${srcset}" sizes="${escapeHtml(sizes)}" alt="${safeAlt}" ${loading} decoding="async" ${size}>
</span>`;
  }

  const videos = escapeHtml(JSON.stringify(meta.videos.map((video) => ({ url: video.url, width: video.width }))));
  return `<span class="media media-loop${extraClasses}" data-videos="${videos}" style="${style}">
<img class="media-poster" src="${meta.poster.url}" alt="${safeAlt}" ${loading} decoding="async" ${size}>
<video class="media-video" muted loop playsinline preload="none" poster="${meta.poster.url}" aria-hidden="true" tabindex="-1" ${size}></video>
</span>`;
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy("src/images/**/*.svg");
  eleventyConfig.addPassthroughCopy({ "src/generated/media": "generated/media" });
  eleventyConfig.addPassthroughCopy({ "src/_server/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });

  const md = markdownIt({
    html: true,
    linkify: true,
    typographer: false
  }).use(markdownItAnchor, { slugify });

  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addFilter("slugify", slugify);
  eleventyConfig.addFilter("displayTags", getDisplayTags);
  eleventyConfig.addFilter("optimizedImage", bestImageUrl);
  eleventyConfig.addFilter("findBySlug", (items = [], slug = "") =>
    items.find((item) => item.data.slug === slug)
  );
  eleventyConfig.addFilter("orderBySlugs", (items = [], slugs = []) => {
    const itemsBySlug = new Map(items.map((item) => [item.data.slug, item]));
    return slugs.map((slug) => itemsBySlug.get(slug)).filter(Boolean);
  });
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

  eleventyConfig.addShortcode("media", renderMedia);
  eleventyConfig.addShortcode("image", renderImageFigure);

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
