const moneyAdmin = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
let adminDb = null;
let adminProducts = [];
let adminOrders = [];

function $(id) {
  return document.getElementById(id);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => el.classList.remove("show"), 1900);
}

function setStatus(id, message, isError = false) {
  const el = $(id);
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function setupAdminCloud() {
  const config = window.URBAN_LEGACY_SUPABASE;
  if (!window.supabase || !config?.url || !config?.anonKey) {
    setStatus("admin-login-status", "Supabase nao configurado.", true);
    return false;
  }
  adminDb = window.supabase.createClient(config.url, config.anonKey);
  return true;
}

async function isAdmin() {
  const { data: sessionData } = await adminDb.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return false;
  const { data, error } = await adminDb.from("store_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(data && !error);
}

function showWorkspace(show) {
  $("admin-login").classList.toggle("page-hidden", show);
  $("admin-workspace").classList.toggle("page-hidden", !show);
}

function setActiveTab(tabName) {
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === tabName);
  });
  document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `admin-tab-${tabName}`);
  });
}

async function refreshAdminState() {
  if (!(await isAdmin())) {
    showWorkspace(false);
    return;
  }
  showWorkspace(true);
  await Promise.all([loadProducts(), loadOrders()]);
}

async function loginAdmin() {
  setStatus("admin-login-status", "Entrando...");
  const { error } = await adminDb.auth.signInWithPassword({
    email: $("admin-email").value.trim(),
    password: $("admin-password").value
  });
  if (error) {
    setStatus("admin-login-status", error.message, true);
    return;
  }
  if (!(await isAdmin())) {
    const { data } = await adminDb.auth.getUser();
    const uid = data.user?.id ? ` UID: ${data.user.id}` : "";
    setStatus("admin-login-status", `Usuario logado, mas nao esta na tabela store_admins.${uid}`, true);
    return;
  }
  setStatus("admin-login-status", "Acesso liberado.");
  await refreshAdminState();
}

async function logoutAdmin() {
  await adminDb.auth.signOut();
  showWorkspace(false);
}

function splitList(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clearProductForm() {
  $("product-form").reset();
  $("product-id").value = "";
  $("product-published").checked = true;
  $("form-title").textContent = "Novo produto";
  setStatus("product-status", "");
}

function productPayload() {
  const id = $("product-id").value;
  const payload = {
    name: $("product-name").value.trim(),
    category: $("product-category").value,
    sku: $("product-sku").value.trim(),
    badge: $("product-badge").value.trim(),
    price: Number($("product-price").value || 0),
    compare_at_price: Number($("product-compare-price").value || 0) || null,
    cost: Number($("product-cost").value || 0),
    stock: Number($("product-stock").value || 0),
    min_stock: Number($("product-min-stock").value || 0),
    color: $("product-color").value.trim(),
    sizes: splitList($("product-sizes").value),
    material: $("product-material").value.trim(),
    fit: $("product-fit").value.trim(),
    measurements: $("product-measurements").value.trim(),
    care: $("product-care").value.trim(),
    image_url: $("product-image").value.trim(),
    gallery_urls: splitList($("product-gallery").value),
    description: $("product-description").value.trim(),
    published: $("product-published").checked
  };
  if (id) payload.id = id;
  return payload;
}

async function saveProduct(event) {
  event.preventDefault();
  const payload = productPayload();
  if (!payload.name) {
    setStatus("product-status", "Informe o nome do produto.", true);
    return;
  }
  setStatus("product-status", "Salvando...");
  const { data: authData } = await adminDb.auth.getUser();
  if (!payload.id) payload.owner_id = authData.user?.id;
  const { error } = await adminDb.from("products").upsert(payload).select("id").single();
  if (error) {
    setStatus("product-status", error.message, true);
    return;
  }
  setStatus("product-status", "Produto salvo e sincronizado com o site.");
  toast("Produto salvo");
  clearProductForm();
  await loadProducts();
}

function editProduct(productId) {
  const product = adminProducts.find((item) => item.id === productId);
  if (!product) return;
  $("product-id").value = product.id;
  $("product-name").value = product.name || "";
  $("product-category").value = product.category || "Moda Feminina";
  $("product-sku").value = product.sku || "";
  $("product-badge").value = product.badge || "";
  $("product-price").value = product.price || 0;
  $("product-compare-price").value = product.compare_at_price || "";
  $("product-cost").value = product.cost || 0;
  $("product-stock").value = product.stock || 0;
  $("product-min-stock").value = product.min_stock || 0;
  $("product-color").value = product.color || "";
  $("product-sizes").value = (product.sizes || []).join(", ");
  $("product-material").value = product.material || "";
  $("product-fit").value = product.fit || "";
  $("product-measurements").value = product.measurements || "";
  $("product-care").value = product.care || "";
  $("product-image").value = product.image_url || "";
  $("product-gallery").value = (product.gallery_urls || []).join("\n");
  $("product-description").value = product.description || "";
  $("product-published").checked = product.published;
  $("form-title").textContent = "Editar produto";
  setActiveTab("products");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function toggleProduct(productId, published) {
  await adminDb.from("products").update({ published }).eq("id", productId);
  await loadProducts();
}

async function deleteProduct(productId) {
  if (!confirm("Remover este produto da gestao?")) return;
  await adminDb.from("products").delete().eq("id", productId);
  await loadProducts();
}

async function loadProducts() {
  const { data, error } = await adminDb
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    $("admin-products").innerHTML = `<p class="catalog-empty">${error.message}</p>`;
    return;
  }
  adminProducts = data || [];
  $("admin-products").innerHTML = adminProducts.length
    ? adminProducts.map((product) => `
        <article class="admin-row">
          <div>
            <strong>${product.name}</strong>
            <span>${product.category} • ${product.sku || "Sem SKU"} • ${moneyAdmin.format(Number(product.price || 0))} • Estoque ${product.stock || 0}</span>
            <small>${product.material || "Material nao informado"}${product.fit ? ` • ${product.fit}` : ""}</small>
          </div>
          <div class="admin-row-actions">
            <button class="secondary-button" data-edit="${product.id}" type="button">Editar</button>
            <button class="ghost-button" data-publish="${product.id}" data-state="${!product.published}" type="button">${product.published ? "Ocultar" : "Publicar"}</button>
            <button class="ghost-button danger" data-delete="${product.id}" type="button">Excluir</button>
          </div>
        </article>
      `).join("")
    : `<p class="catalog-empty">Nenhum produto cadastrado.</p>`;

  document.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => editProduct(button.dataset.edit)));
  document.querySelectorAll("[data-publish]").forEach((button) => button.addEventListener("click", () => toggleProduct(button.dataset.publish, button.dataset.state === "true")));
  document.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteProduct(button.dataset.delete)));
}

