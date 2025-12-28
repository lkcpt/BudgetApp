function transact(event) {
  event.preventDefault();
  lockPage("Transaction Under Progress.....");
  const date = document.getElementById("date").value;
  const bank = document.getElementById("bank").value;
  const inc = document.getElementById("inc").value;
  const type = document.getElementById("type").value;
  const app = document.getElementById("app").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const amount = document.getElementById("amount").value;
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
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      unlockPage();
      if (data.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Done",
          text: "Transaction Added Successfully",
        }).then(() => {
          const form = document.getElementById("transact-form");
          const fields = [...form.querySelectorAll("[data-step]")];
          form.reset();
          fields.forEach((field, index) => {
            field.disabled = index !== 0;
          });
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
          fields[0]?.focus();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Somehing went wrong",
          text: data.message,
        }).then(() => {
          const form = document.getElementById("transact-form");
          const fields = [...form.querySelectorAll("[data-step]")];
          form.reset();
          fields.forEach((field, index) => {
            field.disabled = index !== 0;
          });
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
          fields[0]?.focus();
        });
      }
    });
}

const category = {
  Income: ["Salary", "For Trip", "Other Income"],
  Expense: [
    "Savings",
    "Investment",
    "EMI",
    "Cracker Fund",
    "Petrol",
    "Food",
    "Medicals",
    "Travel",
    "Trip - Mine",
    "Trip - others",
    "Grocery",
    "Other Expense",
  ],
};

function loadcategory() {
  const inc = document.getElementById("inc").value;
  const cat = document.getElementById("category");
  cat.innerHTML = "<option value=''>Select</option>";

  if (category[inc]) {
    category[inc].forEach((item) => {
      cat.innerHTML += `<option value="${item}">${item}</option>`;
    });
  }
}

const typ = {
  Income: ["UPI", "Bank Transfer", "Deposit"],
  Expense: ["UPI", "Bank Transfer", "Withdrawal", "Debit Card"],
};

function loadtype() {
  const inc = document.getElementById("inc").value;
  const type = document.getElementById("type");
  type.innerHTML = "<option value=''>Select</option>";

  if (typ[inc]) {
    typ[inc].forEach((item) => {
      type.innerHTML += `<option value="${item}">${item}</option>`;
    });
  }
}

const app = {
  UPI: ["Gpay", "Phonepe", "Supermoney", "Paytm"],
};

function loadapp() {
  const type = document.getElementById("type").value;
  const ap = document.getElementById("app");
  ap.innerHTML = "<option value=''>Select</option>";
  if (type === "UPI") {
    ap.disabled = false;
    app[type].forEach((item) => {
      ap.innerHTML += `<option value="${item}">${item}</option>`;
    });
  } else {
    ap.disabled = true;
  }
}

const form = document.getElementById("transact-form");
const fields = [...form.querySelectorAll("[data-step]")];
// Enable first field only
fields.forEach((f, i) => (f.disabled = i !== 0));

form.addEventListener("input", handleSteps);
form.addEventListener("change", handleSteps);

function handleSteps(e) {
  const index = fields.indexOf(e.target);
  if (index === -1) return;

  // If current field is empty → disable all below
  if (!e.target.value) {
    disableFrom(index + 1);
    return;
  }

  if (e.target.dataset.step === "4") {
    handleStep4(e.target.value);
    return;
  }

  enableNext(index);
}

function handleStep4(value) {
  // Always reset step 5 first
  disableFrom(4);
  if (value === "UPI") {
    // Enable step 5 (UPI ID)
    fields[4].disabled = false;
  } else {
    // Skip step 5 → enable step 6
    fields[5].disabled = false;
  }
}

function enableNext(index) {
  if (fields[index + 1]) {
    fields[index + 1].disabled = false;
  }
}

function disableFrom(start) {
  for (let i = start; i < fields.length; i++) {
    fields[i].value = "";
    fields[i].disabled = true;
  }
}
