# Jay Fernando — personal site (v2, multi-page)

Plain HTML, CSS, and vanilla JS. No Ruby, no Jekyll, no npm, no build
step. Six pages, one shared sidebar, one shared stylesheet.

## The Program (site structure)

| Page | Label | Content |
|---|---|---|
| `index.html` | Prologue | Hero + About |
| `resume.html` | Act I | Résumé |
| `reading.html` | Intermission | Featured book + shelves |
| `technical.html` | Act II | Technical projects |
| `theatre.html` | Act III | Writing / Performing / Producing / Dramaturgy + BarePage carousel |
| `blog.html` | Encore | WordPress blog feed |

Each page pulls in the same sidebar from `partials/nav.html` via
JavaScript (`js/main.js`), so you only ever edit the nav in **one
place** and it updates on every page.

## Running it locally

```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`. A real server is required (not
just double-clicking `index.html`) because the nav, bookshelf, and
blog feed all load data via `fetch()`, which browsers block on
`file://` URLs.

## What changed from v1 → v2

- **Fixed:** the reading-list review popup was getting hidden behind
  the mobile menu bar, and could run off the top of the screen near
  the top of a page. Fixed two ways: the popup now renders above the
  nav in stacking order, and it automatically flips to appear
  *below* the book spine if there isn't enough room above it.
- **Multi-page:** each section is now its own page instead of one
  long scroll, linked from the sidebar and from "next" links at the
  bottom of each page.
- **Reading page:** now shows one large "currently reading" book up
  top, with the rest of your books organized into shelf rows below.
- **Theatre page:** added Producing and Dramaturgy alongside Writing
  and Performing, plus a dedicated BarePage ensemble section with a
  photo carousel (swipe on mobile, arrow keys or the ‹ › buttons on
  desktop).
- **Sidebar labels:** unified around a theatrical program structure
  — Prologue, Act I, Intermission, Act II, Act III, Encore — instead
  of mixing two different labeling systems.
- **Color:** added a deep forest green (`--forest`), used
  specifically for the Reading/Intermission page, so each "act" of
  the site has its own accent color (résumé = marquee red, reading =
  forest green, technical = sage, theatre = marquee red, blog =
  brass) while staying tied together by the same type and layout
  system.

## What to customize

**Nav / site title** — edit `partials/nav.html`. This one file
controls the sidebar on every page.

**Photos** — drop files into `assets/images/` and swap the
placeholder `div`s (`.portrait-frame`, `.carousel__slide`) for real
`<img>` tags:
```html
<div class="carousel__slide">
  <img src="assets/images/barepage-1.jpg" alt="Description of the photo">
  <span class="carousel__caption">Caption — production name, year</span>
</div>
```

**Résumé PDF** — add `assets/resume.pdf`; the download button in
`resume.html` already points at it.

**Résumé content** — edit the `.record` blocks directly in
`resume.html`.

**Reading list** — edit `data/books.json`. It has two parts:
```json
{
  "current": { "title": "...", "author": "...", "color": "#1F3329", "progress": 62, "review": "..." },
  "shelf": [
    { "title": "...", "author": "...", "color": "#4B5D53", "height": 210, "review": "..." }
  ]
}
```
`current` is the big featured book at the top of the Reading page.
`shelf` is everything else — each entry becomes one spine. `color`
sets the spine color, `height` (px) varies spine height, `progress`
(0–100, optional) shows a progress bar on the featured book.

**Technical projects** — duplicate a `.project-card` block in
`technical.html`.

**Theatre entries** — duplicate `.playbill-entry` blocks under
Writing / Performing / Producing / Dramaturgy in `theatre.html`.

**BarePage carousel** — duplicate a `.carousel__slide` block inside
`.carousel__track` in `theatre.html` for more photos. The carousel
JS in `main.js` auto-detects however many slides exist — no other
changes needed.

**Blog embed** — open `js/main.js` and set `WORDPRESS_SITE_URL` to
your WordPress site's URL. Works automatically for WordPress.com-hosted
sites; for self-hosted WordPress it falls back to the built-in
`/wp-json/wp/v2/posts` REST endpoint. If the fetch fails for any
reason, the page falls back to a plain "visit the blog" link.

## Deploying to GitHub Pages (no terminal needed)

See the step-by-step in our conversation, or in short:
1. Unzip this folder.
2. Create a GitHub repo named `yourusername.github.io`.
3. Upload every file and folder in this `site/` folder — including
   the hidden `.nojekyll` file — via "uploading an existing file" on
   the repo's page.
4. Commit, then go to Settings → Pages and confirm it's deploying
   from the `main` branch, root folder.
5. Visit `https://yourusername.github.io` after a minute or two.

To edit later: click a file on github.com, click the pencil icon,
edit, and commit — no local tools required.
