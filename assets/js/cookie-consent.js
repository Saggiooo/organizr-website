/* Organizr — cookie consent.
 * Banner + preferences + bottom-left button. The choice is stored for 180 days in the
 * `organizr_consent` cookie and logged server side by /api/consent.php (proof of consent).
 * Optional categories only run scripts tagged <script type="text/plain" data-consent="ID">
 * after consent. Keep CATEGORIES in sync with the tables in the Cookie Policy (IT/EN).
 */
(() => {
  "use strict";

  /* ---------- legacy cleanup: old analytics / consent cookies ---------- */
  const host = window.location.hostname;
  const domains = new Set(["", host, `.${host}`]);
  const parts = host.split(".");
  if (parts.length > 2) domains.add(`.${parts.slice(-2).join(".")}`);
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.trim().split("=")[0];
    if (name !== "organizr_cookie_consent_v1" && !/^_ga(?:_|$)/.test(name)
        && !["_gid", "_gat", "_gcl_au"].includes(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
  }

  /* ---------- configuration ---------- */
  // Bump when categories or cookies change: everybody is asked again.
  const POLICY_VERSION = 1;
  const COOKIE = "organizr_consent";
  const MAX_AGE = 60 * 60 * 24 * 180; // 180 days
  const ENDPOINT = "/api/consent.php";
  const lang = (document.documentElement.lang || "en").toLowerCase().startsWith("it") ? "it" : "en";

  const CATEGORIES = [
    {
      id: "necessary",
      required: true,
      cookies: [
        { name: "organizr_consent", provider: "organizr.it", type: "Cookie",
          purpose: { it: "Ricorda la tua scelta sui cookie e il relativo ID di consenso.", en: "Remembers your cookie choice and its consent ID." },
          duration: { it: "180 giorni", en: "180 days" } },
        { name: "organizr_lang_pref", provider: "organizr.it", type: "Cookie",
          purpose: { it: "Ricorda la lingua che hai scelto (italiano o inglese).", en: "Remembers the language you picked (English or Italian)." },
          duration: { it: "1 anno", en: "1 year" } },
        { name: "organizr_currency_pref", provider: "organizr.it", type: "localStorage",
          purpose: { it: "Ricorda la valuta scelta per i prezzi (€ o $).", en: "Remembers the currency picked for prices (€ or $)." },
          duration: { it: "Finché non la cancelli", en: "Until you clear it" } },
        { name: "__cf_bm", provider: "Cloudflare", type: "Cookie",
          purpose: { it: "Protezione da bot e traffico automatizzato, impostato solo quando serve.", en: "Protection against bots and automated traffic, set only when needed." },
          duration: { it: "30 minuti", en: "30 minutes" } },
        { name: "cf_clearance", provider: "Cloudflare", type: "Cookie",
          purpose: { it: "Ricorda che hai superato un controllo di sicurezza, se ti è stato mostrato.", en: "Remembers that you passed a security check, if one was shown." },
          duration: { it: "Da 30 minuti a 1 anno", en: "30 minutes to 1 year" } }
      ]
    }
    // To add Google Ads or analytics later, append a category, e.g.
    // { id: "marketing", required: false, cookies: [{ name: "_gcl_au", provider: "Google", ... }] }
    // load its tags as <script type="text/plain" data-consent="marketing" src="..."></script>,
    // add the texts to T.cat below, update the Cookie Policy and bump POLICY_VERSION.
  ];

  const SERVICES = [
    { name: "Google Fonts", purpose: { it: "Caratteri tipografici del sito: riceve l'indirizzo IP, senza cookie.", en: "Website typefaces: receives your IP address, no cookies." } },
    { name: "Stripe", purpose: { it: "Pagamenti e gestione abbonamento, solo quando apri le loro pagine.", en: "Payments and subscription management, only when you open their pages." } },
    { name: "FormGate", purpose: { it: "Invio del modulo di assistenza, solo quando lo spedisci.", en: "Delivery of the support form, only when you send it." } },
    { name: "cdnjs (Cloudflare)", purpose: { it: "Icone delle pagine di assistenza e account, senza cookie.", en: "Icons on support and account pages, no cookies." } }
  ];

  const T = {
    it: {
      title: "Diamo valore alla tua privacy",
      text: "Usiamo solo cookie tecnici: fanno funzionare il sito e ricordano lingua, valuta e la tua scelta sui cookie. Nessun cookie pubblicitario, di profilazione o statistico.",
      policy: "Cookie Policy", policyHref: "/it/cookie-policy/",
      customize: "Personalizza", reject: "Rifiuta tutto", accept: "Accetta tutti", save: "Salva preferenze",
      close: "Chiudi", prefsTitle: "Preferenze cookie",
      prefsIntro: "Scegli quali categorie di cookie autorizzare. I cookie strettamente necessari non possono essere disattivati perché il sito non funzionerebbe senza di essi.",
      always: "Sempre attivi", details: "Dettagli", services: "Servizi di terze parti",
      servicesText: "Non impostano cookie su organizr.it. Li elenchiamo per trasparenza.",
      th: ["Nome", "Fornitore", "Finalità", "Durata"], consentId: "ID del tuo consenso", notYet: "non ancora registrato",
      fab: "Preferenze cookie", saved: "Preferenze salvate",
      cat: { necessary: { name: "Strettamente necessari", text: "Indispensabili per il funzionamento e la sicurezza del sito e per ricordare le tue scelte." } }
    },
    en: {
      title: "We value your privacy",
      text: "We only use technical cookies: they keep the site working and remember your language, currency and cookie choice. No advertising, profiling or analytics cookies.",
      policy: "Cookie Policy", policyHref: "/cookie-policy/",
      customize: "Customize", reject: "Reject all", accept: "Accept all", save: "Save preferences",
      close: "Close", prefsTitle: "Cookie preferences",
      prefsIntro: "Choose which cookie categories to allow. Strictly necessary cookies cannot be turned off because the site would not work without them.",
      always: "Always active", details: "Details", services: "Third-party services",
      servicesText: "They set no cookies on organizr.it. We list them for transparency.",
      th: ["Name", "Provider", "Purpose", "Duration"], consentId: "Your consent ID", notYet: "not recorded yet",
      fab: "Cookie preferences", saved: "Preferences saved",
      cat: { necessary: { name: "Strictly necessary", text: "Essential for the site to work securely and to remember your choices." } }
    }
  }[lang];

  /* ---------- state ---------- */
  const readConsent = () => {
    const raw = document.cookie.split(";").map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
    if (!raw) return null;
    try {
      const data = JSON.parse(decodeURIComponent(raw.slice(COOKIE.length + 1)));
      if (data.v !== POLICY_VERSION || typeof data.c !== "object") return null;
      return data;
    } catch (e) { return null; }
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));

  let consent = readConsent();
  const consentId = consent ? consent.id : uuid();

  const choicesFrom = (mode, toggles) => {
    const c = {};
    for (const cat of CATEGORIES) c[cat.id] = cat.required ? true : mode === "accept" ? true : mode === "reject" ? false : !!toggles[cat.id];
    return c;
  };

  const activateScripts = (choices) => {
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach((old) => {
      if (!choices[old.dataset.consent] || old.dataset.consentDone) return;
      const s = document.createElement("script");
      for (const a of old.attributes) if (a.name !== "type" && !a.name.startsWith("data-consent")) s.setAttribute(a.name, a.value);
      s.text = old.text;
      old.dataset.consentDone = "1";
      old.after(s);
    });
  };

  const persist = (action, choices) => {
    consent = { id: consentId, v: POLICY_VERSION, t: new Date().toISOString(), c: choices };
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`;
    const body = JSON.stringify({ id: consentId, version: POLICY_VERSION, action, choices, lang, page: location.pathname.slice(0, 200) });
    try {
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "omit" }).catch(() => {});
    } catch (e) { /* the choice is still stored in the cookie */ }
    activateScripts(choices);
    document.dispatchEvent(new CustomEvent("organizr:consent", { detail: consent }));
  };

  /* ---------- UI ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const COOKIE_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M21.6 11.2a.9.9 0 0 0-1.1-.8 2.6 2.6 0 0 1-3.1-2.5v-.2a.9.9 0 0 0-.9-.9h-.2a2.6 2.6 0 0 1-2.5-3.1.9.9 0 0 0-.8-1.1A10 10 0 1 0 21.6 11.2ZM7.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm1 6a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5-3.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm3.5 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>';
  const X_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  const table = (rows) => `<div class="cc-table" role="region" tabindex="0"><table><thead><tr>${T.th.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${
    rows.map((r) => `<tr><td><code>${esc(r.name)}</code><small>${esc(r.type)}</small></td><td>${esc(r.provider)}</td><td>${esc(r.purpose[lang])}</td><td>${esc(r.duration[lang])}</td></tr>`).join("")
  }</tbody></table></div>`;

  const catBlock = (cat) => {
    const txt = T.cat[cat.id] || { name: cat.id, text: "" };
    const ctl = cat.required
      ? `<span class="cc-always">${T.always}</span>`
      : `<label class="cc-switch"><input type="checkbox" data-cc-toggle="${cat.id}"><span aria-hidden="true"></span><span class="cc-sr">${esc(txt.name)}</span></label>`;
    return `<section class="cc-cat"><div class="cc-cat__head"><h3>${esc(txt.name)}</h3>${ctl}</div><p>${esc(txt.text)}</p>
      <details><summary>${T.details} (${cat.cookies.length})</summary>${table(cat.cookies)}</details></section>`;
  };

  const root = document.createElement("div");
  root.className = "cc";
  root.innerHTML = `
    <div class="cc-banner" role="dialog" aria-modal="false" aria-labelledby="cc-title" aria-describedby="cc-desc" hidden>
      <button type="button" class="cc-x" data-cc="close" aria-label="${T.close}">${X_SVG}</button>
      <p class="cc-title" id="cc-title">${T.title}</p>
      <p class="cc-text" id="cc-desc">${T.text} <a href="${T.policyHref}">${T.policy}</a></p>
      <div class="cc-actions">
        <button type="button" class="cc-btn cc-btn--outline" data-cc="customize">${T.customize}</button>
        <button type="button" class="cc-btn cc-btn--outline" data-cc="reject">${T.reject}</button>
        <button type="button" class="cc-btn cc-btn--primary cc-btn--wide" data-cc="accept">${T.accept}</button>
      </div>
    </div>
    <div class="cc-modal" hidden>
      <div class="cc-panel" role="dialog" aria-modal="true" aria-labelledby="cc-prefs-title">
        <header class="cc-panel__head"><h2 id="cc-prefs-title">${T.prefsTitle}</h2><button type="button" class="cc-x" data-cc="dismiss" aria-label="${T.close}">${X_SVG}</button></header>
        <div class="cc-panel__body">
          <p class="cc-intro">${T.prefsIntro} <a href="${T.policyHref}">${T.policy}</a></p>
          ${CATEGORIES.map(catBlock).join("")}
          <section class="cc-cat"><div class="cc-cat__head"><h3>${T.services}</h3></div><p>${T.servicesText}</p>
            <details><summary>${T.details} (${SERVICES.length})</summary><ul class="cc-services">${SERVICES.map((s) => `<li><b>${esc(s.name)}</b><span>${esc(s.purpose[lang])}</span></li>`).join("")}</ul></details></section>
          <p class="cc-id">${T.consentId}: <code data-cc-id></code></p>
        </div>
        <footer class="cc-panel__foot">
          <button type="button" class="cc-btn cc-btn--ghost" data-cc="reject">${T.reject}</button>
          <button type="button" class="cc-btn cc-btn--ghost" data-cc="save">${T.save}</button>
          <button type="button" class="cc-btn cc-btn--primary" data-cc="accept">${T.accept}</button>
        </footer>
      </div>
    </div>
    <button type="button" class="cc-fab" aria-label="${T.fab}" title="${T.fab}" hidden>${COOKIE_SVG}</button>
    <p class="cc-toast" role="status" aria-live="polite"></p>`;

  const mount = () => {
    document.body.append(root);
    const banner = root.querySelector(".cc-banner");
    const modal = root.querySelector(".cc-modal");
    const panel = root.querySelector(".cc-panel");
    const fab = root.querySelector(".cc-fab");
    const toast = root.querySelector(".cc-toast");
    let lastFocus = null;

    const syncUi = () => {
      root.querySelector("[data-cc-id]").textContent = consent ? consent.id : `${consentId} (${T.notYet})`;
      root.querySelectorAll("[data-cc-toggle]").forEach((t) => { t.checked = !!(consent && consent.c[t.dataset.ccToggle]); });
      banner.hidden = !!consent;
      fab.hidden = !consent;
    };
    const openPrefs = () => {
      lastFocus = document.activeElement;
      syncUi();
      modal.hidden = false;
      document.documentElement.classList.add("cc-lock");
      requestAnimationFrame(() => root.querySelector(".cc-panel .cc-x").focus());
    };
    const closePrefs = () => {
      modal.hidden = true;
      document.documentElement.classList.remove("cc-lock");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    const decide = (action) => {
      const toggles = {};
      root.querySelectorAll("[data-cc-toggle]").forEach((t) => { toggles[t.dataset.ccToggle] = t.checked; });
      // closing the banner without choosing keeps only what is strictly necessary
      const mode = action === "accept" ? "accept" : action === "save" ? "save" : "reject";
      persist(action, choicesFrom(mode, toggles));
      closePrefs();
      syncUi();
      toast.textContent = T.saved;
      toast.classList.add("is-on");
      setTimeout(() => toast.classList.remove("is-on"), 2200);
    };

    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cc]");
      if (e.target === modal) { closePrefs(); return; }
      if (!b) return;
      const a = b.dataset.cc;
      if (a === "customize") openPrefs();
      else if (a === "dismiss") closePrefs();
      else decide(a);
    });
    fab.addEventListener("click", openPrefs);
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-cookie-prefs]");
      if (trigger) { e.preventDefault(); openPrefs(); }
    });
    document.addEventListener("keydown", (e) => {
      if (modal.hidden) return;
      if (e.key === "Escape") { closePrefs(); return; }
      if (e.key !== "Tab") return;
      const f = [...panel.querySelectorAll("button, a[href], input, summary, [tabindex='0']")].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    syncUi();
    if (consent) activateScripts(consent.c);
    window.organizrConsent = { get: () => consent, open: openPrefs, categories: CATEGORIES.map((c) => c.id) };
  };

  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
