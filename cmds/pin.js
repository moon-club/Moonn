async function pinterestScraper(query, limit = 10) {
    const url = `https://id.pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}%26rs%3Dtyped&data=%7B%22options%22%3A%7B%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22scope%22%3A%22pins%22%2C%22rs%22%3A%22typed%22%7D%2C%22context%22%3A%7B%7D%7D`;

    const headers = {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
        'referer': 'https://id.pinterest.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'x-app-version': 'c056fb7',
        'x-pinterest-appstate': 'active',
        'x-pinterest-pws-handler': 'www/index.js',
        'x-pinterest-source-url': '/',
        'x-requested-with': 'XMLHttpRequest'
    };

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Pinterest HTTP ${res.status}`);

    const json = await res.json();
    
    console.log('[PINTEREST JSON COMPLETO]:', JSON.stringify(json, null, 2));

    const results = json.resource_response?.data?.results || json.resource_response?.data?.bookmark_results || [];

    return results
        .map(item => {
            const images = item.images || item.pin_join?.images;
            if (!images) return null;
            return images.orig?.url || images['600x']?.url || images['236x']?.url || null;
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
