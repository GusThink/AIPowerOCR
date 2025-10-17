document.addEventListener('DOMContentLoaded', () => {
    // Ambil semua elemen yang dibutuhkan
    const themeToggle = document.getElementById('theme-toggle');
    const imageDropZone = document.getElementById('image-drop-zone');
    const uploadInput = document.getElementById('upload-input');
    const uploadBtn = document.getElementById('upload-btn');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const placeholderText = document.getElementById('placeholder-text');
    const loadingAnimation = document.getElementById('loading-animation');
    const textOutput = document.getElementById('text-output');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const clearBtn = document.getElementById('clear-btn');
    const refreshBtn = document.getElementById('refresh-btn');

    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');
    const closeModalBtn = document.querySelector('.close-modal-btn');
    
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('sidebar');

    let cropper = null;
    let originalImageData = { base64: null, mimeType: null };

    // Fungsi untuk menampilkan pop-up/modal
    function showModal(title, message) {
        modalBody.innerHTML = `<h3>${title}</h3><p>${message}</p>`;
        modal.style.display = 'block';
    }

    closeModalBtn.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    // Fungsi untuk sidebar
    openSidebarBtn.onclick = () => { sidebar.style.width = '250px'; };
    closeSidebarBtn.onclick = () => { sidebar.style.width = '0'; };

    // Fungsi mode gelap/terang
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            themeToggle.textContent = '☀️';
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.textContent = '🌙';
        }
    });

    // Fungsi untuk menangani file gambar
    const handleFile = (file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                placeholderText.style.display = 'none';
                imagePreviewContainer.style.display = 'block';

                if (cropper) {
                    cropper.destroy();
                }
                cropper = new Cropper(imagePreview, {
                    viewMode: 1,
                    background: false,
                    autoCropArea: 1,
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Event Listener untuk upload
    uploadBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

    // Event listener untuk drag & drop
    imageDropZone.addEventListener('dragover', (e) => e.preventDefault());
    imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFile(e.dataTransfer.files[0]);
    });

    // Event listener untuk paste dari clipboard
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                handleFile(item.getAsFile());
                break;
            }
        }
    });

    // Fungsi utama untuk mengekstrak teks
    async function extractText() {
        if (!cropper) {
            showModal('Error', 'Silakan pilih atau tempel gambar terlebih dahulu.');
            return;
        }

        loadingAnimation.style.display = 'flex';
        textOutput.value = '';
        showModal('Proses', 'AI sedang memulai proses ekstraksi. Mohon tunggu...');

        const canvas = cropper.getCroppedCanvas();
        const mimeType = 'image/png';
        const base64Image = canvas.toDataURL(mimeType).split(',')[1];
        
        try {
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image, mimeType: mimeType }),
            });

            if (!response.ok) {
                throw new Error(`Server merespons dengan status: ${response.status}`);
            }

            const result = await response.json();
            textOutput.value = result.text;
            showModal('Sukses!', 'Teks berhasil diekstrak dari gambar.');

        } catch (error) {
            console.error('Error:', error);
            showModal('Gagal!', 'Terjadi kesalahan saat mengekstrak teks. Silakan coba lagi.');
        } finally {
            loadingAnimation.style.display = 'none';
        }
    }
    
    // Tombol refresh/ulangi akan memanggil fungsi ekstrak
    refreshBtn.addEventListener('click', extractText);
    
    // Fungsi tombol di bawah kolom output
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(textOutput.value);
        showModal('Info', 'Teks berhasil disalin ke clipboard.');
    });

    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([textOutput.value], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'hasil-ocr.txt';
        a.click();
        URL.revokeObjectURL(a.href);
    });

    clearBtn.addEventListener('click', () => {
        textOutput.value = '';
    });
});