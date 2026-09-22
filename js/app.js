import { router, navigateTo } from "./router.js";
import { PRODUCTS } from "./products-data.js";

const SUPABASE_URL = "https://rmjtrveqslcklvprikfo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtanRydmVxc2xja2x2cHJpa2ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTY2NjQsImV4cCI6MjA5Mzg5MjY2NH0.7JKU0NgvTTw7pSAQ35GsT6Ka_UNUnN4xoc2aO0awpxU";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- CUSTOMER AUTH & FAVORITES STATE ---
let currentUser = null;
let userFavorites = [];

// Proveri da li je proizvod u omiljenim
window.isFavorite = function(title) {
  return userFavorites.includes(title);
};

// Ažuriranje elemenata u navigaciji u zavisnosti od prijave
function updateAuthNavbar() {
  const favLink = document.getElementById("nav-favorites-link");
  const favCount = document.getElementById("nav-favorites-count");
  const loginLink = document.getElementById("nav-login-link");
  const logoutBtn = document.getElementById("nav-logout-btn");

  if (currentUser) {
    if (favLink) favLink.style.display = "inline-flex";
    if (favCount) {
      favCount.textContent = userFavorites.length;
      favCount.style.display = userFavorites.length > 0 ? "inline-block" : "none";
    }
    if (loginLink) loginLink.style.display = "none";
    if (logoutBtn) {
      logoutBtn.style.display = "inline-block";
      const name = currentUser.user_metadata?.first_name || currentUser.email?.split("@")[0] || "Korisnik";
      logoutBtn.textContent = `Odjavi se (${name})`;
    }
  } else {
    if (favLink) favLink.style.display = "none";
    if (loginLink) loginLink.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// Spasavanje omiljenih u cache i Supabase
async function saveUserFavorites() {
  if (!currentUser) return;
  localStorage.setItem("magnolia_favs_" + currentUser.id, JSON.stringify(userFavorites));
  try {
    await supabase.auth.updateUser({
      data: { favorites: userFavorites }
    });
  } catch (err) {
    console.warn("Greška pri ažuriranju omiljenih na Supabase:", err);
  }
}

// Dodavanje / uklanjanje iz omiljenih
window.toggleFavorite = async function(title) {
  if (!currentUser) {
    window.showToast("Prijavite se kako biste dodali u omiljeno. ❤️");
    return;
  }

  const idx = userFavorites.indexOf(title);
  if (idx > -1) {
    userFavorites.splice(idx, 1);
    window.showToast("Proizvod uklonjen iz omiljenih.");
  } else {
    userFavorites.push(title);
    window.showToast("Proizvod dodan u omiljeno! ❤️");
  }

  saveUserFavorites();
  updateAuthNavbar();
  window.updateAllFavButtons();

  // Ako smo na stranici omiljeno, osvježi prikaz
  if (window.location.hash.includes("/omiljeno") && typeof window.initFavoritesPage === "function") {
    window.initFavoritesPage();
  }
};

// Ažuriranje izgleda svih heart dugmadi na stranici
window.updateAllFavButtons = function() {
  document.querySelectorAll(".product").forEach((card) => {
    const title = card.dataset.title;
    if (!title) return;
    const btn = card.querySelector(".product__fav-btn");
    if (btn) {
      const active = window.isFavorite(title);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-label", active ? "Ukloni iz omiljenih" : "Dodaj u omiljeno");
      const svg = btn.querySelector("svg");
      if (svg) {
        svg.setAttribute("fill", active ? "#ef4444" : "none");
        svg.setAttribute("stroke", active ? "#ef4444" : "currentColor");
      }
    }
  });

  // Modal heart dugme
  const modalTitle = document.getElementById("modal-title")?.textContent;
  const modalFavBtn = document.getElementById("modal-fav-btn");
  const modalFavText = document.getElementById("modal-fav-text");
  if (modalFavBtn && modalTitle) {
    const active = window.isFavorite(modalTitle);
    modalFavBtn.classList.toggle("is-active", active);
    if (modalFavText) modalFavText.textContent = active ? "Ukloni iz omiljenih" : "Dodaj u omiljeno";
  }
};

// Automatsko ubacivanje srce dugmeta u sve .product kartice
window.initFavoritesButtons = function() {
  document.querySelectorAll(".product").forEach((card) => {
    const title = card.dataset.title;
    if (!title) return;

    const imgWrap = card.querySelector(".product__image");
    if (!imgWrap) return;

    let favBtn = imgWrap.querySelector(".product__fav-btn");
    if (!favBtn) {
      favBtn = document.createElement("button");
      favBtn.type = "button";
      favBtn.className = "product__fav-btn";
      favBtn.setAttribute("data-fav-btn", "1");
      const active = window.isFavorite(title);
      if (active) favBtn.classList.add("is-active");
      favBtn.setAttribute("aria-label", active ? "Ukloni iz omiljenih" : "Dodaj u omiljeno");
      favBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${active ? '#ef4444' : 'none'}" stroke="${active ? '#ef4444' : 'currentColor'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;

      favBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        window.toggleFavorite(title);
      };

      imgWrap.appendChild(favBtn);
    } else {
      const active = window.isFavorite(title);
      favBtn.classList.toggle("is-active", active);
      favBtn.setAttribute("aria-label", active ? "Ukloni iz omiljenih" : "Dodaj u omiljeno");
      const svg = favBtn.querySelector("svg");
      if (svg) {
        svg.setAttribute("fill", active ? "#ef4444" : "none");
        svg.setAttribute("stroke", active ? "#ef4444" : "currentColor");
      }
    }
  });
};

// Inicijalizacija korisničke sesije
async function initAuthSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    if (currentUser) {
      userFavorites = currentUser.user_metadata?.favorites || JSON.parse(localStorage.getItem("magnolia_favs_" + currentUser.id) || "[]");
    } else {
      userFavorites = [];
    }
    updateAuthNavbar();
    window.initFavoritesButtons();
  } catch (err) {
    console.error("Greška pri provjeri sesije:", err);
  }

  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      userFavorites = currentUser.user_metadata?.favorites || JSON.parse(localStorage.getItem("magnolia_favs_" + currentUser.id) || "[]");
    } else {
      userFavorites = [];
    }
    updateAuthNavbar();
    window.updateAllFavButtons();

    if (event === "PASSWORD_RECOVERY") {
      navigateTo("/reset-sifre");
    }
  });

  const logoutBtn = document.getElementById("nav-logout-btn");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      nav?.classList.remove("is-open");
      toggle?.setAttribute("aria-expanded", "false");
      await supabase.auth.signOut();
      currentUser = null;
      userFavorites = [];
      updateAuthNavbar();
      window.updateAllFavButtons();
      window.showToast("Uspješno ste se odjavili.");
      navigateTo("/");
    };
  }
}
initAuthSession();

