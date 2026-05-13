/* =====================================================
   FIREBASE CORE (CLEAN SYSTEM)
===================================================== */
import { app, db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

/* =====================================================
   SECONDARY AUTH
===================================================== */
const secondaryApp = initializeApp(app.options, "secondary-guru");
const secondaryAuth = getAuth(secondaryApp);

/* =====================================================
   ELEMENT
===================================================== */
const namaInput = document.getElementById("nama");
const mapelInput = document.getElementById("mapel");
const list = document.getElementById("list");
const totalGuru = document.getElementById("totalGuru");
const btnTambah = document.getElementById("btnTambah");

/* =====================================================
   MAPEL
===================================================== */
const mapelList = [
  "Pendidikan Agama Islam",
  "Pendidikan Agama Kristen",
  "Pendidikan Agama Katolik",
  "Pendidikan Agama Hindu",
  "Pendidikan Agama Buddha",
  "Pendidikan Agama Konghucu",
  "PPKn",
  "Bahasa Indonesia",
  "Matematika",
  "IPA",
  "IPS",
  "Bahasa Inggris",
  "Seni Budaya",
  "PJOK",
  "Prakarya",
  "Informatika",
  "Bahasa Daerah",
  "Muatan Lokal"
];

/* =====================================================
   INIT MAPEL
===================================================== */
function initMapel() {
  mapelInput.innerHTML = `<option value="">-- Pilih Mapel --</option>`;
  mapelList.forEach(m => {
    mapelInput.innerHTML += `<option value="${m}">${m}</option>`;
  });
}

/* =====================================================
   NOTIF
===================================================== */
function showNotif(text, color = "#16a34a") {
  const el = document.createElement("div");
  el.className = "notif";
  el.style.background = color;
  el.innerHTML = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

/* =====================================================
   CONFIRM
===================================================== */
function confirmCustom(text) {
  return new Promise(resolve => {
    const bg = document.createElement("div");
    bg.className = "confirm-bg";

    bg.innerHTML = `
      <div class="confirm-box">

        <div class="confirm-icon">🗑️</div>

        <h3>Konfirmasi</h3>
        <p>${text}</p>

        <div class="confirm-actions">
          <button class="no">Batal</button>
          <button class="yes">Hapus</button>
        </div>

      </div>
    `;

    document.body.appendChild(bg);

    bg.querySelector(".no").onclick = () => {
      bg.remove();
      resolve(false);
    };

    bg.querySelector(".yes").onclick = () => {
      bg.remove();
      resolve(true);
    };
  });
}

/* =====================================================
   GENERATE AKUN
===================================================== */
function generateAkun(nama) {
  const num = Math.floor(10 + Math.random() * 90);
  const clean = nama.toLowerCase().replace(/[^a-z]/g, "");

  return {
    email: `${clean}${num}@smp.belajar.id`,
    password: `${clean.slice(0, 4)}${num}`
  };
}

/* =====================================================
   TAMBAH GURU
===================================================== */
window.tambahGuru = async () => {

  if (!namaInput.value || !mapelInput.value) {
    return showNotif("Lengkapi data ❌", "#dc2626");
  }

  try {

    const akun = generateAkun(namaInput.value);

    // ===============================
    // BUAT AUTH SEKALI SAJA
    // ===============================
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      akun.email,
      akun.password
    );

    const uid = cred.user.uid;

    // ===============================
    // SIMPAN DATA GURU
    // ===============================
    await setDoc(doc(db, "guru", akun.email), {
      uid,
      nama: namaInput.value,
      mapel: mapelInput.value,
      email: akun.email,
      password: akun.password,
      aktif: false,
      createdAt: new Date()
    });

    await signOut(secondaryAuth);

    showNotif("Guru berhasil ditambahkan ✅");

    namaInput.value = "";
    mapelInput.value = "";

  } catch (err) {

    console.error(err);

    showNotif(
      "❌ Gagal menambah guru",
      "#dc2626"
    );
  }
};

/* =====================================================
   REALTIME SYSTEM (CORE CLEAN)
===================================================== */
onSnapshot(collection(db, "guru"), (snap) => {

  const data = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  totalGuru.textContent = `Total: ${data.length} guru`;

  list.innerHTML = data.map((g, i) => `

    <tr id="row-${g.id}">

      <td data-label="No">${i + 1}</td>
      <td data-label="Nama">${g.nama}</td>
      <td data-label="Mapel">${g.mapel}</td>
      <td data-label="Email">${g.email}</td>
      <td data-label="Password">${g.password}</td>

      <td data-label="Status">
        ${
          g.aktif
            ? `<span class="badge aktif">Aktif</span>`
            : `<span class="badge nonaktif">Nonaktif</span>`
        }
      </td>

      <td data-label="Aksi">

${
  g.aktif
    ? `<button class="btn danger" onclick="toggleGuru(\`${g.id}\`, false)">
         Nonaktifkan
       </button>`
    : `<button class="btn success" onclick="toggleGuru(\`${g.id}\`, true)">
         Aktifkan
       </button>`
}

        <button class="btn danger" onclick="hapusGuru('${g.id}')">
          Hapus
        </button>

      </td>

    </tr>

  `).join("");
});

/* =====================================================
   TOGGLE AKTIF / NONAKTIF (FIX UTAMA)
===================================================== */
window.toggleGuru = async (id, status) => {

  try {

    console.log("UPDATE:", id, status);

    const ref = doc(db, "guru", id);

    await updateDoc(ref, {
      aktif: status
    });

    console.log("BERHASIL");

    showNotif(
      status
        ? "Guru diaktifkan ✅"
        : "Guru dinonaktifkan ⛔"
    );

  } catch (err) {

    console.error("ERROR FIRESTORE:", err);

    showNotif(
      err.message || "Gagal update",
      "#dc2626"
    );
  }
};

/* =====================================================
   HAPUS GURU (REAL DELETE)
===================================================== */
window.hapusGuru = async (id) => {

  const ok = await confirmCustom("Hapus guru ini?");
  if (!ok) return;

  await deleteDoc(doc(db, "guru", id));

  showNotif("Guru dihapus ❌", "#dc2626");
};

/* =====================================================
   INIT
===================================================== */
initMapel();