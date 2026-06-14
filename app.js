const categories = ["Moda Feminina", "Moda Masculina", "Acessório Feminino", "Acessório Masculino"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const starterData = {
  products: [
    { id: crypto.randomUUID(), name: "Cropped canelado premium", category: "Moda Feminina", sku: "UL-FEM-001", size: "P/M/G", color: "Preto", supplier: "Atacado SP", cost: 42.9, stock: 7, min: 3, price: 99.9 },
    { id: crypto.randomUUID(), name: "Camiseta oversized legacy", category: "Moda Masculina", sku: "UL-MASC-014", size: "M/G/GG", color: "Off white", supplier: "Street Fornece", cost: 55, stock: 4, min: 4, price: 129.9 },
    { id: crypto.randomUUID(), name: "Óculos urban frame", category: "Acessório Feminino", sku: "UL-ACC-F-009", size: "Único", color: "Marrom", supplier: "Importados BR", cost: 28.5, stock: 2, min: 5, price: 79.9 },
    { id: crypto.randomUUID(), name: "Boné aba curva signature", category: "Acessório Masculino", sku: "UL-ACC-M-004", size: "Único", color: "Preto", supplier: "Caps Prime", cost: 31.2, stock: 10, min: 3, price: 89.9 }
  ],
  sales: [],
  customers: [
    { id: crypto.randomUUID(), name: "Cliente exemplo", phone: "(11) 99999-9999", instagram: "@urbanlover", style: "Streetwear", notes: "Gosta de preto, oversized e acessórios." }
  ]
};

let state = loadState();
let db = null;
let cloudEnabled = false;
let currentUser = null;

function loadState() {
  const saved = localStorage.getItem("urbanLegacyOS");
  if (saved) return JSON.parse(saved);
  localStorage.setItem("urbanLegacyOS", JSON.stringify(starterData));
  return structuredClone(starterData);
}

function saveState() {
  localStorage.setItem("urbanLegacyOS", JSON.stringify(state));
}

function getSupabaseConfig() {
  const config = window.URBAN_LEGACY_SUPABASE || {};
  return {
    url: (config.url || "").trim(),
    anonKey: (config.anonKey || "").trim()
  };
}

function setupCloud() {
  const config = getSupabaseConfig();
  cloudEnabled = Boolean(config.url && config.anonKey && window.supabase);
  if (cloudEnabled) db = window.supabase.createClient(config.url, config.anonKey);
  $("storage-mode").textContent = cloudEnabled ? "nuvem Supabase" : "modo local";
  $("logout-button").hidden = !cloudEnabled;
}

async function setupAuth() {
  if (!cloudEnabled) return true;

  const { data } = await db.auth.getSession();
  currentUser = data.session?.user || null;
  $("auth-screen").hidden = Boolean(currentUser);
  return Boolean(currentUser);
}

function bindAuth() {
  $("auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAuthMessage();
    const email = $("auth-email").value.trim();
    const password = $("auth-password").value;
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      const needsConfirmation = error.message.toLowerCase().includes("confirm");
      authMessage(
        needsConfirmation
          ? "Esse e-mail ainda precisa ser confirmado. Abra seu Gmail, procure o e-mail do Supabase e confirme o cadastro. Depois volte aqui e clique em Entrar."
          : `Não consegui entrar: ${error.message}`,
        "error"
      );
      return;
    }
    currentUser = data.user;
    $("auth-screen").hidden = true;
    await loadCloudState();
    render();
    toast("Conectado à nuvem");
  });

  $("auth-signup").addEventListener("click", async () => {
    clearAuthMessage();
    const email = $("auth-email").value.trim();
    const password = $("auth-password").value;
    if (!email || password.length < 6) {
      authMessage("Informe um e-mail válido e uma senha com pelo menos 6 caracteres.", "error");
      return;
    }
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "https://artesssn.github.io/urban-legacy-os/"
      }
    });
    if (error) {
      authMessage(`Não consegui criar o acesso: ${error.message}`, "error");
      return;
    }
    currentUser = data.session?.user || null;
    $("auth-screen").hidden = Boolean(currentUser);
    authMessage(
      currentUser
        ? "Acesso criado. Entrando na sua nuvem..."
        : "Cadastro criado. Agora confirme o e-mail que o Supabase enviou para você. Depois volte aqui e clique em Entrar.",
      "info"
    );
    if (currentUser) {
      await seedCloud();
      await loadCloudState();
      render();
    }
  });

  $("logout-button").addEventListener("click", async () => {
    await db.auth.signOut();
    currentUser = null;
    $("auth-screen").hidden = false;
    toast("Você saiu da nuvem");
  });
}