// Ukloni "index.html" iz URL-a (da bude /#/..., ne /index.html#/.)
if (window.location.pathname.endsWith("/index.html")) {
  const newPath = window.location.pathname.replace(/\/index\.html$/, "/");
  // zadrži hash ako postoji
  window.history.replaceState({}, "", newPath + window.location.hash);
}


document.getElementById("y").textContent = new Date().getFullYear();

// Onemogući zoom na mobilnim uređajima (iOS pinch i multi-touch)
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());

document.addEventListener("touchstart", () => {}, { passive: true });

// Ukloni sticky hover/focus efekte na mobilnim uređajima nakon dodira
document.addEventListener("touchend", (e) => {
  const interactive = e.target.closest("button, a, .btn, .btn-add-cart, .cart-toggle");
  if (interactive) {
    setTimeout(() => {
      interactive.blur();
    }, 100);
  }
}, { passive: true });

document.addEventListener("touchcancel", (e) => {
  const interactive = e.target.closest("button, a, .btn, .btn-add-cart, .cart-toggle");
  if (interactive) {
    interactive.blur();
  }
}, { passive: true });

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

// --- SECRET ADMIN ACCESS ---
let logoClicks = 0;
let lastClickTime = 0;
document.addEventListener("click", (e) => {
  const logo = e.target.closest(".brand-logo-center");
  if (!logo) return;

  const now = Date.now();
  if (now - lastClickTime > 2000) {
    logoClicks = 0;
  }
  
  logoClicks++;
  lastClickTime = now;

  if (logoClicks >= 5) {
    logoClicks = 0;
    const isAdmin = sessionStorage.getItem("isAdmin") === "true";
    const expiry = parseInt(sessionStorage.getItem("adminExpiry") || "0");
    
    if (isAdmin && Date.now() < expiry) {
      navigateTo("/admin");
    } else {
      navigateTo("/admin-login");
    }
  }
});

// --- ADMIN LOGIN LOGIC ---
window.initLoginForm = function() {
  const step1 = document.getElementById("login-step-1");
  const step2 = document.getElementById("login-step-2");
  const sendBtn = document.getElementById("send-code-btn");
  const verifyBtn = document.getElementById("verify-code-btn");
  const resendBtn = document.getElementById("resend-code-btn");
  const codeInput = document.getElementById("2fa-code");
  const status = document.getElementById("login-status");

  if (!sendBtn) return;

  const sendCode = async () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    sessionStorage.setItem("admin_2fa", JSON.stringify({ code, expiry }));
    
    sendBtn.disabled = true;
    sendBtn.textContent = "Sending...";
    status.textContent = "";

    try {
      await emailjs.send("service_wwxmpm7", "template_2fa", {
        to_email: "magnolianaturalbih@gmail.com",
        code: code
      }, "cIwVQboFkKcmA--1Q");
      
      step1.style.display = "none";
      step2.style.display = "block";
      status.style.color = "green";
      status.textContent = "Code sent to your email!";
    } catch (err) {
      console.error("2FA Error");
      status.style.color = "red";
      status.textContent = "Error sending code. Please try again later.";
      
      // Removed DEBUG log for security
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = "Send 2FA Code";
    }
  };

  sendBtn.onclick = sendCode;
  resendBtn.onclick = sendCode;

  verifyBtn.onclick = () => {
    const entered = codeInput.value.trim();
    const stored = JSON.parse(sessionStorage.getItem("admin_2fa") || "{}");

    if (!stored.code || Date.now() > stored.expiry) {
      status.style.color = "red";
      status.textContent = "Code expired. Please resend.";
      return;
    }

    if (entered === stored.code) {
      sessionStorage.setItem("isAdmin", "true");
      sessionStorage.setItem("adminExpiry", (Date.now() + 10 * 60 * 1000).toString());
      sessionStorage.removeItem("admin_2fa");
      navigateTo("/admin");
    } else {
      status.style.color = "red";
      status.textContent = "Invalid code. Try again.";
    }
  };
};

