# Soksambath's Portfolio

A wuxia-inspired, single-page portfolio for VR, data science and web projects. It pairs celestial and demonic artwork with a cinematic video opening and interactive weapon, dragon and phoenix effects.

Built with **Vite**, **vanilla JavaScript**, **CSS**, **Canvas 2D** and **Three.js**. This repository contains the portfolio website; the projects it showcases are linked to their separate repositories.

## Clone and run

Install **Node.js 24 LTS**, which includes npm. The version is also specified in `package.json`, `.node-version` and `.nvmrc`.

```sh
git clone https://github.com/ryuma2317/Portfolio.git
cd Portfolio
npm ci
npm run dev
```

Open the local URL printed in the terminal. Vite uses another available port if its default port is occupied.

On Windows PowerShell, use `npm.cmd` instead of `npm` if script-execution policy blocks `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run dev
```

No API keys, environment variables, database, Git LFS or separate backend are required. All website images, fonts, video and the phoenix model are included in `public/`.

`npm ci` installs the exact dependencies recorded in `package-lock.json`. Commit that lock file whenever intentionally updating dependencies.

## Production build

```sh
npm run build
npm run preview
```

The production site is generated in `dist/`. Open the preview URL printed in the terminal to inspect that build. `npm run preview` is for local verification; a hosting provider serves the built files in production.

## Hosting settings

For a static-site host or a Git-connected Vite deployment:

| Setting | Value |
| --- | --- |
| Repository | `ryuma2317/Portfolio` |
| Production branch | `main` |
| Root directory | Repository root |
| Framework | Vite |
| Node.js | `24.x` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variables | None required |

[Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite) describes importing a GitHub repository and deploying a Vite site. Use the provider's generated URL initially; a custom domain can be connected later.

The site currently expects to be served at the domain root because its media URLs use `/assets/` and `/fonts/`. Hosting it under a subdirectory such as `/Portfolio/` requires adjusting those URLs; a plain GitHub Pages project deployment is not configured here.

## What is included

- Full-width video opening with playback, replay, sound and full-screen controls.
- Alternating project chapters with repository links and inline descriptions.
- Transparent character artwork and an Effects switch.
- First-entry technique autoplay, followed by manual Play/Pause/Resume/Replay controls beneath each character.
- Canvas-based spear/dragon effects and a skinned 3D phoenix with animated wings.
- Responsive navigation and layouts, plus reduced-motion handling.
- Locally hosted fonts and their license notices.

Project previews that have not been supplied are labeled as pending. The character art is part of the portfolio's setting, not a project screenshot. Animation is an original browser presentation rather than footage from a drama.

## Source layout

```text
index.html               Page metadata and navigation
src/
  main.js                Page composition and navigation behavior
  hero.js                Opening video and hero controls
  project-data.js        Project names, descriptions, links and media
  projects.js            Project chapters, details, About and contact
  techniques.js          Technique playback and pause/resume lifecycle
  technique-motion.js    Spear/dragon choreography
  sword-motion.js        Sword formation and phoenix flight path
  dragon-renderer.js     Dragon rendering and dissolution
  phoenix-*.js           Phoenix rendering, rig and attitude
  chapter-transitions.js Scroll-driven chapter transitions
  styles/                Shared, responsive and scene styling
public/
  assets/                Images, video, project captures and 3D model
  fonts/                 Font files, stylesheet and license notices
```

Update `src/project-data.js` to change project content. Put new publishable screenshots or demos in `public/assets/projects/` and reference them with a URL such as `/assets/projects/example.webp`. Keep filename capitalization exact so paths also work on Linux hosts.

## What to commit

Commit the source, `public/`, `index.html`, `package.json`, `package-lock.json`, version files, `.gitignore` and this README. Image, video and model files inside `public/` are necessary parts of the site and should be committed with the code.

`.gitignore` excludes dependencies, `dist/`, environment files, editor files, local client briefs, private review tools/screenshots and the original working-reference files in the repository root. Those local files are not needed to build or run the published website. Originals remain on disk; the publishable versions are in `public/`.

From an existing checkout, publish your prepared changes with:

```sh
git add .
git diff --cached --stat
git commit -m "Prepare portfolio for deployment"
git push -u origin main
```

Before committing, review the staged file list. Do not force-push if Git reports that the remote branch has changes you do not have locally; fetch and reconcile those changes first.

For subsequent updates, pull the latest changes before editing, then commit and push. A Git-connected hosting provider can rebuild and deploy after each push.

## Asset notices

Keep the font license files in `public/fonts/` and the model provenance/license in `public/assets/phoenix-flight-license.txt` alongside the assets when sharing or deploying this project.
