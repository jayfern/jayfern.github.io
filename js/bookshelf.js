// Path to your drawn living-room image, e.g. "assets/living-room.png". Leave "" for the plain wall.
const ROOM_BACKGROUND = "";

// Each section reads one array from data/books.json. "shelf" stays the key for books.
// type picks the look (book spine, front-facing CD on a stand, DVD case); perRow is how many fit on one shelf.
const SHELF_SECTIONS = [
  { key: "shelf",  label: "Books",  eyebrow: "Book",  type: "book",  perRow: 18, now: "Currently reading" },
  { key: "albums", label: "Albums", eyebrow: "Album", type: "cd",    perRow: 6,  now: "Currently listening to" },
  { key: "shows",  label: "Shows",  eyebrow: "Show",  type: "show",  perRow: 22, now: "Currently watching" },
  { key: "movies", label: "Movies", eyebrow: "Movie", type: "movie", perRow: 22, now: "Currently watching" },
];

// Spine colors and book heights are picked from these lists rather than set per item.
// The pick is based on the title, so each item keeps the same look on every visit.
const SPINE_COLORS = ["#5e1e29", "#A05263", "#d28388", "#57604b", "#849f8e"];
const BOOK_HEIGHTS = [0.64, 0.72, 0.8, 0.86]; // fraction of the shelf's height

const byline = (b) => b.author || b.artist || b.creator || b.director || "";
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

// the color each item ended up with on the shelf, so the featured card can match it
const spineColors = new WeakMap();
const colorFor = (item) => spineColors.get(item) || SPINE_COLORS[hash(item.title) % SPINE_COLORS.length];

// title-based color, moved along the list when it would match the spine right before it
function pickColor(item, prevColor) {
  let i = hash(item.title) % SPINE_COLORS.length;
  if (SPINE_COLORS[i] === prevColor) i = (i + 1) % SPINE_COLORS.length;
  spineColors.set(item, SPINE_COLORS[i]);
  return SPINE_COLORS[i];
}

/* ============================================================
   COVER ART
   Looked up when an item is shown in the featured card. All of these APIs are free,
   need no key, and allow browser requests, so they work on a static GitHub Pages site.
   An item can skip the lookup with  "cover": "path/or/url.jpg"  in books.json, and
   "media": "show" | "movie" | "album" | "book"  overrides which API is used
   (e.g. a show you've put on the books shelf).
   ============================================================ */
const coverCache = new Map();

const clean = (s) => String(s || "")
  .replace(/^(cr|dir|by)\.?\s+/i, "")        // "cr. Abdullah Saeed" -> "Abdullah Saeed"
  .replace(/\s+S\d+(\s*[-–]\s*\d+)?$/i, "")  // "Ted Lasso S1-4" -> "Ted Lasso"
  .trim();
const norm = (s) => String(s).toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Wikipedia's lead image for the best-matching article. `kind` is "film", "novel", "album" or
// "TV series"; `by` (director, author...) only helps the search find the article.
// Articles are ranked so the work itself wins over pages about its people or soundtrack:
//   exact title ("Animals (2026 film)" counts as "Animals")  > title only contains it,
//   plus a bonus when the "(…)" note names the right kind, minus one for "soundtrack".
// Articles whose title doesn't contain the item title are never used.
// Searches with `by` first (so a generic title like "Animals" finds the right film); if that
// turns up no exact title match, searches again without it, since names can bury the article.
async function wikipediaCover(title, by, kind) {
  const first = await wikipediaSearch(title, by, kind);
  if ((first && first.score >= 3) || !by) return first?.src || null;
  const second = await wikipediaSearch(title, "", kind);
  const best = [first, second].filter(Boolean).sort((a, b) => b.score - a.score)[0];
  return best?.src || null;
}

