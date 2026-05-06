(() => {
  if (document.documentElement.classList.contains("maintenance-active")) return;

  const consentName = "organizr_cookie_consent_v1";
  const consentMaxAge = 60 * 60 * 24 * 180;
  const defaultConsent = { necessary: true, analytics: false };

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag("consent", "default", {
    ad_storage: "denied",
    analytics_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  const getCookie = (name) => {
    const prefix = `${name}=`;
    return document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(prefix))
      ?.slice(prefix.length);
  };

  const setCookie = (name, value, maxAge) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  };

  const readConsent = () => {
    const saved = getCookie(consentName);
    if (!saved) return null;

    try {
      return { ...defaultConsent, ...JSON.parse(decodeURIComponent(saved)) };
    } catch (error) {
      return null;
    }
  };

  const deleteCookie = (name) => {
    const host = window.location.hostname;
    const parts = host.split(".");
    const domains = ["", host];

    if (parts.length > 2) {
      domains.push(`.${parts.slice(-2).join(".")}`);
    }

    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
  };

  const clearAnalyticsCookies = () => {
    const analyticsCookies = ["_ga", "_gid", "_gat", "_gcl_au"];

    for (const cookie of document.cookie.split(";")) {
      const name = cookie.trim().split("=")[0];
      if (analyticsCookies.includes(name) || name.startsWith("_ga_")) {
        deleteCookie(name);
      }
    }
  };

  const loadConsentedScripts = (consent) => {
    if (!consent.analytics) return;

    for (const placeholder of document.querySelectorAll('script[type="text/plain"][data-cookie-category="analytics"]')) {
      const script = document.createElement("script");

      for (const attribute of placeholder.attributes) {
        if (attribute.name === "type" || attribute.name === "data-cookie-category") continue;
        script.setAttribute(attribute.name, attribute.value);
      }

      script.type = "text/javascript";
      script.text = placeholder.textContent;
      placeholder.replaceWith(script);
    }
  };

  const applyConsent = (consent) => {
    if (consent.analytics) {
      window.gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      loadConsentedScripts(consent);
    } else {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
      clearAnalyticsCookies();
    }

    window.OrganizrConsent = {
      value: consent,
      has: (category) => Boolean(consent[category]),
    };
  };

  const closeBanner = () => {
    document.querySelector("[data-cookie-banner]")?.remove();
    document.querySelector("[data-cookie-modal]")?.remove();
  };

  const saveConsent = (consent) => {
    const normalized = { ...defaultConsent, ...consent, necessary: true };
    setCookie(consentName, JSON.stringify(normalized), consentMaxAge);
    applyConsent(normalized);
    closeBanner();
  };

  const renderBanner = () => {
    const wrapper = document.createElement("div");
    wrapper.className = "cookie-consent";
    wrapper.setAttribute("data-cookie-banner", "");
    wrapper.innerHTML = `
      <div class="cookie-consent__copy">
        <p class="cookie-consent__label">Privacy e cookie</p>
        <h2>Usiamo cookie solo quando servono.</h2>
        <p>
          I cookie tecnici tengono il sito funzionante. Analytics resta spento
          finche' non lo accetti.
        </p>
      </div>
      <div class="cookie-consent__actions">
        <button class="cookie-btn cookie-btn--ghost" type="button" data-cookie-customize>Personalizza</button>
        <button class="cookie-btn cookie-btn--muted" type="button" data-cookie-reject>Rifiuta</button>
        <button class="cookie-btn cookie-btn--primary" type="button" data-cookie-accept>Accetta</button>
      </div>
    `;

    const modal = document.createElement("div");
    modal.className = "cookie-modal";
    modal.setAttribute("data-cookie-modal", "");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="cookie-modal__panel" role="dialog" aria-modal="true" aria-labelledby="cookie-modal-title">
        <button class="cookie-modal__close" type="button" aria-label="Chiudi preferenze cookie" data-cookie-close>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
        <p class="cookie-consent__label">Preferenze</p>
        <h2 id="cookie-modal-title">Gestisci cookie</h2>
        <p class="cookie-modal__intro">
          Puoi cambiare scelta in qualsiasi momento cancellando il cookie di consenso.
          I cookie analytics servono solo per capire visite e uso del sito.
        </p>

        <div class="cookie-option">
          <div>
            <strong>Necessari</strong>
            <span>Richiesti per sicurezza, manutenzione e salvataggio preferenze.</span>
          </div>
          <span class="cookie-badge">Sempre attivi</span>
        </div>

        <label class="cookie-option cookie-option--toggle">
          <div>
            <strong>Analytics</strong>
            <span>Google Analytics e strumenti simili. Bloccati finche' non abiliti questa voce.</span>
          </div>
          <input type="checkbox" data-cookie-analytics />
          <span class="cookie-switch" aria-hidden="true"></span>
        </label>

        <div class="cookie-modal__actions">
          <button class="cookie-btn cookie-btn--muted" type="button" data-cookie-save>Salva scelta</button>
          <button class="cookie-btn cookie-btn--primary" type="button" data-cookie-accept-modal>Accetta tutto</button>
        </div>
      </div>
    `;

    document.body.append(wrapper, modal);

    const analyticsInput = modal.querySelector("[data-cookie-analytics]");
    const openModal = () => {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      modal.querySelector("[data-cookie-close]")?.focus();
    };
    const closeModal = () => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      wrapper.querySelector("[data-cookie-customize]")?.focus();
    };

    wrapper.querySelector("[data-cookie-accept]")?.addEventListener("click", () => saveConsent({ analytics: true }));
    wrapper.querySelector("[data-cookie-reject]")?.addEventListener("click", () => saveConsent({ analytics: false }));
    wrapper.querySelector("[data-cookie-customize]")?.addEventListener("click", openModal);
    modal.querySelector("[data-cookie-close]")?.addEventListener("click", closeModal);
    modal.querySelector("[data-cookie-save]")?.addEventListener("click", () => saveConsent({ analytics: analyticsInput.checked }));
    modal.querySelector("[data-cookie-accept-modal]")?.addEventListener("click", () => saveConsent({ analytics: true }));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  };

  const init = () => {
    const savedConsent = readConsent();

    if (savedConsent) {
      applyConsent(savedConsent);
      return;
    }

    applyConsent(defaultConsent);
    renderBanner();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
