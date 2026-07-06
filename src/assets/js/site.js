const NAV_OPEN_CLASS = "nav-open";

function initNavigation() {
  const header = document.querySelector("[data-site-header]");
  const inner = document.querySelector("[data-site-header-inner]");
  const brand = document.querySelector("[data-site-brand]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  const navList = nav ? nav.querySelector(".nav-list") : null;
  const socialList = nav ? nav.querySelector(".social-list") : null;

  if (!toggle || !nav || !navList || !socialList || !header || !inner || !brand) {
    return;
  }

  const mobileQuery = window.matchMedia("(max-width: 840px)");
  let frameId = 0;

  function getNumericStyle(element, property) {
    return Number.parseFloat(getComputedStyle(element)[property]) || 0;
  }

  function updateHeaderFit() {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => {
      try {
        inner.style.setProperty("--header-fit-scale", "1");

        if (mobileQuery.matches) {
          const trayWidth = Math.max(280, header.clientWidth - 28);
          const mobileScale = Math.max(1, Math.min(1.34, trayWidth / 300));
          inner.style.setProperty("--mobile-menu-scale", mobileScale.toFixed(3));
          return;
        }

        inner.style.setProperty("--mobile-menu-scale", "1");

        const paddingLeft = getNumericStyle(inner, "paddingLeft");
        const paddingRight = getNumericStyle(inner, "paddingRight");
        const availableWidth = Math.max(0, header.clientWidth - 40 - paddingLeft - paddingRight);
        const contentGap = getNumericStyle(inner, "columnGap") || getNumericStyle(inner, "gap");
        const navGap = getNumericStyle(nav, "columnGap") || getNumericStyle(nav, "gap");
        const brandWidth = brand.getBoundingClientRect().width;
        const navWidth = navList.scrollWidth + socialList.scrollWidth + navGap;
        const naturalWidth = brandWidth + navWidth + contentGap;
        const fitScale = naturalWidth > 0 ? Math.min(1, availableWidth / naturalWidth) : 1;

        inner.style.setProperty("--header-fit-scale", Math.max(0.52, fitScale).toFixed(3));
      } catch (error) {
        inner.style.setProperty("--header-fit-scale", "1");
        inner.style.setProperty("--mobile-menu-scale", "1");
      }
    });
  }

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle(NAV_OPEN_CLASS);
    toggle.setAttribute("aria-expanded", String(isOpen));
    updateHeaderFit();
  });

  if (typeof ResizeObserver === "function") {
    const resizeObserver = new ResizeObserver(updateHeaderFit);
    resizeObserver.observe(header);
    resizeObserver.observe(inner);
    resizeObserver.observe(nav);
    resizeObserver.observe(brand);
  }

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", updateHeaderFit);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(updateHeaderFit);
  }

  window.addEventListener("resize", updateHeaderFit);
  updateHeaderFit();
}

function initParticles() {
  const canvas = document.querySelector("[data-particle-canvas]");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const particles = [];
  const particleCount = window.innerWidth < 900 ? 28 : 48;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function makeParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.2 + 1.2,
      speedX: (Math.random() - 0.5) * 0.18,
      speedY: (Math.random() - 0.5) * 0.22,
      alpha: Math.random() * 0.45 + 0.08
    };
  }

  function seed() {
    particles.length = 0;
    for (let index = 0; index < particleCount; index += 1) {
      particles.push(makeParticle());
    }
  }

  function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((particle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < -20) particle.x = canvas.width + 20;
      if (particle.x > canvas.width + 20) particle.x = -20;
      if (particle.y < -20) particle.y = canvas.height + 20;
      if (particle.y > canvas.height + 20) particle.y = -20;

      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = `rgba(195, 138, 255, ${particle.alpha})`;
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      context.restore();
    });

    requestAnimationFrame(draw);
  }

  resize();
  seed();
  draw();

  window.addEventListener("resize", () => {
    resize();
    seed();
  });
}

