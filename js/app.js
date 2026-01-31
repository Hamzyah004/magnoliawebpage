import { router, navigateTo } from "./router.js";

// Ukloni "index.html" iz URL-a (da bude /#/..., ne /index.html#/.)
if (window.location.pathname.endsWith("/index.html")) {
  const newPath = window.location.pathname.replace(/\/index\.html$/, "/");
  // zadrži hash ako postoji
  window.history.replaceState({}, "", newPath + window.location.hash);
}


document.getElementById("y").textContent = new Date().getFullYear();

// Intercept link clicks (data-link)
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a) return;

  // allow new tab etc.
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  e.preventDefault();
  navigateTo(a.getAttribute("href"));
});

// Back/forward
window.addEventListener("hashchange", router);

// Mobile nav toggle
const toggle = document.querySelector(".nav__toggle");
const nav = document.querySelector(".nav");
toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(open));
});

// Close mobile nav on navigation
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a) return;
  nav?.classList.remove("is-open");
  toggle?.setAttribute("aria-expanded", "false");
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".product__toggle");
  if (!btn) return;

  const card = btn.closest(".product");
  card.classList.toggle("is-open");
});

function initProductModal() {
  const modal = document.getElementById("product-modal");
  if (!modal) return;

  const titleEl = document.getElementById("modal-title");
  const descEl = document.getElementById("modal-desc");
  const imgEl = document.getElementById("modal-img");

  const formatDesc = (text) => {
    let t = String(text || "");

    // escape HTML
    t = t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // ## Naslov:: -> bold block
    t = t.replace(/##\s*(.+?)::/g, '<strong class="modal-h">$1</strong>');

    // prazne linije -> razmak
    t = t.replace(/\n\s*\n/g, "<br><br>");

    // single newline -> <br>
    t = t.replace(/\n/g, "<br>");

    return t;
  };



  const openModal = (productEl) => {
    const title = productEl.dataset.title || "";
    const desc = productEl.dataset.desc || "";
    const img = productEl.dataset.img || "";

    titleEl.textContent = title;
    descEl.innerHTML = formatDesc(desc);

    imgEl.src = img;
    imgEl.alt = title;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  // klik na karticu (radi i u SPA jer je event delegation)
  document.addEventListener("click", (e) => {
    // ne otvaraj ako klikne na link/dugme unutar kartice (za budućnost)
    if (e.target.closest("a, button")) return;

    const product = e.target.closest(".product");
    if (!product) return;

    // ⛔ ne otvaraj modal za static kartice
    if (product.classList.contains("product--static")) return;

    openModal(product);
  });

  const overlay = modal.querySelector(".modal__overlay");
  const closeBtns = modal.querySelectorAll("[data-modal-close]");
  const dialog = modal.querySelector(".modal__dialog");

  overlay.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });

  closeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
    });
  });

  dialog.addEventListener("click", (e) => {
    e.stopPropagation();
  });



  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
}

initProductModal();



if (!window.location.hash) window.location.hash = "#/";
router();
