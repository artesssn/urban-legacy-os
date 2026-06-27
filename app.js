const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const whatsappNumber = "5534988345037";
const bannerImage = "https://images.yampi.me/assets/stores/urban-legacy2/uploads/banners/6a08cfbb34fe1.png";

const fallbackProducts = [
  {
    id: "cropped-canelado-premium",
    name: "Cropped canelado premium",
    category: "Moda Feminina",
    color: "Preto",
    sizes: ["P", "M", "G"],
    price: 99.9,
    badge: "Novo",
    image: bannerImage
  },
  {
    id: "vestido-noite-legacy",
    name: "Vestido noite Legacy",
    category: "Moda Feminina",
    color: "Preto",
    sizes: ["P", "M", "G"],
    price: 149.9,
    badge: "Destaque",
    image: bannerImage
  },
  {
    id: "camiseta-oversized-legacy",
    name: "Camiseta oversized Legacy",
    category: "Moda Masculina",
    color: "Off white",
    sizes: ["M", "G", "GG"],
    price: 129.9,
    badge: "Mais vendido",
    image: bannerImage
  },
  {
    id: "camisa-black-presence",
    name: "Camisa Black Presence",
    category: "Moda Masculina",
    color: "Preto",
    sizes: ["M", "G", "GG"],
    price: 159.9,
    badge: "Premium",
    image: bannerImage
  },
  {
    id: "oculos-urban-frame",
    name: "Óculos Urban Frame",
    category: "Acessório Feminino",
    color: "Marrom",
    sizes: ["Único"],
    price: 79.9,
    badge: "Presente",
    image: bannerImage
  },
  {
    id: "bolsa-evening-line",
    name: "Bolsa Evening Line",
    category: "Acessório Feminino",
    color: "Preto",
    sizes: ["Único"],
    price: 119.9,
    badge: "Chic",
    image: bannerImage
  },
  {
    id: "bone-aba-curva-signature",
    name: "Boné aba curva Signature",
    category: "Acessório Masculino",
    color: "Preto",
    sizes: ["Único"],
    price: 89.9,
    badge: "Street",
    image: bannerImage
  },
  {
    id: "cinto-metal-legacy",
    name: "Cinto Metal Legacy",
    category: "Acessório Masculino",
    color: "Preto",
    sizes: ["Único"],
    price: 69.9,
    badge: "Essencial",
    image: bannerImage
  }
];

let products = [...fallbackProducts];
let currentCategory = "Todos";
let currentPage = "home";
let currentProductId = null;
let currentSearchTerm = "";
let cart = loadCart();
let db = null;
let cloudEnabled = false;
let currentCustomer = null;

function $(id) {
  return document.getElementById(id);
}

function canUseSupabase() {
  const config = window.URBAN_LEGACY_SUPABASE;
  return Boolean(window.supabase && config?.url && config?.anonKey);
}

async function setupCloud() {
  if (!canUseSupabase()) return;
  db = window.supabase.createClient(window.URBAN_LEGACY_SUPABASE.url, window.URBAN_LEGACY_SUPABASE.anonKey);
  cloudEnabled = true;
}

function productFromRow(row) {
  const image = row.image_url || bannerImage;
  const gallery = Array.isArray(row.gallery_urls) && row.gallery_urls.length ? row.gallery_urls : [image];
  const colors = Array.isArray(row.colors) && row.colors.length ? row.colors : [row.color || "Urban"];
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    categories: Array.isArray(row.categories) && row.categories.length ? row.categories : [row.category],
    color: colors[0] || "Urban",
    colors,
    sizes: Array.isArray(row.sizes) && row.sizes.length ? row.sizes : ["Único"],
    price: Number(row.price || 0),
    badge: row.badge || "Urban",
    image,
    gallery,
    stock: Number(row.stock ?? 0),
    description: row.description || ""
  };
}

async function loadStoreProducts() {
  if (!cloudEnabled) return;
  const { data, error } = await db
    .from("products")
    .select("id,name,category,categories,color,colors,sizes,price,badge,image_url,gallery_urls,stock,description,published,sort_order,created_at")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Urban Legacy: produtos locais usados como reserva.", error);
    return;
  }

  if (data?.length) products = data.map(productFromRow);
}

