/* Organizr - shared behaviour for the homepage and the blog. */
(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isIt = (document.documentElement.lang || "").toLowerCase().startsWith("it");

  /* ---------- language: first visit follows the browser, then the explicit choice ---------- */
  const LANG_PREF_KEY = "organizr_lang_pref";
  const getLangPref = () => {
    const prefix = `${LANG_PREF_KEY}=`;
    const c = document.cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(prefix));
    return c ? c.slice(prefix.length) : null;
  };
  const setLangPref = (lang) => {
    document.cookie = `${LANG_PREF_KEY}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  };
  const altIt = $('link[rel="alternate"][hreflang="it"]');
  if (!getLangPref() && !isIt && altIt && /^it\b/i.test(navigator.language || "")) {
    const target = new URL(altIt.href, location.href);
    if (target.pathname !== location.pathname) {
      location.replace(target.pathname + location.hash);
      return;
    }
  }
  $$("[data-lang-link]").forEach((a) => a.addEventListener("click", () => setLangPref(a.dataset.langLink)));

  /* ---------- starfield ---------- */
  const canvas = $("#stars");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    let stars = [], w = 0, h = 0;
    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round((w * h) / 5200);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * 1.6,
        r: Math.random() * 1.1 + 0.2,
        a: Math.random() * 0.6 + 0.15,
        t: Math.random() * Math.PI * 2,
        s: Math.random() * 0.02 + 0.004,
        z: Math.random() * 0.5 + 0.1,
        hue: Math.random() < 0.18 ? 265 : (Math.random() < 0.1 ? 210 : 0)
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const sy = window.scrollY;
      for (const s of stars) {
        s.t += s.s;
        const y = ((s.y - sy * s.z) % (h * 1.6) + h * 1.6) % (h * 1.6);
        if (y > h) continue;
        const a = s.a * (0.6 + 0.4 * Math.sin(s.t));
        ctx.fillStyle = s.hue ? `hsla(${s.hue},90%,80%,${a})` : `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduced) requestAnimationFrame(draw);
    };
    // decorative: start after the page has loaded so it never competes with the first paint
    const start = () => { build(); draw(); };
    if (document.readyState === "complete") start(); else window.addEventListener("load", start, { once: true });
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduced) draw(); }, 150); });
  }

  /* ---------- nav ---------- */
  const nav = $("#nav");
  if (nav) {
    const onScrollNav = () => nav.classList.toggle("is-scrolled", window.scrollY > 20);
    window.addEventListener("scroll", onScrollNav, { passive: true }); onScrollNav();
  }
  const burger = $(".nav__burger"), mnav = $("#mnav");
  if (burger && mnav) {
    const setMenu = (open) => { burger.setAttribute("aria-expanded", open); mnav.hidden = !open; };
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
    $$("a", mnav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  }

  /* ---------- reveal ---------- */
  const reveals = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach((el) => io.observe(el));
    // above-the-fold content shouldn't wait for the 14% threshold (tall blocks may never reach it):
    // a one-shot observer reveals whatever already touches the viewport, without forcing a layout from JS
    const first = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      first.disconnect();
    }, { rootMargin: "0px 0px -6% 0px" });
    reveals.forEach((el) => first.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- platform-aware download buttons ---------- */
  const detectPlatform = () => {
    const p = [navigator.userAgentData?.platform, navigator.platform, navigator.userAgent]
      .filter(Boolean).join(" ").toLowerCase();
    if (p.includes("android")) return "android";
    if (/iphone|ipad|ipod/.test(p) || (p.includes("mac") && navigator.maxTouchPoints > 1)) return "ios";
    if (p.includes("win")) return "windows";
    if (p.includes("mac")) return "mac";
    return "";
  };
  const platform = detectPlatform();
  const L = isIt
    ? { store: ["Scarica su", "App Store"], mac: ["Scarica per", "Mac"], windows: ["Scarica per", "Windows"] }
    : { store: ["Download on the", "App Store"], mac: ["Download for", "Mac"], windows: ["Download for", "Windows"] };
  const HREF = {
    store: isIt ? "https://apps.apple.com/it/app/organizr/id6790398372" : "https://apps.apple.com/app/organizr/id6790398372",
    mac: "/assets/downloads/Organizr_0.3.7_aarch64.dmg",
    windows: isIt ? "/it/download-windows/" : "/download-windows/"
  };
  // Android has no build to promote yet: it falls back to the App Store like every unknown device.
  const target = platform === "mac" || platform === "windows" ? platform : "store";

  $$("[data-store-cta]").forEach((btn) => {
    const [small, label] = L[target];
    const s = $("[data-cta-small]", btn), b = $("[data-cta-label]", btn);
    if (s) s.textContent = small;
    if (b) b.textContent = label;
    $$("[data-cta-icon]", btn).forEach((i) => { i.hidden = i.dataset.ctaIcon !== (target === "windows" ? "windows" : "apple"); });
    btn.href = HREF[target];
    if (target === "mac") { btn.setAttribute("download", ""); btn.removeAttribute("target"); btn.removeAttribute("rel"); }
    else if (target === "windows") { btn.removeAttribute("download"); btn.removeAttribute("target"); btn.removeAttribute("rel"); }
  });
  $$("[data-dl]").forEach((tile) => tile.classList.toggle("is-current", tile.dataset.dl === target));
  // download page cards: feature the visitor's platform (iOS stays featured for Android/unknown)
  const cards = $$("[data-download-card]");
  if (cards.length) {
    const key = platform === "mac" || platform === "windows" ? platform : "ios";
    cards.forEach((card) => {
      const on = card.dataset.downloadCard === key;
      card.classList.toggle("is-featured", on);
      const b = $(".download-btn", card);
      if (b) { b.classList.toggle("btn-primary", on); b.classList.toggle("btn-secondary", !on); }
    });
  }

  /* ---------- pointer spotlight on cards ---------- */
  if (window.matchMedia("(pointer: fine)").matches) {
    $$(".seo-feature-card, .post").forEach((el) => el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height * 100).toFixed(1)}%`);
    }));
  }

  /* ---------- blog: category filters ---------- */
  const filters = $$("[data-filter]");
  if (filters.length) {
    const sections = $$("[data-cat-section]");
    const apply = (cat) => {
      filters.forEach((f) => f.setAttribute("aria-pressed", f.dataset.filter === cat ? "true" : "false"));
      sections.forEach((s) => { s.hidden = cat !== "all" && s.dataset.catSection !== cat; });
      const feature = $(".feature");
      if (feature) feature.hidden = cat !== "all" && feature.dataset.cat !== cat;
    };
    filters.forEach((f) => f.addEventListener("click", () => apply(f.dataset.filter)));
  }

  /* ---------- blog: reading progress + table of contents ---------- */
  const article = $("[data-article]");
  if (article) {
    const bar = $(".progress");
    const toc = $("[data-toc]");
    const heads = $$("h2", article);
    heads.forEach((h, i) => {
      if (!h.id) h.id = (h.textContent || "").toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${i + 1}`;
    });
    if (toc && heads.length > 2) {
      const ol = $("ol", toc);
      heads.forEach((h) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${h.id}`; a.textContent = h.textContent;
        li.append(a); ol.append(li);
      });
      toc.hidden = false;
    }
    const links = toc ? $$("a", toc) : [];
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = article.getBoundingClientRect();
      const total = r.height - window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, -r.top / (total > 0 ? total : 1)));
      if (bar) bar.style.setProperty("--p", p.toFixed(4));
      let active = -1;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < 160) active = i; });
      links.forEach((a, i) => a.classList.toggle("is-active", i === active));
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }
})();
