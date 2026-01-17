let allBudget = [];
let allBanks = [];
let allTransactions = [];

function normalizeMonth(m) {
  const [y, mn] = m.split("-");
  return `${y}-${mn.padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();

  // Use let because we modify values
  let yyyy = today.getFullYear();
  let mm = today.getMonth(); // This gives previous month automatically (0–11)

  // If current month is Jan (0), previous month = Dec of previous year
  if (mm === 0) {
    mm = 12;
    yyyy = yyyy - 1;
  }

  // Format month correctly
  const fm = document.getElementById("filterMonth");
  const premm = normalizeMonth(`${yyyy}-${mm}`);
  const min = "2025-12";

  // Set default, min, max
  fm.value = premm;
  fm.min = min;
  fm.max = premm;

  // Prevent selecting future months
  fm.addEventListener("input", () => {
    if (fm.value > premm || fm.value < min) {
      fm.value = premm;
      Swal.fire(
        "Invalid Month",
        "You cannot select a future month.",
        "warning"
      );
    }
  });

  loadBudget();
});

document.getElementById("filterMonth").addEventListener("change", () => {
  const input = document.getElementById("filterMonth");

  // Reset to current month if cleared
  if (!input.value) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const current = `${yyyy}-${mm}`;
    input.value = current;
    renderTable(filterBudget(current), allBanks, allTransactions, current);
    return;
  }

  const month = normalizeMonth(input.value);
  renderTable(filterBudget(month), allBanks, allTransactions, month);
});

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
        month: document.getElementById("filterMonth").value,
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

      const month = document.getElementById("filterMonth").value;
      renderTable(filterBudget(month), allBanks, allTransactions, month);
    })
    .catch(() => {
      unlockPage();
      Swal.fire("Error", "Failed to load data", "error");
    });
}

function renderTable(rows, banks, transactions, month) {
  const container = document.getElementById("bankTables");
  container.innerHTML = "";

  if (rows.length === 0) {
    container.innerHTML = `
      <div class="text-center fw-bold py-3 container rounded shadow-sm">
        No Budget Found
      </div>
    `;
    return;
  }

  // Group rows by bank
  const bankGroups = {};
  rows.forEach((r) => {
    if (!bankGroups[r.bank]) bankGroups[r.bank] = [];
    bankGroups[r.bank].push(r);
  });

  Object.keys(bankGroups).forEach((bank) => {
    const items = bankGroups[bank];
    const bal = calculateBankBalance(bank, banks, transactions, month);

    // 🔥 Sum all budgets for this bank in the selected month
    const totalBudget = items.reduce(
      (sum, b) => sum + Number(b.balance || 0),
      0
    );

    const pa = items.reduce((sum, b) => sum + Number(b.paidamount || 0), 0);

    const ba = items.reduce((sum, b) => sum + Number(b.balance || 0), 0);

    const overallBudget = items.reduce(
      (sum, b) => sum + Number(b.amount || 0),
      0
    );

    // 🔥 Available balance after budget
    const availableBalance = bal - totalBudget;

    const sortedItems = [
      ...items.filter(
        (r) => String(r.category).toLowerCase() !== "minimum balance"
      ),
      ...items.filter(
        (r) => String(r.category).toLowerCase() === "minimum balance"
      ),
    ];

    const html = `
      <div class="p-3 rounded mb-4" style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;">
        <h2 class="mt-2 mb-2"><img src="images/${bank}.png"
        height="35" class="me-2"> ${bank}</h2>
        <div class="mb-2">
          <span class="fw-bold">Current Balance:</span>
          <span class="ms-2">₹ ${bal.toFixed(2)}</span>
        </div>
        <h5 class="mb-2 text">
          <span class="fw-bold">Mine:</span>
          <span class="ms-2 ${
            availableBalance.toFixed(2) <= 0 ? "text-danger" : "text-success"
          } fw-bold">
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
                  <td class="text-center">₹ ${r.amount}</td>
                  <td class="text-center">₹ ${r.paidamount}</td>
                  <td class="text-center">₹ ${r.balance}</td>
                </tr>
              `
                )
                .join("")}
                <tr class="text-center table-dark">
                  <td colspan="2" class=" fw-bold">Total Budget</td>
                  <td >₹ ${overallBudget}</td>
                  <td >₹ ${pa}</td>
                  <td >₹ ${ba}</td>
                </tr> 
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML += html;
  });
}

function calculateBankBalance(bankName, banks, transactions, month) {
  const bank = banks.find(
    (b) => b.bank.toLowerCase() === bankName.toLowerCase()
  );
  if (!bank) return 0;

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

  return opening + income - expense;
}
