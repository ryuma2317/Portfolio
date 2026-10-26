/** Scroll choreography stays in document flow; no wheel or touch interception. */
export function initChapterTransitions() {
  const root = document.documentElement;
  const chapters = [...document.querySelectorAll('.project')];
  if (!chapters.length) return () => {};
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controller = new AbortController();
  const { signal } = controller;
  const screen = document.createElement('div');
  screen.className = 'realm-handoff-screen';
  screen.setAttribute('aria-hidden', 'true');
  screen.innerHTML = '<i class="realm-veil"></i><i class="realm-bloom"></i><i class="realm-cut"></i>';
  document.body.append(screen);
  let frame = 0;
  let enabled = false;
  let disposed = false;
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => 1 - Math.pow(1 - clamp(value), 3);
  const states = chapters.map(chapter => {
    const light = document.createElement('div');
    light.className = 'chapter-handoff-light';
    light.setAttribute('aria-hidden', 'true');
    light.innerHTML = '<i class="handoff-mantle"></i><i class="handoff-current"></i>';
    chapter.querySelector('.scene-scenery')?.append(light);
    return {
      chapter, light,
      media: chapter.querySelector('.project-media'),
      copy: chapter.querySelector('.project-copy'),
      guardian: chapter.querySelector('.guardian-stage'),
      direction: chapter.dataset.mediaSide === 'right' ? 1 : -1,
    };
  });
  root.classList.add('chapter-handoff-ready');

  const stage = (element, height, start = .98, finish = .43) => {
    if (!element) return 1;
    // Read layout coordinates, excluding our own transforms. Reading the
    // transformed bounds here would feed yesterday's pose into today's pose.
    let top = -window.scrollY;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return ease((height * start - top) / (height * (start - finish)));
  };
  function render() {
    frame = 0;
    if (!enabled || disposed) return;
    const height = window.innerHeight;
    const compact = window.innerWidth < 760;
    let nearestBoundary = null;
    let nearestDistance = Infinity;
    states.forEach(({ chapter, media, copy, guardian, direction }) => {
      const rect = chapter.getBoundingClientRect();
      const distance = Math.abs(rect.top - height * .5);
      if (distance < nearestDistance && rect.top > height * .2 && rect.top < height * .8) {
        nearestBoundary = { chapter, top: rect.top, direction };
        nearestDistance = distance;
      }
      // Technique geometry is cached at invocation. Retain the exact entry pose
      // while the attack is running instead of moving its frame/character anchors.
      if (chapter.dataset.techniqueActive === 'true') return;
      const visible = rect.top < height * 1.15 && rect.bottom > -height * .2;
      chapter.toggleAttribute('data-chapter-active', visible);
      if (!visible) return;
      const mediaProgress = stage(media, height, .99, compact ? .51 : .38);
      const copyProgress = stage(copy, height, .96, .56);
      const guardianProgress = stage(guardian, height, 1.02, .46);
      const crossing = clamp((height * .96 - rect.top) / (height * .82));
      const pulse = Math.pow(Math.sin(crossing * Math.PI), 1.5);
      const motion = compact ? .62 : 1;
      const values = {
        '--handoff-media-x': `${(1 - mediaProgress) * direction * 100 * motion}px`,
        '--handoff-media-y': `${(1 - mediaProgress) * 52 * motion}px`,
        '--handoff-media-scale': .9 + mediaProgress * .1,
        '--handoff-media-turn': `${(1 - mediaProgress) * direction * -8}deg`,
        '--handoff-media-opacity': .55 + mediaProgress * .45,
        '--handoff-copy-x': `${(1 - copyProgress) * direction * -26 * motion}px`,
        '--handoff-copy-y': `${(1 - copyProgress) * 18 * motion}px`,
        '--handoff-copy-opacity': .65 + copyProgress * .35,
        '--handoff-guardian-y': `${(1 - guardianProgress) * 39 * motion}px`,
        '--handoff-guardian-scale': 1.065 - guardianProgress * .065,
        '--handoff-guardian-opacity': .4 + guardianProgress * .6,
        '--handoff-sheen': Math.sin(mediaProgress * Math.PI) * .64,
        '--handoff-sheen-x': `${-120 + mediaProgress * 260}%`,
        '--handoff-light': pulse * .85,
        '--handoff-current-x': `${(-55 + crossing * 110) * direction}%`,
        '--handoff-current-y': `${30 - crossing * 85}px`,
        '--handoff-mantle-x': `${(1 - crossing) * direction * -25}%`,
      };
      Object.entries(values).forEach(([key, value]) => chapter.style.setProperty(key, value));
    });
    if (nearestBoundary) {
      const { chapter, top, direction } = nearestBoundary;
      const progress = clamp((height * .8 - top) / (height * .6));
      screen.dataset.realm = chapter.dataset.realm;
      screen.style.setProperty('--realm-pass-opacity', Math.pow(Math.sin(progress * Math.PI), 2).toFixed(4));
      screen.style.setProperty('--realm-pass-x', `${(progress - .5) * direction * 45}%`);
      screen.style.setProperty('--realm-pass-y', `${(.5 - progress) * height * .6}px`);
      screen.style.setProperty('--realm-pass-angle', `${direction * 16}deg`);
    } else screen.style.setProperty('--realm-pass-opacity', '0');
  }
  function schedule() {
    if (enabled && !frame && !disposed) frame = requestAnimationFrame(render);
  }
  function sync() {
    enabled = !reduced.matches && root.dataset.magic !== 'off';
    root.classList.toggle('has-chapter-handoffs', enabled);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (enabled) render();
    else states.forEach(({ chapter }) => chapter.removeAttribute('data-chapter-active'));
  }
  window.addEventListener('scroll', schedule, { passive: true, signal });
  window.addEventListener('resize', schedule, { passive: true, signal });
  window.addEventListener('pageshow', schedule, { signal });
  document.addEventListener('visibilitychange', schedule, { signal });
  reduced.addEventListener('change', sync, { signal });
  const settings = new MutationObserver(sync);
  settings.observe(root, { attributes: true, attributeFilter: ['data-magic'] });
  const activity = new MutationObserver(schedule);
  chapters.forEach(chapter => activity.observe(chapter, { attributes: true, attributeFilter: ['data-technique-active'] }));
  const sizing = new ResizeObserver(schedule);
  chapters.forEach(chapter => sizing.observe(chapter));
  sync();
  return () => {
    disposed = true;
    controller.abort();
    settings.disconnect(); activity.disconnect(); sizing.disconnect();
    if (frame) cancelAnimationFrame(frame);
    root.classList.remove('chapter-handoff-ready', 'has-chapter-handoffs');
    screen.remove();
    states.forEach(({ chapter, light }) => {
      light.remove();
      chapter.removeAttribute('data-chapter-active');
      [...chapter.style].filter(key => key.startsWith('--handoff-')).forEach(key => chapter.style.removeProperty(key));
    });
  };
}