window.initAdminPanel = function() {
  const logoutBtn = document.getElementById("admin-logout");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      sessionStorage.removeItem("isAdmin");
      sessionStorage.removeItem("adminExpiry");
      navigateTo("/");
    };
  }

  // Refresh button logic
  const refreshBtn = document.querySelector(".card .btn--ghost");
  if (refreshBtn && refreshBtn.textContent === "Osvježi") {
    refreshBtn.onclick = () => window.refreshAdminDashboard();
  }

  window.refreshAdminDashboard = async function() {
    const ordersTable = document.getElementById("orders-table-body");
    if (!ordersTable) return;

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      ordersTable.innerHTML = `<tr><td colspan="6" style="padding: 48px; text-align: center; color: red;">Greška pri učitavanju narudžbi.</td></tr>`;
      return;
    }
    
    // Update Stats - Target only div.h1 inside the stats cards
    const stats = document.querySelectorAll(".card div.h1"); 
    if (stats.length >= 3) {
      stats[0].textContent = orders.length; // Ukupno Narudžbi
      stats[1].textContent = orders.filter(o => o.status === "Nova").length; // Nove Narudžbe
      
      // Revenue only from "Završena" orders
      const revenue = orders
        .filter(o => o.status === "Završena")
        .reduce((sum, o) => sum + parseFloat(o.total), 0);
      stats[2].textContent = `${revenue.toFixed(2)} KM`;
    }

    if (orders.length === 0) {
      ordersTable.innerHTML = `
        <tr>
          <td colspan="6" style="padding: 48px; text-align: center; color: var(--muted);">
            <p>Trenutno nema aktivnih narudžbi.</p>
          </td>
        </tr>`;
      return;
    }

    ordersTable.innerHTML = orders.map(order => `
      <tr style="border-bottom: 1px solid var(--line);">
        <td style="padding: 16px; font-weight: 600; color: var(--navy);">${order.id}</td>
        <td style="padding: 16px;">
          <div style="font-weight: 600;">${order.customer}</div>
          <div class="muted" style="font-size: 0.8rem;">${order.email}</div>
        </td>
        <td style="padding: 16px;">${order.date}</td>
        <td style="padding: 16px; font-weight: 600;">${order.total} KM</td>
        <td style="padding: 16px;">
          <span style="background: ${order.status === "Nova" ? "#fef3c7" : "#dcfce7"}; color: ${order.status === "Nova" ? "#92400e" : "#166534"}; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
            ${order.status}
          </span>
        </td>
        <td style="padding: 16px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn--ghost admin-action-btn" style="padding: 4px 8px; font-size: 0.8rem;" data-action="view" data-id="${order.id}">Detalji</button>
          ${order.status === "Nova" ? `
            <button class="btn btn--primary admin-action-btn" style="padding: 4px 8px; font-size: 0.8rem; background: #10b981;" data-action="complete" data-id="${order.id}">Završi</button>
          ` : ""}
          <button class="btn btn--ghost admin-action-btn" style="padding: 4px 8px; font-size: 0.8rem; color: #ef4444; border-color: #fecaca;" data-action="delete" data-id="${order.id}">Obriši</button>
        </td>
      </tr>
    `).join("");
  };

  // Event delegation for admin actions (more reliable on Safari mobile)
  const ordersTable = document.getElementById("orders-table-body");
  if (ordersTable) {
    ordersTable.onclick = (e) => {
      const btn = e.target.closest(".admin-action-btn");
      if (!btn) return;
      
      const action = btn.dataset.action;
      const orderId = btn.dataset.id;
      
      if (action === "view") window.viewOrder(orderId);
      if (action === "complete") window.markAsCompleted(orderId);
      if (action === "delete") window.deleteOrder(orderId);
    };
  }

  window.refreshAdminDashboard();
};

// Global management functions
window.markAsCompleted = async function(orderId) {
  setTimeout(async () => {
    if (!confirm("Da li ste sigurni da želite označiti ovu narudžbu kao završenu?")) return;
    
    const { error } = await supabase
      .from("orders")
      .update({ status: "Završena" })
      .eq("id", orderId);

    if (error) {
      alert("Greška pri ažuriranju narudžbe.");
      return;
    }

    if (typeof window.refreshAdminDashboard === "function") {
      window.refreshAdminDashboard();
    }
  }, 10);
};

window.deleteOrder = async function(orderId) {
  setTimeout(async () => {
    if (!confirm("Da li ste sigurni da želite obrisati ovu narudžbu?")) return;
    
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      alert("Greška pri brisanju narudžbe.");
      return;
    }

    if (typeof window.refreshAdminDashboard === "function") {
      window.refreshAdminDashboard();
    }
  }, 10);
};

