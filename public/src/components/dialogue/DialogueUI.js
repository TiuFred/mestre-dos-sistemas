import { dialogueBoxPropertys } from "../../constants.js";
import EventsManager from "../managers/EventsManager.js";
import SettingsManager from "../managers/SettingsManager.js";
import { 
    DIALOGUE_PALETTE_EXTENDED as PALETTE,
    INDICATOR_CFG,
    BORDER_W, 
    INNER_W,
    FONT_SIZES,
    DIALOGUE_CONTAINER,
} from "./dialogueConstants.js";

// ─── Constantes locais ────────────────────────────────────────────────────
const FOOTER_H = DIALOGUE_CONTAINER.footerHeight;
const ICON_FONT_SIZE  = FONT_SIZES.icon;
const LABEL_FONT_SIZE = FONT_SIZES.label;
const DOTS_FONT_SIZE  = FONT_SIZES.dots;
const CONTAINER_BASE_X = DIALOGUE_CONTAINER.baseX;
const CONTAINER_BASE_Y = DIALOGUE_CONTAINER.baseY;

/**
 * Componente responsável pela renderização e animação da caixa de diálogo
 * Gerencia o texto digitado gradualmente (typewriter effect), indicadores
 * de estado (typing, continue, choice, end) e animações associadas.
 * 
 * @class DialogueUI
 */
export default class DialogueUI {
    scene          = null;
    container      = null;
    fullText       = "";
    pageTexts      = [];
    currentPageIndex = 0;
    currentIndex   = 0;
    typingEvent    = null;

    // Propriedades privadas
    #indicatorType  = null;
    #W              = 0;
    #H              = 0;
    #dotBaseY       = 0;
    #indicatorBaseY = 0;
    #bgGraphics     = null;
    #clickArea      = null;
    #dialogueText   = null;
    #indicatorIcon  = null;
    #indicatorLabel = null;
    #dot1           = null;
    #dot2           = null;
    #dot3           = null;
    #lastTypingSoundAt = 0;
    #typingSound = null;

    /**
     * Velocidade de digitação configurável via SettingsManager
     */
    get typingSpeed() {
        return 22 / SettingsManager.textSpeed;
    }

    /**
     * Cria uma nova instância de DialogueUI
     * @param {Phaser.Scene} scene - A cena Phaser onde o diálogo será renderizado
     */
    constructor(scene) {
        this.scene = scene;
        this.#create();
    }

    #getPalette() {
        if (!SettingsManager.highContrast) {
            return PALETTE;
        }

