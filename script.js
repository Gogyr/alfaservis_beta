const TELEGRAM_BOT_URL = 'https://t.me/alfaservis_help_bot';

/* Интерактив лендинга АльфаСервис: тема, меню, шапка, активный раздел, битые фото. */

(function () {
  // Ключ хранилища фиксирован, чтобы тема переживала перезагрузку страницы.
  var THEME_KEY = 'alfaservis-theme';

  // Ширина, с которой меню становится горизонтальным рядом ссылок.
  var DESKTOP_QUERY = '(min-width: 1024px)';

  /**
   * Читает сохранённую тему.
   * Любое другое значение и ошибка доступа к хранилищу дают тёмную тему.
   */
  function getSavedTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch (error) {
      /* Приватный режим может запретить чтение localStorage. */
    }
    return 'dark';
  }

  /**
   * Ставит тему на <html>, синхронизирует кнопку и цвет панели браузера.
   * Иконки солнца и луны переключает CSS по атрибуту data-theme.
   */
  function applyTheme(theme) {
    var root = document.documentElement;
    var toggle = document.getElementById('theme-toggle');
    var themeColor = document.querySelector('meta[name="theme-color"]');

    root.setAttribute('data-theme', theme);

    if (toggle) {
      toggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    }

    if (themeColor) {
      themeColor.setAttribute('content', theme === 'light' ? '#F8FAFC' : '#0B0D10');
    }
  }

  /**
   * Прячет сломанный файл: остаётся металлический фон контейнера.
   * Срабатывает и для уже завершившейся с ошибкой загрузки.
   */
  function markMissingImage(img) {
    img.classList.add('is-missing');
  }

  /**
   * Переключатель темы. Состояние пишется в localStorage после каждого клика.
   */
  function initTheme() {
    var toggle = document.getElementById('theme-toggle');
    var current = getSavedTheme();

    applyTheme(current);

    if (!toggle) {
      return;
    }

    toggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);

      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        /* Запись недоступна — тема всё равно сменится до закрытия вкладки. */
      }
    });
  }

  /**
   * Мобильное меню: класс на шапке, aria-expanded и запрет прокрутки фона.
   */
  function initMenu() {
    var header = document.querySelector('.site-header');
    var toggle = document.getElementById('menu-toggle');
    var nav = document.getElementById('site-nav');

    if (!header || !toggle || !nav) {
      return;
    }

    function setMenu(open) {
      header.classList.toggle('is-open', open);
      document.body.classList.toggle('is-menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    }

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      setMenu(!open);
    });

    /* Якорь внутри меню закрывает шторку, чтобы не перекрывать нужный раздел. */
    nav.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (link) {
        setMenu(false);
      }
    });

    /* Клик мимо шапки закрывает меню. Кнопка и ссылки находятся внутри шапки. */
    document.addEventListener('click', function (event) {
      if (!header.classList.contains('is-open')) {
        return;
      }
      if (header.contains(event.target)) {
        return;
      }
      setMenu(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setMenu(false);
      }
    });

    /* На десктопе шторка не нужна: ряд ссылок и так виден, прокрутку возвращаем. */
    var desktopQuery = window.matchMedia(DESKTOP_QUERY);
    function closeOnDesktop(event) {
      if (event.matches) {
        setMenu(false);
      }
    }

    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', closeOnDesktop);
    } else if (typeof desktopQuery.addListener === 'function') {
      desktopQuery.addListener(closeOnDesktop);
    }
  }

  /**
   * После 20px прокрутки шапка становится плотнее: фон, размытие и нижняя граница.
   */
  function initHeaderScroll() {
    var header = document.querySelector('.site-header');
    if (!header) {
      return;
    }

    function syncHeader() {
      header.classList.toggle('is-scrolled', window.scrollY > 20);
    }

    syncHeader();
    window.addEventListener('scroll', syncHeader, { passive: true });
  }

  /**
   * Подсвечивает ссылку раздела, который сейчас в верхней половине экрана.
   * Следим только за секциями, на которые есть пункт меню.
   */
  function initActiveSection() {
    var nav = document.getElementById('site-nav');
    if (!nav || !('IntersectionObserver' in window)) {
      return;
    }

    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    var sections = links.map(function (link) {
      return document.querySelector(link.getAttribute('href'));
    }).filter(function (section) {
      return section !== null;
    });

    if (sections.length === 0) {
      return;
    }

    var visibleIds = [];

    function setActive(id) {
      links.forEach(function (link) {
        var match = link.getAttribute('href') === '#' + id;
        link.classList.toggle('is-active', match);
        if (match) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.id;
        var index = visibleIds.indexOf(id);

        if (entry.isIntersecting && index === -1) {
          visibleIds.push(id);
        }

        if (!entry.isIntersecting && index !== -1) {
          visibleIds.splice(index, 1);
        }
      });

      /* Из нескольких видимых берём ту, что раньше в документе — она выше на странице. */
      var current = sections.find(function (section) {
        return visibleIds.indexOf(section.id) !== -1;
      });

      setActive(current ? current.id : '');
    }, {
      root: null,
      rootMargin: '-20% 0px -55% 0px',
      threshold: 0.01
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  /**
   * Общие кнопки ведут на бота без параметра.
   * Если в data-booking-link есть код услуги, к ссылке добавляется ?start=код.
   */
  function initBookingLinks() {
    var links = document.querySelectorAll('[data-booking-link]');

    Array.prototype.forEach.call(links, function (link) {
      var payload = link.getAttribute('data-booking-link');
      var href = TELEGRAM_BOT_URL;

      if (payload) {
        href = TELEGRAM_BOT_URL + '?start=' + encodeURIComponent(payload);
      }

      link.setAttribute('href', href);
    });
  }

  /**
   * Приветствие помощника через 3,5 с.
   * Крестик прячет пузырь до конца вкладки, круг при этом остаётся.
   */
  function initBotWidget() {
    var bubble = document.getElementById('bot-bubble');
    var closeButton = document.getElementById('bot-bubble-close');
    var dismissed = false;

    if (!bubble || !closeButton) {
      return;
    }

    try {
      dismissed = sessionStorage.getItem('alfaservis-bot-dismissed') === '1';
    } catch (error) {
      /* sessionStorage может быть недоступен — тогда подсказка просто покажется. */
    }

    function hideBubble() {
      bubble.classList.remove('is-visible');
      bubble.hidden = true;

      try {
        sessionStorage.setItem('alfaservis-bot-dismissed', '1');
      } catch (error) {
        /* Не удалось запомнить закрытие — в этой вкладке пузырь уже скрыт. */
      }
    }

    closeButton.addEventListener('click', hideBubble);

    if (dismissed) {
      return;
    }

    window.setTimeout(function () {
      bubble.hidden = false;
      /* Два кадра: сначала элемент появляется с opacity 0, затем включается переход. */
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          bubble.classList.add('is-visible');
        });
      });
    }, 3500);
  }

  /**
   * Локальные фото из images/. Пока файлов нет, браузерный «битый» значок скрывается.
   */
  function initMissingImages() {
    var images = document.querySelectorAll('img[src^="images/"]');

    Array.prototype.forEach.call(images, function (img) {
      if (img.complete && img.naturalWidth === 0) {
        markMissingImage(img);
      }

      img.addEventListener('error', function () {
        markMissingImage(img);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initBookingLinks();
    initBotWidget();
    initTheme();
    initMenu();
    initHeaderScroll();
    initActiveSection();
    initMissingImages();
  });
})();
