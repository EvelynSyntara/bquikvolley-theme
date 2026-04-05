/* ============================================================
   BQUIK VOLLEY — theme.js
   Vanilla JS, no jQuery, ES2020+
   ============================================================ */

'use strict';

/* ── Helpers ──────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
const off = (el, ev, fn) => el && el.removeEventListener(ev, fn);
const emit = (el, name, detail = {}) =>
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

/* ── 1. Header: transparent → solid on scroll ────────────── */
function initHeader() {
  const header = $('.site-header');
  if (!header) return;

  const announcement = $('.announcement-bar');
  const announcementH = announcement ? announcement.offsetHeight : 0;
  let ticking = false;

  function updateHeader() {
    const scrolled = window.scrollY > 20;
    header.classList.toggle('is-transparent', !scrolled);
    header.classList.toggle('is-solid', scrolled);

    // Push header below announcement bar when at top
    if (announcement) {
      const offset = Math.max(0, announcementH - window.scrollY);
      header.style.top = offset + 'px';
    }
  }

  on(window, 'scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => { updateHeader(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  updateHeader();
}

/* ── 2. Mobile Menu ───────────────────────────────────────── */
function initMobileMenu() {
  const toggle = $('.menu-toggle');
  const menu = $('.mobile-menu');
  if (!toggle || !menu) return;

  let isOpen = false;

  function openMenu() {
    isOpen = true;
    toggle.classList.add('is-open');
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    isOpen = false;
    toggle.classList.remove('is-open');
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  on(toggle, 'click', () => isOpen ? closeMenu() : openMenu());

  on(document, 'keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  // Close on backdrop click
  on(menu, 'click', e => {
    if (e.target === menu) closeMenu();
  });
}

/* ── 3. Scroll Reveal Animations ─────────────────────────── */
function initScrollReveal() {
  const els = $$('[data-reveal]');
  if (!els.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => observer.observe(el));
}

/* ── 4. Product Card Quick-Add ────────────────────────────── */
function initQuickAdd() {
  on(document, 'click', async e => {
    const btn = e.target.closest('.quick-add-btn');
    if (!btn) return;

    const variantId = btn.dataset.variantId;
    if (!variantId) return;

    btn.classList.add('adding');
    btn.textContent = 'Adding…';

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: 1 })
      });

      if (!res.ok) throw new Error('Add to cart failed');
      const item = await res.json();

      btn.classList.remove('adding');
      btn.classList.add('added');
      btn.textContent = 'Added!';

      await updateCartCount();
      openCartDrawer();

      setTimeout(() => {
        btn.classList.remove('added');
        btn.textContent = 'Quick Add';
      }, 2000);
    } catch (err) {
      btn.classList.remove('adding');
      btn.textContent = 'Try Again';
      console.error(err);
    }
  });
}

/* ── 5. Cart Count ────────────────────────────────────────── */
async function updateCartCount() {
  try {
    const res = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
    const cart = await res.json();
    const counts = $$('[data-cart-count]');
    counts.forEach(el => {
      el.textContent = cart.item_count;
      el.dataset.count = cart.item_count;
      el.classList.add('bump');
      setTimeout(() => el.classList.remove('bump'), 350);
    });
    return cart;
  } catch (err) {
    console.error('Cart update error:', err);
  }
}

/* ── 6. Cart Drawer ───────────────────────────────────────── */
function initCartDrawer() {
  const overlay = $('.cart-drawer-overlay');
  const drawer = $('.cart-drawer');
  if (!overlay || !drawer) return;

  window.openCartDrawer = async function() {
    overlay.classList.add('is-open');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    await refreshCartDrawer();
  };

  window.closeCartDrawer = function() {
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  on(overlay, 'click', e => {
    if (e.target === overlay) closeCartDrawer();
  });

  on(document, 'keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeCartDrawer();
    }
  });

  // Cart icon triggers
  on(document, 'click', e => {
    const btn = e.target.closest('[data-open-cart]');
    if (btn) { e.preventDefault(); openCartDrawer(); }
  });

  on(document, 'click', e => {
    if (e.target.closest('[data-close-cart]')) closeCartDrawer();
  });
}

