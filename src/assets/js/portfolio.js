// Portfolio pages: header light, cursor-lit dot grid, justified picture rows and the project viewer
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; };
const out = 'cubic-bezier(.16,1,.3,1)', wipe = 'cubic-bezier(.77,0,.18,1)';
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const phone = () => innerWidth <= 760;

// The light under the header slides to the hovered section and back to the current one
function initHeader() {
  const nav = $('.sections'), light = $('.light', nav), on = $('a.on', nav);
  if (!on) { light.remove(); return; }
  const moveTo = (a, snap) => {
    const n = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
    if (snap) light.style.transition = 'none';
    light.style.left = `${r.left - n.left}px`;
    light.style.width = `${r.width}px`;
    if (snap) { light.offsetWidth; light.style.transition = ''; }
  };
  document.fonts.ready.then(() => moveTo(on, true));
  addEventListener('resize', () => moveTo(on, true));
  $$('a', nav).forEach((a) => a.addEventListener('pointerenter', () => moveTo(a)));
  nav.addEventListener('pointerleave', () => moveTo(on));
}

// A small patch of lit dots follows the cursor, lined up with the grid behind it
function initGlow() {
  const glow = $('.glow');
  let x = 0, y = 0, queued = false;
  const draw = () => {
    queued = false;
    const half = glow.offsetWidth / 2, left = Math.round(x - half), top = Math.round(y - half);
    glow.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    glow.style.backgroundPosition = `${-left % 22}px ${-top % 22}px`;
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    x = e.clientX; y = e.clientY;
    glow.classList.add('on');
    if (!queued) { queued = true; requestAnimationFrame(draw); }
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => glow.classList.remove('on'));
}

initHeader();
initGlow();

const data = $('#works') && JSON.parse($('#works').textContent);
if (data) initWalls(data);

