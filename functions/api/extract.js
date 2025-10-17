// Aturan Mutlak dan Prompt untuk AI
const AI_PROMPT = `Anda adalah AI OCR Assistant dengan tingkat presisi tertinggi, yang bertugas sebagai pemindai visual murni.

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


export async function onRequest(context) {
    // Hanya izinkan metode POST
    if (context.request.method !== 'POST') {
        return new Response('Metode tidak diizinkan', { status: 405 });
    }

    try {
        const { image, mimeType } = await context.request.json();
        const apiKey = context.env.GOOGLE_API_KEY;

        if (!image || !mimeType) {
            return new Response('Data gambar tidak lengkap', { status: 400 });
        }

        if (!apiKey) {
             return new Response('Kunci API Google tidak dikonfigurasi', { status: 500 });
        }

        // Memanggil Google Gemini Vision API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: AI_PROMPT },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: image,
                            },
                        },
                    ],
                }],
            }),
        });

        if (!response.ok) {
            // TAMBAHKAN LOG INI untuk melihat pesan error dari Google
            const errorText = await response.text();
            console.error("Google AI API error response:", errorText);
            return new Response('Gagal berkomunikasi dengan Google AI', { status: response.status });
        }

        const data = await response.json();

        // TAMBAHKAN LOG INI untuk melihat struktur data yang berhasil
        console.log("Google AI success response:", JSON.stringify(data, null, 2));
        
        // Cek jika respons tidak memiliki teks yang diharapkan
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0].text) {
            console.error("Struktur respons Google AI tidak valid atau teks tidak ditemukan.");
            return new Response('Struktur respons AI tidak valid', { status: 500 });
        }

        const extractedText = data.candidates[0].content.parts[0].text;
        
        return new Response(JSON.stringify({ text: extractedText }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error di Cloudflare Function:', error);
        return new Response('Terjadi kesalahan internal', { status: 500 });
    }

}
