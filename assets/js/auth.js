import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { doc, getDoc } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const error = document.getElementById("error");
const loginBtn = document.getElementById("loginBtn");
const roleSelect = document.getElementById("role");

// ================= LOGIN =================
loginBtn.onclick = async () => {
  error.innerText = "";

  // 🔄 LOADING ON
  loginBtn.classList.add("loading");
  loginBtn.innerText = "Memproses...";

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      throw new Error("Email dan password wajib diisi");
    }

    // 1️⃣ LOGIN AUTH
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCred.user.uid;

    // 2️⃣ CEK USER DI FIRESTORE
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      throw new Error("User belum terdaftar, hubungi admin");
    }

    const roleDB = snap.data().role;

    if (!roleDB) {
      throw new Error("Role tidak ditemukan");
    }

    // 3️⃣ VALIDASI ROLE
    const selectedRole = roleSelect?.value;

    if (selectedRole && selectedRole !== roleDB) {
      throw new Error("Role yang dipilih tidak sesuai dengan akun!");
    }

    // 4️⃣ SIMPAN SESSION
    localStorage.setItem("uid", uid);
    localStorage.setItem("role", roleDB);

    // 5️⃣ REDIRECT
    if (roleDB === "admin") {
      window.location.href = "admin/dashboard.html";
    } else if (roleDB === "guru") {
      window.location.href = "guru/dashboard-guru.html";
    } else {
      throw new Error("Role tidak dikenali!");
    }

  } catch (e) {
    console.error("Login gagal:", e);

    // 🔥 ERROR FRIENDLY
    if (e.code === "auth/user-not-found") {
      error.innerText = "Email belum terdaftar";
    } else if (e.code === "auth/wrong-password") {
      error.innerText = "Password salah";
    } else if (e.code === "auth/invalid-email") {
      error.innerText = "Format email tidak valid";
    } else {
      error.innerText = e.message;
    }

  } finally {
    // 🔄 LOADING OFF
    loginBtn.classList.remove("loading");
    loginBtn.innerText = "Login";
  }
};

// ================= 👁️ TOGGLE PASSWORD =================
const togglePassword = document.getElementById("togglePassword");

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password"
        ? "text"
        : "password";

    passwordInput.setAttribute("type", type);

    togglePassword.classList.toggle("fa-eye");
    togglePassword.classList.toggle("fa-eye-slash");
  });
}