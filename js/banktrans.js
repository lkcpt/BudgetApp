function submitTransfer(event) {
  event.preventDefault();
  lockPage("Bank Transfer Under Progress.....");
  const date = document.getElementById("date").value;
  const fromBank = document.getElementById("fromBank").value;
  const toBank = document.getElementById("toBank").value;
  const description = document.getElementById("description").value;
  const amount = document.getElementById("amount").value;

  if (fromBank === toBank) {
    unlockPage();
    Swal.fire({
      icon: "warning",
      title: "Change Bank",
      text: "From and To bank cannot be same",
    }).then(() => {
      const form = document.getElementById("transfer-form");
      resetFormFields();
      fields.forEach((field, index) => {
        field.disabled = index !== 0;
      });
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      fields[0]?.focus();
    });
    return;
  } else {
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "transferBank",
        token: sessionStorage.getItem("token"),
        date,
        fromBank,
        toBank,
        description,
        amount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        unlockPage();
        if (data.status === "success") {
          resetFormFields();
          Swal.fire("Success", "Transfer completed", "success");
          document.getElementById("transfer-form").reset();
          fields.forEach((field, index) => {
            field.disabled = index !== 0;
          });
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
          fields[0]?.focus();
        } else {
          Swal.fire("Error", data.message, "error");
        }
      });
  }
}

//For Enable and Disable
const form = document.getElementById("transfer-form");
const fields = [...form.querySelectorAll("[data-step]")];
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

  enableNext(index);

  if (e.target.id === "fromBank") filterToBanks();
  if (e.target.id === "toBank") filterFromBanks();
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

const fromBankSelect = document.getElementById("fromBank");
const toBankSelect = document.getElementById("toBank");

fromBankSelect.addEventListener("change", () => {
  filterToBanks();
});

toBankSelect.addEventListener("change", () => {
  filterFromBanks();
});

function filterToBanks() {
  const fromVal = fromBankSelect.value;

  [...toBankSelect.options].forEach((opt) => {
    if (!opt.value) return; // skip placeholder
    opt.disabled = opt.value === fromVal;
  });

  // reset if currently invalid
  if (toBankSelect.value === fromVal) {
    toBankSelect.value = "";
  }
}

function filterFromBanks() {
  const toVal = toBankSelect.value;

  [...fromBankSelect.options].forEach((opt) => {
    if (!opt.value) return;
    opt.disabled = opt.value === toVal;
  });

  if (fromBankSelect.value === toVal) {
    fromBankSelect.value = "";
  }
}

function resetFormFields() {
  // Reset form values
  form.reset();

  // Re-enable all options in From and To select
  [...fromBankSelect.options].forEach((opt) => (opt.disabled = false));
  [...toBankSelect.options].forEach((opt) => (opt.disabled = false));

  // Disable all fields except the first
  fields.forEach((field, index) => (field.disabled = index !== 0));

  // Scroll to top and focus the first field
  window.scrollTo({ top: 0, behavior: "smooth" });
  fields[0]?.focus();
}
