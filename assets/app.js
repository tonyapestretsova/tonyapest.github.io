(function(){
  "use strict";
  const PRODUCTS = window.PRODUCTS || [];
  const LS = { cart:"flora_cart", orders:"flora_orders", promo:"flora_promo" };

  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const ROOT = document.body.dataset.root || "";
  const fmt = n => n.toLocaleString("ru-RU") + " ₽";
  const read = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const getCart = () => read(LS.cart, {});
  const setCart = c => { write(LS.cart, c); updateCartCount(); };
  const cartTotal = () => {
    const c = getCart();
    return Object.entries(c).reduce((s,[id,q]) => {
      const p = PRODUCTS.find(p => p.id === id);
      return s + (p ? p.price*q : 0);
    }, 0);
  };
  const cartCount = () => Object.values(getCart()).reduce((s,n)=>s+n,0);

  function updateCartCount(){
    $$("#cart-count").forEach(el => el.textContent = cartCount());
  }

  function addToCart(id, qty=1){
    const c = getCart();
    c[id] = (c[id]||0) + qty;
    setCart(c);
  }

  function productCard(p){
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <a class="card-img" href="${ROOT}bukety/${p.id}.html" aria-label="${p.name}">${p.emoji}</a>
      <div class="card-body">
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
        <h3><a href="${ROOT}bukety/${p.id}.html">${p.name}</a></h3>
        <p>${p.desc}</p>
        <div class="price-row">
          <span class="price">${fmt(p.price)}</span>
          ${p.old ? `<del>${fmt(p.old)}</del>` : ""}
        </div>
        <button class="btn" type="button" data-add="${p.id}">В корзину</button>
      </div>`;
    return el;
  }

  function bindAddButtons(root=document){
    root.addEventListener("click", e => {
      const b = e.target.closest("[data-add]");
      if(!b) return;
      addToCart(b.dataset.add);
      const old = b.textContent;
      b.textContent = "Добавлено ✓";
      setTimeout(() => b.textContent = old, 900);
    });
  }

  function renderPopular(){
    const g = $("#popular-grid");
    if(!g) return;
    PRODUCTS.slice(0,4).forEach(p => g.appendChild(productCard(p)));
  }

  // ---------- Каталог ----------
  function renderCatalog(){
    const grid = $("#catalog-grid");
    if(!grid) return;
    const fFlower = $("#f-flower"), fOcc = $("#f-occ"), fPrice = $("#f-price"), fSort = $("#f-sort");
    const countLine = $("#count"), empty = $("#no-results");

    function apply(){
      let list = PRODUCTS.slice();
      const fl = fFlower.value, oc = fOcc.value, pr = fPrice.value, sort = fSort.value;
      if(fl) list = list.filter(p => p.flower === fl);
      if(oc) list = list.filter(p => p.occ.includes(oc));
      if(pr === "low") list = list.filter(p => p.price < 3000);
      if(pr === "mid") list = list.filter(p => p.price >= 3000 && p.price <= 5000);
      if(pr === "high") list = list.filter(p => p.price > 5000);
      if(sort === "asc") list.sort((a,b) => a.price - b.price);
      if(sort === "desc") list.sort((a,b) => b.price - a.price);

      grid.innerHTML = "";
      list.forEach(p => grid.appendChild(productCard(p)));
      countLine.textContent = `Найдено букетов: ${list.length}`;
      empty.hidden = list.length > 0;
    }

    [fFlower,fOcc,fPrice,fSort].forEach(s => s.addEventListener("change", apply));
    const reset = () => { fFlower.value=""; fOcc.value=""; fPrice.value=""; fSort.value=""; apply(); };
    $("#f-reset")?.addEventListener("click", reset);
    $("#f-reset2")?.addEventListener("click", reset);
    apply();
  }

  // ---------- Карточка ----------
  // Старый адрес product.html?id=... перенаправляет на страницу товара с ЧПУ
  function renderProduct(){
    const root = $("#product-root");
    if(!root) return;
    const id = new URLSearchParams(location.search).get("id");
    const p = PRODUCTS.find(x => x.id === id);
    if(!p){
      root.innerHTML = `<p class="lead">Букет не найден. <a href="catalog.html">Вернуться в каталог</a>.</p>`;
      return;
    }
    location.replace("bukety/" + p.id + ".html");
  }

  function renderRelated(){
    const r = $("#related-grid[data-exclude]");
    if(!r) return;
    PRODUCTS.filter(x => x.id !== r.dataset.exclude).slice(0,4).forEach(x => r.appendChild(productCard(x)));
  }

  function bindBurger(){
    const b = $(".burger"), n = $("#site-nav");
    if(!b || !n) return;
    b.addEventListener("click", () => {
      const open = n.classList.toggle("open");
      b.setAttribute("aria-expanded", open);
      b.textContent = open ? "✕" : "☰";
    });
  }

  // ---------- Корзина ----------
  function renderCart(){
    const root = $("#cart-root");
    if(!root) return;
    const cart = getCart();
    const entries = Object.entries(cart).filter(([id]) => PRODUCTS.some(p => p.id === id));

    if(entries.length === 0){
      root.innerHTML = `<p class="lead">Корзина пуста. <a href="catalog.html">Перейти в каталог</a>.</p>`;
      $("#checkout-form")?.closest("div")?.setAttribute("hidden","");
      return;
    }

    root.innerHTML = entries.map(([id,q]) => {
      const p = PRODUCTS.find(x => x.id === id);
      return `<div class="cart-item">
        <div>
          <strong>${p.name}</strong>
          <div class="price-row"><span class="price">${fmt(p.price)}</span>${p.old?`<del>${fmt(p.old)}</del>`:""}</div>
        </div>
        <div class="qty">
          <button type="button" data-dec="${id}" aria-label="Меньше">−</button>
          <span>${q}</span>
          <button type="button" data-inc="${id}" aria-label="Больше">+</button>
          <button type="button" data-del="${id}" aria-label="Удалить" style="margin-left:.5rem">×</button>
        </div>
      </div>`;
    }).join("") + `<p class="total">Итого: ${fmt(cartTotal())}</p>`;

    root.addEventListener("click", e => {
      const inc = e.target.closest("[data-inc]");
      const dec = e.target.closest("[data-dec]");
      const del = e.target.closest("[data-del]");
      const c = getCart();
      if(inc){ c[inc.dataset.inc]++; setCart(c); renderCart(); }
      if(dec){ const id = dec.dataset.dec; c[id]--; if(c[id] <= 0) delete c[id]; setCart(c); renderCart(); }
      if(del){ delete c[del.dataset.del]; setCart(c); renderCart(); }
    }, { once:true });

    // доставка → показать адрес
    const delivery = $("#delivery"), addressRow = $("#address-row");
    delivery?.addEventListener("change", () => {
      addressRow.hidden = delivery.value === "0";
    });

    // форма
    const form = $("#checkout-form");
    const err = $("#form-error");
    form?.addEventListener("submit", ev => {
      ev.preventDefault();
      err.textContent = "";
      const name = $("#cname").value.trim();
      const phone = $("#cphone").value.trim();
      const email = $("#cemail").value.trim();
      const date = $("#ddate").value;
      if(!name || name.length < 2) return err.textContent = "Укажите имя.";
      if(!/^\+?\d[\d\s\-()]{8,}$/.test(phone)) return err.textContent = "Проверьте телефон.";
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err.textContent = "Проверьте email.";
      if(!date) return err.textContent = "Выберите дату доставки.";

      const total = cartTotal() + Number(delivery.value);
      const no = "FL-" + Date.now().toString().slice(-8);
      const orders = read(LS.orders, []);
      orders.push({ no, name, phone, email, date, total, items: getCart(), created: new Date().toISOString() });
      write(LS.orders, orders);

      localStorage.removeItem(LS.cart);
      setCart({});
      renderCart();

      $("#done-no").textContent = no;
      const dlg = $("#done-dlg");
      if(dlg.showModal) dlg.showModal(); else alert("Заказ оформлен: " + no);
    });
  }

  function bindDialogClose(){
    $$("dialog [data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
  }

  // ---------- init ----------
  document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
    renderPopular();
    renderCatalog();
    renderProduct();
    renderRelated();
    renderCart();
    bindBurger();
    bindAddButtons();
    bindDialogClose();

    // минимальная дата доставки — сегодня
    const d = $("#ddate");
    if(d){ const t = new Date(); t.setDate(t.getDate()+1); d.min = t.toISOString().slice(0,10); }
  });
})();