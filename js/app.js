/* Main Application Logic - Club 19 de Junio */
import { loadState, saveState, exportData } from './state.js';

let state = loadState();

// Global App State
const app = {
    currentView: 'dashboard',
    chart: null,
    lastSaleTotal: 0
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if(!sessionStorage.getItem('version_alerted')) {
        alert("✅ Sistema Actualizado a la Versión Final. Caché limpiada con éxito.");
        sessionStorage.setItem('version_alerted', 'true');
    }
    initNavigation();
    renderView('dashboard');
    updateGlobalStats();
    
    // Export Data Action
    const exportBtn = document.querySelector('#exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => exportData(state));
    }
});

// --- Navigation & Routing ---
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            
            // UI Update
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            app.currentView = view;
            renderView(view);
        });
    });
}

// --- View Rendering ---
function renderView(viewId) {
    const container = document.getElementById('view-container');
    const title = document.getElementById('view-title');
    
    // Clean up
    if (app.chart) {
        app.chart.destroy();
        app.chart = null;
    }
    
    switch(viewId) {
        case 'dashboard':
            title.innerText = 'Dashboard General';
            renderDashboard(container);
            break;
        case 'partidos':
            title.innerText = 'Registro de Partidos';
            renderPartidos(container);
            break;
        case 'inventario':
            title.innerText = 'Gestión de Stock';
            renderInventario(container);
            break;
        case 'ventas':
            title.innerText = 'Módulo de Ventas';
            renderVentas(container);
            break;
        case 'socios':
            title.innerText = 'Socios y Cuotas';
            renderSocios(container);
            break;
        case 'camisetas':
            title.innerText = 'Ingresos por Camisetas';
            renderCamisetas(container);
            break;
        case 'fiados':
            title.innerText = 'Control de Fiados';
            renderFiados(container);
            break;
        case 'gastos':
            title.innerText = 'Egresos y Gastos Varios';
            renderGastosVarios(container);
            break;
        case 'finanzas':
            title.innerText = 'Balance General del Mes';
            renderFinanzas(container);
            break;
        case 'config':
            title.innerText = 'Configuración';
            renderConfig(container);
            break;
        default:
            container.innerHTML = '<p>Página no encontrada.</p>';
    }
}

// --- Dashboard Render ---
function renderDashboard(container) {
    const totalSales = state.inventory.sales.reduce((acc, s) => acc + s.total, 0);
    const activeSocios = state.socios.filter(s => calculateSocioDebt(s) === 0).length;
    
    container.innerHTML = `
        <div class="stat-grid">
            <div class="card" style="border-top: 4px solid var(--primary-blue);">
                <label><i class="fas fa-trophy"></i> Ganados (G)</label>
                <h2 id="wins-count">${calculateMatches('G')}</h2>
            </div>
            <div class="card" style="border-top: 4px solid var(--secondary-red);">
                <label><i class="fas fa-times-circle"></i> Perdidos (P)</label>
                <h2 id="loss-count">${calculateMatches('P')}</h2>
            </div>
            <div class="card" style="border-top: 4px solid var(--primary-blue); text-align: center;">
                <img src="img/logo.png" style="width: 100px; margin-bottom: 1rem; border-radius: 50%;">
                <h3>Club de Fútbol 19 de Junio</h3>
                <p class="text-muted">Sistema de Gestión Elite</p>
            </div>
        </div>
        
        <div class="card" style="margin-top: 2rem; border-left: 4px solid var(--primary-blue);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h3>Resumen Administrativo</h3>
                    <p class="text-muted" style="margin-top: 0.5rem;">Panel centralizado para el control de finanzas y estadísticas.</p>
                </div>
                <div style="text-align: right;">
                    <label>Estado de Caja</label>
                    <h2 style="color: var(--success);">$${totalSales.toLocaleString()}</h2>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; border-top: 1px solid var(--border-clr); padding-top: 1.5rem;">
                <div>
                    <label><i class="fas fa-users"></i> Socios Activos</label>
                    <h3 style="color: var(--primary-blue);">${activeSocios} / ${state.socios.length}</h3>
                </div>
                <div>
                    <label><i class="fas fa-shopping-cart"></i> Inversión en Stock</label>
                    <h3 style="color: var(--secondary-red);">$${state.inventory.purchases.reduce((a, b) => a + b.cost, 0).toLocaleString()}</h3>
                </div>
            </div>
        </div>
    `;
}

// CRUD Helpers
const safeAction = (callback, auditMeta = null) => {
    if (confirm("¿Desea realizar el cambio?")) {
        if (auditMeta) {
            state.auditLog.push({
                timestamp: new Date().toLocaleString(),
                module: auditMeta.module,
                itemData: JSON.stringify(auditMeta.item)
            });
        }
        callback();
        saveState(state);
        renderView(app.currentView);
    }
};

window.app.deleteMatch = (index) => safeAction(() => state.matches.splice(index, 1), { module: 'Partidos', item: state.matches[index] });
window.app.deleteProduct = (index) => safeAction(() => state.inventory.products.splice(index, 1), { module: 'Productos', item: state.inventory.products[index] });
window.app.deleteSale = (index) => safeAction(() => {
    const sale = state.inventory.sales[index];
    const product = state.inventory.products.find(p => p.id === sale.productId);
    if (product) product.stock += sale.quantity; // Restore stock
    state.inventory.sales.splice(index, 1);
}, { module: 'Ventas', item: state.inventory.sales[index] });
window.app.deleteSocio = (id) => {
    const s = state.socios.find(soc => soc.id === id);
    safeAction(() => {
        state.socios = state.socios.filter(soc => soc.id !== id);
    }, { module: 'Socios', item: s });
};
window.app.deleteFiado = (index) => safeAction(() => state.finances.fiados.splice(index, 1), { module: 'Fiados', item: state.finances.fiados[index] });
window.app.deleteJersey = (index) => safeAction(() => state.finances.jerseys.splice(index, 1), { module: 'Camisetas', item: state.finances.jerseys[index] });
window.app.deleteMisc = (index) => safeAction(() => state.finances.misc.splice(index, 1), { module: 'GastosVarios', item: state.finances.misc[index] });
window.app.deletePurchase = (index) => safeAction(() => {
  const p = state.inventory.purchases[index];
  const prod = state.inventory.products.find(pr => pr.id === p.productId);
  if (prod) prod.stock -= p.quantity;
  state.inventory.purchases.splice(index, 1);
}, { module: 'Compras', item: state.inventory.purchases[index] });

