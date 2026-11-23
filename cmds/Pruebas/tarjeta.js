import { createCanvas, loadImage } from '@napi-rs/canvas';
import db from '#db';

export default {
    command: ['tarjeta2', 'card2'],
    category: 'profile',
    description: 'Genera una tarjeta de perfil moderna y rediseñada.',
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
            const bio = (userGlobal.description || 'Sin descripción definida.').slice(0, 45);

            // Lienzo de alta resolución para nitidez
            const canvas = createCanvas(900, 450);
            const ctx = canvas.getContext('2d');

            // 1. Fondo Degradado Estilo Cyberpunk / Neón
            const bg = ctx.createLinearGradient(0, 0, 900, 450);
            bg.addColorStop(0, '#090d16');
            bg.addColorStop(0.5, '#131128');
            bg.addColorStop(1, '#05070b');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, 900, 450);

            // Líneas decorativas de fondo (Grid tecnológico)
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 900; i += 30) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 450);
                ctx.stroke();
            }

            // 2. Marco exterior brillante con esquinas biseladas
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 10;
            ctx.strokeRect(15, 15, 870, 420);
            ctx.shadowBlur = 0; // Limpiar sombra para elementos internos

            // 3. Tarjetas / Paneles de Estadísticas (Estructura visual limpia)
            // Panel Cartera
            ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
            ctx.beginPath();
            ctx.roundRect(280, 180, 270, 85, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.stroke();

            // Panel Banco
            ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
            ctx.beginPath();
            ctx.roundRect(570, 180, 290, 85, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.stroke();

            // Panel Barra de Estado Inferior (Salud / Stamina / XP)
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.beginPath();
            ctx.roundRect(280, 285, 580, 110, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.stroke();

            // 4. Avatar Circular con Marco Neón
            try {
                const ppUrl = await sock.profilePictureUrl(userId, 'image');
                const avatar = await loadImage(ppUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(140, 175, 85, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 55, 90, 170, 170);
                ctx.restore();
            } catch {
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(140, 175, 85, 0, Math.PI * 2, true);
                ctx.fill();
            }

            // Anillo exterior del avatar
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(140, 175, 85, 0, Math.PI * 2, true);
            ctx.stroke();

            // 5. Insignia de Nivel
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.roundRect(75, 280, 130, 40, 20);
            ctx.fill();

            // 6. Barras de progreso visuales para Salud y Stamina (Barras geométricas reales)
            // Barra de Salud
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(310, 335, 220, 12);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(310, 335, Math.max(0, Math.min(220, (220 * health) / 100)), 12);

            // Barra de Stamina
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(580, 335, 220, 12);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(580, 335, Math.max(0, Math.min(220, (220 * stamina) / 100)), 12);

            // 7. Textos y Etiquetas (Ubicados de forma precisa)
            // Nivel
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`NIVEL ${level}`, 140, 306);

            // Nombre del usuario
            ctx.textAlign = 'left';
            ctx.font = 'bold 30px sans-serif';
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(name, 280, 95);

            // Biografía
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`"${bio}"`, 280, 130);

            // Títulos de Cartera y Banco
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('⚡ CARTERA', 300, 208);
            ctx.fillStyle = '#a855f7';
            ctx.fillText('🏦 BANCO', 590, 208);

            // Valores de Dinero
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`${coins} ${currency}`, 300, 243);
            ctx.fillText(`${bank} ${currency}`, 590, 243);

            // Textos de Barras (Salud, Stamina y XP)
            ctx.font = 'bold 13px sans-serif';
            ctx.fillStyle = '#f43f5e';
            ctx.fillText(`❤️ Salud: ${health}%`, 310, 323);

            ctx.fillStyle = '#eab308';
            ctx.fillText(`⚡ Stamina: ${stamina}%`, 580, 323);

            ctx.fillStyle = '#38bdf8';
            ctx.fillText(`✨ Experiencia Total (XP): ${exp}`, 310, 375);

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(msg.chat, {
                image: buffer,
                caption: `🪪 *Tarjeta de Perfil de ${name}*`
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta rediseñada.');
        }
    }
};
