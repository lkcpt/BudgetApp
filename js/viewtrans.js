let transactions = [];
let allTransactions = [];

// 🔥 SET DEFAULT FROM & TO DATE
const from = document.getElementById("fromDate");
const to = document.getElementById("toDate");

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, "0");
const dd = String(today.getDate()).padStart(2, "0");

const current = `${yyyy}-${mm}-${dd}`;

document.addEventListener("DOMContentLoaded", () => {
  // Set max date for both inputs
  from.max = current;
  to.max = current;

  from.value = `${yyyy}-${mm}-01`; // 1st day of month
  to.value = `${yyyy}-${mm}-${dd}`; // Today

  from.addEventListener("change", () => {
    if (!from.value) return;

    // Convert input to Date
    const selected = new Date(from.value + "T00:00");

    if (selected > today) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date",
        text: "Future dates are not allowed.",
      });
      from.value = current; // Reset back to today
    }
  });

  to.addEventListener("change", () => {
    if (!to.value) return;

    // Convert input to Date
    const selected = new Date(to.value + "T00:00");

    if (selected > today) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date",
        text: "Future dates are not allowed.",
      });
      to.value = current; // Reset back to today
    }
  });

  loadTransactions(); // ⬅ load after default dates are set

  ["fromDate", "toDate", "filterBank", "filterInc"].forEach((id) => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });

  document
    .getElementById("filterCategoryList")
    .addEventListener("click", (e) => e.stopPropagation());
});

function loadTransactions() {
  lockPage("Fetching transactions...");

  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "getTransactions",
      token: sessionStorage.getItem("token"),
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      unlockPage();

      if (data.status !== "success") {
        Swal.fire("Error", data.message, "error");
        return;
      }

      allTransactions = data.data;

      const mainRows = allTransactions.filter(
        (r) => r.type.toLowerCase() !== "transfer"
      );

      // ✅ Build category checkboxes ONCE
      buildCategoryCheckboxes(mainRows);

      updateFilterOptions(mainRows);
      applyFilters();
    })
    .catch(() => {
      unlockPage();
      Swal.fire("Error", "Failed to load data", "error");
    });
}

function renderTable(rows) {
  transactions = rows;

  const tbody = document.getElementById("transaction-body");
  tbody.innerHTML = "";

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center">No transactions found</td>
      </tr>`;
    return;
  }

  rows.forEach((r, i) => {
    const isCarParking = r.category?.toLowerCase() === "parking payment";
    const isBudget = r.budgetId != "";

    tbody.innerHTML += `
      <tr>
        <td class="text-center">${i + 1}</td>
        <td>${new Date(r.time).toLocaleDateString("en-GB")}</td>
        <td>${new Date(r.date).toLocaleDateString("en-GB")}</td>
        <td>${r.bank}</td>
        <td>${r.inc}</td>
        <td class="text-capitalize">${r.type}</td>
        <td>${r.app || "-"}</td>
        <td>${r.category}</td>
        <td>${r.description}</td>
        <td class="text-center">${r.amount}</td>
        <td class="text-center text-nowrap align-middle">
          <button 
          type="button"
            class="btn btn-sm btn-warning"
            onclick="openEditModal(${i})"
            ${
              isCarParking
                ? "hidden title='Editing disabled for Car Parking'"
                : isBudget
                ? "hidden title='Editing disabled for Car Parking'"
                : ""
            }
          >
            <i class="fa fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="del(${r.rowId})">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      </tr>`;
  });
}

function openEditModal(index) {
  const t = transactions[index];
  const dateInput = document.getElementById("editDate");

  dateInput.max = current;
  document.getElementById("editRowId").value = t.rowId;
  dateInput.value = formatDateForInput(t.date);
  document.getElementById("editBank").value = t.bank;

  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;

    // Convert input to Date
    const selected = new Date(dateInput.value + "T00:00");

    if (selected > today) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date",
        text: "Future dates are not allowed.",
      });
      dateInput.value = current; // Reset back to today
    }
  });

  // 1️⃣ Income / Expense
  document.getElementById("editInc").value = t.inc;

  // 2️⃣ Load dependent dropdowns
  loadedittype();
  loadeditcategory();

  // 3️⃣ Select Type
  document.getElementById("editType").value = t.type;

  // 4️⃣ Load App after Type
  loadeditapp();

  // 5️⃣ Select App
  document.getElementById("editApp").value = t.app || "";

  // 6️⃣ Select Category
  document.getElementById("editCategory").value = t.category;

  document.getElementById("editDescription").value = t.description;
  document.getElementById("editAmount").value = t.amount;

  new bootstrap.Modal(document.getElementById("editModal")).show();
}