window.app.restoreItem = (index) => {
    if (!confirm("¿Desea restaurar este elemento a su ubicación original?")) return;
    const log = state.auditLog[index];
    const item = JSON.parse(log.itemData);
    
    try {
        switch(log.module) {
            case 'Partidos': state.matches.push(item); break;
            case 'Productos': state.inventory.products.push(item); break;
            case 'Ventas': 
                const pV = state.inventory.products.find(prod => prod.id === item.productId);
                if (pV) pV.stock -= item.quantity;
                state.inventory.sales.push(item);
                break;
            case 'Socios': state.socios.push(item); break;
            case 'Fiados': state.finances.fiados.push(item); break;
            case 'Camisetas': state.finances.jerseys.push(item); break;
            case 'GastosVarios': state.finances.misc.push(item); break;
            case 'Compras':
                const pC = state.inventory.products.find(prod => prod.id === item.productId);
                if (pC) pC.stock += item.quantity;
                state.inventory.purchases.push(item);
                break;
        }
        
        state.auditLog.splice(index, 1);
        saveState(state);
        renderView(app.currentView);
        alert("Elemento restaurado con éxito.");
    } catch (e) {
        alert("Error al restaurar: Es posible que los datos ya no sean compatibles.");
    }
};

// --- Placeholder Renders for remaining modules ---
function calculateMatches(type) {
  return state.matches.filter(m => m.result === type).length;
}

function renderPartidos(container) {
    container.innerHTML = `
        <div class="card">
            <h3>Nuevo Partido</h3>
            <form id="match-form" class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="match-date" required>
                </div>
                <div class="form-group">
                    <label>Rival</label>
                    <input type="text" id="match-opponent" placeholder="Nombre equipo rival" required>
                </div>
                <div class="form-group">
                    <label>Goles Club</label>
                    <input type="number" id="match-score-home" min="0" required>
                </div>
                <div class="form-group">
                    <label>Goles Rival</label>
                    <input type="number" id="match-score-away" min="0" required>
                </div>
                <button type="submit" class="btn btn-primary" style="grid-column: span 2;">Registrar Partido</button>
            </form>
        </div>
        <div class="card" style="margin-top: 2rem;">
            <h3>Historial de Partidos</h3>
            <div class="table-container">
                <table id="match-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Oponente</th>
                            <th>Resultado</th>
                            <th>Score</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="match-list">
                        ${state.matches.slice().reverse().map((m, i_orig) => {
                            const i = state.matches.length - 1 - i_orig;
                            return `
                                <tr>
                                    <td>${m.date}</td>
                                    <td>${m.opponent}</td>
                                    <td>
                                        <span class="badge ${m.result === 'G' ? 'badge-paid' : m.result === 'P' ? 'badge-danger' : 'badge-pending'}">
                                            ${m.result === 'G' ? 'Ganado' : m.result === 'P' ? 'Perdido' : 'Empate'}
                                        </span>
                                    </td>
                                    <td>${m.scoreHome} - ${m.scoreAway}</td>
                                    <td>
                                        <button class="btn btn-outline btn-sm" onclick="app.deleteMatch(${i})" title="Eliminar">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('match-form').addEventListener('submit', handleAddMatch);
}

function handleAddMatch(e) {
    e.preventDefault();
    const home = parseInt(document.getElementById('match-score-home').value);
    const away = parseInt(document.getElementById('match-score-away').value);
    let result = 'E';
    if (home > away) result = 'G';
    else if (home < away) result = 'P';
    
    const newMatch = {
        date: new Date().toLocaleString(),
        opponent: document.getElementById('match-opponent').value,
        scoreHome: home,
        scoreAway: away,
        result: result
    };
    
    safeAction(() => state.matches.push(newMatch));
}