async function loadCloudState() {
  if (!cloudEnabled || !currentUser) return;
  const [productsResult, salesResult, customersResult] = await Promise.all([
    db.from("products").select("*").order("created_at", { ascending: true }),
    db.from("sales").select("*").order("sold_at", { ascending: false }),
    db.from("customers").select("*").order("created_at", { ascending: false })
  ]);

  const error = productsResult.error || salesResult.error || customersResult.error;
  if (error) {
    cloudEnabled = false;
    db = null;
    $("storage-mode").textContent = "modo local";
    toast("Supabase sem conexão. Usando modo local.");
    return;
  }

  state = {
    products: productsResult.data.map(fromProductRow),
    sales: salesResult.data.map(fromSaleRow),
    customers: customersResult.data.map(fromCustomerRow)
  };

  if (!state.products.length && !state.sales.length && !state.customers.length) {
    await seedCloud();
    await loadCloudState();
  }
}

async function seedCloud() {
  if (!cloudEnabled || !currentUser) return;
  const products = starterData.products.map(toProductRow);
  const customers = starterData.customers.map(toCustomerRow);
  await db.from("products").insert(products);
  await db.from("customers").insert(customers);
}

function fromProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    sku: row.sku,
    size: row.size || "",
    color: row.color || "",
    supplier: row.supplier || "",
    cost: Number(row.cost || 0),
    stock: Number(row.stock || 0),
    min: Number(row.min_stock || 0),
    price: Number(row.price || 0)
  };
}

function toProductRow(product) {
  return {
    id: product.id,
    user_id: currentUser?.id,
    name: product.name,
    category: product.category,
    sku: product.sku,
    size: product.size,
    color: product.color,
    supplier: product.supplier,
    cost: product.cost,
    stock: product.stock,
    min_stock: product.min,
    price: product.price
  };
}

function fromSaleRow(row) {
  return {
    id: row.id,
    date: row.sold_at,
    productId: row.product_id,
    productName: row.product_name,
    qty: Number(row.qty || 0),
    customer: row.customer,
    channel: row.channel,
    status: row.status,
    total: Number(row.total || 0),
    profit: Number(row.profit || 0)
  };
}

function toSaleRow(sale) {
  return {
    id: sale.id,
    user_id: currentUser?.id,
    product_id: sale.productId,
    product_name: sale.productName,
    qty: sale.qty,
    customer: sale.customer,
    channel: sale.channel,
    status: sale.status,
    total: sale.total,
    profit: sale.profit,
    sold_at: sale.date
  };
}

function fromCustomerRow(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    instagram: row.instagram || "",
    style: row.style || "",
    notes: row.notes || ""
  };
}

function toCustomerRow(customer) {
  return {
    id: customer.id,
    user_id: currentUser?.id,
    name: customer.name,
    phone: customer.phone,
    instagram: customer.instagram,
    style: customer.style,
    notes: customer.notes
  };
}

function $(id) {
  return document.getElementById(id);
}

function num(id) {
  return Number($(id).value || 0);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2100);
}

function authMessage(message, type = "info") {
  const el = $("auth-message");
  if (!el) return;
  el.textContent = message;
  el.className = `auth-message show ${type === "error" ? "error" : ""}`;
}

function clearAuthMessage() {
  const el = $("auth-message");
  if (!el) return;
  el.textContent = "";
  el.className = "auth-message";
}

async function init() {
  setupCloud();
  if (cloudEnabled) bindAuth();
  const canLoad = await setupAuth();
  if (canLoad) await loadCloudState();
  populateCategories();
  bindNavigation();
  bindForms();
  render();
  calculatePrice();
  if (window.lucide) lucide.createIcons();
}