async function refreshCartDrawer() {
  const drawer = $('.cart-drawer');
  if (!drawer) return;

  try {
    const res = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
    const cart = await res.json();
    renderCartDrawer(cart);
  } catch (err) {
    console.error('Cart refresh error:', err);
  }
}

function renderCartDrawer(cart) {
  const itemsEl = $('.cart-drawer__items');
  const subtotalEl = $('.cart-drawer__subtotal-amount');
  if (!itemsEl) return;

  if (subtotalEl) {
    subtotalEl.textContent = formatMoney(cart.total_price);
  }

  // Free shipping progress bar
  const FREE_SHIPPING_THRESHOLD = 7500; // cents — matches "Free shipping over $75"
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cart.total_price);
  const progress = Math.min(100, (cart.total_price / FREE_SHIPPING_THRESHOLD) * 100);
  const shippingFill = document.getElementById('cart-shipping-fill');
  const shippingText = document.getElementById('cart-shipping-text');
  if (shippingFill) shippingFill.style.width = `${progress}%`;
  if (shippingText) {
    if (remaining === 0) {
      shippingText.innerHTML = `<strong>Free shipping unlocked!</strong>`;
      shippingText.dataset.unlocked = 'true';
    } else {
      shippingText.textContent = `${formatMoney(remaining)} away from free shipping`;
      delete shippingText.dataset.unlocked;
    }
  }

  if (cart.item_count === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty" style="padding: 48px 0; text-align: center;">
        <p style="color:var(--c-text-2); margin-bottom: 24px;">Your cart is empty.</p>
        <a href="/collections/all" class="btn btn-primary" onclick="closeCartDrawer()">Shop Now</a>
      </div>`;
    return;
  }

  itemsEl.innerHTML = cart.items.map(item => `
    <div class="cart-item" style="display:grid;grid-template-columns:80px 1fr;gap:16px;align-items:start;padding-bottom:16px;margin-bottom:16px;border-bottom:1px solid var(--c-border);">
      <a href="${item.url}" onclick="closeCartDrawer()">
        <div class="cart-item__image">
          <img src="${item.featured_image?.url || item.image}" alt="${item.title}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">
        </div>
      </a>
      <div>
        <div class="cart-item__title" style="font-weight:700;font-size:0.9rem;margin-bottom:4px;">${item.product_title}</div>
        ${item.variant_title !== 'Default Title' ? `<div class="cart-item__variant" style="font-size:0.8rem;color:var(--c-text-2);margin-bottom:12px;">${item.variant_title}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div class="qty-control">
            <button class="qty-btn" aria-label="Decrease" data-qty-change="-1" data-line-key="${item.key}">−</button>
            <span style="padding:0 12px;font-weight:600;font-size:0.9rem;">${item.quantity}</span>
            <button class="qty-btn" aria-label="Increase" data-qty-change="1" data-line-key="${item.key}">+</button>
          </div>
          <div style="font-weight:700;">${formatMoney(item.final_line_price)}</div>
        </div>
        <button class="remove-btn" data-remove-key="${item.key}" style="margin-top:8px;font-size:0.75rem;color:var(--c-text-3);background:none;border:none;cursor:pointer;text-decoration:underline;">Remove</button>
      </div>
    </div>
  `).join('');
}

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: window.Shopify?.currency?.active || 'USD' }).format(cents / 100);
}

// Cart quantity + remove delegates
on(document, 'click', async e => {
  const qtyBtn = e.target.closest('[data-qty-change]');
  const removeBtn = e.target.closest('[data-remove-key]');

  if (qtyBtn) {
    const key = qtyBtn.dataset.lineKey;
    const change = parseInt(qtyBtn.dataset.qtyChange, 10);
    const qtyEl = qtyBtn.parentElement.querySelector('span');
    const current = parseInt(qtyEl?.textContent || '1', 10);
    const newQty = Math.max(0, current + change);
    await updateCartItem(key, newQty);
  }

  if (removeBtn) {
    const key = removeBtn.dataset.removeKey;
    await updateCartItem(key, 0);
  }
});