// Global for onclick
window.viewOrder = async function(orderId) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    alert("Greška pri učitavanju detalja narudžbe.");
    return;
  }

  alert(`Detalji narudžbe ${order.id}:\n\nKupac: ${order.customer}\nAdresa: ${order.address}\nTelefon: ${order.phone}\nProizvodi: ${order.items.map(i => `${i.name} (${i.qty})`).join(", ")}\n\nUkupno: ${order.total} KM`);
};

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

// --- SHOPPING CART LOGIC ---
let cart = JSON.parse(localStorage.getItem("magnolia_cart") || "[]");

function saveCart() {
  localStorage.setItem("magnolia_cart", JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  const cartItemsEl = document.getElementById("cart-items");
  const cartCountEl = document.getElementById("cart-count");
  const cartSubtotalEl = document.getElementById("cart-subtotal");
  const cartShippingEl = document.getElementById("cart-shipping");
  const cartTotalEl = document.getElementById("cart-total-price");
  
  if (!cartItemsEl) return;

  // Update count bubble
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  cartCountEl.textContent = totalItems;
  cartCountEl.style.display = totalItems > 0 ? "flex" : "none";

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="muted" style="padding: 20px; text-align: center;">Korpa je prazna.</p>`;
    cartSubtotalEl.textContent = "0.00 KM";
    cartShippingEl.textContent = "0.00 KM";
    cartTotalEl.textContent = "0.00 KM";
    return;
  }

  let subtotalKM = 0;
  cartItemsEl.innerHTML = cart.map((item, index) => {
    // Parse price string "25.00 KM" -> 25.0
    const priceMatch = item.price.match(/[\d.]+/);
    const priceNum = priceMatch ? parseFloat(priceMatch[0]) : 0;
    subtotalKM += priceNum * item.qty;

    return `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}" class="cart-item__img">
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">${item.price}</div>
          <div class="cart-item__qty">
            <button class="cart-qty-btn" onclick="updateQty(${index}, -1)">-</button>
            <span>${item.qty}</span>
            <button class="cart-qty-btn" onclick="updateQty(${index}, 1)">+</button>
            <button class="cart-item__remove" onclick="removeFromCart(${index})">Ukloni</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const shippingKM = cart.length === 0 ? 0 : 11.00;
  const totalKM = subtotalKM + shippingKM;

  cartSubtotalEl.textContent = `${subtotalKM.toFixed(2)} KM`;
  cartShippingEl.textContent = `${shippingKM.toFixed(2)} KM`;
  cartTotalEl.textContent = `${totalKM.toFixed(2)} KM`;
}

window.showToast = function(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-leaving");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 2500);
};

window.addToCart = function(product, btn) {
  const wasEmpty = cart.length === 0;
  const existing = cart.find(item => item.name === product.name);
  
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  
  saveCart();
  
  // Show button feedback
  if (btn) {
    btn.classList.add("is-success");
    setTimeout(() => {
      btn.classList.remove("is-success");
    }, 2000);
  }

  // Show toast confirmation
  window.showToast("Proizvod dodan u korpu");

  // Open cart drawer automatically ONLY for the very first item added
  if (wasEmpty) {
    window.openCart();
  }
};

window.openCart = function() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
};

window.closeCart = function() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  const isAnyModalOpen = document.querySelector(".modal.is-open");
  if (!isAnyModalOpen) {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }
};

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  saveCart();
  if (cart.length === 0) {
    window.closeCart();
  }
};

window.updateQty = function(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
  if (cart.length === 0) {
    window.closeCart();
  }
};

function initCart() {
  const drawer = document.getElementById("cart-drawer");
  const toggle = document.getElementById("cart-toggle");
  const closeBtns = document.querySelectorAll("[data-cart-close]");

  toggle?.addEventListener("click", () => {
    window.openCart();
  });

  closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      window.closeCart();
    });
  });

  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn?.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Korpa je prazna!");
      return;
    }
    window.closeCart();
    navigateTo("/checkout");
  });

  // Prevent background touch scrolling on drawer overlay
  drawer?.querySelector(".cart-drawer__overlay")?.addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, { passive: false });

  // Handle "Add to Cart" clicks on product cards (event delegation)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-add-cart");
    if (!btn) return;
    
    e.stopPropagation(); // prevent modal opening
    
    const productEl = btn.closest(".product");
    if (!productEl) return;

    const product = {
      name: productEl.dataset.title,
      price: productEl.dataset.price,
      img: productEl.dataset.img
    };
    
    window.addToCart(product, btn);
  });

  updateCartUI();
}

initCart();

