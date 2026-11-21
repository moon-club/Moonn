async function pinterestScraper(query, limit = 10) {
    const url = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}&rs=typed`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    };

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Pinterest HTTP ${res.status}`);

    const html = await res.text();
    
    const matches = [...html.matchAll(/"get_orig_url"\s*:\s*"(https:\/\/i\.pinimg\.com\/originals\/[^"]+)"/g)]
        .map(m => m[1])
        .concat([...html.matchAll(/"url"\s*:\s*"(https:\/\/i\.pinimg\.com\/736x\/[^"]+\.(?:jpg|png|webp))"/g)].map(m => m[1]));

    const uniqueUrls = [...new Set(matches)];

    return uniqueUrls.slice(0, limit);
}

export default {
    command: ['pinterest', 'pin', 'pins'],
    category: 'search',
    description: 'Busca imágenes en Pinterest de forma rápida.',
    run: async ({ msg, sock, usedPrefix, command, text }) => {
        const from = msg.chat;

        if (!text) {
            return msg.reply(`Escribe lo que quieres buscar en Pinterest.\nEjemplo: \`${usedPrefix + command} Hatsune Miku\``);
        }

        const partes = text.trim().split(/\s+/);
        let cantidadSolicitada = 5;
        const ultimoElemento = parseInt(partes[partes.length - 1]);

        if (!isNaN(ultimoElemento) && partes.length > 1) {
            cantidadSolicitada = ultimoElemento;
            partes.pop();
        }

        const busqueda = partes.join(' ');
        if (cantidadSolicitada < 1) cantidadSolicitada = 1;
        if (cantidadSolicitada > 10) cantidadSolicitada = 10;

        try {
            const resultados = await pinterestScraper(busqueda, cantidadSolicitada);

            if (resultados.length === 0) {
                return msg.reply(`No se encontraron imágenes para "${busqueda}".`);
            }

            for (let i = 0; i < resultados.length; i++) {
                await sock.sendMessage(from, {
                    image: { url: resultados[i] },
                    caption: i === 0 ? `✨ *Pinterest:* ${busqueda}` : ''
                }, { quoted: msg });
            }

        } catch (e) {
            console.error('[PINTEREST ERROR]:', e);
            await msg.reply('Ocurrió un error al realizar la búsqueda en Pinterest.');
        }
    }
};
