'use strict';
(function () {
  var menu = document.querySelector('.menu-toggle');
  var nav = document.querySelector('#navigation');

  function setMenu(open) {
    if (!menu || !nav) return;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('open', open);
  }

  if (menu && nav) {
    menu.addEventListener('click', function () {
      setMenu(menu.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setMenu(false);
        menu.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('open') && !e.target.closest('.header')) setMenu(false);
    });
    window.addEventListener('pageshow', function () { setMenu(false); });
    window.matchMedia('(max-width:640px)').addEventListener('change', function (e) {
      if (!e.matches) setMenu(false);
    });
  }

  var filters = document.querySelectorAll('[data-filter]');
  var count = document.querySelector('#event-count');
  filters.forEach(function (button) {
    button.addEventListener('click', function () {
      var category = button.dataset.filter;
      var shown = 0;
      document.querySelectorAll('.portfolio-grid .event-card').forEach(function (card) {
        var show = category === 'All occasions' || card.dataset.category === category;
        card.hidden = !show;
        if (show) shown++;
      });
      filters.forEach(function (f) { f.setAttribute('aria-pressed', String(f === button)); });
      if (count) count.textContent = shown ? shown + ' occasion' + (shown === 1 ? '' : 's') + ' to explore' : 'No occasions in this category yet';
    });
  });
})();
