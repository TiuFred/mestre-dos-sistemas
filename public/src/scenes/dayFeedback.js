import FeedbackManager from "../components/managers/FeedbackManager.js";
import EventsManager from "../components/managers/EventsManager.js";
import { SCENES } from "../constants.js";

export default class DayFeedbackScene extends Phaser.Scene {
    _day = 1;
    _scrollY = 0;
    _maxScrollY = 0;
    _contentContainer = null;

    constructor() {
        super({ key: SCENES.DAY_FEEDBACK });
    }

    init(data) {
        this._day = data?.day ?? 1;
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // ? O feedback do dia vem centralizado no manager para que a cena
        // ? apenas renderize o resultado acumulado do atendimento.
        const mistakes = FeedbackManager.getInstance().getMistakesOfDay();

        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.82).setDepth(0);

        const panelWidth = 1100;
        const panelHeight = 860;
        const panelX = width / 2;
        const panelY = height / 2;

        this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x111111, 0.97)
            .setStrokeStyle(4, 0xF9C22B)
            .setDepth(1);

        this.add.text(panelX, panelY - panelHeight / 2 + 48, `Resumo do Dia ${this._day}`, {
            fontFamily: "PressStart2P",
            fontSize: "26px",
            color: "#F9C22B",
            align: "center",
        }).setOrigin(0.5).setDepth(2);

        this.add.rectangle(panelX, panelY - panelHeight / 2 + 88, panelWidth - 60, 2, 0xF9C22B, 0.5)
            .setDepth(2);

        if (mistakes.length === 0) {
            this._renderPerfectDay(panelX, panelY);
        } else {
            // ? Quando existem muitos erros, a lista passa a ser rolavel em vez
            // ? de tentar encolher fonte ou compactar demais o conteudo.
            this._renderMistakesList(mistakes, panelX, panelY, panelWidth, panelHeight);
        }

        this._buildContinueButton(panelX, panelY + panelHeight / 2 - 54);

        this.input.on("wheel", (_pointer, _objects, _deltaX, deltaY) => {
            this._applyScroll(deltaY * 0.8);
        });
    }

    _renderPerfectDay(centerX, centerY) {
        this.add.text(centerX, centerY + 20, "Dia perfeito!\nVoce acertou tudo!", {
            fontFamily: "PressStart2P",
            fontSize: "20px",
            color: "#4EE94E",
            align: "center",
            lineSpacing: 16,
        }).setOrigin(0.5).setDepth(2);
    }

    _renderMistakesList(mistakes, centerX, centerY, panelWidth, panelHeight) {
        const contentTop = centerY - panelHeight / 2 + 112;
        const contentBottom = centerY + panelHeight / 2 - 88;
        const contentHeight = contentBottom - contentTop;
        const itemWidth = panelWidth - 80;
        const itemX = centerX - itemWidth / 2;
        const padding = 28;

        // ? O container agrupa toda a lista para que o scroll e a depth
        // ? sejam aplicados de forma consistente em todos os cards.
        this._contentContainer = this.add.container(0, 0).setDepth(3);

        const counterText = this.add.text(
            centerX,
            contentTop + 16,
            `${mistakes.length} erro${mistakes.length > 1 ? "s" : ""} neste dia`,
            {
                fontFamily: "PressStart2P",
                fontSize: "20px",
                color: "#FF6B6B",
                align: "center",
            }
        ).setOrigin(0.5, 0);

        this._contentContainer.add(counterText);

        let offsetY = contentTop + 52;

        mistakes.forEach((mistake, index) => {
            const cardY = offsetY;

            // ? O card nasce com altura minima e depois cresce com base no
            // ? tamanho real dos textos, mantendo o layout adaptavel.
            const cardBackground = this.add.rectangle(centerX, cardY, itemWidth, 10, 0x1E1E2E, 1)
                .setStrokeStyle(2, 0xF9C22B, 0.6)
                .setOrigin(0.5, 0)
                .setDepth(0);

            const numberLabel = this.add.text(
                itemX + padding + 18,
                cardY + padding,
                `#${index + 1}`,
                {
                    fontFamily: "PressStart2P",
                    fontSize: "24px",
                    color: "#F9C22B"
                }
            ).setOrigin(0.5, 0);

            const characterLabel = this.add.text(
                itemX + padding + 44,
                cardY + padding,
                mistake.character,
                {
                    fontFamily: "PressStart2P",
                    fontSize: "24px",
                    color: "#A0A0D0"
                }
            ).setOrigin(0, 0);

            const questionText = this.add.text(
                itemX + padding,
                cardY + padding + 36,
                mistake.question,
                {
                    fontFamily: "PressStart2P",
                    fontSize: "22px",
                    color: "#FFFFFF",
                    wordWrap: { width: itemWidth - padding * 2 },
                }
            ).setOrigin(0, 0);

            const tipY = cardY + padding + 36 + questionText.height + 14;

            const tipText = this.add.text(
                itemX + padding,
                tipY,
                mistake.tip,
                {
                    fontFamily: "PressStart2P",
                    fontSize: "20px",
                    color: "#B2EBF2",
                    wordWrap: { width: itemWidth - padding * 2 },
                    lineSpacing: 6,
                }
            ).setOrigin(0, 0);

            const cardHeight = padding + 36 + questionText.height + 14 + tipText.height + padding + 10;
            cardBackground.height = cardHeight;

            this._contentContainer.add([
                cardBackground,
                numberLabel,
                characterLabel,
                questionText,
                tipText
            ]);

            offsetY += cardHeight + 20;
        });

        this._maxScrollY = Math.max(0, (offsetY - (contentTop + 52)) - contentHeight);

        // ? A mask limita a renderizacao ao painel visivel, evitando que
        // ? textos longos escapem da caixa quando o usuario rola a lista.
        const maskShape = this.make.graphics({ add: false });
        maskShape.fillStyle(0xffffff, 1);
        maskShape.fillRect(itemX, contentTop, itemWidth, contentHeight);
        this._contentContainer.setMask(maskShape.createGeometryMask());

        if (this._maxScrollY > 0) {
            this.add.text(centerX, contentBottom - 8, "role para ver mais", {
                fontFamily: "PressStart2P",
                fontSize: "14px",
                color: "#888888",
            }).setOrigin(0.5, 1).setDepth(4);
        }
    }

    _applyScroll(delta) {
        if (!this._contentContainer) {
            return;
        }

        // ? O scroll e clampado para impedir que a lista passe dos limites
        // ? superior e inferior da area mascarada.
        this._scrollY = Phaser.Math.Clamp(this._scrollY + delta, 0, this._maxScrollY);
        this._contentContainer.setY(-this._scrollY);
    }

    _buildContinueButton(centerX, centerY) {
        const buttonWidth = 320;
        const buttonHeight = 52;

        const background = this.add.rectangle(centerX, centerY, buttonWidth, buttonHeight, 0xF9C22B)
            .setStrokeStyle(3, 0xffffff, 0.4)
            .setInteractive({ useHandCursor: true })
            .setDepth(3);

        this.add.text(centerX, centerY, "Continuar  ->", {
            fontFamily: "PressStart2P",
            fontSize: "14px",
            color: "#111111",
        }).setOrigin(0.5).setDepth(4);

        background.on("pointerover", () => {
            background.setFillStyle(0xFFD700);
            this.tweens.add({ targets: background, scaleX: 1.04, scaleY: 1.04, duration: 80 });
        });

        background.on("pointerout", () => {
            background.setFillStyle(0xF9C22B);
            this.tweens.add({ targets: background, scaleX: 1, scaleY: 1, duration: 80 });
        });

        background.on("pointerdown", () => {
            this._onContinue();
        });
    }

    _onContinue() {
        EventsManager.getInstance().emit("day_feedback:closed");
        this.scene.stop();
    }
}
