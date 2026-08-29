(() => {
  "use strict";

  const projects = Array.isArray(window.RTLC_PROJECTS) ? window.RTLC_PROJECTS : [];
  const projectRoot = document.querySelector("#project-grid");
  const countRoot = document.querySelector("#project-count");
  const emptyRoot = document.querySelector("#empty-state");
  const searchInput = document.querySelector("#project-search");
  const modal = document.querySelector("#project-modal");
  const modalContent = document.querySelector("#modal-content");
  const modalClose = document.querySelector(".project-modal__close");
  const toast = document.querySelector("#toast");
  const filters = [...document.querySelectorAll(".filter")];
  const donorsBoard = document.querySelector("#donors-board");
  const reviewsList = document.querySelector("#reviews-list");
  const reviewProject = document.querySelector("#review-project");
  let activeFilter = "all";
  let toastTimer;

  function loadReviews() {
    projects.forEach((project) => reviewProject?.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`));
    if (!reviewsList) return;
    fetch("data/reviews.json?v=1", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      const reviews = Array.isArray(data.reviews) ? data.reviews.filter((item) => item?.approved && item.nickname && item.message) : [];
      if (!reviews.length) return;
      reviewsList.innerHTML = reviews.map((item) => { const project = projects.find((p) => p.id === item.project); return `<article class="review-card"><strong>${escapeHtml(item.nickname)}</strong><p>${escapeHtml(item.message)}</p>${project ? `<a href="#projects" data-project="${escapeHtml(project.id)}">${escapeHtml(project.name)} ↗</a>` : ""}</article>`; }).join("");
    }).catch(() => {});
  }

  async function loadDonors() {
    if (!donorsBoard) return;
    try {
      const response = await fetch("data/donors.json?v=donors-2", { cache: "no-store" });
      if (!response.ok) throw new Error("donors unavailable");
      const payload = await response.json();
      const donors = Array.isArray(payload.donors) ? payload.donors
        .filter((donor) => donor && donor.name)
        .sort((a, b) => {
          const amountDiff = Number(b.amount || 0) - Number(a.amount || 0);
          return amountDiff || 0;
        }) : [];
      if (!donors.length) return;
      donorsBoard.innerHTML = donors.map((donor, index) => `
        <article class="donor-card donor-card--${index < 3 ? index + 1 : "rest"}">
          <span class="donor-card__place">${String(index + 1).padStart(2, "0")}</span>
          <span class="donor-card__name">${escapeHtml(donor.name)}</span>
          <strong class="donor-card__amount">${Number(donor.amount) > 0 ? `${Number(donor.amount).toLocaleString("ru-RU")} ₽` : ""}</strong>
        </article>`).join("");
    } catch (error) {
      console.warn("Не удалось загрузить топ донатеров", error);
    }
  }

  const labels = {
    translation: "Русификатор",
    voice: "Нейродубляж",
    free: "Бесплатно",
    exclusive: "Эксклюзив",
  };

  const accents = ["#d64224", "#769a56", "#f0442e", "#a44b2d", "#9caf70"];

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
    })[character]);
  }

  function accessLabel(project) {
    if (project.access.length > 1) return "Бесплатно + эксклюзив";
    return labels[project.access[0]] || "Подробнее";
  }

  function tagMarkup(tags = []) {
    return tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  }

  function steamUrl(project) {
    return project.steam || `https://store.steampowered.com/app/${project.steamAppId}/`;
  }

  function steamAsset(project, kind) {
    return `assets/steam/${project.id}-${kind}.webp`;
  }

  function matchesFilter(project) {
    if (activeFilter === "all") return true;
    if (activeFilter === "voice") return project.type === "voice" || project.tags.includes("Озвучка");
    if (activeFilter === "translation") return project.type === "translation";
    return project.access.includes(activeFilter);
  }

  function renderProjects() {
    if (!projectRoot) return;

    const query = (searchInput?.value || "").trim().toLocaleLowerCase("ru");
    const visible = projects.filter((project) => {
      const haystack = [project.name, project.type, ...project.tags].join(" ").toLocaleLowerCase("ru");
      return matchesFilter(project) && haystack.includes(query);
    });

    projectRoot.innerHTML = visible.map((project, index) => {
      const projectIndex = projects.findIndex((item) => item.id === project.id) + 1;
      const accent = project.accent || accents[index % accents.length];
      return `
        <article class="project-card" style="--accent: ${escapeHtml(accent)}">
          <img class="project-card__banner" src="${escapeHtml(steamAsset(project, "banner"))}" alt="Плашка ${escapeHtml(project.name)} из Steam" loading="lazy" decoding="async">
          <span class="project-card__body">
            <span class="project-card__top">
              <span>#${String(projectIndex).padStart(2, "0")}</span>
              <span class="project-card__access">${escapeHtml(accessLabel(project))}</span>
            </span>
            <span class="project-card__heading">
              <img class="project-card__icon" src="${escapeHtml(steamAsset(project, "icon"))}" alt="" width="56" height="56" loading="lazy" decoding="async">
              <span class="project-card__title">${escapeHtml(project.name)}</span>
            </span>
            <span class="project-card__footer">
              <span class="project-card__tags">${tagMarkup(project.tags)}</span>
              <a class="steam-badge" href="${escapeHtml(steamUrl(project))}" target="_blank" rel="noopener" aria-label="${escapeHtml(project.name)} в Steam">Steam <span aria-hidden="true">↗</span></a>
            </span>
          </span>
          <button class="project-card__trigger" type="button" data-project="${escapeHtml(project.id)}" aria-label="Подробнее о проекте ${escapeHtml(project.name)}"></button>
        </article>
      `;
    }).join("");

    if (countRoot) countRoot.textContent = String(visible.length);
    if (emptyRoot) emptyRoot.hidden = visible.length !== 0;
  }

  function openProject(projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !modal || !modalContent) return;

    const accent = project.accent || accents[projects.indexOf(project) % accents.length];
    const image = `<img src="${escapeHtml(steamAsset(project, "banner"))}" alt="Плашка ${escapeHtml(project.name)} из Steam" width="720" height="338">`;
    const description = project.description || "Актуальная версия, описание и инструкция по установке доступны в официальном посте RTLC на Boosty.";
    const extraAccess = project.exclusiveBoosty
      ? `<a class="button" href="${escapeHtml(project.exclusiveBoosty)}" target="_blank" rel="noopener">Эксклюзивная версия <span>↗</span></a>`
      : "";
    const steamLink = `<a class="button" href="${escapeHtml(steamUrl(project))}" target="_blank" rel="noopener">Страница в Steam <span>↗</span></a>`;

    modalContent.innerHTML = `
      <div class="modal-hero" style="--accent: ${escapeHtml(accent)}">
        ${image}
        <div>
          <p class="modal-hero__eyebrow">${escapeHtml(labels[project.type])}</p>
          <div class="modal-title-row">
            <img src="${escapeHtml(steamAsset(project, "icon"))}" alt="" width="64" height="64">
            <h2 id="modal-title">${escapeHtml(project.name)}</h2>
          </div>
        </div>
      </div>
      <div class="modal-body" style="--accent: ${escapeHtml(accent)}">
        <p>${escapeHtml(description)}</p>
        <div class="modal-tags">${tagMarkup(project.tags)}</div>
        <div class="modal-status">
          <div><small>Тип проекта</small><strong>${escapeHtml(labels[project.type])}</strong></div>
          <div><small>Доступ</small><strong>${escapeHtml(accessLabel(project))}</strong></div>
        </div>
        <div class="modal-actions">
          <a class="button button--light" href="${escapeHtml(project.boosty)}" target="_blank" rel="noopener">Скачать / подробнее на Boosty <span>↗</span></a>
          ${extraAccess}
          ${steamLink}
        </div>
      </div>
    `;

    modal.showModal();
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modal?.open) return;
    modal.close();
    document.body.style.overflow = "";
  }

  function initFilters() {
    filters.forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter || "all";
        filters.forEach((item) => {
          const isActive = item === button;
          item.classList.toggle("is-active", isActive);
          item.setAttribute("aria-pressed", String(isActive));
        });
        renderProjects();
      });
    });

    searchInput?.addEventListener("input", renderProjects);
  }

  function initProjectEvents() {
    document.addEventListener("click", (event) => {
      const projectTrigger = event.target.closest("[data-project]");
      if (projectTrigger) openProject(projectTrigger.dataset.project);
    });

    modalClose?.addEventListener("click", closeModal);
    modal?.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    modal?.addEventListener("close", () => {
      document.body.style.overflow = "";
    });
  }

  function initMobileMenu() {
    const button = document.querySelector(".menu-toggle");
    const menu = document.querySelector("#site-menu");
    if (!button || !menu) return;

    button.addEventListener("click", () => {
      const isOpen = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", String(!isOpen));
      menu.classList.toggle("is-open", !isOpen);
    });

    menu.addEventListener("click", (event) => {
      if (!event.target.closest("a")) return;
      button.setAttribute("aria-expanded", "false");
      menu.classList.remove("is-open");
    });
  }

  function initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -35px" });

    items.forEach((item) => observer.observe(item));
  }

  function initCopyButtons() {
    document.querySelectorAll(".copy-discord").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(button.dataset.copy || "");
          showToast("Discord скопирован");
        } catch {
          showToast(`Discord: ${button.dataset.copy || ""}`);
        }
      });
    });
  }

  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function initNavigationState() {
    const links = [...document.querySelectorAll('.topbar__links a[href^="#"]')];
    const sections = links
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          link.toggleAttribute("aria-current", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    }, { rootMargin: "-42% 0px -50%" });

    sections.forEach((section) => observer.observe(section));
  }

  renderProjects();
  loadDonors();
  loadReviews();
  initFilters();
  initProjectEvents();
  initMobileMenu();
  initReveal();
  initCopyButtons();
  initNavigationState();

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
