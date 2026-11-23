import Jimp from 'jimp';
import db from '#db';

export default {
    command: ['card', 'tarjeta', 'id'],
    category: 'profile',
    description: 'Genera una tarjeta visual de perfil usando Jimp.',
    run: async ({ msg, sock, usedPrefix, command }) => {
        try {
            const userId = msg.mentionedJid?.[0] || msg.quoted?.sender || msg.sender;
            const user = db.getChatUser(msg.chat, userId);

            if (!user) {
                return msg.reply('《✧》 El usuario no está registrado en la base de datos.');
            }

            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const settings = db.getSettings(botId) || {};
            const currency = settings.currency || 'Coins';
            const userGlobal = db.getUser(userId) || {};

            const name = userGlobal.name || msg.pushName || 'Usuario';
            const level = userGlobal.level || 0;
            const exp = userGlobal.exp || 0;
            const coins = Number(user.coins || userGlobal.coins || 0).toLocaleString();
            const bank = Number(user.bank || userGlobal.bank || 0).toLocaleString();
            const health = user.health ?? 100;
            const stamina = user.stamina ?? 100;
            const bio = (userGlobal.description || 'Sin descripción definida.').slice(0, 45);

            // Crear la imagen base de la tarjeta (800x400 píxeles con fondo oscuro)
            const card = new Jimp(800, 400, 0x0f172aff);

            // Cargar una fuente predeterminada de Jimp (FONT_SANS_32_WHITE, FONT_SANS_16_WHITE, etc.)
            const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
            const fontBold = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

            // Intentar cargar la foto de perfil de WhatsApp
            try {
                const ppUrl = await sock.profilePictureUrl(userId, 'image');
                if (ppUrl) {
                    const avatar = await Jimp.read(ppUrl);
                    avatar.resize(150, 150);
                    // Crear círculo para el avatar
                    avatar.circle();
                    card.composite(avatar, 50, 70);
                }
            } catch {
                // Si no tiene foto, se omite o dibuja un marcador
            }

            // Escribir textos en la tarjeta
            card.print(fontTitle, 230, 80, name);
            card.print(fontSubtitle, 230, 130, `"${bio}"`);
            
            // Estadísticas
            card.print(fontBold, 230, 180, `Nivel: ${level}`);
            card.print(fontBold, 230, 220, `Cartera: ${coins} ${currency}`);
            card.print(fontBold, 230, 260, `Banco: ${bank} ${currency}`);
            card.print(fontBold, 230, 300, `Salud: ${health}%  |  Stamina: ${stamina}%  |  XP: ${exp}`);

            // Convertir a buffer y enviar
            const buffer = await card.getBufferAsync(Jimp.MIME_PNG);

            await sock.sendMessage(msg.chat, {
                image: buffer,
                caption: `🪪 *Tarjeta de Perfil de ${name}*`
            }, { quoted: msg });

        } catch (error) {
            console.error('Error en card.js:', error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta.');
        }
    }
};
