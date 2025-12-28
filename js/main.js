function lockPage(message = "Please wait...") {
  document.body.classList.add("loading");
  const p = document.querySelector("#page-loader p");
  if (p) p.innerText = message;
}

function unlockPage() {
  document.body.classList.remove("loading");
}

//Nav Bar code

fetch("navbar.html")
  .then((res) => res.text())
  .then((html) => {
    document.getElementById("navbar").innerHTML = html;

    // Try updating immediately (works after reload)
    updateNavbarUser();
  });

function updateNavbarUser() {
  const name = sessionStorage.getItem("userName");
  const el = document.getElementById("nav-username");
  if (el && name) {
    el.innerText = name;
  }
}

const URL =
  "https://script.google.com/macros/s/AKfycbxEcNwLgjTUx97pkzvaTvlKsbhn4zxrVll-dEB9GSlBJ4DZ4QpjPET5GuaGiFGUG58c/exec";

//Login page Code
function login(event) {
  event.preventDefault();
  lockPage("Logging in...");
  const email = document.getElementById("email").value;
  const pwd = document.getElementById("pwd").value;
  fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      action: "login",
      email: email,
      pwd: pwd,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      unlockPage();
      if (data.status === "success") {
        sessionStorage.setItem("token", data.token);
        window.location.href = "dashboard.html";
      } else {
        Swal.fire({
          icon: "error",
          title: "Wrong Credentials",
          text: "Incorrect Email or Password",
        }).then(() => {
          document.getElementById("login-form").reset();
        });
      }
    });
  return false;
}

//logout
function logout() {
  lockPage("Logging out...");

  fetch(URL, {
    method: "POST",
    body: new URLSearchParams({
      action: "logout",
      token: sessionStorage.getItem("token"),
    }),
  }).finally(() => {
    sessionStorage.clear();
    window.location.href = "index.html";
  });
}

// register page Code
function register(event) {
  event.preventDefault();
  lockPage("Creating account...");
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const pwd = document.getElementById("pwd").value;
  const rpwd = document.getElementById("re-pwd").value;

  if (rpwd === "" || rpwd != pwd) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Password Does Not Match",
    }).then(() => {
      unlockPage();
      document.getElementById("register-form").reset();
    });
  } else if (name != "" || email != "" || pwd != "") {
    fetch(URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "register",
        name: name,
        email: email,
        pwd: pwd,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        unlockPage();
        if (data.status === "success") {
          Swal.fire("Success", "Registered Successfully", "success").then(
            () => (window.location.href = "index.html")
          );
        } else {
          Swal.fire("Error", data.message, "error");
        }
      });
  } else {
    Swal.fire({
      icon: "error",
      title: "Something went wrong",
      text: "Invalid Details",
    }).then(() => {
      unlockPage();
      document.getElementById("register-form").reset();
    });
  }
}

function doOptions(e) {
  const out = ContentService.createTextOutput("");
  out.setHeader("Access-Control-Allow-Origin", "*");
  out.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  out.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return out;
}
