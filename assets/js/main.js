/* ==========================================================================
   Linma Electronics — скрипты сайта
   Без сборки и внешних библиотек: файл подключается тегом <script defer>.
   ========================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     НАСТРОЙКА ОТПРАВКИ ЗАЯВОК
     Куда уходят данные формы. По умолчанию — send.php рядом с сайтом.
     Чтобы переключиться на внешний сервис (Formspree и т. п.), замените
     значение на его URL — больше ничего править не нужно.
     ---------------------------------------------------------------------- */
  var FORM_ENDPOINT = "send.php";

  /* ----------------------------------------------------------------------
     ПУТЬ К ПАПКЕ ASSETS
     На статическом сайте она лежит рядом со страницей, поэтому по умолчанию
     хватает относительного "assets". В WordPress страница живёт по адресу
     вроде /brands/, а файлы — внутри темы, и относительный путь ведёт в
     никуда; там адрес подставляет functions.php через window.LINMA_ASSETS.

     asset() принимает как путь от корня папки ("img/brands/x.svg"), так и
     полный относительный ("assets/img/brands/x.svg") — второй вариант
     приходит из файлов данных, где пути записаны целиком.
     ---------------------------------------------------------------------- */
  var ASSET_BASE = String(window.LINMA_ASSETS || "assets").replace(/\/+$/, "");

  function asset(path) {
    return ASSET_BASE + "/" + String(path).replace(/^\/+/, "").replace(/^assets\//, "");
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================ Шапка */

  function initHeader() {
    var header = document.querySelector(".site-header");
    var burger = document.querySelector(".burger");
    var nav = document.querySelector(".nav");

    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-stuck", window.scrollY > 12);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (burger && nav) {
      burger.addEventListener("click", function () {
        var open = burger.getAttribute("aria-expanded") === "true";
        burger.setAttribute("aria-expanded", String(!open));
        nav.classList.toggle("is-open", !open);
        document.body.style.overflow = !open ? "hidden" : "";
      });

      // Закрываем меню при переходе по ссылке-якорю
      nav.addEventListener("click", function (e) {
        var link = e.target.closest("a");
        if (link && nav.classList.contains("is-open") && !link.closest(".nav-item--has-menu > .nav-link")) {
          burger.setAttribute("aria-expanded", "false");
          nav.classList.remove("is-open");
          document.body.style.overflow = "";
        }
      });
    }

    // На мобильных подменю раскрывается по тапу, а не по наведению.
    // Порог берём из того же медиа-запроса, что и вёрстка меню в CSS:
    // раньше здесь стояло жёсткое 1160, а бургер появляется на 999, и в
    // промежутке 1000–1160 меню было уже горизонтальным, но клик по
    // «Оборудованию» и «Брендам» отменялся — ссылки не открывались.
    var mobileNav = window.matchMedia("(max-width: 999px)");
    document.querySelectorAll(".nav-item--has-menu > .nav-link").forEach(function (trigger) {
      trigger.addEventListener("click", function (e) {
        if (!mobileNav.matches) return;
        e.preventDefault();
        trigger.parentElement.classList.toggle("is-open");
      });
    });

    // Подсветка текущего раздела
    var page = document.body.dataset.page;
    if (page) {
      document.querySelectorAll('.nav-item[data-nav]').forEach(function (item) {
        if (item.dataset.nav.split(" ").indexOf(page) !== -1) item.classList.add("is-current");
      });
    }
  }

  /* ================================================= Появление блоков */

  function initReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.dataset.reveal, 10);
        el.style.transitionDelay = delay ? delay + "ms" : "";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ========================================================== Счётчики */

  function initCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    var run = function (el) {
      var target = parseFloat(el.dataset.count);
      var suffix = el.dataset.countSuffix || "";
      if (reduceMotion) { el.textContent = target + suffix; return; }

      var start = performance.now();
      var duration = 1400;
      var tick = function (now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================ Бренды */

  function brandTile(brand) {
    var tag = brand.url ? "a" : "div";
    var el = document.createElement(tag);
    el.className = "brand-tile";
    el.setAttribute("title", brand.name);

    if (brand.url) {
      el.href = brand.url;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
    }

    if (brand.logo) {
      var img = document.createElement("img");
      img.src = asset(brand.logo);
      img.alt = brand.name;
      img.loading = "lazy";
      el.appendChild(img);
    } else {
      var span = document.createElement("span");
      span.className = "brand-name";
      span.textContent = brand.name;
      el.appendChild(span);
    }
    return el;
  }

  function initBrandMarquee() {
    var track = document.querySelector("[data-brand-marquee]");
    if (!track) return;

    var brands = window.LINMA_BRANDS || [];
    if (!brands.length) return;

    // Лента дублируется, чтобы прокрутка была бесшовной
    var render = function () {
      brands.forEach(function (b) { track.appendChild(brandTile(b)); });
    };
    render();
    render();

    if (reduceMotion) track.style.animation = "none";
  }

  function initBrandsPage() {
    var grid = document.querySelector("[data-brands-grid]");
    if (!grid) return;

    var brands = window.LINMA_BRANDS || [];
    var groups = window.LINMA_BRAND_GROUPS || [];
    var filterBox = document.querySelector("[data-brand-filters]");
    var searchInput = document.querySelector("[data-brand-search]");
    var counter = document.querySelector("[data-brand-count]");
    var activeGroup = "all";
    var query = "";

    if (filterBox) {
      var all = [{ id: "all", label: "Все направления" }].concat(groups);
      all.forEach(function (g) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "filter-btn";
        btn.textContent = g.label;
        btn.dataset.group = g.id;
        btn.setAttribute("aria-pressed", String(g.id === "all"));
        filterBox.appendChild(btn);
      });

      filterBox.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter-btn");
        if (!btn) return;
        activeGroup = btn.dataset.group;
        filterBox.querySelectorAll(".filter-btn").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        draw();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        query = searchInput.value.trim().toLowerCase();
        draw();
      });
    }

    function draw() {
      var list = brands.filter(function (b) {
        var byGroup = activeGroup === "all" || (b.groups || []).indexOf(activeGroup) !== -1;
        var byQuery = !query || b.name.toLowerCase().indexOf(query) !== -1;
        return byGroup && byQuery;
      });

      grid.innerHTML = "";

      if (!list.length) {
        var empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "По этому запросу брендов не найдено. Напишите нам — подберём аналог.";
        grid.appendChild(empty);
      } else {
        list.forEach(function (b) { grid.appendChild(brandTile(b)); });
      }

      if (counter) {
        counter.textContent = list.length;
      }
    }

    draw();
  }

  // Бренды конкретного направления на странице группы оборудования
  function initGroupBrands() {
    var box = document.querySelector("[data-group-brands]");
    if (!box) return;

    var group = box.dataset.groupBrands;
    var brands = (window.LINMA_BRANDS || []).filter(function (b) {
      return (b.groups || []).indexOf(group) !== -1;
    });

    if (!brands.length) {
      box.closest("[data-group-brands-section]")?.remove();
      return;
    }
    brands.forEach(function (b) { box.appendChild(brandTile(b)); });
  }

  /* ============================================================== Карта */

  // Города поставок. Координаты настоящие: на карту их кладёт та же проекция
  // Альберса, которой построен контур страны в ru-map.js.
  // label: подписывать ли город; anchor/dx/dy — положение подписи.
  var CITIES = [
    { id: "murmansk",    name: "Мурманск",        lon: 33.1,  lat: 68.9, region: "northwest", label: true, anchor: "middle", dx: 0,   dy: -16 },
    { id: "spb",         name: "Санкт-Петербург", lon: 30.3,  lat: 59.9, region: "northwest", major: true, label: true, anchor: "start",  dx: 14,  dy: -10 },
    { id: "moscow",      name: "Москва",          lon: 37.6,  lat: 55.7, region: "moscow",    major: true, label: true, anchor: "end",    dx: -14, dy: 18 },
    { id: "kazan",       name: "Казань",          lon: 49.1,  lat: 55.8, region: "moscow",    label: true, anchor: "end",    dx: -14, dy: 6 },
    { id: "rostov",      name: "Ростов-на-Дону",  lon: 39.7,  lat: 47.2, region: "moscow",    label: true, anchor: "start",  dx: 12,  dy: 30 },
    { id: "ekb",         name: "Екатеринбург",    lon: 60.6,  lat: 56.8, region: "ural",      label: true, anchor: "middle", dx: 0,   dy: -16 },
    { id: "tyumen",      name: "Тюмень",          lon: 65.5,  lat: 57.1, region: "ural" },
    { id: "novosibirsk", name: "Новосибирск",     lon: 82.9,  lat: 55.0, region: "ural",      label: true, anchor: "middle", dx: 0,   dy: 26 },
    { id: "krasnoyarsk", name: "Красноярск",      lon: 92.9,  lat: 56.0, region: "ural",      label: true, anchor: "middle", dx: 0,   dy: -16 },
    { id: "irkutsk",     name: "Иркутск",         lon: 104.3, lat: 52.3, region: "east",      label: true, anchor: "middle", dx: 0,   dy: 26 },
    { id: "chita",       name: "Чита",            lon: 113.5, lat: 52.0, region: "east" },
    { id: "yakutsk",     name: "Якутск",          lon: 129.7, lat: 62.0, region: "east",      label: true, anchor: "middle", dx: 0,   dy: -16 },
    { id: "khabarovsk",  name: "Хабаровск",       lon: 135.1, lat: 48.5, region: "east", major: true, label: true, anchor: "start", dx: 14, dy: 4 },
    { id: "vladivostok", name: "Владивосток",     lon: 131.9, lat: 43.1, region: "east",      label: true, anchor: "start",  dx: 14,  dy: 4 }
  ];

  // Та же проекция, что использовалась при построении контура страны.
  function projectCity(c) {
    var P = window.LINMA_RU_MAP.projection;
    var D2R = Math.PI / 180;
    var lon = c.lon < -100 ? c.lon + 360 : c.lon;
    var lam = (lon - P.lon0) * D2R;
    var v = P.C - 2 * P.n * Math.sin(c.lat * D2R);
    if (v < 0) v = 0;
    var rho = Math.sqrt(v) / P.n;
    var th = P.n * lam;
    return [
      (rho * Math.sin(th) - P.minX) * P.scale,
      (P.maxY - (P.rho0 - rho * Math.cos(th))) * P.scale
    ];
  }

  function initMap() {
    var host = document.querySelector("[data-map]");
    if (!host) return;

    var MAP = window.LINMA_RU_MAP;
    if (!MAP) return;

    var ns = "http://www.w3.org/2000/svg";
    var W = MAP.width, H = MAP.height;

    // Контур страны занимает viewBox целиком, поэтому добавляем поля:
    // иначе Чукотка и нижние подписи упираются в край блока.
    var PAD_X = 38, PAD_Y = 32;
    var VIEW_BOX = (-PAD_X) + " " + (-PAD_Y) + " " + (W + PAD_X * 2) + " " + (H + PAD_Y * 2);

    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", VIEW_BOX);
    svg.setAttribute("class", "ru-map");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Карта географии поставок оборудования по России");

    // Овального свечения под страной больше нет — карта лежит прямо на фоне
    // секции. Перелив даёт сама заливка контура плюс бегущий блик ниже.
    var defs = document.createElementNS(ns, "defs");
    defs.innerHTML =
      '<linearGradient id="mapFill" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%"   stop-color="#1B5751"/>' +
        '<stop offset="100%" stop-color="#0E3033"/>' +
      '</linearGradient>';
    svg.appendChild(defs);

    // Контур страны. MAP.extra — четыре региона 2022 года: в Natural Earth
    // их нет ни в одной редакции, поэтому границы взяты из OpenStreetMap
    // и дописываются к силуэту. Без этого слой границ обрезался бы по
    // старому контуру и эти регионы просто не появились бы.
    var landD = MAP.path + (MAP.extra || "");

    // Заливка силуэта — без обводки: береговая линия рисуется отдельным
    // слоем ниже, иначе граница новых регионов получила бы толстую линию
    // берега вместо тонкой линии субъекта.
    var land = document.createElementNS(ns, "path");
    land.setAttribute("class", "land");
    land.setAttribute("d", landD);
    land.setAttribute("fill", "url(#mapFill)");
    svg.appendChild(land);

    // Береговая линия. Обрезается так, чтобы не заходить на новые регионы:
    // проходящий по их краю участок старой границы России стал внутренним
    // и должен выглядеть как обычная граница субъекта, а не как берег.
    // Область обрезки = весь кадр минус эти регионы, отсюда evenodd.
    if (MAP.extra) {
      var coastClip = document.createElementNS(ns, "clipPath");
      coastClip.setAttribute("id", "coastClip");
      var coastClipPath = document.createElementNS(ns, "path");
      coastClipPath.setAttribute("d",
        "M" + (-PAD_X) + " " + (-PAD_Y) +
        "H" + (W + PAD_X) + "V" + (H + PAD_Y) + "H" + (-PAD_X) + "Z" + MAP.extra);
      coastClipPath.setAttribute("clip-rule", "evenodd");
      coastClip.appendChild(coastClipPath);
      defs.appendChild(coastClip);
    }

    var coast = document.createElementNS(ns, "path");
    coast.setAttribute("class", "coast");
    coast.setAttribute("d", MAP.path);
    coast.setAttribute("fill", "none");
    if (MAP.extra) coast.setAttribute("clip-path", "url(#coastClip)");
    svg.appendChild(coast);

    // Границы субъектов — фоновая деталировка, поверх заливки страны.
    // Наборы данных генерализованы по-разному, поэтому линии регионов
    // местами вылезают за береговую линию; обрезаем их силуэтом страны.
    if (MAP.regions) {
      var clip = document.createElementNS(ns, "clipPath");
      clip.setAttribute("id", "landClip");
      var clipPath = document.createElementNS(ns, "path");
      clipPath.setAttribute("d", landD);
      clip.appendChild(clipPath);
      defs.appendChild(clip);

      var regions = document.createElementNS(ns, "path");
      regions.setAttribute("class", "regions");
      regions.setAttribute("d", MAP.regions + (MAP.extra || ""));
      regions.setAttribute("fill", "none");
      regions.setAttribute("clip-path", "url(#landClip)");
      svg.appendChild(regions);
    }

    // Точки городов. Карта только показывает географию и ни на что не реагирует:
    // ни дуг маршрутов, ни кликов, ни подсветки по карточкам регионов — поэтому
    // у SVG нет ни role="button", ни tabindex, а вся картинка описана
    // одним aria-label на корневом элементе.
    CITIES.forEach(function (c) {
      var p = projectCity(c);
      var g = document.createElementNS(ns, "g");
      g.setAttribute("class", "map-pin");
      g.setAttribute("aria-hidden", "true");

      var r = c.major ? 8 : 5.5;

      var halo = document.createElementNS(ns, "circle");
      halo.setAttribute("class", "halo");
      halo.setAttribute("cx", p[0]); halo.setAttribute("cy", p[1]);
      halo.setAttribute("r", r + 4);

      var core = document.createElementNS(ns, "circle");
      core.setAttribute("class", "core");
      core.setAttribute("cx", p[0]); core.setAttribute("cy", p[1]);
      core.setAttribute("r", r);

      g.appendChild(halo);
      g.appendChild(core);

      if (c.label) {
        var label = document.createElementNS(ns, "text");
        label.setAttribute("class", "label");
        label.setAttribute("x", p[0] + (c.dx || 0));
        label.setAttribute("y", p[1] + (c.dy || 0));
        label.setAttribute("text-anchor", c.anchor || "middle");
        label.textContent = c.name;
        g.appendChild(label);
      }

      svg.appendChild(g);
    });

    host.appendChild(svg);

    // Блик: копия силуэта поверх карты, по которой пробегает светлая полоса.
    // Именно landD, а не MAP.path: иначе полоса обходила бы новые регионы
    // стороной и они оставались бы тёмными, когда блик идёт по стране.
    if (!reduceMotion) {
      var sheen = document.createElementNS(ns, "svg");
      sheen.setAttribute("viewBox", VIEW_BOX);
      sheen.setAttribute("class", "ru-map-sheen");
      sheen.setAttribute("aria-hidden", "true");
      var sheenPath = document.createElementNS(ns, "path");
      sheenPath.setAttribute("d", landD);
      sheenPath.setAttribute("fill", "#8FF7E4");
      sheen.appendChild(sheenPath);
      host.appendChild(sheen);
    }

    // Атрибуция OpenStreetMap. Границы четырёх регионов взяты из OSM,
    // лицензия ODbL требует указания источника рядом с картой. Подпись
    // рисуется скриптом, а не лежит в HTML: так она не потеряется при
    // правке разметки и всегда сопровождает карту.
    if (MAP.extra) {
      var credit = document.createElement("p");
      credit.className = "map-credit";
      credit.innerHTML = '<a href="https://www.openstreetmap.org/copyright" ' +
                         'target="_blank" rel="noopener">© OpenStreetMap</a>';
      host.appendChild(credit);
    }
  }

  /* ====================================================== Сертификаты */

  function initCertificates() {
    var grid = document.querySelector("[data-cert-grid]");
    if (!grid) return;

    var source = window.LINMA_CERTIFICATES || [];
    if (!source.length) return;

    var wideGrid = document.querySelector("[data-cert-grid-wide]");

    // Сначала книжные, следом альбомные. Тот же порядок использует просмотрщик,
    // поэтому листание стрелками совпадает с тем, что видно на странице.
    var items = source.filter(function (c) { return !c.wide; })
                      .concat(source.filter(function (c) { return c.wide; }));

    var box = document.querySelector("[data-lightbox]");
    var stage = box && box.querySelector("[data-lightbox-img]");
    var title = box && box.querySelector("[data-lightbox-title]");
    var link = box && box.querySelector("[data-lightbox-pdf]");
    var counter = box && box.querySelector("[data-lightbox-counter]");
    var index = 0;
    var lastFocused = null;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    // Плитки
    items.forEach(function (c, i) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "card cert-card";
      card.setAttribute("aria-label", "Открыть сертификат: " + c.brand);

      var expired = c.ends && new Date(c.ends) < today;

      card.innerHTML =
        '<div class="cert-sheet' + (c.wide ? ' cert-sheet--wide' : '') + '">' +
          '<img src="' + asset("img/certificates/" + c.slug + "-thumb.jpg") + '" alt="Сертификат ' + c.brand + '" loading="lazy">' +
          '<span class="cert-zoom" aria-hidden="true">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M7 5v4M5 7h4M10.8 10.8 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
          '</span>' +
        '</div>' +
        '<div class="cert-body">' +
          '<span class="cert-type">' + c.type + '</span>' +
          '<span class="cert-brand">' + c.brand + '</span>' +
          '<span class="cert-meta">' + c.issuer + '</span>' +
          (expired ? '<span class="cert-expired">Срок истёк</span>' : '') +
        '</div>';

      card.addEventListener("click", function () { open(i); });
      (c.wide && wideGrid ? wideGrid : grid).appendChild(card);
    });

    if (!box) return;

    function show(i) {
      index = (i % items.length + items.length) % items.length;
      var c = items[index];
      stage.src = asset("img/certificates/" + c.slug + ".jpg");
      stage.alt = "Сертификат " + c.brand;
      title.innerHTML = c.brand + "<small>" + c.issuer + " · " + c.valid + "</small>";
      link.href = asset("docs/certificates/" + c.slug + ".pdf");
      counter.textContent = (index + 1) + " / " + items.length;
    }

    function open(i) {
      lastFocused = document.activeElement;
      show(i);
      box.classList.add("is-open");
      box.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
      var close = box.querySelector("[data-lightbox-close]");
      if (close) close.focus();
    }

    function close() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      // hidden ставим после анимации, иначе она не успеет проиграться
      setTimeout(function () {
        if (!box.classList.contains("is-open")) box.setAttribute("hidden", "");
      }, 320);
      if (lastFocused) lastFocused.focus();
    }

    box.querySelectorAll("[data-lightbox-close]").forEach(function (b) {
      b.addEventListener("click", close);
    });
    var prevB = box.querySelector("[data-lightbox-prev]");
    var nextB = box.querySelector("[data-lightbox-next]");
    if (prevB) prevB.addEventListener("click", function () { show(index - 1); });
    if (nextB) nextB.addEventListener("click", function () { show(index + 1); });

    // Клик по фону закрывает, клик по самому листу — нет
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("lightbox-stage")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape")     { e.preventDefault(); close(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); show(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    });

    var total = document.querySelector("[data-cert-total]");
    if (total) total.textContent = items.length;
  }

  /* ============================================================= Объекты */

  function initProjects() {
    var grid = document.querySelector("[data-projects-grid]");
    if (!grid) return;

    var items = window.LINMA_PROJECTS || [];
    if (!items.length) return;

    items.forEach(function (p, i) {
      var card = document.createElement("article");
      card.className = "card project-card";
      card.setAttribute("data-reveal", i ? String(i * 80) : "");

      var tags = (p.tags || []).map(function (t) {
        return '<span class="tag">' + t + '</span>';
      }).join("");

      card.innerHTML =
        // Кнопка, а не div: фотография открывается во весь экран, и такой
        // просмотр должен работать не только мышью, но и с клавиатуры.
        '<button type="button" class="project-media" data-project-open="' + i + '" ' +
                'aria-label="Открыть фотографию: ' + p.title + '">' +
          '<img src="' + asset("img/projects/" + p.img) + '" alt="' + p.title + '" loading="lazy">' +
          '<span class="project-zoom" aria-hidden="true">' +
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M7 5v4M5 7h4M10.8 10.8 14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' +
          '</span>' +
        '</button>' +
        '<div class="project-body">' +
          '<h3>' + p.title + '</h3>' +
          // Описание необязательно: сейчас карточки идут без него, поле
          // оставлено на случай, если по объекту понадобится пояснение.
          (p.text ? '<p class="text-muted" style="font-size:.9rem; margin:0;">' + p.text + '</p>' : '') +
          (tags ? '<div class="project-meta">' + tags + '</div>' : '') +
        '</div>';

      grid.appendChild(card);
    });

    // Карточка «И ещё более 100 объектов» стоит в разметке, переносим её в конец
    var more = grid.querySelector("[data-projects-more]");
    if (more) grid.appendChild(more);

    var open = initProjectLightbox(items);
    if (!open) return;

    grid.querySelectorAll("[data-project-open]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        open(parseInt(btn.getAttribute("data-project-open"), 10));
      });
    });
  }

  // Полноэкранный просмотр фотографий объектов. Разметка и оформление те же,
  // что у сертификатов; отличие в содержимом шапки — здесь нет ссылки на PDF.
  function initProjectLightbox(items) {
    var box = document.querySelector("[data-project-lightbox]");
    if (!box) return null;

    var stage = box.querySelector("[data-lightbox-img]");
    var title = box.querySelector("[data-lightbox-title]");
    var counter = box.querySelector("[data-lightbox-counter]");
    var index = 0;
    var lastFocused = null;

    function show(i) {
      index = (i % items.length + items.length) % items.length;
      var p = items[index];
      stage.src = asset("img/projects/" + p.img);
      stage.alt = p.title;
      title.textContent = p.title;
      counter.textContent = (index + 1) + " / " + items.length;
    }

    function open(i) {
      lastFocused = document.activeElement;
      show(i);
      box.classList.add("is-open");
      box.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
      var closeBtn = box.querySelector("[data-lightbox-close]");
      if (closeBtn) closeBtn.focus();
    }

    function close() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      // hidden ставим после анимации, иначе она не успеет проиграться
      setTimeout(function () {
        if (!box.classList.contains("is-open")) box.setAttribute("hidden", "");
      }, 320);
      if (lastFocused) lastFocused.focus();
    }

    box.querySelectorAll("[data-lightbox-close]").forEach(function (b) {
      b.addEventListener("click", close);
    });
    var prevB = box.querySelector("[data-lightbox-prev]");
    var nextB = box.querySelector("[data-lightbox-next]");
    if (prevB) prevB.addEventListener("click", function () { show(index - 1); });
    if (nextB) nextB.addEventListener("click", function () { show(index + 1); });

    // Клик по фону закрывает, клик по самому снимку — нет
    box.addEventListener("click", function (e) {
      if (e.target === box || e.target.classList.contains("lightbox-stage")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape")     { e.preventDefault(); close(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); show(index - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    });

    return open;
  }

  /* ============================================= Собственное производство */

  // Слайды строятся из production.js и попадают в общую карусель:
  // функция вызывается до initSliders, поэтому та видит готовую разметку.
  function initProduction() {
    var track = document.querySelector("[data-production-track]");
    if (!track) return;

    var items = window.LINMA_PRODUCTION || [];
    if (!items.length) return;

    items.forEach(function (p, i) {
      var slide = document.createElement("article");
      slide.className = "slide";

      // Характеристики — необязательное поле: у позиций без него
      // в карточке остаётся одно описание.
      var hasSpecs = !!(p.specs && p.specs.length);
      var specs = "";
      if (hasSpecs) {
        specs = '<ul class="slide-specs">';
        p.specs.forEach(function (s) { specs += '<li>' + s + '</li>'; });
        specs += '</ul>';
      }

      // Пометка о будущем описании нужна только там, где карточка пуста
      // целиком. Если характеристики есть, а описание не задано, позиция
      // раскрыта достаточно — заглушка выглядела бы недоделкой.
      var text = p.text
        ? '<p>' + p.text + '</p>'
        : (hasSpecs ? '' : '<p class="slide-pending">Описание будет добавлено</p>');

      // Руководство открывается в новой вкладке: карусель листается, и
      // уводить с неё посетителя, который смотрит позиции подряд, незачем.
      // rel="noopener" — обязателен при target="_blank".
      var manual = "";
      if (p.manual) {
        manual =
          '<a class="btn btn--ghost btn--sm slide-manual" ' +
             'href="' + asset("docs/manuals/" + p.manual) + '" ' +
             'target="_blank" rel="noopener">' +
            '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
              '<path d="M4 2.5h5l3 3v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
              '<path d="M9 2.5v3h3" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
            '</svg>' +
            'Открыть руководство' +
          '</a>';
      }

      slide.innerHTML =
        '<div class="slide-media slide-media--product">' +
          '<img src="' + asset("img/production/" + p.img) + '" alt="' + p.title + '" loading="lazy">' +
        '</div>' +
        '<div class="slide-body">' +
          '<span class="slide-num">' + (i < 9 ? "0" : "") + (i + 1) + '</span>' +
          '<h3>' + p.title + '</h3>' +
          text +
          specs +
          manual +
        '</div>';

      track.appendChild(slide);
    });
  }

  /* =========================================================== Карусель */

  function initSliders() {
    document.querySelectorAll("[data-slider]").forEach(function (root) {
      var track = root.querySelector(".slider-track");
      if (!track) return;

      var slides = Array.prototype.slice.call(track.children);
      if (slides.length < 2) return;

      var prevBtn = root.querySelector("[data-slider-prev]");
      var nextBtn = root.querySelector("[data-slider-next]");
      var dotsBox = root.querySelector("[data-slider-dots]");
      var counter = root.querySelector("[data-slider-counter]");
      var dots = [];
      var index = 0;

      var pad = function (n) { return (n < 10 ? "0" : "") + n; };

      if (dotsBox) {
        slides.forEach(function (slide, i) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "slider-dot";
          dot.setAttribute("aria-label", "Показать " + (i + 1) + " из " + slides.length);
          dot.addEventListener("click", function () { go(i); });
          dotsBox.appendChild(dot);
          dots.push(dot);
        });
      }

      function go(i) {
        index = (i % slides.length + slides.length) % slides.length;
        track.style.transform = "translateX(" + (-100 * index) + "%)";

        slides.forEach(function (slide, j) {
          var active = j === index;
          slide.classList.toggle("is-active", active);
          // Неактивные слайды скрыты от скринридеров: они за пределами кадра
          slide.setAttribute("aria-hidden", String(!active));
        });

        dots.forEach(function (dot, j) {
          dot.setAttribute("aria-current", String(j === index));
        });

        if (counter) counter.textContent = pad(index + 1) + " / " + pad(slides.length);
      }

      if (prevBtn) prevBtn.addEventListener("click", function () { go(index - 1); });
      if (nextBtn) nextBtn.addEventListener("click", function () { go(index + 1); });

      root.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft")  { e.preventDefault(); go(index - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
      });

      // Свайп и перетаскивание мышью
      var startX = null;
      root.addEventListener("pointerdown", function (e) { startX = e.clientX; }, { passive: true });
      root.addEventListener("pointerup", function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
      }, { passive: true });
      root.addEventListener("pointercancel", function () { startX = null; }, { passive: true });

      go(0);
    });
  }

  /* ================================================ Подсветка карточек */

  // Пятно света следует за курсором и «переходит» с карточки на карточку.
  // Один слушатель на документ + троттлинг через requestAnimationFrame,
  // чтобы не дёргать стили на каждое движение мыши.
  function initCardSpotlight() {
    if (reduceMotion) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var pending = null;
    var frame = null;
    var current = null;

    var apply = function () {
      frame = null;
      var p = pending;
      if (!p || !p.card) return;
      var rect = p.card.getBoundingClientRect();
      p.card.style.setProperty("--spot-x", (p.x - rect.left).toFixed(1) + "px");
      p.card.style.setProperty("--spot-y", (p.y - rect.top).toFixed(1) + "px");
    };

    var clear = function (card) {
      if (!card) return;
      card.style.removeProperty("--spot-x");
      card.style.removeProperty("--spot-y");
    };

    document.addEventListener("pointermove", function (e) {
      var card = e.target instanceof Element ? e.target.closest(".card") : null;

      if (card !== current) {
        clear(current);
        current = card;
      }
      if (!card) return;

      pending = { card: card, x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    }, { passive: true });

    // Курсор ушёл за пределы окна — гасим последнюю подсвеченную карточку
    document.addEventListener("pointerleave", function () {
      clear(current);
      current = null;
    }, { passive: true });
  }

  /* ============================================================== Форма */

  /* Окно «Заявка принята». Строчки под кнопкой посетители не замечают:
     она мелкая, а страница на неё не прокручивается. Разметку не держим
     в HTML — окно собирается скриптом при первой удачной отправке, так
     его не нужно дублировать на семи страницах с формой. */
  var successBox = null;
  var successLastFocus = null;

  function closeSuccess() {
    if (!successBox) return;
    successBox.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () {
      if (successBox && !successBox.classList.contains("is-open")) {
        successBox.setAttribute("hidden", "");
      }
    }, 320);
    if (successLastFocus) successLastFocus.focus();
  }

  function showSuccess() {
    if (!successBox) {
      successBox = document.createElement("div");
      successBox.className = "form-modal";
      successBox.setAttribute("role", "dialog");
      successBox.setAttribute("aria-modal", "true");
      successBox.setAttribute("aria-labelledby", "form-modal-title");
      successBox.setAttribute("hidden", "");
      successBox.innerHTML =
        '<div class="form-modal__card">' +
          '<span class="form-modal__icon" aria-hidden="true">' +
            '<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</span>' +
          '<h3 id="form-modal-title">Заявка принята</h3>' +
          '<p>Мы получили вашу заявку и свяжемся с вами в рабочее время — ' +
            'с понедельника по пятницу с 9:00 до 18:00.</p>' +
          '<button class="btn btn--block" type="button" data-form-modal-close>Хорошо</button>' +
        '</div>';
      document.body.appendChild(successBox);

      successBox.addEventListener("click", function (e) {
        if (e.target === successBox || e.target.closest("[data-form-modal-close]")) closeSuccess();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && successBox.classList.contains("is-open")) {
          e.preventDefault();
          closeSuccess();
        }
      });
    }

    successLastFocus = document.activeElement;
    successBox.removeAttribute("hidden");
    // Кадр задержки, иначе переход с hidden на is-open не анимируется.
    // Фокус — только следующим кадром: до пересчёта стилей окно ещё
    // visibility: hidden, а такой элемент focus() молча игнорирует.
    requestAnimationFrame(function () {
      successBox.classList.add("is-open");
      requestAnimationFrame(function () {
        var btn = successBox.querySelector("[data-form-modal-close]");
        if (btn) btn.focus();
      });
    });
    document.body.style.overflow = "hidden";
  }

  function initForms() {
    document.querySelectorAll("[data-request-form]").forEach(function (form) {
      var status = form.querySelector(".form-status");
      var submit = form.querySelector('button[type="submit"]');

      var setError = function (field, message) {
        var wrap = field.closest(".field") || field.closest(".consent");
        if (!wrap) return;
        wrap.classList.add("has-error");
        var box = wrap.querySelector(".field-error");
        if (box && message) box.textContent = message;
      };

      var clearErrors = function () {
        form.querySelectorAll(".has-error").forEach(function (el) { el.classList.remove("has-error"); });
      };

      form.addEventListener("input", function (e) {
        var wrap = e.target.closest(".field") || e.target.closest(".consent");
        if (wrap) wrap.classList.remove("has-error");
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearErrors();
        if (status) { status.textContent = ""; status.className = "form-status"; }

        var name = form.querySelector('[name="name"]');
        var email = form.querySelector('[name="email"]');
        var phone = form.querySelector('[name="phone"]');
        var consent = form.querySelector('[name="consent"]');
        var ok = true;

        if (!name.value.trim()) { setError(name, "Укажите, как к вам обращаться"); ok = false; }

        var hasEmail = email.value.trim().length > 0;
        var hasPhone = phone.value.trim().length > 0;

        if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
          setError(email, "Проверьте адрес электронной почты");
          ok = false;
        }
        if (hasPhone && phone.value.replace(/\D/g, "").length < 10) {
          setError(phone, "Проверьте номер телефона");
          ok = false;
        }
        if (!hasEmail && !hasPhone) {
          setError(phone, "Оставьте телефон или e-mail — иначе мы не сможем ответить");
          setError(email, "");
          ok = false;
        }
        if (consent && !consent.checked) { setError(consent, ""); ok = false; }

        if (!ok) {
          if (status) {
            status.textContent = "Проверьте отмеченные поля.";
            status.className = "form-status is-error";
          }
          var firstBad = form.querySelector(".has-error input, .has-error textarea");
          if (firstBad) firstBad.focus();
          return;
        }

        var payload = new FormData(form);
        payload.append("page", document.title);

        if (submit) { submit.disabled = true; submit.dataset.label = submit.textContent; submit.textContent = "Отправляем…"; }
        if (status) { status.textContent = "Отправляем заявку…"; status.className = "form-status"; }

        fetch(FORM_ENDPOINT, { method: "POST", body: payload })
          .then(function (res) {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json().catch(function () { return { ok: true }; });
          })
          .then(function (data) {
            if (data && data.ok === false) throw new Error(data.error || "Ошибка");
            form.reset();
            // Строка под кнопкой остаётся: она озвучивается скринридером
            // через aria-live и видна, если окно почему-то не открылось.
            if (status) {
              status.textContent = "Заявка отправлена. Мы свяжемся с вами в рабочее время — с понедельника по пятницу с 9:00 до 18:00.";
              status.className = "form-status is-ok";
            }
            showSuccess();
          })
          .catch(function () {
            if (status) {
              status.innerHTML = 'Не удалось отправить заявку. Напишите нам на <a href="mailto:info@linmatech.ru">info@linmatech.ru</a> или позвоните <a href="tel:+74952150652">+7 (495) 215-06-52</a>.';
              status.className = "form-status is-error";
            }
          })
          .finally(function () {
            if (submit) { submit.disabled = false; submit.textContent = submit.dataset.label || "Отправить заявку"; }
          });
      });
    });
  }

  /* ================================================ Оглавление документа */

  /* Подсвечивает в оглавлении раздел, который сейчас читают. Активным
     считается последний заголовок, ушедший выше линии в трети экрана, —
     так подсветка не прыгает вперёд на коротких разделах. */
  function initLegalToc() {
    var toc = document.querySelector("[data-legal-toc]");
    if (!toc) return;

    var links = Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']"));
    var sections = links
      .map(function (a) { return document.getElementById(a.hash.slice(1)); })
      .filter(Boolean);
    if (sections.length !== links.length) return;

    var current = -1;
    var ticking = false;

    function update() {
      ticking = false;

      var line = window.innerHeight * 0.33;
      var next = 0;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= line) next = i;
      }
      // У самого низа страницы последний раздел может так и не дойти до линии
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        next = sections.length - 1;
      }
      if (next === current) return;

      if (current > -1) links[current].removeAttribute("aria-current");
      links[next].setAttribute("aria-current", "true");
      current = next;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }

  /* ============================================================== Старт */

  function init() {
    initHeader();

    // Сначала строим весь контент, который рисуется скриптом...
    initBrandMarquee();
    initBrandsPage();
    initGroupBrands();
    initMap();
    initCertificates();
    initProjects();
    initProduction();
    initSliders();

    // ...и только потом навешиваем наблюдатели. Иначе элементы, созданные
    // после initReveal, никогда не получили бы класс is-visible и остались
    // бы прозрачными.
    initReveal();
    initCounters();
    initCardSpotlight();
    initForms();
    initLegalToc();

    // Contact Form 7 отправляет форму своими силами и сообщает об успехе
    // событием на document. Наш обработчик к её разметке не привязывается —
    // у неё нет data-request-form, — поэтому конфликта нет, а окно
    // «Заявка принята» показываем то же самое.
    document.addEventListener("wpcf7mailsent", function () { showSuccess(); });

    var year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
