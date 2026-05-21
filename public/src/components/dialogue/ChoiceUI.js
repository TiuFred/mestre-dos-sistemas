import { DIALOGUE_PALETTE, DEPTH, BORDER_W, INNER_W } from "./dialogueConstants.js";
import EventsManager from "../managers/EventsManager.js";
import SettingsManager from "../managers/SettingsManager.js";

/**
 * Paleta de cores em estilo terracota pixel-art
 */
const PALETTE = DIALOGUE_PALETTE;

/**
 * Componente responsável por gerenciar a interface de seleção de opções (choices)
 * em diálogos. Renderiza caixas de diálogo com opções interativas do jogador.
 * 
 * @class ChoiceUI
 */
export default class ChoiceUI {
    scene = null;
    choicesBoxBackground = null;
    choicesBoxShadow = null;
    choicesInnerBorder = null;
    choiceRows = [];
    choiceIndicators = [];
    choiceTexts = [];
    
    // Posicionamento
    boxX = 40;
    boxY = 700;
    boxWidth = 0;
    boxHeight = 0;
    selectedIndex = 0;
    baseBoxWidth = 0;
    baseBoxHeight = 0;
    
    // Privados
    #visible = true;
    #paddingX = 18;
    #paddingY = 18;
    #optionGap = 10;
    #optionInnerPaddingY = 10;
    #normalizedOptions = [];
    #interactive = true;

    /**
     * Cria uma nova instância de ChoiceUI
     * @param {Phaser.Scene} scene - Cena Phaser
     * @param {number} width - Largura da caixa de opções
     * @param {number} height - Altura da caixa de opções
     * @param {number} radius - Raio dos cantos arredondados (não utilizado no momento)
     */
    constructor(scene, width, height, radius) {
        this.scene = scene;
        this.#create(width, height, radius);
    }

    #getPalette() {
        if (!SettingsManager.highContrast) {
            return PALETTE;
        }

