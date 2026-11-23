import sharp from 'sharp';
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
    description: 'Genera una tarjeta visual de perfil mejorada usando SVG y Sharp.',
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

            const name = escapeXml(userGlobal.name || msg.pushName || 'Usuario');
            const level = userGlobal.level || 0;
            const exp = userGlobal.exp || 0;
            const coins = Number(user.coins || userGlobal.coins || 0).toLocaleString();
            const bank = Number(user.bank || userGlobal.bank || 0).toLocaleString();
            const health = user.health ?? 100;
            const stamina = user.stamina ?? 100;
            const bio = escapeXml((userGlobal.description || 'Sin descripción definida.').slice(0, 48));

            let avatarBase64 = '';
            try {
                const ppUrl = await sock.profilePictureUrl(userId, 'image');
                if (ppUrl) {
                    const response = await fetch(ppUrl);
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const resizedAvatar = await sharp(Buffer.from(arrayBuffer))
                            .resize(160, 160)
                            .png()
                            .toBuffer();
                        avatarBase64 = `data:image/png;base64,${resizedAvatar.toString('base64')}`;
                    }
                }
            } catch (err) {
                console.log('⚠️ No se pudo obtener el avatar:', err.message);
            }

            const svgImage = `
            <svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#0b0f19"/>
                        <stop offset="50%" stop-color="#131c31"/>
                        <stop offset="100%" stop-color="#07090e"/>
                    </linearGradient>
                    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#0ea5e9"/>
                        <stop offset="50%" stop-color="#6366f1"/>
                        <stop offset="100%" stop-color="#a855f7"/>
                    </linearGradient>
                    <clipPath id="avatarClip">
                        <circle cx="130" cy="150" r="75"/>
                    </clipPath>
                    <style>
                        text {
                            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        }
                    </style>
                </defs>

                <!-- Fondo principal y marco exterior -->
                <rect width="800" height="400" rx="28" fill="url(#bgGrad)"/>
                <rect x="5" y="5" width="790" height="390" rx="24" fill="none" stroke="url(#accentGrad)" stroke-width="2.5" opacity="0.6"/>

                <!-- Círculos decorativos de fondo -->
                <circle cx="720" cy="70" r="130" fill="#6366f1" opacity="0.06"/>
                <circle cx="80" cy="350" r="110" fill="#0ea5e9" opacity="0.06"/>

                <!-- Marco y Avatar del usuario -->
                <circle cx="130" cy="150" r="81" fill="url(#accentGrad)"/>
                <circle cx="130" cy="150" r="76" fill="#0b0f19"/>
                ${avatarBase64 ? `<image href="${avatarBase64}" x="55" y="75" width="150" height="150" clip-path="url(#avatarClip)"/>` : ''}

                <!-- Badge de Nivel -->
                <rect x="70" y="248" width="120" height="36" rx="18" fill="url(#accentGrad)"/>
                <text x="130" y="271" font-size="15" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1px">NIVEL ${level}</text>

                <!-- Nombre y Biografía -->
                <text x="240" y="95" font-size="30" font-weight="700" fill="#f8fafc">${name}</text>
                <text x="240" y="128" font-size="14" fill="#94a3b8" font-style="italic">"${bio}"</text>

                <!-- Línea separadora elegante -->
                <line x1="240" y1="148" x2="745" y2="148" stroke="#334155" stroke-width="1.5" opacity="0.7"/>

                <!-- Tarjeta Cartera -->
                <rect x="240" y="168" width="242" height="78" rx="14" fill="#1e293b" opacity="0.8"/>
                <rect x="240" y="168" width="242" height="78" rx="14" fill="none" stroke="#0ea5e9" stroke-width="1" opacity="0.3"/>
                <text x="260" y="195" font-size="12" font-weight="700" fill="#38bdf8" letter-spacing="0.5px">CARTERA</text>
                <text x="260" y="228" font-size="20" font-weight="700" fill="#ffffff">${coins}</text>
                <text x="460" y="228" font-size="14" font-weight="600" fill="#38bdf8" text-anchor="end">${escapeXml(currency)}</text>

                <!-- Tarjeta Banco -->
                <rect x="498" y="168" width="247" height="78" rx="14" fill="#1e293b" opacity="0.8"/>
                <rect x="498" y="168" width="247" height="78" rx="14" fill="none" stroke="#a855f7" stroke-width="1" opacity="0.3"/>
                <text x="518" y="195" font-size="12" font-weight="700" fill="#c084fc" letter-spacing="0.5px">BANCO</text>
                <text x="518" y="228" font-size="20" font-weight="700" fill="#ffffff">${bank}</text>
                <text x="718" y="228" font-size="14" font-weight="600" fill="#c084fc" text-anchor="end">${escapeXml(currency)}</text>

                <!-- Panel inferior: Salud, Stamina y XP -->
                <rect x="240" y="258" width="505" height="72" rx="14" fill="#1e293b" opacity="0.8"/>
                <rect x="240" y="258" width="505" height="72" rx="14" fill="none" stroke="#6366f1" stroke-width="1" opacity="0.3"/>
                
                <!-- Salud -->
                <text x="265" y="300" font-size="15" font-weight="700" fill="#fb7185">❤ Salud</text>
                <text x="345" y="300" font-size="15" font-weight="700" fill="#ffffff">${health}%</text>

                <!-- Stamina -->
                <text x="445" y="300" font-size="15" font-weight="700" fill="#facc15">⚡ Stamina</text>
                <text x="535" y="300" font-size="15" font-weight="700" fill="#ffffff">${stamina}%</text>

                <!-- XP -->
                <text x="630" y="300" font-size="15" font-weight="700" fill="#38bdf8">✨ XP</text>
                <text x="675" y="300" font-size="15" font-weight="700" fill="#ffffff">${exp}</text>
            </svg>
            `;

            const pngBuffer = await sharp(Buffer.from(svgImage))
                .png()
                .toBuffer();

            await sock.sendMessage(msg.chat, {
                image: pngBuffer,
                caption: `🪪 *Tarjeta de Perfil - ${userGlobal.name || 'Usuario'}*`
            }, { quoted: msg });

        } catch (error) {
            console.error('Error en card.js:', error);
            await msg.reply('《✧》 Ocurrió un error al generar la tarjeta de perfil.');
        }
    }
};
