// Path to your drawn living-room image, e.g. "assets/living-room.png". Leave "" for the plain wall.
const ROOM_BACKGROUND = "";

// Each section reads one array from data/books.json. "shelf" stays the key for books.
// type picks the look (book spine, CD case, DVD case); perRow is how many fit on one shelf.
const SHELF_SECTIONS = [
  { key: "shelf",  label: "Books",  eyebrow: "Book",  type: "book",  perRow: 18 },
  { key: "albums", label: "Albums", eyebrow: "Album", type: "cd",    perRow: 28 },
  { key: "shows",  label: "Shows",  eyebrow: "Show",  type: "show",  perRow: 22 },
  { key: "movies", label: "Movies", eyebrow: "Movie", type: "movie", perRow: 22 },
];

const byline = (b) => b.author || b.artist || b.creator || b.director || "";
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function renderFeatured(mount, b, eyebrow) {
  mount.innerHTML = `
    <div class="featured-book__cover" style="background:${b.color || "#1F3329"}">
      <span class="featured-book__cover-title">${b.title}</span>
    </div>
    <div>
      <span class="featured-book__eyebrow">${eyebrow}</span>
      <h3>${b.title}</h3>
      <p class="featured-book__author">${byline(b)}</p>
      <p>${b.review || "No review yet."}</p>
      ${
        typeof b.progress === "number"
          ? `<div class="featured-book__progress"><div class="featured-book__progress-bar" style="width:${b.progress}%"></div></div>
             <span class="featured-book__progress-label">${b.progress}% through</span>`
          : ""
      }
    </div>
  `;
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

    if (featuredMount && data.current) {
      renderFeatured(featuredMount, data.current, "Currently reading");
    }

    function select(spine, item, eyebrow) {
      if (!featuredMount) return;
      document.querySelectorAll(".book.is-selected").forEach((b) => b.classList.remove("is-selected"));
      spine.classList.add("is-selected");
      renderFeatured(featuredMount, item, eyebrow);
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
          items.slice(i, i + section.perRow).forEach((item) =>
            shelfEl.appendChild(
              buildSpine(item, section.type, (spine) => select(spine, item, section.eyebrow))
            )
          );
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
  if (type === "cd") return { w: 10, hf: 0.58 + (h % 5) / 100 };
  if (type === "show") return { w: 17, hf: 0.8 };
  if (type === "movie") return { w: 13 + (h % 3), hf: 0.78 + (h % 5) / 100 };
  const hf = item.height
    ? Math.min(0.86, Math.max(0.55, item.height / 260))
    : 0.62 + ((h >> 3) % 25) / 100;
  return { w: 18 + (h % 12), hf };
}

function buildSpine(item, type, onSelect) {
  const { w, hf } = spineSize(item, type);
  const by = byline(item);
  const spine = document.createElement("div");
  spine.className = `book book--${type}`;
  spine.style.setProperty("--c", item.color || "#4B5D53");
  spine.style.setProperty("--w", `${w}px`);
  spine.style.setProperty("--hf", hf);
  spine.title = item.title;
  spine.setAttribute("tabindex", "0");
  spine.setAttribute("role", "button");
  spine.setAttribute("aria-label", `${item.title}${by ? " by " + by : ""}`);
  spine.innerHTML = `<span class="book__title">${item.title}</span>`;

  spine.addEventListener("click", () => onSelect(spine));
  spine.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(spine);
    }
  });
  return spine;
}

renderBookshelf();
