/* ====== ISI URL WEB APP APPS SCRIPT DI BAWAH INI ====== */
const API_URL = "https://script.google.com/macros/s/AKfycby5wS4X4G8nSxeBX6eVCK_SAWoIHibqYiTifTRQuB6PtxqDQvc9Ca91XoWHdr5yvz9fgw/exec";
/* ====================================================== */

const NAMA_BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"];

// State
let tanggalAktif = new Date();          // bulan yang sedang ditampilkan
let petaEvent = {};                     // "YYYY-MM-DD" -> [event, event, ...]

// Elemen
const elLabelBulan = document.getElementById("label-bulan");
const elGrid       = document.getElementById("grid-tanggal");
const elStatus     = document.getElementById("kotak-status");

// ---------- Helper ----------
function dua(n) { return n < 10 ? "0" + n : "" + n; }

function keTeksTanggal(d) {
  return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate());
}

function tampilStatus(pesan, isError) {
  elStatus.textContent = pesan;
  elStatus.className = "kotak-status" + (isError ? " error" : "");
}

function sembunyikanStatus() {
  elStatus.className = "kotak-status sembunyi";
}

// ---------- Bangun peta tanggal -> event (dukung event multi-hari) ----------
function bangunPetaEvent(events) {
  const peta = {};

  events.forEach(function (ev) {
    const mulai = ev.tanggal_mulai_event;
    if (!mulai) return;

    let selesai = ev.tanggal_selesai_event || mulai;
    if (selesai < mulai) selesai = mulai;   // aman: string YYYY-MM-DD bisa dibanding langsung

    const bagian = mulai.split("-");
    const kursor = new Date(Number(bagian[0]), Number(bagian[1]) - 1, Number(bagian[2]));

    let pengaman = 0;
    while (pengaman < 400) {
      const kunci = keTeksTanggal(kursor);
      if (kunci > selesai) break;

      if (!peta[kunci]) peta[kunci] = [];
      peta[kunci].push(ev);

      if (kunci === selesai) break;
      kursor.setDate(kursor.getDate() + 1);
      pengaman++;
    }
  });

  return peta;
}

// ---------- Render kalender ----------
function renderKalender() {
  const tahun = tanggalAktif.getFullYear();
  const bulan = tanggalAktif.getMonth();

  elLabelBulan.textContent = NAMA_BULAN[bulan] + " " + tahun;

  const hariPertama = new Date(tahun, bulan, 1).getDay();   // 0 = Minggu
  const jumlahHari  = new Date(tahun, bulan + 1, 0).getDate();
  const teksHariIni = keTeksTanggal(new Date());

  let html = "";

  // Sel kosong sebelum tanggal 1
  for (let i = 0; i < hariPertama; i++) {
    html += '<div class="sel kosong"></div>';
  }

  // Sel tanggal
  for (let tgl = 1; tgl <= jumlahHari; tgl++) {
    const kunci = tahun + "-" + dua(bulan + 1) + "-" + dua(tgl);
    const daftar = petaEvent[kunci] || [];

    let kelas = "sel";
    if (daftar.length > 0) kelas += " ada-event";
    if (kunci === teksHariIni) kelas += " hari-ini";

    html += '<div class="' + kelas + '" data-tanggal="' + kunci + '">';
    html += '<div class="angka-tanggal">' + tgl + '</div>';

    daftar.slice(0, 2).forEach(function (ev) {
      html += '<div class="chip-event">' + amanTeks(ev.nama_event) + '</div>';
    });
    if (daftar.length > 2) {
      html += '<div class="lebih-event">+' + (daftar.length - 2) + ' lainnya</div>';
    }

    html += '</div>';
  }

  elGrid.innerHTML = html;
}