async function updateCartItem(key, quantity) {
  try {
    await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    await updateCartCount();
    await refreshCartDrawer();
  } catch (err) {
    console.error('Cart change error:', err);
  }
}

/* ── 7. Product Page ──────────────────────────────────────── */
function initProductPage() {
  initVariantSelector();
  initGallery();
  initStickyATC();
  initPdpQty();
}

function initPdpQty() {
  const form = $('[data-product-form]');
  if (!form) return;
  on(form, 'click', e => {
    const btn = e.target.closest('[data-pdp-qty]');
    if (!btn) return;
    const display = $('[data-pdp-qty-value]', form);
    if (!display) return;
    const current = parseInt(display.textContent, 10) || 1;
    const next = Math.max(1, current + parseInt(btn.dataset.pdpQty, 10));
    display.textContent = next;
  });
}

function initVariantSelector() {
  const form = $('[data-product-form]');
  if (!form) return;

  const variantData = JSON.parse($('[data-variant-json]')?.textContent || '[]');
  const priceEl = $('[data-product-price]');
  const compareEl = $('[data-compare-price]');
  const atcBtn = $('[data-atc-btn]');
  const stickyAtcPrice = $('[data-sticky-price]');

  let selectedOptions = {};

  // Collect initial selections
  $$('[data-option-name]', form).forEach(input => {
    selectedOptions[input.dataset.optionName] = input.dataset.optionValue || input.value;
  });

  function findVariant() {
    return variantData.find(v =>
      v.options.every((opt, i) => opt === selectedOptions[`option${i+1}`])
    );
  }

  function updateUI(variant) {
    if (!variant) {
      if (atcBtn) {
        const allSelected = variantData[0]?.options.every((_, i) => selectedOptions[`option${i + 1}`]);
        atcBtn.disabled = true;
        atcBtn.textContent = allSelected ? 'Sold Out' : 'Select a size';
        atcBtn.dataset.variantId = '';
      }
      const lowStockEl = $('[data-low-stock]');
      if (lowStockEl) lowStockEl.style.display = 'none';
      return;
    }

    const inStock = variant.available;
    if (atcBtn) {
      atcBtn.disabled = !inStock;
      atcBtn.textContent = inStock ? 'Add to Cart' : 'Sold Out';
      atcBtn.dataset.variantId = variant.id;
    }

    const price = formatMoney(variant.price);
    const compare = variant.compare_at_price > variant.price
      ? formatMoney(variant.compare_at_price)
      : null;

    if (priceEl) priceEl.textContent = price;
    if (compareEl) {
      compareEl.textContent = compare || '';
      compareEl.style.display = compare ? '' : 'none';
    }
    if (stickyAtcPrice) stickyAtcPrice.textContent = price;

    // Low stock indicator
    const lowStockEl = $('[data-low-stock]');
    if (lowStockEl) {
      const qty = variant.inventory_quantity;
      const managed = variant.inventory_management;
      if (managed && qty > 0 && qty <= 5) {
        lowStockEl.textContent = `Only ${qty} left in stock`;
        lowStockEl.style.display = '';
      } else {
        lowStockEl.style.display = 'none';
      }
    }

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);
  }

  // Size / option buttons
  on(form, 'click', e => {
    const sizeBtn = e.target.closest('.size-btn:not(.unavailable)');
    if (!sizeBtn) return;

    const optionGroup = sizeBtn.closest('[data-option-group]');
    const optionName = optionGroup?.dataset.optionGroup;
    if (!optionName) return;

    const wasActive = sizeBtn.classList.contains('active');
    $$('.size-btn', optionGroup).forEach(b => b.classList.remove('active'));
    if (wasActive) {
      delete selectedOptions[optionName];
    } else {
      sizeBtn.classList.add('active');
      selectedOptions[optionName] = sizeBtn.dataset.value;
    }
    updateUI(findVariant());
  });

  // Initial update
  updateUI(findVariant());
}