        return {
            borderOuter: 0xffffff,
            borderInner: 0xf9c22b,
            bgMain: 0x111111,
            bgHighlight: 0x232323,
            bgShadow: 0x000000,
            rowNormal: 0x181818,
            rowSelected: 0x3a2a00,
            rowStroke: 0xffffff,
            rowStrokeSel: 0xf9c22b,
            textNormal: "#ffffff",
            textSelected: "#f9c22b",
            textShadow: "#000000",
            indicatorColor: "#f9c22b",
        };
    }

    /**
     * Inicializa a estrutura visual da caixa de opções
     * @private
     */
    #create(width, height, _radius) {
        this.baseBoxWidth = width;
        this.baseBoxHeight = height;
        this.boxWidth = width;
        this.boxHeight = height;

        const x = this.boxX;
        const y = this.boxY;
        const W = width;
        const H = height;

        // Sombra da caixa
        this.choicesBoxShadow = this.scene.add
            .rectangle(x + 5, y + 6, W, H, 0x000000, 0.45)
            .setOrigin(0)
            .setDepth(DEPTH.shadow);

        // Fundo com bordas
        this.choicesBoxBackground = this.scene.add.graphics()
            .setDepth(DEPTH.background);
        this.#drawBox(this.choicesBoxBackground, x, y, W, H);

        // Borda interna (não visível por padrão)
        this.choicesInnerBorder = this.scene.add
            .rectangle(x, y, 1, 1, 0x000000, 0)
            .setOrigin(0)
            .setDepth(DEPTH.innerBevel)
            .setVisible(false);
    }

    #getLayoutMetrics() {
        const fontScale = SettingsManager.fontScale ?? 1;
        const boxWidth = Math.round(this.baseBoxWidth + (fontScale - 1) * 180);
        const minBoxHeight = Math.round(this.baseBoxHeight + (fontScale - 1) * 150);

        return {
            fontScale,
            boxWidth,
            minBoxHeight,
            paddingX: Math.max(16, Math.round(18 * fontScale)),
            paddingY: Math.max(16, Math.round(18 * fontScale)),
            optionGap: Math.max(8, Math.round(10 * fontScale)),
            optionInnerPaddingY: Math.max(8, Math.round(10 * fontScale)),
            optionFontSize: Math.max(19, Math.round(22 * fontScale)),
            indicatorFontSize: Math.max(18, Math.round(20 * fontScale)),
            lineSpacing: Math.max(5, Math.round(6 * fontScale)),
        };
    }

    #computeBoxY(height) {
        const minBoxY = 420;
        const maxBottom = 1030;
        return Math.max(minBoxY, Math.round(maxBottom - height));
    }

    #applyBoxFrame(width, height) {
        this.boxWidth = width;
        this.boxHeight = height;
        this.boxY = this.#computeBoxY(height);

        this.choicesBoxShadow
            .setPosition(this.boxX + 5, this.boxY + 6)
            .setSize(width, height);

        this.#drawBox(this.choicesBoxBackground, this.boxX, this.boxY, width, height);

        this.choicesInnerBorder
            .setPosition(this.boxX, this.boxY)
            .setSize(width, height);
    }

    /**
     * Desenha a caixa com bordas em estilo pixel-art
     * @private
     */
    #drawBox(gfx, x, y, W, H) {
        const palette = this.#getPalette();
        gfx.clear();

        // Borda externa
        gfx.fillStyle(palette.borderOuter, 1);
        gfx.fillRect(x, y, W, H);

        // Fundo principal
        gfx.fillStyle(palette.bgMain, 1);
        gfx.fillRect(x + BORDER_W, y + BORDER_W, W - BORDER_W * 2, H - BORDER_W * 2);

        // Destaques (topo e esquerda)
        gfx.fillStyle(palette.bgHighlight, 1);
        gfx.fillRect(x + BORDER_W, y + BORDER_W, W - BORDER_W * 2, INNER_W);
        gfx.fillRect(x + BORDER_W, y + BORDER_W, INNER_W, H - BORDER_W * 2);

        // Sombras (fundo e direita)
        gfx.fillStyle(palette.bgShadow, 1);
        gfx.fillRect(x + BORDER_W, y + H - BORDER_W - INNER_W, W - BORDER_W * 2, INNER_W);
        gfx.fillRect(x + W - BORDER_W - INNER_W, y + BORDER_W, INNER_W, H - BORDER_W * 2);

        // Borda interna decorativa
        gfx.lineStyle(1, palette.borderInner, 0.4);
        gfx.strokeRect(
            x + BORDER_W + INNER_W,
            y + BORDER_W + INNER_W,
            W - (BORDER_W + INNER_W) * 2,
            H - (BORDER_W + INNER_W) * 2
        );
    }

    /**
     * Normaliza as opções para um formato padrão
     * @private
     * @param {Array<string|object>} options - Opções a normalizar
     * @returns {Array<object>} Opções normalizadas
     */
    #normalizeOptions(options) {
        return options.map((option) => 
            typeof option === "string" ? { text: option } : option
        );
    }

    /**
     * Vincula eventos de ao passar/clicar em uma opção
     * @private
     */
    #bindPointerEvents(target, index) {
        target.on("pointerover", () => {
            if (!this.#interactive) return;
            this.updateSelection(index);
        });

        target.on("pointerdown", () => {
            if (!this.#interactive) return;
            this.updateSelection(index);
            EventsManager.getInstance().emit("dialogue_choice_selected", { index });
        });
    }

    /**
     * Cria uma linha de opção com background, texto e indicador
     * @private
     */
    #createOptionRow(option, index, currentY, metrics) {
        const palette = this.#getPalette();
        const PAD_LEFT = this.boxX + this.#paddingX + Math.round(28 * metrics.fontScale);
        const wrapWidth = this.boxWidth - (PAD_LEFT - this.boxX) - this.#paddingX - 14;

        // Texto da opção
        const optionText = this.scene.add
            .text(
                PAD_LEFT,
                currentY + this.#optionInnerPaddingY,
                option.text,
                {
                    fontFamily: "PressStart2P",
                    fontSize: `${metrics.optionFontSize}px`,
                    fontStyle: "normal",
                    color: palette.textNormal,
                    wordWrap: { width: wrapWidth },
                    lineSpacing: metrics.lineSpacing,
                    shadow: { 
                        offsetX: 2, 
                        offsetY: 2, 
                        color: palette.textShadow, 
                        blur: 0, 
                        fill: true,
                    },
                }
            )
            .setOrigin(0)
            .setDepth(DEPTH.text)
            .setInteractive({ useHandCursor: true });

        const rowHeight = optionText.height + this.#optionInnerPaddingY * 2;

        // Background da linha de opção
        const rowBg = this.scene.add
            .rectangle(
                this.boxX + BORDER_W + INNER_W + 2,
                currentY,
                this.boxWidth - (BORDER_W + INNER_W + 2) * 2,
                rowHeight,
                palette.rowNormal,
                1
            )
            .setOrigin(0)
            .setStrokeStyle(1, palette.rowStroke)
            .setDepth(DEPTH.rowBg)
            .setInteractive({ useHandCursor: true });

        // Indicador visual (">")
        const indicator = this.scene.add
            .text(
                this.boxX + this.#paddingX,
                currentY + rowHeight / 2,
                ">",
                {
                    fontSize: `${metrics.indicatorFontSize}px`,
                    color: palette.indicatorColor,
                    shadow: { 
                        offsetX: 1, 
                        offsetY: 1, 
                        color: palette.textShadow, 
                        blur: 0, 
                        fill: true,
                    },
                }
            )
            .setOrigin(0, 0.5)
            .setVisible(false)
            .setDepth(DEPTH.indicator);

        // Vincula eventos de interação
        this.#bindPointerEvents(rowBg, index);
        this.#bindPointerEvents(optionText, index);

        // Aplica visibilidade inicial
        if (!this.#visible) {
            rowBg.setVisible(false);
            optionText.setVisible(false);
            indicator.setVisible(false);
        }

        return { rowBg, optionText, indicator, rowHeight };
    }

    /**
     * Define as opções disponíveis para o jogador
     * @param {Array<string|object>} options - Lista de opções (strings ou objetos com propriedade 'text')
     */
    setOptions(options) {
        this.#normalizedOptions = this.#normalizeOptions(options);
        this.#rebuildOptions();
    }

    applySettings() {
        if (this.#normalizedOptions.length === 0) {
            const metrics = this.#getLayoutMetrics();
            this.#paddingX = metrics.paddingX;
            this.#paddingY = metrics.paddingY;
            this.#optionGap = metrics.optionGap;
            this.#optionInnerPaddingY = metrics.optionInnerPaddingY;
            this.#applyBoxFrame(metrics.boxWidth, metrics.minBoxHeight);
            return;
        }

        this.#rebuildOptions();
    }

    #rebuildOptions() {
        this.clear();

        const metrics = this.#getLayoutMetrics();
        this.#paddingX = metrics.paddingX;
        this.#paddingY = metrics.paddingY;
        this.#optionGap = metrics.optionGap;
        this.#optionInnerPaddingY = metrics.optionInnerPaddingY;

        this.#applyBoxFrame(metrics.boxWidth, metrics.minBoxHeight);

        let currentY = this.boxY + this.#paddingY;

        this.#normalizedOptions.forEach((option, index) => {
            const { rowBg, optionText, indicator, rowHeight } =
                this.#createOptionRow(option, index, currentY, metrics);

            this.choiceTexts.push(optionText);
            this.choiceRows.push(rowBg);
            this.choiceIndicators.push(indicator);

            optionText.setVisible(this.#visible);
            rowBg.setVisible(this.#visible);

            currentY += rowHeight + this.#optionGap;
        });

        const requiredHeight = Math.max(
            metrics.minBoxHeight,
            currentY - this.boxY + this.#paddingY
        );

        const previousY = this.boxY;
        this.#applyBoxFrame(metrics.boxWidth, requiredHeight);
        const deltaY = this.boxY - previousY;

        if (deltaY !== 0) {
            this.choiceTexts.forEach((text) => text.setY(text.y + deltaY));
            this.choiceRows.forEach((row) => row.setY(row.y + deltaY));
            this.choiceIndicators.forEach((indicator) => indicator.setY(indicator.y + deltaY));
        }

        if (this.choiceRows.length > 0) {
            this.updateSelection(Phaser.Math.Clamp(this.selectedIndex, 0, this.choiceRows.length - 1));
        }
    }

    /**
     * Obtém a opção em um índice específico
     * @param {number} index - Índice da opção
     * @returns {object|null} Objeto da opção ou null se não encontrada
     */
    getOption(index) {
        return this.#normalizedOptions[index] ?? null;
    }

    /**
     * Limpa todas as opções e destrói os GameObjects associados
     */
    clear() {
        this.choiceTexts.forEach((text) => text.destroy());
        this.choiceRows.forEach((row) => row.destroy());
        this.choiceIndicators.forEach((indicator) => indicator.destroy());
        this.choiceTexts = [];
        this.choiceRows = [];
        this.choiceIndicators = [];
    }

    /**
     * Atualiza a seleção visual de uma opção
     * @param {number} selectedIndex - Índice da opção selecionada
     */
    updateSelection(selectedIndex) {
        const palette = this.#getPalette();
        this.selectedIndex = selectedIndex;
        this.choiceRows.forEach((row, index) => {
            const isSelected = index === selectedIndex;

            row.setFillStyle(
                isSelected ? palette.rowSelected : palette.rowNormal,
                1
            );
            row.setStrokeStyle(
                isSelected ? 2 : 1,
                isSelected ? palette.rowStrokeSel : palette.rowStroke
            );

            this.choiceTexts[index]?.setColor(
                isSelected ? palette.textSelected : palette.textNormal
            );
            this.choiceIndicators[index].setVisible(isSelected && this.#visible);
        });
    }

    /**
     * Retorna a quantidade de opções disponíveis
     */
    getChoicesCount() {
        return this.choiceRows.length;
    }

    /**
     * Exibe a caixa de opções
     */
    show() {
        this.#setVisible(true);
    }

    /**
     * Oculta a caixa de opções
     */
    hide() {
        this.#setVisible(false);
    }

    /**
     * Habilita ou desabilita interatividade das opções
     * @param {boolean} value - true para habilitar, false para desabilitar
     */
    setInteractiveEnabled(value) {
        this.#interactive = value;
    }

    /**
     * Define a visibilidade de todos os elementos da caixa de opções
     * @private
     */
    #setVisible(value) {
        this.#visible = value;
        [
            this.choicesBoxBackground,
            this.choicesBoxShadow,
            this.choicesInnerBorder,
            ...this.choiceRows,
            ...this.choiceIndicators,
            ...this.choiceTexts,
        ].forEach((obj) => obj?.setVisible(value));
    }
}