function initWalls(data) {
  const works = Object.fromEntries(data.works.map((w) => [w.id, w]));
  // Tiles of one group (a game's separate pictures) open the whole set, starting at the one clicked
  const own = Object.fromEntries(data.works.map((w) => [w.id, w.imgs[0]]));
  for (const w of data.works) if (w.group) w.imgs = [own[w.id], ...data.works.filter((x) => x.group === w.group && x !== w).map((x) => own[x.id])];
  const walls = $$('.wall'), tiles = $$('.tile');
  const heroSizes = '(max-width: 760px) 100vw, 70vw';
  let viewer = null, current = null, k = 0, width = 0, change = 0;

  // Rows of equal height that fill the width exactly, with breaks chosen so row heights stay near the target
  function justify(ratios, full, target, gap) {
    const fill = (i, j) => (full - gap * (j - i - 1)) / ratios.slice(i, j).reduce((a, r) => a + r, 0);
    const best = [{ cost: 0 }];
    for (let j = 1; j <= ratios.length; j++) {
      best[j] = { cost: Infinity };
      for (let i = j - 1; i >= 0; i--) {
        const h = fill(i, j), d = Math.log(h / target), cost = best[i].cost + d * d;
        if (cost < best[j].cost) best[j] = { cost, from: i, h };
      }
    }
    const rows = [];
    // a short row (one lone wide picture) never blows up past a little over the target height
    for (let j = ratios.length; j > 0; j = best[j].from) rows.unshift({ from: best[j].from, to: j, h: Math.min(best[j].h, target * 1.3) });
    return rows;
  }

  function layout() {
    const target = phone() ? 130 : innerWidth < 1300 ? 220 : 280, gap = phone() ? 8 : 14;
    for (const wall of walls) {
      const items = $$('.tile', wall), full = wall.clientWidth;
      wall.classList.add('rows');
      wall.replaceChildren();
      let used = 0;
      const own = !phone() && wall.dataset.target ? wall.dataset.target * (innerWidth < 1300 ? 0.8 : 1) : target;
      for (const { from, to, h } of justify(items.map((t) => t.dataset.w / t.dataset.h), full, own, gap)) {
        const row = html('<div class="row"></div>');
        for (const t of items.slice(from, to)) {
          const w = h * t.dataset.w / t.dataset.h;
          t.style.width = `${w.toFixed(1)}px`;
          t.style.height = `${h.toFixed(1)}px`;
          const img = $('img', t);
          if (img) fetchAt(img, w);
          row.append(t);
        }
        wall.append(row);
        shade(row);
        used = Math.max(used, h * items.slice(from, to).reduce((a, t) => a + t.dataset.w / t.dataset.h, 0) + gap * (to - from - 1));
      }
      // the field behind the wall ends where its widest row does
      wall.style.setProperty('--used', `${Math.min(used, full)}px`);
    }
    document.body.classList.add('laid');
    width = innerWidth;
  }

  // Pictures carry their sources as data until their laid-out width is known, so each loads once at the right size
  function fetchAt(img, w) {
    // a picture the viewer already asked for keeps the same sizes, so the browser picks the same file instead of a second one
    img.sizes = early.has(img.dataset.src ?? img.getAttribute('src')) ? heroSizes : `${Math.ceil(w)}px`;
    if (img.dataset.srcset) { img.srcset = img.dataset.srcset; delete img.dataset.srcset; }
    if (img.dataset.src) { img.src = img.dataset.src; delete img.dataset.src; }
  }

  // A faint glow in each picture's own colour, read once from an 8px copy of it
  function shade(row) {
    if (!row || !row.classList.contains('row')) return;
    for (const t of $$('.tile', row)) {
      const img = $('img', t);
      if (!img || t.style.getPropertyValue('--glow')) continue;
      if (!img.complete || !img.naturalWidth) { img.addEventListener('load', () => shade(row), { once: true }); continue; }
      const c = document.createElement('canvas'); c.width = c.height = 8;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 8, 8);
      const px = g.getImageData(0, 0, 8, 8).data; let r = 0, gr = 0, b = 0, n = 0;
      for (let i = 0; i < px.length; i += 4) { const w = px[i] + px[i + 1] + px[i + 2] + 20; r += px[i] * w; gr += px[i + 1] * w; b += px[i + 2] * w; n += w; }
      const k = 200 / (Math.max(r, gr, b) / n || 1);
      t.style.setProperty('--glow', `rgb(${r / n * k | 0} ${gr / n * k | 0} ${b / n * k | 0} / .3)`);
    }
  }

  // Pictures wipe in once, starting just before they scroll into view
  function initReveal() {
    if (still) { tiles.forEach((t) => t.classList.add('shown')); return; }
    // the wipe waits for the picture itself, so it never wipes in an empty frame and then pops
    const ready = (t) => { const img = $('img', t); return img && !img.complete ? img.decode().catch(() => {}) : Promise.resolve(); };
    const seen = new IntersectionObserver((entries) => {
      entries.filter((e) => e.isIntersecting).forEach((e, i) => {
        const t = e.target;
        seen.unobserve(t);
        ready(t).then(() => setTimeout(() => {
          t.classList.add('shown');
          // a crisp bottom-up wipe at the picture's own scale
          $('img, video', t).animate([{ clipPath: 'inset(100% 0 0 0)', opacity: .5 }, { clipPath: 'inset(0)', opacity: 1 }], { duration: 325, easing: out });
        }, Math.min(i, 6) * 25));
      });
    }, { rootMargin: '0px 0px 12% 0px' });
    tiles.forEach((t) => seen.observe(t));
  }

  // Hovering a picture starts loading its project's pictures, so the viewer opens on loaded images
  const loaded = new Set(), early = new Set();
  function preload(id) {
    if (loaded.has(id)) return;
    loaded.add(id);
    for (const m of works[id].imgs) {
      const img = new Image();
      img.sizes = heroSizes;
      if (m.srcset) img.srcset = m.srcset;
      img.src = m.src;
      early.add(m.src);
    }
  }

  const attr = (s) => String(s).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]);
  function media(m, title) {
    const alt = attr(title);
    if (m.type === 'sketchfab') {
      return `<iframe src="https://sketchfab.com/models/${encodeURIComponent(m.uid)}/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_watermark=0&ui_watermark_link=0&ui_controls=1&ui_settings=0&ui_vr=0&ui_ar=0&ui_help=0&ui_hint=0&transparent=0&dnt=1"
        title="${alt}" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen style="border:0"></iframe>`;
    }
    if (m.type === 'loop') {
      return `<video src="${m.video}" poster="${m.src}" autoplay muted loop playsinline aria-label="${alt}"></video>`;
    }
    return `<img src="${m.src}"${m.srcset ? ` srcset="${m.srcset}"` : ''} sizes="${heroSizes}" alt="${alt}" decoding="async">`;
  }

  const gap = 10;
  const mosaics = new Map();

  // Each band fits whole pictures into columns that share the same top and bottom.
  function band(imgs, order, groups, width) {
    let cursor = 0;
    const columns = groups.map((length) => {
      const indices = order.slice(cursor, cursor += length);
      return { indices, inverse: indices.reduce((sum, i) => sum + imgs[i].h / imgs[i].w, 0) };
    });
    const divisor = columns.reduce((sum, col) => sum + 1 / col.inverse, 0);
    const gaps = columns.reduce((sum, col) => sum + gap * (col.indices.length - 1) / col.inverse, 0);
    const slope = 1 / divisor, intercept = (gaps - gap * (columns.length - 1)) / divisor;
    const height = width * slope + intercept, rects = [];
    let x = 0;
    for (const col of columns) {
      const w = (height - gap * (col.indices.length - 1)) / col.inverse;
      let y = 0;
      for (const i of col.indices) {
        const h = w * imgs[i].h / imgs[i].w;
        rects.push({ i, x, y, w, h });
        y += h + gap;
      }
      x += w + gap;
    }
    return { rects, height, slope, intercept };
  }

  function mosaic(imgs, id) {
    const count = imgs.length, width = 360, target = width / .85, results = [];
    let seed = 2166136261;
    for (const c of id) { seed = Math.imul(seed ^ c.charCodeAt(0), 16777619); }
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let n = Math.imul(seed ^ seed >>> 15, 1 | seed);
      n ^= n + Math.imul(n ^ n >>> 7, 61 | n);
      return ((n ^ n >>> 14) >>> 0) / 4294967296;
    };
    const patterns = { 1: [[1]], 2: [[1, 1], [2]], 3: [[1, 2], [2, 1], [1, 1, 1]],
      4: [[1, 2, 1], [1, 3], [3, 1], [2, 2]],
      5: [[1, 2, 2], [2, 1, 2], [2, 2, 1], [2, 3], [3, 2]],
      6: [[1, 2, 3], [3, 2, 1], [2, 1, 3], [3, 1, 2], [2, 3, 1], [1, 3, 2], [2, 2, 2]],
      7: [[1, 2, 2, 2], [2, 2, 2, 1], [2, 1, 2, 2], [2, 2, 1, 2]] };
    for (let trial = 0; trial < 8; trial++) {
      const order = imgs.map((_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const states = Array.from({ length: count + 1 }, () => []);
      states[0].push({ bands: [], height: 0, min: Infinity, max: 0, contrast: 0 });
      const rank = (s, used) => 3 * Math.abs(Math.log(s.height / (target * used / count)))
        + 10 * Math.max(0, Math.log(s.max / s.min / 6)) + s.contrast / s.bands.length;
      for (let used = 0; used < count; used++) {
        const buckets = new Map();
        for (const state of states[used]) {
          const key = `${Math.round(state.height / 10)}:${Math.round(state.max / state.min)}`;
          const old = buckets.get(key);
          if (!old || rank(state, used) < rank(old, used)) { buckets.set(key, state); }
        }
        const choices = used ? [...buckets.values()].sort((a, b) => rank(a, used) - rank(b, used)).slice(0, 24)
          : states[0];
        for (let size = count < 7 ? 1 : 3; size <= Math.min(7, count - used); size++) {
          for (const groups of patterns[size]) {
            const next = band(imgs, order.slice(used, used + size), groups, width);
            if (next.rects.some((r) => r.w <= 0 || r.h <= 0)) { continue; }
            const areas = next.rects.map((r) => r.w * r.h), min = Math.min(...areas), max = Math.max(...areas);
            next.max = max;
            next.side = next.rects[areas.indexOf(max)].x + next.rects[areas.indexOf(max)].w / 2 < width / 2;
            for (const state of choices) {
              states[used + size].push({ bands: [...state.bands, next],
                height: state.height + next.height + (used ? gap : 0),
                min: Math.min(state.min, min), max: Math.max(state.max, max),
                contrast: state.contrast + Math.abs(Math.log(max / min / 3)) });
            }
          }
        }
      }
      for (const state of states[count].sort((a, b) => rank(a, count) - rank(b, count)).slice(0, 48)) {
        let y = 0, balance = 0, sides = 0;
        const rects = [];
        for (const [i, row] of state.bands.entries()) {
          rects.push(...row.rects.map((r) => ({ ...r, y: r.y + y })));
          balance += Math.log(row.max / state.max) ** 2;
          if (i && row.side === state.bands[i - 1].side) { sides++; }
          y += row.height + gap;
        }
        const height = y - gap, bands = state.bands.length;
        results.push({ slope: height / width, intercept: 0, spread: state.max / state.min,
          quality: Math.exp(-(state.contrast + balance * 2 + sides * .35) / bands),
          build: (full) => {
            const scale = full / width;
            return { height: height * scale,
              rects: rects.map((r) => ({ i: r.i, x: r.x * scale, y: r.y * scale, w: r.w * scale, h: r.h * scale })) };
          } });
      }
    }
    const bounded = results.filter((r) => r.spread <= 6);
    // Two very different aspect ratios cannot always tile a rectangle within the area limit.
    const smallest = Math.min(...results.map((r) => r.spread));
    return bounded.length ? bounded : results.filter((r) => r.spread <= smallest * 1.02);
  }

  function sizeHero(box, w, loose) {
    const style = getComputedStyle(box), viewStyle = getComputedStyle(viewer), m = w.imgs[k], ratio = m.w / m.h;
    const frameX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const frameY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
      + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const full = Math.min(1800, viewer.clientWidth - parseFloat(viewStyle.paddingLeft)
      - parseFloat(viewStyle.paddingRight)) - frameX;
    const line = $(':scope > .cap', box), available = viewer.clientHeight - parseFloat(viewStyle.paddingTop) - parseFloat(viewStyle.paddingBottom) - frameY
      - (line ? line.getBoundingClientRect().height + parseFloat(style.rowGap) : 0);
    const title = $('.head', box), collage = $('.collage', box), space = parseFloat(style.columnGap);
    const heading = () => title.getBoundingClientRect().height + parseFloat(getComputedStyle(title).marginBottom);
    if (!collage) {
      let hw = Math.min(full, m.w), hh = hw / ratio;
      box.style.setProperty('--hero-width', `${hw}px`);
      box.style.width = `${hw + frameX}px`;
      if (!phone() && hh + heading() + space > available) {
        hh = Math.max(1, available - heading() - space);
        hw = hh * ratio;
      }
      box.style.setProperty('--hero-width', `${hw}px`);
      box.style.setProperty('--stage-height', `${hh}px`);
      box.style.width = `${hw + frameX}px`;
      return;
    }
    const key = `${w.id}:${phone() ? 'phone' : 'desktop'}`, saved = mosaics.get(key);
    const candidates = saved ? [saved] : mosaic(w.imgs, w.id);
    if (phone()) {
      const target = Math.min(full / .85, viewer.clientHeight * .6);
      let best = null;
      for (const choice of candidates) {
        const packed = choice.build(full);
        if (packed.rects.some((r) => r.w <= 0 || r.h <= 0)) { continue; }
        const smallest = Math.min(...packed.rects.map((r) => Math.min(r.w, r.h)));
        const score = Math.exp(-Math.abs(Math.log(packed.height / target)))
          * Math.min(1, smallest / 48) * choice.quality;
        if (!best || score > best.score) { best = { choice, packed, score }; }
      }
      mosaics.set(key, best.choice);
      box.style.width = `${full + frameX}px`;
      box.style.setProperty('--hero-width', `${full}px`);
      box.style.setProperty('--stage-height', `${Math.min(full / ratio, viewer.clientHeight * .48, m.h)}px`);
      box.style.setProperty('--pictures-width', `${full}px`);
      collage.style.height = `${best.packed.height}px`;
      placePictures(collage, best.packed.rects);
      return;
    }
    const total = full - space, maxHeight = loose ? available : Math.min(available, m.h);
    let rightWidth = Math.min(maxHeight * .85, total / (ratio / .85 + 1)), chosen = saved;
    box.style.setProperty('--pictures-width', `${rightWidth}px`);
    // A wrapped title changes the packing height, so measure it again at the chosen width.
    for (let pass = 0; pass < 3; pass++) {
      const head = heading();
      let best = null;
      for (const candidate of chosen ? [chosen] : candidates) {
        const stageHeight = Math.min(maxHeight,
          (candidate.slope * total + candidate.intercept + head) / (1 + candidate.slope * ratio));
        const rw = (stageHeight - head - candidate.intercept) / candidate.slope;
        if (rw <= 0 || stageHeight <= head) { continue; }
        const packed = candidate.build(rw);
        if (packed.rects.some((r) => r.w <= 0 || r.h <= 0)) { continue; }
        const smallest = Math.min(...packed.rects.map((r) => Math.min(r.w, r.h)));
        const portrait = Math.exp(-5 * Math.abs(Math.log(rw / packed.height / .85)));
        const score = portrait * stageHeight / maxHeight * Math.min(1, smallest / 48)
          * (rw < stageHeight * .95 ? 1 : .15) * (rw < stageHeight * ratio ? 1 : .4) * candidate.quality;
        if (!best || score > best.score) { best = { candidate, packed, rw, stageHeight, score }; }
      }
      if (!best) return false;
      chosen = best.candidate;
      mosaics.set(key, chosen);
      rightWidth = best.rw;
      box.style.setProperty('--pictures-width', `${rightWidth}px`);
      box.style.setProperty('--hero-width', `${best.stageHeight * ratio}px`);
      box.style.setProperty('--stage-height', `${best.stageHeight}px`);
      box.style.width = `${best.stageHeight * ratio + rightWidth + space + frameX}px`;
      collage.style.height = `${best.packed.height}px`;
      placePictures(collage, best.packed.rects);
      if (Math.abs(heading() - head) < .5) { break; }
    }
  }

  function placePictures(collage, rects) {
    for (const rect of rects) {
      const button = collage.children[rect.i];
      Object.assign(button.style, { left: `${rect.x}px`, top: `${rect.y}px`,
        width: `${rect.w}px`, height: `${rect.h}px` });
      fetchAt($('img', button), rect.w);
    }
  }

  function projectHtml(w) {
    const collage = w.imgs.length < 2 ? '' : `<div class="collage" role="group" aria-label="Project pictures">${w.imgs.map((m, n) =>
      `<button class="thumb" data-k="${n}" aria-pressed="${n === 0}" aria-label="${m.type === 'sketchfab' ? '3D model' : 'Picture'} ${n + 1} of ${w.imgs.length}"><img data-src="${m.src}"${m.srcset ? ` data-srcset="${m.srcset}"` : ''} alt="" draggable="false">${m.type === 'sketchfab' ? '<span aria-hidden="true" style="position:absolute;left:6px;bottom:6px;padding:2px 5px;background:#09090bdd;border:1px solid #ffffff35;border-radius:2px;font:600 10px/1.4 Manrope,sans-serif;letter-spacing:.04em;pointer-events:none">3D</span>' : ''}</button>`).join('')}</div>`;
    return `<button class="close" aria-label="Close project" title="Close · Esc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      <div class="stage"><div class="hero">${media(w.imgs[0], w.title)}</div></div>
      <div class="pictures"><div class="head"><h3></h3></div>${collage}</div>`;
  }

  // Caption beside the name; when there's no room, tags beside the name and the line below it.
  // Single pictures put it in one line along the top instead of the name.
  function caption(box, w, mode) {
    const head = $('.head', box);
    head.className = `head ${mode}`;
    $('.cap', head)?.remove();
    head.insertAdjacentHTML('beforeend', `<div class="cap"><p>${w.line}</p><div class="tags">${w.tags.map((t) => `<span>${t}</span>`).join('')}</div></div>`);
  }

  function captionFits(box, mode) {
    const x = $('.close', box).getBoundingClientRect().left, p = $('.cap p', box), tags = $('.tags', box).getBoundingClientRect(), name = $('h3', box).getBoundingClientRect();
    if (mode === 'bar') return p.scrollWidth <= p.clientWidth + 1 && tags.right <= x - 8;
    if (mode === 'beside') return $('.cap', box).getBoundingClientRect().width >= 300 && tags.right <= x - 8;
    if (mode === 'narrow') return tags.top < name.bottom && tags.right <= x - 12;
    return true;
  }

  // Fits measure the settled layout with the glide off, then glide from the old sizes to the new ones.
  function fitCaption(box, w) {
    if (!box.classList.contains('live')) { fitNow(box, w); return; }
    // start from where a glide still running has got to, not from its old target
    const parts = () => [box, ...$$('.collage, .thumb', box)];
    const props = (e) => e === box ? ['width', '--hero-width', '--stage-height', '--pictures-width'] : e.matches('.collage') ? ['height'] : ['left', 'top', 'width', 'height'];
    const now = parts().map((e) => { const c = getComputedStyle(e); return props(e).map((k) => [k, c.getPropertyValue(k)]); });
    box.classList.remove('live');
    fitNow(box, w);
    const after = parts().map((e) => e.style.cssText);
    parts().forEach((e, i) => now[i].forEach(([k, v]) => e.style.setProperty(k, v)));
    box.getBoundingClientRect();
    box.classList.add('live');
    parts().forEach((e, i) => { e.style.cssText = after[i]; });
  }

  function fitNow(box, w) {
    box.classList.remove('topline');
    $(':scope > .cap', box)?.remove();
    if (!w.line) { sizeHero(box, w); unplaced(box); return; }
    const modes = phone() ? ['narrow', 'under'] : box.classList.contains('single') ? ['bar', 'narrow', 'under'] : ['beside', 'narrow', 'under'];
    // a short wide picture can leave no room for the caption beside its pictures, so then the frame may grow past it
    for (const loose of [false, true]) {
      for (const mode of modes) {
        caption(box, w, mode);
        if (sizeHero(box, w, loose) !== false && captionFits(box, mode)) return;
      }
    }
    // a very wide, short picture beside its others leaves no room by the name, so the line goes across the top instead
    $('.cap', box).remove();
    $('.head', box).className = 'head';
    box.classList.add('topline');
    box.insertAdjacentHTML('afterbegin', `<div class="cap"><p>${w.line}</p><div class="tags">${w.tags.map((t) => `<span>${t}</span>`).join('')}</div></div>`);
    sizeHero(box, w);
    unplaced(box);
  }

  // a packing that found no fit still loads its thumbnails at a small size
  const unplaced = (box) => $$('.thumb img[data-src]', box).forEach((img) => fetchAt(img, 160));

  // Keep the old picture visible until the selected picture can draw.
  function show(nk) {
    const w = works[current];
    if (nk === k || nk < 0 || nk >= w.imgs.length) return;
    const box = $('.box', viewer), hero = $('.hero', box), dir = nk > k ? 1 : -1, next = html(media(w.imgs[nk], w.title));
    const token = ++change, old = hero._media || hero.firstElementChild;
    old.getAnimations().forEach((animation) => animation.cancel());
    for (const child of [...hero.children]) { if (child !== old) { child.remove(); } }
    const from = dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)', oldShape = w.imgs[k];
    k = nk;
    fitCaption(box, w);
    $$('.thumb', box).forEach((t, i) => t.setAttribute('aria-pressed', String(i === k)));
    // embeds and clips only load once they're in the page, so they wait there hidden
    const ready = next.tagName === 'IFRAME' || next.tagName === 'VIDEO' ? new Promise((done) => {
      if (next.tagName === 'VIDEO') next.addEventListener('loadeddata', done, { once: true });
      else next.addEventListener('load', done, { once: true });
      next.style.opacity = '0';
      next.style.pointerEvents = 'none';
      hero.append(next);
    }) : next.tagName === 'IMG' ? next.decode().catch(() => {})
      : Promise.resolve();
    ready.then(() => {
      if (!box.isConnected || works[current] !== w || token !== change) return;
      if (next.parentNode !== hero) { hero.append(next); }
      hero._media = next;
      next.style.opacity = '';
      next.style.pointerEvents = '';
      // a picture of another shape crossfades while the frame glides to it; same shape keeps the sideways wipe
      const reshaped = w.imgs[nk].type === 'sketchfab' || oldShape.type === 'sketchfab'
        || Math.abs(Math.log((w.imgs[nk].w / w.imgs[nk].h) / (oldShape.w / oldShape.h))) > .05;
      next.animate(reshaped ? [{ opacity: 0 }, { opacity: 1 }] : [{ clipPath: from }, { clipPath: 'inset(0)' }], { duration: still ? 1 : reshaped ? 420 : 550, easing: reshaped ? out : wipe })
        .finished.then(() => old.remove()).catch(() => old.remove());
    });
  }

  function openProject(id) {
    const w = works[id], fresh = !viewer;
    if (fresh) {
      viewer = html('<div class="viewer" role="dialog" aria-modal="true"><div class="shade"></div><div class="box"></div></div>');
      document.body.append(viewer);
      document.documentElement.classList.add('locked');
      $('main').inert = $('.top-bar').inert = true;
      $('.shade', viewer).addEventListener('click', closeProject);
    }
    current = id;
    k = 0;
    change++;
    viewer.setAttribute('aria-label', w.title);
    const box = $('.box', viewer);
    box.classList.remove('live');
    box.classList.toggle('single', w.imgs.length === 1);
    preload(id);
    box.innerHTML = projectHtml(w);
    $('.pictures h3', box).textContent = w.title;
    fitCaption(box, w);
    $('.close', box).addEventListener('click', closeProject);
    $$('.thumb', box).forEach((t) => t.addEventListener('click', () => show(+t.dataset.k)));
    history.replaceState(null, '', '#' + id);
    if (fresh) {
      const t = $(`.tile[data-id="${id}"]`).getBoundingClientRect(), b = box.getBoundingClientRect();
      const dx = t.left + t.width / 2 - (b.left + b.width / 2), dy = t.top + t.height / 2 - (b.top + b.height / 2), s = Math.max(.2, t.width / b.width);
      box.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: .2 }, { transform: 'none', opacity: 1 }], { duration: still ? 1 : 420, easing: out });
      $('.shade', viewer).animate([{ opacity: 0 }, { opacity: 1 }], { duration: still ? 1 : 260 });
    } else {
      box.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: still ? 1 : 260, easing: out });
    }
    $('.close', box).focus({ preventScroll: true });
    // from here on, a picture of another shape glides the frame and collage to their new sizes
    requestAnimationFrame(() => requestAnimationFrame(() => box.isConnected && box.classList.add('live')));
  }

  function closeProject() {
    if (!viewer) return;
    change++;
    const v = viewer, box = $('.box', v), tile = $(`.tile[data-id="${current}"]`), t = tile.getBoundingClientRect(), b = box.getBoundingClientRect();
    const visible = t.bottom > 0 && t.top < innerHeight;
    const to = visible
      ? `translate(${t.left + t.width / 2 - (b.left + b.width / 2)}px, ${t.top + t.height / 2 - (b.top + b.height / 2)}px) scale(${Math.max(.2, t.width / b.width)})`
      : 'scale(.96)';
    v.inert = true;
    v.style.pointerEvents = 'none';
    $('main').inert = $('.top-bar').inert = false;
    viewer = null;
    box.animate([{ transform: 'none', opacity: 1 }, { transform: to, opacity: 0 }], { duration: still ? 1 : 300, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    $('.shade', v).animate([{ opacity: 1 }, { opacity: 0 }], { duration: still ? 1 : 300, fill: 'forwards' }).finished.then(() => v.remove());
    document.documentElement.classList.remove('locked');
    tile.focus({ preventScroll: true });
    current = null;
    history.replaceState(null, '', location.pathname + location.search);
  }

  layout();
  initReveal();
  for (const t of tiles) {
    t.addEventListener('click', (e) => { e.preventDefault(); openProject(t.dataset.id); });
    t.addEventListener('pointerenter', () => { preload(t.dataset.id); $('video', t)?.play()?.catch(() => {}); });
    t.addEventListener('pointerleave', () => $('video', t)?.pause());
  }
  addEventListener('keydown', (e) => {
    if (!viewer || e.altKey || e.ctrlKey || e.metaKey) return;
    const w = works[current];
    if (e.key === 'Escape') { e.preventDefault(); closeProject(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      show((k + (e.key === 'ArrowRight' ? 1 : -1) + w.imgs.length) % w.imgs.length);
    }
    if (e.key === 'Tab') {
      const buttons = $$('button', viewer), first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.fonts.ready.then(() => { if (viewer) fitCaption($('.box', viewer), works[current]); });
  let wait;
  addEventListener('resize', () => {
    clearTimeout(wait);
    wait = setTimeout(() => {
      if (innerWidth !== width) layout();
      if (viewer) fitCaption($('.box', viewer), works[current]);
    }, 150);
  });
  const start = location.hash.slice(1);
  if (works[start] && $(`.tile[data-id="${start}"]`)) openProject(start);
}
