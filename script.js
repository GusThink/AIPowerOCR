document.addEventListener('DOMContentLoaded', () => {
    // === DOM Element Selections ===
    const themeToggle = document.getElementById('theme-toggle');
    const imageDropZone = document.getElementById('image-drop-zone');
    const uploadInput = document.getElementById('upload-input');
    const uploadBtn = document.getElementById('upload-btn');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const placeholderText = document.getElementById('placeholder-text');
    const loadingAnimation = document.getElementById('loading-animation');
    const loadingText = document.getElementById('loading-text');
    const textOutput = document.getElementById('text-output');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const extractBtn = document.getElementById('extract-btn');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');
    const viewModeBtn = document.getElementById('view-mode-btn');
    const mainContainer = document.getElementById('main-container');
    const apiKeyInput = document.getElementById('api-key-input');

    let cropper = null;

    // === The master prompt for Gemini Vision OCR ===
    const GEMINI_OCR_PROMPT = `Anda adalah AI OCR Assistant dengan tingkat presisi tertinggi, yang bertugas sebagai pemindai visual murni.

ATURAN MUTLAK:
1.  **Tugas Inti:** Ekstrak teks dari gambar SECARA VISUAL dan LITERAL. Anda adalah mesin fotokopi, bukan penafsir.
2.  **Akurasi Total:** Salin setiap karakter, tanda baca, dan harakat (untuk teks Arab) persis seperti yang terlihat. JANGAN mengubah, mengoreksi, atau menghilangkan apa pun.
3.  **Bahasa:** Mendukung Bahasa Indonesia dan Arab. Jika tercampur, pertahankan urutan dan tata letak aslinya.
4.  **Teks Rusak:** Untuk bagian yang benar-benar tidak terbaca, gunakan placeholder \`[tidak terbaca]\`.
5.  **Tata Letak:** Pertahankan paragraf dan jeda baris sebisa mungkin. Jika teks dalam gambar bersambung dalam satu paragraf, JANGAN memecahnya menjadi paragraf baru di hasil.

ATURAN SPESIFIK KALIGRAFI ISLAMI (PALING KRUSIAL):
-   Jika Anda melihat lafaz "Allah" diikuti kaligrafi "ﷻ" atau "جَلَّ جَلَالُهُ", hasil Anda harus "Allah ﷻ" atau "Allah جَلَّ جَلَالُهُ".
-   Jika Anda melihat nama "Muhammad" diikuti kaligrafi "ﷺ", hasil Anda harus "Muhammad ﷺ".
-   Jika Anda melihat nama Sahabat diikuti kaligrafi "رضي الله عنه" atau "رضي الله عنهما", hasil Anda harus "Abu Bakar رضي الله عنه".

FORMAT OUTPUT FINAL (HANYA INI, TANPA KATA PEMBUKA/PENUTUP):
(Teks hasil pindai yang 100% akurat secara visual ada di sini)`;


    // === API Key Management ===
    apiKeyInput.value = localStorage.getItem('geminiApiKey') || '';
    apiKeyInput.addEventListener('input', (e) => {
        localStorage.setItem('geminiApiKey', e.target.value);
    });

    // === UI Management Functions ===
    const showModal = (title, message) => {
        modalBody.innerHTML = `<h3>${title}</h3><p>${message}</p>`;
        modal.style.display = 'block';
    };

    closeModalBtn.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    openSidebarBtn.onclick = () => { sidebar.style.width = '280px'; };
    closeSidebarBtn.onclick = () => { sidebar.style.width = '0'; };

    themeToggle.addEventListener('click', () => {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', newTheme);
        
        themeToggle.querySelector('.sun-icon').style.display = newTheme === 'light' ? 'block' : 'none';
        themeToggle.querySelector('.moon-icon').style.display = newTheme === 'dark' ? 'block' : 'none';
    });
    
    const viewModes = ['desktop', 'tablet', 'mobile'];
    let currentModeIndex = 0;
    viewModeBtn.addEventListener('click', () => {
        currentModeIndex = (currentModeIndex + 1) % viewModes.length;
        const newMode = viewModes[currentModeIndex];
        mainContainer.classList.remove('view-desktop', 'view-tablet', 'view-mobile');
        if (newMode !== 'desktop') mainContainer.classList.add(`view-${newMode}`);
        
        viewModeBtn.querySelectorAll('svg').forEach(icon => icon.style.display = 'none');
        viewModeBtn.querySelector(`.${newMode}-icon`).style.display = 'block';
    });

    // === Image Handling ===
    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                placeholderText.style.display = 'none';
                imagePreviewContainer.style.display = 'block';
                if (cropper) cropper.destroy();
                cropper = new Cropper(imagePreview, { viewMode: 1, background: false, autoCropArea: 1 });
            };
            reader.readAsDataURL(file);
        }
    };
    
    uploadBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    imageDropZone.addEventListener('dragover', (e) => e.preventDefault());
    imageDropZone.addEventListener('drop', (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); });
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.includes('image')) { handleFile(item.getAsFile()); break; }
        }
    });

    const imageBlobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
            mimeType: blob.type,
            data: reader.result.split(',')[1]
        });
        reader.onerror = error => reject(error);
        reader.readAsDataURL(blob);
    });

    // === Main Gemini API Call Function ===
    const callGeminiAPI = async (payload) => {
        const apiKey = localStorage.getItem('geminiApiKey');
        if (!apiKey) {
            showModal('Error', 'Kunci API Gemini belum diatur. Silakan masukkan di menu.');
            openSidebar();
            return null;
        }

        // DIUBAH: Menggunakan model Gemini Flash yang lebih baru
        const modelName = 'gemini-1.5-flash-latest';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            throw new Error(errorData.error.message || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (result.candidates?.[0]?.finishReason === 'SAFETY') {
            throw new Error("Permintaan diblokir oleh filter keamanan Google.");
        }
        if (!text) {
            console.error("Invalid API Response:", result);
            throw new Error("Respons dari AI tidak valid atau tidak mengandung teks.");
        }
        return text;
    };
    
    // === Extract Text Logic ===
    const extractText = async () => {
        if (!cropper) {
            showModal('Error', 'Silakan pilih atau tempel gambar terlebih dahulu.');
            return;
        }

        loadingAnimation.style.display = 'flex';
        textOutput.value = '';

        try {
            loadingText.textContent = `Mengubah format gambar...`;
            const canvas = cropper.getCroppedCanvas();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const { mimeType, data: base64ImageData } = await imageBlobToBase64(blob);

            loadingText.textContent = `AI sedang memindai...`;

            const payload = {
                contents: [{
                    parts: [
                        { text: GEMINI_OCR_PROMPT },
                        { inlineData: { mimeType, data: base64ImageData } }
                    ]
                }]
            };

            const resultText = await callGeminiAPI(payload);
            
            textOutput.value = resultText;
            showModal('Sukses!', 'Teks berhasil diekstrak!');

        } catch (error) {
            console.error("Extraction Error:", error);
            showModal('Gagal!', `Terjadi kesalahan: ${error.message}`);
        } finally {
            loadingAnimation.style.display = 'none';
        }
    };
    
    extractBtn.addEventListener('click', extractText);
    
    // === Output Button Functions ===
    copyBtn.addEventListener('click', () => {
        if (textOutput.value) {
            navigator.clipboard.writeText(textOutput.value);
            showModal('Info', 'Teks berhasil disalin ke clipboard.');
        }
    });

    clearBtn.addEventListener('click', () => {
        textOutput.value = '';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        imagePreview.src = '';
        imagePreviewContainer.style.display = 'none';
        placeholderText.style.display = 'block';
    });

    // Initial UI setup
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.querySelector('.sun-icon').style.display = 'block';
    themeToggle.querySelector('.moon-icon').style.display = 'none';
    viewModeBtn.querySelectorAll('svg').forEach(icon => icon.style.display = 'none');
    viewModeBtn.querySelector('.desktop-icon').style.display = 'block';
});

