const routes = [
  { path: "/", view: "./views/home.html", title: "Home • Magnolia" },
  { path: "/o-nama", view: "./views/about.html", title: "O nama • Magnolia" },
  { path: "/proizvodi", view: "./views/products.html", title: "Proizvodi • Magnolia" },
  { path: "/kontakt", view: "./views/contact.html", title: "Kontakt • Magnolia" },
  { path: "/prijava", view: "./views/auth.html", title: "Prijava i Registracija • Magnolia" },
  { path: "/login", view: "./views/auth.html", title: "Prijava • Magnolia" },
  { path: "/reset-sifre", view: "./views/reset-password.html", title: "Nova Lozinka • Magnolia" },
  { path: "/omiljeno", view: "./views/favorites.html", title: "Omiljeni Proizvodi • Magnolia" },
  { path: "/admin-login", view: "./views/login.html", title: "Admin Login • Magnolia" },
  { path: "/admin", view: "./views/admin.html", title: "Admin • Magnolia" },
  { path: "/checkout", view: "./views/checkout.html", title: "Checkout • Magnolia" },
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
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.includes("type=recovery")) {
    return "/reset-sifre";
  }
  if (hash.includes("type=signup") || hash.includes("access_token=")) {
    return "/omiljeno";
  }
  return normalize(hash || "/");
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

  // Basic Auth Check for Secret Admin
  if (path === "/admin") {
    const isAdmin = sessionStorage.getItem("isAdmin") === "true";
    const expiry = parseInt(sessionStorage.getItem("adminExpiry") || "0");
    const isSessionValid = isAdmin && Date.now() < expiry;

    if (!isSessionValid) {
      navigateTo("/admin-login");
      return;
    }
  }

  const route =
    matchRoute(path) || { path: "/404", view: "./views/home.html", title: "Magnolia" };

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
    if (path === "/kontakt") {
      if (typeof initContactForm === "function") {
        initContactForm();
      } else {
        console.warn("initContactForm nije dostupan u router.js");
      }
    }

    if (path === "/prijava" || path === "/login") {
      if (typeof window.initAuthPage === "function") {
        window.initAuthPage();
      }
    }

    if (path === "/reset-sifre") {
      if (typeof window.initResetPasswordPage === "function") {
        window.initResetPasswordPage();
      }
    }

    if (path === "/omiljeno") {
      if (typeof window.initFavoritesPage === "function") {
        window.initFavoritesPage();
      }
    }

    if (path === "/admin-login") {
      if (typeof window.initLoginForm === "function") {
        window.initLoginForm();
      }
    }

    if (path === "/admin") {
      if (typeof window.initAdminPanel === "function") {
        window.initAdminPanel();
      }
    }

    if (path === "/checkout") {
      if (typeof initCheckout === "function") {
        initCheckout();
      }
    }

    // Attach favorites buttons to all products rendered in current view
    if (typeof window.initFavoritesButtons === "function") {
      window.initFavoritesButtons();
    }

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

  // guard: spriječi duplo bindanje kad se vraćaš na kontakt view
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!window.emailjs) {
      alert("Email servis nije učitan. Provjeri EmailJS script u index.html.");
      return;
    }

    const btn = form.querySelector("button[type='submit']");
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = "Slanje…";

    try {
      await emailjs.sendForm("service_wwxmpm7", "template_fh2tjxy", form);
      form.reset();
      alert("Hvala! Poruka je poslana.");
    } catch (err) {
      console.error("EmailJS error:", err);
      alert("Greška pri slanju. Pokušaj ponovo.");
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}

