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

document.addEventListener("DOMContentLoaded", () => {
  const monthContainer = document.getElementById("displaymonth");
  monthContainer.innerHTML = ` Month :<span class="text-success"> ${formatMonth(
    current,
  )}</span> `;

  loadBudget();
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
    .catch(() => {
      unlockPage();
      Swal.fire("Error", "Failed to load data", "error");
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
      <div class="p-3 rounded mb-4" style="box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;">
        <h2 class="mt-2 mb-2"><img src="images/${bank}.png"
        height="35" class="me-2"> ${bank}</h2>
        <div class="mb-2">
Opening Balance:
          <span class="ms-2">₹ ${opening}</span>
        </div>
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
                <th>Action</th>
                <th>Status</th>
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
                  <td class="text-center align-middle">
                      ${
                        String(r.category).toLowerCase() != "minimum balance"
                          ? r.status === "paid"
                            ? "-"
                            : r.status === "partly paid"
                              ? `<button class="btn btn-sm btn-warning" onclick="openBudgetModal('${r.budgetId}')">Pay Again</button>`
                              : `<div class="text-nowrap"><button class="btn btn-sm btn-warning" onclick="openBudgetModal('${r.budgetId}')"">Pay</button> <button class="btn btn-sm btn-danger" onclick="delbudget('${r.rowId}')">
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
              `,
                )
                .join("")}
                <tr class="text-center table-dark">
                  <td colspan="2" class=" fw-bold">Total Budget</td>
                  <td >₹ ${overallBudget}</td>
                  <td >₹ ${pa}</td>
                  <td >₹ ${ba}</td>
                  <td >-</td>
                  <td >-</td>
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
  let bal = opening + income - expense;
  return { opening, bal };
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
  } else if (type == "UPI" && !app) {
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
        document.getElementById("BudgetModal"),
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

function openBudgetModal(budgetId) {
  const t = allBudget.find((b) => String(b.budgetId) === String(budgetId));

  if (!t) {
    Swal.fire("Error", "Budget item not found", "error");
    return;
  }

  const dateInput = document.getElementById("date");
  dateInput.min = mindate;
  dateInput.max = currentdate;
  dateInput.value = currentdate;
  document.getElementById("RowId").value = t.rowId;
  document.getElementById("bank").value = t.bank;
  document.getElementById("category").value = t.category;
  document.getElementById("description").value = "Budget - " + t.category;

  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;

    // Convert input to Date
    const selected = new Date(dateInput.value + "T00:00");
    const mind = new Date(mindate + "T00:00");

    if (selected > today || selected < mind) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date",
        text: "Transactions in current month only allowed",
      });
      dateInput.value = currentdate; // Reset back to today
    }
  });

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

function delbudget(rowId) {
  Swal.fire({
    title: "Are you sure?",
    text: "This Budget item will be deleted",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      lockPage("Deleting Data...");
      fetch(URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "deleteBudget",
          token: sessionStorage.getItem("token"),
          rowId: rowId,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          unlockPage();
          if (data.status === "success") {
            Swal.fire({
              icon: "success",
              title: "Deleted!",
              text: "Transaction Deleted Successfully",
            }).then(() => {
              loadBudget();
            });
          } else {
            unlockPage();
            Swal.fire("Error", data.message, "error");
          }
        });
    }
  });
}
