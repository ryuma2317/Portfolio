import { projects } from './project-data.js';
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.4"/></svg>';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function mediaFrame(project, number) {
  const media = project.media;
  const terminal = media.format === 'terminal';
  let content;
  if (media.type === 'image') content = `<button class="media-open project-media-surface" type="button" data-media-project="${project.id}" aria-label="Expand ${escape(project.title)} screenshot"><img src="${escape(media.src)}" alt="${escape(media.alt)}" width="1440" height="900" loading="lazy"><span class="media-expand" aria-hidden="true">Expand ${arrow}</span></button>`;
  else if (media.type === 'video') content = `<div class="project-media-surface"><video controls playsinline preload="none" poster="${escape(media.poster)}" aria-label="${escape(project.title)} demo"><source src="${escape(media.src)}" type="${escape(media.mime || 'video/mp4')}"></video></div>`;
  else content = `<div class="project-media-surface media-pending"><span class="pending-language" aria-hidden="true">${escape(project.short)}</span><p>${escape(media.label)}</p><span class="pending-status">${terminal ? 'Terminal output capture to be added' : 'Preview to be added'}</span></div>`;
  return `<figure class="project-media project-visual"><div class="media-frame"><div class="media-chrome"><span>${String(number).padStart(2,'0')} / ${escape(project.category)}</span><span>${terminal ? 'Terminal output pending' : media.type === 'pending' ? 'Preview pending' : media.type === 'video' ? 'Demo video' : 'Project capture'}</span></div>${content}<div class="media-caption">${escape(media.caption)}</div><i class="frame-corner frame-corner--one" aria-hidden="true"></i><i class="frame-corner frame-corner--two" aria-hidden="true"></i></div></figure>`;
}

function chapter(project, index) {
  const divine = index % 2 === 0, realm = divine ? 'divine' : 'demonic', number = index + 1;
  const hasDetails = project.details.length > 0;
  const source = project.repo ? `<a class="project-source" href="${escape(project.repo)}" target="_blank" rel="noopener noreferrer">Source code ${arrow}</a>` : '<span class="source-pending">Repository to be added</span>';
  return `${index === 3 ? '<div id="craft" class="craft-anchor" aria-hidden="true"></div>' : ''}<article id="${project.id}" class="project project-${project.id}" data-project="${project.id}" data-realm="${realm}" data-technique="${divine ? 'spear' : 'sword'}" data-media-side="${divine ? 'left' : 'right'}" aria-labelledby="${project.id}-title">
    <div class="scene-scenery" aria-hidden="true"><div class="scene-mist"></div></div>
    <div class="section-shell scene-content">
      <div class="project-meta"><span class="project-index">${String(number).padStart(2,'0')} / ${escape(project.category)}</span><span class="project-status">${project.pending ? 'Project details pending' : escape(project.stack)}</span></div>
      <div class="project-body">
        ${mediaFrame(project, number)}
        <div class="project-story">
          <div class="project-copy">${project.kicker ? `<p class="project-kicker">${escape(project.kicker)}</p>` : ''}<h3 id="${project.id}-title">${escape(project.title)}</h3>${project.summary ? `<p class="project-description">${escape(project.summary)}</p>` : ''}<div class="project-actions">${hasDetails ? `<button class="project-disclosure" type="button" aria-expanded="false" aria-controls="${project.id}-detail">Project details <span class="disclosure-mark" aria-hidden="true">+</span></button>` : ''}${source}</div></div>
          <div class="guardian-stage"><img class="guardian ${divine ? 'divine-guardian' : 'demonic-guardian'}" src="/assets/${divine ? 'divine-cutout.png' : 'demonic-cutout.png'}" width="${divine ? 415 : 437}" height="${divine ? 625 : 569}" alt="${divine ? 'Divine spear wielder' : 'Demonic swordsman'} in the portfolio world" loading="lazy"></div>
          <div class="guardian-controls"><button type="button" class="scene-invoke" data-invoke-technique aria-label="Play technique for ${escape(project.title)}" aria-pressed="false"><svg data-technique-icon viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg><span data-technique-label>Play technique</span></button></div>
        </div>
        <div class="technique-stage" aria-hidden="true"></div>
      </div>
      ${hasDetails ? `<div class="project-detail" id="${project.id}-detail" hidden>${project.details.map(([heading,body]) => `<div><h4>${escape(heading)}</h4><p>${escape(body)}</p></div>`).join('')}</div>` : ''}
    </div>
  </article>${index < projects.length-1 ? `<div class="chapter-transition" data-from-realm="${realm}" data-to-realm="${divine ? 'demonic' : 'divine'}" aria-hidden="true"><div class="transition-mist transition-mist--one"></div><div class="transition-mist transition-mist--two"></div><div class="transition-glint"></div><span>${String(number).padStart(2,'0')} — ${String(number+1).padStart(2,'0')}</span></div>` : ''}`;
}