async function setupCustomerSession() {
  if (!cloudEnabled) return;
  const { data } = await db.auth.getSession();
  currentCustomer = data.session?.user || null;
  updateAccountState();
  db.auth.onAuthStateChange((_event, session) => {
    currentCustomer = session?.user || null;
    updateAccountState();
  });
  if (!currentCustomer) window.setTimeout(openAuthModal, 500);
}

function updateAccountState() {
  $("account-button")?.classList.toggle("is-logged", Boolean(currentCustomer));
}

function whatsappLink(message) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("urbanLegacyCart")) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("urbanLegacyCart", JSON.stringify(cart));
}

function productInitials(product) {
  return product.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function filteredProducts() {
  const query = normalizeSearchText($("search-input").value);
  const sort = $("sort-select").value;
  return getFilteredProducts({ category: currentCategory, query, sort });
}

function getFilteredProducts({ category, query = "", sort = "featured", maxPrice = Infinity, brandEnabled = true }) {
  const normalizedQuery = normalizeSearchText(query);
  const list = products.filter((product) => {
    const productCategories = product.categories || [product.category];
    const inCategory = category === "Todos" || productCategories.includes(category);
    const haystack = normalizeSearchText(`${product.name} ${productCategories.join(" ")} ${product.color}`);
    const inSearch = haystack.includes(normalizedQuery);
    const inBrand = brandEnabled;
    const inPrice = product.price <= maxPrice;
    return inCategory && inSearch && inBrand && inPrice;
  });

  return list.sort((a, b) => {
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
    return products.indexOf(a) - products.indexOf(b);
  });
}

function productCardHTML(product) {
  return `
    <article class="product-card" data-product-card="${product.id}" tabindex="0" role="button" aria-label="Ver detalhes de ${product.name}">
      <div class="product-media" data-initials="${productInitials(product)}">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <span class="product-badge">${product.badge}</span>
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <div class="product-meta">
          <span>${product.category}</span>
          <span>${product.color}</span>
        </div>
        <strong class="price">${money.format(product.price)}</strong>
        <div class="size-row">${product.sizes.map((size) => `<span>${size}</span>`).join("")}</div>
        <button class="primary-button" data-add="${product.id}">
          <i data-lucide="plus"></i>Adicionar
        </button>
      </div>
    </article>
  `;
}

function bindProductButtons(container = document) {
  container.querySelectorAll("[data-product-card]").forEach((card) => {
    card.addEventListener("click", () => showProductPage(card.dataset.productCard));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showProductPage(card.dataset.productCard);
      }
    });
  });
  container.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      addToCart(button.dataset.add);
    });
  });
}

function renderProducts() {
  const list = filteredProducts();
  $("empty-state").hidden = list.length > 0;
  $("product-grid").innerHTML = list.map(productCardHTML).join("");

  bindProductButtons($("product-grid"));
  refreshIcons();
}

function setCategory(category) {
  currentCategory = category;
  document.querySelectorAll(".category-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === category);
  });
  document.querySelectorAll("[data-menu-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.menuCategory === category);
  });
  renderProducts();
  renderCatalog();
}

