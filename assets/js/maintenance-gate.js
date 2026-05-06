(() => {
  const previewToken = "ZAwNoPDllgzVhHBNFsVpFvJItCnYUDkxjotsyLgUgOfUBkiBnD";
  const cookieName = "maintenance_override";
  const hasOverride = () => document.cookie.split(";").some((cookie) => cookie.trim() === `${cookieName}=true`);
  const url = new URL(window.location.href);

  if (url.searchParams.get("preview") === previewToken) {
    document.cookie = "maintenance_override=true; path=/; max-age=86400";
    url.searchParams.delete("preview");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    return;
  }

  if (hasOverride()) return;

  document.documentElement.classList.add("maintenance-active");

  const renderMaintenance = () => {
    document.title = "Organizr - Lavori in corso";
    document.body.className = "maintenance-body";
    document.body.innerHTML = `
      <main class="maintenance-page" aria-labelledby="maintenance-title">
        <section class="maintenance-card">
          <img src="/assets/img/logo/organizer-logo-black.png" alt="Logo Organizr" />
          <p class="maintenance-kicker">Lavori in corso</p>
          <h1 id="maintenance-title">Stiamo preparando Organizr.</h1>
          <p>
            Il sito e' temporaneamente in manutenzione. Torniamo online a breve
            con la nuova versione.
          </p>
        </section>
      </main>
    `;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderMaintenance, { once: true });
  } else {
    renderMaintenance();
  }
})();