function populateCategories() {
  const selects = [$("product-category")];
  selects.forEach((select) => {
    select.innerHTML = categories.map((cat) => `<option>${cat}</option>`).join("");
  });
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.jump));
  });
  $("global-search").addEventListener("input", renderProducts);
  $("seed-demo").addEventListener("click", async () => {
    state = structuredClone(starterData);
    if (cloudEnabled) {
      await Promise.all([
        db.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        db.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
        db.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      ]);
      await seedCloud();
      await loadCloudState();
    } else {
      saveState();
    }
    render();
    toast("Dados de exemplo repostos");
  });
}

function showView(view) {
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === view));
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.toggle("active", el.dataset.view === view));
  const titles = {
    dashboard: "Painel de controle",
    products: "Estoque inteligente",
    pricing: "Precificação de revenda",
    sales: "Gestão de vendas",
    customers: "Clientes e relacionamento",
    reports: "Relatórios da operação"
  };
  $("view-title").textContent = titles[view];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindForms() {
  $("product-form").addEventListener("submit", saveProduct);
  $("sale-form").addEventListener("submit", (event) => saveSale(event, "sale"));
  $("quick-sale-form").addEventListener("submit", (event) => saveSale(event, "quick"));
  $("customer-form").addEventListener("submit", saveCustomer);
  $("pricing-form").addEventListener("input", calculatePrice);
  $("copy-price").addEventListener("click", () => {
    navigator.clipboard?.writeText($("suggested-price").textContent);
    toast("Preço copiado");
  });
  $("sale-product").addEventListener("change", syncSalePrice);
}

function render() {
  renderSelectors();
  renderMetrics();
  renderProducts();
  renderSales();
  renderCustomers();
  renderDashboard();
  renderReports();
  if (window.lucide) lucide.createIcons();
}

function renderSelectors() {
  const options = state.products
    .map((product) => `<option value="${product.id}">${product.name} - ${product.sku}</option>`)
    .join("");
  $("quick-product").innerHTML = options || "<option>Nenhum produto cadastrado</option>";
  $("sale-product").innerHTML = options || "<option>Nenhum produto cadastrado</option>";
  syncSalePrice();
}

function totals() {
  const revenue = state.sales.reduce((sum, sale) => sum + sale.total, 0);
  const profit = state.sales.reduce((sum, sale) => sum + sale.profit, 0);
  const stock = state.products.reduce((sum, product) => sum + product.stock, 0);
  const low = state.products.filter((product) => product.stock <= product.min).length;
  const ticket = state.sales.length ? revenue / state.sales.length : 0;
  return { revenue, profit, stock, low, ticket };
}

function renderMetrics() {
  const total = totals();
  $("metric-revenue").textContent = money.format(total.revenue);
  $("metric-profit").textContent = money.format(total.profit);
  $("metric-stock").textContent = total.stock;
  $("metric-low").textContent = `${total.low} em alerta`;
  $("metric-ticket").textContent = money.format(total.ticket);
  $("sidebar-profit").textContent = money.format(total.profit);
}