async function wikipediaSearch(title, by, kind) {
  const q = encodeURIComponent(`${title} ${by} ${kind}`.replace(/\s+/g, " ").trim());
  const d = await getJSON(
    `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=10` +
    `&prop=pageimages&piprop=thumbnail&pithumbsize=500&pilicense=any&format=json&origin=*`
  );
  const want = norm(title);
  let best = null;
  for (const p of Object.values(d.query?.pages || {})) {
    if (!p.thumbnail) continue;
    const note = (p.title.match(/\(([^)]*)\)\s*$/) || [])[1] || "";
    const base = norm(p.title.replace(/\s*\([^)]*\)\s*$/, ""));
    let score = base === want ? 3 : norm(p.title).includes(want) ? 1 : -1;
    if (score < 0) continue;
    if (note.toLowerCase().includes(kind.toLowerCase())) score += 1;
    if (/soundtrack/i.test(note)) score -= 2;
    if (!best || score > best.score || (score === best.score && p.index < best.index)) {
      best = { score, index: p.index, src: p.thumbnail.source };
    }
  }
  return best;
}

const COVER_LOOKUPS = {
  async book(title, by) {
    const d = await getJSON(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}` +
      `&author=${encodeURIComponent(by)}&limit=5&fields=cover_i`
    );
    const id = d.docs?.find((doc) => doc.cover_i)?.cover_i;
    return id ? `https://covers.openlibrary.org/b/id/${id}-L.jpg` : wikipediaCover(title, by, "novel");
  },
  async show(title) {
    const d = await getJSON(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(title)}`);
    // "medium" first: TVmaze's "original" URLs redirect to plain http, which an https page blocks
    return d.image?.medium || d.image?.original || wikipediaCover(title, "", "TV series");
  },
  async movie(title, by) {
    return wikipediaCover(title, by, "film");
  },
  async album(title, by) {
    const d = await getJSON(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${title} ${by}`)}&entity=album&limit=5`
    );
    const hit = d.results?.find((r) => norm(r.collectionName).includes(norm(title)));
    return hit ? hit.artworkUrl100.replace("100x100bb", "600x600bb") : wikipediaCover(title, by, "album");
  },
};

async function findCover(item, type) {
  if (item.cover) return item.cover;
  const title = clean(item.title);
  if (!title || title === "...") return null;
  const media = item.media || (type === "cd" ? "album" : type);
  const key = `${media}|${title}`;
  if (!coverCache.has(key)) {
    const lookup = COVER_LOOKUPS[media] || COVER_LOOKUPS.book;
    coverCache.set(key, lookup(title, clean(byline(item))).catch((err) => {
      console.warn("Cover lookup failed:", err.message);
      return null;
    }));
  }
  return coverCache.get(key);
}

// Fills the featured card's cover once the art arrives; the colored block stays if nothing is found.
async function loadCover(mount, item, type) {
  const token = (mount.dataset.coverToken = String(Math.random()));
  const url = await findCover(item, type);
  const box = mount.querySelector(".featured-book__cover");
  if (!url || !box || mount.dataset.coverToken !== token) return; // user already clicked something else
  const img = new Image();
  img.alt = `Cover of ${item.title}`;
  img.className = "featured-book__cover-img";
  img.onload = () => {
    if (mount.dataset.coverToken === token) box.classList.add("has-art"), box.appendChild(img);
  };
  img.src = url;
}

function renderFeatured(mount, b, eyebrow, type = "book") {
  mount.innerHTML = `
    <div class="featured-book__cover featured-book__cover--${type}" style="background:${colorFor(b)}">
      <span class="featured-book__cover-title">${b.title}</span>
    </div>
    <div>
      <span class="featured-book__eyebrow">${eyebrow}</span>
      <h3>${b.title}</h3>
      <p class="featured-book__author">${byline(b)}</p>
      <p>${b.review || "No review yet."}</p>
    </div>
  `;
  loadCover(mount, b, type);
}

async function renderBookshelf() {
  const featuredMount = document.getElementById("featured-book");
  const shelvesMount = document.getElementById("shelf-rows");
  if (!featuredMount && !shelvesMount) return;

  if (ROOM_BACKGROUND) {
    const root = document.documentElement.style;
    root.setProperty("--room-bg", `url("${ROOM_BACKGROUND}")`);
    root.setProperty("--top-space", "14vh"); // wall space above the case for your art
    root.setProperty("--floor-h", "9vh");    // the case stands on this floor line
  }

  try {
    const res = await fetch("data/books.json");
    if (!res.ok) throw new Error("books.json not found");
    const data = await res.json();

    function select(spine, item, eyebrow, type) {
      if (!featuredMount) return;
      shelvesMount?.querySelectorAll(".is-selected").forEach((b) => b.classList.remove("is-selected"));
      spine.classList.add("is-selected");
      renderFeatured(featuredMount, item, eyebrow, type);
    }

    if (shelvesMount) {
      shelvesMount.innerHTML = "";
      let totalRows = 0;
      SHELF_SECTIONS.forEach((section) => {
        const items = data[section.key];
        if (!Array.isArray(items) || !items.length) return;
        const rows = Math.ceil(items.length / section.perRow);
        for (let i = 0; i < items.length; i += section.perRow) {
          const n = Math.floor(i / section.perRow) + 1;
          const row = document.createElement("div");
          row.className = "shelf-row";
          row.innerHTML = `
            <p class="shelf-row__label">${rows > 1 ? `${section.label} ${n}` : section.label}</p>
            <div class="shelf"></div>
            <div class="shelf__board" aria-hidden="true"></div>
          `;
          const shelfEl = row.querySelector(".shelf");
          const rowItems = items.slice(i, i + section.perRow);
          shelfEl.classList.add(`shelf--${section.type}`);
          shelfEl.style.setProperty("--n", rowItems.length); // CD cases size themselves to fit the row
          let prevColor = null;
          rowItems.forEach((item) => {
            prevColor = pickColor(item, prevColor);
            const build = section.type === "cd" ? buildAlbum : buildSpine;
            const spine = build(item, section.type, (el) => select(el, item, section.eyebrow, section.type));
            shelfEl.appendChild(spine);
            // "current": true in books.json opens the page on that item
            if (item.current) select(spine, item, section.now, section.type);
          });
          shelvesMount.appendChild(row);
          totalRows++;
        }
      });
      // one stacked bookcase: shelf height is worked out from the row count so nothing scrolls
      shelvesMount.classList.add("bookcase");
      shelvesMount.style.setProperty("--rows", totalRows || 1);
    }
  } catch (err) {
    if (shelvesMount) {
      shelvesMount.innerHTML = `<p class="blog-feed__status">Couldn't load books.json — check data/books.json exists.</p>`;
    }
    console.error(err);
  }
}

