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
      radius: Math.random() * 1.8 + 0.4,
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

      context.beginPath();
      context.fillStyle = `rgba(195, 138, 255, ${particle.alpha})`;
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
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

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initParticles();
  initBrowsePanels();
  initToolFilters();
  initToc();
  initProgressiveMedia();
  initProgressiveLoops();
});
