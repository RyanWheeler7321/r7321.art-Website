const NAV_OPEN_CLASS = "nav-open";

function initNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-site-nav]");

  if (!toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle(NAV_OPEN_CLASS);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
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
      context.fillStyle = `rgba(149, 214, 255, ${particle.alpha})`;
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
    const filterButtons = [...browser.querySelectorAll("[data-filter-group]")];
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

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.dataset.filterGroup;
        const value = button.dataset.filterValue;
        state[group] = value;

        browser
          .querySelectorAll(`[data-filter-group="${group}"]`)
          .forEach((entry) => entry.classList.toggle("is-active", entry === button));

        applyFilters();
      });
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
    if (!toc) {
      return;
    }

    const headings = [...prose.querySelectorAll("h2, h3")];
    if (!headings.length) {
      toc.innerHTML = "<p class=\"toc-empty\">No sections in this entry.</p>";
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
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initParticles();
  initBrowsePanels();
  initToolFilters();
  initToc();
});