function initGallery() {
  const gallery = $('[data-product-gallery]');
  if (!gallery) return;

  const mainImg = $('[data-main-image]', gallery);
  const thumbnails = $$('[data-thumb]', gallery);

  thumbnails.forEach(thumb => {
    on(thumb, 'click', () => {
      thumbnails.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      if (mainImg) {
        mainImg.src = thumb.dataset.fullSrc;
        mainImg.alt = thumb.alt;
      }
    });
  });
}

function initStickyATC() {
  const stickyBar = $('.sticky-atc');
  const atcFormArea = $('[data-atc-form-area]');
  if (!stickyBar || !atcFormArea) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      stickyBar.classList.toggle('is-visible', !entry.isIntersecting);
    });
  }, { threshold: 0 });

  observer.observe(atcFormArea);
}

/* ── 8. Add to Cart (PDP) ─────────────────────────────────── */
function initAddToCart() {
  // Listen for form submit. e.target is the <form>; closest() walks up to find
  // the [data-product-form] wrapper div we added to work around Liquid's
  // prohibition on hyphenated tag parameter names.
  on(document, 'submit', async e => {
    const wrapper = e.target.closest('[data-product-form]');
    if (!wrapper) return;
    e.preventDefault();

    const btn = $('[data-atc-btn]', wrapper);
    const variantId = btn?.dataset.variantId;
    if (!variantId || btn?.disabled) return;

    const originalText = btn.textContent.trim();
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ id: variantId, quantity: parseInt($('[data-pdp-qty-value]', wrapper)?.textContent, 10) || 1 })
      });

      if (!res.ok) throw new Error('Failed to add item');

      btn.textContent = 'Added!';
      await updateCartCount();
      openCartDrawer();

      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 2000);
    } catch (err) {
      btn.textContent = 'Error – Try Again';
      btn.disabled = false;
      console.error(err);
    }
  });

  // Sticky ATC — find the actual <form> inside the wrapper div and submit it
  on(document, 'click', e => {
    const btn = e.target.closest('[data-sticky-atc]');
    if (!btn) return;
    const wrapper = $('[data-product-form]');
    const mainForm = wrapper ? $('form', wrapper) : null;
    if (mainForm) mainForm.dispatchEvent(new Event('submit', { bubbles: true }));
  });
}

/* ── 9. Size Guide Modal ──────────────────────────────────── */
function initSizeGuideModal() {
  const modal = $('#size-guide-modal');
  if (!modal) return;

  on(document, 'click', e => {
    if (e.target.closest('[data-open-size-guide]')) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      $('[data-close-modal]', modal)?.focus();
    }
    if (e.target.closest('[data-close-modal]') || e.target === modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });

  on(document, 'keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  });
}

/* ── 10. Product Carousel (drag-to-scroll) ────────────────── */
function initCarousels() {
  $$('.collection-carousel').forEach(carousel => {
    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;

    on(carousel, 'mousedown', e => {
      isDragging = true;
      startX = e.pageX - carousel.offsetLeft;
      scrollLeft = carousel.scrollLeft;
      carousel.style.userSelect = 'none';
    });

    on(carousel, 'mouseleave', () => { isDragging = false; });
    on(carousel, 'mouseup', () => {
      isDragging = false;
      carousel.style.userSelect = '';
    });
    on(carousel, 'mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - carousel.offsetLeft;
      const walk = (x - startX) * 1.5;
      carousel.scrollLeft = scrollLeft - walk;
    });

    // Touch support (already native, just update progress)
    on(carousel, 'scroll', () => updateCarouselProgress(carousel), { passive: true });

    // Prev/Next buttons
    const wrap = carousel.closest('.collection-carousel-wrap');
    const prevBtn = wrap?.querySelector('[data-carousel-prev]');
    const nextBtn = wrap?.querySelector('[data-carousel-next]');

    if (prevBtn && nextBtn) {
      on(prevBtn, 'click', () => {
        carousel.scrollBy({ left: -340, behavior: 'smooth' });
      });
      on(nextBtn, 'click', () => {
        carousel.scrollBy({ left: 340, behavior: 'smooth' });
      });
    }

    updateCarouselProgress(carousel);
  });
}