function renderInventario(container) { 
  container.innerHTML = `
    <div class="card">
        <h3>Mantenedor de Productos</h3>
        <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">Administra tus productos base.</p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Precio Venta</th>
                        <th>Stock Actual</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.inventory.products.map((p, i) => `
                        <tr>
                            <td>${p.name}</td>
                            <td>$${p.price.toLocaleString()}</td>
                            <td id="stock-${p.id}">${p.stock}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="app.showAddStock('${p.id}')">
                                    <i class="fas fa-plus"></i> Stock
                                </button>
                                <button class="btn btn-outline btn-sm" onclick="app.showEditProduct(${i})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline btn-sm" onclick="app.deleteProduct(${i})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
        <h3>Historial de Compras (Egresos)</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Producto</th><th>Cant.</th><th>Costo</th><th>Acción</th></tr>
                </thead>
                <tbody>
                    ${state.inventory.purchases.slice().reverse().map((p, i_orig) => {
                        const i = state.inventory.purchases.length - 1 - i_orig;
                        return `
                            <tr>
                                <td>${p.date}</td>
                                <td>${p.productName}</td>
                                <td>${p.quantity}</td>
                                <td>$${p.cost.toLocaleString()}</td>
                                <td>
                                    <button class="btn btn-outline btn-sm" onclick="app.deletePurchase(${i})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
  `;
}

window.app.showEditProduct = (index) => {
    const product = state.inventory.products[index];
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Editar Producto: ${product.name}</h3>
                <form id="edit-prod-form">
                    <div class="form-group"><label>Nombre</label><input type="text" id="ep-name" value="${product.name}" required></div>
                    <div class="form-group"><label>Precio Venta</label><input type="number" id="ep-price" value="${product.price}" required></div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('edit-prod-form').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('ep-name').value;
        const price = parseInt(document.getElementById('ep-price').value);
        safeAction(() => {
            product.name = name;
            product.price = price;
            document.getElementById('modal-root').innerHTML = '';
        });
    };
};

// Global functions for stock actions
window.app = window.app || {};
window.app.showAddStock = (productId) => {
    const product = state.inventory.products.find(p => p.id === productId);
    const modalRoot = document.getElementById('modal-root');
    const prevStock = product.stock;
    const prevValue = prevStock * product.price;

    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal" style="max-width: 600px;">
                <h3>Ingresar Compra / Stock: ${product.name}</h3>
                
                <div style="margin: 1.5rem 0; background: var(--bg-light); padding: 1rem; border-radius: 8px;">
                    <table class="cart-table">
                        <thead>
                            <tr>
                                <th>Concepto</th>
                                <th>Anterior</th>
                                <th>Adición</th>
                                <th>Actual (Total)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><b>Unidades</b></td>
                                <td>${prevStock}</td>
                                <td id="add-units-disp">0</td>
                                <td id="total-units-disp" style="font-weight: bold; color: var(--primary-blue);">${prevStock}</td>
                            </tr>
                            <tr>
                                <td><b>Valor ($)</b></td>
                                <td>$${prevValue.toLocaleString()}</td>
                                <td id="add-value-disp">$0</td>
                                <td id="total-value-disp" style="font-weight: bold; color: var(--success);">$${prevValue.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <form id="stock-form">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="form-group">
                            <label>Cantidad Nueva (Unidades)</label>
                            <input type="number" id="stock-qty" min="1" required>
                        </div>
                        <div class="form-group">
                            <label>Costo Total Compra (Gasto)</label>
                            <input type="number" id="stock-cost" min="0" placeholder="0 CLP" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Nuevo Precio Venta (Opcional)</label>
                        <input type="number" id="new-price" placeholder="Actual: $${product.price}">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Registrar Inventario</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    const qtyInput = document.getElementById('stock-qty');
    const priceInput = document.getElementById('new-price');
    
    const updateDisplays = () => {
        const qty = parseInt(qtyInput.value) || 0;
        const price = parseInt(priceInput.value) || product.price;
        
        const totalQty = prevStock + qty;
        const addValue = qty * price;
        const totalValue = totalQty * price;
        
        document.getElementById('add-units-disp').innerText = `+${qty}`;
        document.getElementById('total-units-disp').innerText = totalQty;
        document.getElementById('add-value-disp').innerText = `$${addValue.toLocaleString()}`;
        document.getElementById('total-value-disp').innerText = `$${totalValue.toLocaleString()}`;
    };

    qtyInput.oninput = updateDisplays;
    priceInput.oninput = updateDisplays;
    
    document.getElementById('stock-form').onsubmit = (e) => {
        e.preventDefault();
        const qty = parseInt(qtyInput.value);
        const cost = parseInt(document.getElementById('stock-cost').value);
        const newPrice = parseInt(priceInput.value) || product.price;
        
        safeAction(() => {
            product.stock += qty;
            product.price = newPrice;
            
            state.inventory.purchases.push({
                date: new Date().toLocaleString(),
                productId: product.id,
                productName: product.name,
                quantity: qty,
                cost: cost
            });
            document.getElementById('modal-root').innerHTML = '';
        });
    };
};

function renderVentas(container) {
    if (!app.cart) app.cart = [];

    const updateCalculatorFromCart = () => {
        const total = app.cart.reduce((acc, item) => acc + item.total, 0);
        const calcTotalRow = document.getElementById('calc-total');
        if (calcTotalRow) {
            calcTotalRow.value = total;
            calcTotalRow.dispatchEvent(new Event('input'));
        }
    };

    container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div class="card">
            <h3>Nueva Venta (Carrito)</h3>
            <form id="cart-add-form" style="margin-bottom: 1.5rem; border-bottom: 1px dashed var(--border-clr); padding-bottom: 1.5rem;">
                <div class="form-group">
                    <label>Producto</label>
                    <select id="sale-product">
                        ${state.inventory.products.map(p => `
                            <option value="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
                                ${p.name} - $${p.price.toLocaleString()} (Stock: ${p.stock})
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Cantidad</label>
                    <input type="number" id="sale-qty" min="1" value="1" required>
                </div>
                <button type="submit" class="btn btn-outline" style="width: 100%;">
                    <i class="fas fa-cart-plus"></i> Agregar al Carrito
                </button>
            </form>

            <div id="cart-container">
                <table class="cart-table">
                    <thead>
                        <tr><th>Producto</th><th>Cant.</th><th>Subtotal</th><th></th></tr>
                    </thead>
                    <tbody id="cart-list">
                        ${app.cart.map((item, idx) => `
                            <tr>
                                <td>${item.productName}</td>
                                <td>${item.quantity}</td>
                                <td>$${item.total.toLocaleString()}</td>
                                <td><button class="btn btn-sm" onclick="app.removeFromCart(${idx})"><i class="fas fa-times"></i></button></td>
                            </tr>
                        `).join('')}
                        ${app.cart.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Carrito vacío</td></tr>' : ''}
                    </tbody>
                </table>
                <div style="margin-top: 1rem; text-align: right;">
                    <label>TOTAL VENTA</label>
                    <div class="total-display" id="cart-total-display">$${app.cart.reduce((acc, i) => acc + i.total, 0).toLocaleString()}</div>
                </div>
                <button id="finalize-sale-btn" class="btn btn-primary" style="width: 100%; margin-top: 1rem;" ${app.cart.length === 0 ? 'disabled' : ''}>
                    <i class="fas fa-check-circle"></i> Confirmar y Finalizar Venta
                </button>
            </div>
        </div>
        
        <div class="card" style="border-left: 4px solid var(--secondary-red);">
            <h3>Calculadora de Vuelto</h3>
            <div class="form-group">
                <label>Total Compra</label>
                <input type="number" id="calc-total" class="input-total-sync" value="0">
            </div>
            <div class="form-group">
                <label>Paga con</label>
                <input type="number" id="calc-paid" style="font-size: 1.5rem; text-align: center;" placeholder="0">
            </div>
            <div style="background: var(--bg-darker); padding: 1.5rem; border-radius: 12px; text-align: center; border: 2px solid var(--border-clr);">
                <label style="font-weight: 800; letter-spacing: 1px;">VUELTO A ENTREGAR</label>
                <h1 id="calc-result" style="color: var(--success); font-size: 3rem; margin-top: 0.5rem;">$0</h1>
            </div>
        </div>
    </div>
    
    <div class="card" style="margin-top: 2rem;">
        <h3>Historial de Ventas Recientes</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Acción</th></tr>
                </thead>
                <tbody id="sales-list">
                    ${state.inventory.sales.slice().reverse().map((s, i_orig) => {
                        const i = state.inventory.sales.length - 1 - i_orig;
                        return `
                            <tr>
                                <td>${s.date}</td>
                                <td>${s.productName}</td>
                                <td>${s.quantity}</td>
                                <td>$${s.total.toLocaleString()}</td>
                                <td>
                                    <button class="btn btn-outline btn-sm" onclick="app.deleteSale(${i})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
    `;
    
    // Logic for Cart
    document.getElementById('cart-add-form').onsubmit = (e) => {
        e.preventDefault();
        const pId = document.getElementById('sale-product').value;
        const qty = parseInt(document.getElementById('sale-qty').value);
        const product = state.inventory.products.find(p => p.id === pId);
        
        if (product.stock < qty) {
            alert('Stock insuficiente');
            return;
        }

        app.cart.push({
            productId: pId,
            productName: product.name,
            quantity: qty,
            price: product.price,
            total: product.price * qty
        });
        
        renderVentas(container);
    };

    window.app.removeFromCart = (idx) => {
        app.cart.splice(idx, 1);
        renderVentas(container);
    };

    document.getElementById('finalize-sale-btn').onclick = () => {
        if (app.cart.length === 0) return;
        
        safeAction(() => {
            app.cart.forEach(item => {
                const product = state.inventory.products.find(p => p.id === item.productId);
                if (product) product.stock -= item.quantity;
                
                state.inventory.sales.push({
                    date: new Date().toLocaleString(),
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    price: item.price,
                    total: item.total
                });
            });
            app.cart = [];
            renderView('ventas');
        });
    };

    // Calculator Logic
    const tIn = document.getElementById('calc-total');
    const pIn = document.getElementById('calc-paid');
    const resDisp = document.getElementById('calc-result');
    
    const updCalc = () => {
        const totalVal = parseInt(tIn.value) || 0;
        const paidVal = parseInt(pIn.value) || 0;
        const diff = paidVal - totalVal;
        resDisp.innerText = `$${(diff > 0 ? diff : 0).toLocaleString()}`;
        resDisp.style.color = diff >= 0 ? 'var(--success)' : 'var(--secondary-red)';
    };
    
    tIn.oninput = updCalc;
    pIn.oninput = updCalc;
    
    updateCalculatorFromCart();
}

function calculateSocioDebt(socio) {
  const fee = 5000;
  const cycleMonths = ["03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]; // Mar to Dec
  const totalPaid = socio.totalPaid || 0;
  
  // Calculate how many months the totalPaid covers
  const monthsCovered = Math.floor(totalPaid / fee);
  
  // Current month index in the cycle (0-based)
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  let currentIdxInCycle = currentMonth >= 3 ? currentMonth - 3 : -1; // -1 if before March
  if (currentIdxInCycle > 9) currentIdxInCycle = 9; // Cap at Dec

  let debt = 0;
  if (currentIdxInCycle >= 0) {
      const requiredMonths = currentIdxInCycle + 1;
      if (monthsCovered < requiredMonths) {
          debt = (requiredMonths - monthsCovered) * fee;
      }
  }
  return debt;
}

function renderSocios(container) { 
  const cycleMonths = [
    { k: "03", n: "Mar" }, { k: "04", n: "Abr" }, { k: "05", n: "May" },
    { k: "06", n: "Jun" }, { k: "07", n: "Jul" }, { k: "08", n: "Ago" },
    { k: "09", n: "Sep" }, { k: "10", n: "Oct" }, { k: "11", n: "Nov" },
    { k: "12", n: "Dic" }
  ];

  container.innerHTML = `
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <div>
                <h3>Planilla de Cuotas de Socios</h3>
                <p class="text-muted" style="font-size: 0.8rem;">Ciclo Deportivo: Marzo - Diciembre (Cuota: $5.000)</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="app.showAddSocio()">
                <i class="fas fa-user-plus"></i> Nuevo Socio
            </button>
        </div>

        <div class="socio-grid-container">
            <table>
                <thead>
                    <tr>
                        <th style="min-width: 150px;">Socio</th>
                        ${cycleMonths.map(m => `<th class="socio-month-header">${m.n}</th>`).join('')}
                        <th style="text-align: right;">Total Pagado</th>
                        <th style="text-align: right;">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.socios.length === 0 ? '<tr><td colspan="13" style="text-align:center; padding: 2rem;">No hay socios registrados.</td></tr>' : ''}
                    ${state.socios.map((s, i) => {
                        const totalPaid = s.totalPaid || 0;
                        const monthsCovered = Math.floor(totalPaid / 5000);
                        const debt = calculateSocioDebt(s);

                        return `
                        <tr>
                            <td>
                                <div><b>${s.name}</b></div>
                                <div style="font-size: 0.7rem; color: ${debt === 0 ? 'var(--success)' : 'var(--secondary-red)'};">
                                    ${debt === 0 ? 'AL DÍA' : `DEUDA: $${debt.toLocaleString()}`}
                                </div>
                            </td>
                            ${cycleMonths.map((m, idx) => {
                                const isPaid = idx < monthsCovered;
                                return `
                                    <td class="socio-month-cell">
                                        <div class="month-badge ${isPaid ? 'month-paid' : 'month-debt'}" title="${isPaid ? 'Pagado' : 'Pendiente'}">
                                            ${isPaid ? '<i class="fas fa-check"></i>' : '<i class="fas fa-clock"></i>'}
                                        </div>
                                    </td>
                                `;
                            }).join('')}
                            <td style="text-align: right; font-family: 'Outfit', sans-serif; font-weight: 600;">
                                $${totalPaid.toLocaleString()}
                            </td>
                            <td style="text-align: right;">
                                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                                    <button class="btn btn-primary btn-sm" onclick="app.showEditSocioPayments('${s.id}')" title="Editar Pagos">
                                        <i class="fas fa-dollar-sign"></i>
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="app.showEditSocio('${s.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-outline btn-sm" onclick="app.deleteSocio('${s.id}')" title="Eliminar Socio">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
  `;
}

window.app.showEditSocioPayments = (id) => {
    const socio = state.socios.find(s => s.id === id);
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Actualizar Monto Pagado: ${socio.name}</h3>
                <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1.5rem;">
                    Ingrese el total de dinero que este socio ha pagado a la fecha. El sistema distribuirá este monto entre los meses (Marzo a Diciembre).
                </p>
                <form id="edit-payments-form">
                    <div class="form-group">
                        <label>Monto Total Acumulado (CLP)</label>
                        <input type="number" id="ep-total-paid" value="${socio.totalPaid || 0}" step="5000" min="0" required>
                    </div>
                    <div style="background: var(--bg-light); padding: 1rem; border-radius: 8px;">
                        <p id="meses-cubiertos" style="font-weight: 600; font-size: 0.9rem; color: var(--primary-blue);"></p>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">Guardar Cambios</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const input = document.getElementById('ep-total-paid');
    const display = document.getElementById('meses-cubiertos');
    const updateMsg = () => {
        const val = parseInt(input.value) || 0;
        const months = Math.floor(val / 5000);
        display.innerText = `Este monto cubre ${months} mes(es) del ciclo deportivo.`;
    };
    input.oninput = updateMsg;
    updateMsg();

    document.getElementById('edit-payments-form').onsubmit = (e) => {
        e.preventDefault();
        const newVal = parseInt(input.value);
        safeAction(() => {
            socio.totalPaid = newVal;
            document.getElementById('modal-root').innerHTML = '';
            renderView('socios');
        });
    };
};

window.app.showEditSocio = (id) => {
    const socio = state.socios.find(s => s.id === id);
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Editar Socio</h3>
                <form id="edit-socio-form">
                    <div class="form-group">
                        <label>Nombre Completo</label>
                        <input type="text" id="es-name" value="${socio.name}" required>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary">Guardar</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('edit-socio-form').onsubmit = (e) => {
        e.preventDefault();
        const newName = document.getElementById('es-name').value;
        safeAction(() => {
            socio.name = newName;
            document.getElementById('modal-root').innerHTML = '';
            renderView('socios');
        });
    };
};

window.app.deleteSocio = (id) => {
    const socioIdx = state.socios.findIndex(s => s.id === id);
    const socio = state.socios[socioIdx];
    safeAction(() => {
        state.socios.splice(socioIdx, 1);
        renderView('socios');
    }, { module: 'Socios', item: socio });
};

window.app.showAddSocio = () => {
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Nuevo Socio</h3>
                <form id="socio-form">
                    <div class="form-group">
                        <label>Nombre Completo</label>
                        <input type="text" id="socio-name" required>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary">Registrar</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('socio-form').onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('socio-name').value;
        safeAction(() => {
            state.socios.push({
                id: 's' + Date.now(),
                name: name,
                joinDate: new Date().toISOString().split('T')[0],
                totalPaid: 0,
                payments: {}
            });
            document.getElementById('modal-root').innerHTML = '';
        });
    };
};

function renderCamisetas(container) {
  container.innerHTML = `
    <div class="card">
        <h3>Ingreso por Venta de Camisetas</h3>
        <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">Registra el dinero recaudado por la venta o arriendo de indumentaria.</p>
        <form id="jersey-form" style="display: flex; gap: 1rem; align-items: flex-end;">
            <div class="form-group" style="flex: 1;">
                <label>Monto Recaudado (CLP)</label>
                <input type="number" id="jersey-amount" required>
            </div>
            <button type="submit" class="btn btn-primary" style="height: 45px;">Registrar Ingreso</button>
        </form>
    </div>

    <div class="card" style="margin-top: 2rem;">
        <h3>Historial de Camisetas</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Monto</th><th>Acción</th></tr>
                </thead>
                <tbody>
                    ${state.finances.jerseys.slice().reverse().map((j, i_orig) => {
                        const i = state.finances.jerseys.length - 1 - i_orig;
                        return `
                            <tr>
                                <td>${j.date}</td>
                                <td>$${j.amount.toLocaleString()}</td>
                                <td><button class="btn btn-outline btn-sm" onclick="app.deleteJersey(${i})"><i class="fas fa-trash"></i></button></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
  `;

  document.getElementById('jersey-form').onsubmit = (e) => {
      e.preventDefault();
      const amount = parseInt(document.getElementById('jersey-amount').value);
      safeAction(() => {
          state.finances.jerseys.push({ date: new Date().toLocaleDateString(), amount });
      });
  };
}

function renderGastosVarios(container) {
  container.innerHTML = `
    <div class="card">
        <h3>Egresos y Gastos Varios</h3>
        <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">Registra pagos de arriendos, arbitraje, limpieza, etc.</p>
        <form id="misc-form" style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 1rem; align-items: flex-end;">
            <div class="form-group">
                <label>Descripción del Gasto</label>
                <input type="text" id="misc-desc" placeholder="Ej: Pago de Árbitros" required>
            </div>
            <div class="form-group">
                <label>Monto (CLP)</label>
                <input type="number" id="misc-amount" required>
            </div>
            <button type="submit" class="btn btn-secondary" style="height: 45px;">Registrar Egreso</button>
        </form>
    </div>

    <div class="card" style="margin-top: 2rem;">
        <h3>Historial de Gastos</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Descripción</th><th>Monto</th><th>Acción</th></tr>
                </thead>
                <tbody>
                    ${state.finances.misc.slice().reverse().map((m, i_orig) => {
                        const i = state.finances.misc.length - 1 - i_orig;
                        return `
                            <tr>
                                <td>${m.date}</td>
                                <td>${m.desc}</td>
                                <td>$${m.amount.toLocaleString()}</td>
                                <td><button class="btn btn-outline btn-sm" onclick="app.deleteMisc(${i})"><i class="fas fa-trash"></i></button></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
  `;

  document.getElementById('misc-form').onsubmit = (e) => {
      e.preventDefault();
      const desc = document.getElementById('misc-desc').value;
      const amount = parseInt(document.getElementById('misc-amount').value);
      safeAction(() => {
          state.finances.misc.push({ date: new Date().toLocaleDateString(), desc, amount });
      });
  };
}

function renderFiados(container) {
  container.innerHTML = `
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3>Control de Fiados y Créditos</h3>
            <button class="btn btn-primary btn-sm" onclick="app.showAddFiado()">
                <i class="fas fa-plus"></i> Nuevo Registro de Fiado
            </button>
        </div>
        <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">
            Nota: Los fiados pendientes se consideran "Egresos" en el balance (capital fuera del club).
        </p>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Nombre Deudor</th><th>Productos</th><th>Total</th><th>Estado</th><th>Acción</th></tr>
                </thead>
                <tbody>
                    ${state.finances.fiados.slice().reverse().map((f, i_orig) => {
                        const i = state.finances.fiados.length - 1 - i_orig;
                        return `
                            <tr>
                                <td><b>${f.name}</b></td>
                                <td style="font-size: 0.8rem; color: var(--text-muted);">
                                    ${f.items.map(it => `${it.productName} (x${it.quantity})`).join(', ')}
                                </td>
                                <td>$${f.total.toLocaleString()}</td>
                                <td>
                                    ${f.paid ? '<span class="badge badge-paid">Pagado</span>' : '<span class="badge badge-danger">Pendiente</span>'}
                                </td>
                                <td>
                                    ${!f.paid ? `<button class="btn btn-primary btn-sm" onclick="app.markFiadoPaid(${i})">Liquidar Deuda</button>` : ''}
                                    <button class="btn btn-outline btn-sm" onclick="app.deleteFiado(${i})"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                    ${state.finances.fiados.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No hay registros de fiados.</td></tr>' : ''}
                </tbody>
            </table>
        </div>
    </div>
  `;
}

function renderFinanzas(container) { 
  if (!app.finances) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      app.finances = { startDate: firstDay, endDate: lastDay };
  }

  const parseDate = (dStr) => {
      // Handles both LocaleString and YYYY-MM-DD
      if (dStr.includes('/')) {
          const [d, m, y] = dStr.split(',')[0].split('/');
          return new Date(`${y}-${m}-${d}`);
      }
      return new Date(dStr);
  };

  const isInRange = (dateStr) => {
      const d = parseDate(dateStr);
      const start = new Date(app.finances.startDate);
      const end = new Date(app.finances.endDate);
      end.setHours(23, 59, 59);
      return d >= start && d <= end;
  };

  // Filtered Data
  const fallbackDate = new Date().toLocaleDateString();
  const fSales = state.inventory.sales.filter(s => isInRange(s.date || fallbackDate));
  const fJerseys = state.finances.jerseys.filter(j => isInRange(j.date || fallbackDate));
  const fMisc = state.finances.misc.filter(m => isInRange(m.date || fallbackDate));
  const fPurchases = state.inventory.purchases.filter(p => isInRange(p.date || fallbackDate));
  const fFiadosPending = state.finances.fiados.filter(f => !f.paid && isInRange(f.date || new Date().toLocaleDateString()));
  const fFiadosRecovered = state.finances.fiados.filter(f => f.paid && isInRange(f.date || new Date().toLocaleDateString()));
  
  // For Socios, since we don't have individual payment dates in the new logic, 
  // we'll assume the payments are for the current month if not specified.
  // Ideally we should track this, but for now we'll use a simplified approach or skip filtering if no date available.
  const totalSocioIncome = state.socios.reduce((acc, s) => acc + (s.totalPaid || 0), 0); 
  // Note: This is an area where the user might want more granular filtering later.

  const totalSalesVal = fSales.reduce((acc, s) => acc + s.total, 0);
  const totalJerseysVal = fJerseys.reduce((acc, j) => acc + j.amount, 0);
  const totalFiadosRecoveredVal = fFiadosRecovered.reduce((acc, f) => acc + f.total, 0);
  
  const totalIn = totalSalesVal + totalJerseysVal + totalSocioIncome + totalFiadosRecoveredVal;
  
  const totalPurchasesVal = fPurchases.reduce((acc, p) => acc + p.cost, 0);
  const totalMiscVal = fMisc.reduce((acc, m) => acc + m.amount, 0);
  const totalFiadosPendingVal = fFiadosPending.reduce((acc, f) => acc + f.total, 0); // User requested fiados as egresos
  
  const totalOut = totalPurchasesVal + totalMiscVal + totalFiadosPendingVal;

  container.innerHTML = `
    <div id="balance-report">
        <div class="card" style="margin-bottom: 2rem; border-top: 4px solid var(--primary-blue);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2>Balance y Estadísticas</h2>
                    <p class="text-muted">Control financiero por rango de fechas</p>
                </div>
                <div style="display: flex; gap: 1rem; align-items: flex-end;">
                    <div class="form-group" style="margin:0;">
                        <label>Desde</label>
                        <input type="date" id="fin-start" value="${app.finances.startDate}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Hasta</label>
                        <input type="date" id="fin-end" value="${app.finances.endDate}">
                    </div>
                    <button id="apply-filter-btn" class="btn btn-primary" style="height: 42px;"><i class="fas fa-filter"></i></button>
                </div>
            </div>
        </div>

        <div class="stat-grid">
            <div class="card" style="border-bottom: 4px solid var(--success);">
                <label>Ingresos (Entradas)</label>
                <h2 style="color: var(--success);">$${totalIn.toLocaleString()}</h2>
            </div>
            <div class="card" style="border-bottom: 4px solid var(--secondary-red);">
                <label>Egresos (Salidas + Fiados)</label>
                <h2 style="color: var(--secondary-red);">$${totalOut.toLocaleString()}</h2>
            </div>
            <div class="card" style="border-bottom: 4px solid var(--primary-blue);">
                <label>Balance Neto</label>
                <h2 style="${totalIn - totalOut < 0 ? 'color: var(--secondary-red)' : ''}">$${(totalIn - totalOut).toLocaleString()}</h2>
            </div>
        </div>

        <div class="card" style="margin-top: 2rem;">
            <h3>Comparativa Mensual: Ingresos vs Egresos</h3>
            <div style="height: 300px; margin-top: 1rem;">
                <canvas id="finance-chart"></canvas>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
            <div class="card">
                <h3>Detalle de Ingresos</h3>
                <div class="table-container">
                    <table class="cart-table">
                        <tr><td>Ventas Corrientes</td><td style="text-align:right;">+ $${totalSalesVal.toLocaleString()}</td></tr>
                        <tr><td>Cuotas Socios (Histórico)</td><td style="text-align:right;">+ $${totalSocioIncome.toLocaleString()}</td></tr>
                        <tr><td>Indumentaria/Camisetas</td><td style="text-align:right;">+ $${totalJerseysVal.toLocaleString()}</td></tr>
                        <tr><td>Fiados Recuperados</td><td style="text-align:right;">+ $${totalFiadosRecoveredVal.toLocaleString()}</td></tr>
                        <tr style="font-weight:bold; border-top: 2px solid var(--border-clr); font-size: 1.1rem;">
                            <td>TOTAL</td><td style="text-align:right; color: var(--success);">$${totalIn.toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="card">
                <h3>Detalle de Egresos</h3>
                <div class="table-container">
                    <table class="cart-table">
                        <tr><td>Compras Stock</td><td style="text-align:right;">- $${totalPurchasesVal.toLocaleString()}</td></tr>
                        <tr><td>Gastos Varios</td><td style="text-align:right;">- $${totalMiscVal.toLocaleString()}</td></tr>
                        <tr style="color: var(--secondary-red);"><td>Fiados Pendientes</td><td style="text-align:right;">- $${totalFiadosPendingVal.toLocaleString()}</td></tr>
                        <tr style="font-weight:bold; border-top: 2px solid var(--border-clr); font-size: 1.1rem;">
                            <td>TOTAL</td><td style="text-align:right; color: var(--secondary-red);">$${totalOut.toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top: 2rem; text-align: center; border: 1px dashed var(--primary-blue);">
            <button class="btn btn-outline" onclick="app.exportPDF()">
                <i class="fas fa-file-pdf"></i> Generar Reporte PDF Profesional
            </button>
        </div>
    </div>
  `;

  // Filter Actions
  document.getElementById('apply-filter-btn').onclick = () => {
      app.finances.startDate = document.getElementById('fin-start').value;
      app.finances.endDate = document.getElementById('fin-end').value;
      renderFinanzas(container);
  };

  // Chart Logic
  const ctx = document.getElementById('finance-chart').getContext('2d');
  
  // Generate labels (last 6 months or filtered range)
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const labels = [];
  const inData = [];
  const outData = [];
  
  // Simplified: Show data for months in the filtered range
  const start = new Date(app.finances.startDate);
  const end = new Date(app.finances.endDate);
  
  let curr = new Date(start.getFullYear(), start.getMonth(), 1);
  while (curr <= end) {
      const label = `${months[curr.getMonth()]} ${curr.getFullYear().toString().slice(-2)}`;
      labels.push(label);
      
      const mKey = `${curr.getFullYear()}-${(curr.getMonth()+1).toString().padStart(2, '0')}`;
      
      // Calculate month totals
      const mIn = state.inventory.sales.filter(s => (s.date || '').includes(mKey)).reduce((a, b) => a + b.total, 0) +
                  state.finances.jerseys.filter(j => (j.date || '').includes(mKey)).reduce((a, b) => a + b.amount, 0);
                  
      const mOut = state.inventory.purchases.filter(p => (p.date || '').includes(mKey)).reduce((a, b) => a + b.cost, 0) +
                   state.finances.misc.filter(mx => (mx.date || '').includes(mKey)).reduce((a, b) => a + b.amount, 0);
      
      inData.push(mIn);
      outData.push(mOut);
      
      curr.setMonth(curr.getMonth() + 1);
      if (labels.length > 12) break; // Limit to 12 months
  }

  app.chart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: labels,
          datasets: [
              {
                  label: 'Ingresos',
                  data: inData,
                  backgroundColor: 'rgba(16, 185, 129, 0.7)',
                  borderRadius: 6
              },
              {
                  label: 'Egresos',
                  data: outData,
                  backgroundColor: 'rgba(238, 28, 37, 0.7)',
                  borderRadius: 6
              }
          ]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: { position: 'bottom' }
          },
          scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
              x: { grid: { display: false } }
          }
      }
  });
}

window.app.showAddFiado = () => {
    if (!app.fiadoCart) app.fiadoCart = [];
    
    const renderFiadoModal = () => {
        const modalRoot = document.getElementById('modal-root');
        modalRoot.innerHTML = `
            <div class="modal-overlay">
                <div class="modal" style="max-width: 600px;">
                    <h3>Registrar Nuevo Fiado</h3>
                    <div class="form-group"><label>Nombre del Deudor</label><input type="text" id="f-name-master" placeholder="Nombre completo" required></div>
                    
                    <div style="background: var(--bg-light); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px dashed var(--border-clr);">
                        <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 0.5rem; align-items: flex-end;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label>Producto</label>
                                <select id="f-prod-select">
                                    ${state.inventory.products.map(p => `<option value="${p.id}">${p.name} ($${p.price})</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label>Cant.</label>
                                <input type="number" id="f-qty-select" value="1" min="1">
                            </div>
                            <button type="button" class="btn btn-outline btn-sm" onclick="app.addFiadoToCart()" style="height:38px;">+</button>
                        </div>

                        <table class="cart-table" style="margin-top: 1rem; background: white;">
                            <thead><tr><th>Item</th><th>Cant.</th><th>Subtotal</th><th></th></tr></thead>
                            <tbody id="fiado-cart-list">
                                ${app.fiadoCart.map((item, idx) => `
                                    <tr>
                                        <td>${item.productName}</td>
                                        <td>${item.quantity}</td>
                                        <td>$${item.total.toLocaleString()}</td>
                                        <td><button type="button" class="btn btn-sm" onclick="app.removeFiadoFromCart(${idx})">×</button></td>
                                    </tr>
                                `).join('')}
                                ${app.fiadoCart.length === 0 ? '<tr><td colspan="4" style="text-align:center;">Carrito vacío</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>

                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="button" class="btn btn-primary" style="flex: 1;" onclick="app.finalizeFiado()">
                            Registrar Deuda ($${app.fiadoCart.reduce((a, b) => a + b.total, 0).toLocaleString()})
                        </button>
                        <button type="button" class="btn btn-outline" onclick="app.closeFiadoModal()">Cancelar</button>
                    </div>
                </div>
            </div>
        `;
    };

    window.app.addFiadoToCart = () => {
        const pId = document.getElementById('f-prod-select').value;
        const qty = parseInt(document.getElementById('f-qty-select').value);
        const product = state.inventory.products.find(p => p.id === pId);
        const nameVal = document.getElementById('f-name-master').value;

        app.fiadoCart.push({
            productId: pId,
            productName: product.name,
            quantity: qty,
            total: product.price * qty
        });
        
        renderFiadoModal();
        document.getElementById('f-name-master').value = nameVal; // Keep name
    };

    window.app.removeFiadoFromCart = (idx) => {
        const nameVal = document.getElementById('f-name-master').value;
        app.fiadoCart.splice(idx, 1);
        renderFiadoModal();
        document.getElementById('f-name-master').value = nameVal;
    };

    window.app.finalizeFiado = () => {
        const name = document.getElementById('f-name-master').value;
        if (!name || app.fiadoCart.length === 0) {
            alert("Debe ingresar el nombre y al menos un producto.");
            return;
        }

        safeAction(() => {
            state.finances.fiados.push({
                date: new Date().toLocaleString(),
                name: name,
                items: [...app.fiadoCart],
                total: app.fiadoCart.reduce((a, b) => a + b.total, 0),
                paid: false
            });
            app.fiadoCart = [];
            document.getElementById('modal-root').innerHTML = '';
        });
    };

    window.app.closeFiadoModal = () => {
        app.fiadoCart = [];
        document.getElementById('modal-root').innerHTML = '';
    };

    renderFiadoModal();
};

window.app.markFiadoPaid = (index) => {
    safeAction(() => {
        state.finances.fiados[index].paid = true;
    });
};

window.app.exportPDF = () => {
    const cycleMonths = [
        { key: "03", name: "Marzo" }, { key: "04", name: "Abril" }, { key: "05", name: "Mayo" },
        { key: "06", name: "Junio" }, { key: "07", name: "Julio" }, { key: "08", name: "Agosto" },
        { key: "09", name: "Septiembre" }, { key: "10", name: "Octubre" }, { key: "11", name: "Noviembre" },
        { key: "12", name: "Diciembre" }, { key: "01", name: "Enero" }, { key: "02", name: "Febrero" }
    ];
    
    const currentYear = new Date().getFullYear();
    const seasonData = cycleMonths.map(m => {
        const year = (parseInt(m.key) < 3) ? currentYear + 1 : currentYear;
        const monthKey = `${currentYear}-${m.key}`; // Simplified for current year logic
        
        const sales = state.inventory.sales.filter(s => s.date.startsWith(monthKey)).reduce((a, b) => a + b.total, 0);
        const jerseys = state.finances.jerseys.filter(j => j.date.includes(m.name) || j.date.startsWith(monthKey)).reduce((a, b) => a + b.amount, 0);
        const socioPayments = state.socios.reduce((acc, s) => {
            return acc + (s.payments[monthKey] ? 5000 : 0);
        }, 0);
        
        const purchases = state.inventory.purchases.filter(p => p.date.startsWith(monthKey)).reduce((a, b) => a + b.cost, 0);
        const misc = state.finances.misc.filter(mx => mx.date.startsWith(monthKey)).reduce((a, b) => a + b.amount, 0);
        
        const totalIn = sales + jerseys + socioPayments;
        const totalOut = purchases + misc;
        
        return { name: m.name, in: totalIn, out: totalOut, net: totalIn - totalOut };
    });

    const reportHtml = `
        <div style="font-family: 'Inter', sans-serif; padding: 40px; color: #334155;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                    <h1 style="margin: 0; color: #1e293b; font-size: 24px;">BALANCE GENERAL ANUAL</h1>
                    <p style="margin: 5px 0 0 0; color: #64748b;">Ciclo Deportivo: Marzo a Febrero</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; color: #ef4444;">CLUB 19 DE JUNIO</h2>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">Generado el ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0;">Mes</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Ingresos</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Egresos</th>
                        <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0;">Balance Neto</th>
                    </tr>
                </thead>
                <tbody>
                    ${seasonData.map(d => `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #e2e8f0;">${d.name}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #e2e8f0; color: #10b981;">$${d.in.toLocaleString()}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #e2e8f0; color: #ef4444;">$${d.out.toLocaleString()}</td>
                            <td style="padding: 10px; text-align: right; border: 1px solid #e2e8f0; font-weight: bold; color: ${d.net >= 0 ? '#0f172a' : '#ef4444'};">
                                $${d.net.toLocaleString()}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background: #f1f5f9; font-weight: bold;">
                        <td style="padding: 15px; border: 1px solid #e2e8f0;">TOTAL TEMPORADA</td>
                        <td style="padding: 15px; text-align: right; border: 1px solid #e2e8f0; color: #10b981;">
                            $${seasonData.reduce((a, b) => a + b.in, 0).toLocaleString()}
                        </td>
                        <td style="padding: 15px; text-align: right; border: 1px solid #e2e8f0; color: #ef4444;">
                            $${seasonData.reduce((a, b) => a + b.out, 0).toLocaleString()}
                        </td>
                        <td style="padding: 15px; text-align: right; border: 1px solid #e2e8f0; font-size: 18px;">
                            $${seasonData.reduce((a, b) => a + b.net, 0).toLocaleString()}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 20px;">
                <p style="font-size: 10px; color: #94a3b8; text-align: center;">
                    Este documento es un reporte interno del Club Social y Deportivo 19 de Junio. 
                    Toda la información contenida es de carácter confidencial.
                </p>
            </div>
        </div>
    `;

    const opt = {
      margin:       0.5,
      filename:     `Balance_Anual_${currentYear}_Club_19_Junio.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, backgroundColor: '#FFFFFF' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Create a temporary element to render the HTML for html2pdf
    const worker = html2pdf();
    worker.set(opt).from(reportHtml).save();
};

function renderConfig(container) { 
    container.innerHTML = `
        <div class="card">
            <h3>Administración de Base de Datos</h3>
            <p class="text-muted">Exporta o Importa el archivo JSON para respaldar toda la información del club.</p>
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button class="btn btn-primary" onclick="app.manualExport()">
                    <i class="fas fa-file-export"></i> Descargar Respaldo JSON
                </button>
                <div class="btn btn-outline" style="position: relative; overflow: hidden;">
                    <i class="fas fa-file-import"></i> Importar Datos
                    <input type="file" id="import-file" style="position: absolute; opacity: 0; left: 0; top: 0; cursor: pointer;">
                </div>
            </div>
        </div>

        <div class="card" style="margin-top: 2rem;">
            <h3><i class="fas fa-shield-halved"></i> Historial de Auditoría (Eliminaciones)</h3>
            <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">Registro permanente de elementos borrados para seguridad administrativa.</p>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Módulo</th>
                            <th>Datos Eliminados</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.auditLog.map((log, i) => `
                            <tr>
                                <td style="white-space: nowrap; font-size: 0.8rem;">${log.timestamp}</td>
                                <td><span class="badge badge-danger" style="font-size: 0.7rem;">${log.module}</span></td>
                                <td style="font-size: 0.75rem; color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                                    ${log.itemData}
                                </td>
                                <td>
                                    <button class="btn btn-primary btn-sm" onclick="app.restoreItem(${state.auditLog.length - 1 - i})" title="Restaurar Registro">
                                        <i class="fas fa-undo"></i> Restaurar
                                    </button>
                                </td>
                            </tr>
                        `).reverse().join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('import-file').onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                state = data;
                saveState(state);
                alert('Datos importados con éxito.');
                location.reload();
            } catch (err) {
                alert('Error al procesar el archivo.');
            }
        };
        reader.readAsText(file);
    };
}
window.app.manualExport = () => exportData(state);

function updateGlobalStats() {
    // Logic to update badges and sidebar summaries if needed
}
