# 🚀 Pedoman Performa & Standar Visual 'Premium'

Dokumen ini berisi standar teknis untuk memastikan aplikasi tetap ringan, responsif, dan memberikan pengalaman pengguna yang sangat halus (smooth) meskipun menangani data yang kompleks.

---

## 📚 Kamus Kata Kunci (Keywords)

Gunakan kata kunci ini saat memberikan instruksi fitur baru untuk mengaktifkan optimasi spesifik:

### 1. **"Gunakan Mode Seluncur"**
*   **Target**: Tabel besar, Kalender, Grafik padat.
*   **Teknik Utama**: *Imperative DOM Manipulation* + *Single Overlay Highlight*.
*   **Hasil**: Navigasi kursor di ribuan sel sangat ringan tanpa memicu re-render React.

### 2. **"Gunakan Turbo Animation"**
*   **Target**: Sidebar, Submenu, Drawer, Panel Expansions.
*   **Teknik Utama**: *Hardware Acceleration (GPU)* + *Grid Height Animation*.
*   **Hasil**: Transisi buka-tutup panel sehalus aplikasi native, tanpa jeda/patah-patah.

### 3. **"Terapkan Arsitektur Premium"**
*   **Target**: Inisialisasi fitur baru atau audit halaman.
*   **Teknik Utama**: Kombinasi seluruh metode optimasi + *Event Delegation* + *Component Memoization*.
*   **Hasil**: Keseluruhan antarmuka terasa solid, responsif, dan berkualitas tinggi.

---

## 🛠️ Standar Teknis Implementasi

### A. Minimalisir Re-render (Navigation Level)
Jangan gunakan `React State` untuk tracking posisi kursor atau highlight baris jika elemen melebihi 50 item. Gunakan `useRef` dan manipulasi `style` secara langsung di DOM.

### B. Akselerasi GPU (Hardware-Accelerated)
Selalu tambahkan properti `will-change` (seperti `width`, `transform`, atau `opacity`) pada elemen yang akan beranimasi secara intens untuk mengaktifkan tenaga grafis dari perangkat.

### C. Smooth Height Transitions
Hindari `max-height: fixed-value`. Gunakan teknik **CSS Grid Animation**:
```css
.grid-animate {
    display: grid;
    grid-template-rows: 0fr; /* Tertutup */
    transition: grid-template-rows 0.3s ease;
}
.grid-animate.expanded {
    grid-template-rows: 1fr; /* Terbuka otomatis sesuai konten */
}
```

### D. Event Delegation
Pasang *event listener* pada kontainer induk (parent) daripada memasangnya di ribuan anak elemen (child). Ini akan menghemat penggunaan RAM secara signifikan.

---

> [!IMPORTANT]
> Pedoman ini adalah **hukum utama** untuk setiap pengembangan fitur di Dashboard ini agar performa "Mulus Seluncur" tetap terjaga selamanya.
