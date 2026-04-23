import { db } from "./firebase.js";
import { auth } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const soalSelect = document.getElementById("soalSelect");
const list = document.getElementById("list");
const btnBuat = document.getElementById("btnBuat");

let loadingToggle = false;

/* ================= GENERATE KODE ================= */
function generateKode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ================= LOAD BANK SOAL ================= */
async function loadBankSoal() {
  soalSelect.innerHTML = `<option value="">-- Pilih Bank Soal --</option>`;
  const snap = await getDocs(collection(db, "bank_soal"));

  snap.forEach(d => {
    const s = d.data();
    soalSelect.innerHTML += `
      <option value="${d.id}">
        ${s.judul} • ${s.mapel} • Kelas ${s.kelas}
      </option>
    `;
  });
}

/* ================= BUAT JADWAL UJIAN ================= */
async function buatUjian() {
  try {
    const bankSoalId = soalSelect.value;
    const durasi = Number(document.getElementById("durasi").value);

    if (!bankSoalId || !durasi) {
      tampilkanToast("❗ Lengkapi semua data", "red");
      return;
    }

    // 🔒 CEK AGAR BANK SOAL TIDAK DIPAKAI DOBEL
    const cek = await getDocs(
  query(
    collection(db, "jadwal_ujian"),
    where("bankSoalId", "==", bankSoalId),
    where("aktif", "==", true) // 🔥 hanya cek yang aktif
  )
);

if (!cek.empty) {
  tampilkanToast("❌ Bank soal masih dipakai", "red");
  return;
}

    // Ambil data bank soal
    const soalSnap = await getDoc(doc(db, "bank_soal", bankSoalId));
    if (!soalSnap.exists()) {
      tampilkanToast("❌ Bank soal tidak ditemukan", "red");
      return;
    }

const s = soalSnap.data();
const kode = generateKode();

await setDoc(doc(db, "jadwal_ujian", kode), {
  bankSoalId,
  judul: s.judul,
  mapel: s.mapel,
  kelas: s.kelas,
  kode,
  durasi,
  aktif: true,

  // ✅ AMBIL DARI BANK SOAL
  guruId: s.guruId || "",

  createdAt: serverTimestamp()
});

    tampilkanToast(`✅ Ujian dibuat | Kode: ${kode}`);
    loadJadwal();

  } catch (err) {
    console.error(err);
    tampilkanToast("❌ Gagal membuat jadwal", "red");
  }
}

/* ================= TOGGLE STATUS ================= */
async function toggleStatus(kode, statusSekarang) {
  if (loadingToggle) return;
  loadingToggle = true;

  const konfirmasi = confirm(
    statusSekarang
      ? "Nonaktifkan jadwal ini?"
      : "Aktifkan kembali jadwal ini?"
  );

  if (!konfirmasi) {
    loadingToggle = false;
    return;
  }

  try {
    await updateDoc(doc(db, "jadwal_ujian", kode), {
      aktif: !statusSekarang
    });

    loadJadwal();
  } catch (err) {
    alert("❌ Gagal update status");
    console.error(err);
  }

  loadingToggle = false;
}

// 👉 WAJIB untuk onclick HTML
window.toggleStatus = toggleStatus;

/* ================= LOAD JADWAL ================= */
async function loadJadwal() {
  list.innerHTML = "";

  const snap = await getDocs(collection(db, "jadwal_ujian"));

  const data = [];
  snap.forEach(d => data.push(d.data()));

  // SORT TERBARU
  data.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return b.createdAt.seconds - a.createdAt.seconds;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let lastTanggal = "";

  data.forEach(u => {
    if (!u.createdAt) return;

    const tgl = u.createdAt.toDate();
    const tglOnly = new Date(tgl);
    tglOnly.setHours(0, 0, 0, 0);

    const formatTanggal = tglOnly.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const isToday = tglOnly.getTime() === today.getTime();

    // HEADER TANGGAL (selain hari ini)
    if (!isToday && lastTanggal !== formatTanggal) {
      list.innerHTML += `
        <tr>
          <td colspan="6" style="font-weight:bold; background:#f5f5f5;">
            ${formatTanggal}
          </td>
        </tr>
      `;
      lastTanggal = formatTanggal;
    }

    // ROW DATA
    list.innerHTML += `
      <tr>
        <td>${u.judul}</td>
        <td>${u.mapel}</td>
        <td>${u.kelas}</td>
        <td><b>${u.kode}</b></td>
        <td>${u.durasi} menit</td>
        <td 
          style="
            cursor:pointer;
            color:white;
            background:${u.aktif ? 'green' : 'red'};
            text-align:center;
            border-radius:6px;
            padding:4px;
          "
          onclick="toggleStatus('${u.kode}', ${u.aktif})"
        >
          ${u.aktif ? "Aktif" : "Nonaktif"}
        </td>
      </tr>
    `;
  });
}
function tampilkanToast(pesan, warna = "green") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = pesan;

  // warna dinamis
  if (warna === "red") toast.style.background = "#dc2626";
  if (warna === "yellow") toast.style.background = "#f59e0b";

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}
/* ================= INIT ================= */
btnBuat.addEventListener("click", buatUjian);
loadBankSoal();
loadJadwal();