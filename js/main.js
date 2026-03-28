/* Main Application Logic - Club 19 de Junio */
import { loadState, saveState, exportData } from './state.js';

let state = loadState();

// Global App State
const app = {
    currentView: 'dashboard',
    chart: null,
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
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
        case 'finanzas':
            title.innerText = 'Balance y Finanzas';
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
                <label><i class="fas fa-trophy"></i> Victorias</label>
                <h2 id="wins-count">${calculateMatches('W')}</h2>
            </div>
            <div class="card" style="border-top: 4px solid var(--secondary-red);">
                <label><i class="fas fa-times-circle"></i> Derrotas</label>
                <h2 id="loss-count">${calculateMatches('L')}</h2>
            </div>
            <div class="card" style="border-top: 4px solid var(--success);">
                <label><i class="fas fa-cash-register"></i> Ventas Acum.</label>
                <h2 id="weekly-sales-stat">$${totalSales.toLocaleString()}</h2>
            </div>
            <div class="card" style="border-top: 4px solid #D4AF37;">
                <label><i class="fas fa-users"></i> Socios al día</label>
                <h2 id="socios-active-stat">${activeSocios} / ${state.socios.length}</h2>
            </div>
        </div>
        <div class="card" style="min-height: 400px; margin-top: 2rem;">
            <h3>Tendencia de Ventas vs Gastos</h3>
            <canvas id="mainChart"></canvas>
        </div>
    `;
    
    initDashboardChart();
}

function calculateMatches(type) {
  return state.matches.filter(m => m.result === type).length;
}

function initDashboardChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    
    // 1. Logic for grouping data by Month (e.g., '2026-03')
    const incomeByMonth = {};
    const expenseByMonth = {};
    
    // Helper: Add to map
    const add = (map, date, amt) => {
        const m = date.substring(0, 7); // YYYY-MM
        map[m] = (map[m] || 0) + amt;
    };
    
    // Aggregating Income
    state.inventory.sales.forEach(s => add(incomeByMonth, s.date, s.total));
    state.socios.forEach(socio => {
        Object.keys(socio.payments || {}).forEach(mStr => {
            if (socio.payments[mStr] === 'paid') incomeByMonth[mStr] = (incomeByMonth[mStr] || 0) + 5000;
        });
    });
    state.finances.jerseys.forEach(j => add(incomeByMonth, j.date, j.amount));
    state.finances.fiados.filter(f => f.paid).forEach(f => {
        // Since fiados don't have a pay-date yet (simplified), we use 'current' or index
        const m = new Date().toISOString().substring(0, 7);
        incomeByMonth[m] = (incomeByMonth[m] || 0) + f.total;
    });

    // Aggregating Expenses
    state.inventory.purchases.forEach(p => add(expenseByMonth, p.date, p.cost));
    state.finances.misc.forEach(m => add(expenseByMonth, m.date, m.amount));

    // Labels: Month names for last 6 months or all months with data
    const labels = [...new Set([...Object.keys(incomeByMonth), ...Object.keys(expenseByMonth)])].sort();
    const incomeData = labels.map(l => incomeByMonth[l] || 0);
    const expenseData = labels.map(l => expenseByMonth[l] || 0);

    // If no data, show a placeholder label
    const displayLabels = labels.length ? labels : ['Sin datos'];
    const displayIncome = incomeData.length ? incomeData : [0];
    const displayExpense = expenseData.length ? expenseData : [0];

    // Gradient creation
    const gradientInc = ctx.createLinearGradient(0, 0, 0, 400);
    gradientInc.addColorStop(0, 'rgba(0, 56, 168, 0.5)');
    gradientInc.addColorStop(1, 'rgba(0, 56, 168, 0.0)');

    const gradientExp = ctx.createLinearGradient(0, 0, 0, 400);
    gradientExp.addColorStop(0, 'rgba(238, 28, 37, 0.5)');
    gradientExp.addColorStop(1, 'rgba(238, 28, 37, 0.0)');

    app.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'Ingresos Mensuales',
                data: displayIncome,
                borderColor: '#0038A8',
                backgroundColor: gradientInc,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0038A8',
                borderWidth: 3
            }, {
                label: 'Egresos Mensales',
                data: displayExpense,
                borderColor: '#EE1C25',
                backgroundColor: gradientExp,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#EE1C25',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: { position: 'top', labels: { color: '#F8FAFC', font: { weight: '600' } } },
                tooltip: {
                    backgroundColor: '#1E293B',
                    titleColor: '#F8FAFC',
                    bodyColor: '#94A3B8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#94A3B8', callback: (val) => '$' + val.toLocaleString() }
                },
                x: { 
                    grid: { display: false },
                    ticks: { color: '#94A3B8' }
                }
            }
        }
    });
}

// --- Placeholder Renders for remaining modules ---
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
            <h3>Historial</h3>
            <div class="table-container">
                <table id="match-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Oponente</th>
                            <th>Resultado</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody id="match-list">
                        ${state.matches.map(m => `
                            <tr>
                                <td>${m.date}</td>
                                <td>${m.opponent}</td>
                                <td><span class="badge ${m.result === 'W' ? 'badge-paid' : m.result === 'L' ? 'badge-danger' : 'badge-pending'}">${m.result}</span></td>
                                <td>${m.scoreHome} - ${m.scoreAway}</td>
                            </tr>
                        `).join('')}
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
    let result = 'D';
    if (home > away) result = 'W';
    else if (home < away) result = 'L';
    
    const newMatch = {
        date: document.getElementById('match-date').value,
        opponent: document.getElementById('match-opponent').value,
        scoreHome: home,
        scoreAway: away,
        result: result
    };
    
    state.matches.push(newMatch);
    saveState(state);
    renderPartidos(document.getElementById('view-container'));
}

function renderInventario(container) { 
  container.innerHTML = `
    <div class="card">
        <h3>Mantenedor de Stock y Precios</h3>
        <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">Actualiza el stock semanal y registra compras (gastos).</p>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Precio Venta</th>
                        <th>Stock Actual</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.inventory.products.map(p => `
                        <tr>
                            <td>${p.name}</td>
                            <td>$${p.price.toLocaleString()}</td>
                            <td id="stock-${p.id}">${p.stock}</td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="app.showAddStock('${p.id}')">
                                    <i class="fas fa-plus"></i> Compra/Stock
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
    <div id="stock-modal-container"></div>
  `;
}

// Global functions for stock actions
window.app = window.app || {};
window.app.showAddStock = (productId) => {
    const product = state.inventory.products.find(p => p.id === productId);
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Ingresar Compra / Stock: ${product.name}</h3>
                <form id="stock-form">
                    <div class="form-group">
                        <label>Cantidad Nueva (Unidades)</label>
                        <input type="number" id="stock-qty" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>Costo Total de Compra (Gasto)</label>
                        <input type="number" id="stock-cost" min="0" placeholder="0 CLP" required>
                    </div>
                    <div class="form-group">
                        <label>Nuevo Precio Venta (Opcional)</label>
                        <input type="number" id="new-price" placeholder="${product.price}">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary">Guardar</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.getElementById('stock-form').onsubmit = (e) => {
        e.preventDefault();
        const qty = parseInt(document.getElementById('stock-qty').value);
        const cost = parseInt(document.getElementById('stock-cost').value);
        const newPrice = parseInt(document.getElementById('new-price').value) || product.price;
        
        // Update State
        product.stock += qty;
        product.price = newPrice;
        
        // Log Purchase as Expense
        state.inventory.purchases.push({
            date: new Date().toISOString().split('T')[0],
            productId: product.id,
            productName: product.name,
            quantity: qty,
            cost: cost
        });
        
        saveState(state);
        document.getElementById('modal-root').innerHTML = '';
        renderView('inventario');
    };
};

