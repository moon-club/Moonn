import pkg from 'sharp';
const sharp = pkg.default || pkg;
import db from '#db';

function escapeXml(unsafe) {
    return String(unsafe || '').replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

export default {
    command: ['card', 'tarjeta', 'id'],
    category: 'profile',
    description: 'Genera una tarjeta visual de perfil usando SVG y Sharp de alta nitidez.',
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

            const name = escapeXml(userGlobal.name || msg.pushName || 'Usuario');
            const level = userGlobal.level || 0;
            const exp = userGlobal.exp || 0;
            const coins = Number(user.coins || userGlobal.coins || 0).toLocaleString();
            const bank = Number(user.bank || userGlobal.bank || 0).toLocaleString();
            const health = user.health ?? 100;
            const stamina = user.stamina ?? 100;
            const bio = escapeXml((userGlobal.description || 'Sin descripción definida.').slice(0, 50));

            // Procesamiento seguro del avatar con Sharp
            let avatarBuffer = null;
            try {
                const ppUrl = await sock.profilePictureUrl(userId, 'image');
                const response = await fetch(ppUrl);
                const arrayBuffer = await response.arrayBuffer();
                avatarBuffer = await sharp(Buffer.from(arrayBuffer))
                    .resize(160, 160)
                    .toBuffer();
            } catch {
                // Si falla, se omite o se maneja con SVG por defecto
                avatarBuffer = null;
            }

            // Si hay avatar, lo convertimos a base64 incrustado seguro para SVG
            const avatarBase64 = avatarBuffer ? `data:image/jpeg;base64,${avatarBuffer.toString('base64')}` : '';

            const svgImage = `
            <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0f172a"/>
                        <stop offset="50%" stop-color="#1e1b4b"/>
                        <stop offset="100%" stop-color="#090d16"/>
                    </linearGradient>
                    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#38bdf8"/>
                        <stop offset="100%" stop-color="#a855f7"/>
                    </linearGradient>
                    <clipPath id="avatarClip">
                        <circle cx="130" cy="145" r="80"/>
                    </clipPath>
                </defs>

                <!-- Fondo Principal -->
                <rect width="800" height="400" rx="24" fill="url(#bgGrad)"/>
                
                <!-- Marco Exterior -->
                <rect x="6" y="6" width="788" height="388" rx="20" fill="none" stroke="url(#accentGrad)" stroke-width="3" opacity="0.8"/>

                <!-- Elementos decorativos de fondo -->
                <circle cx="750" cy="50" r="120" fill="#a855f7" opacity="0.08"/>
                <circle cx="50" cy="380" r="100" fill="#38bdf8" opacity="0.08"/>

                <!-- Contenedor del Avatar -->
                <circle cx="130" cy="145" r="85" fill="url(#accentGrad)"/>
                <circle cx="130" cy="145" r="80" fill="#1e293b"/>
                ${avatarBase64 ? `<image href="${avatarBase64}" x="50" y="65" width="160" height="160" clip-path="url(#avatarClip)"/>` : ''}

                <!-- Insignia de Nivel -->
                <rect x="75" y="245" width="110" height="34" rx="17" fill="url(#accentGrad)"/>
                <text x="130" y="267" font-family="monospace, sans-serif" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle">
                    NIVEL ${level}
                </text>

                <!-- Nombre y Biografía -->
                <text x="250" y="105" font-family="sans-serif" font-size="30" font-weight="bold" fill="#f8fafc">
                    ${name}
                </text>
                <text x="250" y="138" font-family="sans-serif" font-size="15" fill="#94a3b8">
                    "${bio}"
                </text>

                <line x1="250" y1="160" x2="740" y2="160" stroke="#334155" stroke-width="2"/>

                <!-- Panel Cartera -->
                <rect x="250" y="185" width="230" height="75" rx="12" fill="#1e293b" fill-opacity="0.85" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.4"/>
                <text x="270" y="212" font-family="sans-serif" font-size="13" fill="#38bdf8" font-weight="bold">CARTERA</text>
                <text x="270" y="242" font-family="sans-serif" font-size="20" fill="#ffffff" font-weight="bold">${coins} ${escapeXml(currency)}</text>

                <!-- Panel Banco -->
                <rect x="500" y="185" width="240" height="75" rx="12" fill="#1e293b" fill-opacity="0.85" stroke="#a855f7" stroke-width="1" stroke-opacity="0.4"/>
                <text x="520" y="212" font-family="sans-serif" font-size="13" fill="#a855f7" font-weight="bold">BANCO</text>
                <text x="520" y="242" font-family="sans-serif" font-size="20" fill="#ffffff" font-weight="bold">${bank} ${escapeXml(currency)}</text>

                <!-- Panel Inferior (Salud, Stamina, XP) -->
                <rect x="250" y="275" width="490" height="65" rx="12" fill="#1e293b" fill-opacity="0.85" stroke="#ffffff" stroke-width="1" stroke-opacity="0.1"/>
                <text x="275" y="314" font-family="sans-serif" font-size="16" fill="#f43f5e" font-weight="bold">❤ Salud: ${health}%</text>
                <text x="450" y="314" font-family="sans-serif" font-size="16" fill="#eab308" font-weight="bold">⚡ Stamina: ${stamina}%</text>
                <text x="630" y="314" font-family="sans-serif" font-size="15" fill="#cbd5e1">✨ XP: ${exp}</text>
            </svg>
            `;

            // Renderizado ultranitido con Sharp
            const pngBuffer = await sharp(Buffer.from(svgImage))
                .png()
                .toBuffer();

            await sock.sendMessage(msg.chat, {
                image: pngBuffer,
                caption: `🪪 *Tarjeta de Perfil de ${userGlobal.name || 'Usuario'}*`
            }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta con SVG.');
        }
    }
};        
