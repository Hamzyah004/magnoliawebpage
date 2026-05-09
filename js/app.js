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
      navigateTo("/login");
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

  window.refreshAdminDashboard = function() {
    const ordersTable = document.getElementById("orders-table-body");
    if (!ordersTable) return;

    const orders = JSON.parse(localStorage.getItem("magnolia_orders") || "[]");
    
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
window.markAsCompleted = function(orderId) {
  setTimeout(() => {
    if (!confirm("Da li ste sigurni da želite označiti ovu narudžbu kao završenu?")) return;
    
    const orders = JSON.parse(localStorage.getItem("magnolia_orders") || "[]");
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = "Završena";
      localStorage.setItem("magnolia_orders", JSON.stringify(orders));
      if (typeof window.refreshAdminDashboard === "function") {
        window.refreshAdminDashboard();
      }
    }
  }, 10);
};

window.deleteOrder = function(orderId) {
  setTimeout(() => {
    if (!confirm("Da li ste sigurni da želite obrisati ovu narudžbu?")) return;
    
    let orders = JSON.parse(localStorage.getItem("magnolia_orders") || "[]");
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem("magnolia_orders", JSON.stringify(orders));
    if (typeof window.refreshAdminDashboard === "function") {
      window.refreshAdminDashboard();
    }
  }, 10);
};

// Global for onclick
window.viewOrder = function(orderId) {
  const orders = JSON.parse(localStorage.getItem("magnolia_orders") || "[]");
  const order = orders.find(o => o.id === orderId);
  if (order) {
    alert(`Detalji narudžbe ${order.id}:\n\nKupac: ${order.customer}\nAdresa: ${order.address}\nTelefon: ${order.phone}\nProizvodi: ${order.items.map(i => `${i.name} (${i.qty})`).join(", ")}\n\nUkupno: ${order.total} KM`);
  }
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

  const shippingKM = subtotalKM >= 99 ? 0 : 11.00;
  const totalKM = subtotalKM + shippingKM;

  cartSubtotalEl.textContent = `${subtotalKM.toFixed(2)} KM`;
  cartShippingEl.textContent = shippingKM === 0 ? "BESPLATNO" : `${shippingKM.toFixed(2)} KM`;
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

  // Show toast confirmation (only if it's NOT the first item)
  if (!wasEmpty) {
    window.showToast("Proizvod dodan u korpu");
  }

  // Open cart drawer automatically ONLY for the very first item added
  if (wasEmpty) {
    document.getElementById("cart-drawer").classList.add("is-open");
    // Show shipping modal
    document.getElementById("shipping-modal").classList.add("is-open");
  }
};

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  saveCart();
};

window.updateQty = function(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
};

function initCart() {
  const drawer = document.getElementById("cart-drawer");
  const toggle = document.getElementById("cart-toggle");
  const closeBtns = document.querySelectorAll("[data-cart-close]");

  toggle?.addEventListener("click", () => {
    drawer.classList.add("is-open");
  });

  closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      drawer.classList.remove("is-open");
    });
  });

  const checkoutBtn = document.getElementById("checkout-btn");
  checkoutBtn?.addEventListener("click", () => {
    if (cart.length === 0) {
      alert("Korpa je prazna!");
      return;
    }
    drawer.classList.remove("is-open");
    navigateTo("/checkout");
  });

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

  // Handle shipping modal close buttons
  document.querySelectorAll("#shipping-modal [data-modal-close]").forEach(btn => {
    btn.onclick = () => {
      document.getElementById("shipping-modal").classList.remove("is-open");
    };
  });

  updateCartUI();
}

initCart();

// --- CHECKOUT LOGIC ---
window.initCheckout = function() {
  const itemsEl = document.getElementById("checkout-items");
  const subtotalEl = document.getElementById("checkout-subtotal");
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

  const shipping = subtotal >= 99 ? 0 : 11;
  subtotalEl.textContent = `${subtotal.toFixed(2)} KM`;
  totalEl.textContent = `${(subtotal + shipping).toFixed(2)} KM`;

  form.onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const orderData = {
      id: "ORD-" + Date.now().toString().slice(-6),
      date: new Date().toLocaleDateString("bs-BA"),
      customer: `${formData.get("firstname")} ${formData.get("lastname")}`,
      email: formData.get("email"),
      phone: formData.get("phone"),
      address: `${formData.get("address")}, ${formData.get("city")} ${formData.get("zip")}`,
      items: cart,
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      total: (subtotal + shipping).toFixed(2),
      status: "Nova"
    };

    // Save order to localStorage
    const orders = JSON.parse(localStorage.getItem("magnolia_orders") || "[]");
    orders.unshift(orderData);
    localStorage.setItem("magnolia_orders", JSON.stringify(orders));

    // Clear cart
    cart = [];
    saveCart();

    alert("Hvala vam! Vaša narudžba je uspješno primljena.");
    navigateTo("/");
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

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    scrollBtn.classList.add("show");
    cartToggle?.classList.add("is-raised");
  } else {
    scrollBtn.classList.remove("show");
    cartToggle?.classList.remove("is-raised");
  }
});

scrollBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});


if (!window.location.hash) window.location.hash = "#/";
router();