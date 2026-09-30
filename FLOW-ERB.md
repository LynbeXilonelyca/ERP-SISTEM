# ERP Admin — Panduan Uji Alur Lengkap (Root Flow)

Panduan ini melacak sistem dari **master data** sampai **laporan & komisi**.
Semua data tersimpan di `localStorage` browser (`erp_admin_db_v3`) — Anda BEBAS ganti akun
logout/login di browser yang sama, data tidak hilang. Untuk mengulang demo dari nol,
buka **Settings → Reset Data** (sebagai Super Admin).

## Kredensial demo

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@erp.com` | `superadmin` |
| Admin Penjualan | `penjualan@erp.com` | `penjualan` |
| Sales (Andi) | `andi@erp.com` | `andi` |
| Admin Pengiriman | `pengiriman@erp.com` | `pengiriman` |
| Finance | `finance@erp.com` | `finance` |
| Admin Pembelian | `pembelian@erp.com` | `pembelian` |

URL: `http://localhost:3000` · semua akun: punggung kiri atas → Logout untuk ganti akun.

---

## FASE 0 — MASTER DATA (setup awal)

> Lakukan dalam urutan ini: Settings → Users → Brands → Categories → Produk → Supplier → Customer.

- [ ] **Settings** (`superadmin` → menu Settings): cek `cut_off_days`, `main_commission_rate`, `own_brand_commission_rate`, `other_brand_commission_rate`. Ubah sesuai kebutuhan lalu Simpan.
- [ ] **Users** (`superadmin` → Users): lihat daftar 8 user aktif. Coba **Edit** satu user (mis. ubah platform). Simpan → muncul notifikasi + tercatat di Audit.
- [ ] **Brands** (`superadmin`/SALES/PURCHASE → Products → Brands): tambah 1 brand baru → muncul di daftar + jumlah produk.
- [ ] **Categories** (Products → Categories): tambah 1 kategori + 1 sub-kategori → muncul di daftar.
- [ ] **Products** (Products → Products): klik **Tambah Produk**, isi nama/SKU/brand/kategori/sub-kategori/own-brand, min–max–multiple order, warning stock, **cost price**, lalu **semua harga per payment term** (Cash/1H/1M/1Bln/3Bln). Simpan → produk masuk + **inventory otomatis tersedia**.
- [ ] **Suppliers** (`pembelian` atau admin penuh): **Tambah Supplier** (SUP-003) → Simpan.
- [ ] **Customers** (`superadmin`/`penjualan` → Customers): **Tambah Customer** baru → isi toko/pemilik/telepon, pilih tipe, **Payment Term**, **Sales PIC = Andi Saputra**, credit limit, alamat, kota → Simpan → muncul di tabel dengan kode otomatis `CST-00x`.

---

## FASE 1 — SIKLUS RESTOCK / PEMBELIAN

- [ ] `pembelian@erp.com` → **Purchasing** → **Buat Purchase Request**:
  - Pilih supplier (SUP-001), pilih produk, qty & harga beli (cost). **Tanpa** "untuk sales" = stok umum.
  - Submit → status **SUBMITTED**, muncul di tabel.
- [ ] `superadmin@erp.com` → **Approvals → tab Purchase** → **Setujui** → notifikasi "stok bertambah".
  - Verifikasi: **Inventory** (+qty) dan **Inventory → Movements** (type PURCHASE) terisi.

### Jalur Order (pembelian yang ditujukan ke sales)
- [ ] `pembelian@erp.com` → **Purchasing** → Buat PR yang **centang "Untuk Sales" = Andi** → Submit.
- [ ] `superadmin@erp.com` → **Approvals → Purchase** → Setujui → otomatis **Order** dibuat (`AWAITING_SALES`) + gunakan stok.
- [ ] `andi@erp.com` → **Sales Panel → tab Orderan** → **Terima** → status `APPROVED_BY_SALES` → notif ke Finance.
  - (atau **Tolak** untuk simulasi barang tidak tersedia → order `REJECTED_BY_SALES`)

---

## FASE 2 — SIKLUS PENJUALAN (jalur utama)

> Syarat: customer harus dimiliki oleh sales yang dipilih & ada **Sesi aktif** (seed Andi/Budi/Citra OK).

