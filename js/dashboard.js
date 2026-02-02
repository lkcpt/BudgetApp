document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  const cur = now.toISOString().slice(0, 7);
  loadBankCards(cur);
  const monthContainer = document.getElementById("displaymonth");
  monthContainer.innerHTML = ` Month :<span class="text-success"> ${formatMonth(
    current,
  )}</span> `;

  loadBudget();
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
    return (
      d >= start && d < end && String(t.type || "").toLowerCase() !== "transfer"
    );
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
          <h4 class="text-nowrap">
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
              Net: <span class="${netClass} text-nowrap">₹${net.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                },
              )}</span>
            </h6>
            <h6 class="mb-1 ">Income: <small class="text-success text-nowrap">
              ₹${totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </small></h6>

            <h6 class="mb-1 ">Expense:
            <small class="text-danger text-nowrap">
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
      item.className = "d-flex align-items-center mb-1 ";
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

// Utility to generate random colors for pie slices
function generateColors(n) {
  const colors = [];
  for (let i = 0; i < n; i++) {
    colors.push(`hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`);
  }
  return colors;
}

let allBudget = [];
let allBanks = [];
let allTransactions = [];

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");
const current = normalizeMonth(`${yyyy}-${mm}`);

const currentdate = `${yyyy}-${mm}-${dd}`;
const mindate = `${yyyy}-${mm}-01`;

function normalizeMonth(m) {
  const [y, mn] = m.split("-");
  return `${y}-${mn.padStart(2, "0")}`;
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  const date = new Date(year, Number(month) - 1);
  const monthName = date.toLocaleString("en-US", { month: "long" });
  return `${monthName}, ${year}`;
}

document.addEventListener("DOMContentLoaded", () => {});

function filterBudget(month) {
  return allBudget.filter((r) => r.month === month);
}

function loadBudget() {
  lockPage("Fetching budgets...");

  const token = sessionStorage.getItem("token");

  // Fetch budget, bank balances, and transactions together
  Promise.all([
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({ action: "getBudget", token }),
    }).then((res) => res.json()),

    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "getBankBalances",
        token,
        month: current,
      }),
    }).then((res) => res.json()),

    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({ action: "getTransactions", token }),
    }).then((res) => res.json()),
  ])
    .then(([budgetRes, bankRes, txnRes]) => {
      unlockPage();

      if (budgetRes.status !== "success") {
        Swal.fire("Error", budgetRes.message, "error");
        return;
      }

      allBudget = budgetRes.data;
      allBanks = bankRes.data || [];
      allTransactions = txnRes.data || [];

      const month = current;
      renderTable(filterBudget(month), allBanks, allTransactions, month);
    })
    .catch((err) => {
      unlockPage();
      console.error("LOAD BUDGET ERROR 👉", err);
      Swal.fire("Error", err?.message || "Failed to load data", "error");
    });
}

function renderTable(rows, banks, transactions, month) {
  const container = document.getElementById("bankTables");
  let mine = 0;
  container.innerHTML = "";
  // Group rows by bank
  const bankGroups = {};
  rows.forEach((r) => {
    if (!bankGroups[r.bank]) bankGroups[r.bank] = [];
    bankGroups[r.bank].push(r);
  });

  Object.keys(bankGroups).forEach((bank) => {
    const items = bankGroups[bank];
    const { opening, bal } = calculateBankBalance(
      bank,
      banks,
      transactions,
      month,
    );

    // 🔥 Sum all budgets for this bank in the selected month
    const totalBudget = items.reduce(
      (sum, b) => sum + Number(b.balance || 0),
      0,
    );

    const pa = items.reduce((sum, b) => sum + Number(b.paidamount || 0), 0);

    const ba = items.reduce((sum, b) => sum + Number(b.balance || 0), 0);

    const overallBudget = items.reduce(
      (sum, b) => sum + Number(b.amount || 0),
      0,
    );

    // 🔥 Available balance after budget
    const availableBalance = bal - totalBudget;

    mine += Number(availableBalance || 0);

    const sortedItems = [
      ...items.filter(
        (r) => String(r.category).toLowerCase() !== "minimum balance",
      ),
      ...items.filter(
        (r) => String(r.category).toLowerCase() === "minimum balance",
      ),
    ];

    const html = `
      <div class="p-3 rounded mb-4 mb-4 col-12 col-md-8 col-lg-9" style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;">
        <h2 class="mt-2 mb-2"><img src="images/${bank}.png"
        height="35" class="me-2"> ${bank}</h2>
        <div class="mb-2">
Opening Balance:
          <span class="ms-2 text-nowrap">₹ ${opening}</span>
        </div>
        <div class="mb-2">
          <span class="fw-bold">Current Balance:</span>
          <span class="ms-2 text-nowrap">₹ ${bal.toFixed(2)}</span>
        </div>
        <h5 class="mb-2 text">
          <span class="fw-bold">Mine:</span>
          <span class="ms-2 ${
            availableBalance.toFixed(2) <= 0 ? "text-danger" : "text-success"
          } fw-bold text-nowrap">
                    ₹ ${availableBalance.toFixed(2)}
                  </span>
        </h5>
        <div class="table-responsive mb-3">
          <table class="table table-bordered table-striped align-middle">
            <thead class="text-center table-warning">
              <tr>
                <th>S.No</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Paid Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${sortedItems
                .map(
                  (r, i) => `
                <tr class="${
                  String(r.category).toLowerCase() == "minimum balance"
                    ? "table-info"
                    : ""
                }">
                  <td class="text-center">${i + 1}</td>
                  <td>${r.category}</td>
                  <td class="text-center text-nowrap">₹ ${r.amount}</td>
                  <td class="text-center text-nowrap">₹ ${r.paidamount}</td>
                  <td class="text-center text-nowrap">₹ ${r.balance}</td>
                  
                </tr>
              `,
                )
                .join("")}
                <tr class="text-center table-dark">
                  <td colspan="2" class=" fw-bold">Total Budget</td>
                  <td class="text-nowrap">₹ ${pa}</td>
                  <td class="text-nowrap">₹ ${overallBudget}</td>
                  <td class="text-nowrap">₹ ${ba}</td>
                </tr> 
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML += html;
  });
  const mineContainer = document.getElementById("mine");
  mineContainer.classList.remove("bg-success", "bg-danger", "bg-primary");

  // Apply based on value
  if (mine > 0) {
    mineContainer.classList.add("bg-success");
  } else if (mine < 0) {
    mineContainer.classList.add("bg-danger");
  } else {
    mineContainer.classList.add("bg-primary");
  }
  mineContainer.innerHTML = ` Total Mine : ₹ ${mine.toFixed(2)} `;
}

function calculateBankBalance(bankName, banks, transactions, month) {
  const bank = banks.find(
    (b) => b.bank.toLowerCase() === bankName.toLowerCase(),
  );

  if (!bank) return { opening: 0, bal: 0 };

  const opening = Number(bank.opening) || 0;
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  let income = 0,
    expense = 0;

  transactions.forEach((txn) => {
    if (!txn.bank || txn.bank.toLowerCase() !== bankName.toLowerCase()) return;
    const d = new Date(txn.date);
    if (d < start || d >= end) return;

    if (txn.inc === "Income") income += Number(txn.amount) || 0;
    if (txn.inc === "Expense") expense += Number(txn.amount) || 0;
  });

  const bal = opening + income - expense;
  return { opening, bal };
}

let id = "";
let paidamount = 0;

let fullBudgetAmount = 0;
