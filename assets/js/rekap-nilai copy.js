import { auth, db } from "./firebase.js";
import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";


// ================= ELEMENT =================
const list = document.getElementById("list");
const filterMapel = document.getElementById("filterMapel");
const filterJudul = document.getElementById("filterJudul");
const filterKelas = document.getElementById("filterKelas");
const btnFilter = document.getElementById("btnFilter");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");
const infoRekap = document.getElementById("infoRekap");

let semuaNilai = [];
let currentGuruUid = null;


// ================= AUTH GUARD =================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    alert("Session login hilang, silakan login ulang");
    location.href = "../login.html";
    return;
  }

  const role = localStorage.getItem("role");

  if (role !== "guru") {
    alert("Akun ini bukan guru");
    location.href = "../login.html";
    return;
  }

  currentGuruUid = user.uid;

  // 🔥 LOAD DATA SETELAH LOGIN SIAP
  await loadNilai(currentGuruUid);
});


// ================= FORMAT NILAI =================
const formatNilai = (n) => {
  if (isNaN(n)) return 0;
  return Number.isInteger(n) ? n : parseFloat(n.toFixed(2));
};


// ================= LOAD DATA =================
async function loadNilai(guruUid) {

  semuaNilai = [];
  list.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;

  filterMapel.innerHTML = `<option value="">Semua Mapel</option>`;
  filterKelas.innerHTML = `<option value="">Semua Kelas</option>`;
  filterJudul.innerHTML = `<option value="">Semua Judul</option>`;

  try {

    const q = query(
      collection(db, "jawaban_siswa"),
      where("guruId", "==", guruUid)
    );

    const snap = await getDocs(q);

    // ❗ DEBUG PENTING
    console.log("Total data:", snap.size);

    if (snap.empty) {
      list.innerHTML = `
        <tr><td colspan="8" style="text-align:center">
          ❌ Tidak ada data untuk guru ini
        </td></tr>`;
      return;
    }

    const mapelSet = new Set();
    const kelasSet = new Set();
    const judulSet = new Set();

    snap.forEach(docSnap => {
      const d = docSnap.data();

      semuaNilai.push(d);

      if (d.mapel) mapelSet.add(d.mapel);
      if (d.kelas) kelasSet.add(d.kelas);
      if (d.judulUjian) judulSet.add(d.judulUjian);
    });

    // isi filter
    mapelSet.forEach(m => {
      filterMapel.innerHTML += `<option value="${m}">${m}</option>`;
    });

    kelasSet.forEach(k => {
      filterKelas.innerHTML += `<option value="${k}">${k}</option>`;
    });

    judulSet.forEach(j => {
      filterJudul.innerHTML += `<option value="${j}">${j}</option>`;
    });

    tampilkan(semuaNilai);

  } catch (err) {
    console.error(err);
    list.innerHTML = `<tr><td colspan="8">❌ Error load data</td></tr>`;
  }
}


// ================= TAMPILKAN =================
function tampilkan(data) {

  list.innerHTML = "";
  infoRekap.textContent = "";

  if (!data.length) {
    list.innerHTML = `
      <tr><td colspan="8" style="text-align:center">
        Data tidak ditemukan
      </td></tr>`;
    return;
  }

  data.sort((a, b) => {
    if (!a.waktu_mulai || !b.waktu_mulai) return 0;
    return b.waktu_mulai.seconds - a.waktu_mulai.seconds;
  });

  let totalSemua = 0;

  data.forEach((n, i) => {

    const pg = Math.round(Number(n.nilaiPG || 0));
    const essay = Number(n.nilaiEssayNormal ?? n.nilaiEssay ?? 0);
    const total = Number(n.nilaiTotal ?? n.totalNilai ?? 0);

    totalSemua += total;

    list.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${n.namaSiswa || "-"}</td>
        <td>${n.kelas || "-"}</td>
        <td>${n.mapel || "-"}</td>
        <td>${n.judulUjian || "-"}</td>
        <td>${pg}</td>
        <td>${formatNilai(essay)}</td>
        <td><b>${formatNilai(total)}</b></td>
      </tr>
    `;
  });

  const rata = formatNilai(totalSemua / data.length);

  infoRekap.textContent =
    `Jumlah siswa: ${data.length} | Rata-rata nilai: ${rata}`;
}


// ================= FILTER =================
btnFilter.onclick = () => {

  const hasil = semuaNilai.filter(n =>
    (!filterMapel.value || n.mapel === filterMapel.value) &&
    (!filterKelas.value || n.kelas === filterKelas.value) &&
    (!filterJudul.value || n.judulUjian === filterJudul.value)
  );

  tampilkan(hasil);
};


// ================= RESET =================
btnReset.onclick = () => {
  filterMapel.value = "";
  filterKelas.value = "";
  filterJudul.value = "";
  tampilkan(semuaNilai);
};


// ================= EXPORT =================
btnExport.onclick = () => {

  if (!filterMapel.value)
    return alert("Pilih mapel terlebih dahulu");

  const data = semuaNilai
    .filter(n => n.mapel === filterMapel.value)
    .map((n, i) => ({
      No: i + 1,
      Nama: n.namaSiswa,
      Kelas: n.kelas,
      Mapel: n.mapel,
      Ujian: n.judulUjian,
      PG: Math.round(Number(n.nilaiPG || 0)),
      Essay: formatNilai(Number(n.nilaiEssayNormal ?? n.nilaiEssay ?? 0)),
      Total: formatNilai(Number(n.nilaiTotal ?? n.totalNilai ?? 0))
    }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");

  XLSX.writeFile(wb, `Rekap_Nilai_${filterMapel.value}.xlsx`);
};