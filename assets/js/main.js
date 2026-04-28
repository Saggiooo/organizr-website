(() => {
  const glow = document.querySelector(".cursor-glow");
  const countdowns = [...document.querySelectorAll("[data-countdown]")];
  const countdownParts = {
    hours: [...document.querySelectorAll('[data-countdown-part="hours"]')],
    minutes: [...document.querySelectorAll('[data-countdown-part="minutes"]')],
    seconds: [...document.querySelectorAll('[data-countdown-part="seconds"]')],
  };
  const planCards = [...document.querySelectorAll(".plan-card[data-plan]")];
  const continueButton = document.querySelector("[data-continue-plan]");

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

  if (planCards.length && continueButton) {
    const setActivePlan = (nextCard) => {
      for (const card of planCards) {
        const active = card === nextCard;
        card.classList.toggle("is-featured", active);
        card.setAttribute("aria-checked", active ? "true" : "false");
      }

      const planName = nextCard.dataset.plan;
      continueButton.textContent = `Continua con ${planName}`;
      continueButton.dataset.selectedPlan = planName;
    };

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
