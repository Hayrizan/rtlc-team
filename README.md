# RTLC TEAM Website

Официальный статический сайт-визитка **RTLC TEAM — Russian Translate Localisation Crew**. Сайт рассказывает о команде, показывает актуальный каталог русификаторов и ведёт на официальные публикации RTLC в Boosty.

Сайт написан на HTML, CSS и Vanilla JavaScript, не требует сборщика и готов к размещению на GitHub Pages.

Опубликованная версия: <https://hayrizan.github.io/rtlc-team/>

## Local development

Самый простой вариант — запустить локальный HTTP-сервер из корня проекта:

```bash
python -m http.server 8080
```

После этого откройте `http://localhost:8080`. Также сайт можно открыть напрямую через `index.html`, но HTTP-сервер точнее воспроизводит поведение GitHub Pages.

## Project structure

```text
index.html                       Основная одностраничная версия сайта
404.html                         Страница ошибки
css/style.css                    Дизайн и адаптивность
js/projects.js                   Данные всех русификаторов
js/main.js                       Рендер карточек, фильтры и модальные окна
assets/branding/                 Официальный логотип, favicon и Open Graph-материалы
assets/projects/                 Оптимизированные обложки проектов
GitHub Pages                     Публикация напрямую из ветки main
```

## Adding a localization

Новый проект добавляется одной записью в массив `window.RTLC_PROJECTS` внутри [`js/projects.js`](js/projects.js):

```js
{
  id: "game-slug",
  name: "Game Name",
  type: "translation", // translation или voice
  access: ["free"],    // free, exclusive или оба значения
  tags: ["Текст", "Текстуры"],
  boosty: "https://boosty.to/rtlc/posts/...",
  steam: "https://store.steampowered.com/app/.../", // необязательно
  description: "Короткое подтверждённое описание."   // необязательно
}
```

## Images

- Обложки проектов: `assets/projects/`, рекомендуемый формат WebP.
- Фирменные материалы: `assets/branding/`.
- Основной знак команды: `assets/branding/rtlc-bear.webp`.
- Favicon создан из официального знака команды.
- `social-placeholder.svg` сохранён как запасной макет; Open Graph использует официальный знак команды.

Использованные обложки четырёх игр получены с официальных страниц Steam и сохранены локально в оптимизированном виде.

## Deployment

GitHub Pages публикует корень ветки `main` напрямую, без сборки. Все внутренние пути относительные, поэтому сайт корректно работает как project site по адресу вида:

```text
https://USERNAME.github.io/REPOSITORY/
```

После изменения ветки `main` публикация запускается автоматически. Источник Pages настраивается как **Deploy from a branch → main → /(root)**.

## Data source

Список, статусы доступа, ссылки на проекты и профили команды сверены с официальной страницей [RTLC на Boosty](https://boosty.to/rtlc) 29 августа 2026 года.
