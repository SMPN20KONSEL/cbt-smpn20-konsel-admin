import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const soalSelect = document.getElementById("soalSelect");
const list = document.getElementById("list");
const btnBuat = document.getElementById("btnBuat");

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
      alert("❗ Lengkapi semua data");
      return;
    }

    // 🔒 CEK AGAR BANK SOAL TIDAK DIPAKAI DOBEL
    const cek = await getDocs(
      query(
        collection(db, "jadwal_ujian"),
        where("bankSoalId", "==", bankSoalId)
      )
    );

    if (!cek.empty) {
      alert("❌ Jadwal ujian untuk bank soal ini sudah ada");
      return;
    }

    // Ambil data bank soal
    const soalSnap = await getDoc(doc(db, "bank_soal", bankSoalId));
    if (!soalSnap.exists()) {
      alert("❌ Bank soal tidak ditemukan");
      return;
    }

    const s = soalSnap.data();
    const kode = generateKode();

    // 1️⃣ SIMPAN JADWAL (ID DOKUMEN = KODE UJIAN)
    await setDoc(doc(db, "jadwal_ujian", kode), {
      bankSoalId,
      judul: s.judul,
      mapel: s.mapel,
      kelas: s.kelas,
      kode,
      durasi,
      aktif: true,
      createdAt: serverTimestamp()
    });
    alert(`✅ Jadwal ujian berhasil dibuat\nKode Ujian: ${kode}`);
    loadJadwal();

  } catch (err) {
    console.error("ERROR BUAT UJIAN:", err);
    alert("❌ Gagal membuat jadwal\n" + err.message);
  }
}

/* ================= LOAD JADWAL ================= */
async function loadJadwal() {
  list.innerHTML = "";
  const snap = await getDocs(collection(db, "jadwal_ujian"));

  snap.forEach(d => {
    const u = d.data();
    list.innerHTML += `
      <tr>
        <td>${u.judul}</td>
        <td>${u.mapel}</td>
        <td>${u.kelas}</td>
        <td><b>${u.kode}</b></td>
        <td>${u.durasi} menit</td>
        <td>${u.aktif ? "Aktif" : "Nonaktif"}</td>
      </tr>
    `;
  });
}

/* ================= INIT ================= */
btnBuat.addEventListener("click", buatUjian);
loadBankSoal();
loadJadwal();