function initBrowsePanels() {
  document.querySelectorAll("[data-browser]").forEach((browser) => {
    const items = [...browser.querySelectorAll("[data-item]")];
    const panels = [...browser.querySelectorAll("[data-panel]")];
    const filterControls = [...browser.querySelectorAll("[data-filter-group]")];
    const state = {
      tag: "all",
      project: "all"
    };

    function visibleItems() {
      return items.filter((item) => !item.hidden);
    }

    function setActive(slug) {
      items.forEach((item) => {
        item.classList.toggle("is-active", item.dataset.slug === slug);
      });

      panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.slug === slug);
      });
    }

    function applyFilters() {
      items.forEach((item) => {
        const tagValues = (item.dataset.tags || "").split("|").filter(Boolean);
        const matchesTag = state.tag === "all" || tagValues.includes(state.tag);
        const matchesProject = state.project === "all" || item.dataset.project === state.project;
        item.hidden = !(matchesTag && matchesProject);
      });

      const nextActive = visibleItems()[0];
      if (!nextActive) {
        panels.forEach((panel) => panel.classList.remove("is-active"));
        return;
      }

      const currentActive = items.find((item) => item.classList.contains("is-active") && !item.hidden);
      setActive((currentActive || nextActive).dataset.slug);
    }

    items.forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();
        const slug = item.dataset.slug;
        history.replaceState(null, "", `#${slug}`);
        setActive(slug);
      });
    });

    filterControls.forEach((control) => {
      const handler = () => {
        const group = control.dataset.filterGroup;
        const value = control.tagName === "SELECT" ? control.value : control.dataset.filterValue;
        state[group] = value;
        applyFilters();
      };

      control.addEventListener(control.tagName === "SELECT" ? "change" : "click", handler);
    });

    const hash = window.location.hash.replace("#", "");
    const initial = items.find((item) => item.dataset.slug === hash) || items[0];
    if (initial) {
      setActive(initial.dataset.slug);
    }
  });
}

function initToolFilters() {
  const wrapper = document.querySelector("[data-tool-filter]");
  const grid = document.querySelector("[data-tool-grid]");

  if (!wrapper || !grid) {
    return;
  }

  const buttons = [...wrapper.querySelectorAll("[data-tool-filter-value]")];
  const items = [...grid.querySelectorAll("[data-tool-item]")];

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.toolFilterValue;
      buttons.forEach((entry) => entry.classList.toggle("is-active", entry === button));
      items.forEach((item) => {
        const tags = (item.dataset.tags || "").split("|").filter(Boolean);
        item.hidden = !(value === "all" || tags.includes(value));
      });
    });
  });
}

