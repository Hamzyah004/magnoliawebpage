const routes = [
  { path: "/", view: "/views/home.html", title: "Home • Magnolia" },
  { path: "/o-nama", view: "/views/about.html", title: "O nama • Magnolia" },
  { path: "/proizvodi", view: "/views/products.html", title: "Proizvodi • Magnolia" },
  { path: "/kontakt", view: "/views/contact.html", title: "Kontakt • Magnolia" },
];

const normalize = (path) => {
  if (!path) return "/";
  const clean = path.split("?")[0].split("#")[0];
  return clean !== "/" ? clean.replace(/\/+$/, "") : "/";
};

const matchRoute = (path) => routes.find((r) => r.path === path) || null;

async function loadView(viewPath) {
  const res = await fetch(viewPath, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${viewPath}`);
  return await res.text();
}

// ---- HASH ROUTING HELPERS ----
function getHashPath() {
  // URL: https://site.com/#/proizvodi  -> raw: "/proizvodi"
  // URL: https://site.com/#/          -> raw: "/"
  const raw = window.location.hash.replace(/^#/, ""); // "#/x" -> "/x"
  return normalize(raw || "/");
}

function setHashPath(path) {
  const p = normalize(path);
  // keep consistent format "#/" for home
  window.location.hash = p === "/" ? "#/" : `#${p}`;
}

// Public API
export function navigateTo(pathOrHref) {
  // Allow passing "/#/proizvodi" OR "/proizvodi"
  const s = String(pathOrHref || "");
  const afterHash = s.includes("#") ? (s.split("#")[1] || "/") : s; // "/#/x" -> "/x"
  setHashPath(afterHash);
  // router() will run via "hashchange"
}

export async function router() {
  const app = document.getElementById("app");
  const path = getHashPath();

  const route =
    matchRoute(path) || { path: "/404", view: "/views/home.html", title: "Magnolia" };

  try {
    const html = await loadView(route.view);
    app.innerHTML = html;
    document.title = route.title || "Magnolia";
    window.scrollTo({ top: 0, behavior: "smooth" });

    // highlight active nav (compare hash paths)
    document.querySelectorAll(".nav__link").forEach((a) => {
      const href = a.getAttribute("href") || "";
      const linkPath = normalize((href.split("#")[1]) || "/"); // "/#/x" -> "/x"
      a.classList.toggle("is-active", linkPath === path);
    });

    // optional: run per-view init hooks
    if (path === "/kontakt") initContactForm();
  } catch (e) {
    app.innerHTML = `
      <section class="section">
        <div class="container">
          <h1 class="h1">Ups…</h1>
          <p class="muted">Ne mogu učitati stranicu. Provjeri putanje ili pokreni lokalni server.</p>
        </div>
      </section>`;
  }
}

function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.textContent = "Slanje…";

    // TODO: ovdje ubaci EmailJS / Netlify Forms / backend endpoint
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Pošalji poruku";
      form.reset();
      alert("Hvala! Poruka je poslana.");
    }, 600);
  });
}
