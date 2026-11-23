import { createCanvas, loadImage } from '@napi-rs/canvas';
import db from '#db';

export default {
    command: ['tarjeta2', 'card2'],
    category: 'profile',
    description: 'Genera una tarjeta de perfil usando Canvas local.',
    run: async ({ msg, sock }) => {
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
            const bio = (userGlobal.description || 'Sin descripción definida.').slice(0, 50);

            const canvas = createCanvas(800, 400);
            const ctx = canvas.getContext('2d');

            const bg = ctx.createLinearGradient(0, 0, 800, 400);
            bg.addColorStop(0, '#0f172a');
            bg.addColorStop(0.5, '#1e1b4b');
            bg.addColorStop(1, '#090d16');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, 800, 400);

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.strokeRect(10, 10, 780, 380);

            ctx.fillStyle = '#1e293b';
            ctx.fillRect(240, 175, 240, 75);
            ctx.fillRect(500, 175, 240, 75);
            ctx.fillRect(240, 270, 500, 65);

            try {
                const ppUrl = await sock.profilePictureUrl(userId, 'image');
                const avatar = await loadImage(ppUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(130, 150, 80, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 50, 70, 160, 160);
                ctx.restore();
            } catch {
                ctx.fillStyle = '#334155';
                ctx.beginPath();
                ctx.arc(130, 150, 80, 0, Math.PI * 2, true);
                ctx.fill();
            }

            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.roundRect(60, 250, 140, 35, 18);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`NIVEL ${level}`, 130, 273);

            ctx.textAlign = 'left';
            ctx.font = 'bold 32px sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(name, 240, 100);

            ctx.font = '16px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`"${bio}"`, 240, 135);

            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('CARTERA', 260, 205);
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${coins} ${currency}`, 260, 235);

            ctx.font = 'bold 14px sans-serif';
            ctx.fillStyle = '#a855f7';
            ctx.fillText('BANCO', 520, 205);
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${bank} ${currency}`, 520, 235);

            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#f43f5e';
            ctx.fillText(`Salud: ${health}%`, 265, 310);
            ctx.fillStyle = '#eab308';
            ctx.fillText(`Stamina: ${stamina}%`, 430, 310);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`XP: ${exp}`, 600, 310);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(msg.chat, {
                image: buffer,
                caption: `🪪 *Tarjeta de Perfil de ${name}*`
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta con Canvas.');
        }
    }
};
