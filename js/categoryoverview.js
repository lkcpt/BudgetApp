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
    renderCategoryCards(txnRes.data || [], month);
  }
}

function renderCategoryCards(transactions, month) {
  const container = document.getElementById("categoryCards");
  if (!container) return;

  container.innerHTML = `<div class="row g-3" id="cardRow"></div>`;
  const scroll = container.querySelector("#cardRow");

  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);

  const map = {};

  transactions.forEach((t) => {
    if (String(t.type || "").toLowerCase() === "transfer") return;

    const d = new Date(t.date);
    if (d < start || d >= end) return;

    const cat = t.category || "Other";
    const amt = Number(t.amount) || 0;

    if (!map[cat]) map[cat] = { income: 0, expense: 0, rows: [] };

    if (t.inc === "Income") map[cat].income += amt;
    if (t.inc === "Expense") map[cat].expense += amt;

    map[cat].rows.push(t);
  });

  Object.entries(map)
    .sort((a, b) => {
      const netA = a[1].income - a[1].expense;
      const netB = b[1].income - b[1].expense;
      return netA - netB; // 🔴 expense/loss first → 🟢 income last
    })
    .forEach(([cat, data], i) => {
      const net = data.income - data.expense;
      const total = data.income + data.expense || 1;

      const incPct = (data.income / total) * 100;
      const expPct = (data.expense / total) * 100;

      const collapseId = `modern_${i}`;

      const spark = data.rows
        .slice(-20)
        .map((r, idx) => {
          return `<span style="left:${idx * 6}px;height:${Math.random() * 28 + 5}px;"></span>`;
        })
        .join("");

      scroll.innerHTML += `
<div class="col-12 col-sm-6 col-lg-4">
  <div class="glass-card p-3 h-100 border g-2"
       data-bs-toggle="collapse"
       data-bs-target="#${collapseId}">

    <!-- HEADER -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <strong>${cat}</strong>
      <span class="fw-bold ${net > 0 ? "text-success" : net < 0 ? "text-danger" : "text-muted"}">
        ₹${net.toFixed(0)}
      </span>
    </div>

    <div class="mb-3 d-flex justify-content-center">
        <canvas id="pie_${i}" style="max-width:140px;max-height:140px;"></canvas>
    </div>

    <!-- PILLS -->
    <div class="d-flex gap-2 flex-wrap justify-content-center">


      <span class="badge rounded-pill bg-success-subtle text-success px-3 py-2">
        Income ₹${data.income.toFixed(0)}
      </span>

      <span class="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
        Expense ₹${data.expense.toFixed(0)}
      </span>

    </div>

    <!-- EXPANDABLE TABLE -->
    <div id="${collapseId}" class="collapse mt-3">
      <div class="table-responsive">
        <table class="table table-sm mb-0">

          <thead>
            <tr>
              <th>Date</th>
              <th>Desc</th>
              <th>Type</th>
              <th class="text-end">₹</th>
            </tr>
          </thead>

          <tbody>
            ${data.rows
              .map(
                (r) => `
              <tr>
                <td>${new Date(r.date).toLocaleDateString("en-GB")}</td>
                <td>${r.description || "-"}</td>
                <td class="${r.inc === "Income" ? "text-success" : "text-danger"}">
                  ${r.inc}
                </td>
                <td class="text-end">${Number(r.amount).toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>

        </table>
      </div>
    </div>

  </div>
</div>
`;
      setTimeout(() => {
        const ctx = document.getElementById(`pie_${i}`);
        if (!ctx) return;

        new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Income", "Expense"],
            datasets: [
              {
                label: "Amount",
                data: [data.income, data.expense],
                backgroundColor: ["#198754", "#dc3545"],
                borderRadius: 8,
                barThickness: 28,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false },
            },
            scales: {
              x: {
                grid: { display: false, drawBorder: false },
                border: { display: false },
                ticks: {
                  color: "#6c757d",
                  font: { size: 11 },
                },
              },
              y: {
                beginAtZero: true,
                grid: { display: false, drawBorder: false },
                border: { display: false },
                ticks: { display: false },
              },
            },
          },
        });
      }, 0);
    });
}

function formatMonth(value) {
  const [year, month] = value.split("-");
  const date = new Date(year, Number(month) - 1);
  const monthName = date.toLocaleString("en-US", { month: "long" });
  return `${monthName}, ${year}`;
}
