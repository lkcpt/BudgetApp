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
        "warning"
      );
    }
  });
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
        });
      }
    });
}
