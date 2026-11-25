const siteHeader = document.querySelector('.vb-site-header');
if (siteHeader) {
  const menuToggle = siteHeader.querySelector('.menu-toggle');
  const primaryNav = siteHeader.querySelector('nav');
  const closeMenu = () => {
    primaryNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };
  menuToggle.addEventListener('click', () => {
    menuToggle.setAttribute('aria-expanded', String(primaryNav.classList.toggle('open')));
  });
  primaryNav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && primaryNav.classList.contains('open')) {
      closeMenu();
      menuToggle.focus();
    }
  });

  const updateHeader = () => siteHeader.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', updateHeader, {passive:true});
  window.addEventListener('pageshow', updateHeader);
  updateHeader();
}
