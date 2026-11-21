import db from '#db';
import * as baileys from '@whiskeysockets/baileys';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    if (!json.resource_response?.data?.results) return [];

    return json.resource_response.data.results
        .map(item => {
            if (!item.images) return null;
            return item.images.orig?.url || item.images['600x']?.url || item.images['236x']?.url || null;
        })
        .filter(Boolean)
        .slice(0, limit);
}

// Función nativa para generar el álbum de WhatsApp
async function sendAlbumMessage(sock, jid, urls, caption, quoted) {
    // 1. Crear y enviar el contenedor del álbum
    const album = baileys.generateWAMessageFromContent(
        jid,
        { 
            messageContextInfo: {}, 
            albumMessage: { expectedImageCount: urls.length } 
        },
        quoted ? { quoted } : {}
    );
    await sock.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id });

    // 2. Subir y vincular cada imagen al contenedor del álbum
    for (let i = 0; i < urls.length; i++) {
        const img = await baileys.generateWAMessage(
            album.key.remoteJid,
            { image: { url: urls[i] }, ...(i === 0 ? { caption } : {}) },
            { upload: sock.waUploadToServer }
        );

        img.message.messageContextInfo = {
            messageAssociation: { associationType: 1, parentMessageKey: album.key }
        };

        await sock.relayMessage(img.key.remoteJid, img.message, { messageId: img.key.id });
        await delay(300); // Pequeño delay para no colapsar la conexión
    }
}

export default {
    command: ['pinterest', 'pinn', 'pins', 'setpins', 'setpin', 'pinsconfig', 'pinoff', 'pinon', 'togglepin'],
    category: 'search',
    description: 'Busca imágenes en Pinterest o gestiona los ajustes del grupo.',
    run: async ({ msg, sock, usedPrefix, command, text }) => {
        const from = msg.chat;
        const isGroup = from.endsWith('@g.us');
        const cmd = command.toLowerCase();

        // Obtener datos del chat desde tu #db
        const chat = isGroup ? (db.getChat(from) || {}) : {};
        
        // Valores por defecto si aún no existen en la base de datos del grupo
        if (isGroup) {
            if (typeof chat.pinterest === 'undefined') chat.pinterest = true;
            if (typeof chat.pinLimit === 'undefined') chat.pinLimit = 5;
        }

        // LÓGICA DIRECTA PINOFF / PINON / TOGGLEPIN
        if (['pinoff', 'pinon', 'togglepin'].includes(cmd)) {
            if (!isGroup) {
                return msg.reply('⚠️ _Este comando solo funciona en grupos._');
            }

            let nuevoEstado;
            if (cmd === 'pinoff') {
                nuevoEstado = false;
            } else if (cmd === 'pinon') {
                nuevoEstado = true;
            } else {
                nuevoEstado = !chat.pinterest;
            }

            chat.pinterest = nuevoEstado;
            if (typeof db.save === 'function') db.save();

            return sock.reply(from, `⚡ *Búsquedas de Pinterest en este grupo:* ${nuevoEstado ? '🟢 *ACTIVADAS*' : '🔴 *DESACTIVADAS*'}`, msg);
        }

        // LÓGICA DE CONFIGURACIÓN (setpins, setpin, pinsconfig)
        if (['setpins', 'setpin', 'pinsconfig'].includes(cmd)) {
            if (!isGroup) {
                return msg.reply('⏳ _Este comando solo se puede usar en grupos._');
            }

            const args = text ? text.trim().split(/\s+/) : [];
            const opcion = args[0]?.toLowerCase();

            if (opcion === 'activar') {
                chat.pinterest = true;
                if (typeof db.save === 'function') db.save();
                return sock.reply(from, '✨ *Pinterest Activado* en este grupo.', msg);
            }

            if (opcion === 'desactivar') {
                chat.pinterest = false;
                if (typeof db.save === 'function') db.save();
                return sock.reply(from, '⚡ *Pinterest Desactivado* en este grupo.', msg);
            }

            const cantidad = parseInt(opcion);
            if (!isNaN(cantidad)) {
                if (cantidad < 1 || cantidad > 15) {
                    return msg.reply('⚠️ _El límite de imágenes debe ser entre 1 y 15._');
                }

                chat.pinLimit = cantidad;
                if (typeof db.save === 'function') db.save();
                return sock.reply(from, `✅ *Límite por defecto configurado a:* ${cantidad} imágenes.`, msg);
            }

            const menu = 
`⚙️ *CONFIGURACIÓN DE PINTEREST*

📌 *Estado actual:* ${chat.pinterest ? '✅ Activo' : '❌ Inactivo'}
🔢 *Límite predeterminado:* ${chat.pinLimit} imágenes

*Uso de comandos:*
• \`${usedPrefix}setpins activar\`
• \`${usedPrefix}setpins desactivar\`
• \`${usedPrefix}setpins <1-15>\` (Ejemplo: \`${usedPrefix}setpins 5\`)
• \`${usedPrefix}pinoff\` / \`${usedPrefix}pinon\` / \`${usedPrefix}togglepin\``;

            return sock.reply(from, menu, msg);
        }

        // LÓGICA DE BÚSQUEDA (pinterest, pin, pins)
        if (isGroup && !chat.pinterest) {
            return msg.reply('⚡ _El comando de Pinterest está desactivado en este grupo._');
        }

        if (!text) {
            return msg.reply(
                `🌸 *(｡•́︿•̀｡) Escribe qué quieres buscar y opcionalmente la cantidad.*\n\n> Ejemplos:\n> \`${usedPrefix + command} Hatsune miku\`\n> \`${usedPrefix + command} Hatsune miku 15\``
            );
        }

        // Extraer término y cantidad
        const partes = text.trim().split(/\s+/);
        let cantidadSolicitada = null;
        const ultimoElemento = parseInt(partes[partes.length - 1]);

        if (!isNaN(ultimoElemento) && partes.length > 1) {
            cantidadSolicitada = ultimoElemento;
            partes.pop();
        }

        const busqueda = partes.join(' ');
        const limiteGrupo = isGroup ? chat.pinLimit : 5;
        let limiteFinal = cantidadSolicitada !== null ? cantidadSolicitada : limiteGrupo;

        // Límites estrictos (mínimo 1, máximo 15)
        if (limiteFinal < 1) limiteFinal = 1;
        if (limiteFinal > 15) limiteFinal = 15;

        try {
            const resultados = await pinterestScraper(busqueda, limiteFinal);

            if (resultados.length === 0) {
                return msg.reply(`(*꒦ິ꒳꒦ີ) No se encontraron imágenes para "${busqueda}".`);
            }

            const infoCaption = 
`╭─⬣「 ✨ *PINTEREST SEARCH* ✨ 」
├ ❀ *Búsqueda:* ${busqueda}
├ ❀ *Imágenes enviadas:* ${resultados.length}
╰━─━─━─≪✿≫─━─━─━╯`;

            // Si se requiere 1 sola imagen, la envía como mensaje simple
            if (resultados.length === 1) {
                return await sock.sendMessage(from, {
                    image: { url: resultados[0] },
                    caption: infoCaption
                }, { quoted: msg });
            }

            // Si son 2 o más (hasta máximo 15), se envía como álbum nativo
            await sendAlbumMessage(sock, from, resultados, infoCaption, msg);

        } catch (e) {
            console.error(e);
            await msg.reply('💔 Ocurrió un error al realizar la búsqueda en Pinterest.');
        }
    }
};
