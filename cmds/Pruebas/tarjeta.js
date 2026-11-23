import { createCanvas, loadImage } from '@napi-rs/canvas';
import db from '#db';

// Diccionario vectorial de caracteres (coordenadas normalizadas de 0 a 1)
const GLYPHS = {
    A: [[0,1],[0.5,0],[1,1],[0.2,0.6],[0.8,0.6]],
    B: [[0,0],[0,1],[0.7,1],[0.9,0.75],[0.7,0.5],[0,0.5],[0.7,0.5],[0.9,0.25],[0.7,0],[0,0]],
    C: [[1,0.2],[0.7,0],[0.3,0],[0,0.3],[0,0.7],[0.3,1],[0.7,1],[1,0.8]],
    D: [[0,0],[0,1],[0.6,1],[1,0.7],[1,0.3],[0.6,0],[0,0]],
    E: [[1,0],[0,0],[0,0.5],[0.7,0.5],[0,0.5],[0,1],[1,1]],
    F: [[1,0],[0,0],[0,0.5],[0.7,0.5],[0,0.5],[0,1]],
    G: [[1,0.2],[0.7,0],[0.3,0],[0,0.3],[0,0.7],[0.3,1],[0.9,1],[0.9,0.5],[0.5,0.5]],
    H: [[0,0],[0,1],[0,0.5],[1,0.5],[1,0],[1,1]],
    I: [[0.2,0],[0.8,0],[0.5,0],[0.5,1],[0.2,1],[0.8,1]],
    J: [[0.8,0],[0.8,0.8],[0.5,1],[0.2,1],[0,0.8]],
    K: [[0,0],[0,1],[0,0.5],[1,0],[0,0.5],[1,1]],
    L: [[0,0],[0,1],[1,1]],
    M: [[0,1],[0,0],[0.5,0.5],[1,0],[1,1]],
    N: [[0,1],[0,0],[1,1],[1,0]],
    O: [[0.3,0],[0.7,0],[1,0.3],[1,0.7],[0.7,1],[0.3,1],[0,0.7],[0,0.3],[0.3,0]],
    P: [[0,1],[0,0],[0.7,0],[1,0.25],[0.7,0.5],[0,0.5]],
    Q: [[0.3,0],[0.7,0],[1,0.3],[1,0.7],[0.7,1],[0.3,1],[0,0.7],[0,0.3],[0.3,0],[0.6,0.6],[1,1]],
    R: [[0,1],[0,0],[0.7,0],[1,0.25],[0.7,0.5],[0,0.5],[0.5,0.5],[1,1]],
    S: [[1,0.2],[0.7,0],[0.3,0],[0,0.25],[0.3,0.5],[0.7,0.5],[1,0.75],[0.7,1],[0.3,1],[0,0.8]],
    T: [[0,0],[1,0],[0.5,0],[0.5,1]],
    U: [[0,0],[0,0.8],[0.3,1],[0.7,1],[1,0.8],[1,0]],
    V: [[0,0],[0.5,1],[1,0]],
    W: [[0,0],[0.25,1],[0.5,0.5],[0.75,1],[1,0]],
    X: [[0,0],[1,1],[0.5,0.5],[1,0],[0,1]],
    Y: [[0,0],[0.5,0.5],[1,0],[0.5,0.5],[0.5,1]],
    Z: [[0,0],[1,0],[0,1],[1,1]],
    '0': [[0.2,0],[0.8,0],[1,0.2],[1,0.8],[0.8,1],[0.2,1],[0,0.8],[0,0.2],[0.2,0]],
    '1': [[0.2,0.2],[0.5,0],[0.5,1],[0.2,1],[0.8,1]],
    '2': [[0,0.2],[0.3,0],[0.7,0],[1,0.25],[0,1],[1,1]],
    '3': [[0,0],[1,0],[0.5,0.45],[1,0.7],[0.7,1],[0.2,1],[0,0.8]],
    '4': [[0.8,1],[0.8,0],[0,0.65],[1,0.65]],
    '5': [[1,0],[0,0],[0,0.45],[0.7,0.45],[1,0.7],[0.7,1],[0.2,1],[0,0.8]],
    '6': [[0.8,0],[0.2,0],[0,0.3],[0,0.8],[0.3,1],[0.7,1],[1,0.75],[0.7,0.5],[0,0.5]],
    '7': [[0,0],[1,0],[0.4,1]],
    '8': [[0.3,0],[0.7,0],[1,0.25],[0.7,0.5],[0.3,0.5],[0,0.25],[0.3,0],[0.3,0.5],[0,0.75],[0.3,1],[0.7,1],[1,0.75],[0.7,0.5]],
    '9': [[1,0.5],[0.3,0.5],[0,0.25],[0.3,0],[0.7,0],[1,0.25],[1,0.8],[0.7,1],[0.2,1]],
    ':': [[0.5,0.25],[0.5,0.3],[0.5,0.7],[0.5,0.75]],
    '%': [[0.1,0.1],[0.2,0.1],[0.1,0.2],[0.9,0],[0.1,1],[0.8,0.8],[0.9,0.8],[0.8,0.9]],
    ',': [[0.5,0.8],[0.4,1]],
    '.': [[0.5,0.9],[0.5,1]],
    '-': [[0.2,0.5],[0.8,0.5]],
    '"': [[0.3,0],[0.3,0.25],[0.7,0],[0.7,0.25]],
    '(': [[0.7,0],[0.3,0.3],[0.3,0.7],[0.7,1]],
    ')': [[0.3,0],[0.7,0.3],[0.7,0.7],[0.3,1]]
};