function initToc() {
  document.querySelectorAll("[data-prose]").forEach((prose) => {
    const toc = prose.closest("section")?.querySelector("[data-toc]");
    const tocCard = prose.closest("section")?.querySelector("[data-toc-card]");
    if (!toc) {
      return;
    }

    const headings = [...prose.querySelectorAll("h2, h3")];
    if (!headings.length) {
      if (tocCard) {
        tocCard.hidden = true;
        tocCard.classList.remove("is-ready");
      }
      return;
    }

    const links = headings.map((heading) => {
      if (!heading.id) {
        heading.id = heading.textContent
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      return `<a href="#${heading.id}" class="toc-link toc-${heading.tagName.toLowerCase()}">${heading.textContent}</a>`;
    });

    toc.innerHTML = links.join("");
    if (tocCard) {
      tocCard.hidden = false;
      tocCard.classList.add("is-ready");
    }
  });
}

function initProgressiveMedia() {
  document.querySelectorAll(".progressive-media").forEach((wrapper) => {
    const full = wrapper.querySelector(".progressive-full");
    if (!full) {
      return;
    }

    let loaded = false;
    const markLoaded = () => {
      if (loaded || !full.naturalWidth) {
        return;
      }
      loaded = true;
      wrapper.classList.add("is-loaded");
    };

    if (full.complete && full.naturalWidth) {
      markLoaded();
      return;
    }

    if (typeof full.decode === "function") {
      full.decode().then(markLoaded).catch(() => {});
    }

    full.addEventListener("load", markLoaded, { once: true });

    let tries = 0;
    const interval = window.setInterval(() => {
      tries += 1;
      if (full.complete && full.naturalWidth) {
        markLoaded();
        window.clearInterval(interval);
        return;
      }

      if (tries > 40) {
        window.clearInterval(interval);
      }
    }, 250);
  });
}

function initProgressiveLoops() {
  document.querySelectorAll(".progressive-loop").forEach((wrapper) => {
    const preview = wrapper.querySelector(".loop-preview");
    const full = wrapper.querySelector(".loop-full");

    if (!preview || !full) {
      return;
    }

    let activated = false;

    const activate = () => {
      if (activated || !full.readyState) {
        return;
      }

      activated = true;

      try {
        if (Number.isFinite(full.duration) && full.duration > 0 && Number.isFinite(preview.currentTime)) {
          full.currentTime = preview.currentTime % full.duration;
        }
      } catch (error) {
      }

      const playResult = full.play();
      if (playResult && typeof playResult.catch === "function") {
        playResult.catch(() => {});
      }

      wrapper.classList.add("is-loaded");
      preview.pause();
    };

    const previewPlay = preview.play();
    if (previewPlay && typeof previewPlay.catch === "function") {
      previewPlay.catch(() => {});
    }

    if (full.readyState >= 2) {
      activate();
      return;
    }

    full.addEventListener("loadeddata", activate, { once: true });
    full.addEventListener("canplay", activate, { once: true });
  });
}

function initImageZoom() {
  const mediaItems = [...document.querySelectorAll(".detail-prose .media-frame .progressive-media, .detail-prose .media-gallery .progressive-media")];

  if (!mediaItems.length) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "image-zoom-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `<div class="image-zoom-stage" role="dialog" aria-modal="true"><img alt=""></div>`;
  document.body.appendChild(overlay);

  const zoomImage = overlay.querySelector("img");
  let isOpen = false;
  let closeTimer = 0;

  function closeZoom() {
    if (!isOpen) {
      return;
    }

    isOpen = false;
    overlay.classList.add("is-closing");
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("image-zoom-active");
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (!isOpen) {
        overlay.classList.remove("is-closing");
        zoomImage.removeAttribute("src");
        zoomImage.alt = "";
        zoomImage.style.transformOrigin = "center center";
      }
    }, 320);
  }

  function openZoom(wrapper) {
    const full = wrapper.querySelector(".progressive-full") || wrapper.querySelector("img");
    if (!full) {
      return;
    }

    window.clearTimeout(closeTimer);
    zoomImage.src = full.currentSrc || full.src;
    zoomImage.alt = full.alt || "";
    zoomImage.style.transformOrigin = "center center";
    overlay.classList.remove("is-closing");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("image-zoom-active");
    isOpen = true;

    requestAnimationFrame(() => {
      overlay.classList.add("is-open");
    });
  }

  mediaItems.forEach((wrapper) => {
    wrapper.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      openZoom(wrapper);
    });
  });

  overlay.addEventListener("click", (event) => {
    if (event.target !== zoomImage) {
      closeZoom();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeZoom();
    }
  });
}


function parseCssPx(element, propertyName, fallback = 0) {
  const value = getComputedStyle(element).getPropertyValue(propertyName).trim();
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function initDetailTitleFit() {
  const stages = [...document.querySelectorAll(".detail-title-stage")];
  if (!stages.length) return;

  let frameId = 0;

  function fitStage(stage) {
    const title = stage.querySelector(".detail-title-heading, h1");
    if (!title) return;

    const tags = stage.querySelector(".detail-title-tags");
    const date = stage.querySelector(".detail-title-date");
    const styles = getComputedStyle(stage);
    const isStacked = styles.display === "flex" || getComputedStyle(tags || stage).position === "static";

    stage.style.setProperty("--detail-title-fit-scale", "1");
    stage.style.setProperty("--detail-title-side-reserve", "0px");

    if (isStacked) return;

    const gap = 28;
    const tagWidth = tags ? tags.getBoundingClientRect().width : 0;
    const dateWidth = date ? date.getBoundingClientRect().width : 0;
    const reserve = Math.ceil(Math.max(tagWidth, dateWidth) + gap);
    const available = Math.max(260, stage.clientWidth - reserve * 2);
    stage.style.setProperty("--detail-title-side-reserve", `${reserve}px`);

    const naturalWidth = Math.max(title.scrollWidth, title.getBoundingClientRect().width);
    const scale = naturalWidth > available ? Math.max(0.58, available / naturalWidth) : 1;
    stage.style.setProperty("--detail-title-fit-scale", scale.toFixed(3));
  }

  function update() {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => stages.forEach(fitStage));
  }

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(update);
    stages.forEach((stage) => observer.observe(stage));
  }

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(update).catch(() => {});
  }

  window.addEventListener("resize", update);
  update();
}

