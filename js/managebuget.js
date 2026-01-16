let allBudget = [];
let allBanks = [];
let allTransactions = [];

function normalizeMonth(m) {
  const [y, mn] = m.split("-");
  return `${y}-${mn.padStart(2, "0")}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const fm = document.getElementById("filterMonth");
  const current = normalizeMonth(`${yyyy}-${mm}`);
  fm.value = current;
  fm.min = current;
  fm.max = current;

  fm.addEventListener("input", () => {
    if (fm.value !== current) {
      fm.value = current;
      Swal.fire(
        "Invalid Month",
        "You can only select the current month.",
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
    const totalBudget = items
      .filter((b) => String(b.status).toLowerCase() !== "paid")
      .reduce((sum, b) => sum + Number(b.amount || 0), 0);

    const overallBudget = items.reduce(
      (sum, b) => sum + Number(b.amount || 0),
      0
    );

    // 🔥 Available balance after budget
    const availableBalance = bal - totalBudget;

    const html = `
      <div class="p-3 rounded mb-4" style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;">
        <h2 class="mt-2 mb-2"><img src="images/${bank}.png"
        height="35" class="me-2"> ${bank}</h2>
        <div class="mb-2">
          <span class="fw-bold">Current Balance:</span>
          <span class="ms-2">₹${bal.toFixed(2)}</span>
        </div>

        <div class="table-responsive mb-3">
          <table class="table table-bordered table-striped">
            <thead class="text-center table-warning">
              <tr>
                <th>S.No</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Paid Amount</th>
                <th>Balance</th>
                <th>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (r, i) => `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td>${r.category}</td>
                  <td class="text-center">${r.amount}</td>
                  <td class="text-center">${r.paidamount}</td>
                  <td class="text-center">${r.balance}</td>
                  <td class="text-center align-middle">
                      ${
                        String(r.category).toLowerCase() != "minimum balance"
                          ? r.status === "paid"
                            ? "-"
                            : r.status === "partly paid"
                            ? `<button class="btn btn-sm btn-warning" onclick="openBudgetModal('${r.rowId}', ${i})"">Pay Again</button>`
                            : `<div><button class="btn btn-sm btn-warning" onclick="openBudgetModal('${r.rowId}', ${i})"">Pay</button> <button class="btn btn-sm btn-danger" onclick="">
            <i class="fa fa-trash"></i>
          </button></div>`
                          : "-"
                      }
                  </td>
                  <td class="text-center align-middle fw-bold text-capitalize ${
                    r.status == "unpaid"
                      ? "text-danger"
                      : r.status == "paid"
                      ? "text-success"
                      : "text-info"
                  }">${
                    String(r.category).toLowerCase() != "minimum balance"
                      ? r.status
                      : "-"
                  }</td>
                </tr>
              `
                )
                .join("")}
                <tr>
                <td colspan="2" class="text-center fw-bold">Total Budget</td>
                <td class="text-center" colspan="2">${overallBudget}</td>
                </tr>
                <tr>
                <td colspan="2" class="text-center fw-bold">Mine</td>
                <td class="text-center ${
                  availableBalance.toFixed(2) <= 0
                    ? "text-danger"
                    : "text-success"
                } fw-bold" colspan="2">${availableBalance.toFixed(2)}</td>
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

function transact() {
  const rowId = document.getElementById("RowId").value;
  const date = document.getElementById("date").value;
  const bank = document.getElementById("bank").value;
  const inc = "Expense";
  const type = document.getElementById("type").value;
  const app = document.getElementById("app").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const amount = document.getElementById("amount").value;

  let status = "";

  if (document.getElementById("paymentRadio1").checked) {
    status = "paid";
  } else if (document.getElementById("paymentRadio2").checked) {
    status = "partly paid";
  }

  const balance = fullBudgetAmount - amount;
  const upamount = Number(paidamount) + Number(amount);

  if (
    !rowId ||
    !date ||
    !bank ||
    !inc ||
    !type ||
    !app ||
    !category ||
    !description ||
    !amount ||
    !status
  ) {
    Swal.fire({
      icon: "warning",
      title: "Missing Details",
      text: "All fields are required. Please fill everything before updating.",
    });
    return; // ❌ Stop execution — do not update
  }

  lockPage("Transaction Under Progress.....");
  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "transact",
      token: sessionStorage.getItem("token"),
      date: date,
      bank: bank,
      inc: inc,
      type: type,
      app: app,
      category: category,
      description: description,
      amount: amount,
      budgetId: id,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      bootstrap.Modal.getInstance(
        document.getElementById("BudgetModal")
      ).hide();
      if (data.status === "success") {
        const form = document.getElementById("budgettemp-form");
        form.reset();
        fetch(URL, {
          method: "POST",
          body: new URLSearchParams({
            action: "updatebudgetstatus",
            token: sessionStorage.getItem("token"),
            rowId,
            upamount,
            balance,
            status,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "success") {
              unlockPage();
              Swal.fire({
                icon: "success",
                title: "Updated!",
                text: "Transaction Done successfully",
              }).then(() => {
                loadBudget();
              });
            } else {
              unlockPage();
              Swal.fire("Error", data.message, "error");
            }
          });
      } else {
        Swal.fire({
          icon: "error",
          title: "Somehing went wrong",
          text: data.message,
        }).then(() => {
          const form = document.getElementById("budgettemp-form");
          form.reset();
        });
      }
    });
}
let id = "";
let paidamount = 0;

function openBudgetModal(rowId, index) {
  const t = allBudget[index];

  document.getElementById("RowId").value = rowId;
  document.getElementById("bank").value = t.bank;
  document.getElementById("category").value = t.category;
  document.getElementById("description").value = "Budget - " + t.category;

  id = t.budgetId;
  // store full budget amount
  fullBudgetAmount = Number(t.balance) || 0;
  paidamount = Number(t.paidamount) || 0;

  // default part payment enabled
  document.getElementById("paymentRadio2").checked = false;
  document.getElementById("paymentRadio1").checked = true;

  const amountField = document.getElementById("amount");
  amountField.disabled = true;
  amountField.value = fullBudgetAmount;

  setupPaymentModeHandlers(amountField);

  new bootstrap.Modal(document.getElementById("BudgetModal")).show();
}

const app = {
  UPI: ["Gpay", "Phonepe", "Supermoney", "Paytm"],
};

function loadapp() {
  const type = document.getElementById("type").value;
  const ap = document.getElementById("app");
  ap.innerHTML = "<option value=''>Select</option>";
  ap.disabled = true;
  if (type === "UPI") {
    ap.disabled = false;
    app[type].forEach((item) => {
      ap.innerHTML += `<option value="${item}">${item}</option>`;
    });
  } else {
    ap.disabled = true;
  }
}

let fullBudgetAmount = 0;

function setupPaymentModeHandlers(amountInput) {
  const fullRadio = document.getElementById("paymentRadio1");
  const partRadio = document.getElementById("paymentRadio2");
  const warning = document.getElementById("amountWarning");

  // FULL PAYMENT SELECTED
  fullRadio.onchange = () => {
    if (fullRadio.checked) {
      amountInput.disabled = true;
      amountInput.value = fullBudgetAmount;
      warning.style.display = "none";
    }
  };

  // PART PAYMENT SELECTED
  partRadio.onchange = () => {
    if (partRadio.checked) {
      amountInput.disabled = false;
      checkAmountLimit();
    }
  };

  // User typing amount
  amountInput.oninput = checkAmountLimit;

  function checkAmountLimit() {
    const val = Number(amountInput.value) || 0;

    if (val >= fullBudgetAmount) {
      warning.innerHTML = `⚠ Maximum allowed amount is ₹${
        fullBudgetAmount - 1
      }`;
      warning.style.display = "block";

      amountInput.value = fullBudgetAmount - 1;
    } else {
      warning.style.display = "none";
    }
  }
}