function showHome() {
  currentPage = "home";
  currentSearchTerm = "";
  $("home-page").classList.remove("page-hidden");
  $("catalog-page").classList.add("page-hidden");
  $("search-results-page").classList.add("page-hidden");
  $("product-detail-page").classList.add("page-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showCatalogPage(category) {
  currentPage = "catalog";
  setCategory(category);
  $("home-page").classList.add("page-hidden");
  $("catalog-page").classList.remove("page-hidden");
  $("search-results-page").classList.add("page-hidden");
  $("product-detail-page").classList.add("page-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSearchPage(term) {
  currentPage = "search";
  currentSearchTerm = term.trim();
  $("home-page").classList.add("page-hidden");
  $("catalog-page").classList.add("page-hidden");
  $("product-detail-page").classList.add("page-hidden");
  $("search-results-page").classList.remove("page-hidden");
  renderSearchResults();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function productById(productId) {
  return products.find((product) => product.id === productId);
}

function productImages(product) {
  const gallery = Array.isArray(product.gallery) && product.gallery.length ? product.gallery : [product.image];
  return [...new Set([...gallery, product.image, bannerImage].filter(Boolean))].slice(0, 5);
}

function showProductPage(productId) {
  const product = productById(productId);
  if (!product) return;
  currentPage = "product";
  currentProductId = productId;
  setCategory(product.category);
  renderProductDetail(product);
  $("home-page").classList.add("page-hidden");
  $("catalog-page").classList.add("page-hidden");
  $("search-results-page").classList.add("page-hidden");
  $("product-detail-page").classList.remove("page-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderProductDetail(product) {
  const images = productImages(product);
  $("detail-breadcrumb-category").textContent = product.category;
  $("detail-breadcrumb-name").textContent = product.name;
  $("detail-category").textContent = product.category;
  $("detail-name").textContent = product.name;
  $("detail-price").textContent = money.format(product.price);
  $("detail-installments").textContent = `ou atendimento direto para combinar pagamento`;
  $("detail-main-image").style.setProperty("--detail-image", `url("${images[0]}")`);
  $("detail-thumbs").innerHTML = images
    .map((image, index) => `<button class="detail-thumb ${index === 0 ? "active" : ""}" style="--thumb-image:url('${image}')" data-detail-image="${image}" aria-label="Ver imagem ${index + 1}"></button>`)
    .join("");
  $("detail-color-options").innerHTML = (product.colors || [product.color]).filter((value, index, array) => value && array.indexOf(value) === index)
    .map((color, index) => `<button class="option-button ${index === 0 ? "active" : ""}" type="button">${color}</button>`)
    .join("");
  $("detail-size-options").innerHTML = product.sizes
    .map((size, index) => `<button class="option-button ${index === 0 ? "active" : ""}" type="button">${size}</button>`)
    .join("");
  $("detail-whatsapp").href = whatsappLink(productOrderMessage(product));
  bindDetailInteractions();
  refreshIcons();
}

function selectedDetailOption(selector) {
  return document.querySelector(`${selector} .option-button.active`)?.textContent.trim() || "";
}

function productOrderMessage(product) {
  const selectedColor = selectedDetailOption("#detail-color-options") || product.color;
  const selectedSize = selectedDetailOption("#detail-size-options") || product.sizes[0] || "Único";
  return [
    "Olá, quero fazer um pedido na Urban Legacy.",
    "",
    "PRODUTO EM DESTAQUE:",
    `*${product.name.toUpperCase()}*`,
    "",
    `Categoria: ${product.category}`,
    `Cor: ${selectedColor}`,
    `Tamanho: ${selectedSize}`,
    `Preço: ${money.format(product.price)}`,
    "",
    "Pode me confirmar disponibilidade e frete?"
  ].join("\n");
}

function bindDetailInteractions() {
  document.querySelectorAll(".detail-thumb").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".detail-thumb").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      $("detail-main-image").style.setProperty("--detail-image", `url("${button.dataset.detailImage}")`);
    });
  });
  document.querySelectorAll(".option-grid").forEach((group) => {
    group.querySelectorAll(".option-button").forEach((button) => {
      button.addEventListener("click", () => {
        group.querySelectorAll(".option-button").forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
        const product = productById(currentProductId);
        if (product) $("detail-whatsapp").href = whatsappLink(productOrderMessage(product));
      });
    });
  });
}

function activeMaxPrice() {
  return Number($("price-filter").value || $("price-filter").max);
}

function updatePriceSlider() {
  const slider = $("price-filter");
  const value = Number(slider.value);
  const min = Number(slider.min);
  const max = Number(slider.max);
  const progress = ((value - min) / (max - min)) * 100;
  slider.style.setProperty("--range-progress", `${progress}%`);
  $("price-filter-label").textContent = value >= max ? "Todos" : money.format(value);
}

function renderCatalog() {
  $("catalog-title").textContent = currentCategory;
  $("breadcrumb-category").textContent = currentCategory;
  updatePriceSlider();
  const query = $("search-input").value.trim().toLowerCase();
  const sort = $("catalog-sort-select").value;
  const brandEnabled = $("brand-filter").checked;
  const list = getFilteredProducts({
    category: currentCategory,
    query,
    sort,
    maxPrice: activeMaxPrice(),
    brandEnabled
  });
  $("catalog-empty").hidden = list.length > 0;
  $("catalog-grid").innerHTML = list.map(productCardHTML).join("");
  bindProductButtons($("catalog-grid"));
  refreshIcons();
}

function renderSearchResults() {
  const term = currentSearchTerm || $("search-input").value.trim();
  const sort = $("search-sort-select").value;
  $("search-title").textContent = term ? `Busca por "${term}"` : "Busca";
  $("search-breadcrumb-term").textContent = term ? `Busca por "${term}"` : "Busca";
  const list = term
    ? getFilteredProducts({ category: "Todos", query: term, sort })
    : [];
  $("search-empty").hidden = list.length > 0;
  $("search-grid").innerHTML = list.map(productCardHTML).join("");
  bindProductButtons($("search-grid"));
  refreshIcons();
}