// --- CHECKOUT LOGIC ---
window.initCheckout = function() {
  const itemsEl = document.getElementById("checkout-items");
  const subtotalEl = document.getElementById("checkout-subtotal");
  const shippingEl = document.getElementById("checkout-shipping");
  const totalEl = document.getElementById("checkout-total");
  const form = document.getElementById("checkout-form");

  if (!itemsEl || cart.length === 0) {
    if (window.location.hash === "#/checkout") navigateTo("/proizvodi");
    return;
  }

  let subtotal = 0;
  itemsEl.innerHTML = cart.map(item => {
    const priceNum = parseFloat(item.price.match(/[\d.]+/)[0]);
    subtotal += priceNum * item.qty;
    return `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.95rem;">
        <span>${item.name} x ${item.qty}</span>
        <span style="font-weight: 600;">${(priceNum * item.qty).toFixed(2)} KM</span>
      </div>
    `;
  }).join("");

  const shipping = 11.00;
  if (shippingEl) shippingEl.textContent = `${shipping.toFixed(2)} KM`;
  subtotalEl.textContent = `${subtotal.toFixed(2)} KM`;
  totalEl.textContent = `${(subtotal + shipping).toFixed(2)} KM`;

  // Auto-fill logged-in customer info if available
  if (currentUser && form) {
    const meta = currentUser.user_metadata || {};
    if (form.elements["firstname"] && !form.elements["firstname"].value && meta.first_name) {
      form.elements["firstname"].value = meta.first_name;
    }
    if (form.elements["lastname"] && !form.elements["lastname"].value && meta.last_name) {
      form.elements["lastname"].value = meta.last_name;
    }
    if (form.elements["email"] && !form.elements["email"].value && currentUser.email) {
      form.elements["email"].value = currentUser.email;
    }
  }

  let isSubmitting = false;

  form.onsubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById("checkout-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.7";
      submitBtn.style.cursor = "not-allowed";
    }
    isSubmitting = true;

    const formData = new FormData(form);
    const orderData = {
      id: "ORD-" + Date.now().toString().slice(-6),
      date: new Date().toLocaleDateString("bs-BA"),
      customer: `${formData.get("firstname")} ${formData.get("lastname")}`,
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: `${formData.get("address")}, ${formData.get("city")} ${formData.get("zip")}`,
      items: [...cart],
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      total: (subtotal + shipping).toFixed(2),
      status: "Nova"
    };

    const modal = document.getElementById("order-status-modal");
    const confirmView = document.getElementById("order-modal-confirm");
    const loadingView = document.getElementById("order-modal-loading");
    const successView = document.getElementById("order-modal-success");
    const errorView = document.getElementById("order-modal-error");

    const confirmCustomer = document.getElementById("order-confirm-customer");
    const confirmAddress = document.getElementById("order-confirm-address");
    const confirmTotal = document.getElementById("order-confirm-total");
    const confirmAcceptBtn = document.getElementById("order-confirm-accept-btn");
    const confirmCancelBtn = document.getElementById("order-confirm-cancel-btn");

    if (!modal || !confirmView) {
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
      return;
    }

    const resetSubmitBtn = () => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
      }
      isSubmitting = false;
    };

    const closeModal = () => {
      modal.classList.remove("is-open");
      modal.style.display = "none";
      resetSubmitBtn();
    };

    // Popuni podatke u confirmation view
    if (confirmCustomer) confirmCustomer.textContent = orderData.customer;
    if (confirmAddress) confirmAddress.textContent = `${formData.get("address")}, ${formData.get("city")}`;
    if (confirmTotal) confirmTotal.textContent = `${orderData.total} KM`;

    // Prikaz confirmation moda
    confirmView.style.display = "block";
    loadingView.style.display = "none";
    successView.style.display = "none";
    errorView.style.display = "none";

    modal.classList.add("is-open");
    modal.style.display = "flex";

    // Ako korisnik otkaže - samo skloni modal
    if (confirmCancelBtn) {
      confirmCancelBtn.onclick = () => {
        closeModal();
      };
    }

    const overlay = modal.querySelector(".modal__overlay");
    if (overlay) {
      overlay.onclick = () => {
        if (confirmView.style.display !== "none" || errorView.style.display !== "none") {
          closeModal();
        }
      };
    }

    // Ako prihvati - prikaži loading modal i pošalji u bazu
    if (confirmAcceptBtn) {
      confirmAcceptBtn.onclick = async () => {
        confirmView.style.display = "none";
        loadingView.style.display = "block";

        try {
          const { error } = await supabase.from("orders").insert([orderData]);

          if (error) throw error;

          // SUCCESS STATE
          loadingView.style.display = "none";
          successView.style.display = "block";

          const detailsEl = document.getElementById("order-success-details");
          if (detailsEl) {
            detailsEl.innerHTML = `
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="muted">Broj narudžbe:</span>
                <strong style="color: var(--navy);">${orderData.id}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="muted">Kupac:</span>
                <strong>${orderData.customer}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="muted">Telefon:</span>
                <strong>${orderData.phone}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span class="muted">Adresa za dostavu:</span>
                <strong>${orderData.address}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--line); font-size: 1.05rem;">
                <span style="font-weight: 700; color: var(--navy);">Ukupno za platiti:</span>
                <strong style="color: var(--gold); font-size: 1.15rem;">${orderData.total} KM</strong>
              </div>
              <div style="margin-top: 10px; font-size: 0.8rem; color: var(--muted); text-align: center; background: rgba(11,27,58,0.04); padding: 6px; border-radius: 8px;">
                Plaćanje pouzećem (gotovinom prilikom preuzimanja pošiljke)
              </div>
            `;
          }

          // Clear cart
          cart = [];
          saveCart();

          const successDoneBtn = document.getElementById("order-success-close-btn");
          if (successDoneBtn) {
            successDoneBtn.onclick = () => {
              closeModal();
              navigateTo("/");
            };
          }
        } catch (err) {
          console.error("Greška pri slanju narudžbe:", err);
          loadingView.style.display = "none";
          errorView.style.display = "block";

          const retryBtn = document.getElementById("order-error-retry-btn");
          const closeErrBtn = document.getElementById("order-error-close-btn");

          if (retryBtn) {
            retryBtn.onclick = () => {
              confirmAcceptBtn.click();
            };
          }

          if (closeErrBtn) {
            closeErrBtn.onclick = () => {
              closeModal();
            };
          }
        }
      };
    }
  };
};