const editCategory = {
  Income: [
    "Salary",
    "Not my money",
    "Sports",
    "Internal",
    "Money Back",
    "Other Income",
  ],
  Expense: [
    "Investment",
    "Food",
    "Medicals",
    "Trip",
    "Grocery",
    "Entertainment",
    "Electronics & Accessories",
    "Fasion",
    "Sports",
    "Internal",
    "Gift",
    "Money Lend",
    "Not my money",
    "Other Expense",
  ],
};

function loadeditcategory() {
  const inc = document.getElementById("editInc").value;
  const cat = document.getElementById("editCategory");
  cat.innerHTML = "<option value=''>Select</option>";

  if (editCategory[inc]) {
    editCategory[inc].forEach((item) => {
      cat.innerHTML += `<option value="${item}">${item}</option>`;
    });
  }
}

const editTyp = {
  Income: ["UPI", "Bank Transfer", "Deposit"],
  Expense: ["UPI", "Bank Transfer", "Withdrawal", "Debit Card"],
};

function loadedittype() {
  const inc = document.getElementById("editInc").value;
  const type = document.getElementById("editType");
  type.innerHTML = "<option value=''>Select</option>";

  if (editTyp[inc]) {
    editTyp[inc].forEach((item) => {
      type.innerHTML += `<option value="${item}">${item}</option>`;
    });
  }
}

const editApp = {
  UPI: ["Gpay", "Phonepe", "Supermoney", "Paytm"],
};

function loadeditapp() {
  const type = document.getElementById("editType").value;
  const ap = document.getElementById("editApp");
  ap.innerHTML = "<option value=''>Select</option>";
  ap.disabled = true;
  if (type === "UPI") {
    ap.disabled = false;
    editApp[type].forEach((item) => {
      ap.innerHTML += `<option value="${item}">${item}</option>`;
    });
  } else {
    ap.disabled = true;
  }
}

function formatDateForInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function del(rowId) {
  Swal.fire({
    title: "Are you sure?",
    text: "This transaction will be deleted",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      lockPage("Deleting Data...");
      fetch(URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "deleteTransaction",
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
              loadTransactions();
            });
          } else {
            unlockPage();
            Swal.fire("Error", data.message, "error");
          }
        });
    }
  });
}

function updateTransaction() {
  const rowId = document.getElementById("editRowId").value;
  const date = document.getElementById("editDate").value;
  const bank = document.getElementById("editBank").value;
  const inc = document.getElementById("editInc").value;
  const type = document.getElementById("editType").value;
  const app = document.getElementById("editApp").value;
  const category = document.getElementById("editCategory").value;
  const description = document.getElementById("editDescription").value;
  const amount = document.getElementById("editAmount").value;
  if (
    !rowId ||
    !date ||
    !bank ||
    !inc ||
    !type ||
    !category ||
    !description ||
    !amount
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

  lockPage("Update in Progress...");

  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "updateTransaction",
      token: sessionStorage.getItem("token"),
      rowId,
      date,
      bank,
      inc,
      type,
      app,
      category,
      description,
      amount,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      bootstrap.Modal.getInstance(document.getElementById("editModal")).hide();
      if (data.status === "success") {
        unlockPage();
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Transaction updated successfully",
        }).then(() => {
          unlockPage();
          loadTransactions();
        });
      } else {
        unlockPage();
        Swal.fire("Error", data.message, "error");
      }
    });
}

function applyFilters() {
  const from = document.getElementById("fromDate").value;
  const to = document.getElementById("toDate").value;
  const bank = document.getElementById("filterBank").value;
  const inc = document.getElementById("filterInc").value;

  let filtered = allTransactions.filter((r) => {
    if (from) {
      const rd = new Date(r.date);
      const fd = new Date(from);
      rd.setHours(0, 0, 0, 0);
      fd.setHours(0, 0, 0, 0);
      if (rd < fd) return false;
    }

    if (to) {
      const rd = new Date(r.date);
      const td = new Date(to);
      rd.setHours(0, 0, 0, 0);
      td.setHours(0, 0, 0, 0);
      if (rd > td) return false;
    }

    if (bank && r.bank !== bank) return false;
    if (inc && r.inc !== inc) return false;

    // ✅ CATEGORY FILTER
    const selectedCategories = getSelectedCategories();
    if (
      selectedCategories.length > 0 &&
      !selectedCategories.includes(r.category)
    )
      return false;

    return true;
  });

  filtered = filtered.filter((r) => r.type.toLowerCase() !== "transfer");

  renderTable(filtered);
  updateSummary(filtered);
}

