import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const error = document.getElementById("error");
const loginBtn = document.getElementById("loginBtn");

loginBtn.onclick = async () => {
  error.innerText = "";

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      error.innerText = "Email dan password wajib diisi";
      return;
    }

    // 1️⃣ LOGIN AUTH
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    // 2️⃣ CEK USER DI FIRESTORE
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    // ❌ JIKA USER BELUM TERDAFTAR
    if (!snap.exists()) {
      error.innerText = "User belum terdaftar, hubungi admin";
      return;
    }

    const roleDB = snap.data().role;

    // ❌ VALIDASI ROLE
    if (!roleDB) {
      error.innerText = "Role tidak ditemukan";
      return;
    }

    // 3️⃣ SIMPAN SESSION (FIX)
    localStorage.setItem("uid", uid);
    localStorage.setItem("role", roleDB);

    // 4️⃣ REDIRECT SESUAI ROLE
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