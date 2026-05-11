const STORAGE_KEY = "domicilios_registros_v2";

const QUICK_VALUES = [5000, 6000, 7000, 8000, 10000, 12000, 15000, 20000];

let records = loadRecords();
let selectedDate = getDateKey();

const quickButtons = document.getElementById("quickButtons");
const totalDay = document.getElementById("totalDay");
const countDay = document.getElementById("countDay");
const averageDay = document.getElementById("averageDay");
const netDay = document.getElementById("netDay");
const recordsList = document.getElementById("recordsList");
const selectedDateInput = document.getElementById("selectedDate");
const searchInput = document.getElementById("searchInput");

const customValue = document.getElementById("customValue");
const customNote = document.getElementById("customNote");
const expenseValue = document.getElementById("expenseValue");
const expenseNote = document.getElementById("expenseNote");

document.getElementById("addCustomBtn").addEventListener("click", addCustomIncome);
document.getElementById("addExpenseBtn").addEventListener("click", addExpense);
document.getElementById("undoBtn").addEventListener("click", undoLast);
document.getElementById("exportBtn").addEventListener("click", exportCsv);
document.getElementById("clearDayBtn").addEventListener("click", clearSelectedDay);

selectedDateInput.addEventListener("change", function () {
  selectedDate = selectedDateInput.value;
  render();
});

searchInput.addEventListener("input", render);

function init() {
  renderQuickButtons();
  render();
}

function renderQuickButtons() {
  quickButtons.innerHTML = "";

  QUICK_VALUES.forEach(function (value) {
    const button = document.createElement("button");
    button.className = "quick-btn";
    button.innerHTML = `
      <small>Domicilio</small>
      <strong>${formatMoney(value)}</strong>
    `;
    button.addEventListener("click", function () {
      addRecord(value, "income", "");
    });
    quickButtons.appendChild(button);
  });
}

function addCustomIncome() {
  const value = Number(customValue.value);

  if (!value || value < 1) {
    alert("Escribe un valor válido.");
    return;
  }

  addRecord(value, "income", customNote.value.trim());

  customValue.value = "";
  customNote.value = "";
}

function addExpense() {
  const value = Number(expenseValue.value);

  if (!value || value < 1) {
    alert("Escribe un gasto válido.");
    return;
  }

  addRecord(value, "expense", expenseNote.value.trim() || "Gasto");

  expenseValue.value = "";
  expenseNote.value = "";
}

function addRecord(value, type, note) {
  const now = new Date();

  const record = {
    id: crypto.randomUUID(),
    date: getDateKey(now),
    time: getTime(now),
    value: Number(value),
    type: type,
    note: note || "",
    createdAt: now.toISOString()
  };

  records.unshift(record);
  selectedDate = record.date;
  saveRecords();
  render();
}

function deleteRecord(id) {
  records = records.filter(function (record) {
    return record.id !== id;
  });

  saveRecords();
  render();
}

function undoLast() {
  if (records.length === 0) return;

  records.shift();
  saveRecords();
  render();
}

function clearSelectedDay() {
  const confirmDelete = confirm("¿Seguro que quieres borrar todos los registros de este día?");

  if (!confirmDelete) return;

  records = records.filter(function (record) {
    return record.date !== selectedDate;
  });

  saveRecords();
  render();
}

function render() {
  renderDateOptions();

  const term = searchInput.value.trim().toLowerCase();

  const dayRecords = records.filter(function (record) {
    return record.date === selectedDate;
  });

  const filteredRecords = dayRecords.filter(function (record) {
    return (
      String(record.value).includes(term) ||
      record.time.toLowerCase().includes(term) ||
      (record.note || "").toLowerCase().includes(term) ||
      record.type.toLowerCase().includes(term)
    );
  });

  const incomeTotal = dayRecords
    .filter(function (record) {
      return record.type === "income";
    })
    .reduce(function (sum, record) {
      return sum + record.value;
    }, 0);

  const expenseTotal = dayRecords
    .filter(function (record) {
      return record.type === "expense";
    })
    .reduce(function (sum, record) {
      return sum + record.value;
    }, 0);

  const incomeCount = dayRecords.filter(function (record) {
    return record.type === "income";
  }).length;

  const average = incomeCount ? Math.round(incomeTotal / incomeCount) : 0;

  totalDay.textContent = formatMoney(incomeTotal);
  countDay.textContent = incomeCount;
  averageDay.textContent = formatMoney(average);
  netDay.textContent = formatMoney(incomeTotal - expenseTotal);

  renderRecords(filteredRecords);
}

function renderDateOptions() {
  const dates = [...new Set(records.map(function (record) {
    return record.date;
  }))];

  if (!dates.includes(getDateKey())) {
    dates.unshift(getDateKey());
  }

  dates.sort().reverse();

  selectedDateInput.innerHTML = "";

  dates.forEach(function (date) {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date === getDateKey() ? `Hoy - ${date}` : date;

    if (date === selectedDate) {
      option.selected = true;
    }

    selectedDateInput.appendChild(option);
  });
}

function renderRecords(list) {
  recordsList.innerHTML = "";

  if (list.length === 0) {
    recordsList.innerHTML = `<div class="empty">No hay registros para esta fecha.</div>`;
    return;
  }

  list.forEach(function (record) {
    const item = document.createElement("div");
    item.className = `record ${record.type}`;

    const label = record.type === "expense" ? "Gasto" : "Domicilio";
    const sign = record.type === "expense" ? "-" : "+";

    item.innerHTML = `
      <div>
        <strong>${sign} ${formatMoney(record.value)}</strong>
        <div class="record-meta">${label} · ${record.date} · ${record.time}</div>
        ${record.note ? `<p class="record-note">${escapeHtml(record.note)}</p>` : ""}
      </div>
      <button class="delete-btn" title="Eliminar">🗑</button>
    `;

    item.querySelector(".delete-btn").addEventListener("click", function () {
      deleteRecord(record.id);
    });

    recordsList.appendChild(item);
  });
}

function exportCsv() {
  if (records.length === 0) {
    alert("No tienes registros para exportar.");
    return;
  }

  const headers = ["Fecha", "Hora", "Tipo", "Valor", "Nota"];
  const rows = records.map(function (record) {
    return [
      record.date,
      record.time,
      record.type === "expense" ? "Gasto" : "Domicilio",
      record.value,
      record.note || ""
    ];
  });

  const csvContent = [headers, ...rows]
    .map(function (row) {
      return row.map(function (cell) {
        return `"${String(cell).replaceAll('"', '""')}"`;
      }).join(",");
    })
    .join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `domicilios-${getDateKey()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTime(date = new Date()) {
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

init();