function resetFilters() {
  const from = document.getElementById("fromDate");
  const to = document.getElementById("toDate");

  // 🔥 DEFAULT DATE RESET — SAME AS PAGE LOAD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  from.value = `${yyyy}-${mm}-01`; // 1st of month
  to.value = `${yyyy}-${mm}-${dd}`; // Today

  // 🔥 Reset other filters
  document.getElementById("filterBank").value = "";
  document.getElementById("filterInc").value = "";

  // 🔥 Reset category checkboxes
  document.querySelectorAll(".category-check").forEach((cb) => {
    cb.checked = true;
  });

  updateCategoryButtonText();

  // 🔥 Apply filters with the default date range
  applyFilters();
}

function updateFilterOptions(rows) {
  const bankSel = document.getElementById("filterBank");

  const banks = [...new Set(rows.map((r) => r.bank))];
  const curBank = bankSel.value;

  bankSel.innerHTML = `<option value="">All Banks</option>`;
  banks.forEach((b) => {
    bankSel.innerHTML += `<option value="${b}">${b}</option>`;
  });

  // keep selected bank if still valid
  if (banks.includes(curBank)) {
    bankSel.value = curBank;
  }
}

function updateSummary(rows) {
  let income = 0,
    expense = 0;

  rows.forEach((r) => {
    const amt = Number(r.amount) || 0;
    if (r.inc === "Income") income += amt;
    if (r.inc === "Expense") expense += amt;
  });

  const net = income - expense;
  const netEl = document.getElementById("sum-net");

  document.getElementById("sum-income").innerText = `₹${income.toFixed(2)}`;
  document.getElementById("sum-expense").innerText = `₹${expense.toFixed(2)}`;
  netEl.innerText = `₹${net.toFixed(2)}`;
  document.getElementById("sum-count").innerText = rows.length;

  netEl.parentElement.className =
    "card-body " + (net >= 0 ? "text-bg-primary" : "text-bg-warning");
}

const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");

// When From Date changes, set To Date's minimum
fromDateInput.addEventListener("change", () => {
  if (fromDateInput.value) {
    toDateInput.min = fromDateInput.value; // disable earlier dates
    if (toDateInput.value && toDateInput.value < fromDateInput.value) {
      toDateInput.value = ""; // reset if current To Date is invalid
    }
  } else {
    toDateInput.min = ""; // no restriction if From Date is cleared
  }

  applyFiltersTransfer();
});

// Optional: prevent From Date being after To Date
toDateInput.addEventListener("change", () => {
  if (toDateInput.value) {
    fromDateInput.max = toDateInput.value; // disable later From Dates
    if (fromDateInput.value && fromDateInput.value > toDateInput.value) {
      fromDateInput.value = ""; // reset if invalid
    }
  } else {
    fromDateInput.max = ""; // no restriction if To Date is cleared
  }

  applyFiltersTransfer();
});

function updateCategoryButtonText() {
  const btn = document.getElementById("categoryDropdownBtn");
  const checked = document.querySelectorAll(".category-check:checked").length;
  const total = document.querySelectorAll(".category-check").length;

  if (checked === 0) {
    btn.textContent = "No Category Selected";
  } else if (checked === total) {
    btn.textContent = "All Categories";
  } else {
    btn.textContent = `Categories (${checked})`;
  }
}

function buildCategoryCheckboxes(rows) {
  const catWrap = document.getElementById("filterCategoryList");

  catWrap.querySelectorAll(".category-item").forEach((el) => el.remove());

  const categories = [...new Set(rows.map((r) => r.category))];

  categories.forEach((cat) => {
    const li = document.createElement("li");
    li.className = "category-item";

    li.innerHTML = `
      <div class="form-check">
        <input class="form-check-input category-check"
          type="checkbox"
          value="${cat}"
          checked>
        <label class="form-check-label">${cat}</label>
      </div>
    `;

    catWrap.appendChild(li);
  });

  // ✅ Bind change event for all checkboxes
  document.querySelectorAll(".category-check").forEach((cb) => {
    cb.addEventListener("change", () => {
      updateCategoryButtonText(); // ✅ sync button text
      applyFilters();
    });
  });

  updateCategoryButtonText();
}

function selectAllCategories() {
  document.querySelectorAll(".category-check").forEach((cb) => {
    cb.checked = true;
  });

  updateCategoryButtonText();
  applyFilters();
}

function unselectAllCategories() {
  document.querySelectorAll(".category-check").forEach((cb) => {
    cb.checked = false;
  });

  updateCategoryButtonText();
  applyFilters();
}

function getSelectedCategories() {
  return Array.from(document.querySelectorAll(".category-check:checked")).map(
    (cb) => cb.value
  );
}
