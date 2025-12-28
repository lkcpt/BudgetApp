const token = sessionStorage.getItem("token");

if (!token) {
  window.location.href = "index.html";
}

fetch(URL, {
  method: "POST",
  body: new URLSearchParams({
    action: "checkSession",
    token: token,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    if (data.status !== "success") {
      sessionStorage.clear();
      window.location.href = "index.html";
    } else {
      sessionStorage.setItem("userEmail", data.email);
      sessionStorage.setItem("userName", data.name);

      // 🔥 Trigger navbar update here
      updateNavbarUser();
    }
  });
