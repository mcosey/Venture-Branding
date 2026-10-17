const links = [...document.querySelectorAll('.sidebar nav a')];
function updateNavigation() {
  const profile = location.hash === '#business';
  for (const link of links) {
    const active = profile ? link.getAttribute('href') === '#business' : link.getAttribute('href') === '#';
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}
window.addEventListener('hashchange', updateNavigation);
updateNavigation();
