document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  const cur = now.toISOString().slice(0, 7);
  loadBankCards(cur);
  const monthContainer = document.getElementById("displaymonth");
  monthContainer.innerHTML = ` Month :<span class="text-success"> ${formatMonth(
    cur,
  )}</span> `;

  loadBudget();
});

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

  // Transactions for overall pie chart (exclude transfers)

  const filteredTxns = transactions.filter((t) => {
    const d = new Date(t.date);
    return (
      d >= start && d < end && String(t.type || "").toLowerCase() !== "transfer"
    );
  });

  const categoryMap = {};

  filteredTxns.forEach((txn) => {
    const cat = txn.category || "Other";
    const amt = Number(txn.amount) || 0;

    if (!categoryMap[cat]) {
      categoryMap[cat] = { income: 0, expense: 0 };
    }

    if (txn.inc === "Income") categoryMap[cat].income += amt;
    if (txn.inc === "Expense") categoryMap[cat].expense += amt;
  });

  const div = document.getElementById("total-balance-card");
  div.innerHTML = `

    <!-- 🔵 ROW 1 : Total Balance Full Width -->
    <div class="row g-3 justify-content-center">
      <div class="col-12 col-lg-9">
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
    </div>

    <!-- 🟢 ROW 2 : Income Expense Net -->
    <div class="row g-3 justify-content-center">

      <!-- Income -->
      <div class="col-12 col-md-4 col-lg-3">
        <div class="card shadow h-100 bg-success border-0">
          <div class="card-body text-center text-light">
            <h6>Total Income</h6>
            <h4 class="text-nowrap">
              ₹${totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h4>
          </div>
        </div>
      </div>

      <!-- Expense -->
      <div class="col-12 col-md-4 col-lg-3">
        <div class="card shadow h-100 bg-danger border-0">
          <div class="card-body text-center text-light">
            <h6>Total Expense</h6>
            <h4 class="text-nowrap">
              ₹${totalExpense.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h4>
          </div>
        </div>
      </div>

      <!-- Net -->
      <div class="col-12  col-md-4 col-lg-3">
        <div class="card shadow h-100 bg-primary border-0">
          <div class="card-body text-center text-light">
            <h6>Net Balance</h6>
            <h4 class="text-nowrap">
              ₹${net.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h4>
          </div>
        </div>
      </div>

    </div>

  `;

  renderCategoryCards(transactions, month);
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

    const collapseId = `bank_${bank.replace(/\s+/g, "_")}`;

    const html = `
<div class="col-12 col-md-8 col-lg-9 mx-auto mb-2">

  <div class="card shadow">

    <!-- 🔵 CARD HEADER (CLICKABLE SUMMARY) -->
    <div class="card-body cursor-pointer"
         data-bs-toggle="collapse"
         data-bs-target="#${collapseId}">

      <div class="d-flex justify-content-between align-items-center flex-wrap">

        <div>
          <h5 class="mb-1">
            <img src="images/${bank}.png" height="30" class="me-2">
            ${bank}
          </h5>
          <small class="text-muted">
            Opening ₹ ${opening}
            
            
          </small>
        </div>

        <div class="fw-bold">
          <span class="${
            availableBalance <= 0 ? "text-danger" : "text-success"
          }">Mine ₹ ${availableBalance.toFixed(2)}</span> | 
          Current ₹ ${bal.toFixed(2)}
        </div>

      </div>

    </div>

    <!-- 🟢 COLLAPSIBLE BUDGET DETAILS -->
    <div id="${collapseId}" class="collapse">
      <div class="card-body pt-0">

        <div class="table-responsive">
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
                  String(r.category).toLowerCase() === "minimum balance"
                    ? "table-info"
                    : ""
                }">
                  <td class="text-center">${i + 1}</td>
                  <td>${r.category}</td>
                  <td class="text-center">₹ ${r.amount}</td>
                  <td class="text-center">₹ ${r.paidamount}</td>
                  <td class="text-center">₹ ${r.balance}</td>
                </tr>
              `,
                )
                .join("")}

              <tr class="text-center table-dark">
                <td colspan="2" class="fw-bold">Total Budget</td>
                <td>₹ ${pa}</td>
                <td>₹ ${overallBudget}</td>
                <td>₹ ${ba}</td>
              </tr>

            </tbody>
          </table>
        </div>

      </div>
    </div>

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
