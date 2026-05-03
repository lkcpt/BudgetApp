document.addEventListener("DOMContentLoaded", () => {
  const month = document.getElementById("month");
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");

  const current = `${yyyy}-${mm}`;
  month.value = current;
  month.min = current;
  month.max = current;

  month.addEventListener("input", () => {
    if (month.value !== current) {
      month.value = current;
      Swal.fire(
        "Invalid Month",
        "You can only select the current month.",
        "warning",
      );
    }
  });
  loadPreviousBudgets();
});

// ===============================================
// ADD BUDGET FUNCTION
// ===============================================
function addBudget(event) {
  event.preventDefault();
  lockPage("Adding Budget.....");

  const month = document.getElementById("month").value;
  const bank = document.getElementById("bank").value;
  const category = document.getElementById("category").value;
  const amount = document.getElementById("amount").value;

  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "addbudget",
      token: sessionStorage.getItem("token"),
      month,
      bank,
      category,
      amount,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      unlockPage();
      const form = document.getElementById("budget-form");

      if (data.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Done",
          text: "Budget Added Successfully",
        }).then(() => {
          form.reset();

          // 🔥 Reset month to current month after form reset
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          document.getElementById("month").value = `${yyyy}-${mm}`;

          window.scrollTo({ top: 0, behavior: "smooth" });
          loadPreviousBudgets();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Something went wrong",
          text: data.message,
        }).then(() => {
          form.reset();

          // 🔥 Also reset month here
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          document.getElementById("month").value = `${yyyy}-${mm}`;

          window.scrollTo({ top: 0, behavior: "smooth" });
          loadPreviousBudgets();
        });
      }
    });
}

function isBudgetUsed(bank, category) {
  return currentMonthBudgets.some(
    (b) =>
      b.bank.toLowerCase() === bank.toLowerCase() &&
      b.category.toLowerCase() === category.toLowerCase(),
  );
}

function loadPreviousBudgets() {
  lockPage("Fetching Data...");

  Promise.all([
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "getPreviousMonthBudget",
        token: sessionStorage.getItem("token"),
      }),
    }).then((res) => res.json()),

    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "getBudget",
        token: sessionStorage.getItem("token"),
      }),
    }).then((res) => res.json()),
  ])
    .then(([prevRes, currRes]) => {
      unlockPage();

      if (prevRes.status !== "success") {
        Swal.fire("Error", prevRes.message, "error");
        return;
      }

      // ✅ CURRENT MONTH FILTER
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const currentMonth = `${yyyy}-${mm}`;

      currentMonthBudgets = (currRes.data || []).filter(
        (b) => b.month === currentMonth,
      );

      const container = document.getElementById("prev-budget-list");
      container.innerHTML = "";

      if (!prevRes.data || prevRes.data.length === 0) {
        container.innerHTML = `
          <div class="text-center text-muted py-3">
            No Previous Budget Found
          </div>
        `;
        return;
      }

      // ==============================
      // GROUP BY BANK
      // ==============================
      const grouped = {};
      prevRes.data.forEach((item) => {
        if (!grouped[item.bank]) grouped[item.bank] = [];
        grouped[item.bank].push(item);
      });

      // ==============================
      // LOOP BANKS
      // ==============================
      Object.keys(grouped).forEach((bank) => {
        const items = grouped[bank];

        // ✅ PUSH MIN BALANCE LAST
        const sortedItems = [
          ...items.filter(
            (r) => String(r.category).toLowerCase() !== "minimum balance",
          ),
          ...items.filter(
            (r) => String(r.category).toLowerCase() === "minimum balance",
          ),
        ];

        const collapseId = `prev_${bank.replace(/\s+/g, "_")}`;

        const html = `
        <div class="col-12 col-md-8 col-lg-9 mx-auto mb-3">

          <div class="card shadow-sm border-0">

            <!-- HEADER -->
            <div class="card-body d-flex justify-content-between align-items-center"
                 data-bs-toggle="collapse"
                 data-bs-target="#${collapseId}"
                 style="cursor:pointer;">

              <div class="d-flex align-items-center gap-2">
                <img src="images/${bank}.png"
                     height="30"
                     onerror="this.src='images/default.png'">

                <div>
                  <h6 class="mb-0 fw-bold">${bank}</h6>
                  <small class="text-muted">Previous Month</small>
                </div>
              </div>

              <div class="fw-bold">
                ${sortedItems.length} Items
              </div>
            </div>

            <!-- BODY -->
            <div id="${collapseId}" class="collapse">
              <div class="card-body pt-0">

                <div class="table-responsive">
                  <table class="table table-bordered table-striped table-sm">
                    <thead class="text-center table-warning">
                      <tr>
                        <th>S.No</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      ${sortedItems
                        .map((item, i) => {
                          const used = isBudgetUsed(item.bank, item.category);

                          return `
                          <tr class="${
                            item.category.toLowerCase() === "minimum balance"
                              ? "table-info"
                              : ""
                          }">
                            <td class="text-center">${i + 1}</td>
                            <td>${item.category}</td>
                            <td class="text-center text-nowrap">
                              ₹ ${Number(item.amount).toFixed(2)}
                            </td>

                            <td class="text-center">
                              <button 
                                class="btn btn-sm ${
                                  used ? "btn-secondary" : "btn-primary"
                                } use-prev"
                                data-bank="${item.bank}"
                                data-category="${item.category}"
                                data-amount="${item.amount}"
                                ${used ? "disabled" : ""}>
                                ${
                                  used
                                    ? "Added"
                                    : '<i class="fa-solid fa-plus"></i>'
                                }
                              </button>
                            </td>
                          </tr>
                        `;
                        })
                        .join("")}
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
    })
    .catch(() => {
      unlockPage();
      Swal.fire("Error", "Failed to load data", "error");
    });
}

document.addEventListener("click", function (e) {
  const btn = e.target.closest(".use-prev");
  if (!btn) return;

  const item = {
    bank: btn.dataset.bank,
    category: btn.dataset.category,
    amount: btn.dataset.amount,
  };

  useBudget(item);
});

function useBudget(item) {
  selectedBudget = item;

  document.getElementById("modal-bank").value = item.bank;
  document.getElementById("modal-category").value = item.category;
  document.getElementById("modal-amount").value = item.amount;

  const modal = new bootstrap.Modal(document.getElementById("budgetModal"));
  modal.show();
}

function submitBudgetModal() {
  const category = document.getElementById("modal-category").value;
  const amount = document.getElementById("modal-amount").value;
  const bank = document.getElementById("modal-bank").value;

  if (!category || !amount) {
    Swal.fire("Error", "Fill all fields", "error");
    return;
  }

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");

  lockPage("Adding Budget...");

  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "addbudget",
      token: sessionStorage.getItem("token"),
      month: `${yyyy}-${mm}`,
      bank,
      category,
      amount,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      unlockPage();

      if (data.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Done",
          text: "Budget Added Successfully",
        }).then(() => {
          const modalEl = document.getElementById("budgetModal");
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal.hide();

          loadPreviousBudgets(); // 🔥 refresh & disable button
        });
      } else {
        Swal.fire("Error", data.message, "error");
      }
    });
}
