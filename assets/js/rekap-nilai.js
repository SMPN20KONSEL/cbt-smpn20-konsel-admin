import { db } from "./firebase.js";
import { collection, getDocs }
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const list = document.getElementById("list");
const filterMapel = document.getElementById("filterMapel");
const filterKelas = document.getElementById("filterKelas");
const btnFilter = document.getElementById("btnFilter");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");
const infoRekap = document.getElementById("infoRekap");

let semuaNilai = [];

// ================= LOAD DATA =================
async function loadNilai() {
  semuaNilai = [];
  list.innerHTML = "";
  filterMapel.innerHTML = `<option value="">Semua Mapel</option>`;
  filterKelas.innerHTML = `<option value="">Semua Kelas</option>`;

  const snap = await getDocs(collection(db, "jawaban_siswa"));

  const mapelSet = new Set();
  const kelasSet = new Set();

  snap.forEach(docSnap => {
    const d = docSnap.data();
    semuaNilai.push(d);

    if (d.mapel) mapelSet.add(d.mapel);
    if (d.kelas) kelasSet.add(d.kelas);
  });

  mapelSet.forEach(m => {
    filterMapel.innerHTML += `<option value="${m}">${m}</option>`;
  });

  kelasSet.forEach(k => {
    filterKelas.innerHTML += `<option value="${k}">${k}</option>`;
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

  let total = 0;

  data.forEach((n, i) => {
    const pg = Number(n.nilaiPG || 0);
    const essay = Number(n.nilaiEssay || 0);
    const totalNilai = Number(n.nilaiTotal || 0);
    total += totalNilai;

    list.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${n.namaSiswa || "-"}</td>
        <td>${n.kelas || "-"}</td>
        <td>${n.mapel || "-"}</td>
        <td>${n.judulUjian || "-"}</td>
        <td>${pg}</td>
        <td>${essay}</td>
        <td><b>${totalNilai}</b></td>
      </tr>`;
  });

  infoRekap.textContent =
    `Jumlah siswa: ${data.length} | Rata-rata nilai: ${(total / data.length).toFixed(2)}`;
}

// ================= FILTER =================
btnFilter.onclick = () => {
  const mapel = filterMapel.value;
  const kelas = filterKelas.value;

  const hasil = semuaNilai.filter(n =>
    (!mapel || n.mapel === mapel) &&
    (!kelas || n.kelas === kelas)
  );

  tampilkan(hasil);
};

// ================= RESET =================
btnReset.onclick = () => {
  filterMapel.value = "";
  filterKelas.value = "";
  tampilkan(semuaNilai);
};

// ================= EXPORT EXCEL =================
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
      PG: n.nilaiPG || 0,
      Essay: n.nilaiEssay || 0,
      Total: n.nilaiTotal || 0
    }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
  XLSX.writeFile(wb, `Rekap_Nilai_${mapel}.xlsx`);
};

// ================= INIT =================
loadNilai();