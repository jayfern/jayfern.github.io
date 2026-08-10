/* ============================================================
   CONFIG
   ============================================================ */
const WORDPRESS_SITE_URL = "https://yourblog.wordpress.com"; // no trailing slash
const BLOG_POST_COUNT = 3;

/* ============================================================
   NAV PARTIAL — loaded once per page, then marks the active link
   by comparing each link's href to the current file name
   ============================================================ */
async function loadNav() {
  const mount = document.getElementById("program-nav");
  if (!mount) return;
  try {
    const res = await fetch("partials/nav.html");
    mount.innerHTML = await res.text();
  } catch (err) {
    console.error("Nav failed to load:", err);
    return;
  }

  const current = location.pathname.split("/").pop() || "index.html";
  mount.querySelectorAll(".program-nav__list a").forEach((link) => {
    if (link.getAttribute("href") === current) link.classList.add("is-active");
  });

  // mobile toggle
  const toggle = document.createElement("button");
  toggle.className = "program-nav__toggle";
  toggle.setAttribute("aria-label", "Toggle menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = "<span></span><span></span><span></span>";
  mount.appendChild(toggle);

  const list = mount.querySelector(".program-nav__list");
  toggle.addEventListener("click", () => {
    const isOpen = list.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  list.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      list.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}
loadNav();

/* ============================================================
   BOOKSHELF — featured "currently reading" book + shelves of
   the rest, grouped into rows. Reviews pop up on hover/tap and
   flip below the spine automatically if there isn't room above
   (fixes the popup getting clipped near the top of the page).
   ============================================================ */
async function renderBookshelf() {
  const featuredMount = document.getElementById("featured-book");
  const shelvesMount = document.getElementById("shelf-rows");
  if (!featuredMount && !shelvesMount) return;

  try {
    const res = await fetch("data/books.json");
    if (!res.ok) throw new Error("books.json not found");
    const data = await res.json();

    if (featuredMount && data.current) {
      const b = data.current;
      featuredMount.innerHTML = `
        <div class="featured-book__cover" style="background:${b.color || "#1F3329"}">
          <span class="featured-book__cover-title">${b.title}</span>
        </div>
        <div>
          <span class="featured-book__eyebrow">Currently reading</span>
          <h3>${b.title}</h3>
          <p class="featured-book__author">${b.author}</p>
          <p>${b.review || ""}</p>
          ${
            typeof b.progress === "number"
              ? `<div class="featured-book__progress"><div class="featured-book__progress-bar" style="width:${b.progress}%"></div></div>
                 <span class="featured-book__progress-label">${b.progress}% through</span>`
              : ""
          }
        </div>
      `;
    }

    if (shelvesMount && Array.isArray(data.shelf)) {
      shelvesMount.innerHTML = "";
      const rowSize = 7;
      for (let i = 0; i < data.shelf.length; i += rowSize) {
        const rowBooks = data.shelf.slice(i, i + rowSize);
        const row = document.createElement("div");
        row.className = "shelf-row";
        row.innerHTML = `
          <p class="shelf-row__label">Shelf ${Math.floor(i / rowSize) + 1}</p>
          <div class="shelf"></div>
          <div class="shelf__board" aria-hidden="true"></div>
        `;
        const shelfEl = row.querySelector(".shelf");
        rowBooks.forEach((book) => shelfEl.appendChild(buildBookSpine(book)));
        shelvesMount.appendChild(row);
      }
    }
  } catch (err) {
    if (shelvesMount) {
      shelvesMount.innerHTML = `<p class="blog-feed__status">Couldn't load books.json — check data/books.json exists.</p>`;
    }
    console.error(err);
  }
}

function buildBookSpine(book) {
  const spine = document.createElement("div");
  spine.className = "book";
  spine.style.background = book.color || "#4B5D53";
  spine.style.height = `${book.height || 210}px`;
  spine.setAttribute("tabindex", "0");
  spine.setAttribute("role", "button");
  spine.setAttribute("aria-label", `${book.title} by ${book.author}`);

  spine.innerHTML = `
    <span class="book__title">${book.title}</span>
    <div class="book__review">
      <h5>${book.title}</h5>
      <span class="book__author">${book.author}</span>
      <p>${book.review || "No review yet — add one in data/books.json."}</p>
    </div>
  `;

  const review = spine.querySelector(".book__review");

  function positionReview() {
    // flip the review below the spine if there isn't ~230px of
    // room above it (its rough rendered height + arrow)
    const rect = spine.getBoundingClientRect();
    const needed = 230;
    review.classList.toggle("flip-down", rect.top < needed);
  }

  spine.addEventListener("mouseenter", positionReview);
  spine.addEventListener("focus", positionReview);

  spine.addEventListener("click", () => {
    const wasOpen = spine.classList.contains("is-open");
    document.querySelectorAll(".book.is-open").forEach((b) => b.classList.remove("is-open"));
    if (!wasOpen) {
      positionReview();
      spine.classList.add("is-open");
    }
  });

  return spine;
}
renderBookshelf();

/* ============================================================
   THEATRE PAGE — scenes grid + performing/producing/dramaturgy
   credit galleries, all driven from data/theatre.json so adding
   a new scene or credit is just adding a line to that file.
   ============================================================ */
async function renderTheatreContent() {
  const sceneGrid = document.getElementById("scene-grid");
  const performingGrid = document.getElementById("performing-grid");
  const producingGrid = document.getElementById("producing-grid");
  const dramaturgyGrid = document.getElementById("dramaturgy-grid");
  if (!sceneGrid && !performingGrid && !producingGrid && !dramaturgyGrid) return;

  try {
    const res = await fetch("data/theatre.json");
    if (!res.ok) throw new Error("theatre.json not found");
    const data = await res.json();

    if (sceneGrid && Array.isArray(data.scenes)) {
      sceneGrid.innerHTML = data.scenes
        .map(
          (s, i) => `
        <article class="scene-card">
          <span class="scene-card__index">${String(i + 1).padStart(2, "0")}</span>
          <h3>${s.title}</h3>
          <p class="scene-card__blurb">${s.blurb || ""}</p>
          <span class="playbill-entry__tag">${s.tag || "short scene"}</span>
        </article>`
        )
        .join("");
    }

    const renderCredits = (mount, items) => {
      if (!mount || !Array.isArray(items)) return;
      mount.innerHTML = items
        .map(
          (c) => `
        <article class="credit-card">
          <div class="credit-card__photo"><span>PHOTO</span></div>
          <h4 class="credit-card__role">${c.role}</h4>
          <span class="credit-card__meta">${c.production}${c.meta ? " — " + c.meta : ""}</span>
          ${c.desc ? `<p class="credit-card__desc">${c.desc}</p>` : ""}
        </article>`
        )
        .join("");
    };
    renderCredits(performingGrid, data.performing);
    renderCredits(producingGrid, data.producing);
    renderCredits(dramaturgyGrid, data.dramaturgy);
  } catch (err) {
    console.error("Theatre content failed to load:", err);
  }
}
renderTheatreContent();

/* ============================================================
   CAROUSEL — vanilla, reusable. Pass a container with
   [data-carousel] and a data-slides attribute pointing at a
   <template> or just build slides server-side in HTML; here we
   just wire up any .carousel already present in the markup.
   ============================================================ */
function initCarousels() {
  document.querySelectorAll("[data-carousel]").forEach((root) => {
    const track = root.querySelector(".carousel__track");
    const slides = Array.from(root.querySelectorAll(".carousel__slide"));
    const prevBtn = root.querySelector(".carousel__btn--prev");
    const nextBtn = root.querySelector(".carousel__btn--next");
    const dotsWrap = root.querySelector(".carousel__dots");
    if (!track || slides.length === 0) return;

    let index = 0;

    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.className = "carousel__dot";
      dot.setAttribute("aria-label", `Go to photo ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.querySelectorAll(".carousel__dot"));

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle("is-active", di === index));
    }

    prevBtn.addEventListener("click", () => goTo(index - 1));
    nextBtn.addEventListener("click", () => goTo(index + 1));

    root.setAttribute("tabindex", "0");
    root.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    });

    // basic touch swipe
    let touchStartX = null;
    track.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goTo(dx > 0 ? index - 1 : index + 1);
      touchStartX = null;
    });

    goTo(0);
  });
}
initCarousels();

/* ============================================================
   BLOG EMBED
   ============================================================ */
async function renderBlogFeed() {
  const feed = document.getElementById("blog-feed");
  const visitLink = document.getElementById("blog-visit-link");
  if (!feed) return;
  if (visitLink) visitLink.href = WORDPRESS_SITE_URL;

  const isDotComHosted = WORDPRESS_SITE_URL.includes("wordpress.com");
  const endpoint = isDotComHosted
    ? `https://public-api.wordpress.com/rest/v1.1/sites/${WORDPRESS_SITE_URL.replace(/^https?:\/\//, "")}/posts/?number=${BLOG_POST_COUNT}`
    : `${WORDPRESS_SITE_URL}/wp-json/wp/v2/posts?per_page=${BLOG_POST_COUNT}&_embed`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error("blog feed request failed");
    const data = await res.json();
    const posts = isDotComHosted ? data.posts : data;
    if (!posts || !posts.length) throw new Error("no posts returned");

    feed.innerHTML = "";
    posts.forEach((post) => {
      const title = isDotComHosted ? post.title : post.title.rendered;
      const date = new Date(post.date);
      const excerptRaw = isDotComHosted ? post.excerpt : post.excerpt.rendered;
      const excerpt = excerptRaw.replace(/<[^>]+>/g, "").slice(0, 140).trim();
      const url = isDotComHosted ? post.URL : post.link;

      const card = document.createElement("a");
      card.className = "blog-post";
      card.href = url;
      card.target = "_blank";
      card.rel = "noopener";
      card.innerHTML = `
        <span class="blog-post__date">${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
        <h3>${title}</h3>
        <p>${excerpt}${excerpt.length >= 140 ? "…" : ""}</p>
      `;
      feed.appendChild(card);
    });
  } catch (err) {
    feed.innerHTML = `<p class="blog-feed__status">Set WORDPRESS_SITE_URL in js/main.js to load recent posts here.</p>`;
    console.warn("Blog feed not loaded:", err.message);
  }
}
renderBlogFeed();

/* ============================================================
   FOOTER YEAR
   ============================================================ */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
