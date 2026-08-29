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
  let activeFilter = "all";
  let toastTimer;

  const labels = {
    translation: "Русификатор",
    voice: "Нейродубляж",
    free: "Бесплатно",
    exclusive: "Эксклюзив",
  };

  const accents = ["#8d74ff", "#56e0bd", "#ffb45e", "#ff668e", "#6fa8ff"];

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
        <button class="project-card" type="button" data-project="${escapeHtml(project.id)}" style="--accent: ${escapeHtml(accent)}" aria-label="Подробнее о проекте ${escapeHtml(project.name)}">
          <span class="project-card__top">
            <span>#${String(projectIndex).padStart(2, "0")}</span>
            <span class="project-card__access">${escapeHtml(accessLabel(project))}</span>
          </span>
          <span class="project-card__title">${escapeHtml(project.name)}</span>
          <span class="project-card__tags">${tagMarkup(project.tags)}</span>
          <span class="project-card__arrow" aria-hidden="true">↗</span>
        </button>
      `;
    }).join("");

    if (countRoot) countRoot.textContent = String(visible.length);
    if (emptyRoot) emptyRoot.hidden = visible.length !== 0;
  }

  function openProject(projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !modal || !modalContent) return;

    const accent = project.accent || accents[projects.indexOf(project) % accents.length];
    const image = project.image
      ? `<img src="${escapeHtml(project.image)}" alt="Обложка игры ${escapeHtml(project.name)}" width="920" height="430">`
      : "";
    const description = project.description || "Актуальная версия, описание и инструкция по установке доступны в официальном посте RTLC на Boosty.";
    const extraAccess = project.exclusiveBoosty
      ? `<a class="button" href="${escapeHtml(project.exclusiveBoosty)}" target="_blank" rel="noopener">Эксклюзивная версия <span>↗</span></a>`
      : "";
    const steamLink = project.steam
      ? `<a class="button" href="${escapeHtml(project.steam)}" target="_blank" rel="noopener">Страница в Steam <span>↗</span></a>`
      : "";

    modalContent.innerHTML = `
      <div class="modal-hero" style="--accent: ${escapeHtml(accent)}">
        ${image}
        <div>
          <p class="modal-hero__eyebrow">${escapeHtml(labels[project.type])}</p>
          <h2 id="modal-title">${escapeHtml(project.name)}</h2>
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
  initFilters();
  initProjectEvents();
  initMobileMenu();
  initReveal();
  initCopyButtons();
  initNavigationState();

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