function updateCarouselProgress(carousel) {
  const wrap = carousel.closest('.collection-carousel-wrap');
  const bar = wrap?.querySelector('.carousel-progress__bar');
  if (!bar) return;

  const maxScroll = carousel.scrollWidth - carousel.clientWidth;
  const progress = maxScroll > 0 ? (carousel.scrollLeft / maxScroll) * 100 : 0;
  bar.style.width = `${Math.max(10, progress)}%`;
}

/* ── 11. Newsletter Form ──────────────────────────────────── */
function initNewsletter() {
  $$('[data-newsletter-form]').forEach(form => {
    on(form, 'submit', async e => {
      e.preventDefault();
      const btn = $('button[type="submit"]', form);
      const input = $('input[type="email"]', form);
      const success = $('[data-success]', form);
      if (!input || !btn) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';

      // Shopify newsletter uses native form submission or Klaviyo etc.
      // Simulate for demo; replace with actual endpoint
      await new Promise(r => setTimeout(r, 800));

      btn.textContent = 'Subscribed!';
      input.value = '';
      if (success) {
        success.classList.add('visible');
        success.textContent = "You're in! Welcome to the BQUIK fam.";
      }

      setTimeout(() => {
        btn.textContent = 'Subscribe';
        btn.disabled = false;
        if (success) success.classList.remove('visible');
      }, 4000);
    });
  });
}

/* ── 12. Cart Page qty ────────────────────────────────────── */
function initCartPage() {
  on(document, 'click', async e => {
    const btn = e.target.closest('[data-cart-qty]');
    if (!btn) return;

    const line = parseInt(btn.dataset.line, 10);
    const change = parseInt(btn.dataset.cartQty, 10);
    const qtyEl = btn.parentElement?.querySelector('[data-qty-display]');
    const current = parseInt(qtyEl?.textContent || '1', 10);
    const newQty = Math.max(0, current + change);

    try {
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ line, quantity: newQty })
      });
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  });
}

/* ── 13. Gallery Zoom (product page) ─────────────────────── */
function initImageZoom() {
  $$('[data-zoomable]').forEach(img => {
    on(img, 'mousemove', e => {
      const rect = img.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.transformOrigin = `${x}% ${y}%`;
    });

    on(img, 'mouseenter', () => { img.style.transform = 'scale(1.5)'; });
    on(img, 'mouseleave', () => {
      img.style.transform = '';
      img.style.transformOrigin = '';
    });
  });
}

/* ── 14. Announcement Bar dismiss + rotation ────────────── */
function initAnnouncementBar() {
  const bar = $('[data-announcement-bar]');
  if (!bar) return;

  const closeBtn = $('[data-dismiss-announcement]', bar);
  if (closeBtn) {
    on(closeBtn, 'click', () => {
      bar.style.maxHeight = bar.offsetHeight + 'px';
      bar.style.transition = 'max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease';
      requestAnimationFrame(() => {
        bar.style.maxHeight = '0';
        bar.style.opacity = '0';
        bar.style.padding = '0';
      });
      sessionStorage.setItem('bquik-announcement-dismissed', '1');
    });
  }

  if (sessionStorage.getItem('bquik-announcement-dismissed')) {
    bar.style.display = 'none';
    return;
  }

  // Rotate messages
  const messages = $$('.announcement-bar__text', bar);
  if (messages.length <= 1) return;

  let current = 0;
  const speed = parseInt(bar.dataset.rotationSpeed, 10) || 4000;

  setInterval(() => {
    messages[current].classList.remove('is-active');
    current = (current + 1) % messages.length;
    messages[current].classList.add('is-active');
  }, speed);
}

