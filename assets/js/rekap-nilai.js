import { db } from "./firebase.js";
import {
  collection,
  getDocs
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

// ================= FORMAT NILAI =================
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

    console.log("TOTAL DATA:", snap.size);

    if (snap.empty) {
      list.innerHTML = `
        <tr><td colspan="8" style="text-align:center">
          ❌ Tidak ada data di Firestore
        </td></tr>`;
      return;
    }

    const mapelSet = new Set();
    const kelasSet = new Set();
    const judulSet = new Set();

    snap.forEach(docSnap => {
      const d = docSnap.data();

      console.log("DATA:", d); // DEBUG

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

  // SORT AMAN
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

// ================= INIT =================
loadNilai();