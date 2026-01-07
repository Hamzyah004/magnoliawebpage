import { router, navigateTo } from "./router.js";

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
window.addEventListener("popstate", router);

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

router();
