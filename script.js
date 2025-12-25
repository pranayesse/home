function copyEmail() {
  const email = "pranay.mokida@protonmail.com";
  navigator.clipboard.writeText(email).then(() => {
    alert("Email copied to clipboard.");
  });
}