// Cegah karakter HTML di nama event merusak tampilan
function amanTeks(nilai) {
  return String(nilai || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------- Ambil data dari API ----------
async function muatData() {
  if (API_URL.indexOf("PASTE_URL") === 0) {
    tampilStatus("URL API belum diisi. Buka file script.js dan isi konstanta API_URL di baris paling atas.", true);
    renderKalender();
    return;
  }

  tampilStatus("Memuat data event...", false);

  try {
    const respon = await fetch(API_URL);
    if (!respon.ok) throw new Error("HTTP " + respon.status);

    const data = await respon.json();
    if (data.status !== "ok") throw new Error(data.message || "API mengembalikan status error");

    petaEvent = bangunPetaEvent(data.events || []);
    renderKalender();
    sembunyikanStatus();
    console.log("Total event dimuat:", data.total_event, data.events);

  } catch (err) {
    console.error(err);
    tampilStatus("Gagal memuat data event. Cek koneksi internet atau URL API, lalu muat ulang halaman.", true);
    renderKalender();
  }
}

// ---------- Tombol navigasi ----------
document.getElementById("btn-prev").addEventListener("click", function () {
  tanggalAktif = new Date(tanggalAktif.getFullYear(), tanggalAktif.getMonth() - 1, 1);
  renderKalender();
});

document.getElementById("btn-next").addEventListener("click", function () {
  tanggalAktif = new Date(tanggalAktif.getFullYear(), tanggalAktif.getMonth() + 1, 1);
  renderKalender();
});

document.getElementById("btn-hari-ini").addEventListener("click", function () {
  tanggalAktif = new Date();
  renderKalender();
});

// ---------- Jalan ----------
renderKalender();
muatData();

/* ===================== ROOM 5: ACCORDION & DETAIL EVENT ===================== */

const elDetailR5 = document.getElementById("area-detail");
const elGridR5 = document.getElementById("grid-tanggal");
let tanggalTerpilihR5 = "";

const NAMA_BULAN_R5 = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

/* "2026-09-02" -> "2 September 2026" */
function tglIndoR5(kunci) {
  const p = String(kunci).split("-");
  if (p.length !== 3) return kunci;
  return Number(p[2]) + " " + NAMA_BULAN_R5[Number(p[1]) - 1] + " " + p[0];
}

/* "081234567890" -> "6281234567890" (format wajib wa.me) */
function keNomorWaR5(no) {
  let bersih = String(no).replace(/\D/g, "");
  if (bersih.startsWith("0")) bersih = "62" + bersih.slice(1);
  else if (!bersih.startsWith("62")) bersih = "62" + bersih;
  return bersih;
}

function barisInfoR5(label, isiHtml) {
  return '<div class="baris-info"><div class="baris-label">' + label +
         '</div><div class="baris-isi">' + isiHtml + "</div></div>";
}

function chipWaR5(teks, nomor) {
  return '<a class="chip-wa" href="https://wa.me/' + keNomorWaR5(nomor) +
         '" target="_blank" rel="noopener">' + amanTeks(teks) + "</a>";
}

/* isi panel detail satu event */
function htmlIsiEventR5(ev) {
  let h = "";

  if (ev.foto_flyer_event) {
    h += '<img class="flyer" src="' + amanTeks(ev.foto_flyer_event) +
         '" alt="Flyer ' + amanTeks(ev.nama_event) + '" loading="lazy">';
  }

  if (ev.tanggal_mulai_event) {
    let tgl = tglIndoR5(ev.tanggal_mulai_event);
    if (ev.tanggal_selesai_event && ev.tanggal_selesai_event !== ev.tanggal_mulai_event) {
      tgl += " s/d " + tglIndoR5(ev.tanggal_selesai_event);
    }
    h += barisInfoR5("Tanggal", amanTeks(tgl));
  }

  if (ev.waktu_mulai_event) {
    let waktu = amanTeks(ev.waktu_mulai_event);
    if (ev.waktu_selesai_event) waktu += " s/d " + amanTeks(ev.waktu_selesai_event);
    h += barisInfoR5("Waktu", waktu);
  }

  if (ev.alamat_lokasi) {
    h += barisInfoR5("Lokasi", amanTeks(ev.alamat_lokasi));
  }

  const daftarSales = Array.isArray(ev.sales_bertugas) ? ev.sales_bertugas : [];
  if (daftarSales.length > 0) {
    let isi = "";
    for (let i = 0; i < daftarSales.length; i++) {
      const s = daftarSales[i];
      if (s.no_wa) isi += chipWaR5(s.nama_sales, s.no_wa);
      else isi += '<span class="chip-wa">' + amanTeks(s.nama_sales) + "</span>";
    }
    h += barisInfoR5("Sales bertugas", isi);
  } else {
    h += barisInfoR5("Sales bertugas", '<span class="tanpa-data">belum ada</span>');
  }

  if (ev.contact_center_petugas_event) {
    h += barisInfoR5("Contact center", chipWaR5(ev.contact_center_petugas_event, ev.contact_center_petugas_event));
  }

  if (ev.link_share_lok) {
    h += '<a class="tombol-peta" href="' + amanTeks(ev.link_share_lok) +
         '" target="_blank" rel="noopener">Buka Peta Lokasi</a>';
  }

  return h;
}

/* gambar seluruh accordion untuk satu tanggal */
function renderDetailR5(kunci) {
  const daftar = (typeof petaEvent === "object" && petaEvent[kunci]) ? petaEvent[kunci] : [];

  if (daftar.length === 0) {
    tutupDetailR5();
    return;
  }

  let h = '<div class="detail-judul">Event pada ' + tglIndoR5(kunci) +
          " (" + daftar.length + " event)</div>";

  for (let i = 0; i < daftar.length; i++) {
    const ev = daftar[i];
    // auto-buka kalau hanya ada 1 event
    const kelas = (daftar.length === 1) ? "akor-item terbuka" : "akor-item";
    h += '<div class="' + kelas + '">' +
           '<button type="button" class="akor-judul">' +
             '<span class="akor-panah">&#9654;</span>' +
             '<span>' + amanTeks(ev.nama_event || "(tanpa nama)") + "</span>" +
           "</button>" +
           '<div class="akor-isi">' + htmlIsiEventR5(ev) + "</div>" +
         "</div>";
  }

  elDetailR5.innerHTML = h;
  elDetailR5.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function tutupDetailR5() {
  elDetailR5.innerHTML = "";
  tanggalTerpilihR5 = "";
  const lama = elGridR5.querySelectorAll(".sel.terpilih");
  for (let i = 0; i < lama.length; i++) lama[i].classList.remove("terpilih");
}

/* klik kotak tanggal (event delegation, tahan render ulang tiap ganti bulan) */
elGridR5.addEventListener("click", function (e) {
  const sel = e.target.closest(".sel.ada-event");
  if (!sel) return;

  const kunci = sel.dataset.tanggal;
  if (!kunci) return;

  // klik ulang tanggal yang sama = tutup
  if (kunci === tanggalTerpilihR5) {
    tutupDetailR5();
    return;
  }

  const lama = elGridR5.querySelectorAll(".sel.terpilih");
  for (let i = 0; i < lama.length; i++) lama[i].classList.remove("terpilih");
  sel.classList.add("terpilih");

  tanggalTerpilihR5 = kunci;
  renderDetailR5(kunci);
});

/* klik judul accordion (delegation juga, isi #area-detail selalu di-generate ulang) */
elDetailR5.addEventListener("click", function (e) {
  const judul = e.target.closest(".akor-judul");
  if (!judul) return;

  const item = judul.parentElement;
  const sudahTerbuka = item.classList.contains("terbuka");

  // hanya 1 boleh terbuka
  const semua = elDetailR5.querySelectorAll(".akor-item");
  for (let i = 0; i < semua.length; i++) semua[i].classList.remove("terbuka");

  if (!sudahTerbuka) item.classList.add("terbuka");
});

/* ganti bulan -> tutup detail supaya tidak menampilkan tanggal bulan lain */
["btn-prev", "btn-next", "btn-hari-ini"].forEach(function (id) {
  const b = document.getElementById(id);
  if (b) b.addEventListener("click", tutupDetailR5);
});

/* ============================================================
   ROOM 7: AUTO-REFRESH DATA + TOMBOL REFRESH MANUAL
   Interval polling: 2 menit, hanya berjalan saat tab terlihat.
   Data digambar ulang HANYA kalau isinya benar-benar berubah.
   ============================================================ */

var JEDA_POLL_R7 = 120000; // 2 menit dalam milidetik
var sedangMuatR7 = false;
var timerR7 = null;

/* --- Buat tombol refresh + teks jam update, selipkan setelah tombol Hari Ini --- */
function pasangTombolR7() {
  var btnHariIni = document.getElementById("btn-hari-ini");
  if (!btnHariIni) return;

  var btn = document.createElement("button");
  btn.id = "btn-refresh-r7";
  btn.type = "button";
  btn.textContent = "\u21BB";
  btn.title = "Ambil data terbaru sekarang";
  btn.setAttribute("aria-label", "Ambil data terbaru sekarang");
  btnHariIni.insertAdjacentElement("afterend", btn);

  var info = document.createElement("small");
  info.id = "jam-update-r7";
  info.textContent = "Data dimuat otomatis tiap 2 menit.";
  btnHariIni.parentNode.appendChild(info);

  btn.addEventListener("click", function () {
    segarkanR7(true);
  });
}

/* --- Tulis jam pembaruan terakhir --- */
function tulisJamR7(adaPerubahan) {
  var info = document.getElementById("jam-update-r7");
  if (!info) return;
  var d = new Date();
  var jam = dua(d.getHours()) + ":" + dua(d.getMinutes()) + ":" + dua(d.getSeconds());
  info.textContent = adaPerubahan
    ? "Data diperbarui pukul " + jam
    : "Data sudah terbaru — dicek pukul " + jam;
}

/* --- Inti: ambil data, bandingkan, gambar ulang hanya kalau berubah --- */
function segarkanR7(manual) {
  if (sedangMuatR7) return;
  sedangMuatR7 = true;

  var btn = document.getElementById("btn-refresh-r7");
  if (btn) {
    btn.disabled = true;
    btn.classList.add("berputar-r7");
  }

  // penanda waktu supaya browser tidak menyajikan data basi dari cache-nya sendiri
  var pemisah = API_URL.indexOf("?") >= 0 ? "&" : "?";
  var url = API_URL + pemisah + "t=" + Date.now();

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (!data || data.status !== "ok") throw new Error("Status API bukan ok");

      // snapshot data lama diambil DULU, sebelum peta baru dibangun
      var lamaStr = JSON.stringify(petaEvent);
      var hasil = bangunPetaEvent(data.events || []);
      var petaBaru = hasil && typeof hasil === "object" ? hasil : petaEvent;
      var baruStr = JSON.stringify(petaBaru);

      if (lamaStr === baruStr) {
        tulisJamR7(false);
        return; // tidak ada perubahan → layar tidak disentuh sama sekali
      }

      petaEvent = petaBaru;

      var kunciDibuka = typeof tanggalTerpilihR5 !== "undefined" ? tanggalTerpilihR5 : "";
      renderKalender();

      // kembalikan kondisi panel detail yang tadi sedang terbuka
      if (kunciDibuka) {
        if (petaEvent[kunciDibuka]) {
          var sel = document.querySelector('.sel[data-tanggal="' + kunciDibuka + '"]');
          if (sel) sel.classList.add("terpilih");
          tanggalTerpilihR5 = kunciDibuka;
          renderDetailR5(kunciDibuka);
        } else {
          tutupDetailR5(); // event pada tanggal itu sudah tidak ada lagi
        }
      }

      console.log("ROOM 7: data berubah, kalender digambar ulang. Total event: " + (data.total_event || 0));
      tulisJamR7(true);
    })
    .catch(function (err) {
      console.error("ROOM 7: gagal menyegarkan data.", err);
      var info = document.getElementById("jam-update-r7");
      if (info) info.textContent = "Gagal mengambil data terbaru. Akan dicoba lagi.";
    })
    .then(function () {
      sedangMuatR7 = false;
      var b = document.getElementById("btn-refresh-r7");
      if (b) {
        b.disabled = false;
        b.classList.remove("berputar-r7");
      }
    });
}

/* --- Atur timer: berhenti saat tab disembunyikan, jalan lagi saat dibuka --- */
function mulaiTimerR7() {
  if (timerR7) return;
  timerR7 = setInterval(function () {
    if (!document.hidden) segarkanR7(false);
  }, JEDA_POLL_R7);
}

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) segarkanR7(false); // begitu kembali ke tab, langsung ambil data
});

pasangTombolR7();
mulaiTimerR7();