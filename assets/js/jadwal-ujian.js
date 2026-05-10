import { db } from "./firebase.js";
import { auth } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  query,
  where,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ================= ELEMENT ================= */
const soalSelect = document.getElementById("soalSelect");
const list = document.getElementById("list");
const btnBuat = document.getElementById("btnBuat");

const filterJudulUjian = document.getElementById("filterJudulUjian");
const btnUnduhToken = document.getElementById("btnUnduhToken");

let loadingToggle = false;

/* ================= GENERATE KODE ================= */
function generateKode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ================= FILTER JUDUL ================= */
async function loadFilterJudul() {
  filterJudulUjian.innerHTML = `<option value="">-- Filter Judul Ujian --</option>`;

  const snap = await getDocs(collection(db, "jadwal_ujian"));
  const setJudul = new Set();

  snap.forEach(d => {
    const data = d.data();
    if (data.judul) setJudul.add(data.judul);
  });

  setJudul.forEach(j => {
    filterJudulUjian.innerHTML += `<option value="${j}">${j}</option>`;
  });
}

/* ================= LOAD BANK SOAL ================= */
async function loadBankSoal() {
  soalSelect.innerHTML = `<option value="">-- Pilih Bank Soal --</option>`;

  const snap = await getDocs(collection(db, "bank_soal"));

  snap.forEach(d => {
    const s = d.data();
    const waktu = s.dibuat?.toDate?.()
      ? s.dibuat.toDate().toLocaleString("id-ID")
      : "";

    soalSelect.innerHTML += `
      <option value="${d.id}">
        ${s.judul} • ${s.mapel} • Kelas ${s.kelas} ${waktu ? `(${waktu})` : ""}
      </option>
    `;
  });
}

/* ================= BUAT UJIAN ================= */
async function buatUjian() {
  try {
    const bankSoalId = soalSelect.value;
    const durasi = Number(document.getElementById("durasi").value);

    if (!bankSoalId || !durasi) {
      tampilkanToast("❗ Lengkapi semua data", "red");
      return;
    }

    // cek duplikat aktif
    const cek = await getDocs(
      query(
        collection(db, "jadwal_ujian"),
        where("bankSoalId", "==", bankSoalId),
        where("aktif", "==", true)
      )
    );

    if (!cek.empty) {
      tampilkanToast("❌ Bank soal masih dipakai", "red");
      return;
    }

    const soalSnap = await getDoc(doc(db, "bank_soal", bankSoalId));

    if (!soalSnap.exists()) {
      tampilkanToast("❌ Bank soal tidak ditemukan", "red");
      return;
    }

    const s = soalSnap.data();
    const kode = generateKode();

    await setDoc(doc(db, "jadwal_ujian", kode), {
      bankSoalId,
      judul: s.judul,
      mapel: s.mapel,
      kelas: s.kelas,
      kode,
      durasi,
      aktif: true,
      guruId: s.guruId || "",
      createdAt: serverTimestamp()
    });

    tampilkanToast(`✅ Ujian dibuat | Kode: ${kode}`);
    loadJadwal();
    loadFilterJudul();

  } catch (err) {
    console.error(err);
    tampilkanToast("❌ Gagal membuat jadwal", "red");
  }
}

/* ================= TOGGLE STATUS ================= */
async function toggleStatus(kode, status) {
  if (loadingToggle) return;
  loadingToggle = true;

  if (!confirm(status ? "Nonaktifkan jadwal?" : "Aktifkan jadwal?")) {
    loadingToggle = false;
    return;
  }

  try {
    await updateDoc(doc(db, "jadwal_ujian", kode), {
      aktif: !status
    });

    loadJadwal();
  } catch (err) {
    console.error(err);
    alert("❌ Gagal update status");
  }

  loadingToggle = false;
}

window.toggleStatus = toggleStatus;

/* ================= HAPUS ================= */
async function hapusUjian(kode) {
  if (!confirm("Yakin mau hapus?")) return;

  try {
    await deleteDoc(doc(db, "jadwal_ujian", kode));
    tampilkanToast("🗑️ Berhasil dihapus", "red");
    loadJadwal();
    loadFilterJudul();
  } catch (err) {
    console.error(err);
    tampilkanToast("❌ Gagal hapus", "red");
  }
}

window.hapusUjian = hapusUjian;

/* ================= LOAD JADWAL ================= */
async function loadJadwal() {
  list.innerHTML = "";

  const selected = filterJudulUjian.value;

  const snap = await getDocs(collection(db, "jadwal_ujian"));

  const data = [];
  snap.forEach(d => {
    const u = d.data();
    if (!selected || u.judul === selected) {
      data.push(u);
    }
  });

  data.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    return b.createdAt.seconds - a.createdAt.seconds;
  });

  data.forEach(u => {
    list.innerHTML += `
      <tr>
        <td>${u.judul}</td>
        <td>${u.mapel}</td>
        <td>${u.kelas}</td>
        <td><b>${u.kode}</b></td>
        <td>${u.durasi} menit</td>
        <td style="display:flex; gap:6px; justify-content:center;">
          
          <button onclick="toggleStatus('${u.kode}', ${u.aktif})"
            style="background:${u.aktif ? 'green' : 'red'};color:white;border:none;padding:4px 8px;border-radius:6px;">
            ${u.aktif ? "Aktif" : "Nonaktif"}
          </button>

          <button onclick="hapusUjian('${u.kode}')"
            style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:6px;">
            🗑️
          </button>

        </td>
      </tr>
    `;
  });
}

