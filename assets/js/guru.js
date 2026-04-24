/* ===============================
   FIREBASE CORE
================================ */
import { app, db } from "./firebase.js";

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser,
  signOut
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

/* ===============================
   SECONDARY AUTH (KHUSUS GURU)
================================ */
const secondaryApp  = initializeApp(app.options, "secondary-guru");
const secondaryAuth = getAuth(secondaryApp);

/* ===============================
   ELEMENT
================================ */
const namaInput  = document.getElementById("nama");
const mapelInput = document.getElementById("mapel");
const list       = document.getElementById("list");
/* ===============================
   LIST MAPEL SMP
================================ */
const daftarMapelSMP = [
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
  "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
  "Prakarya",
  "Informatika",

  "Bahasa Daerah",
  "Muatan Lokal"
];

/* ===============================
   INIT DROPDOWN MAPEL
================================ */
function initMapel() {
  mapelInput.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "-- Pilih Mapel --";
  mapelInput.appendChild(defaultOpt);

  daftarMapelSMP.forEach(mapel => {
    const opt = document.createElement("option");
    opt.value = mapel;
    opt.textContent = mapel;
    mapelInput.appendChild(opt);
  });
}
/* ===============================
   LOADING HELPER
================================ */
function setLoading(btn, state) {
  if (!btn) return;

  const text = document.getElementById("textBtn");
  btn.disabled = state;

  text.innerHTML = state
    ? '<i class="fa fa-spinner fa-spin"></i> Proses...'
    : 'Tambah Guru';
}


/* ===============================
   PARSE NAMA (GELAR)
================================ */
function parseNamaLengkap(input) {
  let clean = input
    .toLowerCase()
    .replace(/,/g, " , ")
    .replace(/\./g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = clean.split(" ");

  const depan = [];
  const nama = [];
  const belakang = [];

  let mode = "nama";

  parts.forEach((p, i) => {
    const word = p.trim();
    if (!word) return;

    // ===== GELAR DEPAN =====
    if (
      ["dr", "drs", "h", "hj", "ir"].includes(word)
    ) {
      depan.push(formatGelar(word));
      return;
    }

    // ===== GELAR BELAKANG =====
    if (
      word.includes(".") ||
      ["spd","mpd","skom","mkom","gr"].includes(word)
    ) {
      belakang.push(formatGelar(word));
      mode = "belakang";
      return;
    }

    // ===== NAMA =====
    if (mode === "nama") {
      nama.push(word);
    }
  });

  const namaFix = nama
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const depanFix = depan.join(" ");
  const belakangFix = belakang.join(", ");

  return {
    namaDepan: depanFix,
    nama: namaFix,
    namaBelakang: belakangFix,
    full: [
      depanFix,
      namaFix,
      belakangFix ? ", " + belakangFix : ""
    ].join("").trim()
  };
}

// ================= FORMAT GELAR =================
function formatGelar(g) {
  g = g.replace(/\./g, "").toLowerCase();

  const map = {
    dr: "Dr.",
    drs: "Drs.",
    h: "H.",
    hj: "Hj.",
    ir: "Ir.",
    spd: "S.Pd.",
    mpd: "M.Pd.",
    skom: "S.Kom.",
    mkom: "M.Kom.",
    gr: "Gr."
  };

  return map[g] || g.toUpperCase();
}

/* ===============================
   GENERATE AKUN
================================ */
function generateAkun(namaDasar) {
  const angka = Math.floor(10 + Math.random() * 90);
  const clean = namaDasar.toLowerCase().replace(/[^a-z]/g, "");

  return {
    email: `${clean}${angka}@smp.belajar.id`,
    password: clean.slice(0, 4) + angka
  };
}

/* ===============================
   TOTAL GURU
================================ */
function updateTotalGuru(data) {
  document.getElementById("totalGuru").innerText =
    "Total: " + data.length + " guru";
}

/* ===============================
   TAMBAH GURU
================================ */
window.tambahGuru = async () => {
  if (!namaInput.value || !mapelInput.value)
    return alert("Lengkapi data guru");

  const parsed = parseNamaLengkap(namaInput.value); // ✅ FIX
  const mapel = mapelInput.value;

  const akun = generateAkun(parsed.full); // ✅ FIX

  await setDoc(doc(db, "guru", akun.email), {
    nama: parsed.full,
    mapel,
    email: akun.email,
    password: akun.password,
    aktif: false,
    createdAt: new Date(),
    deletedAt: null
  });

  namaInput.value = "";
  mapelInput.value = "";

  loadGuru();
};

/* ===============================
   AKTIFKAN GURU
================================ */
window.aktifkanGuru = async (id, btn) => {
  setLoading(btn, true);

  try {
    const ref = doc(db, "guru", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw "Data guru tidak ditemukan";
    const g = snap.data();

    if (g.aktif) throw "Akun sudah aktif";

    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      g.email,
      g.password
    );

    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      nama: g.nama,
      email: g.email,
      role: "guru",
      createdAt: new Date()
    });

    await updateDoc(ref, { aktif: true, deletedAt: null });

    await signOut(secondaryAuth);
    alert("Akun guru berhasil diaktifkan ✅");

    loadGuru();

  } catch (err) {
    alert("Gagal aktivasi ❌\n" + err);
  }
};

