async function pinterestScraper(query, limit = 10) {
    const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}&data=%7B%22options%22%3A%7B%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22scope%22%3A%22pins%22%2C%22rs%22%3A%22typed%22%7D%2C%22context%22%3A%7B%7D%7D`;

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        }
    });

    if (!res.ok) throw new Error(`Pinterest HTTP ${res.status}`);

    const json = await res.json();
    let results = json.resource_response?.data?.results || [];

    if (results.length === 0) {
        const altRes = await fetch(`https://pinterest-api-v1.p.rapidapi.com/search/pins?query=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }).catch(() => null);
        
        if (altRes && altRes.ok) {
            const altJson = await altRes.json();
            results = altJson.data || altJson.results || [];
        }
    }

    return results
        .map(item => {
            const images = item.images || item.pin_join?.images;
            if (!images) return null;
            return images.orig?.url || images['736x']?.url || images['600x']?.url || images['236x']?.url || null;
        })
        .filter(Boolean)
        .slice(0, limit);
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
