import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= SESSION =================
const guruUid = sessionStorage.getItem("uid");
const role = sessionStorage.getItem("role");

if (!guruUid || role !== "guru") {
  alert("Akses ditolak / session habis");
  location.href = "../login.html";
}

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

// ================= FORMAT NILAI =================
const formatNilai = (n) => {
  if (isNaN(n)) return 0;
  return Number.isInteger(n) ? n : parseFloat(n.toFixed(2));
};

// ================= LOAD DATA =================
async function loadNilai() {
  semuaNilai = [];
  list.innerHTML = "";

  filterMapel.innerHTML = `<option value="">Semua Mapel</option>`;
  filterKelas.innerHTML = `<option value="">Semua Kelas</option>`;
  filterJudul.innerHTML = `<option value="">Semua Judul</option>`;

  // 🔥 FILTER BERDASARKAN GURU LOGIN
  const q = query(
    collection(db, "jawaban_siswa"),
    where("guruId", "==", guruUid)
  );

  const snap = await getDocs(q);

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
}

// ================= TAMPILKAN =================
function tampilkan(data) {
  list.innerHTML = "";
  infoRekap.textContent = "";

  if (!data || data.length === 0) {
    list.innerHTML = `
      <tr><td colspan="8" style="text-align:center">Data tidak ditemukan</td></tr>`;
    return;
  }

  // SORT terbaru
  data.sort((a, b) => {
    if (!a.waktu_mulai || !b.waktu_mulai) return 0;
    return b.waktu_mulai.seconds - a.waktu_mulai.seconds;
  });

  const today = new Date();
  today.setHours(0,0,0,0);

  let lastTanggal = "";
  let totalSemua = 0;

  data.forEach((n, i) => {

    const pg = Math.round(Number(n.nilaiPG || 0));

    const essay = Number(
      n.nilaiEssayNormal ??
      n.nilaiEssay ??
      0
    );

    const totalNilai = Number(
      n.nilaiTotal ??
      n.totalNilai ??
      0
    );

    totalSemua += totalNilai;

    // ===== FORMAT TANGGAL =====
    let formatTanggal = "-";
    let isToday = false;

    if (n.waktu_mulai) {
      const tgl = n.waktu_mulai.toDate();

      const tglOnly = new Date(tgl);
      tglOnly.setHours(0,0,0,0);

      formatTanggal = tglOnly.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });

      isToday = tglOnly.getTime() === today.getTime();

      if (!isToday && lastTanggal !== formatTanggal) {
        list.innerHTML += `
          <tr>
            <td colspan="8" style="font-weight:bold; background:#f5f5f5;">
              ${formatTanggal}
            </td>
          </tr>
        `;
        lastTanggal = formatTanggal;
      }
    }

    // ===== RENDER =====
    list.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${n.namaSiswa || "-"}</td>
        <td>${n.kelas || "-"}</td>
        <td>${n.mapel || "-"}</td>
        <td>${n.judulUjian || "-"}</td>
        <td>${pg}</td>
        <td>${formatNilai(essay)}</td>
        <td><b>${formatNilai(totalNilai)}</b></td>
      </tr>
    `;
  });

  const rata =
    data.length > 0 ? formatNilai(totalSemua / data.length) : 0;

  infoRekap.textContent =
    `Jumlah siswa: ${data.length} | Rata-rata nilai: ${rata}`;
}

// ================= FILTER =================
btnFilter.onclick = () => {
  const mapel = filterMapel.value;
  const kelas = filterKelas.value;
  const judul = filterJudul.value;

  const hasil = semuaNilai.filter(n =>
    (!mapel || n.mapel === mapel) &&
    (!kelas || n.kelas === kelas) &&
    (!judul || n.judulUjian === judul)
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
  const mapel = filterMapel.value;
  if (!mapel) return alert("Pilih mapel terlebih dahulu");

  const data = semuaNilai
    .filter(n => n.mapel === mapel)
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

  XLSX.writeFile(wb, `Rekap_Nilai_${mapel}.xlsx`);
};

// ================= INIT =================
loadNilai();