/* ===============================
   NONAKTIFKAN GURU
================================ */
window.nonaktifkanGuru = async (id, btn) => {
  if (!confirm("Nonaktifkan akun guru ini?")) return;

  setLoading(btn, true);

  try {
    const ref = doc(db, "guru", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw "Data guru tidak ditemukan";
    const g = snap.data();

    const cred = await signInWithEmailAndPassword(
      secondaryAuth,
      g.email,
      g.password
    );

    await deleteUser(cred.user);

    const usersSnap = await getDocs(collection(db, "users"));
    for (const d of usersSnap.docs) {
      if (d.data().email === g.email) {
        await deleteDoc(d.ref);
      }
    }

    await updateDoc(ref, {
      aktif: false,
      deletedAt: new Date()
    });

    await signOut(secondaryAuth);
    alert("Akun guru dinonaktifkan 🗑️");

    loadGuru();

  } catch (err) {
    alert("Gagal nonaktif ❌\n" + err.message);
  }
};

/* ===============================
   LOAD DATA
================================ */
async function loadGuru() {
  const snap = await getDocs(collection(db, "guru"));
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 🔥 FILTER DULU
  const filtered = data
    .filter(g => !g.deletedAt || g.aktif)
    .sort((a, b) => a.nama.localeCompare(b.nama));

  // 🔥 UPDATE TOTAL (BENAR)
  updateTotalGuru(filtered);

  list.innerHTML = "";

  filtered.forEach((g, i) => {
    list.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${g.nama}${g.gelar ? ", " + g.gelar : ""}</td>
        <td>${g.mapel}</td>
        <td>${g.email}</td>
        <td>${g.password ?? "-"}</td>
        <td>${g.aktif ? "✅ Aktif" : "❌ Nonaktif"}</td>
        <td>
  ${
    g.aktif
      ? `<button onclick="nonaktifkanGuru('${g.id}', this)">Nonaktifkan</button>`
      : `<button onclick="aktifkanGuru('${g.id}', this)">Aktifkan</button>`
  }
  <button style="background:red;color:white"
    onclick="hapusGuru('${g.id}', this)">
    Hapus
  </button>
</td>
      </tr>
    `;
  });
}
window.hapusGuru = async (id, btn) => {
  if (!confirm("Hapus guru ini permanen?")) return;

  setLoading(btn, true);

  try {
    const ref = doc(db, "guru", id);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw "Data guru tidak ditemukan";
    const g = snap.data();

    // 🔥 HAPUS USERS COLLECTION
    const usersSnap = await getDocs(collection(db, "users"));

    for (const d of usersSnap.docs) {
      if (d.data().email === g.email) {
        await deleteDoc(d.ref);
      }
    }

    // 🔥 HAPUS DATA GURU
    await deleteDoc(ref);

    alert("Guru berhasil dihapus (tanpa Auth)");

    loadGuru();

  } catch (err) {
    alert("Gagal hapus ❌\n" + err.message);
  }

  setLoading(btn, false);
};
/* ===============================
   INIT
================================ */
initMapel();
loadGuru();