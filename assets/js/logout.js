import { auth } from "./firebase.js";
import { signOut } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

const logoutBtn = document.getElementById("logout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {

    const yakin = confirm("Apakah Anda yakin ingin keluar?");
    if (!yakin) return;

    try {
      await signOut(auth);
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "../login.html";
    } catch (err) {
      console.error("Gagal logout:", err);
      alert("Logout gagal!");
    }

  });
}