function renderProducts() {
  const search = $("global-search").value.trim().toLowerCase();
  const filtered = state.products.filter((product) => {
    const haystack = `${product.name} ${product.sku} ${product.category} ${product.color} ${product.supplier}`.toLowerCase();
    return haystack.includes(search);
  });
  $("product-count").textContent = `${filtered.length} produtos`;
  $("products-table").innerHTML = filtered.map((product) => `
    <tr>
      <td><b>${product.name}</b><p class="item-sub">${product.color || "Sem cor"} • ${product.size || "Sem tamanho"}</p></td>
      <td>${product.category}</td>
      <td>${product.sku}</td>
      <td class="${product.stock <= product.min ? "status-low" : "status-ok"}">${product.stock}</td>
      <td>${money.format(product.price)}</td>
      <td>
        <div class="row-actions">
          <button class="mini-button" title="Editar" onclick="editProduct('${product.id}')"><i data-lucide="pencil"></i></button>
          <button class="mini-button" title="Excluir" onclick="deleteProduct('${product.id}')"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">Nenhum produto encontrado.</td></tr>`;
}

async function saveProduct(event) {
  event.preventDefault();
  const product = {
    id: $("product-id").value || crypto.randomUUID(),
    name: $("product-name").value.trim(),
    category: $("product-category").value,
    sku: $("product-sku").value.trim(),
    size: $("product-size").value.trim(),
    color: $("product-color").value.trim(),
    supplier: $("product-supplier").value.trim(),
    cost: num("product-cost"),
    stock: num("product-stock"),
    min: num("product-min"),
    price: num("product-price")
  };
  const index = state.products.findIndex((item) => item.id === product.id);
  if (index >= 0) state.products[index] = product;
  else state.products.push(product);

  if (cloudEnabled) {
    const { error } = await db.from("products").upsert(toProductRow(product));
    if (error) return toast("Erro ao salvar no Supabase");
  } else {
    saveState();
  }

  event.target.reset();
  $("product-id").value = "";
  $("product-min").value = 3;
  render();
  toast("Produto salvo");
}

function editProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;
  $("product-id").value = product.id;
  $("product-name").value = product.name;
  $("product-category").value = product.category;
  $("product-sku").value = product.sku;
  $("product-size").value = product.size;
  $("product-color").value = product.color;
  $("product-supplier").value = product.supplier;
  $("product-cost").value = product.cost;
  $("product-stock").value = product.stock;
  $("product-min").value = product.min;
  $("product-price").value = product.price;
  showView("products");
}

async function deleteProduct(id) {
  state.products = state.products.filter((product) => product.id !== id);
  if (cloudEnabled) {
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) return toast("Erro ao remover no Supabase");
  } else {
    saveState();
  }
  render();
  toast("Produto removido");
}

function syncSalePrice() {
  const product = state.products.find((item) => item.id === $("sale-product").value);
  if (product) $("sale-price").value = product.price;
}

async function saveSale(event, mode) {
  event.preventDefault();
  const productId = mode === "quick" ? $("quick-product").value : $("sale-product").value;
  const qty = mode === "quick" ? num("quick-qty") : num("sale-qty");
  const product = state.products.find((item) => item.id === productId);
  if (!product || qty <= 0) return toast("Selecione um produto válido");
  if (product.stock < qty) return toast("Estoque insuficiente");

  const unitPrice = mode === "quick" ? product.price : num("sale-price");
  const customer = mode === "quick" ? $("quick-customer").value.trim() : $("sale-customer").value.trim();
  const total = unitPrice * qty;
  const fee = total * 0.08;
  const cost = product.cost * qty;
  const profit = total - fee - cost;
  product.stock -= qty;
  const sale = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    productId,
    productName: product.name,
    qty,
    customer: customer || "Cliente avulso",
    channel: mode === "quick" ? "Venda rápida" : $("sale-channel").value,
    status: mode === "quick" ? "Pago" : $("sale-status").value,
    total,
    profit
  };
  state.sales.unshift(sale);

  if (cloudEnabled) {
    const saleResult = await db.from("sales").insert(toSaleRow(sale));
    const productResult = await db.from("products").update({ stock: product.stock }).eq("id", product.id);
    if (saleResult.error || productResult.error) return toast("Erro ao registrar no Supabase");
  } else {
    saveState();
  }

  event.target.reset();
  $("quick-qty").value = 1;
  $("sale-qty").value = 1;
  render();
  toast("Venda registrada");
}