function initProductModal() {
  const modal = document.getElementById("product-modal");
  if (!modal) return;

  const titleEl = document.getElementById("modal-title");
  const priceEl = document.getElementById("modal-price");
  const descEl = document.getElementById("modal-desc");
  const imgEl = document.getElementById("modal-img");

  const dialogEl = modal.querySelector(".modal__dialog");
  const contentEl = modal.querySelector(".modal__content");
  const textEl = modal.querySelector(".modal__text");

  const resetModalScroll = () => {
    modal.scrollTop = 0;
    dialogEl?.scrollTo(0, 0);
    contentEl?.scrollTo(0, 0);
    textEl?.scrollTo(0, 0);
    descEl?.scrollTo(0, 0);
  };

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
    const price = productEl.dataset.price || "";
    const desc = productEl.dataset.desc || "";
    const img = productEl.dataset.img || "";

    titleEl.textContent = title;

    if (priceEl) {
      priceEl.textContent = price;
    }

    descEl.innerHTML = formatDesc(desc);

    imgEl.src = img;
    imgEl.alt = title;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Handle modal "Add to Cart"
    const addBtn = document.getElementById("modal-add-to-cart");
    addBtn.onclick = (e) => {
      e.stopPropagation();
      window.addToCart({
        name: title,
        price: price,
        img: img
      }, addBtn);
      
      // We no longer close the modal automatically to allow the user to keep browsing or reading
    };

    // Handle modal "Favorite"
    const modalFavBtn = document.getElementById("modal-fav-btn");
    const modalFavText = document.getElementById("modal-fav-text");
    if (modalFavBtn) {
      const isFav = window.isFavorite(title);
      modalFavBtn.classList.toggle("is-active", isFav);
      if (modalFavText) modalFavText.textContent = isFav ? "Ukloni iz omiljenih" : "Dodaj u omiljeno";
      const svg = modalFavBtn.querySelector("svg");
      if (svg) {
        svg.setAttribute("fill", isFav ? "#ef4444" : "none");
        svg.setAttribute("stroke", isFav ? "#ef4444" : "currentColor");
      }

      modalFavBtn.onclick = (e) => {
        e.stopPropagation();
        window.toggleFavorite(title);
        const nowFav = window.isFavorite(title);
        modalFavBtn.classList.toggle("is-active", nowFav);
        if (modalFavText) modalFavText.textContent = nowFav ? "Ukloni iz omiljenih" : "Dodaj u omiljeno";
        if (svg) {
          svg.setAttribute("fill", nowFav ? "#ef4444" : "none");
          svg.setAttribute("stroke", nowFav ? "#ef4444" : "currentColor");
        }
      };
    }

    requestAnimationFrame(() => {
      resetModalScroll();
    });
  };

  const closeModal = () => {
    resetModalScroll();
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

const scrollBtn = document.getElementById("scrollTopBtn");
const cartToggle = document.getElementById("cart-toggle");

let isScrolledPast = false;
let scrollTicking = false;

window.addEventListener("scroll", () => {
  if (!scrollTicking) {
    window.requestAnimationFrame(() => {
      const pastThreshold = window.scrollY > 280;
      if (pastThreshold !== isScrolledPast) {
        isScrolledPast = pastThreshold;
        if (pastThreshold) {
          scrollBtn?.classList.add("show");
          cartToggle?.classList.add("is-raised");
        } else {
          scrollBtn?.classList.remove("show");
          cartToggle?.classList.remove("is-raised");
        }
      }
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}, { passive: true });

scrollBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});


// --- CUSTOMER AUTH PAGE CONTROLLER ---
window.initAuthPage = function() {
  const tabLogin = document.getElementById("auth-tab-login");
  const tabRegister = document.getElementById("auth-tab-register");
  const tabsWrap = document.getElementById("auth-tabs-wrap");
  const formLogin = document.getElementById("login-form");
  const formRegister = document.getElementById("register-form");
  const formForgot = document.getElementById("forgot-form");
  const btnForgotLink = document.getElementById("btn-forgot-password-link");
  const btnBackToLogin = document.getElementById("btn-back-to-login");
  const alertBox = document.getElementById("auth-alert");
  const mainTitle = document.getElementById("auth-main-title");
  const mainDesc = document.getElementById("auth-main-desc");

  if (!formLogin) return;

  const showAlert = (msg, type = "error") => {
    if (!alertBox) return;
    alertBox.className = `auth-alert--${type}`;
    alertBox.innerHTML = msg;
    alertBox.style.display = "block";
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const hideAlert = () => {
    if (alertBox) alertBox.style.display = "none";
  };

  // Tab switching
  const setTab = (tab) => {
    hideAlert();
    if (tab === "login") {
      tabLogin?.classList.add("is-active");
      tabRegister?.classList.remove("is-active");
      if (formLogin) formLogin.style.display = "block";
      if (formRegister) formRegister.style.display = "none";
      if (formForgot) formForgot.style.display = "none";
      if (tabsWrap) tabsWrap.style.display = "flex";
      if (mainTitle) mainTitle.textContent = "Prijava";
      if (mainDesc) mainDesc.textContent = "Prijavite se na vaš Magnolia korisnički račun.";
    } else if (tab === "register") {
      tabRegister?.classList.add("is-active");
      tabLogin?.classList.remove("is-active");
      if (formRegister) formRegister.style.display = "block";
      if (formLogin) formLogin.style.display = "none";
      if (formForgot) formForgot.style.display = "none";
      if (tabsWrap) tabsWrap.style.display = "flex";
      if (mainTitle) mainTitle.textContent = "Registracija";
      if (mainDesc) mainDesc.textContent = "Kreirajte račun za brže naručivanje i omiljene proizvode.";
    } else if (tab === "forgot") {
      if (tabsWrap) tabsWrap.style.display = "none";
      if (formLogin) formLogin.style.display = "none";
      if (formRegister) formRegister.style.display = "none";
      if (formForgot) formForgot.style.display = "block";
      if (mainTitle) mainTitle.textContent = "Oporavak Lozinke";
      if (mainDesc) mainDesc.textContent = "Zatražite link za postavljanje nove lozinke.";
    }
  };

  if (tabLogin) tabLogin.onclick = () => setTab("login");
  if (tabRegister) tabRegister.onclick = () => setTab("register");
  if (btnForgotLink) btnForgotLink.onclick = () => setTab("forgot");
  if (btnBackToLogin) btnBackToLogin.onclick = () => setTab("login");

  // Show/Hide password toggles
  document.querySelectorAll(".pwd-toggle").forEach((btn) => {
    btn.onclick = () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      } else {
        input.type = "password";
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      }
    };
  });

  // SIGN IN
  formLogin.onsubmit = async (e) => {
    e.preventDefault();
    hideAlert();
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const submitBtn = document.getElementById("login-submit-btn");

    if (!email || !password) {
      showAlert("Molimo unesite vašu email adresu i lozinku.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Prijavljivanje...";

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          showAlert(`
            <strong>Vaš email još nije potvrđen.</strong><br>
            Prilikom registracije poslali smo vam link za potvrdu na email.<br>
            Provjerite vaš inbox (i spam folder).<br>
            <button id="resend-conf-btn" type="button" class="btn btn--ghost" style="margin-top: 10px; padding: 6px 14px; font-size: 0.85rem;">
              Pošalji potvrdni email ponovo
            </button>
          `, "error");

          const resendBtn = document.getElementById("resend-conf-btn");
          if (resendBtn) {
            resendBtn.onclick = async () => {
              resendBtn.disabled = true;
              resendBtn.textContent = "Slanje...";
              const { error: resendErr } = await supabase.auth.resend({
                type: "signup",
                email: email
              });
              if (resendErr) {
                showAlert("Greška pri slanju: " + resendErr.message, "error");
              } else {
                showAlert("Potvrdni email je ponovo poslan! Molimo provjerite vaš inbox.", "success");
              }
            };
          }
          return;
        }

        if (error.message.includes("Invalid login credentials")) {
          showAlert("Pogrešan email ili lozinka. Molimo pokušajte ponovo.");
          return;
        }

        showAlert(error.message);
        return;
      }

      // Success
      currentUser = data.user;
      userFavorites = currentUser.user_metadata?.favorites || JSON.parse(localStorage.getItem("magnolia_favs_" + currentUser.id) || "[]");
      updateAuthNavbar();
      window.updateAllFavButtons();
      showAlert("✅ Uspješna prijava! Dobrodošli nazad.", "success");

      setTimeout(() => {
        navigateTo("/omiljeno");
      }, 500);

    } catch (err) {
      showAlert("Došlo je do greške prilikom prijave. Pokušajte ponovo.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Prijavi se";
    }
  };

  // SIGN UP
  formRegister.onsubmit = async (e) => {
    e.preventDefault();
    hideAlert();

    const firstName = document.getElementById("reg-firstname")?.value.trim();
    const lastName = document.getElementById("reg-lastname")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const confirmPassword = document.getElementById("reg-confirm-password")?.value;
    const submitBtn = document.getElementById("reg-submit-btn");

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      showAlert("Molimo popunite sva obavezna polja.");
      return;
    }

    if (password.length < 6) {
      showAlert("Lozinka mora sadržavati najmanje 6 znakova.");
      return;
    }

    if (password !== confirmPassword) {
      showAlert("Lozinke se ne podudaraju. Molimo provjerite unos.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Kreiranje računa...";

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            favorites: []
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          showAlert("Korisnik sa ovom email adresom već postoji. Možete se odmah prijaviti.");
        } else {
          showAlert(error.message);
        }
        return;
      }

      showAlert(`
        <strong>✅ Uspješna registracija!</strong><br>
        Poslali smo sigurnosni potvrdni link na vaš email: <strong>${email}</strong>.<br>
        Molimo otvorite vaš email i kliknite na link kako biste aktivirali svoj račun.
      `, "success");

      formRegister.reset();

    } catch (err) {
      showAlert("Došlo je do greške prilikom registracije. Pokušajte ponovo.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Kreiraj račun";
    }
  };

  // FORGOT PASSWORD
  formForgot.onsubmit = async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById("forgot-email")?.value.trim();
    const submitBtn = document.getElementById("forgot-submit-btn");

    if (!email) {
      showAlert("Molimo unesite vašu email adresu.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Slanje linka...";

    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });

      if (error) {
        showAlert("Greška: " + error.message);
        return;
      }

      showAlert(`
        <strong>✅ Zahtjev za reset lozinke je poslan!</strong><br>
        Ako nalog sa emailom <strong>${email}</strong> postoji u sistemu, poslan vam je link za postavljanje nove lozinke. Molimo provjerite vaš inbox (i spam).
      `, "success");

      formForgot.reset();

    } catch (err) {
      showAlert("Došlo je do greške. Pokušajte ponovo.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Pošalji link za reset";
    }
  };
};

