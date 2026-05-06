(() => {
  if (document.documentElement.classList.contains("maintenance-active")) return;

  const glow = document.querySelector(".cursor-glow");
  const countdowns = [...document.querySelectorAll("[data-countdown]")];
  const countdownParts = {
    hours: [...document.querySelectorAll('[data-countdown-part="hours"]')],
    minutes: [...document.querySelectorAll('[data-countdown-part="minutes"]')],
    seconds: [...document.querySelectorAll('[data-countdown-part="seconds"]')],
  };
  const planCards = [...document.querySelectorAll(".plan-card[data-plan]")];
  const billingCards = [...document.querySelectorAll("[data-billing-card]")];
  const appTabs = [...document.querySelectorAll("[data-app-tab]")];
  const appPreviewLabel = document.querySelector("[data-app-preview-label]");
  const appDescriptionTitle = document.querySelector("[data-app-description-title]");
  const appDescriptionCopy = document.querySelector("[data-app-description-copy]");
  const platformDownload = document.querySelector("[data-platform-download]");
  const continueButton = document.querySelector("[data-continue-plan]");
  const downloadFiles = {
    mac: "assets/downloads/Organizr_0.2.0_aarch64.dmg",
    windows: "assets/downloads/Organizr_0.2.0_x64-setup.exe",
  };

  const setActivePlan = (nextCard) => {
    for (const card of planCards) {
      const active = card === nextCard;
      card.classList.toggle("is-featured", active);
      card.setAttribute("aria-checked", active ? "true" : "false");
      const cardButton = card.querySelector(".plan-cta");
      if (cardButton) {
        cardButton.classList.toggle("plan-cta-primary", active);
      }
    }

    const planName = nextCard.dataset.plan;
    if (continueButton) {
      continueButton.textContent = `Continua con ${planName}`;
      continueButton.dataset.selectedPlan = planName;
    }
  };

  const appDescriptions = {
    Bacheca: "Trasferisci idee, task e cose sparse dalla tua testa in una bacheca kanban semplice e visiva. Organizza tutto senza perdere il filo.",
    Tracker: "Monitora abitudini, allenamenti, alimentazione e andamento delle tue giornate in un unico spazio. Vedi l'andamento e le analisi nella dashboard.",
    Alimentazione: "Il tuo diario alimentare personale. Puoi collegarlo a FatSecret per tracciare pasti, calorie e valori nutrizionali in modo automatico e ordinato. Imposta il tuo planner ed esplora le dashboard.",
    Workout: "Tieni traccia dei tuoi allenamenti, analizza l'aumento dei carichi, confronta ogni singolo allenamento con quello precedente, e monitora il tuo corpo.",
    Misurazioni: "Salva le tue misurazioni corporee e monitora i cambiamenti nel tempo tramite dashboard e statistiche chiare.",
    Obiettivi: "Il modo migliore per portare a termine i nostri obiettivi e' usare periodi di 3 mesi. Ne poco, ne troppo tempo. Analizza e traccia tutti i tuoi obiettivi e i tuoi progressi.",
    Abbonamenti: "Tieni traccia dei tuoi abbonamenti, anche quelli condivisi con amici o colleghi. Controlla costi, rinnovi e scopri dove finiscono davvero i tuoi soldi ogni mese.",
    Armadio: "Il tuo armadio, ma finalmente organizzato. Tieni traccia dei capi che possiedi, di quelli che desideri e anche di quelli che vuoi vendere.",
    Lettura: "Chi ama i libri sa che averli in libreria aiuta a non dimenticarli. Con Organizr puoi creare una libreria virtuale, salvare riassunti, note e progressi di lettura, così tutto resta organizzato e sempre a portata di mano.",
    File: "Ma quella cartella era sul PC, sul Mac o nel Server? Forse in tutti e tre. Organizr ti aiuta a visualizzare dove si trovano i tuoi file, come sono organizzati i backup e quando devono essere aggiornati. Così eviti il classico panico da forse l'ho perso davvero.",
  };

  if (countdowns.length) {
    const cycleMs = 5 * 60 * 60 * 1000;
    const storageKey = "organizer-offer-end-at";
    const now = Date.now();
    let endAt = now + cycleMs;

    try {
      const savedEndAt = Number(window.localStorage.getItem(storageKey));
      if (Number.isFinite(savedEndAt) && savedEndAt > now) {
        endAt = savedEndAt;
      } else {
        window.localStorage.setItem(storageKey, String(endAt));
      }
    } catch (error) {
      endAt = now + cycleMs;
    }

    const pad = (value) => String(value).padStart(2, "0");

    const renderCountdown = () => {
      const now = Date.now();
      let remaining = endAt - now;

      while (remaining <= 0) {
        endAt += cycleMs;
        remaining = endAt - now;
        try {
          window.localStorage.setItem(storageKey, String(endAt));
        } catch (error) {
          // Keep timer running in memory when storage is blocked.
        }
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
      for (const countdown of countdowns) {
        countdown.textContent = formatted;
      }
      for (const part of countdownParts.hours) part.textContent = pad(hours);
      for (const part of countdownParts.minutes) part.textContent = pad(minutes);
      for (const part of countdownParts.seconds) part.textContent = pad(seconds);
    };

    renderCountdown();
    setInterval(renderCountdown, 1000);
  }

  if (platformDownload) {
    const platform = [
      navigator.userAgentData?.platform,
      navigator.platform,
      navigator.userAgent,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const isWindows = platform.includes("win");
    const isMac = platform.includes("mac");
    const detectedPlatform = isWindows ? "windows" : isMac ? "mac" : "";
    const label = platformDownload.querySelector("[data-platform-download-label]");
    const showIcon = (platformKey) => {
      for (const icon of platformDownload.querySelectorAll("[data-platform-icon]")) {
        icon.classList.toggle("is-hidden", icon.dataset.platformIcon !== platformKey);
      }
    };

    if (detectedPlatform) {
      platformDownload.href = downloadFiles[detectedPlatform];
      platformDownload.setAttribute("download", "");
      if (label) label.textContent = "Download";
      showIcon(detectedPlatform);
    } else {
      platformDownload.href = "download/";
      platformDownload.removeAttribute("download");
      if (label) label.textContent = "Download";
      showIcon("generic");
    }
  }

  if (appTabs.length && appPreviewLabel) {
    const setActiveAppTab = (nextTab) => {
      for (const tab of appTabs) {
        const active = tab === nextTab;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      }
      const appName = nextTab.dataset.appTab;
      appPreviewLabel.textContent = appName;

      if (appDescriptionTitle) appDescriptionTitle.textContent = appName;
      if (appDescriptionCopy) appDescriptionCopy.textContent = appDescriptions[appName] || "";
    };

    for (const tab of appTabs) {
      tab.addEventListener("click", () => setActiveAppTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const currentIndex = appTabs.indexOf(tab);
        const nextIndex = (currentIndex + direction + appTabs.length) % appTabs.length;
        appTabs[nextIndex].focus();
        setActiveAppTab(appTabs[nextIndex]);
      });
    }
  }

  if (planCards.length) {
    for (const card of planCards) {
      card.addEventListener("click", () => setActivePlan(card));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setActivePlan(card);
        }
      });
    }
  }

  if (billingCards.length) {
    const billingPlans = {
      annual: {
        label: "Annuale",
        price: "7,49€",
        cycle: "/anno",
        oldPrice: "27,99€",
        cta: "Scegli Annuale",
      },
      monthly: {
        label: "Mensile",
        price: "3,49€",
        cycle: "/mese",
        oldPrice: "",
        cta: "Scegli Mensile",
      },
    };

    const renderPrice = (element, value) => {
      const match = value.match(/^(\d+,)(\d+€)$/);
      if (!match) {
        element.textContent = value;
        return;
      }

      element.innerHTML = `<span class="price-main">${match[1]}</span><span class="price-decimals">${match[2]}</span>`;
    };

    const setBillingPlan = (card, key) => {
      const plan = billingPlans[key];
      if (!plan) return;

      card.dataset.plan = plan.label;

      const price = card.querySelector("[data-billing-price]");
      const cycle = card.querySelector("[data-billing-cycle]");
      const oldPrice = card.querySelector("[data-billing-old-price]");
      const cta = card.querySelector("[data-billing-cta]");

      if (price) renderPrice(price, plan.price);
      if (cycle) cycle.textContent = plan.cycle;
      if (cta) cta.textContent = plan.cta;
      if (oldPrice) {
        oldPrice.textContent = plan.oldPrice;
        oldPrice.classList.toggle("is-hidden", !plan.oldPrice);
      }

      for (const option of card.querySelectorAll("[data-billing-option]")) {
        const active = option.dataset.billingOption === key;
        option.classList.toggle("is-active", active);
        option.setAttribute("aria-pressed", active ? "true" : "false");
      }
    };

    for (const card of billingCards) {
      for (const option of card.querySelectorAll("[data-billing-option]")) {
        option.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          setBillingPlan(card, option.dataset.billingOption);
          setActivePlan(card);
        });
      }
    }
  }

  if (!glow) return;

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let tx = x;
  let ty = y;
  let raf = 0;

  const smooth = 0.12;

  const tick = () => {
    x += (tx - x) * smooth;
    y += (ty - y) * smooth;
    glow.style.left = `${x}px`;
    glow.style.top = `${y}px`;
    raf = requestAnimationFrame(tick);
  };

  glow.style.left = `${x}px`;
  glow.style.top = `${y}px`;
  raf = requestAnimationFrame(tick);

  const onMove = (event) => {
    tx = event.clientX;
    ty = event.clientY;
    if (!raf) raf = requestAnimationFrame(tick);
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });
  window.addEventListener("mouseleave", () => {
    glow.classList.add("is-hidden");
  });
  window.addEventListener("mouseenter", () => {
    glow.classList.remove("is-hidden");
    if (!raf) raf = requestAnimationFrame(tick);
  });
  window.addEventListener("blur", () => glow.classList.add("is-hidden"));
  window.addEventListener("focus", () => glow.classList.remove("is-hidden"));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) {
    glow.classList.add("is-subtle");
  }
})();
