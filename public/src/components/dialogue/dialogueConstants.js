/**
 * Constantes compartilhadas entre componentes de diálogo
 * Inclui paletas de cores, dimensões e configurações globais
 */

/**
 * Paleta de cores em estilo terracota pixel-art
 * Usada em ChoiceUI
 */
export const DIALOGUE_PALETTE = {
    borderOuter:     0x3d1f0f,
    borderInner:     0x7a3d1e,
    bgMain:          0xc47040,
    bgHighlight:     0xd4895a,
    bgShadow:        0xa85a2a,
    rowNormal:       0xb56535,
    rowSelected:     0xe08848,
    rowStroke:       0x7a3d1e,
    rowStrokeSel:    0xf5c842,
    textNormal:      "#fff5e6",
    textSelected:    "#ffffff",
    textShadow:      "#3d1f0f",
    indicatorColor:  "#f5c842",
};

/**
 * Paleta para DialogueUI (texto principal do diálogo)
 * Cores optimizadas para legibilidade de textos longos
 */
export const DIALOGUE_PALETTE_EXTENDED = {
    borderOuter:     0x3d1f0f,
    borderInner:     0x7a3d1e,
    bgMain:          0xE8B967,  // Cor específica para DialogueUI
    bgHighlight:     0xd4895a,
    bgShadow:        0xa85a2a,
    textColor:       "#0F0633",
    textShadow:      "#08031c",
    indicatorNormal: "#ffe8c0",
    indicatorMuted:  "#c8855a",
    accentRed:       0xd44030,
};

/**
 * Profundidades de renderização (depth layers)
 * Define a ordem de renderização dos elementos
 */
export const DEPTH = {
    shadow:     8,
    background: 9,
    innerBevel: 10,
    rowBg:      11,
    text:       12,
    indicator:  13,
};

/**
 * Dimensões de bordas para caixas de diálogo
 */
export const BORDER_W = 8;
export const INNER_W  = 4;

/**
 * Tamanhos de fonte para diálogos
 */
export const FONT_SIZES = {
    icon:   "30px",
    label:  "30px",
    dots:   "30px",
};

/**
 * Configuração dos indicadores de estado para DialogueUI
 * Define o comportamento visual de cada estado (typing, continue, choice, end)
 */
export const INDICATOR_CFG = {
    typing:   { label: "ESPAÇO · pular",  color: "#c8855a", icon: null, dots: true  },
    continue: { label: "CONTINUAR",       color: "#000000", icon: "▼",  dots: false },
    choice:   { label: "CONFIRMAR",       color: "#ffe8c0", icon: "↵",  dots: false },
    end:      { label: "FIM",             color: "#ff8070", icon: "■",  dots: false },
};

/**
 * Constantes de posicionamento e dimensões para DialogueUI container
 */
export const DIALOGUE_CONTAINER = {
    baseX: 40,
    baseY: 40,
    footerHeight: 38,
};
