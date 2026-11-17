# Jay Fernando — personal site

## Structural notes for later

|---|---|---|
| `index.html` | launch page/about.
| `resume.html` | obviously resume.
| `reading.html` | media shelf.
| `technical.html` | display for tech projects/dashboards.
| `theatre.html` | theatre portfolio.
| `blog.html` | blog.

edit sidebar using `partials/nav.html`, connects to (`js/main.js`),

## how to run locally

```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000`. A real server is required (not
just double-clicking `index.html`) because the nav, bookshelf, and
blog feed all load data via `fetch()`, which browsers block on
`file://` URLs.


## when adding stuff

***uploading photos***: drop files into `assets/images/` and swap the
placeholder `div`s (`.portrait-frame`, `.carousel__slide`) for real
`<img>` tags:
```html
<div class="carousel__slide">
  <img src="assets/images/barepage-1.jpg" alt="Description of the photo">
  <span class="carousel__caption">Caption — production name, year</span>
</div>
```

***reuploading resume*** — switch out `assets/resume.pdf`; 

***quickblock resume*** — edit the `.record` blocks directly in
`resume.html`.

***media shelf*** — edit `data/books.json`. It has two parts:
```json
{
  "current": { "title": "...", "author": "...", "color": "#1F3329", "progress": 62, "review": "..." },
  "shelf": [
    { "title": "...", "author": "...", "color": "#4B5D53", "height": 210, "review": "..." }
  ]
}
```
`current` is the big feature book at the top of the Reading page.
`shelf` is everything else — each entry becomes one spine. `color`
sets the spine color, `height` (px) varies spine height

***adding new technical projects*** — duplicate a `.project-card` block in
`technical.html`.

**Theatre entries** — duplicate `.playbill-entry` blocks under
Writing / Performing / Producing / Dramaturgy in `theatre.html`.

**BarePage carousel** — duplicate a `.carousel__slide` block inside
`.carousel__track` in `theatre.html` for more photos. The carousel
JS in `main.js` auto-detects however many slides exist — no other
changes needed.

***blog embed*** in `js/main.js`, set `WORDPRESS_SITE_URL` to
WordPress site's URL. 
