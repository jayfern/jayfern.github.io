/* ============================================================
   CONFIG
   ============================================================ */
const BLOG_SITE_URL = "https://medium.com/@jayfern"; // 
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
   THEATRE PAGE
   The productions list is plain HTML in theatre.html. Photos come from data/theatre.json:
     "photos": [{ src, caption }]  (src empty = placeholder box)
   ============================================================ */
async function renderTheatre() {
  const photos = document.getElementById("theatre-photos");
  if (!photos) return;

  try {
    const res = await fetch("data/theatre.json");
    if (!res.ok) throw new Error("theatre.json not found");
    const data = await res.json();

    if (photos && Array.isArray(data.photos)) {
      photos.innerHTML = data.photos.map((ph) => `
        <figure class="theatre-photo">
          ${ph.src
            ? `<img src="${ph.src}" alt="${ph.caption || ""}" loading="lazy">`
            : `<div class="theatre-photo__ph">PHOTO</div>`}
          ${ph.caption ? `<figcaption>${ph.caption}</figcaption>` : ""}
        </figure>`).join("");
    }
  } catch (err) {
    console.error("Theatre content failed to load:", err);
  }
}
renderTheatre();

/* ============================================================
   TABS (theatre page)
   A [data-tabs] bar of role="tab" buttons; each button's aria-controls is the id of the
   panel it shows ("panel-NAME"). The open tab goes in the URL as #NAME, so
   theatre.html#barepage opens BarePage. (Panel ids differ from the #NAME on purpose:
   if they matched, the browser would jump down to the panel on load.)
   ============================================================ */
function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach((bar) => {
    const tabs = Array.from(bar.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;
    const panelOf = (tab) => document.getElementById(tab.getAttribute("aria-controls"));
    const nameOf = (tab) => tab.getAttribute("aria-controls").replace(/^panel-/, "");

    function open(tab, { focus = false, updateHash = true } = {}) {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = panelOf(t);
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      if (updateHash) history.replaceState(null, "", `#${nameOf(tab)}`);
    }

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => open(tab));
      tab.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (step) open(tabs[(i + step + tabs.length) % tabs.length], { focus: true });
        if (e.key === "Home") open(tabs[0], { focus: true });
        if (e.key === "End") open(tabs[tabs.length - 1], { focus: true });
      });
    });

    const fromHash = tabs.find((t) => `#${nameOf(t)}` === location.hash);
    open(fromHash || tabs[0], { updateHash: false });
  });
}
initTabs();

/* ============================================================
   CAROUSEL (BarePage photos on the theatre page)
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
  if (visitLink) visitLink.href = BLOG_SITE_URL;

  const isDotComHosted = BLOG_SITE_URL.includes(".com");
  const endpoint = isDotComHosted
    ? `https://public-api.wordpress.com/rest/v1.1/sites/${BLOG_SITE_URL.replace(/^https?:\/\//, "")}/posts/?number=${BLOG_POST_COUNT}`
    : `${BLOG_SITE_URL}/wp-json/wp/v2/posts?per_page=${BLOG_POST_COUNT}&_embed`;

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
    feed.innerHTML = `<p class="blog-feed__status">Posts are loading.</p>`;
    console.warn("Blog feed not loaded:", err.message);
  }
}
renderBlogFeed();

/* ============================================================
   FOOTER YEAR
   ============================================================ */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
