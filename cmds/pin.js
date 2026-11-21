async function pinterestScraper(query, limit = 10) {
    const url = `https://deliriussapiens.onrender.com/api/pinterest?query=${encodeURIComponent(query)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`API HTTP ${res.status}`);

    const json = await res.json();
    const results = json.resultado || json.results || json.data || [];

    return results.slice(0, limit);
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

            if (!resultados || resultados.length === 0) {
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