export function renderProjects() {
  return `<div class="chapter-transition opening-transition" aria-hidden="true"><div class="transition-mist transition-mist--one"></div><div class="transition-mist transition-mist--two"></div><div class="transition-glint"></div></div><section id="work" class="work-section" aria-labelledby="work-title"><header class="work-heading section-shell"><div><p class="project-kicker">THE PROJECT COLLECTION</p><h2 id="work-title">Selected work<span>01—${String(projects.length).padStart(2,'0')}</span></h2></div><nav class="work-directory" aria-label="Project chapters">${projects.map((project,index)=>`<a href="#${project.id}"><span>${String(index+1).padStart(2,'0')}</span>${escape(project.short)}</a>`).join('')}</nav></header>${projects.map(chapter).join('')}</section><div class="chapter-transition closing-transition" aria-hidden="true"><div class="transition-mist transition-mist--one"></div><div class="transition-mist transition-mist--two"></div><div class="transition-glint"></div></div>
  <div class="closing-world"><section id="about" class="about-section" aria-labelledby="about-title"><div class="section-shell about-layout"><figure class="about-portrait"><img src="/assets/avatar.webp" alt="Wuxia avatar between divine and demonic masks" width="1024" height="1536" loading="lazy"><figcaption>Wuxia avatar artwork</figcaption></figure><div class="about-copy"><p class="project-kicker">ABOUT</p><h2 id="about-title">CHHIM<br>SOKSAMBATH</h2><p>I build VR experiences, web applications and data-driven tools using Unity, React and Python, alongside C, C++ and Java.</p><p>My data science and machine learning projects focus on student-performance analytics, predictions and turning data into useful interfaces.</p><p>Next, I plan to explore automatic speech recognition (ASR), code-switching and context-switching.</p><p>Chinese wuxia is a personal influence behind this portfolio’s gods-and-demons setting.</p></div></div></section><section id="contact" class="contact-section" aria-labelledby="contact-title"><div class="section-shell contact-layout"><h2 id="contact-title">Find me on GitHub.</h2><a class="contact-github" href="https://github.com/ryuma2317" target="_blank" rel="noopener noreferrer">ryuma2317 ${arrow}</a><button class="share-portfolio" type="button">Share portfolio <span aria-hidden="true">↗</span></button><p class="share-status" aria-live="polite" role="status"></p></div></section></div>
  <dialog class="media-dialog" aria-labelledby="media-dialog-title"><div class="media-dialog-header"><h2 id="media-dialog-title">Project preview</h2><button type="button" class="media-close" aria-label="Close project preview">×</button></div><div class="media-dialog-content"></div><p class="media-dialog-caption"></p></dialog>`;
}

export function initProjects() {
  const controller = new AbortController(), { signal } = controller;
  document.querySelectorAll('button.project-disclosure').forEach(button=>button.addEventListener('click',()=>{
    const expanded=button.getAttribute('aria-expanded')==='true';
    button.setAttribute('aria-expanded',String(!expanded));document.getElementById(button.getAttribute('aria-controls')).hidden=expanded;
    button.closest('.project').classList.toggle('is-expanded',!expanded);
  },{signal}));
  const viewer=document.querySelector('.media-dialog');let opener;
  document.querySelectorAll('.media-open').forEach(button=>button.addEventListener('click',()=>{
    const project=projects.find(project=>project.id===button.dataset.mediaProject);if(!project)return;
    opener=button;viewer.querySelector('h2').textContent=project.title;
    const image=new Image();image.src=project.media.src;image.alt=project.media.alt;
    viewer.querySelector('.media-dialog-content').replaceChildren(image);
    viewer.querySelector('.media-dialog-caption').textContent=project.media.caption;
    viewer.showModal();document.body.classList.add('media-view-open');
  },{signal}));
  viewer.querySelector('.media-close').addEventListener('click',()=>viewer.close(),{signal});
  viewer.addEventListener('click',event=>{if(event.target!==viewer)return;const b=viewer.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)viewer.close();},{signal});
  viewer.addEventListener('close',()=>{document.body.classList.remove('media-view-open');opener?.focus({preventScroll:true});},{signal});
  const entrance=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('chapter-entered');entrance.unobserve(entry.target);}}),{threshold:.12});
  document.querySelectorAll('.project').forEach(project=>entrance.observe(project));
  const crossings=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-crossing');crossings.unobserve(entry.target);}}),{threshold:.2});
  document.querySelectorAll('.chapter-transition').forEach(transition=>crossings.observe(transition));
  document.querySelector('button.share-portfolio')?.addEventListener('click',async()=>{
    const status=document.querySelector('.share-status');try{
      if(navigator.share)await navigator.share({title:document.title,url:location.href.split('#')[0]});
      else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href.split('#')[0]);status.textContent='Portfolio link copied.';}
      else status.textContent='Copy the address from your browser to share this portfolio.';
    }catch(error){if(error.name!=='AbortError')status.textContent='Copy the address from your browser to share this portfolio.';}
  },{signal});
  return()=>{controller.abort();entrance.disconnect();crossings.disconnect();};
}