async function updateOrderStatus(orderId, status) {
  await adminDb.from("orders").update({ status }).eq("id", orderId);
  await loadOrders();
}

async function loadOrders() {
  const { data, error } = await adminDb
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });
  if (error) {
    $("admin-orders").innerHTML = `<p class="catalog-empty">${error.message}</p>`;
    return;
  }
  adminOrders = data || [];
  renderSalesDashboard();
  $("admin-orders").innerHTML = adminOrders.length
    ? adminOrders.map((order) => `
        <article class="admin-row order-row">
          <div>
            <strong>${order.customer_name || "Cliente"} • ${moneyAdmin.format(Number(order.total || 0))}</strong>
            <span>${order.customer_phone || order.customer_email || "Sem contato"} • ${new Date(order.created_at).toLocaleString("pt-BR")}</span>
            <small>${(order.order_items || []).map((item) => `${item.qty}x ${item.product_name}`).join(", ")}</small>
          </div>
          <select data-order-status="${order.id}">
            ${["Novo", "Em atendimento", "Pago", "Enviado", "Finalizado", "Cancelado"].map((status) => `<option ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </article>
      `).join("")
    : `<p class="catalog-empty">Nenhum pedido recebido ainda.</p>`;

  document.querySelectorAll("[data-order-status]").forEach((select) => {
    select.addEventListener("change", () => updateOrderStatus(select.dataset.orderStatus, select.value));
  });
}

function orderTotal(order) {
  return Number(order.total || 0);
}

function ordersByLastDays(days = 7) {
  const today = new Date();
  const buckets = Array.from({ length: days }, (_item, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total: 0 };
  });

  adminOrders.forEach((order) => {
    const key = new Date(order.created_at).toISOString().slice(0, 10);
    const bucket = buckets.find((item) => item.key === key);
    if (bucket) bucket.total += orderTotal(order);
  });
  return buckets;
}

function topProductName() {
  const totals = new Map();
  adminOrders.forEach((order) => {
    (order.order_items || []).forEach((item) => {
      totals.set(item.product_name, (totals.get(item.product_name) || 0) + Number(item.qty || 0));
    });
  });
  const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]} (${top[1]} un.)` : "Sem venda ainda";
}

function renderSalesDashboard() {
  const totalRevenue = adminOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  const paidRevenue = adminOrders
    .filter((order) => ["Pago", "Enviado", "Finalizado"].includes(order.status))
    .reduce((sum, order) => sum + orderTotal(order), 0);
  const averageTicket = adminOrders.length ? totalRevenue / adminOrders.length : 0;
  const pending = adminOrders.filter((order) => ["Novo", "Em atendimento"].includes(order.status)).length;

  $("sales-metrics").innerHTML = [
    ["Faturamento", moneyAdmin.format(totalRevenue)],
    ["Receita confirmada", moneyAdmin.format(paidRevenue)],
    ["Ticket medio", moneyAdmin.format(averageTicket)],
    ["Pedidos pendentes", String(pending)],
    ["Produto destaque", topProductName()]
  ].map(([label, value]) => `
    <article>
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");

  renderSalesChart();
}

function renderSalesChart() {
  const buckets = ordersByLastDays(7);
  const max = Math.max(...buckets.map((item) => item.total), 1);
  $("sales-chart-caption").textContent = adminOrders.length
    ? `Total no periodo: ${moneyAdmin.format(buckets.reduce((sum, item) => sum + item.total, 0))}`
    : "Aguardando pedidos.";

  $("sales-chart").innerHTML = buckets.map((item) => {
    const height = Math.max(8, Math.round((item.total / max) * 100));
    return `
      <div class="sales-bar" style="--bar-height:${height}%">
        <span>${moneyAdmin.format(item.total)}</span>
        <strong></strong>
        <small>${item.label}</small>
      </div>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide) lucide.createIcons();
  if (!setupAdminCloud()) return;
  $("admin-login-button").addEventListener("click", loginAdmin);
  $("admin-logout").addEventListener("click", logoutAdmin);
  $("product-form").addEventListener("submit", saveProduct);
  $("clear-product").addEventListener("click", clearProductForm);
  $("reload-products").addEventListener("click", loadProducts);
  $("reload-orders").addEventListener("click", loadOrders);
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.adminTab));
  });
  await refreshAdminState();
});