function addToCart(productId) {
  const existing = cart.find((item) => item.id === productId);
  if (existing) existing.qty += 1;
  else cart.push({ id: productId, qty: 1 });
  saveCart();
  renderCart();
  toast("Produto adicionado ao carrinho");
}

function updateQty(productId, delta) {
  const item = cart.find((cartItem) => cartItem.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter((cartItem) => cartItem.id !== productId);
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  renderCart();
}

function cartDetails() {
  return cart
    .map((item) => {
      const product = products.find((entry) => entry.id === item.id);
      if (!product) return null;
      return { ...item, product, subtotal: product.price * item.qty };
    })
    .filter(Boolean);
}

function renderCart() {
  const details = cartDetails();
  const totalQty = details.reduce((sum, item) => sum + item.qty, 0);
  const total = details.reduce((sum, item) => sum + item.subtotal, 0);
  $("cart-count").textContent = totalQty;
  $("cart-total").textContent = money.format(total);

  $("cart-items").innerHTML = details.length
    ? details
        .map(
          (item) => `
            <article class="cart-item">
              <div>
                <h3>${item.product.name}</h3>
                <p>${money.format(item.product.price)} cada</p>
                <button class="remove-button" data-remove="${item.id}">Remover</button>
              </div>
              <div class="qty-control">
                <button data-minus="${item.id}" aria-label="Diminuir quantidade">-</button>
                <strong>${item.qty}</strong>
                <button data-plus="${item.id}" aria-label="Aumentar quantidade">+</button>
              </div>
            </article>
          `
        )
        .join("")
    : `
      <div class="cart-empty">
        <p class="empty-state">Seu carrinho está vazio.</p>
        <button class="secondary-button full" id="cart-start-shopping" type="button">Iniciar compra</button>
      </div>
    `;

  document.querySelectorAll("[data-minus]").forEach((button) => {
    button.addEventListener("click", () => updateQty(button.dataset.minus, -1));
  });
  document.querySelectorAll("[data-plus]").forEach((button) => {
    button.addEventListener("click", () => updateQty(button.dataset.plus, 1));
  });
  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(button.dataset.remove));
  });
  $("cart-start-shopping")?.addEventListener("click", () => {
    closeCart();
    showHome();
    window.setTimeout(() => {
      document.querySelector("#produtos").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  });

  const orderText = details.length
    ? details.map((item) => [
        `*${item.product.name.toUpperCase()}*`,
        `Quantidade: ${item.qty}`,
        `Categoria: ${item.product.category}`,
        `Cor: ${item.product.color}`,
        `Tamanho: ${item.product.sizes.join(", ")}`,
        `Subtotal: ${money.format(item.subtotal)}`
      ].join("\n")).join("\n\n")
    : "Olá, quero conhecer os produtos da Urban Legacy.";
  const message = details.length
    ? `Olá, quero finalizar meu pedido na Urban Legacy.\n\nPRODUTO(S) EM DESTAQUE:\n\n${orderText}\n\nTOTAL: ${money.format(total)}\n\nPode me confirmar disponibilidade e frete?`
    : orderText;
  $("checkout-link").href = whatsappLink(message);
  refreshIcons();
}

async function requireCustomerAccount() {
  if (!cloudEnabled || currentCustomer) return true;
  openAuthModal();
  toast("Crie sua conta para finalizar o pedido");
  return false;
}

async function createOrderRecord({ items, message }) {
  if (!cloudEnabled || !currentCustomer || !items.length) return null;
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const meta = currentCustomer.user_metadata || {};
  const { data: order, error } = await db
    .from("orders")
    .insert({
      customer_user_id: currentCustomer.id,
      customer_name: meta.name || currentCustomer.email,
      customer_phone: meta.phone || "",
      customer_email: currentCustomer.email,
      status: "Novo",
      total,
      whatsapp_message: message
    })
    .select("id")
    .single();

  if (error) {
    console.warn("Urban Legacy: pedido nao foi salvo no painel.", error);
    toast("Pedido vai para o WhatsApp, mas nao salvou na gestao");
    return null;
  }

  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    product_name: item.product.name,
    category: item.product.category,
    color: item.product.color,
    size: item.product.sizes.join(", "),
    qty: item.qty,
    unit_price: item.product.price,
    subtotal: item.subtotal
  }));
  await db.from("order_items").insert(orderItems);
  return order.id;
}

