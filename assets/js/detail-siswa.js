import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ===============================
   GET ID
================================ */
const id = new URLSearchParams(location.search).get("id");

/* ===============================
   ELEMENT
================================ */
const info = document.getElementById("info");
const status = document.getElementById("status");
const progress = document.getElementById("progress");
const pelanggaran = document.getElementById("pelanggaran");

/* ===============================
   FORMAT ROW
================================ */
function row(label, value) {
  return `
    <div class="info-row">
      <div class="info-label">${label}</div>
      <div class="info-separator">:</div>
      <div class="info-value">${value ?? "-"}</div>
    </div>
  `;
}

/* ===============================
   LOAD
================================ */
async function load() {

  if (!id) {
    info.innerHTML = "❌ ID tidak ditemukan";
    return;
  }

  info.innerHTML = "Loading...";

  try {

    const snap = await getDoc(doc(db, "peserta", id));

    if (!snap.exists()) {
      info.innerHTML = "❌ Data tidak ditemukan";
      return;
    }

    const d = snap.data();

    /* ===========================
       INFO SISWA
    =========================== */
    info.innerHTML =
      row("Nama", d.nama) +
      row("Email", d.email) +
      row("Kelas", d.kelas) +
      row("Kode Ujian", d.kodeUjian);

    /* ===========================
       STATUS
    =========================== */
    status.innerHTML =
      `<h3>📊 Status Ujian</h3>` +
      row("Status", `<b>${d.status || "-"}</b>`) +
      row("Login", d.loginAt ? d.loginAt.toDate().toLocaleString("id-ID") : "-") +
      row("Online", d.lastOnline ? d.lastOnline.toDate().toLocaleString("id-ID") : "-");

    /* ===========================
       PROGRESS
    =========================== */
    progress.innerHTML =
      `<h3>📈 Progress</h3>` +
      row("Soal dikerjakan", d.jumlahJawaban || 0) +
      row("Status ujian", d.status || "-");

    /* ===========================
       PELANGGARAN
    =========================== */
    let terakhir = "-";

    if (Array.isArray(d.catatanPelanggaran) && d.catatanPelanggaran.length > 0) {
      const last = d.catatanPelanggaran[d.catatanPelanggaran.length - 1];

      const waktu = last.waktu
        ? new Date(last.waktu).toLocaleString("id-ID")
        : "-";

      terakhir = `
        ${last.pesan || "-"} <br>
        <small>${waktu}</small>
      `;
    }

    const jumlah = d.jumlahPelanggaran || 0;
    const warna = jumlah >= 3 ? "red" : "black";

    pelanggaran.innerHTML =
      `<h3>⚠ Pelanggaran</h3>` +
      row("Jumlah", `<span style="color:${warna}"><b>${jumlah}</b></span>`) +
      row("Terakhir", terakhir);

  } catch (err) {
    console.error(err);
    info.innerHTML = "❌ Error mengambil data";
  }
}

load();