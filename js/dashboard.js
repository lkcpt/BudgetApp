document.addEventListener("DOMContentLoaded", () => {
  const m = document.getElementById("dash-month");
  const now = new Date();
  const cur = now.toISOString().slice(0, 7);

  m.value = cur;

  m.addEventListener("change", () => {
    if (!m.value) {
      m.value = cur;
      loadBankCards(m.value); // 🔒 restore if cleared
      return;
    }
    loadBankCards(m.value);
  });

  loadBankCards(m.value);
});

let bankCharts = [];

async function loadBankCards(month) {
  lockPage("Fetching Data...");

  const [bankRes, txnRes] = await Promise.all([
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "getBankBalances",
        token: sessionStorage.getItem("token"),
        month: month,
      }),
    }).then((r) => r.json()),

    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "getTransactions",
        token: sessionStorage.getItem("token"),
      }),
    }).then((r) => r.json()),
  ]);

  unlockPage();

  if (bankRes.status === "success" && txnRes.status === "success") {
    renderTotalBalance(bankRes.data, txnRes.data, month);
    renderBankCards(bankRes.data, txnRes.data, month);
  }
}

let overallChart = null;

function renderTotalBalance(banks, transactions, month) {
  banks = banks || [];
  transactions = transactions || [];
  if (!month) month = new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-");

  // Total balance (sum of all bank balances)
  const totalBalance = banks.reduce((sum, b) => sum + (b.current || 0), 0);

  // Overall net (Income − Expense) from all transactions including transfers
  let net = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  transactions.forEach((txn) => {
    const d = new Date(txn.date);
    if (d >= start && d < end) {
      const amt = Number(txn.amount) || 0;

      // ✅ Only include non-transfer transactions
      if (String(txn.type || "").toLowerCase() === "transfer") return;

      if (txn.inc === "Income") {
        net += amt;
        totalIncome += amt;
      }
      if (txn.inc === "Expense") {
        net -= amt;
        totalExpense += amt;
      }
    }
  });

  const netClass =
    net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-muted";

  // Transactions for overall pie chart (exclude transfers)

  const filteredTxns = transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= start && d < end && t.type.toLowerCase() !== "transfer";
  });

  const catMap = {};
  let totalAmount = 0;
  filteredTxns.forEach((txn) => {
    const cat = txn.category || "Other";
    const amt = Number(txn.amount) || 0;
    catMap[cat] = (catMap[cat] || 0) + amt;
    totalAmount += amt;
  });

  const div = document.getElementById("total-balance-card");
  div.innerHTML = `

    <!-- Total Balance Card -->
    <div class="col-12 col-md-8 col-lg-9">
      <div class="card shadow h-100">
        <div class="card-body text-center">
          <h6>Total Balance</h6>
          <h4>
            ₹${totalBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h4>
        </div>
      </div>
    </div>

    <!-- Overall Pie Chart Card -->
    <div class="col-12 col-md-8 col-lg-9">
      <div class="card shadow h-100">
        <div class="card-body d-flex flex-column flex-md-row align-items-start gap-3">
          
          <!-- Title + Net -->
          <div class="flex-shrink-0">
            <h6 class="text-nowrap mb-1">Overall Transactions</h6>
            <h6 class="mb-1 ">
              Net: <span class="${netClass}">₹${net.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}</span>
            </h6>
            <h6 class="mb-1 ">Income: <small class="text-success">
              ₹${totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </small></h6>

            <h6 class="mb-1 ">Expense:
            <small class="text-danger">
               ₹${totalExpense.toLocaleString(undefined, {
                 minimumFractionDigits: 2,
                 maximumFractionDigits: 2,
               })}
            </small></h6>
          </div>

          ${
            totalAmount === 0
              ? `<div class="text-center text-muted mt-3 w-100">No transactions</div>`
              : `
              <div class="d-flex flex-column flex-md-row align-items-center w-100 gap-3">
                <!-- Chart -->
                <div class="d-flex justify-content-center flex-grow-1">
                  <canvas id="overallChart" style="max-width:300px; min-height:150px; max-height:300px;"></canvas>
                </div>

                <!-- Legend -->
                <div id="overall-legend" class="flex-grow-1"></div>
              </div>
            `
          }
        </div>
      </div>
    </div>

  `;

  // Render overall pie chart if there is data
  if (totalAmount > 0) {
    const ctx = document.getElementById("overallChart").getContext("2d");
    const colors = generateColors(Object.keys(catMap).length);
    const chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(catMap),
        datasets: [{ data: Object.values(catMap), backgroundColor: colors }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });

    // Custom legend below chart
    const legendDiv = document.getElementById("overall-legend");
    Object.keys(catMap).forEach((cat, i) => {
      const amt = catMap[cat];
      const percent = ((amt / totalAmount) * 100).toFixed(2);
      const item = document.createElement("div");
      item.className = "d-flex align-items-center mb-1";
      item.innerHTML = `
        <div style="width:16px; height:16px; background-color:${
          colors[i]
        }; margin-right:8px;"></div>
        <span>${cat}: ₹${amt.toFixed(2)} (${percent}%)</span>
      `;
      legendDiv.appendChild(item);
    });
  }
}