function cartOrderMessage(details) {
  const total = details.reduce((sum, item) => sum + item.subtotal, 0);
  if (!details.length) return "Olá, quero conhecer os produtos da Urban Legacy.";
  const orderText = details.map((item) => [
    `*${item.product.name.toUpperCase()}*`,
    `Quantidade: ${item.qty}`,
    `Categoria: ${item.product.category}`,
    `Cor: ${item.product.color}`,
    `Tamanho: ${item.product.sizes.join(", ")}`,
    `Subtotal: ${money.format(item.subtotal)}`
  ].join("\n")).join("\n\n");
  return `Olá, quero finalizar meu pedido na Urban Legacy.\n\nPRODUTO(S) EM DESTAQUE:\n\n${orderText}\n\nTOTAL: ${money.format(total)}\n\nPode me confirmar disponibilidade e frete?`;
}

async function handleCheckout(event) {
  event.preventDefault();
  const details = cartDetails();
  if (!details.length) {
    window.open(whatsappLink("Olá, quero conhecer os produtos da Urban Legacy."), "_blank", "noopener");
    return;
  }
  if (!(await requireCustomerAccount())) return;
  const message = cartOrderMessage(details);
  await createOrderRecord({ items: details, message });
  window.open(whatsappLink(message), "_blank", "noopener");
}

async function handleProductWhatsApp(event) {
  event.preventDefault();
  const product = productById(currentProductId);
  if (!product) return;
  if (!(await requireCustomerAccount())) return;
  const message = productOrderMessage(product);
  await createOrderRecord({
    items: [{ id: product.id, qty: 1, product, subtotal: product.price }],
    message
  });
  window.open(whatsappLink(message), "_blank", "noopener");
}

