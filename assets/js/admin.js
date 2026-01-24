// ===============================
// FIREBASE & IMPORT
// ===============================
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ===============================
// TAMPILKAN ROLE DI TOPBAR
// ===============================
const cNama = document.getElementById("c-nama");
const role = sessionStorage.getItem("role"); // 'admin' atau 'guru'

switch (role) {
  case "admin":
    cNama.innerText = "Admin";
    break;
  case "guru":
    cNama.innerText = "Guru";
    break;
  default:
    cNama.innerText = "User";
}

// ===============================
// LIHAT NILAI
// ===============================
window.lihatNilai = async function() {
  try {
    const q = await getDocs(collection(db, "jawaban"));
    q.forEach(doc => console.log(doc.id, doc.data()));
  } catch (err) {
    console.error("Gagal mengambil nilai:", err);
  }
};

// ===============================
// LIHAT PELANGGARAN
// ===============================
window.lihatPelanggaran = async function() {
  try {
    const p = await getDocs(collection(db, "pelanggaran"));
    p.forEach(doc => console.log(doc.id, doc.data()));
  } catch (err) {
    console.error("Gagal mengambil pelanggaran:", err);
  }
};

// ===============================
// EXPORT EXCEL DARI FIREBASE
// ===============================
window.exportExcelFirebase = async function() {
  try {
    const data = [];
    const snap = await getDocs(collection(db, "nilai"));
    snap.forEach(doc => data.push(doc.data()));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Nilai Ujian");
    XLSX.writeFile(wb, "hasil_ujian.xlsx");
  } catch (err) {
    console.error("Gagal export Excel:", err);
    alert("Gagal export Excel");
  }
};

// ===============================
// EXPORT EXCEL DARI TABLE HTML
// ===============================
window.exportExcelTable = function() {
  const table = document.getElementById("tabelNilai");
  if (!table) return alert("Tabel tidak ditemukan");

  const url = 'data:application/vnd.ms-excel,' + encodeURIComponent(table.outerHTML);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nilai-ujian.xls";
  a.click();
};

// ===============================
// GENERATE TOKEN UJIAN
// ===============================
function generateToken() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

window.buatToken = async () => {
  try {
    const token = generateToken();
    await setDoc(doc(db, "token_ujian", "aktif"), {
      token,
      mulai: "07:30",
      selesai: "09:00",
      dibuat: new Date()
    });
    alert("Token aktif: " + token);
  } catch (err) {
    console.error("Gagal membuat token:", err);
    alert("Gagal membuat token");
  }
};

// ===============================
// LOAD KARTU SISWA
// ===============================
window.loadKartu = async (uid) => {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return alert("Data siswa tidak ditemukan");

    const data = snap.data();
    document.getElementById("nama").innerText = "Nama: " + data.nama;
    document.getElementById("kelas").innerText = "Kelas: " + data.kelas;

    JsBarcode("#barcode", data.nis, {
      format: "CODE128",
      width: 2,
      height: 60
    });
  } catch (err) {
    console.error("Gagal load kartu:", err);
    alert("Gagal load kartu");
  }
};
