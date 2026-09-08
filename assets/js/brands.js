/* ==========================================================================
   БРЕНДЫ-ПАРТНЁРЫ — единственный файл, который нужно править,
   чтобы обновить список брендов на всём сайте.

   Он питает три места сразу: бегущую ленту на главной, сетку с поиском
   и фильтром на brands.html и блок «Бренды направления» на страницах
   оборудования. Трогать HTML не нужно.

   Как добавить бренд:
     1. Положите логотип в assets/img/brands/ — PNG 360x140, прозрачный фон,
        белая графика. Все файлы одного размера, поэтому логотипы выглядят
        одинаково в любой плитке. Как такой файл получить из цветного
        исходника — подробно в README, раздел «Логотипы брендов-партнёров».
     2. Добавьте объект в массив ниже.

   Поля:
     name   — название бренда. Показывается в подписи и в поиске.
     logo   — путь к файлу. Если оставить "", в плитке выводится название
              текстом — сайт не ломается, пока логотипа ещё нет.
     groups — направления: "ventilation" | "conditioning" | "heating" | "smoke".
              Можно указать несколько: ["ventilation", "smoke"].
     url    — сайт производителя (необязательно). Если задан, плитка станет
              ссылкой.

   Порядок в массиве = порядок на сайте. Ключевых партнёров ставьте выше.
   ========================================================================== */

window.LINMA_BRANDS = [
  { name: "Daikin",        logo: "assets/img/brands/daikin.png",      groups: ["conditioning"] },
  { name: "Midea",         logo: "assets/img/brands/midea.png",       groups: ["conditioning"] },
  { name: "Kentatsu",      logo: "assets/img/brands/kentatsu.png",    groups: ["conditioning"] },
  { name: "Даичи",         logo: "assets/img/brands/daichi.png",      groups: ["conditioning"] },
  { name: "Energolux",     logo: "assets/img/brands/energolux.png",   groups: ["conditioning"] },
  { name: "FeRRUM",        logo: "assets/img/brands/ferrum.png",      groups: ["conditioning"] },
  { name: "HTS",           logo: "assets/img/brands/hts.png",         groups: ["conditioning"] },
  { name: "Refcool",       logo: "assets/img/brands/refcool.png",     groups: ["conditioning"] },

  { name: "VENTZ",         logo: "assets/img/brands/ventz.png",       groups: ["ventilation", "smoke"] },
  { name: "NED",           logo: "assets/img/brands/ned.png",         groups: ["ventilation", "smoke"] },
  { name: "WHEIL",         logo: "assets/img/brands/wheil.png",       groups: ["ventilation", "smoke"] },
  { name: "Аэро Групп",    logo: "assets/img/brands/aerogroup.png",   groups: ["ventilation"] },
  { name: "Вега",          logo: "assets/img/brands/vega.png",        groups: ["ventilation"] },
  { name: "Инновент",      logo: "assets/img/brands/innovent.png",    groups: ["ventilation", "smoke"] },
  { name: "Нормал Вент",   logo: "assets/img/brands/normalvent.png",  groups: ["ventilation", "smoke"] },
  { name: "СовПлим",       logo: "assets/img/brands/sovplim.png",     groups: ["ventilation"] },
  { name: "ЯЛКА",          logo: "assets/img/brands/yalka.png",       groups: ["ventilation"] },

  { name: "Тепломаш",      logo: "assets/img/brands/teplomash.png",   groups: ["heating"] },
  { name: "KALASHNIKOV",   logo: "assets/img/brands/kalashnikov.png", groups: ["heating"] },
  { name: "ГРЕЕРС",        logo: "assets/img/brands/greers.png",      groups: ["heating"] },
  { name: "ПК Технология", logo: "assets/img/brands/pk-tech.png",     groups: ["heating"] }
];

/* Подписи направлений — используются в фильтре на странице «Бренды». */
window.LINMA_BRAND_GROUPS = [
  { id: "ventilation",  label: "Вентиляция" },
  { id: "conditioning", label: "Кондиционирование" },
  { id: "heating",      label: "Отопление" },
  { id: "smoke",        label: "Дымоудаление" }
];
