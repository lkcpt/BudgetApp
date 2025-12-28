let transferTransactions = [];
let allTransactions = [];

document.addEventListener("DOMContentLoaded", () => {
  loadTransfers();
});

["fromDate-transfer", "toDate-transfer"].forEach((id) => {
  document.getElementById(id).addEventListener("change", applyFiltersTransfer);
});

function loadTransfers() {
  lockPage("Fetching transfers...");

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

      // Only include transfers
      const rawTransfers = allTransactions.filter(
        (r) => r.type.toLowerCase() === "transfer" && r.transferId
      );

      transferTransactions = groupTransfers(rawTransfers);

      renderTransferTable(transferTransactions);
      updateTransferSummary(transferTransactions);
    })
    .catch(() => {
      unlockPage();
      Swal.fire("Error", "Failed to load transfers", "error");
    });
}

function groupTransfers(rows) {
  const map = {};

  rows.forEach((r) => {
    if (!map[r.transferId]) map[r.transferId] = [];
    map[r.transferId].push(r);
  });

  const result = [];

  Object.keys(map).forEach((id) => {
    const pair = map[id];
    if (pair.length !== 2) return;

    const debit = pair.find((p) => p.inc === "Expense");
    const credit = pair.find((p) => p.inc === "Income");

    if (!debit || !credit) return;

    result.push({
      transferId: id,
      time: debit.time,
      date: debit.date,
      fromBank: debit.bank,
      toBank: credit.bank,
      amount: debit.amount,
      description: debit.description.replace(/^To\s+/i, ""),
    });
  });

  return result;
}

function renderTransferTable(rows) {
  const tbody = document.getElementById("transfer-body");
  tbody.innerHTML = "";

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No transfers found</td></tr>`;
    return;
  }

  rows.forEach((r, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${new Date(r.time).toLocaleDateString()}</td>
        <td>${new Date(r.date).toLocaleDateString()}</td>
        <td>${r.fromBank}</td>
        <td>${r.toBank}</td>
        <td >${r.description}</td>
        <td class="text-center">₹${Number(r.amount).toFixed(2)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-danger" onclick="deleteTransferUI('${
            r.transferId
          }')">
            <i class="fa fa-trash"></i>
          </button>
        </td>
      </tr>`;
  });
}

function deleteTransferUI(id) {
  Swal.fire({
    title: "Delete transfer?",
    text: "Both debit and credit entries will be removed.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete",
  }).then((res) => {
    if (!res.isConfirmed) return;
    lockPage("Deleting Data...");
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "deleteTransfer",
        token: sessionStorage.getItem("token"),
        transferId: id,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success") {
          unlockPage();
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Transaction Deleted Successfully",
          }).then(() => {
            loadTransfers();
          });
        } else {
          unlockPage();
          Swal.fire("Error", data.message, "error");
        }
      });
  });
}

function applyFiltersTransfer() {
  const from = document.getElementById("fromDate-transfer").value;
  const to = document.getElementById("toDate-transfer").value;

  let filtered = transferTransactions.filter((r) => {
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
    return true;
  });

  renderTransferTable(filtered);
  updateTransferSummary(filtered);
}

function resetFiltersTransfer() {
  document.getElementById("fromDate-transfer").value = "";
  document.getElementById("toDate-transfer").value = "";

  renderTransferTable(transferTransactions);
  updateTransferSummary(transferTransactions);
}

function updateTransferSummary(rows) {
  let total = 0;
  rows.forEach((r) => (total += Number(r.amount) || 0));

  const totalEl = document.getElementById("sum-total-transfer");
  const countEl = document.getElementById("sum-count-transfer");

  if (totalEl) totalEl.innerText = `₹${total.toFixed(2)}`;
  if (countEl) countEl.innerText = rows.length;
}

const fromDateInput = document.getElementById("fromDate-transfer");
const toDateInput = document.getElementById("toDate-transfer");

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