        return {
            borderOuter: 0xffffff,
            borderInner: 0xf9c22b,
            bgMain: 0x101010,
            bgHighlight: 0x242424,
            bgShadow: 0x000000,
            textColor: "#ffffff",
            textShadow: "#000000",
            indicatorNormal: "#f9c22b",
            indicatorMuted: "#ffffff",
            accentRed: 0xff6b6b,
        };
    }

    #getIndicatorConfig(type) {
        const baseCfg = INDICATOR_CFG[type];
        if (!baseCfg) {
            return null;
        }

        if (!SettingsManager.highContrast) {
            return baseCfg;
        }

        const palette = this.#getPalette();
        const colorByType = {
            typing: palette.indicatorMuted,
            continue: palette.indicatorNormal,
            choice: "#ffffff",
            end: palette.accentRed,
        };

        return {
            ...baseCfg,
            color: colorByType[type] ?? palette.indicatorNormal,
        };
    }

    #getLayoutMetrics() {
        const { width, height } = dialogueBoxPropertys;
        const fontScale = SettingsManager.fontScale ?? 1;
        const baseWidth = Math.round(Math.max(width, 700) / 1.8);
        const baseHeight = Math.round(Math.max(height, 175) * 1.1);

        const boxWidth = Math.round(baseWidth + (fontScale - 1) * 160);
        const boxHeight = Math.round(baseHeight + (fontScale - 1) * 110);
        const pad = BORDER_W + INNER_W + Math.round(8 + (fontScale - 1) * 8);

        return {
            boxWidth,
            boxHeight,
            pad,
            footerHeight: Math.round(FOOTER_H + (fontScale - 1) * 14),
            textFontSize: Math.max(28, Math.round(34 * fontScale)),
            lineSpacing: Math.max(8, Math.round(10 * fontScale)),
            iconFontSize: Math.max(26, Math.round(parseInt(FONT_SIZES.icon, 10) * fontScale)),
            labelFontSize: Math.max(24, Math.round(parseInt(FONT_SIZES.label, 10) * fontScale)),
            dotsFontSize: Math.max(24, Math.round(parseInt(FONT_SIZES.dots, 10) * fontScale)),
        };
    }

    #getMaxTextHeight(metrics) {
        return metrics.boxHeight - metrics.pad - metrics.footerHeight - metrics.pad + 12;
    }

    #measureTextHeight(text) {
        this.#dialogueText.setText(text || " ");
        return this.#dialogueText.height;
    }

    #findBestPageBreak(text, maxHeight) {
        let low = 1;
        let high = text.length;
        let best = 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const candidate = text.slice(0, mid).trimEnd();

            if (this.#measureTextHeight(candidate) <= maxHeight) {
                best = Math.max(1, mid);
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        const breakCandidates = [
            text.lastIndexOf("\n", best),
            text.lastIndexOf(" ", best),
        ].filter((index) => index >= 0);

        const preferredBreak = breakCandidates.length > 0 ? Math.max(...breakCandidates) : -1;
        if (preferredBreak >= Math.floor(best * 0.6)) {
            return preferredBreak + 1;
        }

        return best;
    }

    #paginateText(text) {
        const originalText = this.#dialogueText.text;
        const normalizedText = (text ?? "").trim();

        if (!normalizedText) {
            this.#dialogueText.setText(originalText);
            return [""];
        }

        const metrics = this.#getLayoutMetrics();
        const maxHeight = this.#getMaxTextHeight(metrics);
        const pages = [];
        let remaining = normalizedText;

        while (remaining.length > 0) {
            if (this.#measureTextHeight(remaining) <= maxHeight) {
                pages.push(remaining.trimEnd());
                break;
            }

            const breakIndex = this.#findBestPageBreak(remaining, maxHeight);
            const pageText = remaining.slice(0, breakIndex).trimEnd();

            if (!pageText) {
                pages.push(remaining.trimEnd());
                break;
            }

            pages.push(pageText);
            remaining = remaining.slice(breakIndex).replace(/^\s+/, "");
        }

        this.#dialogueText.setText(originalText);
        return pages.length > 0 ? pages : [normalizedText];
    }

    #getCurrentPageText() {
        return this.pageTexts[this.currentPageIndex] ?? "";
    }

    #getRevealedCharCount() {
        const previousPagesChars = this.pageTexts
            .slice(0, this.currentPageIndex)
            .reduce((total, pageText) => total + pageText.length, 0);

        return previousPagesChars + Math.min(this.currentIndex, this.#getCurrentPageText().length);
    }

    #resolvePageStateFromCharCount(charCount) {
        let remainingChars = Math.max(0, charCount);

        for (let index = 0; index < this.pageTexts.length; index += 1) {
            const pageLength = this.pageTexts[index].length;

            if (remainingChars <= pageLength) {
                return {
                    pageIndex: index,
                    charIndex: remainingChars,
                };
            }

            remainingChars -= pageLength;
        }

        const lastPageIndex = Math.max(0, this.pageTexts.length - 1);
        return {
            pageIndex: lastPageIndex,
            charIndex: this.pageTexts[lastPageIndex]?.length ?? 0,
        };
    }

    #rebuildPages({ revealedChars = 0, preservePartialPage = false } = {}) {
        this.pageTexts = this.#paginateText(this.fullText);

        const resolvedState = this.#resolvePageStateFromCharCount(revealedChars);
        this.currentPageIndex = resolvedState.pageIndex;
        this.currentIndex = preservePartialPage
            ? resolvedState.charIndex
            : this.#getCurrentPageText().length;

        this.#applyLayout(this.#getCurrentPageText().slice(0, this.currentIndex));
    }

    #drawBackground(W, H) {
        const gfx = this.#bgGraphics;
        const palette = this.#getPalette();
        gfx.clear();

        // Sombra
        gfx.fillStyle(0x000000, 0.45);
        gfx.fillRect(5, 6, W, H);

        // Borda externa
        gfx.fillStyle(palette.borderOuter, 1);
        gfx.fillRect(0, 0, W, H);

        // Fundo principal
        gfx.fillStyle(palette.bgMain, 1);
        gfx.fillRect(BORDER_W, BORDER_W, W - BORDER_W * 2, H - BORDER_W * 2);

        // Destaques (efeito 3D - topo e esquerda)
        gfx.fillStyle(palette.bgHighlight, 1);
        gfx.fillRect(BORDER_W, BORDER_W, W - BORDER_W * 2, INNER_W);
        gfx.fillRect(BORDER_W, BORDER_W, INNER_W, H - BORDER_W * 2);

        // Sombras (efeito 3D - fundo e direita)
        gfx.fillStyle(palette.bgShadow, 1);
        gfx.fillRect(BORDER_W, H - BORDER_W - INNER_W, W - BORDER_W * 2, INNER_W);
        gfx.fillRect(W - BORDER_W - INNER_W, BORDER_W, INNER_W, H - BORDER_W * 2);

        // Borda interna decorativa
        gfx.lineStyle(1, palette.borderInner, 0.5);
        gfx.strokeRect(
            BORDER_W + INNER_W, BORDER_W + INNER_W,
            W - (BORDER_W + INNER_W) * 2,
            H - (BORDER_W + INNER_W) * 2
        );
    }

    #applyLayout(displayedText = this.#dialogueText?.text ?? "") {
        const metrics = this.#getLayoutMetrics();
        const palette = this.#getPalette();
        const footerY = metrics.boxHeight - metrics.footerHeight / 2 - 2;
        const footerR = metrics.boxWidth - BORDER_W - 10;

        this.#W = metrics.boxWidth;
        this.#H = metrics.boxHeight;
        this.#indicatorBaseY = footerY;
        this.#dotBaseY = footerY;

        this.#drawBackground(metrics.boxWidth, metrics.boxHeight);

        this.#dialogueText
            .setPosition(metrics.pad, metrics.pad - 2)
            .setStyle({
                fontFamily: '"Georgia", "Palatino Linotype", serif',
                fontSize: `${metrics.textFontSize}px`,
                color: palette.textColor,
                lineSpacing: metrics.lineSpacing,
                wordWrap: { width: metrics.boxWidth - metrics.pad * 2 },
                shadow: {
                    offsetX: 2,
                    offsetY: 2,
                    color: palette.textShadow,
                    blur: 0,
                    fill: true,
                },
            })
            .setText(displayedText);

        this.#indicatorIcon
            .setPosition(footerR, footerY)
            .setFontSize(`${metrics.iconFontSize}px`);

        this.#indicatorLabel
            .setPosition(footerR, footerY)
            .setFontSize(`${metrics.labelFontSize}px`);

        [this.#dot1, this.#dot2, this.#dot3].forEach((dot) => {
            dot.setFontSize(`${metrics.dotsFontSize}px`);
            dot.setColor(palette.indicatorMuted);
        });
        this.#dot1.setPosition(footerR - 60, footerY);
        this.#dot2.setPosition(footerR - 34, footerY);
        this.#dot3.setPosition(footerR - 8, footerY);

        this.#clickArea
            .setPosition(0, 0)
            .setSize(metrics.boxWidth, metrics.boxHeight);
    }

    #scheduleTypingEvent() {
        const currentPageText = this.#getCurrentPageText();

        this.typingEvent = this.scene.time.addEvent({
            delay: this.typingSpeed,
            loop: true,
            callback: () => {
                this.currentIndex++;
                this.#dialogueText.setText(currentPageText.slice(0, this.currentIndex));

                if (this.currentIndex >= currentPageText.length) {
                    this.#removeTypingEvent();
                    this.#hideIndicator();

                    if (this.#typingSound && this.#typingSound.isPlaying) {
                        this.#typingSound.stop();
                    }

                    EventsManager.getInstance().emit("dialogue_typing_finished");
                }
            },
        });
    }

    applySettings() {
        const wasTyping = this.typingEvent !== null;
        const activeIndicator = this.#indicatorType;
        const revealedChars = this.#getRevealedCharCount();

        this.#rebuildPages({
            revealedChars,
            preservePartialPage: wasTyping,
        });

        if (wasTyping) {
            this.#removeTypingEvent();
            this.#scheduleTypingEvent();
        } else if (activeIndicator) {
            this.#indicatorType = null;
            this.setIndicator(activeIndicator);
        }
    }

    hasNextPage() {
        return this.currentPageIndex + 1 < this.pageTexts.length;
    }

    isOnLastPage() {
        return this.currentPageIndex >= this.pageTexts.length - 1;
    }

    showNextPage() {
        if (!this.hasNextPage()) {
            return false;
        }

        this.#removeTypingEvent();
        if (this.#typingSound && this.#typingSound.isPlaying) {
            this.#typingSound.stop();
        }

        this.currentPageIndex += 1;
        this.currentIndex = 0;
        this.#applyLayout("");
        this.setIndicator("typing");
        this.#startTypingSound();
        this.#scheduleTypingEvent();
        return true;
    }

    /**
     * Inicializa todos os elementos visuais da caixa de diálogo
     * @private
     */
    #create() {
        // ─── Desenho da caixa com bordas ───────────────────────────────────
        this.#bgGraphics = this.scene.add.graphics();

        // ─── Texto do diálogo ──────────────────────────────────────────────
        this.#dialogueText = this.scene.add.text(0, 0, "", {
            fontFamily: '"Georgia", "Palatino Linotype", serif',
            fontSize: "34px",
            color: PALETTE.textColor,
            lineSpacing: 10,
            wordWrap: { width: 1 },
            shadow: {
                offsetX: 2,
                offsetY: 2,
                color: PALETTE.textShadow,
                blur: 0,
                fill: true,
            },
        }).setOrigin(0, 0);

        // ─── Indicadores (footer) ──────────────────────────────────────────
        // Ícone do indicador
        this.#indicatorIcon = this.scene.add.text(0, 0, "", {
            fontFamily: '"Courier New", monospace',
            fontSize: ICON_FONT_SIZE,
            color: PALETTE.indicatorNormal,
            shadow: { offsetX: 1, offsetY: 1, color: "#3d1f0f", blur: 0, fill: true },
        }).setOrigin(1, 0.5).setAlpha(0);

        // Label do indicador
        this.#indicatorLabel = this.scene.add.text(0, 0, "", {
            fontFamily: '"Courier New", monospace',
            fontSize: LABEL_FONT_SIZE,
            color: PALETTE.indicatorNormal,
            letterSpacing: 2,
            shadow: { offsetX: 1, offsetY: 1, color: "#3d1f0f", blur: 0, fill: true },
        }).setOrigin(1, 0.5).setAlpha(0);

        // Pontos animados (para "typing...")
        const dotStyle = {
            fontFamily: '"Courier New", monospace',
            fontSize: DOTS_FONT_SIZE,
            color: PALETTE.indicatorMuted,
            shadow: { offsetX: 1, offsetY: 1, color: "#3d1f0f", blur: 0, fill: true },
        };

        this.#dot1 = this.scene.add.text(0, 0, "●", dotStyle).setOrigin(0.5, 0.5).setAlpha(0);
        this.#dot2 = this.scene.add.text(0, 0, "●", dotStyle).setOrigin(0.5, 0.5).setAlpha(0);
        this.#dot3 = this.scene.add.text(0, 0, "●", dotStyle).setOrigin(0.5, 0.5).setAlpha(0);

        // ─── Área clicável ────────────────────────────────────────────────
        this.#clickArea = this.scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.001)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });

        this.#clickArea.on("pointerdown", () => {
            EventsManager.getInstance().emit("dialogue:advance_request");
        });

        // ─── Container final ──────────────────────────────────────────────
        this.container = this.scene.add.container(CONTAINER_BASE_X, CONTAINER_BASE_Y, [
            this.#bgGraphics,
            this.#dialogueText,
            this.#indicatorIcon,
            this.#indicatorLabel,
            this.#dot1, this.#dot2, this.#dot3,
            this.#clickArea,
        ]);

        this.container.setDepth(50);
        this.container.setAlpha(0);
        this.#applyLayout("");
    }

    #startTypingSound() {
        if (!this.#typingSound || this.#typingSound.scene !== this.scene) {
            this.#typingSound = this.scene.sound.add("dialogueOpen", {
                loop: true,
                volume: SettingsManager.muted ? 0 : (0.18 * SettingsManager.sfxVolume),
            });
        }

        if (!this.#typingSound.isPlaying) {
            this.#typingSound.play();
        }
    }

    /**
     * Remove o evento de tipagem com segurança, defendendo contra timers
     * já destruídos por troca de cena ou rebind do DialogueManager
     * @private
     */
    #removeTypingEvent() {
        if (!this.typingEvent) return;
        try { 
            this.typingEvent.remove(false); 
        } catch (_) {
            // Timer pode já estar destruído - ignora silenciosamente
        }
        this.typingEvent = null;
    }

    /**
     * Define o tipo de indicador a exibir (typing, continue, choice, end)
     * Gerencia animações e transições visuais
     * @param {string} type - Tipo de indicador
     */
    setIndicator(type) {
        if (this.#indicatorType === type) return;
        this.#indicatorType = type;

        this.#killIndicatorTweens();
        this.#resetIndicatorPositions();

        const cfg = this.#getIndicatorConfig(type);
        if (!cfg) return;

        if (cfg.dots) {
            this.#animateDots();
            return;
        }

        this.#animateIndicator(cfg);
    }

    /**
     * Reseta as posições dos elementos do indicador
     * @private
     */
    #resetIndicatorPositions() {
        this.#indicatorIcon.setY(this.#indicatorBaseY);
        this.#indicatorLabel.setY(this.#indicatorBaseY);
        this.#dot1.setY(this.#dotBaseY);
        this.#dot2.setY(this.#dotBaseY);
        this.#dot3.setY(this.#dotBaseY);

        [this.#indicatorIcon, this.#indicatorLabel,
         this.#dot1, this.#dot2, this.#dot3].forEach(o => o.setAlpha(0));
    }

    /**
     * Anima o indicador com ícone e label
     * @private
     */
    #animateIndicator(cfg) {
        const gap = 10;
        const iconRight = this.#W - BORDER_W - 10;

        this.#indicatorIcon.setText(cfg.icon).setColor(cfg.color).setX(iconRight).setAlpha(1);

        const labelRight = iconRight - this.#indicatorIcon.width - gap;
        this.#indicatorLabel
            .setText(cfg.label)
            .setColor(cfg.color)
            .setX(labelRight)
            .setAlpha(0.92);

        // Animar movimento no eixo Y e fade
        if (cfg === INDICATOR_CFG.continue || cfg === INDICATOR_CFG.choice) {
            this.#animateButtonIndicator();
        } else if (cfg === INDICATOR_CFG.end) {
            this.#animateEndIndicator();
        }
    }

    /**
     * Anima indicadores de botão (continue, choice)
     * @private
     */
    #animateButtonIndicator() {
        this.scene.tweens.add({
            targets: this.#indicatorIcon,
            y: { from: this.#indicatorBaseY - 3, to: this.#indicatorBaseY + 3 },
            alpha: { from: 0.55, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        this.scene.tweens.add({
            targets: this.#indicatorLabel,
            alpha: { from: 0.4, to: 0.95 },
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });
    }

    /**
     * Anima indicador de fim ("end")
     * @private
     */
    #animateEndIndicator() {
        this.scene.tweens.add({
            targets: [this.#indicatorIcon, this.#indicatorLabel],
            alpha: { from: 0.3, to: 1 },
            scaleX: { from: 0.93, to: 1.05 },
            scaleY: { from: 0.93, to: 1.05 },
            duration: 580,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });
    }

    /**
     * Anima os pontos do indicador de "typing..."
     * @private
     */
    #animateDots() {
        [this.#dot1, this.#dot2, this.#dot3].forEach((dot, i) => {
            dot.setAlpha(0.25);

            this.scene.tweens.add({
                targets: dot,
                alpha: { from: 0.25, to: 1 },
                y: { from: this.#dotBaseY + 4, to: this.#dotBaseY - 4 },
                duration: 370,
                yoyo: true,
                repeat: -1,
                ease: "Sine.InOut",
                delay: i * 130,
            });
        });
    }

    /**
     * Cancela todas as animações dos elementos do indicador
     * @private
     */
    #killIndicatorTweens() {
        [this.#indicatorIcon, this.#indicatorLabel,
         this.#dot1, this.#dot2, this.#dot3].forEach(o => {
            if (o) this.scene.tweens.killTweensOf(o);
        });
    }

    /**
     * Oculta o indicador desativando animações e visibilidade
     * @private
     */
    #hideIndicator() {
        this.#killIndicatorTweens();
        this.#indicatorType = null;
        this.#resetIndicatorPositions();
    }

    /**
     * Inicia a animação de digitação (typewriter effect) do texto do diálogo
     * @param {string} text - Texto que será digitado
     */
    startTyping(text) {
        this.#removeTypingEvent();
        if (this.#typingSound && this.#typingSound.isPlaying) {
            this.#typingSound.stop();
        }

        // Cancela qualquer animação de hide() que possa estar pendente (ex: pausa durante minigame)
        this.scene.tweens.killTweensOf(this.container);

        this.fullText     = text;
        this.currentPageIndex = 0;
        this.currentIndex = 0;
        this.#rebuildPages({ revealedChars: 0, preservePartialPage: true });
        this.setIndicator("typing");
        this.#startTypingSound();

        this.container.setVisible(true);
        this.container.setY(CONTAINER_BASE_Y);

        // Animar entrada do container
        this.scene.tweens.add({
            targets: this.container,
            alpha: { from: this.container.alpha < 0.1 ? 0 : this.container.alpha, to: 1 },
            y: { from: CONTAINER_BASE_Y + 10, to: CONTAINER_BASE_Y },
            duration: 220,
            ease: "Quad.Out",
        });

        this.#scheduleTypingEvent();
    }

    /**
     * Pula a animação de digitação mostrando todo o texto de uma vez
     */
    skipTyping() {
        if (!this.typingEvent) return;

        this.#removeTypingEvent();

        this.currentIndex = this.#getCurrentPageText().length;
        this.#dialogueText.setText(this.#getCurrentPageText());
        this.#hideIndicator();

        EventsManager.getInstance().emit("dialogue_typing_finished");
        if (this.#typingSound && this.#typingSound.isPlaying) {this.#typingSound.stop();}
    }

    /**
     * Verifica se o diálogo está em processo de digitação
     * @returns {boolean}
     */
    isTyping() {
        return this.typingEvent !== null;
    }

    /**
     * Verifica se a digitação foi finalizada
     * @returns {boolean}
     */
    isTypingFinished() {
        return this.currentIndex >= this.fullText.length;
    }

    /**
     * Exibe a caixa de diálogo
     */
    show() {
        this.container.setVisible(true);
    }

    /**
     * Oculta a caixa de diálogo com animação de fade-out
     */
    hide() {
        this.#hideIndicator();

        this.scene.tweens.add({
            targets: this.container,
            alpha: { from: 1, to: 0 },
            y: { from: CONTAINER_BASE_Y, to: CONTAINER_BASE_Y + 10 },
            duration: 180,
            ease: "Quad.In",
            onComplete: () => this.container.setVisible(false),
        });
        if (this.#typingSound && this.#typingSound.isPlaying) {this.#typingSound.stop();}
    }
}
