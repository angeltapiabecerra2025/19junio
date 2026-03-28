/* State Management - Club 19 de Junio */

const STORAGE_KEY = "CLUB_19_JUNIO_DATA";

const INITIAL_STATE = {
  matches: [], // { date, opponent, scoreHome, scoreAway, result: 'W'|'L'|'D' }
  inventory: {
    products: [
      { id: 'p1', name: 'Cerveza', price: 1200, stock: 0 },
      { id: 'p2', name: 'Bebida', price: 1200, stock: 0 },
      { id: 'p3', name: 'Vino Tinto', price: 5000, stock: 0 },
      { id: 'p4', name: 'Whisky', price: 13000, stock: 0 }
    ],
    purchases: [], // { date, productId, quantity, cost, total }
    sales: []      // { date, productId, quantity, price, total }
  },
  socios: [], // { id, name, joinDate, monthlyFee: 5000, payments: { '2026-03': status } }
  finances: {
    jerseys: [], // { date, amount, description }
    misc: [],    // { date, category, amount, description, type: 'Income'|'Expense' }
    fiados: []   // { date, name, product, quantity, total, paid: bool }
  },
  settings: {
    theme: 'dark',
    monthlyFee: 5000
  },
  auditLog: [] // [{ timestamp, module, itemData }]
};

/**
 * Persists the entire state to localStorage.
 * @param {Object} state 
 */
export const saveState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

/**
 * Loads the state from localStorage or returns the initial state.
 * @returns {Object}
 */
export const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return INITIAL_STATE;
  try {
    const data = JSON.parse(saved);
    // Deep merge or validate could go here
    return data;
  } catch (e) {
    console.error("Error loading saved data:", e);
    return INITIAL_STATE;
  }
};

/**
 * Exports the state as a JSON file for the user to download.
 */
export const exportData = (state) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `club_19_junio_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};

/**
 * Calculates General Balance stats.
 * @param {Object} state 
 */
export const calculateBalance = (state) => {
  const totalIncome = 0; // Logic for summing everything
  const totalExpenses = 0; 
  // ... Detailed calculation logic ...
  return { income: totalIncome, expenses: totalExpenses };
};
