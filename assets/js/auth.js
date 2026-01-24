import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const roleSelect = document.getElementById("role");
const error = document.getElementById("error");
const loginBtn = document.getElementById("loginBtn");

loginBtn.onclick = async () => {
  error.innerText = "";

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const roleDipilih = roleSelect.value;

    if (!email || !password) {
      error.innerText = "Email dan password wajib diisi";
      return;
    }

    // LOGIN AUTH
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid; // <-- FIX: ambil UID

    // AMBIL DATA USER
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      error.innerText = "Akun tidak terdaftar di database";
      return;
    }

    const roleDB = snap.data().role;

    if (roleDB !== roleDipilih) {
      error.innerText = "Role tidak sesuai";
      return;
    }

    // SIMPAN SESSION
    sessionStorage.setItem("uid", uid);
    sessionStorage.setItem("role", roleDB);

    // REDIRECT KE DASHBOARD SESUAI ROLE
    if (roleDB === "admin") {
      window.location.href = "admin/dashboard.html";
    } else if (roleDB === "guru") {
      window.location.href = "guru/dashboard-guru.html";
    } else {
      error.innerText = "Role tidak dikenali!";
    }

  } catch (e) {
    console.error("Login gagal:", e);

    if (e.code === "auth/user-not-found") {
      error.innerText = "Email belum terdaftar";
    } else if (e.code === "auth/wrong-password") {
      error.innerText = "Password salah";
    } else if (e.code === "auth/invalid-email") {
      error.innerText = "Format email tidak valid";
    } else {
      error.innerText = e.message;
    }
  }
};
