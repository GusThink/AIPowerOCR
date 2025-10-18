document.addEventListener('DOMContentLoaded', () => {
    // --- PENTING: PENGATURAN KUNCI API ---
    // Dapatkan Kunci API gratis dari Google AI Studio dan tempel di sini.
    const API_KEY = 'GANTI_DENGAN_API_KEY_ANDA';

    // --- Pemilihan Elemen DOM ---
    const themeToggle = document.getElementById('theme-toggle');
    const deviceToggle = document.getElementById('device-toggle');
    const devicePreview = document.getElementById('device-preview-container');
    const imageDropZone = document.getElementById('image-drop-zone');
    const imageUploadInput = document.getElementById('image-upload-input');
    const cameraInput = document.getElementById('camera-input');
    const uploadBtn = document.getElementById('upload-btn');
    const cameraBtn = document.getElementById('camera-btn');
    const imagePreview = document.getElementById('image-preview');
    const outputText = document.getElementById('output-text');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const initialState = document.getElementById('initial-state');
    const loadingState = document.getElementById('loading-state');
    
    // --- Logika Ganti Tema (Dark/Light Mode) ---
    const applyTheme = (theme) => {
        document.body.classList.toggle('light-theme', theme === 'light');
        document.getElementById('theme-icon-light').classList.toggle('hidden', theme !== 'light');
        document.getElementById('theme-icon-dark').classList.toggle('hidden', theme === 'light');
    };
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);
    themeToggle.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('light-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // --- Logika Ganti Tampilan Perangkat ---
    const deviceStates = ['mobile-view', 'tablet-view', 'pc-view'];
    const deviceIcons = {
        'mobile-view': document.getElementById('icon-mobile'),
        'tablet-view': document.getElementById('icon-tablet'),
        'pc-view': document.getElementById('icon-pc')
    };
    let currentDeviceIndex = 0;
    const applyDeviceView = (index) => {
        deviceStates.forEach(state => devicePreview.classList.remove(state));
        Object.values(deviceIcons).forEach(icon => icon.classList.add('hidden'));
        
        const newDeviceState = deviceStates[index];
        devicePreview.classList.add(newDeviceState);
        deviceIcons[newDeviceState].classList.remove('hidden');
        currentDeviceIndex = index;
    };
    deviceToggle.addEventListener('click', () => {
        applyDeviceView((currentDeviceIndex + 1) % deviceStates.length);
    });

    // --- Fungsi Notifikasi (Snackbar) ---
    let snackbarTimeout;
    const showSnackbar = (message) => {
        const snackbar = document.getElementById('snackbar');
        clearTimeout(snackbarTimeout);
        snackbar.textContent = message;
        snackbar.className = 'show';
        snackbarTimeout = setTimeout(() => {
            snackbar.className = snackbar.className.replace('show', '');
        }, 3000);
    };

    // --- Fungsi Utama OCR ---
    const performOCR = async (file) => {
        if (!API_KEY || API_KEY === 'GANTI_DENGAN_API_KEY_ANDA') {
            showSnackbar("Error: Kunci API belum diatur di js/app.js");
            return; // Hentikan fungsi jika API Key belum diisi
        }

        // 1. Tampilkan status loading
        loadingState.classList.remove('hidden');
        initialState.classList.add('hidden');
        imagePreview.classList.add('hidden');
        outputText.value = "";

        // 2. Konversi file gambar ke format base64
        const toBase64 = file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });

        try {
            const base64Image = await toBase64(file);

            // 3. Siapkan data untuk dikirim ke Gemini API
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;
            
            // Inilah PROMPT KHUSUS yang kamu minta, kita masukkan langsung ke sini.
            const systemPrompt = `Anda adalah AI OCR Assistant dengan tingkat presisi tertinggi, yang bertugas sebagai pemindai visual murni.
ATURAN MUTLAK:
1.  **Tugas Inti:** Ekstrak teks dari gambar SECARA VISUAL dan LITERAL. Anda adalah mesin fotokopi, bukan penafsir.
2.  **Akurasi Total:** Salin setiap karakter, tanda baca, dan harakat (untuk teks Arab) persis seperti yang terlihat. JANGAN mengubah, mengoreksi, atau menghilangkan apa pun.
3.  **Bahasa:** Mendukung Bahasa Indonesia dan Arab. Jika tercampur, pertahankan urutan dan tata letak aslinya.
4.  **Teks Rusak:** Untuk bagian yang benar-benar tidak terbaca, gunakan placeholder \`[tidak terbaca]\`.
5.  **Tata Letak:** Pertahankan paragraf dan jeda baris sebisa mungkin. Jika teks dalam gambar bersambung dalam satu paragraf, JANGAN memecahnya menjadi paragraf baru di hasil. Jika ada beberapa gambar, gabungkan teksnya menjadi satu kesatuan yang utuh dan logis.
ATURAN SPESIFIK KALIGRAFI ISLAMI (PALING KRUSIAL):
-   **Tugas Anda adalah menyalin TEKS ARAB dari simbol kaligrafi, bukan mengganti simbolnya.**
-   Jika Anda melihat lafaz "Allah" diikuti kaligrafi "ﷻ" atau "جَلَّ جَلَالُهُ", hasil Anda harus "Allah ﷻ" atau "Allah جَلَّ جَلَالُهُ". JANGAN PERNAH menggantinya dengan "Allah ﷺ".
-   Jika Anda melihat nama "Muhammad" diikuti kaligrafi "ﷺ", hasil Anda harus "Muhammad ﷺ".
-   Jika Anda melihat nama Sahabat (contoh: "Abu Bakar", "An-Nu'man bin Basyir") diikuti kaligrafi "رضي الله عنه" atau "رضي الله عنهما", hasil Anda harus "Abu Bakar رضي الله عنه" atau "An-Nu'man bin Basyir رضي الله عنهما".
-   **KEGAGALAN UTAMA** adalah jika Anda melakukan interpretasi kontekstual. Contoh: mengganti "رضي الله عنه" menjadi "ﷺ", atau sebaliknya. JANGAN LAKUKAN ITU. Salin apa yang Anda lihat secara visual.
FORMAT OUTPUT FINAL (HANYA INI, TANPA KATA PEMBUKA/PENUTUP):
(Teks hasil pindai yang 100% akurat secara visual ada di sini)`;

            const payload = {
                "contents": [{
                    "parts": [
                        { "text": systemPrompt },
                        { "inline_data": { "mime_type": file.type, "data": base64Image } }
                    ]
                }]
            };

            // 4. Kirim request ke API
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            // 5. Tampilkan hasil
            outputText.value = text.trim();
            showSnackbar("Teks berhasil dipindai!");

        } catch (error) {
            console.error("OCR Error:", error);
            showSnackbar(`Error: ${error.message}`);
            outputText.value = `Gagal memindai teks. Coba lagi.\n\nDetail Error: ${error.message}`;
        } finally {
            // 6. Kembalikan UI ke keadaan normal
            loadingState.classList.add('hidden');
            initialState.classList.remove('hidden'); // Kembali ke tampilan awal
        }
    };

    // --- Fungsi Penanganan File (dari semua sumber) ---
    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.remove('hidden');
                initialState.classList.add('hidden');
            };
            reader.readAsDataURL(file);
            performOCR(file); // Langsung jalankan OCR setelah file dipilih
        } else {
            showSnackbar("Format file tidak didukung. Harap pilih gambar.");
        }
    };

    // --- Event Listener untuk Input ---
    uploadBtn.addEventListener('click', () => imageUploadInput.click());
    cameraBtn.addEventListener('click', () => cameraInput.click());
    imageUploadInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    cameraInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    // Drag and Drop
    imageDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropZone.classList.add('drag-over');
    });
    imageDropZone.addEventListener('dragleave', () => {
        imageDropZone.classList.remove('drag-over');
    });
    imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropZone.classList.remove('drag-over');
        handleFile(e.dataTransfer.files[0]);
    });
    imageDropZone.addEventListener('click', (e) => {
        // Mencegah klik di tombol memicu upload file lagi
        if (e.target.id === 'image-drop-zone' || e.target.closest('#initial-state')) {
            imageUploadInput.click();
        }
    });

    // Paste dari Clipboard
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                handleFile(items[i].getAsFile());
                break;
            }
        }
    });

    // --- Event Listener untuk Aksi Output ---
    copyBtn.addEventListener('click', () => {
        if (outputText.value) {
            navigator.clipboard.writeText(outputText.value)
                .then(() => showSnackbar("Teks berhasil disalin!"))
                .catch(() => showSnackbar("Gagal menyalin teks."));
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (outputText.value) {
            const blob = new Blob([outputText.value], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'hasil-ocr.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showSnackbar("Teks sedang diunduh.");
        }
    });
});
