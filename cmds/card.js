import Jimp from 'jimp';
import db from '#db';

export default {
    command: ['card', 'tarjeta', 'id'],
    category: 'profile',
    description: 'Genera una tarjeta visual de perfil.',
    run: async ({ msg, sock }) => {
        try {
            // 1. Obtener usuario objetivo
            const userId = msg.mentionedJid?.[0] || msg.quoted?.sender || msg.sender;
            const user = db.getChatUser(msg.chat, userId);

            if (!user) {
                return msg.reply('《✧》 El usuario no está registrado en la base de datos.');
            }

            // 2. Extraer datos de la DB
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const settings = db.getSettings(botId) || {};
            const currency = settings.currency || 'Coins';
            const userGlobal = db.getUser(userId) || {};

            const name = (userGlobal.name || msg.pushName || 'Usuario').slice(0, 22);
            const level = userGlobal.level || 0;
            const exp = userGlobal.exp || 0;
            const coins = Number(user.coins || userGlobal.coins || 0).toLocaleString();
            const bank = Number(user.bank || userGlobal.bank || 0).toLocaleString();
            const health = user.health ?? 100;
            const stamina = user.stamina ?? 100;
            const bio = (userGlobal.description || 'Sin descripción definida.').slice(0, 48);

            // 3. Crear lienzo base (800x400 px) en color azul oscuro (#0f172a)
            const card = new Jimp(800, 400, '#0f172a');

            // Borde exterior cian (#38bdf8) y marco interior (#1e1b4b)
            const border = new Jimp(788, 388, '#38bdf8');
            const innerBg = new Jimp(780, 380, '#1e1b4b');
            card.composite(border, 6, 6);
            card.composite(innerBg, 10, 10);

            // Cajas de fondo para estadísticas (#090d16)
            const boxWallet = new Jimp(240, 75, '#090d16');
            const boxBank = new Jimp(240, 75, '#090d16');
            const boxStats = new Jimp(500, 65, '#090d16');
            const levelBadge = new Jimp(140, 36, '#a855f7');

            card.composite(boxWallet, 240, 175);
            card.composite(boxBank, 500, 175);
            card.composite(boxStats, 240, 270);
            card.composite(levelBadge, 60, 255);

            // 4. Obtener y procesar foto de perfil en círculo
            try {
                const ppUrl = await sock.profilePictureUrl(userId, 'image');
                const avatar = await Jimp.read(ppUrl);
                avatar.resize(160, 160).circle();
                card.composite(avatar, 50, 70);
            } catch {
                // Si no tiene foto pública, dibuja un círculo gris oscuro
                const defaultAvatar = new Jimp(160, 160, '#334155');
                defaultAvatar.circle();
                card.composite(defaultAvatar, 50, 70);
            }

            // 5. Cargar fuentes integradas de Jimp (no requieren archivos externos)
            const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

            // 6. Escribir textos en la tarjeta
            card.print(fontMedium, 85, 265, `NIVEL ${level}`);
            
            card.print(fontTitle, 240, 65, name);
            card.print(fontMedium, 240, 115, `"${bio}"`);

            card.print(fontMedium, 255, 188, 'CARTERA');
            card.print(fontMedium, 255, 218, `${coins} ${currency}`);

            card.print(fontMedium, 515, 188, 'BANCO');
            card.print(fontMedium, 515, 218, `${bank} ${currency}`);

            card.print(fontMedium, 260, 293, `Salud: ${health}%   |   Stamina: ${stamina}%   |   XP: ${exp}`);

            // 7. Convertir a Buffer PNG y enviar
            const pngBuffer = await card.getBufferAsync(Jimp.MIME_PNG);

            await sock.sendMessage(msg.chat, {
                image: pngBuffer,
                caption: `🪪 *Tarjeta de Perfil de ${userGlobal.name || 'Usuario'}*`
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta.');
        }
    }
};