function renderSales() {
  $("sales-table").innerHTML = state.sales.map((sale) => `
    <tr>
      <td>${dateFmt.format(new Date(sale.date))}</td>
      <td><b>${sale.productName}</b><p class="item-sub">${sale.qty} un. • ${sale.channel}</p></td>
      <td>${sale.customer}</td>
      <td>${money.format(sale.total)}</td>
      <td class="${sale.profit >= 0 ? "status-ok" : "status-low"}">${money.format(sale.profit)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">Nenhuma venda registrada.</td></tr>`;
}

async function saveCustomer(event) {
  event.preventDefault();
  const customer = {
    id: crypto.randomUUID(),
    name: $("customer-name").value.trim(),
    phone: $("customer-phone").value.trim(),
    instagram: $("customer-instagram").value.trim(),
    style: $("customer-style").value,
    notes: $("customer-notes").value.trim()
  };
  state.customers.unshift(customer);

  if (cloudEnabled) {
    const { error } = await db.from("customers").insert(toCustomerRow(customer));
    if (error) return toast("Erro ao salvar cliente no Supabase");
  } else {
    saveState();
  }

  event.target.reset();
  render();
  toast("Cliente salvo");
}

function renderCustomers() {
  $("customer-list").innerHTML = state.customers.map((customer) => `
    <article class="customer-item">
      <div>
        <p class="item-title">${customer.name}</p>
        <p class="item-sub">${customer.phone || "Sem WhatsApp"} • ${customer.instagram || "Sem Instagram"}</p>
      </div>
      <span class="pill">${customer.style}</span>
    </article>
  `).join("") || `<p class="item-sub">Nenhum cliente cadastrado.</p>`;
}

function renderDashboard() {
  const lowProducts = state.products.filter((product) => product.stock <= product.min);
  $("stock-alert-list").innerHTML = lowProducts.map((product) => `
    <article class="alert-item">
      <div><p class="item-title">${product.name}</p><p class="item-sub">${product.sku} • mínimo ${product.min}</p></div>
      <strong class="status-low">${product.stock}</strong>
    </article>
  `).join("") || `<p class="item-sub">Nenhum produto abaixo do mínimo.</p>`;

  $("timeline").innerHTML = state.sales.slice(0, 5).map((sale) => `
    <article class="timeline-item">
      <div><p class="item-title">${sale.productName}</p><p class="item-sub">${sale.customer} • ${dateFmt.format(new Date(sale.date))}</p></div>
      <strong>${money.format(sale.total)}</strong>
    </article>
  `).join("") || `<p class="item-sub">As próximas vendas aparecem aqui.</p>`;
}

function calculatePrice() {
  const cost = num("calc-cost");
  const realCost = cost + num("calc-freight") + num("calc-packaging") + num("calc-fixed");
  const fee = num("calc-fee") / 100;
  const margin = num("calc-margin") / 100;
  const discount = num("calc-discount") / 100;
  const commission = num("calc-commission") / 100;
  const divisor = Math.max(0.05, 1 - fee - margin - discount - commission);
  const suggested = realCost / divisor;
  const breakEven = realCost / Math.max(0.05, 1 - fee - discount - commission);
  const profit = suggested * (1 - fee - discount - commission) - realCost;
  $("suggested-price").textContent = money.format(suggested);
  $("real-cost").textContent = money.format(realCost);
  $("break-even").textContent = money.format(breakEven);
  $("profit-per-sale").textContent = money.format(profit);
  $("real-margin").textContent = `${((profit / suggested) * 100 || 0).toFixed(1)}%`;
}

function renderReports() {
  const total = totals();
  const max = Math.max(total.revenue, total.profit, total.stock * 10, 1);
  const rows = [
    ["Faturamento", total.revenue],
    ["Lucro", total.profit],
    ["Valor em estoque", state.products.reduce((sum, p) => sum + p.cost * p.stock, 0)]
  ];
  $("report-bars").innerHTML = rows.map(([label, value]) => `
    <article class="bar-row">
      <span>${label}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, (value / max) * 100)}%"></div></div>
      <strong>${money.format(value)}</strong>
    </article>
  `).join("");

  $("category-report").innerHTML = categories.map((category) => {
    const items = state.products.filter((product) => product.category === category);
    const stock = items.reduce((sum, product) => sum + product.stock, 0);
    return `<article class="bar-row"><span>${category}</span><strong>${stock} itens</strong></article>`;
  }).join("");

  const recommendations = [];
  if (total.low) recommendations.push(`Repor ${total.low} produto(s) em alerta antes das próximas campanhas.`);
  if (!state.sales.length) recommendations.push("Registre vendas para o painel começar a mostrar lucro, ticket médio e giro.");
  if (total.profit < total.revenue * 0.25 && state.sales.length) recommendations.push("Revise taxas e descontos: a margem líquida está abaixo de 25%.");
  recommendations.push("Use a calculadora antes de cadastrar novos produtos para manter a margem planejada.");
  $("recommendations").innerHTML = recommendations.map((text) => `<article class="recommendation">${text}</article>`).join("");
}

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
document.addEventListener("DOMContentLoaded", init);