function bevelPath(width, height, corner, inset = 0) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const i = Math.max(0, Math.min(inset, w / 2, h / 2));
  const left = i;
  const top = i;
  const right = Math.max(left, w - i);
  const bottom = Math.max(top, h - i);
  const c = Math.max(0, Math.min(corner, (right - left) / 2, (bottom - top) / 2));
  return `M ${left + c} ${top} H ${right - c} L ${right} ${top + c} V ${bottom - c} L ${right - c} ${bottom} H ${left + c} L ${left} ${bottom - c} V ${top + c} Z`;
}

function hexPath(width, height, corner, inset = 0) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const i = Math.max(0, Math.min(inset, w / 2, h / 2));
  const left = i;
  const top = i;
  const right = Math.max(left, w - i);
  const bottom = Math.max(top, h - i);
  const c = Math.max(0, Math.min(corner, (right - left) / 2));
  const cy = top + (bottom - top) / 2;
  return `M ${left + c} ${top} H ${right - c} L ${right} ${cy} L ${right - c} ${bottom} H ${left + c} L ${left} ${cy} Z`;
}

function frameFillPath(width, height, metrics) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const c = Math.max(0, Math.min(metrics.corner, w / 2, h / 2));
  const cx = w / 2;
  const notchY = Math.min(24, Math.max(12, h * 0.18));
  const gemInset = 24;
  const inner = Math.min(metrics.inner, Math.max(12, w * 0.08));
  const shoulder = Math.min(metrics.shoulder, Math.max(inner + 20, w * 0.22));
  const top = Math.min(metrics.top, Math.max(shoulder + 12, w * 0.26));
  const edge = Math.min(metrics.edge, Math.max(top + 20, w / 2 - c));
  return [
    `M ${c} 0`,
    `H ${Math.max(c, cx - edge)}`,
    `H ${Math.max(c, cx - top)}`,
    `L ${Math.max(c, cx - shoulder)} ${notchY}`,
    `H ${Math.max(c, cx - inner)}`,
    `L ${Math.max(c, cx - gemInset)} 8`,
    `H ${Math.min(w - c, cx + gemInset)}`,
    `L ${Math.min(w - c, cx + inner)} ${notchY}`,
    `H ${Math.min(w - c, cx + shoulder)}`,
    `L ${Math.min(w - c, cx + top)} 0`,
    `H ${Math.min(w - c, cx + edge)}`,
    `H ${w - c}`,
    `L ${w} ${c}`,
    `V ${h}`,
    `H 0`,
    `V ${c}`,
    "Z"
  ].join(" ");
}

function frameStrokePath(width, height, metrics, inset = 0) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const i = Math.max(0, Math.min(inset, w / 2, h / 2));
  const left = i;
  const topY = i;
  const right = Math.max(left, w - i);
  const bottom = Math.max(topY, h - i);
  const c = Math.max(0, Math.min(metrics.corner, (right - left) / 2, (bottom - topY) / 2));
  const cx = w / 2;
  const notchY = topY + Math.min(24, Math.max(12, h * 0.18));
  const gemInset = 24;
  const inner = Math.min(metrics.inner, Math.max(12, w * 0.08));
  const shoulder = Math.min(metrics.shoulder, Math.max(inner + 20, w * 0.22));
  const top = Math.min(metrics.top, Math.max(shoulder + 12, w * 0.26));
  const edge = Math.min(metrics.edge, Math.max(top + 20, w / 2 - c));
  return [
    `M ${left + c} ${topY}`,
    `H ${Math.max(left + c, cx - edge)}`,
    `H ${Math.max(left + c, cx - top)}`,
    `L ${Math.max(left + c, cx - shoulder)} ${notchY}`,
    `H ${Math.max(left + c, cx - inner)}`,
    `L ${Math.max(left + c, cx - gemInset)} ${topY + 8}`,
    `H ${Math.min(right - c, cx + gemInset)}`,
    `L ${Math.min(right - c, cx + inner)} ${notchY}`,
    `H ${Math.min(right - c, cx + shoulder)}`,
    `L ${Math.min(right - c, cx + top)} ${topY}`,
    `H ${Math.min(right - c, cx + edge)}`,
    `H ${right - c}`,
    `L ${right} ${topY + c}`,
    `V ${bottom - c}`,
    `L ${right - c} ${bottom}`,
    `H ${left + c}`,
    `L ${left} ${bottom - c}`,
    `V ${topY + c}`,
    `L ${left + c} ${topY}`
  ].join(" ");
}