/* ── 14b. Stats Count-Up Animation ──────────────────────── */
function initStatsCountUp() {
  const stats = $$('[data-count-to]');
  if (!stats.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.countTo);
      const isDecimal = String(target).includes('.');
      const duration = 1800;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = eased * target;
        el.textContent = isDecimal ? value.toFixed(1) : Math.round(value);
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
      observer.unobserve(el);
    });
  }, { threshold: 0.3 });

  stats.forEach(el => observer.observe(el));
}

/* ── 15. Predictive Search ────────────────────────────────── */
function initSearch() {
  const searchInput = $('[data-search-input]');
  const searchResults = $('[data-search-results]');
  if (!searchInput || !searchResults) return;

  let debounceTimer;

  on(searchInput, 'input', () => {
    clearTimeout(debounceTimer);
    const q = searchInput.value.trim();
    if (q.length < 2) {
      searchResults.innerHTML = '';
      searchResults.hidden = true;
      return;
    }
    debounceTimer = setTimeout(() => fetchSearchResults(q, searchResults), 300);
  });

  on(document, 'click', e => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.hidden = true;
    }
  });
}

async function fetchSearchResults(query, resultsEl) {
  try {
    const res = await fetch(
      `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=5`
    );
    const data = await res.json();
    const products = data.resources?.results?.products || [];

    if (!products.length) {
      resultsEl.innerHTML = `<p style="padding:16px;color:var(--c-text-2)">No results for "${query}"</p>`;
      resultsEl.hidden = false;
      return;
    }

    resultsEl.innerHTML = `
      <ul>
        ${products.map(p => `
          <li>
            <a href="${p.url}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;transition:background 0.15s;">
              <img src="${p.featured_image?.url || ''}" alt="${p.title}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;background:var(--c-bg-2);">
              <div>
                <div style="font-weight:600;font-size:0.875rem;">${p.title}</div>
                <div style="font-size:0.8rem;color:var(--c-text-2);">${p.vendor}</div>
              </div>
            </a>
          </li>
        `).join('')}
        <li style="padding:12px 16px;border-top:1px solid var(--c-border);">
          <a href="/search?q=${encodeURIComponent(query)}" style="font-size:0.875rem;color:var(--c-accent);font-weight:600;">
            View all results for "${query}" →
          </a>
        </li>
      </ul>`;
    resultsEl.hidden = false;
  } catch (err) {
    console.error('Search error:', err);
  }
}

/* ── 16. Product Recommendations ─────────────────────────── */
async function initProductRecommendations() {
  const section = $('[data-recommendations-url]');
  if (!section) return;

  const productId = section.dataset.productId;
  const sectionId = section.dataset.sectionId;
  const limit = section.querySelector('[data-recommendations-target]')
    ?.closest('section')?.dataset.productsToShow || 6;

  if (!productId) return;

  try {
    const res = await fetch(
      `/recommendations/products.json?product_id=${productId}&limit=${limit}&intent=related`
    );
    if (!res.ok) return;
    const data = await res.json();
    const products = data.products;
    if (!products || products.length === 0) {
      section.style.display = 'none';
      return;
    }

    const carousel = section.querySelector('.collection-carousel');
    if (!carousel) return;

    carousel.innerHTML = products.map(p => {
      const img = p.featured_image
        ? `<img src="${p.featured_image.replace(/\.jpg|\.png|\.webp/, '')}_600x.jpg" alt="${p.title}" loading="lazy" class="product-card__img" style="width:100%;height:100%;object-fit:cover;">`
        : '';
      const price = formatMoney(p.price_min);
      const comparePrice = p.compare_at_price_min > p.price_min
        ? `<span class="product-card__price-compare">${formatMoney(p.compare_at_price_min)}</span>` : '';
      const saleBadge = p.compare_at_price_min > p.price_min
        ? `<span class="badge badge-sale">Sale</span>` : '';
      const newBadge = p.tags && (p.tags.includes('new') || p.tags.includes('New'))
        ? `<span class="badge badge-new">New</span>` : '';

      return `
        <div role="listitem" class="product-card-wrap">
          <article class="product-card" aria-label="${p.title}">
            <div class="product-card__media">
              <a href="${p.url}" class="product-card__image-link" tabindex="-1" aria-hidden="true">
                ${img}
              </a>
              <div class="product-card__badges">${saleBadge}${newBadge}</div>
              <div class="product-card__quick-add">
                <a href="${p.url}" class="quick-add-btn">View Options</a>
              </div>
            </div>
            <div class="product-card__info">
              <h3 class="product-card__title">
                <a href="${p.url}" class="product-card__title-link">${p.title}</a>
              </h3>
              <div class="product-card__price">
                <span class="product-card__price-current${p.compare_at_price_min > p.price_min ? ' product-card__price-sale' : ''}">${price}</span>
                ${comparePrice}
              </div>
            </div>
          </article>
        </div>`;
    }).join('');

    // Re-init carousel for new items
    $$('[data-carousel-prev], [data-carousel-next]', section).forEach(btn => {
      const targetId = btn.getAttribute('aria-controls');
      const target = document.getElementById(targetId);
      if (!target) return;
      on(btn, 'click', () => {
        const dir = btn.hasAttribute('data-carousel-prev') ? -340 : 340;
        target.scrollBy({ left: dir, behavior: 'smooth' });
      });
    });
  } catch (err) {
    console.error('Recommendations error:', err);
  }
}

