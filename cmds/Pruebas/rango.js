import { createCanvas, loadImage } from '@napi-rs/canvas';
import { drawVectorText } from '../../lib/vectorText.js';
import db from '#db';

export default {
    command: ['rango', 'topcard', 'badge'],
    category: 'profile',
    description: 'Genera una tarjeta de rango y estadísticas usando vectores.',
    run: async ({ msg, sock }) => {
        try {
            const userId = msg.mentionedJid?.[0] || msg.quoted?.sender || msg.sender;
            const userGlobal = db.getUser(userId) || {};

            const name = (userGlobal.name || msg.pushName || 'Usuario').slice(0, 20);
            const level = userGlobal.level || 1;
            const exp = userGlobal.exp || 0;
            const rank = userGlobal.rank || '#42'; // Rango de posición global simulado o de BD

            // Lienzo de 800x300 (Diseño de barra/banner horizontal)
            const canvas = createCanvas(800, 300);
            const ctx = canvas.getContext('2d');

            // 1. Fondo Degradado Oscuro con acento Esmeralda/Azul
            const bg = ctx.createLinearGradient(0, 0, 800, 300);
            bg.addColorStop(0, '#064e3b'); // Verde esmeralda oscuro
            bg.addColorStop(0.5, '#0f172a'); // Azul pizarra oscuro
            bg.addColorStop(1, '#020617');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, 800, 300);

            // Líneas de diseño tecnológico de fondo
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.08)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 800; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 300);
                ctx.stroke();
            }

            // 2. Marco exterior
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.strokeRect(12, 12, 776, 276);

            // 3. Panel central de información
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.beginPath();
            ctx.roundRect(230, 45, 530, 210, 14);
            ctx.fill();
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.stroke();

            // 4. Avatar con marco circular verde esmeralda
            try {
                const ppUrl = await sock.profilePictureUrl(userId, 'image');
                const avatar = await loadImage(ppUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(125, 150, 70, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatar, 55, 80, 140, 140);
                ctx.restore();
            } catch {
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(125, 150, 70, 0, Math.PI * 2, true);
                ctx.fill();
            }

            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(125, 150, 70, 0, Math.PI * 2, true);
            ctx.stroke();

            // 5. RENDERIZADO DE TEXTOS CON EL VECTORIZADOR
            // Título superior o etiqueta de estado
            drawVectorText(ctx, 'ESTADO DE CLASIFICACION', 260, 80, {
                size: 11,
                color: '#34d399',
                lineWidth: 1.8
            });

            // Nombre del usuario principal
            drawVectorText(ctx, name, 260, 120, {
                size: 22,
                color: '#ffffff',
                lineWidth: 2.5,
                maxWidth: 350,
                shadowColor: '#10b981',
                shadowBlur: 6
            });

            // Insignia de Rango Global (Derecha)
            ctx.fillStyle = '#065f46';
            ctx.beginPath();
            ctx.roundRect(620, 68, 115, 45, 10);
            ctx.fill();
            ctx.strokeStyle = '#34d399';
            ctx.stroke();

            drawVectorText(ctx, 'RANK', 677, 85, { size: 9, color: '#94a3b8', lineWidth: 1.5, align: 'center' });
            drawVectorText(ctx, rank, 677, 106, { size: 16, color: '#34d399', lineWidth: 2, align: 'center' });

            // Estadísticas inferiores (Nivel y Experiencia)
            drawVectorText(ctx, `NIVEL ACTUAL: ${level}`, 260, 175, {
                size: 13,
                color: '#f8fafc',
                lineWidth: 1.8
            });

            drawVectorText(ctx, `PUNTOS DE EXPERIENCIA: ${exp} XP`, 260, 215, {
                size: 12,
                color: '#94a3b8',
                lineWidth: 1.6
            });

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(msg.chat, {
                image: buffer,
                caption: `🏆 *Reporte de Rango para ${name}*`
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta de rango.');
        }
    }
};