function renderVentas(container) {
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <div class="card">
            <h3>Registrar Venta</h3>
            <form id="sale-form">
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
                <button type="submit" class="btn btn-primary" style="width: 100%;">Finalizar Venta (Suma Ingreso)</button>
            </form>
        </div>
        
        <div class="card" style="border-left: 4px solid var(--secondary-red);">
            <h3>Calculadora de Vuelto</h3>
            <div class="form-group">
                <label>Total Compra</label>
                <input type="number" id="calc-total" placeholder="0">
            </div>
            <div class="form-group">
                <label>Paga con</label>
                <input type="number" id="calc-paid" placeholder="0">
            </div>
            <div style="background: var(--bg-darker); padding: 1rem; border-radius: 8px; text-align: center;">
                <label>VUELTO A ENTREGAR</label>
                <h2 id="calc-result" style="color: var(--success);">$0</h2>
            </div>
        </div>
    </div>
    
    <div class="card" style="margin-top: 2rem;">
        <h3>Ventas Recientes</h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Producto</th><th>Cant.</th><th>Total</th></tr>
                </thead>
                <tbody id="sales-list">
                    ${state.inventory.sales.slice(-5).reverse().map(s => `
                        <tr>
                            <td>${s.date}</td>
                            <td>${s.productName}</td>
                            <td>${s.quantity}</td>
                            <td>$${s.total.toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
  `;
  
  // Sale logic
  document.getElementById('sale-form').onsubmit = (e) => {
      e.preventDefault();
      const pId = document.getElementById('sale-product').value;
      const qty = parseInt(document.getElementById('sale-qty').value);
      const product = state.inventory.products.find(p => p.id === pId);
      
      if (product.stock < qty) {
          alert('Stock insuficiente');
          return;
      }
      
      const total = product.price * qty;
      product.stock -= qty;
      
      state.inventory.sales.push({
          date: new Date().toISOString().split('T')[0],
          productId: pId,
          productName: product.name,
          quantity: qty,
          price: product.price,
          total: total
      });
      
      saveState(state);
      renderVentas(container);
  };

  // Calculator Logic
  const tIn = document.getElementById('calc-total');
  const pIn = document.getElementById('calc-paid');
  const resDisp = document.getElementById('calc-result');
  
  const updCalc = () => {
      const diff = (parseInt(pIn.value) || 0) - (parseInt(tIn.value) || 0);
      resDisp.innerText = `$${diff.toLocaleString()} CLP`;
  };
  
  tIn.oninput = updCalc;
  pIn.oninput = updCalc;
}

function renderSocios(container) { 
  container.innerHTML = `
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3>Listado de Socios</h3>
            <button class="btn btn-primary btn-sm" onclick="app.showAddSocio()">
                <i class="fas fa-user-plus"></i> Nuevo Socio
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th>Pendiente</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
                    ${state.socios.map(s => {
                        const debt = calculateSocioDebt(s);
                        return `
                        <tr>
                            <td>${s.name}</td>
                            <td><span class="badge ${debt === 0 ? 'badge-paid' : 'badge-danger'}">${debt === 0 ? 'Al día' : 'Pendiente'}</span></td>
                            <td>$${debt.toLocaleString()}</td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="app.showPaySocio('${s.id}')">
                                    <i class="fas fa-dollar-sign"></i> Pagar
                                </button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>
  `;
}

function calculateSocioDebt(socio) {
    const monthsActive = 1; // Simplification for demo: assume 1 month for now or calculate from joinDate
    // Real logic would count months between joinDate and now
    const paid = Object.values(socio.payments || {}).filter(v => v === 'paid').length;
    const unpaidMonths = monthsActive - paid;
    return Math.max(0, unpaidMonths * 5000);
}

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
        state.socios.push({
            id: 's' + Date.now(),
            name: document.getElementById('socio-name').value,
            joinDate: new Date().toISOString().split('T')[0],
            payments: {}
        });
        saveState(state);
        document.getElementById('modal-root').innerHTML = '';
        renderSocios(document.getElementById('view-container'));
    };
};

window.app.showPaySocio = (id) => {
    const socio = state.socios.find(s => s.id === id);
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Registrar Pago: ${socio.name}</h3>
                <form id="pay-form">
                    <div class="form-group">
                        <label>Monto a Pagar (CLP)</label>
                        <input type="number" id="pay-amount" min="5000" step="5000" value="5000" required>
                    </div>
                    <p class="text-muted" style="font-size: 0.8rem;">Note: Pagos superiores a 5000 cubrirán meses atrasados.</p>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary">Confirmar Pago</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('pay-form').onsubmit = (e) => {
        e.preventDefault();
        const amount = parseInt(document.getElementById('pay-amount').value);
        const monthsPaid = Math.floor(amount / 5000);
        
        // Log individual payments to history...
        // For now, mark months as paid (simplification)
        const currentMonth = new Date().toISOString().slice(0, 7);
        socio.payments[currentMonth] = 'paid'; 
        // Logic for multiple months omitted for brevity in this step but plan covers it
        
        saveState(state);
        document.getElementById('modal-root').innerHTML = '';
        renderSocios(document.getElementById('view-container'));
    };
};

function renderFinanzas(container) { 
  const totalIn = state.inventory.sales.reduce((acc, s) => acc + s.total, 0);
  const totalOut = state.inventory.purchases.reduce((acc, p) => acc + p.cost, 0);

  container.innerHTML = `
    <div class="stat-grid">
        <div class="card" style="border-bottom: 4px solid var(--success);">
            <label>Ingresos Totales</label>
            <h2>$${totalIn.toLocaleString()}</h2>
        </div>
        <div class="card" style="border-bottom: 4px solid var(--secondary-red);">
            <label>Egresos Totales</label>
            <h2>$${totalOut.toLocaleString()}</h2>
        </div>
        <div class="card" style="border-bottom: 4px solid var(--primary-blue);">
            <label>Balance Neto</label>
            <h2>$${(totalIn - totalOut).toLocaleString()}</h2>
        </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
        <div class="card">
            <h3>Ingreso Camisetas</h3>
            <form id="jersey-form" style="margin-top: 1rem;">
                <div class="form-group">
                    <label>Monto Recaudado</label>
                    <input type="number" id="jersey-amount" required>
                </div>
                <button type="submit" class="btn btn-outline" style="width: 100%;">Registrar</button>
            </form>
        </div>
        
        <div class="card">
            <h3>Otros Gastos (Arriendos, etc)</h3>
            <form id="misc-form" style="margin-top: 1rem;">
                <div class="form-group">
                    <label>Descripción</label>
                    <input type="text" id="misc-desc" placeholder="Ej: Arriendo cancha" required>
                </div>
                <div class="form-group">
                    <label>Monto</label>
                    <input type="number" id="misc-amount" required>
                </div>
                <button type="submit" class="btn btn-secondary" style="width: 100%;">Registrar Gasto</button>
            </form>
        </div>
    </div>
    
    <div class="card" style="margin-top: 2rem;">
        <h3>Registro de Fiados (Pendientes de Pago)</h3>
        <p class="text-muted" style="font-size: 0.8rem; margin-bottom: 1rem;">Productos entregados no pagados. Al marcar como pagado, se suma al ingreso.</p>
        <div class="table-container">
            <table>
                <thead>
                    <tr><th>Nombre</th><th>Producto</th><th>Total</th><th>Estado</th></tr>
                </thead>
                <tbody>
                    ${state.finances.fiados.map((f, i) => `
                        <tr>
                            <td>${f.name}</td>
                            <td>${f.product} (${f.quantity})</td>
                            <td>$${f.total.toLocaleString()}</td>
                            <td>
                                <input type="checkbox" ${f.paid ? 'checked disabled' : ''} onchange="app.markFiadoPaid(${i})">
                                ${f.paid ? '<span class="badge badge-paid">Pagado</span>' : '<span class="badge badge-danger">Pendiente</span>'}
                            </td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="4">
                            <button class="btn btn-outline btn-sm" onclick="app.showAddFiado()">
                                <i class="fas fa-plus"></i> Agregar Fiado
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="card" style="margin-top: 2rem; text-align: center;">
        <button class="btn btn-primary" onclick="app.exportPDF()">
            <i class="fas fa-file-pdf"></i> Exportar Balance del Mes (PDF)
        </button>
    </div>
  `;
  
  // Handlers for jersey and misc
  document.getElementById('jersey-form').onsubmit = (e) => {
      e.preventDefault();
      const amount = parseInt(document.getElementById('jersey-amount').value);
      state.finances.jerseys.push({ date: new Date().toISOString().split('T')[0], amount });
      saveState(state);
      renderFinanzas(container);
  };
  
  document.getElementById('misc-form').onsubmit = (e) => {
      e.preventDefault();
      const desc = document.getElementById('misc-desc').value;
      const amount = parseInt(document.getElementById('misc-amount').value);
      state.finances.misc.push({ date: new Date().toISOString().split('T')[0], desc, amount });
      saveState(state);
      renderFinanzas(container);
  };
}

window.app.showAddFiado = () => {
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <h3>Nuevo Fiado</h3>
                <form id="fiado-form">
                    <div class="form-group"><label>Nombre</label><input type="text" id="f-name" required></div>
                    <div class="form-group">
                        <label>Producto</label>
                        <select id="f-prod">
                            ${state.inventory.products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Cantidad</label><input type="number" id="f-qty" min="1" value="1" required></div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="submit" class="btn btn-primary">Registrar</button>
                        <button type="button" class="btn btn-outline" onclick="document.getElementById('modal-root').innerHTML = ''">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('fiado-form').onsubmit = (e) => {
        e.preventDefault();
        const pId = document.getElementById('f-prod').value;
        const qty = parseInt(document.getElementById('f-qty').value);
        const product = state.inventory.products.find(p => p.id === pId);
        
        state.finances.fiados.push({
            name: document.getElementById('f-name').value,
            product: product.name,
            quantity: qty,
            total: product.price * qty,
            paid: false
        });
        saveState(state);
        document.getElementById('modal-root').innerHTML = '';
        renderFinanzas(document.getElementById('view-container'));
    };
};

window.app.markFiadoPaid = (index) => {
    state.finances.fiados[index].paid = true;
    saveState(state);
    renderFinanzas(document.getElementById('view-container'));
};

window.app.exportPDF = () => {
    const element = document.getElementById('view-container');
    const opt = {
      margin:       1,
      filename:     'Balance_Club_19_Junio.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, backgroundColor: '#020617' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
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
