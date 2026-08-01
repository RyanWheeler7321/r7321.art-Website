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

function escapeHtml(value = "") {
  return value
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeChoice(value = "", allowed = [], fallback = "") {
  const normalized = value.toString().trim().toLowerCase().split(/\s+/)[0];
  return allowed.includes(normalized) ? normalized : fallback;
}

function hasChoiceFlag(value = "", flag = "") {
  return value.toString().trim().toLowerCase().split(/\s+/).includes(flag);
}

function renderMediaCaption(caption = "", credit = "", align = "center", placement = "bottom") {
  if (!caption && !credit) {
    return "";
  }

  const safeAlign = normalizeChoice(align, ["left", "center", "right"], "center");
  const safePlacement = normalizeChoice(placement, ["top", "bottom"], "bottom");
  const justifyClass = hasChoiceFlag(align, "justify") ? " media-caption-justify" : "";
  return `<div class="media-caption-block media-caption-block-${safePlacement} media-caption-${safeAlign}${justifyClass}">
${credit ? `<div class="media-caption-credit">${escapeHtml(credit)}</div>` : ""}
${caption ? `<figcaption class="media-caption-main">${caption}</figcaption>` : ""}
</div>`;
}

function renderImageFigure(src, alt = "", caption = "", classes = "", credit = "", align = "center", placement = "bottom", topCaption = "", topCredit = "", topAlign = "") {
  const safePlacement = normalizeChoice(placement, ["top", "bottom", "both"], "bottom");
  const safeAlign = normalizeChoice(align, ["left", "center", "right"], "center");
  const safeTopAlign = normalizeChoice(topAlign || align, ["left", "center", "right"], safeAlign);
  const classList = ["media-frame", classes, `media-frame-caption-${safeAlign}`].filter(Boolean).join(" ");
  const meta = getMediaMeta(src);
  const styleAttr = meta ? ` style="--media-ratio-w:${meta.width}; --media-ratio-h:${meta.height};"` : "";
  const showTop = safePlacement === "top" || safePlacement === "both" || topCaption || topCredit;
  const showBottom = safePlacement === "bottom" || safePlacement === "both";
  const topBlock = showTop ? renderMediaCaption(topCaption || (safePlacement === "top" ? caption : ""), topCredit || (safePlacement === "top" ? credit : ""), topAlign || align, "top") : "";
  const bottomBlock = showBottom ? renderMediaCaption(caption, credit, align, "bottom") : "";

  return `<figure class="${classList}"${styleAttr}>
${topBlock}
${renderManagedImage(src, alt, "", false)}
${bottomBlock}
</figure>`;
}

function getDisplayTags(tags = []) {
  return tags.filter((tag) => !RESERVED_TAGS.has(tag));
}

function loadImageManifest() {
  const manifestPath = path.join(__dirname, "src", "_data", "imageManifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("Media manifest is missing. Run npm run media:prepare before Eleventy.");
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schemaVersion !== 2 || !manifest.recipeVersion || !manifest.entries) {
    throw new Error("Media manifest is stale. Run npm run media:prepare before Eleventy.");
  }
  return manifest;
}

const imageManifest = loadImageManifest();
const managedRasterPattern = /^\/images\/.*\.(?:png|jpe?g|webp|gif)$/i;

function getMediaMeta(src = "") {
  const meta = imageManifest.entries[src];
  if (!meta && managedRasterPattern.test(src)) {
    if (process.env.MEDIA_STRICT === "0") return null;
    throw new Error(`Managed media is missing or stale for ${src}. Run npm run media:prepare.`);
  }
  return meta || null;
}

function bestImageUrl(src = "") {
  const meta = getMediaMeta(src);
  if (!meta) return src;
  if (meta.type === "loop") return meta.poster.url;
  return meta.images[meta.images.length - 1].url;
}

function normalizePriority(priority) {
  return priority === true || priority === "high" ? "high" : "auto";
}

function renderManagedMedia(src, alt = "", classes = "", priority = "auto", sizes = "100vw", motion = "auto") {
  const meta = getMediaMeta(src);
  const safePriority = normalizePriority(priority);
  const loading = safePriority === "high" ? "eager" : "lazy";
  const fetchpriority = safePriority === "high" ? "high" : "auto";
  const classAttr = classes ? ` ${escapeHtml(classes)}` : "";
  const safeAlt = escapeHtml(alt);

  if (!meta) {
    if (managedRasterPattern.test(src)) {
      return `<span class="managed-media-error" role="img" aria-label="Missing media: ${escapeHtml(src)}"></span>`;
    }
    return `<img src="${escapeHtml(src)}" alt="${safeAlt}" loading="${loading}" fetchpriority="${fetchpriority}">`;
  }

  const style = `--ratio-w:${meta.width}; --ratio-h:${meta.height}; --media-base:${meta.dominantColor}; --media-lqip:url('${meta.lqip}'); background-color:${meta.dominantColor}; background-image:url('${meta.lqip}'); aspect-ratio:${meta.width}/${meta.height};`;
  const common = `data-r7-media data-media-key="${escapeHtml(src)}" data-media-kind="${meta.type}" data-media-priority="${safePriority}" data-media-state="base"`;

  if (meta.type === "still" || motion === "still") {
    const candidates = meta.type === "still" ? meta.images : [meta.poster];
    const full = candidates[candidates.length - 1];
    const srcset = candidates.map((variant) => `${variant.url} ${variant.width}w`).join(", ");
    return `<span class="progressive-media managed-media${classAttr}" ${common} style="${style}">
<img class="progressive-full managed-media-image" src="${full.url}"${srcset ? ` srcset="${srcset}" sizes="${escapeHtml(sizes)}"` : ""} alt="${safeAlt}" loading="${loading}" fetchpriority="${fetchpriority}" decoding="async" width="${meta.width}" height="${meta.height}">
</span>`;
  }

  const variants = escapeHtml(JSON.stringify(meta.videos.map((variant) => ({
    url: variant.url,
    width: variant.width,
    height: variant.height,
    bytes: variant.bytes,
    mime: variant.mime
  }))));
  return `<span class="progressive-loop managed-media${classAttr}" ${common} data-media-variants="${variants}" style="${style}">
<img class="managed-media-poster" src="${meta.poster.url}" alt="${safeAlt}" loading="${loading}" fetchpriority="${fetchpriority}" decoding="async" width="${meta.width}" height="${meta.height}">
<video class="managed-media-video" muted loop playsinline preload="none" poster="${meta.poster.url}" aria-hidden="true" tabindex="-1" width="${meta.width}" height="${meta.height}"></video>
</span>`;
}

function renderManagedImage(src, alt = "", classes = "", eager = false) {
  return renderManagedMedia(src, alt, classes, eager ? "high" : "auto");
}

function renderManagedLoop(src, alt = "", classes = "") {
  return renderManagedMedia(src, alt, classes);
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/api": "api" });
  eleventyConfig.addPassthroughCopy("src/images/**/*.svg");
  eleventyConfig.addPassthroughCopy({ "src/generated/media": "generated/media" });
  eleventyConfig.addPassthroughCopy({ "src/_server/generated.htaccess": "generated/.htaccess" });
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
  eleventyConfig.addFilter("optimizedImage", bestImageUrl);
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
  eleventyConfig.addShortcode("media", (src, alt = "", classes = "", priority = "auto", sizes = "100vw", motion = "auto") =>
    renderManagedMedia(src, alt, classes, priority, sizes, motion)
  );

  eleventyConfig.addShortcode("image", (src, alt = "", caption = "", classes = "", credit = "", align = "center", placement = "bottom", topCaption = "", topCredit = "", topAlign = "") =>
    renderImageFigure(src, alt, caption, classes, credit, align, placement, topCaption, topCredit, topAlign)
  );

  eleventyConfig.addShortcode("essayImage", (src, alt = "", caption = "", credit = "", align = "center", placement = "bottom", topCaption = "", topCredit = "", topAlign = "", classes = "") =>
    renderImageFigure(src, alt, caption, classes, credit, align, placement, topCaption, topCredit, topAlign)
  );

  eleventyConfig.addShortcode("gif", (src, alt = "", caption = "", credit = "", align = "center", placement = "bottom") =>
    renderImageFigure(src, alt, caption, "media-frame-gif", credit, align, placement)
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