/* ================= TOAST ================= */
function tampilkanToast(pesan, warna = "green") {
  const toast = document.createElement("div");
  toast.textContent = pesan;
  toast.className = "toast";

  if (warna === "red") toast.style.background = "#dc2626";

  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

/* ================= DOWNLOAD TOKEN ================= */
async function downloadWord(data) {

  const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    TextRun,
    ImageRun,
    BorderStyle
  } = window.docx;

  // ================= LOAD IMAGE =================
  async function loadImage(url) {
    const res = await fetch(url);
    return await res.arrayBuffer();
  }

  const logoKiri = await loadImage("../assets/img/logo-konawe.png");
  const logoKanan = await loadImage("../assets/img/tutwuri.png");

  // ================= HEADER =================
  const kopTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },

    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
    },

    rows: [
      new TableRow({
        children: [

          // ================= LOGO KIRI =================
          new TableCell({
            width: {
              size: 13,
              type: WidthType.PERCENTAGE
            },

            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            },

            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: logoKiri,
                    transformation: {
                      width: 60,
                      height: 60
                    }
                  })
                ]
              })
            ]
          }),

          // ================= TEKS =================
          new TableCell({
            width: {
              size: 74,
              type: WidthType.PERCENTAGE
            },

            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            },

            children: [

              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "PEMERINTAH KABUPATEN KONAWE SELATAN",
                    bold: true,
                    size: 28,
                    color: "8A6846"
                  })
                ]
              }),

              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "DINAS PENDIDIKAN DAN KEBUDAYAAN",
                    bold: true,
                    size: 28,
                    color: "8A6846"
                  })
                ]
              }),

              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "SMP NEGERI 20 KONAWE SELATAN",
                    bold: true,
                    size: 30,
                    color: "8A6846"
                  })
                ]
              }),

              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Jl. Sabulakoa - Landono Desa Sabulakoa Kec. Sabulakoa, Kode Pos 93373",
                    size: 24,
                    color: "8A6846"
                  })
                ]
              })
            ]
          }),

          // ================= LOGO KANAN =================
          new TableCell({
            width: {
              size: 13,
              type: WidthType.PERCENTAGE
            },

            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
            },

            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: logoKanan,
                    transformation: {
                      width: 60,
                      height: 60
                    }
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // ================= GARIS =================
  const garis = new Paragraph({
    spacing: {
      before: 50,
      after: 200
    },

    border: {
      bottom: {
        color: "000000",
        style: BorderStyle.DOUBLE,
        size: 6
      }
    }
  });

  // ================= JUDUL =================
  const title = new Paragraph({
    alignment: AlignmentType.CENTER,

    spacing: {
      after: 250
    },

    children: [
      new TextRun({
        text: "DATA TOKEN UJIAN",
        bold: true,
        size: 34
      })
    ]
  });

  // ================= HEADER ROW =================
  const headerRow = new TableRow({
    children: [
      "No",
      "Mapel",
      "Kelas",
      "Judul",
      "Durasi",
      "Kode"
    ].map(text =>
      new TableCell({
        shading: {
          fill: "4F81BD"
        },

        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text,
                bold: true,
                color: "FFFFFF"
              })
            ]
          })
        ]
      })
    )
  });

  // ================= ROW DATA =================
  const rows = [headerRow];

  data.forEach((d, i) => {

    rows.push(
      new TableRow({
        children: [
          i + 1,
          d.mapel || "",
          d.kelas || "",
          d.judul || "",
          d.durasi || "",
          d.kode || ""
        ].map(text =>
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: String(text),
                    size: 24
                  })
                ]
              })
            ]
          })
        )
      })
    );

  });

  // ================= TABLE =================
  const table = new Table({
    width: {
      size: 90,
      type: WidthType.PERCENTAGE
    },

    alignment: AlignmentType.CENTER,

    rows
  });

  // ================= DOCUMENT =================
  const doc = new Document({

    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 24
          }
        }
      }
    },

    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 500,
              right: 700,
              bottom: 500,
              left: 700
            }
          }
        },

        children: [
          kopTable,
          garis,
          title,
          table
        ]
      }
    ]
  });

  // ================= DOWNLOAD =================
  const blob = await Packer.toBlob(doc);

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;
  a.download = "token-ujian.docx";
  a.click();

  URL.revokeObjectURL(url);

}
btnUnduhToken.addEventListener("click", async () => {
  const selected = filterJudulUjian.value;

  const snap = await getDocs(collection(db, "jadwal_ujian"));

  const data = [];
  snap.forEach(d => {
    const u = d.data();
    if (!selected || u.judul === selected) {
      data.push(u);
    }
  });

  if (!data.length) {
    alert("Data kosong");
    return;
  }

  downloadWord(data); // ✅ FIX DI SINI
});

/* ================= EVENT ================= */
filterJudulUjian.addEventListener("change", loadJadwal);

btnBuat.addEventListener("click", buatUjian);

/* ================= INIT ================= */
loadBankSoal();
loadJadwal();
loadFilterJudul();