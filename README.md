# Arena Sumpah Pemuda

Aplikasi bel cerdas cermat bertema Sumpah Pemuda yang dapat dipakai lewat HP dan jaringan berbeda. Peserta masuk sebagai tamu memakai kode gelanggang dan nama regu. Panitia dapat membuka bel, melihat regu tercepat, lalu memulai babak berikutnya.

## Fitur

- Peserta tidak perlu akun.
- Kode room dan tautan undangan otomatis.
- Satu pemenang per ronde dengan penguncian atomik di server.
- Tampilan responsif untuk HP dan komputer.
- Bunyi serta getaran saat tombol ditekan (jika didukung perangkat).
- Room terhapus otomatis setelah 24 jam.
- Tidak memakai MySQL, PostgreSQL, atau migrasi database.

## Menjalankan di komputer

1. Pastikan Node.js 20 atau lebih baru sudah terpasang.
2. Buat database Redis gratis di Upstash.
3. Salin `.env.example` menjadi `.env.local`, lalu isi URL dan token Redis.
4. Jalankan:

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Deploy ke Vercel

1. Unggah folder ini ke repository GitHub.
2. Di Vercel, pilih **Add New → Project**, lalu impor repository tersebut.
3. Tambahkan dua Environment Variables berikut:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

4. Klik **Deploy**. Pengaturan framework akan dikenali otomatis sebagai Next.js.

## Cara penggunaan

1. Panitia memilih **Saya Panitia** dan membuat room.
2. Bagikan link atau kode room kepada peserta.
3. Peserta memilih **Saya Peserta**, lalu memasukkan kode dan nama tim.
4. Setelah soal dibacakan, panitia menekan **Buka bel**.
5. Sistem mengunci tim yang pertama kali diterima server.
6. Tekan **Ronde berikutnya** untuk membuka ronde baru.

## Catatan

Kecepatan ditentukan berdasarkan permintaan yang pertama kali diterima server. Hasil tetap dapat dipengaruhi kualitas jaringan masing-masing peserta, sebagaimana sistem bel daring pada umumnya.
