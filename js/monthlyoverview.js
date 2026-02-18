document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const firstDay = `${year}-${month}-01`;
  const today = `${year}-${month}-${day}`;

  const minDate = "2026-02-01";

  const fromInput = document.getElementById("fromDate");
  const toInput = document.getElementById("toDate");

  fromInput.min = minDate;
  fromInput.max = today;
  toInput.min = minDate;
  toInput.max = today;

  // ✅ Correct default (no previous month bug)
  fromInput.value = firstDay;
  toInput.value = today;

  loadBankCards(`${year}-${month}`).then(() => {
    autoFilter();
  });

  fromInput.addEventListener("change", function () {
    toInput.min = this.value;
    autoFilter();
  });

  toInput.addEventListener("change", autoFilter);

  loadBudget();
});

async function loadBankCards(month) {
  lockPage("Fetching Data...");
  currentMonth = month;

  const txnRes = await fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "getTransactions",
      token: sessionStorage.getItem("token"),
    }),
  }).then((r) => r.json());

  unlockPage();

  if (txnRes.status === "success") {
    allTransactions = txnRes.data || [];
    renderCategoryCards(allTransactions, month);
  }
}

function renderCategoryCards(transactions, month) {
  const container = document.getElementById("categoryCards");
  if (!container) return;

  container.innerHTML = `<div class="row g-3" id="cardRow"></div>`;
  const scroll = container.querySelector("#cardRow");

  let start = null;
  let end = null;

  if (month) {
    const [y, m] = month.split("-").map(Number);
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 1);
  }

  const map = {};

  transactions.forEach((t) => {
    if (String(t.type || "").toLowerCase() === "transfer") return;

    const d = new Date(t.date);
    if (start && (d < start || d >= end)) return;
    const cat = t.category || "Other";
    const amt = Number(t.amount) || 0;

    if (!map[cat]) map[cat] = { income: 0, expense: 0, rows: [] };

    if (t.inc === "Income") map[cat].income += amt;
    if (t.inc === "Expense") map[cat].expense += amt;

    map[cat].rows.push(t);
  });
  if (Object.keys(map).length === 0) {
    container.innerHTML = `
    <div class="text-center py-5">
      <h5 class="text-muted">No Transactions Found</h5>
    </div>
  `;
    return;
  }
  Object.entries(map)
    .sort((a, b) => {
      const netA = a[1].income - a[1].expense;
      const netB = b[1].income - b[1].expense;
      return netA - netB; // 🔴 expense/loss first → 🟢 income last
    })
    .forEach(([cat, data], i) => {
      const net = data.income - data.expense;
      const total = data.income + data.expense || 1;

      const incPct = (data.income / total) * 100;
      const expPct = (data.expense / total) * 100;

      const collapseId = `modern_${i}`;

      const spark = data.rows
        .slice(-20)
        .map((r, idx) => {
          return `<span style="left:${idx * 6}px;height:${Math.random() * 28 + 5}px;"></span>`;
        })
        .join("");

      scroll.innerHTML += `
<div class="col-12 col-sm-6 col-lg-4">
  <div class="glass-card p-3 h-100 border g-2"
       data-bs-toggle="collapse"
       data-bs-target="#${collapseId}">

    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <strong>${cat}</strong>
      <span class="fw-bold ${net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-muted"}">
        ₹${net.toFixed(0)}
      </span>
    </div>

    <div class="mb-3 d-flex justify-content-center">
        <canvas id="pie_${i}" style="max-width:140px;max-height:140px;"></canvas>
    </div>

    <!-- PILLS -->
    <div class="d-flex gap-2 flex-wrap justify-content-center">


      <span class="badge rounded-pill bg-success-subtle text-success px-3 py-2">
        Income ₹${data.income.toFixed(0)}
      </span>

      <span class="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
        Expense ₹${data.expense.toFixed(0)}
      </span>

    </div>

    <!-- EXPANDABLE TABLE -->
    <div id="${collapseId}" class="collapse mt-3">
      <div class="table-responsive">
        <table class="table table-sm mb-0">

          <thead>
            <tr>
              <th>Date</th>
              <th>Desc</th>
              <th>Type</th>
              <th class="text-end">₹</th>
            </tr>
          </thead>

          <tbody>
            ${data.rows
              .map(
                (r) => `
              <tr>
                <td>${new Date(r.date).toLocaleDateString("en-GB")}</td>
                <td>${r.description || "-"}</td>
                <td class="${r.inc === "Income" ? "text-success" : "text-danger"}">
                  ${r.inc}
                </td>
                <td class="text-end">${Number(r.amount).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>

        </table>
      </div>
    </div>

  </div>
</div>
`;
      setTimeout(() => {
        const ctx = document.getElementById(`pie_${i}`);
        if (!ctx) return;

        new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Income", "Expense"],
            datasets: [
              {
                label: "Amount",
                data: [data.income, data.expense],
                backgroundColor: ["#198754", "#dc3545"],
                borderRadius: 8,
                barThickness: 28,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: {
                grid: { display: false, drawBorder: false },
                border: { display: false },
                ticks: {
                  color: "#6c757d",
                  font: { size: 11 },
                },
              },
              y: {
                beginAtZero: true,
                grid: { display: false, drawBorder: false },
                border: { display: false },
                ticks: { display: false },
              },
            },
          },
        });
      }, 0);
    });
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  const date = new Date(year, Number(month) - 1);
  const monthName = date.toLocaleString("en-US", { month: "long" });
  return `${monthName}, ${year}`;
}

let allTransactions = [];
let currentMonth = "";

function autoFilter() {
  const fromInput = document.getElementById("fromDate");
  const toInput = document.getElementById("toDate");

  const from = fromInput.value;
  const to = toInput.value;

  // If nothing selected → show monthly view
  if (!from && !to) {
    renderCategoryCards(allTransactions, currentMonth);
    return;
  }

  let startDate = null;
  let endDate = null;

  // Only From selected → single day
  if (from && !to) {
    startDate = from;
    endDate = from;
  }

  // Both selected
  if (from && to) {
    if (to < from) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date Range",
        text: "To Date cannot be before From Date",
        timer: 2000,
        showConfirmButton: false,
      });
      toInput.value = "";
      return;
    }

    startDate = from;
    endDate = to;
  }

  const filtered = allTransactions.filter((t) => {
    const txnDate = new Date(t.date);
    txnDate.setHours(0, 0, 0, 0);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    return txnDate >= start && txnDate <= end;
  });

  renderCategoryCards(filtered, null);
}

function resetDateFilter() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const firstDay = `${year}-${month}-01`;
  const today = `${year}-${month}-${day}`;

  const fromInput = document.getElementById("fromDate");
  const toInput = document.getElementById("toDate");

  fromInput.value = firstDay;
  toInput.value = today;

  // Important: reset min restriction also
  toInput.min = firstDay;

  autoFilter();
}
