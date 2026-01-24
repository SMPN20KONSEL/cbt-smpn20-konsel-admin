import { db } from "./firebase.js";
import { collection, getDocs }
from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// ⚡ jsPDF dari CDN
const { jsPDF } = window.jspdf;

// ================= ELEMENT =================
const hasilDiv    = document.getElementById('hasil');
const msgKartu    = document.getElementById('msgKartu');
const filterKelas = document.getElementById('filterKelas');
const namaInput   = document.getElementById('nama');
const hasilSiswa  = document.getElementById('hasilSiswa');

// ================================
// UKURAN HALAMAN & KARTU (F4)
// ================================
const PAGE_W = 210;
const PAGE_H = 330;
const MARGIN = 5;
const GAP = 4;
const COLS = 2;
const ROWS = 5;
const CARD_W = (PAGE_W - 2 * MARGIN - GAP) / 2;
const CARD_H = (PAGE_H - 2 * MARGIN - GAP * 4) / 5;

let semuaSiswa = [];

// ================= LOAD SISWA =================
async function loadSiswa() {
  try {
    const snapshot = await getDocs(collection(db, "siswa"));
    semuaSiswa = snapshot.docs.map(doc => ({
      nis: doc.id,
      ...doc.data()
    }));

    // FILTER KELAS
    const kelasUnik = [...new Set(semuaSiswa.map(s => s.kelas))].sort();
    filterKelas.innerHTML = '<option value="">-- Semua Kelas --</option>';
    kelasUnik.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = k;
      filterKelas.appendChild(opt);
    });

  } catch (err) {
    console.error(err);
    alert("Gagal memuat data siswa!");
  }
}
loadSiswa();

// ================= AUTOCOMPLETE =================
namaInput.addEventListener('input', function () {
  const keyword = this.value.toLowerCase().trim();
  hasilSiswa.innerHTML = "";
  if (!keyword) return;

  const filtered = semuaSiswa.filter(s =>
    s.nama?.toLowerCase().includes(keyword)
  );

  filtered.slice(0, 5).forEach(s => {
    const div = document.createElement('div');
    div.className = "autocomplete-item";
    div.textContent = `${s.nama} (${s.kelas})`;

    div.onclick = () => {
      namaInput.value = s.nama || "";
      document.getElementById('nis').value = s.nis || "";
      document.getElementById('kelas').value = s.kelas || "";
      document.getElementById('email').value = s.email || "";
      document.getElementById('password').value = s.password || "";
      hasilSiswa.innerHTML = "";
    };

    hasilSiswa.appendChild(div);
  });
});

// ================= BUAT 1 KARTU =================
window.buatKartu = function () {
  const nama = document.getElementById('nama').value.trim();
  const nis = document.getElementById('nis').value.trim();
  const kelas = document.getElementById('kelas').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!nama || !nis || !kelas) {
    alert("Nama, NIS, dan Kelas harus diisi!");
    return;
  }

  hasilDiv.innerHTML = "";
  msgKartu.style.display = "none";

  buatKartuHTML({ nama, nis, kelas, email, password });
};

// ================= PREVIEW PER KELAS =================
window.previewKartuPerKelas = function () {
  const kelasDipilih = filterKelas.value;
  hasilDiv.innerHTML = "";
  msgKartu.style.display = "none";

  const siswaFilter = kelasDipilih
    ? semuaSiswa.filter(s => s.kelas === kelasDipilih)
    : semuaSiswa;

  if (siswaFilter.length === 0) {
    msgKartu.style.display = "block";
    msgKartu.textContent = kelasDipilih
      ? `Tidak ada siswa di kelas ${kelasDipilih}`
      : "Tidak ada siswa";
    return;
  }

  siswaFilter.forEach(s => buatKartuHTML(s));
};

// ================= BUAT KARTU + QR =================
function buatKartuHTML(siswa) {
  const div = document.createElement('div');
  div.className = 'kartu';

  div.innerHTML = `
    <div class="kartu-header">
      <div>PEMERINTAH KABUPATEN KONAWE SELATAN</div>
      <div>DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
      <div class="nama-sekolah">SMP NEGERI 20 KONAWE SELATAN</div>
    </div>

    <div class="kartu-body">
      <div class="kartu-title">KARTU UJIAN</div>

      <div class="body-content">
        <div class="info-siswa">
          <p>NAMA : ${siswa.nama}</p>
          <p>NIS  : ${siswa.nis}</p>
          <p>KELAS: ${siswa.kelas}</p>
          <p>USERNAME: ${siswa.email || "-"}</p>
          <p>PASSWORD: ${siswa.password || "-"}</p>
        </div>
        <div class="ruang-qr" id="qr-${siswa.nis}"></div>
      </div>
    </div>
  `;

  hasilDiv.appendChild(div);

  // ==== GENERATE QR (AMAN & STABIL) ====
  const qrBox = document.getElementById(`qr-${siswa.nis}`);
  qrBox.innerHTML = ""; // 🔑 cegah QR dobel

  const namaDepan = siswa.nama
    .trim()
    .split(" ")[0]
    .toLowerCase();

  const loginURL =
    `https://smpn20konsel.github.io/cbt-smpn20-konsel/login-siswa.html` +
    `?nis=${encodeURIComponent(siswa.nis)}` +
    `&nama=${encodeURIComponent(namaDepan)}`;

  new QRCode(qrBox, {
    text: loginURL,
    width: 120,
    height: 120,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

// ================= CETAK =================
window.cetakSemua = function () {
  if (!hasilDiv.innerHTML.trim()) {
    alert("Belum ada kartu!");
    return;
  }
  setTimeout(() => window.print(), 300);
};

// ================= PDF =================
window.unduhPDF = async function () {
  if (!hasilDiv.innerHTML.trim()) {
    alert("Belum ada kartu!");
    return;
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [PAGE_W, PAGE_H]
  });

  const kartuList = hasilDiv.querySelectorAll(".kartu");
  let x = MARGIN, y = MARGIN, col = 0, row = 0;

  for (let kartu of kartuList) {
    kartu.style.boxShadow = "none";

    const canvas = await html2canvas(kartu, { scale: 2, useCORS: true });
    const img = canvas.toDataURL("image/jpeg", 1.0);

    pdf.addImage(img, "JPEG", x, y, CARD_W, CARD_H);

    col++;
    if (col === COLS) {
      col = 0; row++;
      x = MARGIN;
      y += CARD_H + GAP;
    } else {
      x += CARD_W + GAP;
    }

    if (row === ROWS) {
      pdf.addPage();
      x = MARGIN; y = MARGIN;
      col = 0; row = 0;
    }
  }

  pdf.save("Kartu_Ujian_F4_FIX.pdf");
};