// --- RESET PASSWORD CONTROLLER ---
window.initResetPasswordPage = function() {
  const form = document.getElementById("reset-pwd-form");
  const newPwdInput = document.getElementById("reset-password-input");
  const confirmInput = document.getElementById("reset-confirm-input");
  const submitBtn = document.getElementById("reset-submit-btn");
  const alertBox = document.getElementById("reset-alert");

  if (!form) return;

  const showAlert = (msg, type = "error") => {
    if (!alertBox) return;
    alertBox.className = `auth-alert--${type}`;
    alertBox.innerHTML = msg;
    alertBox.style.display = "block";
  };

  document.querySelectorAll(".pwd-toggle").forEach((btn) => {
    btn.onclick = () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
    };
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const newPwd = newPwdInput?.value;
    const confirmPwd = confirmInput?.value;

    if (!newPwd || !confirmPwd) {
      showAlert("Molimo popunite sva polja.");
      return;
    }

    if (newPwd.length < 6) {
      showAlert("Lozinka mora imati najmanje 6 znakova.");
      return;
    }

    if (newPwd !== confirmPwd) {
      showAlert("Lozinke se ne podudaraju.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Ažuriranje lozinke...";

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPwd
      });

      if (error) {
        showAlert("Greška: " + error.message);
        return;
      }

      showAlert("✅ Vaša lozinka je uspješno promijenjena! Preusmjeravanje...", "success");
      setTimeout(() => {
        navigateTo("/omiljeno");
      }, 1200);

    } catch (err) {
      showAlert("Greška pri ažuriranju lozinke. Pokušajte ponovo.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Ažuriraj lozinku";
    }
  };
};