// Función que dibuja texto usando líneas puras (sin depender de fuentes del sistema)
function drawVectorText(ctx, text, x, y, size, color, lineWidth = 2, align = 'left') {
    const cleanText = String(text)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quita acentos para que siempre se dibuje
        .toUpperCase();

    const charW = size * 0.65;
    const charH = size;
    const spacing = size * 0.25;
    const totalWidth = cleanText.length * (charW + spacing) - spacing;

    let startX = x;
    if (align === 'center') startX = x - totalWidth / 2;
    if (align === 'right') startX = x - totalWidth;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < cleanText.length; i++) {
        const ch = cleanText[i];
        const pts = GLYPHS[ch];
        const cx = startX + i * (charW + spacing);

        if (pts && pts.length > 0) {
            ctx.beginPath();
            for (let j = 0; j < pts.length; j++) {
                const px = cx + pts[j][0] * charW;
                const py = (y - charH) + pts[j][1] * charH;
                if (j === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
    }
    ctx.restore();
}

export default {
    command: ['tarjeta2', 'card2'],
    category: 'profile',
    description: 'Genera una tarjeta de perfil con renderizado vectorial nativo.',
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

            const name = (userGlobal.name || msg.pushName || 'Usuario').slice(0, 22);
            const level = userGlobal.level || 0;
            const exp = userGlobal.exp || 0;
            const coins = Number(user.coins || userGlobal.coins || 0).toLocaleString();
            const bank = Number(user.bank || userGlobal.bank || 0).toLocaleString();
            const health = user.health ?? 100;
            const stamina = user.stamina ?? 100;
            const bio = (userGlobal.description || 'Sin descripcion definida').slice(0, 38);

            const canvas = createCanvas(900, 450);
            const ctx = canvas.getContext('2d');

            // 1. Fondo Degradado
            const bg = ctx.createLinearGradient(0, 0, 900, 450);
            bg.addColorStop(0, '#090d16');
            bg.addColorStop(0.5, '#131128');
            bg.addColorStop(1, '#05070b');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, 900, 450);

            // Grid decorativo
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 900; i += 30) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, 450);
                ctx.stroke();
            }

            // 2. Marco exterior neón
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(15, 15, 870, 420);

            // 3. Paneles
            // Panel Cartera
            ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
            ctx.beginPath();
            ctx.roundRect(280, 175, 275, 90, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.stroke();

            // Panel Banco
            ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
            ctx.beginPath();
            ctx.roundRect(575, 175, 285, 90, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
            ctx.stroke();

            // Panel Estado Inferior
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.beginPath();
            ctx.roundRect(280, 285, 580, 115, 12);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.stroke();

            // 4. Avatar
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

            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(140, 175, 85, 0, Math.PI * 2, true);
            ctx.stroke();

            // 5. Insignia de Nivel
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.roundRect(65, 280, 150, 40, 20);
            ctx.fill();

            // 6. Barras de progreso
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(310, 332, 220, 12);
            ctx.fillStyle = '#f43f5e';
            ctx.fillRect(310, 332, Math.max(0, Math.min(220, (220 * health) / 100)), 12);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fillRect(580, 332, 220, 12);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(580, 332, Math.max(0, Math.min(220, (220 * stamina) / 100)), 12);

            // 7. TODOS LOS TEXTOS DIBUJADOS CON VECTORES (100% visibles en Termux)
            drawVectorText(ctx, `NIVEL ${level}`, 140, 307, 15, '#ffffff', 2.2, 'center');

            // Nombre y Biografía
            drawVectorText(ctx, name, 280, 95, 24, '#f8fafc', 3, 'left');
            drawVectorText(ctx, `"${bio}"`, 280, 132, 12, '#94a3b8', 1.6, 'left');

            // Cartera y Banco
            drawVectorText(ctx, 'CARTERA', 300, 205, 12, '#38bdf8', 2, 'left');
            drawVectorText(ctx, `${coins} ${currency}`, 300, 243, 18, '#ffffff', 2.5, 'left');

            drawVectorText(ctx, 'BANCO', 595, 205, 12, '#a855f7', 2, 'left');
            drawVectorText(ctx, `${bank} ${currency}`, 595, 243, 18, '#ffffff', 2.5, 'left');

            // Salud, Stamina y XP
            drawVectorText(ctx, `SALUD: ${health}%`, 310, 320, 12, '#f43f5e', 1.8, 'left');
            drawVectorText(ctx, `STAMINA: ${stamina}%`, 580, 320, 12, '#eab308', 1.8, 'left');
            drawVectorText(ctx, `EXPERIENCIA (XP): ${exp}`, 310, 380, 13, '#38bdf8', 2, 'left');

            const buffer = canvas.toBuffer('image/png');

            await sock.sendMessage(msg.chat, {
                image: buffer,
                caption: `🪪 *Tarjeta de Perfil de ${name}*`
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta.');
        }
    }
};