function renderBankCards(banks, transactions, month) {
  const wrap = document.getElementById("bank-cards");
  wrap.innerHTML = "";

  bankCharts.forEach((c) => c.destroy());
  bankCharts = [];

  const [y, m] = month.split("-");
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  banks.forEach((b, idx) => {
    // Only transactions for this bank and NOT transfers
    // All transactions for this bank (including transfers)
    const bankTxns = transactions
      .filter((txn) => txn.bank === b.bank)
      .filter((txn) => {
        const d = new Date(txn.date);
        return d >= start && d < end;
      });

    let income = 0;
    let expense = 0;

    bankTxns.forEach((txn) => {
      const amt = Number(txn.amount) || 0;
      if (txn.inc === "Income") income += amt;
      if (txn.inc === "Expense") expense += amt;
    });

    const net = income - expense;

    // For chart

    const bankTxnsForChart = bankTxns.filter(
      (txn) => String(txn.type || "").toLowerCase() !== "transfer"
    );

    const catMap = {};
    let total = 0;
    bankTxnsForChart.forEach((txn) => {
      const amt = Number(txn.amount) || 0;
      const cat = txn.category || "Other";
      catMap[cat] = (catMap[cat] || 0) + amt;
      total += amt;
    });

    const canvasId = `chart${idx}`;
    const col = document.createElement("div");
    col.className = "col-md-4 col-lg-3 col-12 mb-3";

    col.innerHTML = `
      <div class="card shadow-sm h-100">
        <div class="card-body d-flex flex-column align-items-center">
          <h6>${b.bank}</h6>
          <small>Opening: ₹${b.opening.toFixed(2)}</small>
          <h5 class="my-2">₹${b.current.toFixed(2)}</h5>

          <div class="w-100 text-center small mb-2">
            <h6>Transactions</h6>
            <div>Income: <strong class="text-success">₹${income.toFixed(
              2
            )}</strong></div>
            <div>Expense: <strong class="text-danger">₹${expense.toFixed(
              2
            )}</strong></div>
            <div>
              Net: <strong class="${
                net > 0
                  ? "text-success"
                  : net < 0
                  ? "text-danger"
                  : "text-muted"
              }">
                ₹${net.toFixed(2)}
              </strong>
            </div>
          </div>

          ${
            total === 0
              ? `<div class="text-muted mt-3">No transactions</div>`
              : `<canvas id="${canvasId}" ...></canvas>
                <div id="legend-${idx}" class="mt-2 w-100"></div>`
          }
        </div>
      </div>
    `;

    wrap.appendChild(col);

    if (total === 0) return;

    const ctx = document.getElementById(canvasId).getContext("2d");
    const colors = generateColors(Object.keys(catMap).length);
    const chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(catMap),
        datasets: [{ data: Object.values(catMap), backgroundColor: colors }],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });

    const legendDiv = document.getElementById(`legend-${idx}`);
    Object.keys(catMap).forEach((cat, i) => {
      const amt = catMap[cat];
      const percent = ((amt / total) * 100).toFixed(2);
      const item = document.createElement("div");
      item.className = "d-flex align-items-center mb-1";
      item.innerHTML = `
        <div style="width:16px; height:16px; background-color:${
          colors[i]
        }; margin-right:8px;"></div>
        <span>${cat}: ₹${amt.toFixed(2)} (${percent}%)</span>
      `;
      legendDiv.appendChild(item);
    });

    bankCharts.push(chart);
  });
}

// Utility to generate random colors for pie slices
function generateColors(n) {
  const colors = [];
  for (let i = 0; i < n; i++) {
    colors.push(`hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`);
  }
  return colors;
}
