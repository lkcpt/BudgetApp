let paidNames = new Set();

document.addEventListener("DOMContentLoaded", () => {
  const m = document.getElementById("park-month");
  m.value = getCurrentMonth();

  m.addEventListener("change", () => {
    if (!m.value) {
      m.value = getCurrentMonth(); // 🔒 restore if cleared
    }
    loadParName();
  });
  loadParName();
});

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function submitParName(event) {
  event.preventDefault();
  lockPage("Adding Party.....");
  const name = document.getElementById("parName").value;
  if (name != "") {
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "addParName",
        token: sessionStorage.getItem("token"),
        name: name,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        unlockPage();
        if (data.status === "success") {
          const form = document.getElementById("parking-form");
          form.reset();
          Swal.fire({
            icon: "success",
            title: "Done",
            text: "Name Added Successfully",
          }).then(() => {
            loadParName();
          });
        } else {
          const form = document.getElementById("parking-form");
          form.reset();
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Something went wrong",
          }).then(() => {
            loadParName();
          });
        }
      });
  } else {
    unlockPage();
    loadParName();
    const form = document.getElementById("parking-form");
    form.reset();
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Some Error",
    }).then(() => {
      loadParName();
    });
  }
}

let names = [];
function loadParName() {
  lockPage("Loading Data...");

  const mInput = document.getElementById("park-month");
  const month = mInput.value;
  // current month

  Promise.all([
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "getParName",
        token: sessionStorage.getItem("token"),
      }),
    }).then((r) => r.json()),

    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "getParkingPaid",
        token: sessionStorage.getItem("token"),
        month: month,
      }),
    }).then((r) => r.json()),
  ])
    .then(([namesRes, paidRes]) => {
      unlockPage();

      if (namesRes.status !== "success") {
        Swal.fire("Error", namesRes.message, "error");
        return;
      }

      paidNames = new Set(paidRes.status === "success" ? paidRes.data : []);

      names = namesRes.data;
      renderTable(names);
    })
    .catch(() => {
      unlockPage();
      Swal.fire("Error", "Failed to load data", "error");
    });
}

function renderTable(rows) {
  const tbody = document.getElementById("parName-body");
  tbody.innerHTML = "";

  const selectedMonth = document.getElementById("park-month").value;
  const currentMonth = getCurrentMonth();

  let count = 1;

  rows.forEach((r, i) => {
    const disabledFrom = r.disabledFrom || "";
    const isDisabledRow = r.status === "DISABLED";

    // 🔑 Disabled applies only from disabledFrom month onwards
    const effectiveDisabled =
      isDisabledRow && disabledFrom && selectedMonth >= disabledFrom;

    const isCurrent = selectedMonth === currentMonth;
    const isPaid = paidNames.has(r.name);

    // --- STATUS COLUMN ---
    let statusHtml = "";

    if (effectiveDisabled && selectedMonth !== currentMonth) {
      // Future or past where disabled applies
      statusHtml = `<span class="badge rounded-pill bg-dark">DISABLED</span>`;
    } else if (isPaid) {
      statusHtml = `<span class="badge rounded-pill bg-success">PAID</span>`;
    } else if (isCurrent) {
      statusHtml = `<button class="btn btn-sm btn-warning" onclick="openPaymentModal(${i})">PAY</button>`;
    } else {
      statusHtml = `<span class="badge rounded-pill bg-danger">UNPAID</span>`;
    }

    // --- ACTION COLUMN (only current month can toggle) ---
    let actionHtml = "";

    if (isCurrent) {
      actionHtml = `
        <button class="btn btn-sm ${
          effectiveDisabled ? "btn-warning" : "btn-secondary"
        }"
        onclick="toggleStatus(${r.rowId}, '${
        effectiveDisabled ? "ACTIVE" : "DISABLED"
      }')">
          ${effectiveDisabled ? "Enable" : "Disable"}
        </button>`;
    } else {
      actionHtml = `
        <button class="btn btn-sm btn-secondary" disabled>
          Disable
        </button>`;
    }

    tbody.innerHTML += `
      <tr class="text-center ${effectiveDisabled ? "table-secondary" : ""}">
        <td>${count++}</td>
        <td>${r.name}</td>
        <td>${statusHtml}</td>
        <td>${actionHtml}</td>
      </tr>`;
  });
}

function openPaymentModal(index) {
  const t = names[index];
  document.getElementById("editRowId").value = t.rowId;
  document.getElementById("payParName").value = t.name;
  document.getElementById("amount").value = 1200;
  new bootstrap.Modal(document.getElementById("paymentModal")).show();
}

function makeParkPayment(event) {
  event.preventDefault();
  lockPage("Transaction in Progress...");

  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "makeParkPayment",
      token: sessionStorage.getItem("token"),
      rowId: document.getElementById("editRowId").value,
      name: document.getElementById("payParName").value,
      amount: document.getElementById("amount").value,
      date: document.getElementById("selectDate").value,
      bank: document.getElementById("selectBank").value,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      // ✅ Safely hide modal
      const modalEl = document.getElementById("paymentModal");
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // ✅ Remove overlay BEFORE Swal
      unlockPage();

      if (data.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Done",
          text: "Payment Added successfully",
        }).then(() => {
          loadParName();
        });
      } else {
        Swal.fire("Error", data.message || "Payment failed", "error");
      }
    })
    .catch((err) => {
      console.error(err);
      unlockPage();
      Swal.fire("Error", "Network error", "error");
    });
}

function toggleStatus(rowId, status) {
  const actionText = status === "DISABLED" ? "Disabling..." : "Enabling...";
  lockPage(actionText);

  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "toggleParStatus",
      token: sessionStorage.getItem("token"),
      rowId: rowId,
      status: status,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      unlockPage();
      if (data.status === "success") {
        loadParName();
      } else {
        Swal.fire("Error", data.message, "error");
      }
    });
}

const modalEl = document.getElementById("paymentModal");
const dateInput = document.getElementById("selectDate");

modalEl.addEventListener("shown.bs.modal", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);

  const toYMD = (d) => d.toISOString().split("T")[0];

  dateInput.min = toYMD(first);
  dateInput.max = toYMD(last);

  // default to today if empty
  if (!dateInput.value) {
    dateInput.value = toYMD(now);
  }
});
