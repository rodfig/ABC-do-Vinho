/* ABC do Vinho — Chapter navigation */

(function () {
  const chapters = Array.from(document.querySelectorAll('.chapter'));
  const navLinks = Array.from(document.querySelectorAll('.chapter-nav a'));
  const prevBtn  = document.getElementById('ch-prev');
  const nextBtn  = document.getElementById('ch-next');
  const bar      = document.querySelector('.progress-bar');
  const content  = document.querySelector('.content');

  /* Mobile elements */
  const menuBtn  = document.getElementById('topbar-menu');
  const backdrop = document.getElementById('sidebar-backdrop');
  const mobPrev  = document.getElementById('mob-prev');
  const mobNext  = document.getElementById('mob-next');
  const mobCount = document.getElementById('mob-counter');

  if (!chapters.length) return;

  let current = 0;

  function closeSidebar() { document.body.classList.remove('sidebar-open'); }

  function goTo(index) {
    if (index < 0 || index >= chapters.length) return;

    chapters[current].classList.remove('active');
    navLinks[current]?.classList.remove('active');

    current = index;

    const ch = chapters[current];
    ch.classList.add('active');
    if (content) content.scrollTop = 0;
    navLinks[current]?.classList.add('active');
    navLinks[current]?.scrollIntoView({ block: 'nearest' });

    if (prevBtn)  prevBtn.disabled  = current === 0;
    if (nextBtn)  nextBtn.disabled  = current === chapters.length - 1;
    if (mobPrev)  mobPrev.disabled  = current === 0;
    if (mobNext)  mobNext.disabled  = current === chapters.length - 1;
    if (bar)      bar.style.width   = ((current + 1) / chapters.length * 100) + '%';
    if (mobCount) mobCount.textContent = (current + 1) + ' / ' + chapters.length;
  }

  /* Sidebar links */
  navLinks.forEach((link, i) => {
    link.addEventListener('click', e => {
      e.preventDefault();
      goTo(i);
      closeSidebar();
    });
  });

  /* Desktop arrows */
  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  /* Mobile bottom arrows */
  mobPrev?.addEventListener('click', () => goTo(current - 1));
  mobNext?.addEventListener('click', () => goTo(current + 1));

  /* Hamburger toggle */
  menuBtn?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  backdrop?.addEventListener('click', closeSidebar);

  /* Keyboard */
  document.addEventListener('keydown', e => {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) goTo(current + 1);
    if (['ArrowLeft',  'ArrowUp'  ].includes(e.key)) goTo(current - 1);
  });

  /* Swipe */
  let touchX = 0;
  content?.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  content?.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) dx < 0 ? goTo(current + 1) : goTo(current - 1);
  }, { passive: true });

  goTo(0);
})();
