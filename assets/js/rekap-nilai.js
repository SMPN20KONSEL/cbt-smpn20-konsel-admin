import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ================= ELEMENT =================
document.addEventListener("DOMContentLoaded", () => {

  const list = document.getElementById("list");
  const filterMapel = document.getElementById("filterMapel");
  const filterJudul = document.getElementById("filterJudul");
  const filterKelas = document.getElementById("filterKelas");

  const btnFilter = document.getElementById("btnFilter");
  const btnReset = document.getElementById("btnReset");
  const btnExport = document.getElementById("btnExport");
  const infoRekap = document.getElementById("infoRekap");

  let semuaNilai = [];

  // ================= FORMAT =================
  const formatNilai = (n) => {
    if (isNaN(n)) return 0;
    return Number.isInteger(n) ? n : parseFloat(n.toFixed(2));
  };

  // ================= LOAD DATA =================
  async function loadNilai() {

    semuaNilai = [];
    list.innerHTML = `<tr><td colspan="8">Loading...</td></tr>`;

    filterMapel.innerHTML = `<option value="">Semua Mapel</option>`;
    filterKelas.innerHTML = `<option value="">Semua Kelas</option>`;
    filterJudul.innerHTML = `<option value="">Semua Judul</option>`;

    try {

      const snap = await getDocs(collection(db, "jawaban_siswa"));

      if (snap.empty) {
        list.innerHTML = `<tr><td colspan="8">❌ Tidak ada data</td></tr>`;
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

  // ================= FILTER FUNCTION =================
  function getFilteredData() {
    return semuaNilai.filter(n =>
      (!filterMapel.value || n.mapel === filterMapel.value) &&
      (!filterKelas.value || n.kelas === filterKelas.value) &&
      (!filterJudul.value || n.judulUjian === filterJudul.value)
    );
  }

  // ================= TAMPILKAN =================
  function tampilkan(data) {

    list.innerHTML = "";
    infoRekap.textContent = "";

    if (!data.length) {
      list.innerHTML = `<tr><td colspan="8">Data tidak ditemukan</td></tr>`;
      return;
    }

    data.sort((a, b) => {
      const aTime = a.waktu_mulai?.seconds || 0;
      const bTime = b.waktu_mulai?.seconds || 0;
      return bTime - aTime;
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

  // ================= FILTER BUTTON =================
  btnFilter.addEventListener("click", () => {
    tampilkan(getFilteredData());
  });

  // ================= RESET =================
  btnReset.addEventListener("click", () => {
    filterMapel.value = "";
    filterKelas.value = "";
    filterJudul.value = "";
    tampilkan(semuaNilai);
  });

  // ================= EXPORT CSV =================
btnExport.addEventListener("click", () => {

  const data = getFilteredData();

  if (!data.length) {
    alert("Tidak ada data untuk diexport");
    return;
  }

  // ================= DATA =================
  const rows = data.map((n, i) => ([
    i + 1,
    n.namaSiswa || "-",
    n.kelas || "-",
    n.mapel || "-",
    n.judulUjian || "-",
    Math.round(Number(n.nilaiPG || 0)),
    Number(n.nilaiEssayNormal ?? n.nilaiEssay ?? 0),
    Number(n.nilaiTotal ?? n.totalNilai ?? 0)
  ]));

  // ================= HEADER KOLOM =================
  const header = [
    ["DAFTAR NILAI SISWA"], // JUDUL BESAR
    [], // kosong 1 baris
    ["No", "Nama", "Kelas", "Mapel", "Judul Ujian", "Nilai PG", "Nilai Essay", "Nilai Total"]
  ];

  // gabungkan header + data
  const finalData = [...header, ...rows];

  // ================= SHEET =================
  const ws = XLSX.utils.aoa_to_sheet(finalData);

  // ================= LEBAR KOLOM =================
  ws["!cols"] = [
    { wch: 5 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 }
  ];

  // ================= MERGE JUDUL =================
  ws["!merges"] = [
    {
      s: { r: 0, c: 0 },
      e: { r: 0, c: 7 }
    }
  ];

  // ================= WORKBOOK =================
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Daftar Nilai");

  // ================= DOWNLOAD =================
  XLSX.writeFile(wb, "DAFTAR_NILAI_SISWA.xlsx");
});

  // ================= INIT =================
  loadNilai();

});