/* ── 17. Recently Viewed Products ────────────────────────── */
function trackRecentlyViewed() {
  const productEl = document.querySelector('[data-product-id]');
  if (!productEl) return;

  const id = productEl.dataset.productId;
  const title = productEl.dataset.productTitle;
  const url = productEl.dataset.productUrl;
  const image = productEl.dataset.productImage;
  const price = productEl.dataset.productPrice;
  if (!id) return;

  const KEY = 'bquik-recently-viewed';
  let viewed = [];
  try { viewed = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e) {}

  // Remove if already present
  viewed = viewed.filter(p => p.id !== id);
  // Add to front
  viewed.unshift({ id, title, url, image, price });
  // Keep max 8
  if (viewed.length > 8) viewed = viewed.slice(0, 8);
  localStorage.setItem(KEY, JSON.stringify(viewed));
}

function initRecentlyViewed() {
  const section = $('.recently-viewed');
  if (!section) return;

  const KEY = 'bquik-recently-viewed';
  const currentProductId = section.dataset.currentProduct;
  let viewed = [];
  try { viewed = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e) {}

  // Exclude current product
  viewed = viewed.filter(p => p.id !== currentProductId);
  if (viewed.length === 0) return;

  const carousel = section.querySelector('.collection-carousel');
  if (!carousel) return;

  carousel.innerHTML = viewed.map(p => `
    <div role="listitem" class="product-card-wrap">
      <article class="product-card" aria-label="${p.title}">
        <div class="product-card__media">
          <a href="${p.url}" class="product-card__image-link" tabindex="-1" aria-hidden="true">
            ${p.image ? `<img src="${p.image}" alt="${p.title}" loading="lazy" class="product-card__img" style="width:100%;height:100%;object-fit:cover;">` : ''}
          </a>
        </div>
        <div class="product-card__info">
          <h3 class="product-card__title">
            <a href="${p.url}" class="product-card__title-link">${p.title}</a>
          </h3>
          <div class="product-card__price">
            <span class="product-card__price-current">${formatMoney(parseInt(p.price, 10))}</span>
          </div>
        </div>
      </article>
    </div>`).join('');

  section.classList.add('is-visible');
}

/* ── Init ─────────────────────────────────────────────────── */
function init() {
  initHeader();
  initMobileMenu();
  initScrollReveal();
  initQuickAdd();
  initCartDrawer();
  updateCartCount();
  initSizeGuideModal();
  initCarousels();
  initNewsletter();
  initAnnouncementBar();
  initStatsCountUp();
  initSearch();
  initAddToCart();
  initCartPage();
  initRecentlyViewed();

  // Product page
  if (document.body.classList.contains('template-product')) {
    initProductPage();
    initImageZoom();
    trackRecentlyViewed();
    initProductRecommendations();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
