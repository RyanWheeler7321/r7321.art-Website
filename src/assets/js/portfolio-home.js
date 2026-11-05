// Portfolio front page: packs each band's pictures into rows (1-3 a row, or one beside two stacked) that fill the band with the least cropping
(() => {
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const slats = $$('.slat'), links = $$('.sections > a'), gap = 8;
const perms = (a) => a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
const splits = (n) => {
  if (!n) return [[]];
  const out = [];
  for (let k = 1; k <= Math.min(3, n); k++) for (const rest of splits(n - k)) out.push([k, ...rest]);
  if (n >= 3) for (const rest of splits(n - 3)) out.push(['p', ...rest], ['q', ...rest]);
  return out;
};
const ratio = (p) => p.dataset.w / p.dataset.h;
// the best split only depends on the band's shape, so each shape is worked out once
const plans = slats.map((slat) => {
  const pics = $$('.pic', slat), free = $('.pics', slat).hasAttribute('data-free');
  // bands whose order wasn't set can swap their later pictures, so none ends up a sliver
  return { box: $('.pics', slat), pics, orders: free ? perms(pics.slice(1)).map((p) => [pics[0], ...p]) : [pics], memo: new Map() };
});
function best(plan, W, H) {
  const key = `${W}x${H}`;
  if (plan.memo.has(key)) return plan.memo.get(key);
  let top = null;
  for (const imgs of plan.orders) for (const sp of splits(imgs.length)) {
    let j = 0;
    const rows = sp.map((k) => {
      const r = imgs.slice(j, j += typeof k == 'number' ? k : 3);
      const parts = k == 'p' ? [{ m: [r[0]], a: ratio(r[0]) }, { m: [r[1], r[2]], a: 1 / (1 / ratio(r[1]) + 1 / ratio(r[2])) }]
        : k == 'q' ? [{ m: [r[0], r[1]], a: 1 / (1 / ratio(r[0]) + 1 / ratio(r[1])) }, { m: [r[2]], a: ratio(r[2]) }]
        : r.map((m) => ({ m: [m], a: ratio(m) }));
      return { parts, h: (W - gap * (parts.length - 1)) / parts.reduce((s, p) => s + p.a, 0) };
    });
    const tot = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1), kk = H / tot;
    const small = Math.min(...rows.flatMap((r) => r.parts.flatMap((p) => p.m.map((m) => Math.min(r.h * kk / p.m.length, r.h * p.a)))));
    // the first pick leads: it gets a row (or the big side) to itself
    const err = Math.abs(Math.log(tot / H)) + (small < .17 * H ? (.17 * H - small) / H * 4 : 0) + ((typeof sp[0] == 'number' && sp[0] > 1) || sp[0] == 'q' ? .25 : 0);
    if (!top || err < top.err) top = { rows, err };
  }
  plan.memo.set(key, top);
  return top;
}
let shown = '';
function layout() {
  const phone = innerWidth <= 900;
  const sizes = plans.map((plan) => { const W = plan.box.clientWidth; return [W, phone ? Math.round(W * 1.05) : plan.box.clientHeight - 10]; });
  const sig = sizes.join('|');
  if (sig == shown) return;
  shown = sig;
  plans.forEach((plan, i) => {
    const [W, H] = sizes[i], { rows } = best(plan, W, H), frag = document.createDocumentFragment();
    for (const row of rows) {
      const el = document.createElement('div');
      el.className = 'prow'; el.style.flex = `${row.h} 1 0`;
      for (const p of row.parts) {
        if (p.m.length == 1) { p.m[0].style.flex = `${ratio(p.m[0])} 1 0`; el.append(p.m[0]); continue; }
        const st = document.createElement('div');
        st.className = 'pstack'; st.style.flex = `${p.a} 1 0`;
        for (const m of p.m) { m.style.flex = `${1 / ratio(m)} 1 0`; st.append(m); }
        el.append(st);
      }
      frag.append(el);
    }
    plan.box.style.height = phone ? `${H}px` : '';
    plan.box.replaceChildren(frag);
  });
}
layout();
// Pictures wipe in band by band (portfolio.js wipeIn), each once it has loaded
if (typeof wipeIn == 'function' && !still) {
  $('.hub').classList.add('wipe');
  slats.forEach((s, i) => $$('.pic', s).forEach((p, j) => {
    const img = $('img', p);
    (img.complete ? Promise.resolve() : img.decode().catch(() => {})).then(() => setTimeout(() => wipeIn(p), i * 90 + j * 55));
  }));
}
let t;
addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { shown = ''; layout(); }, 120); });
document.fonts.ready.then(() => { shown = ''; layout(); });
slats.forEach((a, i) => {
  a.addEventListener('pointerenter', () => { a.classList.add('big'); links[i]?.classList.add('hot'); });
  a.addEventListener('pointerleave', () => { a.classList.remove('big'); links[i]?.classList.remove('hot'); });
});
})();