// --- FAVORITES PAGE CONTROLLER ---
window.initFavoritesPage = function() {
  const loadingEl = document.getElementById("favorites-loading");
  const notLoggedInEl = document.getElementById("favorites-not-logged-in");
  const emptyEl = document.getElementById("favorites-empty");
  const gridEl = document.getElementById("favorites-grid");
  const countBadge = document.getElementById("favorites-count-badge");
  const countNum = document.getElementById("favorites-count-num");

  if (!loadingEl) return;

  // 1. Not logged in
  if (!currentUser) {
    loadingEl.style.display = "none";
    if (notLoggedInEl) notLoggedInEl.style.display = "block";
    if (emptyEl) emptyEl.style.display = "none";
    if (gridEl) gridEl.style.display = "none";
    if (countBadge) countBadge.style.display = "none";
    return;
  }

  // 2. Logged in
  if (notLoggedInEl) notLoggedInEl.style.display = "none";
  loadingEl.style.display = "none";

  if (userFavorites.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    if (gridEl) gridEl.style.display = "none";
    if (countBadge) countBadge.style.display = "none";
    return;
  }

  // 3. Has favorites
  if (emptyEl) emptyEl.style.display = "none";
  if (countBadge) {
    countBadge.style.display = "inline-block";
    if (countNum) countNum.textContent = userFavorites.length;
  }

  if (!gridEl) return;
  gridEl.style.display = "grid";

  // Filter products matching userFavorites
  const favProducts = PRODUCTS.filter((p) => userFavorites.includes(p.title));

  gridEl.innerHTML = favProducts.map((p) => `
    <article class="product"
      data-title="${p.title}"
      data-img="${p.img}"
      data-price="${p.price}"
      data-desc="${p.desc.replace(/"/g, '&quot;')}"
    >
      <div class="product__image">
        <img src="${p.img}" alt="${p.title}">
        <button class="product__fav-btn is-active" type="button" aria-label="Ukloni iz omiljenih" data-fav-btn>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      <div class="product__body">
        <h3 class="product__name">${p.title}</h3>
        <button class="btn-add-cart">
          <span class="btn-add-cart__text">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            Dodaj u korpu
          </span>
          <span class="btn-add-cart__check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </span>
        </button>
      </div>
    </article>
  `).join("");

  // Attach favorite removal click listener directly
  gridEl.querySelectorAll(".product__fav-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const card = btn.closest(".product");
      const title = card?.dataset.title;
      if (title) {
        window.toggleFavorite(title);
      }
    };
  });
};

if (!window.location.hash) window.location.hash = "#/";
router();