- [ ] `penjualan@erp.com` → **Sales Panel → tab Buat Invoice**:
  - Pilih **Sales = Andi**, pilih **customer baru** (Fase 0), tambah line produk + qty (min order terisi otomatis), isi **diskon** bila perlu → klik **Buat Invoice** → konfirmasi di modal ringkasan.
  - Status awal = **PENDING_SUPER** (karena dibuat Admin Penjualan).
- [ ] Verifikasi: **Sales → Invoices** menampilkan invoice baru (status PENDING_SUPER).
- [ ] `superadmin@erp.com` → **Approvals → tab Invoice** → **Setujui** → status **PENDING_SHIPPING**.
  - (Alternatif tanpa Super Admin: `penjualan` di Sales Panel tab Approve → jika item tidak diubah → langsung **PENDING_SHIPPING**.)
- [ ] `pengiriman@erp.com` → **Sales Panel → tab Approve** → isi **tanggal kirim** → **Kirim** → status **PENDING_FINANCE**.
- [ ] `finance@erp.com` → **Sales Panel → tab Approve** → **Proses** → status **CONFIRMED**, payment **PAID**.
  - Verifikasi: **Finance → Billing** tab Tagihan memuat invoice CONFIRMED (outstanding = total).

---

## FASE 3 — SIKLUS ORDER → PENJUALAN LANGSUNG (opsional)

> Jalur alternatif: pengadaan untuk sales → invoice langsung dari Finance.

- [ ] Lakukan FASE 1 jalur order sampai status `APPROVED_BY_SALES`.
- [ ] `finance@erp.com` → **Finance → Billing → tab Orderan** → pilih order → **Buat Invoice** (harga = cost) → status **PENDING_SUPER**, nomor `INV-O-...`.
- [ ] `superadmin@erp.com` → **Approvals → tab Invoice** → **Setujui** → **CONFIRMED + PAID**, order otomatis **COMPLETED**.

---

## FASE 4 — FINANCE, BILLING & KOMISI

- [ ] `finance@erp.com` → **Finance → Billing Sessions**: centang baris **Andi** (outstanding > 0) → **Kirim ke Super Admin** → billing session **PENDING**.
- [ ] (opsional) `finance@erp.com` → **Finance → Billing History**: buka session → **Review** → status **REVIEWED**.
- [ ] `superadmin@erp.com` → **Approvals → tab Billing** → **Setujui**:
  - Komisi **dihitung otomatis** per invoice (main + own brand + sub) status **APPROVED**,
  - billing session **APPROVED** + `total_commission` terisi,
  - **Sesi sales Andi otomatis DONE**.
- [ ] `finance@erp.com` → **Commission**: daftar transaksi komisi terisi. **Settlement**: Approve / **Adjustment** / **Paid** per komisi.
- [ ] `finance@erp.com` → **Finance → Payments** (riwayat pembayaran) & **Outstanding** (piutang per customer) — angka konsisten dengan invoice.

---

## FASE 5 — PENUTUPAN & LAPORAN

- [ ] `superadmin@erp.com` → **Reports → Sales** : filter per sesi → jumlah & nilai invoice benar.
- [ ] **Reports → Stock** : mutasi & sisa stok sesuai siklus pembelian/penjualan.
- [ ] **Reports → Finance** & **Reports → Commission** : total revenue, pembayaran, komisi konsisten.
- [ ] **Audit** : seluruh aksi (CREATE/UPDATE/APPROVE/REJECT/SUBMIT/PAYMENT) tercatat berurutan.
- [ ] **Search** : ketik nama customer / invoice / produk → hasil muncul lintas modul.
- [ ] **Dashboard** (`/dashboard`): KPI & notifikasi sinkron (low stock, invoice pending, sesi menunggu tutup).
- [ ] **Sales → Sessions** & **Finance → Sessions**: sesi Andi jadi **DONE**, total revenue & komisi final.

---

## Catatan penting

- **Sesi aktif terbatas**: setelah komisi disetujui, sesi sales jadi `DONE` dan sales itu tidak punya sesi aktif untuk invoice baru. Untuk demo berikutnya: **Settings → Reset Data**.
- **Login tetap pakai akun seed**: user baru dari menu Users tercatat di sistem tapi belum bisa login (kecuali ditambah ke `lib/seed.ts`).
- **Cut-off otomatis**: customer dengan invoice CONFIRMED/DELIVERED yang belum lunas > `cut_off_days` akan **diblokir di Sales Panel** saat dibuatkan invoice baru.