// lib/vectorText.js
// Renderizador vectorial de texto para Canvas (100% independiente de fuentes del sistema)

export const GLYPHS = {
    // Letras A-Z
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

    // Números 0-9
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

    // Símbolos y puntuación
    ':': [[0.5,0.25],[0.5,0.32],[0.5,0.68],[0.5,0.75]],
    ';': [[0.5,0.25],[0.5,0.32],[0.5,0.7],[0.4,0.9]],
    '%': [[0.1,0.1],[0.25,0.1],[0.25,0.25],[0.1,0.25],[0.1,0.1],[0.9,0],[0.1,1],[0.75,0.75],[0.9,0.75],[0.9,0.9],[0.75,0.9],[0.75,0.75]],
    ',': [[0.5,0.8],[0.4,1]],
    '.': [[0.5,0.9],[0.5,1]],
    '-': [[0.2,0.5],[0.8,0.5]],
    '_': [[0,1],[1,1]],
    '+': [[0.5,0.2],[0.5,0.8],[0.5,0.5],[0.2,0.5],[0.8,0.5]],
    '=': [[0.2,0.35],[0.8,0.35],[0.2,0.65],[0.8,0.65]],
    '/': [[0.9,0],[0.1,1]],
    '\\': [[0.1,0],[0.9,1]],
    '!': [[0.5,0],[0.5,0.65],[0.5,0.9],[0.5,1]],
    '?': [[0.1,0.2],[0.3,0],[0.7,0],[0.9,0.25],[0.5,0.55],[0.5,0.7],[0.5,0.9],[0.5,1]],
    '"': [[0.3,0],[0.3,0.25],[0.7,0],[0.7,0.25]],
    "'": [[0.5,0],[0.5,0.25]],
    '(': [[0.7,0],[0.3,0.3],[0.3,0.7],[0.7,1]],
    ')': [[0.3,0],[0.7,0.3],[0.7,0.7],[0.3,1]],
    '[': [[0.7,0],[0.3,0],[0.3,1],[0.7,1]],
    ']': [[0.3,0],[0.7,0],[0.7,1],[0.3,1]],
    '<': [[0.8,0.2],[0.2,0.5],[0.8,0.8]],
    '>': [[0.2,0.2],[0.8,0.5],[0.2,0.8]],
    '$': [[0.8,0.2],[0.6,0.1],[0.3,0.1],[0.1,0.25],[0.3,0.45],[0.7,0.55],[0.9,0.75],[0.7,0.9],[0.3,0.9],[0.1,0.8],[0.5,0],[0.5,1]],
    '#': [[0.3,0],[0.3,1],[0.7,0],[0.7,1],[0.1,0.35],[0.9,0.35],[0.1,0.65],[0.9,0.65]],
    '@': [[0.7,0.6],[0.4,0.6],[0.3,0.45],[0.4,0.3],[0.7,0.3],[0.7,0.7],[0.9,0.7],[0.9,0.2],[0.7,0],[0.3,0],[0.1,0.2],[0.1,0.8],[0.3,1],[0.8,1]],
    '*': [[0.5,0.15],[0.5,0.85],[0.2,0.3],[0.8,0.7],[0.8,0.3],[0.2,0.7]]
};

/**
 * Normaliza texto eliminando tildes/diacríticos y convirtiendo a mayúsculas.
 */
export function normalizeText(text) {
    return String(text ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
}

/**
 * Calcula el ancho total en píxeles que ocupará un texto vectorial.
 */
export function measureVectorText(text, size = 16) {
    const cleanText = normalizeText(text);
    if (!cleanText.length) return 0;
    const charW = size * 0.65;
    const spacing = size * 0.25;
    return cleanText.length * (charW + spacing) - spacing;
}

/**
 * Dibuja texto usando trazos vectoriales puros en Canvas.
 * 
 * @param {CanvasRenderingContext2D} ctx - Contexto 2D del canvas
 * @param {string|number} text - Texto a renderizar
 * @param {number} x - Coordenada X
 * @param {number} y - Coordenada Y (línea base inferior del texto)
 * @param {object} [options] - Opciones de estilo
 * @param {number} [options.size=16] - Alto de letra en píxeles
 * @param {string} [options.color='#ffffff'] - Color del trazo
 * @param {number} [options.lineWidth=2] - Grosor del trazo
 * @param {'left'|'center'|'right'} [options.align='left'] - Alineación horizontal
 * @param {number} [options.maxWidth] - Ancho máximo permitido (escala automáticamente si excede)
 * @param {string} [options.shadowColor] - Color de sombra/brillo neón opcional
 * @param {number} [options.shadowBlur=0] - Desenfoque de sombra
 */
export function drawVectorText(ctx, text, x, y, options = {}) {
    // Soporte retrocompatible si se pasan argumentos posicionales antiguos: (ctx, text, x, y, size, color, lineWidth, align)
    let opts = options;
    if (typeof options === 'number') {
        opts = {
            size: arguments[4] ?? 16,
            color: arguments[5] ?? '#ffffff',
            lineWidth: arguments[6] ?? 2,
            align: arguments[7] ?? 'left'
        };
    }

    const {
        size = 16,
        color = '#ffffff',
        lineWidth = 2,
        align = 'left',
        maxWidth = null,
        shadowColor = null,
        shadowBlur = 0
    } = opts;

    const cleanText = normalizeText(text);
    if (!cleanText.length) return;

    let effectiveSize = size;
    let totalWidth = measureVectorText(cleanText, effectiveSize);

    // Auto-ajuste si supera el ancho máximo
    if (maxWidth && totalWidth > maxWidth) {
        const scale = maxWidth / totalWidth;
        effectiveSize = size * scale;
        totalWidth = maxWidth;
    }

    const charW = effectiveSize * 0.65;
    const charH = effectiveSize;
    const spacing = effectiveSize * 0.25;

    let startX = x;
    if (align === 'center') startX = x - totalWidth / 2;
    else if (align === 'right') startX = x - totalWidth;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = maxWidth && totalWidth === maxWidth ? Math.max(1.2, lineWidth * (effectiveSize / size)) : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (shadowColor && shadowBlur > 0) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
    }

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

/**
 * Dibuja texto multilínea ajustando automáticamente las palabras al ancho máximo.
 */
export function drawWrappedVectorText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
    const words = normalizeText(text).split(/\s+/);
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
        const testLine = line ? `${line} ${words[i]}` : words[i];
        const testWidth = measureVectorText(testLine, options.size || 14);

        if (testWidth > maxWidth && line !== '') {
            drawVectorText(ctx, line, x, currentY, options);
            line = words[i];
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }

    if (line) {
        drawVectorText(ctx, line, x, currentY, options);
    }

    return currentY;
}