function openCart() {
  $("cart-drawer").classList.add("open");
  $("cart-drawer").setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeCart() {
  $("cart-drawer").classList.remove("open");
  $("cart-drawer").setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

function openMenu() {
  $("menu-page").classList.add("open");
  $("menu-page").setAttribute("aria-hidden", "false");
  document.body.classList.add("menu-open");
}

function closeMenu() {
  $("menu-page").classList.remove("open");
  $("menu-page").setAttribute("aria-hidden", "true");
  document.body.classList.remove("menu-open");
}

function openAuthModal() {
  $("auth-modal")?.classList.add("open");
  $("auth-modal")?.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
}

function closeAuthModal() {
  $("auth-modal")?.classList.remove("open");
  $("auth-modal")?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
}

function setAuthStatus(message, isError = false) {
  const status = $("auth-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function authFields() {
  return {
    name: $("auth-name").value.trim(),
    phone: $("auth-phone").value.trim(),
    email: $("auth-email").value.trim(),
    password: $("auth-password").value
  };
}

async function saveCustomerProfile(user, fields) {
  if (!cloudEnabled || !user) return;
  await db.from("customer_profiles").upsert({
    user_id: user.id,
    name: fields.name || user.user_metadata?.name || user.email,
    phone: fields.phone || user.user_metadata?.phone || "",
    email: user.email
  }, { onConflict: "user_id" });
}

async function signUpCustomer() {
  if (!cloudEnabled) {
    setAuthStatus("Conecte o Supabase para ativar cadastro.", true);
    return;
  }
  const fields = authFields();
  if (!fields.email || !fields.password || !fields.name) {
    setAuthStatus("Preencha nome, e-mail e senha.", true);
    return;
  }
  setAuthStatus("Criando sua conta...");
  const { data, error } = await db.auth.signUp({
    email: fields.email,
    password: fields.password,
    options: { data: { name: fields.name, phone: fields.phone } }
  });
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }
  if (data.user) await saveCustomerProfile(data.user, fields);
  currentCustomer = data.session?.user || data.user || null;
  updateAccountState();
  setAuthStatus(data.session ? "Conta criada. Voce ja pode comprar." : "Conta criada. Confirme seu e-mail para entrar.");
  if (data.session) window.setTimeout(closeAuthModal, 700);
}

async function signInCustomer() {
  if (!cloudEnabled) {
    setAuthStatus("Conecte o Supabase para ativar login.", true);
    return;
  }
  const fields = authFields();
  if (!fields.email || !fields.password) {
    setAuthStatus("Informe e-mail e senha.", true);
    return;
  }
  setAuthStatus("Entrando...");
  const { data, error } = await db.auth.signInWithPassword({
    email: fields.email,
    password: fields.password
  });
  if (error) {
    setAuthStatus(error.message, true);
    return;
  }
  currentCustomer = data.user;
  await saveCustomerProfile(data.user, fields);
  updateAccountState();
  setAuthStatus("Voce entrou na sua conta.");
  window.setTimeout(closeAuthModal, 500);
}

async function signOutCustomer() {
  if (!cloudEnabled) return;
  await db.auth.signOut();
  currentCustomer = null;
  updateAccountState();
  setAuthStatus("Voce saiu da conta.");
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 1900);
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function bindEvents() {
  $("search-input").addEventListener("input", () => {
    const term = $("search-input").value.trim();
    if (term) showSearchPage(term);
    else showHome();
  });
  $("search-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const term = $("search-input").value.trim();
      if (term) showSearchPage(term);
    }
  });
  $("sort-select").addEventListener("change", renderProducts);
  $("catalog-sort-select").addEventListener("change", renderCatalog);
  $("search-sort-select").addEventListener("change", renderSearchResults);
  document.querySelectorAll("#price-filter, #brand-filter").forEach((input) => {
    input.addEventListener("change", renderCatalog);
    input.addEventListener("input", renderCatalog);
  });
  $("brand-home").addEventListener("click", (event) => {
    event.preventDefault();
    $("search-input").value = "";
    showHome();
  });
  $("breadcrumb-home").addEventListener("click", showHome);
  $("search-breadcrumb-home").addEventListener("click", () => {
    $("search-input").value = "";
    showHome();
  });
  document.querySelectorAll(".detail-home").forEach((button) => button.addEventListener("click", showHome));
  $("detail-breadcrumb-category").addEventListener("click", () => showCatalogPage(currentCategory));
  $("detail-add-cart").addEventListener("click", () => {
    if (currentProductId) addToCart(currentProductId);
  });
  $("detail-whatsapp").addEventListener("click", handleProductWhatsApp);
  $("cart-open").addEventListener("click", openCart);
  $("account-button").addEventListener("click", openAuthModal);
  $("nav-menu-open").addEventListener("click", openMenu);
  $("cart-close").addEventListener("click", closeCart);
  $("checkout-link").addEventListener("click", handleCheckout);
  $("cart-drawer").addEventListener("click", (event) => {
    if (event.target === $("cart-drawer")) closeCart();
  });
  $("auth-close").addEventListener("click", closeAuthModal);
  $("auth-modal").addEventListener("click", (event) => {
    if (event.target === $("auth-modal")) closeAuthModal();
  });
  $("auth-signup").addEventListener("click", signUpCustomer);
  $("auth-login").addEventListener("click", signInCustomer);
  $("auth-logout").addEventListener("click", signOutCustomer);
  $("menu-toggle").addEventListener("click", openMenu);
  $("menu-close").addEventListener("click", closeMenu);
  $("menu-page").addEventListener("click", (event) => {
    if (event.target === $("menu-page")) closeMenu();
  });
  $("menu-categories-link").addEventListener("click", (event) => {
    event.preventDefault();
    closeMenu();
    showHome();
    window.setTimeout(() => {
      document.querySelector("#categorias").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  });
  document.querySelectorAll("[data-menu-category]").forEach((button) => {
    button.addEventListener("click", () => {
      closeMenu();
      showCatalogPage(button.dataset.menuCategory);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeCart();
      closeMenu();
      closeAuthModal();
    }
  });
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => showCatalogPage(button.dataset.category));
  });
  document.querySelectorAll("[data-category-card]").forEach((button) => {
    button.addEventListener("click", () => showCatalogPage(button.dataset.categoryCard));
  });
  document.querySelectorAll("[data-whatsapp-default]").forEach((link) => {
    link.href = whatsappLink("Olá, quero atendimento da Urban Legacy.");
  });
  $("back-to-top").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => {
    $("back-to-top").classList.toggle("visible", window.scrollY > 520);
  }, { passive: true });
}

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  renderProducts();
  renderCatalog();
  renderCart();
  refreshIcons();
  window.setTimeout(() => {
    if (!currentCustomer) openAuthModal();
  }, 900);
  await setupCloud();
  await setupCustomerSession();
  await loadStoreProducts();
  renderProducts();
  renderCatalog();
  renderCart();
});
