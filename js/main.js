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
  const { language = "ru", t = (key) => key } = window.RTLC_I18N || {};
  let activeFilter = "all";
  let toastTimer;

  async function loadReviews() {
    if (!reviewsList) return;
    reviewsList.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("data/reviews.json", { cache: "no-store" });
      if (!response.ok) throw new Error("reviews unavailable");
      const data = await response.json();
      const reviews = Array.isArray(data.reviews) ? data.reviews.filter((item) => item?.approved && item.nickname && item.message) : [];
      if (!reviews.length) {
        reviewsList.innerHTML = `<p class="reviews-empty">${escapeHtml(t("reviewsEmpty"))}</p>`;
        return;
      }
      reviewsList.innerHTML = reviews.map((item) => { const project = projects.find((p) => p.id === item.project); return `<article class="review-card"><strong>${escapeHtml(item.nickname)}</strong><p>${escapeHtml(item.message)}</p>${project ? `<a href="#projects" data-project="${escapeHtml(project.id)}">${escapeHtml(project.name)} ↗</a>` : ""}</article>`; }).join("");
    } catch {
      reviewsList.innerHTML = `<p class="reviews-empty">${escapeHtml(t("reviewsError"))} <button type="button" data-retry="reviews">${escapeHtml(t("retry"))}</button></p>`;
    } finally {
      reviewsList.setAttribute("aria-busy", "false");
    }
  }

  async function loadDonors() {
    if (!donorsBoard) return;
    donorsBoard.setAttribute("aria-busy", "true");
    donorsBoard.innerHTML = `<p class="donors-empty">${escapeHtml(t("donorsLoading"))}</p>`;
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
      if (!donors.length) {
        donorsBoard.innerHTML = `<p class="donors-empty">${escapeHtml(t("donorsEmpty"))}</p>`;
        return;
      }
      donorsBoard.innerHTML = donors.map((donor, index) => `
        <article class="donor-card donor-card--${index < 3 ? index + 1 : "rest"}">
          <span class="donor-card__place">${String(index + 1).padStart(2, "0")}</span>
          <span class="donor-card__name">${escapeHtml(donor.name)}</span>
          <strong class="donor-card__amount">${Number(donor.amount) > 0 ? `${Number(donor.amount).toLocaleString(language === "en" ? "en-US" : "ru-RU")} ₽` : ""}</strong>
        </article>`).join("");
    } catch (error) {
      donorsBoard.innerHTML = `<p class="donors-empty">${escapeHtml(t("donorsError"))} <button type="button" data-retry="donors">${escapeHtml(t("retry"))}</button></p>`;
      console.warn("Не удалось загрузить топ донатеров", error);
    } finally {
      donorsBoard.setAttribute("aria-busy", "false");
    }
  }

  const labels = { translation: t("project"), voice: t("voice"), free: t("free"), exclusive: t("exclusive") };

  const boostyMediaCounts = {
    "potential-man": 5, sheepy: 5, "the-werecleaner": 5, "moral-dilemma": 5, endacopia: 5,
    "schedule-i": 2, "playing-kafka": 5, repo: 1, "gamble-with-your-friends": 5,
    "am-i-nima-demo": 5, "control-not-coming-back": 5, "smile-more": 5, "finding-frankie": 2,
    subliminal: 2, "the-invincible": 2, "darwins-paradox": 2, "burglin-gnomes": 2,
    "toejam-earl": 5, "deadline-escape": 4, vigil: 1, "krypta-fm": 1, "welcome-dark-place": 2, ratatan: 2
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
    if (project.access.length > 1) return t("mixed");
    return labels[project.access[0]] || t("details");
  }

  function projectWord(count) {
    if (language === "en") return count === 1 ? t("projects")[0] : t("projects")[1];
    const lastTwo = count % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return "проектов";
    if (count % 10 === 1) return "проект";
    if (count % 10 >= 2 && count % 10 <= 4) return "проекта";
    return "проектов";
  }

  function accessDescription(project) {
    if (language === "ru" && project.accessDetails) return project.accessDetails;
    if (project.access.length > 1) return t("mixedAccess");
    return project.access.includes("exclusive") ? t("exclusiveAccess") : t("freeAccess");
  }

  function updateLabel(project) {
    return project.updatedAt ? new Date(`${project.updatedAt}T12:00:00Z`).toLocaleDateString(language === "en" ? "en-GB" : "ru-RU", { timeZone: "UTC" }) : t("noDate");
  }

  function tagMarkup(tags = []) {
    const translated = { "Текст": t("text"), "Текстуры": t("textures"), "Озвучка": t("voice") };
    return tags.map((tag) => `<span class="tag">${escapeHtml(translated[tag] || tag)}</span>`).join("");
  }

  function steamUrl(project) {
    return project.steam || `https://store.steampowered.com/app/${project.steamAppId}/`;
  }

  function steamAsset(project, kind) {
    return `assets/steam/${project.id}-${kind}.webp`;
  }

  function boostyAsset(project, suffix) {
    return `assets/boosty/${project.id}-${suffix}.jpg`;
  }

  function bannerAsset(project) {
    return language === "ru" && boostyMediaCounts[project.id] ? boostyAsset(project, "banner") : steamAsset(project, "banner");
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
          <img class="project-card__banner" src="${escapeHtml(bannerAsset(project))}" alt="${escapeHtml(t(language === "ru" && boostyMediaCounts[project.id] ? "cardAlt" : "steamCardAlt", { name: project.name }))}" loading="lazy" decoding="async">
          <span class="project-card__body">
            <span class="project-card__top">
              <span>#${String(projectIndex).padStart(2, "0")}</span>
              <span class="project-card__access">${escapeHtml(accessLabel(project))}</span>
            </span>
            <span class="project-card__heading">
              <img class="project-card__icon" src="${escapeHtml(steamAsset(project, "icon"))}" alt="" width="56" height="56" loading="lazy" decoding="async">
              <span class="project-card__title">${escapeHtml(project.name)}</span>
            </span>
            ${project.updatedAt ? `<span class="project-card__updated">${escapeHtml(t("update"))}: ${escapeHtml(updateLabel(project))}</span>` : ""}
            <span class="project-card__footer">
              <span class="project-card__tags">${tagMarkup(project.tags)}</span>
              <a class="steam-badge" href="${escapeHtml(steamUrl(project))}" target="_blank" rel="noopener" aria-label="${escapeHtml(t("steamAria", { name: project.name }))}">Steam <span aria-hidden="true">↗</span></a>
            </span>
          </span>
          <button class="project-card__trigger" type="button" data-project="${escapeHtml(project.id)}" aria-label="${escapeHtml(t("cardAria", { name: project.name }))}"></button>
        </article>
      `;
    }).join("");

    if (countRoot) countRoot.textContent = String(visible.length);
    const countLabel = document.querySelector("#project-count-label");
    if (countLabel) countLabel.textContent = projectWord(visible.length);
    if (emptyRoot) emptyRoot.hidden = visible.length !== 0;
  }

  function openProject(projectId) {
    const project = projects.find((item) => item.id === projectId);
    if (!project || !modal || !modalContent) return;

    const accent = project.accent || accents[projects.indexOf(project) % accents.length];
    const image = `<img src="${escapeHtml(bannerAsset(project))}" alt="${escapeHtml(t(language === "ru" && boostyMediaCounts[project.id] ? "cardAlt" : "steamCardAlt", { name: project.name }))}" width="720" height="338">`;
    const description = language === "en" ? t("defaultDescription") : (project.description || t("defaultDescription"));
    const exampleCount = Math.min(4, Math.max(0, (boostyMediaCounts[project.id] || 0) - 1));
    const gallery = exampleCount ? `<section class="modal-gallery" aria-labelledby="modal-gallery-title">
      <h3 id="modal-gallery-title">${escapeHtml(t("screenshots"))}</h3>
      <div>${Array.from({ length: exampleCount }, (_, index) => {
        const src = boostyAsset(project, `example-${index + 1}`);
        const alt = t("screenshotAlt", { name: project.name, number: index + 1 });
        return `<button type="button" class="modal-gallery__item" data-gallery-image="${escapeHtml(src)}" aria-label="${escapeHtml(alt)}"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"></button>`;
      }).join("")}</div>
    </section>` : "";
    const extraAccess = project.exclusiveBoosty
      ? `<a class="button" href="${escapeHtml(project.exclusiveBoosty)}" target="_blank" rel="noopener">${escapeHtml(t("exclusiveAction"))} <span>↗</span></a>`
      : "";
    const steamLink = `<a class="button" href="${escapeHtml(steamUrl(project))}" target="_blank" rel="noopener">${escapeHtml(t("steamAction"))} <span>↗</span></a>`;

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
        <p class="modal-access">${escapeHtml(accessDescription(project))}</p>
        <div class="modal-actions">
          <a class="button button--light" href="${escapeHtml(project.boosty)}" target="_blank" rel="noopener">${escapeHtml(t("boostyAction"))} <span>↗</span></a>
          ${extraAccess}
          ${steamLink}
        </div>
        <div class="modal-status">
          <div><small>${escapeHtml(t("typeLabel"))}</small><strong>${escapeHtml(labels[project.type])}</strong></div>
          <div><small>${escapeHtml(t("accessLabel"))}</small><strong>${escapeHtml(accessLabel(project))}</strong></div>
          <div><small>${escapeHtml(t("updateLabel"))}</small><strong>${escapeHtml(updateLabel(project))}${project.translationVersion ? ` · ${escapeHtml(project.translationVersion)}` : ""}</strong></div>
          <div><small>${escapeHtml(t("compatibilityLabel"))}</small><strong>${escapeHtml(language === "ru" ? (project.gameVersion || t("unknownCompatibility")) : t("unknownCompatibility"))}</strong></div>
          <div><small>${escapeHtml(t("supportLabel"))}</small><strong>${escapeHtml(language === "ru" ? (project.supportStatus || t("unknownSupport")) : t("unknownSupport"))}</strong></div>
          ${project.checkedAt ? `<div><small>${escapeHtml(t("checkedLabel"))}</small><strong>${escapeHtml(project.checkedAt.split("-").reverse().join("."))} · ${escapeHtml(t("checkedSource"))}</strong></div>` : ""}
        </div>
        ${gallery}
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
      const galleryItem = event.target.closest("[data-gallery-image]");
      if (galleryItem && modal?.open) {
        const preview = modal.querySelector(".modal-hero > img");
        const thumbnail = galleryItem.querySelector("img");
        if (preview && thumbnail) {
          preview.src = galleryItem.dataset.galleryImage;
          preview.alt = thumbnail.alt;
          modal.querySelector(".project-modal__frame")?.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
      const projectTrigger = event.target.closest("[data-project]");
      if (projectTrigger) {
        event.preventDefault();
        openProject(projectTrigger.dataset.project);
      }
      const retry = event.target.closest("[data-retry]");
      if (retry?.dataset.retry === "donors") loadDonors();
      if (retry?.dataset.retry === "reviews") loadReviews();
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
          showToast(t("copied"));
        } catch {
          showToast(`Discord: ${button.dataset.copy || ""}`);
        }
      });
    });
  }

  function initReviewForm() {
    const form = document.querySelector("#review-form");
    const draft = document.querySelector("#review-draft");
    const draftText = document.querySelector("#review-draft-text");
    const status = document.querySelector("#review-status");
    if (!form || !draft || !draftText || !status) return;
    projects.forEach((project) => reviewProject?.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nickname = form.elements.nickname;
      const message = form.elements.message;
      nickname.setCustomValidity(nickname.value.trim() ? "" : t("reviewRequiredName"));
      message.setCustomValidity(message.value.trim() ? "" : t("reviewRequiredMessage"));
      if (!form.reportValidity()) return;
      const project = projects.find((item) => item.id === reviewProject.value);
      if (!project) return;
      draftText.value = `${t("reviewDraftTitle")}\n${t("reviewDraftName")}: ${nickname.value.trim()}\n${t("reviewDraftGame")}: ${project.name}\n\n${message.value.trim()}`;
      draft.hidden = false;
      status.textContent = t("reviewPending");
      draftText.focus();
    });
    form.addEventListener("input", (event) => {
      if (!event.target.name) return;
      event.target.setCustomValidity("");
      draft.hidden = true;
    });
    document.querySelector("#review-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(draftText.value);
        status.textContent = t("reviewCopied");
      } catch {
        draftText.focus();
        draftText.select();
        status.textContent = t("reviewManualCopy");
      }
    });
    form.hidden = false;
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
  initReviewForm();
  initNavigationState();

  const year = document.querySelector("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
