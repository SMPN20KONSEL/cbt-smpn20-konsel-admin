function importWord() {
  const file = document.getElementById("fileImport").files[0];
  if (!file) {
    alert("Pilih file Word terlebih dahulu");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(e) {
    mammoth.convertToHtml({ arrayBuffer: e.target.result })
      .then(function(result) {

        const html = result.value;
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;

        const tables = tempDiv.querySelectorAll("table");
        if (tables.length === 0) {
          alert("Template Word tidak valid (tabel tidak ditemukan)");
          return;
        }

        let bankSoal = JSON.parse(localStorage.getItem("bankSoal")) || [];

        tables.forEach(table => {
          const rows = table.querySelectorAll("tr");
          let data = {};

          rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length === 2) {
              const key = cells[0].innerText.trim().toUpperCase();
              const val = cells[1].innerHTML.trim();
              data[key] = val;
            }
          });

          // VALIDASI
          if (!data["JENIS_SOAL"] || !data["PERTANYAAN"]) return;

          const soal = {
            id: Date.now() + Math.random(),
            jenis: data["JENIS_SOAL"].toLowerCase(),
            mapel: data["MATA_PELAJARAN"] || "",
            kelas: data["KELAS"] || "",
            pertanyaan: data["PERTANYAAN"],
            opsi: data["JENIS_SOAL"] === "PG" ? {
              A: data["OPSI_A"],
              B: data["OPSI_B"],
              C: data["OPSI_C"],
              D: data["OPSI_D"]
            } : null,
            jawaban: data["KUNCI_JAWABAN"] || null,
            rubrik: data["RUBRIK_PENILAIAN"] || null
          };

          bankSoal.push(soal);
        });

        localStorage.setItem("bankSoal", JSON.stringify(bankSoal));
        alert("Import Word berhasil (" + tables.length + " soal)");

      })
      .catch(err => {
        console.error(err);
        alert("Gagal membaca file Word");
      });
  };

  reader.readAsArrayBuffer(file);
}
