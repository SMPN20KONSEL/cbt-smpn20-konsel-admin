import { db } from "./firebase.js";
import { collection, onSnapshot } 
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ================= TOTAL SISWA ================= */
onSnapshot(collection(db, "siswa"), (snapshot) => {
  document.getElementById("totalSiswa").innerText = snapshot.size;
});

/* ================= TOTAL UJIAN ================= */
onSnapshot(collection(db, "ujian"), (snapshot) => {
  document.getElementById("totalUjian").innerText = snapshot.size;
});

/* ================= MONITORING REALTIME ================= */
const table = document.getElementById("monitoringTable");

onSnapshot(collection(db, "absensi_ujian"), (snapshot) => {
  table.innerHTML = "";

  snapshot.forEach((doc) => {
    const data = doc.data();

    table.innerHTML += `
      <tr>
        <td>${data.nama}</td>
        <td>${data.kelas}</td>
        <td>${data.status}</td>
        <td>${data.waktu}</td>
      </tr>
    `;
  });
});