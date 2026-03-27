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
  showSkeleton(); // 🔥 ADD THIS
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
  <div class="card border-start border-4 border-success shadow-sm">
    <div class="card-body">
      <small class="text-muted">Total Income</small>
      <h5 class="text-success fw-bold text-nowrap">₹${totalIncome.toLocaleString()}</h5>
    </div>
  </div>
</div>

<div class="col-12 col-md-4 col-lg-3">
  <div class="card border-start border-4 border-danger shadow-sm">
    <div class="card-body">
      <small class="text-muted">Total Expense</small>
      <h5 class="text-danger fw-bold text-nowrap">₹${totalExpense.toLocaleString()}</h5>
    </div>
  </div>
</div>

<div class="col-12 col-md-4 col-lg-3">
  <div class="card border-start border-4 border-primary shadow-sm">
    <div class="card-body">
      <small class="text-muted">Net Balance</small>
      <h5 class="text-primary fw-bold text-nowrap">₹${net.toLocaleString()}</h5>
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
  // Always use banks as base
  const bankGroups = {};

  // Initialize all banks
  banks.forEach((b) => {
    bankGroups[b.bank] = [];
  });

  // Attach budget rows if available
  rows.forEach((r) => {
    if (!bankGroups[r.bank]) bankGroups[r.bank] = [];
    bankGroups[r.bank].push(r);
  });

  Object.keys(bankGroups).forEach((bank) => {
    const items = bankGroups[bank] || [];
    const hasBudget = items.length > 0;
    const { opening, bal } = calculateBankBalance(
      bank,
      banks,
      transactions,
      month,
    );

    // 🔥 Sum all budgets for this bank in the selected month
    const totalBudget = hasBudget
      ? items.reduce((sum, b) => sum + Number(b.balance || 0), 0)
      : 0;

    const pa = items.reduce((sum, b) => sum + Number(b.paidamount || 0), 0);

    const ba = items.reduce((sum, b) => sum + Number(b.balance || 0), 0);

    const overallBudget = items.reduce(
      (sum, b) => sum + Number(b.amount || 0),
      0,
    );

    // 🔥 Available balance after budget
    const availableBalance = hasBudget ? bal - totalBudget : null;

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
<div class="col-12 col-md-8 col-lg-9 mx-auto mb-3">

  <div class="card shadow-sm border-0">

    <!-- HEADER -->
    <div class="card-body d-flex justify-content-between align-items-center flex-wrap"
         data-bs-toggle="collapse"
         data-bs-target="#${collapseId}"
         style="cursor:pointer;">

      <div class="d-flex align-items-center gap-2">

        <!-- ✅ Bank Logo -->
        <img src="images/${bank}.png"
             height="30"
             onerror="this.src='images/default.png'">

        <div>
          <h6 class="mb-0 fw-bold">${bank}</h6>
          <small class="text-muted text-nowrap">
            Opening ₹ ${opening.toFixed(2)}
          </small>
        </div>

      </div>

      <div class="text-end">
        <div class="fw-bold text-nowrap">
          ₹ ${bal.toFixed(2)}
        </div>

        <small class=" text-nowrap ${
          availableBalance === null
            ? "text-muted"
            : availableBalance < 0
              ? "text-danger"
              : "text-success"
        }">
          ${
            availableBalance === null
              ? "No Budget"
              : `Mine : ₹ ${availableBalance.toFixed(2)}`
          }
        </small>
      </div>

    </div>

    <!-- COLLAPSE BODY -->
    <div id="${collapseId}" class="collapse">
      <div class="card-body pt-0">

        ${
          hasBudget
            ? `
              <div class="table-responsive">
                <table class="table table-bordered table-striped table-sm">
                  <thead class=" text-center table-warning">
                    <tr>
                      <th>S.No.</th>
                      <th>Category</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sortedItems
                      .map(
                        (r, i) => `
                      <tr>
                        <td class="text-center">${i + 1}</td>
                        <td>${r.category}</td>
                        <td class="text-center text-nowrap">₹ ${r.amount}</td>
                        <td class="text-center text-nowrap">₹ ${r.paidamount}</td>
                        <td class="text-center text-nowrap">₹ ${r.balance}</td>
                      </tr>
                    `,
                      )
                      .join("")}

                      <tr class="table-dark text-center fw-bold">
          <td colspan="2">Total</td>
          <td class="text-nowrap">₹ ${overallBudget.toFixed(2)}</td>
          <td class="text-nowrap">₹ ${pa.toFixed(2)}</td>
          <td class="text-nowrap">₹ ${ba.toFixed(2)}</td>
        </tr>
                      
                  </tbody>
                </table>
              </div>
            `
            : `
              <div class="text-center text-muted py-3">
                No budget data available
              </div>
            `
        }

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

function showSummarySkeleton() {
  return `
    <div class="row g-3 justify-content-center">

      <!-- ✅ FULL WIDTH TOTAL BALANCE -->
      <div class="col-12 col-lg-9">
        <div class="card shadow-sm">
          <div class="card-body text-center">
            <div class="placeholder-glow">
              <span class="placeholder col-4 mb-2"></span>
              <span class="placeholder col-6"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- ✅ NEXT ROW (force new line) -->
      <div class="w-100"></div>

      <!-- Income -->
      <div class="col-12 col-md-4 col-lg-3">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="placeholder-glow">
              <span class="placeholder col-6 mb-2"></span>
              <span class="placeholder col-8"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Expense -->
      <div class="col-12 col-md-4 col-lg-3">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="placeholder-glow">
              <span class="placeholder col-6 mb-2"></span>
              <span class="placeholder col-8"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Net -->
      <div class="col-12 col-md-4 col-lg-3">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="placeholder-glow">
              <span class="placeholder col-6 mb-2"></span>
              <span class="placeholder col-8"></span>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
}
function showBankSkeleton(count = 3) {
  return `
    ${Array.from({ length: count })
      .map(
        () => `
      <div class="col-12 col-md-8 col-lg-9 mx-auto mb-3">

        <div class="card shadow-sm border-0">

          <!-- HEADER -->
          <div class="card-body d-flex justify-content-between align-items-center">

            <div class="d-flex align-items-center gap-2">

              <!-- Logo Skeleton -->
              <div class="placeholder-glow">
                <span class="placeholder rounded-circle" style="width:30px;height:30px;"></span>
              </div>

              <div class="placeholder-glow w-100">
                <span class="placeholder col-6 mb-1"></span>
                <span class="placeholder col-4"></span>
              </div>

            </div>

            <div class="text-end placeholder-glow">
              <span class="placeholder col-6 d-block mb-1"></span>
              <span class="placeholder col-4"></span>
            </div>

          </div>

        </div>

      </div>
    `,
      )
      .join("")}
  `;
}

function showSkeleton(bankCount = 3) {
  const div1 = document.getElementById("total-balance-card");
  const div2 = document.getElementById("bankTables");

  // Summary skeleton
  div1.innerHTML = showSummarySkeleton();

  // Bank skeleton
  div2.innerHTML = showBankSkeleton(bankCount);
}
