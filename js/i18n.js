(() => {
  "use strict";

  const params = new URLSearchParams(location.search);
  const requested = params.get("lang");
  const stored = localStorage.getItem("rtlc-language");
  const language = requested === "en" || requested === "ru" ? requested : (stored === "en" ? "en" : "ru");

  const messages = {
    ru: {
      languageName: "English", languageLabel: "Switch site language to English",
      project: "Русификатор", voice: "Озвучка", text: "Текст", textures: "Текстуры",
      free: "Бесплатно", exclusive: "Эксклюзив", mixed: "Бесплатно + эксклюзив", details: "Подробнее",
      projects: ["проект", "проекта", "проектов"], catalogSuffix: "в каталоге",
      update: "Обновление", noDate: "Дата не указана", screenshots: "Примеры перевода",
      screenshotAlt: "Пример русской локализации {name}, изображение {number}",
      defaultDescription: "Актуальная версия, описание и инструкция по установке доступны в официальном посте RTLC на Boosty.",
      mixedAccess: "Есть бесплатная и эксклюзивная версии. Состав и условия доступа уточняйте в публикации RTLC перед скачиванием.",
      exclusiveAccess: "Эксклюзивный проект доступен подписчикам соответствующего уровня Boosty. Проверьте условия доступа в публикации перед оформлением подписки.",
      freeAccess: "Проект доступен бесплатно. Актуальную версию и инструкцию по установке проверьте в публикации RTLC перед скачиванием.",
      boostyAction: "Скачать / подробнее на Boosty", exclusiveAction: "Эксклюзивная версия", steamAction: "Страница в Steam",
      typeLabel: "Тип проекта", accessLabel: "Доступ", updateLabel: "Обновление перевода", compatibilityLabel: "Совместимость с игрой", supportLabel: "Поддержка перевода", checkedLabel: "Сведения проверены",
      unknownCompatibility: "Не подтверждена — уточните в публикации", unknownSupport: "Статус не указан — уточните у команды", checkedSource: "по публикации RTLC",
      cardAlt: "Русский баннер {name} с Boosty", steamCardAlt: "Баннер {name} из Steam", cardAria: "Подробнее о проекте {name}", steamAria: "{name} в Steam",
      reviewsEmpty: "Пока нет опубликованных отзывов. Поделитесь впечатлениями о переводе.", reviewsError: "Не удалось загрузить отзывы.", retry: "Попробовать ещё раз",
      donorsLoading: "Загрузка донатеров…", donorsEmpty: "Список пока пуст. Спасибо всем, кто поддерживает команду.", donorsError: "Не удалось загрузить список.",
      copied: "Discord скопирован", reviewRequiredName: "Введите ник.", reviewRequiredMessage: "Напишите отзыв.",
      reviewDraftTitle: "Отзыв для сайта RTLC TEAM", reviewDraftName: "Ник", reviewDraftGame: "Игра",
      reviewPending: "Отзыв ещё не отправлен. Скопируйте текст, откройте чат и отправьте сообщение.",
      reviewCopied: "Текст скопирован. Теперь откройте чат RTLC, вставьте его и отправьте сообщение.",
      reviewManualCopy: "Скопируйте выделенный текст вручную, затем вставьте его в чат RTLC и отправьте сообщение."
    },
    en: {
      languageName: "Русский", languageLabel: "Переключить язык сайта на русский",
      project: "Translation", voice: "Voice-over", text: "Text", textures: "Textures",
      free: "Free", exclusive: "Exclusive", mixed: "Free + exclusive", details: "Details",
      projects: ["project", "projects", "projects"], catalogSuffix: "in the catalog",
      update: "Updated", noDate: "Date not specified", screenshots: "Translation examples",
      screenshotAlt: "Russian localization example for {name}, image {number}",
      defaultDescription: "The latest version, description, and installation guide are available in the official RTLC post on Boosty.",
      mixedAccess: "Free and exclusive versions are available. Check the RTLC post for their contents and access terms before downloading.",
      exclusiveAccess: "This exclusive project is available to subscribers of the corresponding Boosty tier. Check the post before subscribing.",
      freeAccess: "This project is free. Check the RTLC post for the latest version and installation guide before downloading.",
      boostyAction: "Download / details on Boosty", exclusiveAction: "Exclusive version", steamAction: "Steam page",
      typeLabel: "Project type", accessLabel: "Access", updateLabel: "Translation update", compatibilityLabel: "Game compatibility", supportLabel: "Translation support", checkedLabel: "Information checked",
      unknownCompatibility: "Not confirmed — check the post", unknownSupport: "Not specified — ask the team", checkedSource: "based on the RTLC post",
      cardAlt: "Russian {name} banner from Boosty", steamCardAlt: "{name} banner from Steam", cardAria: "View details for {name}", steamAria: "{name} on Steam",
      reviewsEmpty: "No published reviews yet. Share your experience with a translation.", reviewsError: "Reviews could not be loaded.", retry: "Try again",
      donorsLoading: "Loading supporters…", donorsEmpty: "The list is empty for now. Thank you to everyone supporting the team.", donorsError: "The list could not be loaded.",
      copied: "Discord copied", reviewRequiredName: "Enter your name.", reviewRequiredMessage: "Write a review.",
      reviewDraftTitle: "Review for the RTLC TEAM website", reviewDraftName: "Name", reviewDraftGame: "Game",
      reviewPending: "The review has not been sent yet. Copy the text, open the chat, and send the message.",
      reviewCopied: "Text copied. Open the RTLC chat, paste it, and send the message.",
      reviewManualCopy: "Copy the selected text manually, then paste it into the RTLC chat and send the message."
    }
  };

  const t = (key, values = {}) => {
    let value = messages[language][key] ?? messages.ru[key] ?? key;
    if (typeof value !== "string") return value;
    return Object.entries(values).reduce((text, [name, replacement]) => text.replace(`{${name}}`, replacement), value);
  };

  window.RTLC_I18N = { language, t };
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-ru][data-en]").forEach((element) => {
      element.innerHTML = element.dataset[language];
    });
    document.querySelectorAll("[data-placeholder-ru][data-placeholder-en]").forEach((element) => {
      element.placeholder = element.dataset[`placeholder${language === "ru" ? "Ru" : "En"}`];
    });
    document.querySelectorAll("[data-aria-ru][data-aria-en]").forEach((element) => {
      element.setAttribute("aria-label", element.dataset[`aria${language === "ru" ? "Ru" : "En"}`]);
    });

    const languageToggle = document.querySelector("[data-language-toggle]");
    if (languageToggle) {
      languageToggle.textContent = t("languageName");
      languageToggle.setAttribute("aria-label", t("languageLabel"));
      languageToggle.addEventListener("click", () => {
        const next = language === "ru" ? "en" : "ru";
        localStorage.setItem("rtlc-language", next);
        const nextUrl = new URL(location.href);
        nextUrl.searchParams.set("lang", next);
        location.assign(nextUrl);
      });
    }

    if (language === "en") {
      document.title = "RTLC TEAM — Russian game localization";
      document.querySelector('meta[name="description"]')?.setAttribute("content", "RTLC TEAM creates Russian text, texture, and voice-over localizations for games.");
      document.querySelector('meta[property="og:locale"]')?.setAttribute("content", "en_US");
    }
  });
})();
