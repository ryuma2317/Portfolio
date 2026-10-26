const icons = {
  play: '<path d="m9 5 11 7-11 7Z" fill="currentColor"/>',
  pause: '<path d="M7 5h3v14H7zm7 0h3v14h-3z" fill="currentColor"/>',
  replay: '<path d="M4 11a8 8 0 1 1 1.8 6.1M4 5v6h6"/>',
  sound: '<path d="m11 5-5 4H3v6h3l5 4V5Zm4 4a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

export function renderHero() {
  return `<section class="hero" id="top" aria-labelledby="hero-title" data-film-state="loading">
    <div class="hero__cinema section-shell">
      <div class="hero__film-frame">
        <video class="hero__video" data-hero-video autoplay muted playsinline preload="auto" poster="/assets/arena.webp" width="1280" height="720" aria-label="Wuxia portfolio prologue" aria-describedby="hero-film-description"><source src="/assets/intro.mp4" type="video/mp4">Your browser does not support this video.</video>
        <p class="sr-only" id="hero-film-description">A ten-second fantasy scene: a celestial spear wielder and a demonic swordsman exchange energy strikes in a mountain arena, then welcome you to the portfolio. Full-screen playback is available from the film controls.</p>
        <button class="hero__film-start" data-hero-film-start type="button" hidden>${icon('play')}<span>Play the prologue</span></button>
        <div class="hero__film-progress" aria-hidden="true"><span></span></div>
      </div></div>
      <div class="hero__film-toolbar" role="group" aria-label="Prologue playback controls">
        <div class="hero__film-controls"><button type="button" class="hero__media-button" data-hero-film-toggle>${icon('play')}<span>Play film</span></button><button type="button" class="hero__media-button" data-hero-film-replay>${icon('replay')}<span>Replay</span></button><button type="button" class="hero__media-button" data-hero-film-sound aria-pressed="false" aria-label="Turn film sound on">${icon('sound')}<span>Sound off</span></button></div>
        <div class="hero__film-meta"><time data-hero-film-time>0:00 / 0:10</time><button type="button" class="hero__media-button hero__expand" data-open-film aria-label="Open the full-screen prologue">${icon('expand')}<span>Full screen</span></button></div>
      </div><p class="hero__film-status sr-only" aria-live="polite"></p>
    <div class="hero__identity section-shell"><div class="hero__identity-heading"><p class="hero__identity-label">DEVELOPER PORTFOLIO</p><h1 id="hero-title"><span>Chhim</span> Soksambath</h1><p class="hero__discipline">VR, data science <em>&amp;</em> web.</p></div></div>
    <div class="hero__footer section-shell"><a class="button hero__primary" href="#work">Explore my work <span aria-hidden="true">↗</span></a></div>
  </section>`;
}

export function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return () => {};
  const video = hero.querySelector('[data-hero-video]');
  const toggle = hero.querySelector('[data-hero-film-toggle]');
  const start = hero.querySelector('[data-hero-film-start]');
  const replay = hero.querySelector('[data-hero-film-replay]');
  const sound = hero.querySelector('[data-hero-film-sound]');
  const time = hero.querySelector('[data-hero-film-time]');
  const status = hero.querySelector('.hero__film-status');
  const progress = hero.querySelector('.hero__film-progress > span');
  const dialog = document.querySelector('.film-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const removers = [];
  let inView = true, userPaused = false, optedIn = false, resumeWhenVisible = false, destroyed = false, attempt = 0;
  const listen = (target, type, handler) => { target?.addEventListener(type, handler); removers.push(() => target?.removeEventListener(type, handler)); };
  const setState = (state) => {
    hero.dataset.filmState = state;
    const playing = state === 'playing', ended = state === 'ended';
    toggle.innerHTML = `${icon(playing ? 'pause' : ended ? 'replay' : 'play')}<span>${playing ? 'Pause film' : ended ? 'Replay film' : 'Play film'}</span>`;
    toggle.setAttribute('aria-label', playing ? 'Pause the prologue' : ended ? 'Replay the prologue' : 'Play the prologue');
    start.hidden = !['blocked', 'ready'].includes(state);
    start.querySelector('span').textContent = ended ? 'Replay the prologue' : state === 'paused' ? 'Continue the prologue' : 'Play the prologue';
  };
  const formatTime = (value) => `0:${String(Math.floor(Number.isFinite(value) ? value : 0)).padStart(2, '0')}`;
  const updateTime = () => { const duration = Number.isFinite(video.duration) ? video.duration : 10; time.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`; progress.style.width = `${Math.min(100, video.currentTime / duration * 100)}%`; };
  const play = async (explicit = false) => {
    if (destroyed || video.error) return;
    if (explicit) { optedIn = true; userPaused = false; }
    const thisAttempt = ++attempt;
    try { if (video.ended) video.currentTime = 0; await video.play(); }
    catch (error) { if (destroyed || thisAttempt !== attempt || error.name === 'AbortError') return; if (!document.hidden && inView && !dialog?.open) { setState('blocked'); status.textContent = 'Select Play film to start the prologue.'; } }
  };
  const togglePlay = () => { if (video.paused || video.ended) play(true); else { userPaused = true; resumeWhenVisible = false; attempt++; video.pause(); } };
  const syncVisibility = () => {
    if (document.hidden || !inView || dialog?.open) { if (!video.paused && !video.ended) { resumeWhenVisible = !userPaused; attempt++; video.pause(); } }
    else if (resumeWhenVisible && !userPaused && (!reducedMotion.matches || optedIn)) { resumeWhenVisible = false; play(); }
  };
  listen(toggle, 'click', togglePlay);
  listen(start, 'click', () => play(true));
  listen(replay, 'click', () => { if (!video.error) { video.currentTime = 0; updateTime(); play(true); } });
  listen(sound, 'click', () => { video.muted = !video.muted; });
  listen(video, 'volumechange', () => { sound.setAttribute('aria-pressed', String(!video.muted)); sound.setAttribute('aria-label', video.muted ? 'Turn film sound on' : 'Turn film sound off'); sound.querySelector('span').textContent = video.muted ? 'Sound off' : 'Sound on'; });
  listen(video, 'playing', () => { if (document.hidden || !inView || dialog?.open) { syncVisibility(); return; } setState('playing'); status.textContent = ''; });
  listen(video, 'pause', () => { if (!video.ended) setState('paused'); });
  listen(video, 'ended', () => { resumeWhenVisible = false; setState('ended'); updateTime(); status.textContent = 'The prologue has ended. Explore the work below or replay the film.'; });
  listen(video, 'timeupdate', updateTime);
  listen(video, 'loadedmetadata', updateTime);
  listen(video, 'error', () => { setState('error'); status.classList.remove('sr-only'); status.textContent = 'The film is unavailable right now. My work is ready to explore below.'; toggle.disabled = replay.disabled = sound.disabled = true; });
  listen(document, 'visibilitychange', syncVisibility);
  listen(dialog, 'close', syncVisibility);
  hero.querySelectorAll('[data-open-film]').forEach((button) => listen(button, 'click', () => { if (!video.paused && !video.ended) { resumeWhenVisible = !userPaused; attempt++; video.pause(); } }));
  listen(reducedMotion, 'change', () => { if (reducedMotion.matches) { resumeWhenVisible = optedIn = false; video.removeAttribute('autoplay'); video.pause(); setState(video.currentTime > 0 ? 'paused' : 'ready'); } });
  const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; syncVisibility(); }, { threshold: 0.12 });
  observer.observe(video);
  document.documentElement.dataset.realm = 'balanced';
  video.muted = video.defaultMuted = true;
  if (reducedMotion.matches) { video.autoplay = false; video.pause(); setState('ready'); }
  else { video.autoplay = true; play(); }
  return () => { destroyed = true; attempt++; observer.disconnect(); removers.forEach((remove) => remove()); video.pause(); };
}
