import './styles/base.css';
import './styles/hero.css';
import './styles/projects.css';
import './styles/world.css';
import './styles/app.css';
import './styles/chapter-transitions.css';
import { renderHero, initHero } from './hero.js';
import { renderProjects, initProjects } from './projects.js';
import { initTechniques as initMagic } from './techniques.js';
import { initChapterTransitions } from './chapter-transitions.js';

document.querySelector('#app').innerHTML = renderHero() + renderProjects();
initHero();
initProjects();
initMagic();
initChapterTransitions();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reducedMotion.matches) document.documentElement.classList.add('has-motion');
const reveals = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach((element) => reveals.observe(element));

const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  navigation.classList.remove('is-open');
  header.classList.remove('is-menu-open');
}
menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', isOpen);
  header.classList.toggle('is-menu-open', isOpen);
});
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('scroll', () => header.classList.toggle('is-scrolled', window.scrollY > 24), { passive: true });
header.classList.toggle('is-scrolled', window.scrollY > 24);

const filmDialog = document.querySelector('.film-dialog');
const film = document.querySelector('.prologue-film');
film.muted = true;
let filmOpener;
document.querySelectorAll('[data-open-film]').forEach((button) => {
  button.addEventListener('click', () => {
    filmOpener = button;
    filmDialog.showModal();
    document.body.classList.add('film-open');
    film.play().catch(() => {});
  });
});
document.querySelector('.film-close').addEventListener('click', () => filmDialog.close());
filmDialog.addEventListener('click', (event) => {
  if (event.target !== filmDialog) return;
  const bounds = filmDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) filmDialog.close();
});
filmDialog.addEventListener('close', () => {
  film.pause();
  document.body.classList.remove('film-open');
  filmOpener?.focus();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});

const sections = document.querySelectorAll('#work, #craft, #about');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navigation.querySelectorAll('a').forEach((link) => {
      if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-15% 0px -65% 0px' });
sections.forEach((section) => sectionObserver.observe(section));