function makeSvg(className, innerHtml) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.innerHTML = innerHtml;
  return svg;
}

function initVectorFrames() {
  const frameItems = [...document.querySelectorAll(".r-frame-longform")];
  const bevelSelectors = ".site-header-inner, .nav-toggle, .button, .feature-link, .panel-link, .tag-chip, .chip-button, .update-button, .project-button, .project-card, .tool-grid-card, .home-list-card, .browse-item, .inline-card-link, .callout, .tool-card, .browse-sidebar, .browse-panel, .detail-aside-card, .empty-state-card, .home-column-panel, .tool-icon-fallback";
  const bevelItems = [...document.querySelectorAll(bevelSelectors)];
  const allItems = [...frameItems, ...bevelItems];
  if (!allItems.length) return;

  frameItems.forEach((item) => {
    if (item.querySelector(":scope > .r-frame-vector")) return;
    const svg = makeSvg("r-frame-vector", '<path class="r-frame-vector-fill"></path><path class="r-frame-vector-stroke"></path>');
    item.prepend(svg);
    item.classList.add("has-vector-frame");
  });

  bevelItems.forEach((item) => {
    if (item.querySelector(":scope > .r-bevel-vector")) return;
    const svg = makeSvg("r-bevel-vector", '<path class="r-bevel-vector-stroke"></path>');
    item.append(svg);
    item.classList.add("has-bevel-vector");
  });

  let frameId = 0;

  function updateItem(item) {
    const rect = item.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    const frameSvg = item.querySelector(":scope > .r-frame-vector");
    if (frameSvg) {
      frameSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      const metrics = {
        corner: parseCssPx(item, "--r-frame-corner", 24),
        edge: parseCssPx(item, "--r-frame-fill-notch-edge", 430),
        top: parseCssPx(item, "--r-frame-fill-notch-top", 170),
        shoulder: parseCssPx(item, "--r-frame-fill-notch-shoulder", 146),
        inner: parseCssPx(item, "--r-frame-fill-notch-inner", 40),
        notchWidth: parseCssPx(item, "--r-frame-notch-width", 430)
      };
      const outlineWidth = parseCssPx(item, "--r-frame-outline-width", 1.35);
      frameSvg.querySelector(".r-frame-vector-fill")?.setAttribute("d", frameFillPath(rect.width, rect.height, metrics));
      frameSvg.querySelector(".r-frame-vector-stroke")?.setAttribute("d", frameStrokePath(rect.width, rect.height, metrics, outlineWidth / 2));
    }

    const bevelSvg = item.querySelector(":scope > .r-bevel-vector");
    if (bevelSvg) {
      bevelSvg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      const outlineWidth = parseCssPx(item, "--card-outline-width", 1.3);
      const corner = parseCssPx(item, "--card-bevel", parseCssPx(item, "--bevel", 18));
      const kind = getComputedStyle(item).getPropertyValue("--shape-outline-kind").trim();
      const path = kind === "hex" ? hexPath(rect.width, rect.height, corner, outlineWidth / 2) : bevelPath(rect.width, rect.height, corner, outlineWidth / 2);
      bevelSvg.querySelector(".r-bevel-vector-stroke")?.setAttribute("d", path);
    }
  }

  function update() {
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(() => allItems.forEach(updateItem));
  }

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(update);
    allItems.forEach((item) => observer.observe(item));
  }

  window.addEventListener("resize", update);
  update();
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initParticles();
  initBrowsePanels();
  initToolFilters();
  initToc();
  initDetailTitleFit();
  initVectorFrames();
  initProgressiveMedia();
  initProgressiveLoops();
  initImageZoom();
});