function spineSize(item, type) {
  const h = hash(item.title);
  // cases are all one height (shows and movies match); only books vary
  if (type === "show") return { w: 17, hf: 0.8 };
  if (type === "movie") return { w: 14, hf: 0.8 };
  return { w: 18 + (h % 12), hf: BOOK_HEIGHTS[(h >> 3) % BOOK_HEIGHTS.length] };
}

// clicking or pressing Enter/Space on a shelf item shows it in the featured card
function makeSelectable(el, item, onSelect) {
  const by = byline(item);
  el.title = item.title;
  el.setAttribute("tabindex", "0");
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `${item.title}${by ? " by " + by : ""}`);
  el.addEventListener("click", () => onSelect(el));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(el);
    }
  });
}

// An album shown face-out: a jewel case (hinge strip, clear plastic, glare) holding the real
// cover, standing on a small wooden display stand. The cover loads as soon as the shelf does;
// until then (or if none is found) the case shows a colored insert with the title.
function buildAlbum(item, type, onSelect) {
  const album = document.createElement("div");
  album.className = "album";
  album.innerHTML = `
    <div class="album__case">
      <div class="album__art" style="background:${colorFor(item)}">
        <span class="album__title">${item.title}</span>
      </div>
    </div>
    <div class="album__stand" aria-hidden="true"></div>
  `;
  makeSelectable(album, item, onSelect);

  findCover(item, type).then((url) => {
    if (!url) return;
    const img = new Image();
    img.alt = "";
    img.className = "album__img";
    img.onload = () => album.querySelector(".album__art").appendChild(img);
    img.src = url;
  });
  return album;
}

function buildSpine(item, type, onSelect) {
  const { w, hf } = spineSize(item, type);
  const spine = document.createElement("div");
  spine.className = `book book--${type}`;
  spine.style.setProperty("--c", colorFor(item));
  spine.style.setProperty("--w", `${w}px`);
  spine.style.setProperty("--hf", hf);
  spine.innerHTML = `<span class="book__title">${item.title}</span>`;
  makeSelectable(spine, item, onSelect);
  return spine;
}

renderBookshelf();
