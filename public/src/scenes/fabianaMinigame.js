import { SCENES } from "../constants.js";
import EventsManager from "../components/managers/EventsManager.js";

const CARD_NUMBER = "491851631116";

export default class FabianaMinigameScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.FABIANA_MINIGAME });
    }

    init(data) {
        this.config         = data?.config ?? {};
        this.machineUnlocked = false;
        this.completed      = false;
        this.enteredDigits  = "";
        this.attempts       = 0;
        this.cardDragOffset = { x: 0, y: 0 };
        this.cardStart      = null;
    }

    preload() {
        this.load.on("loaderror", (fileObj) => {
            console.error("Erro ao carregar asset:", fileObj.src);
        });

        this.load.image("minigames_bg",    "src/assets/minigames/minigames-background.png");
        this.load.image("fabiana_card",    "src/assets/minigames/fabiana/fabiana-card.png");
        this.load.image("fabiana_machine", "src/assets/minigames/fabiana/card-machine.png");
    }

    create() {
        const { width, height } = this.scale;

        // ── Fundo ────────────────────────────────────────────────────────────
        this.add.image(width / 2, height / 2, "minigames_bg")
            .setDisplaySize(width, height);

        this.add.rectangle(width / 2, 86, 1120, 120, 0x0f172a, 0.84)
            .setStrokeStyle(3, 0xcbd5e1, 0.45);

        this.add.text(width / 2, 64, "Confira o saldo de Fabiana", {
            fontFamily: "PressStart2P",
            fontSize: "36px",
            color: "#f8fafc",
            fontStyle: "bold",
        }).setOrigin(0.5);

        // ── Instrução ────────────────────────────────────────────────────────
        this.helpText = this.add.text(
            width / 2, 112,
            "1. Arraste o cartão até a tela da máquina para utilizar o método de aproximação.",
            {
                fontFamily: "PressStart2P",
                fontSize: "14px",
                color: "#fde68a",
                align: "center",
                wordWrap: { width: 1020 },
            }
        ).setOrigin(0.5);

        // ── Cartão ───────────────────────────────────────────────────────────
        this.cardShadow = this.add.rectangle(350, 670, 420, 220, 0x000000, 0.18);
        this.cardShadow.setAngle(-4);

        this.card = this.add.image(90, 620, "fabiana_card");
        this.card.setOrigin(0, 0.5);
        this.card.setScale(0.42);
        this.card.setAngle(-4);
        this.card.setInteractive({ cursor: "grab" });
        this.card.input.cursor = "grab";
        this.input.setDraggable(this.card);

        this.cardStart = { x: this.card.x, y: this.card.y, angle: this.card.angle };

        // ── Máquina ──────────────────────────────────────────────────────────
        this.machine = this.add.image(1880, 600, "fabiana_machine");
        this.machine.setOrigin(1, 0.5);
        this.machine.setScale(0.5);

        // Zona de detecção da entrada da maquininha
        this.slotZone = this.add.zone(1635, 600, 250, 500);

        // Visor da maquininha
        this.displayText = this.add.text(1675, 450, "APROXIME SEU\nCARTAO AQUI!", {
            fontFamily: "Courier New",
            fontSize: "25px",
            color: "#000000",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: 310, useAdvancedWrap: true },
        }).setOrigin(0.5);

        // ── Notificação flutuante ─────────────────────────────────────────────
        this.notificationBox = this.add.rectangle(width / 2, 190, 540, 88, 0x14532d, 0);
        this.notificationBox.setStrokeStyle(4, 0x86efac, 0);
        this.notificationBox.setAlpha(0);

        this.notificationText = this.add.text(width / 2, 190, "", {
            fontFamily: "PressStart2P",
            fontSize: "22px",
            color: "#f0fdf4",
            fontStyle: "bold",
            align: "center",
        }).setOrigin(0.5).setAlpha(0);

        // ── Teclado e Inputs ──────────────────────────────────────────────────
        this._createKeypadButtons();
        this._registerInput();
        this._createContinueButton();
    }

    // ── Botão de continuar ────────────────────────────────────────────────────

    _createContinueButton() {
        const { width, height } = this.scale;
        const bx = width / 2;
        const by = height - 80;

        this.continueBtn = this.add.container(bx, by).setAlpha(0).setDepth(30);

        const bg = this.add.rectangle(0, 0, 420, 72, 0xF9C22B)
            .setStrokeStyle(4, 0x000000)
            .setInteractive({ useHandCursor: true });

        const label = this.add.text(0, 0, "Continuar  ->", {
            fontFamily: "PressStart2P",
            fontSize: "18px",
            color: "#000000",
        }).setOrigin(0.5);

        this.continueBtn.add([bg, label]);

        // Hover
        bg.on("pointerover", () => {
            this.tweens.add({ targets: this.continueBtn, scaleX: 1.06, scaleY: 1.06, duration: 80 });
        });
        bg.on("pointerout", () => {
            this.tweens.add({ targets: this.continueBtn, scaleX: 1, scaleY: 1, duration: 80 });
        });

        // Clique: emite o resultado e volta ao diálogo
        bg.on("pointerdown", () => {
            bg.disableInteractive();
            this.tweens.add({
                targets: this.continueBtn,
                alpha: 0,
                scaleX: 0.9,
                scaleY: 0.9,
                duration: 160,
                onComplete: () => {
                    const score = Math.max(40, 100 - ((this.attempts - 1) * 15));
                    EventsManager.getInstance().emit("minigame:scene_result", {
                        success: true,
                        score,
                    });
                },
            });
        });
    }

    _showContinueButton() {
        this.tweens.add({
            targets: this.continueBtn,
            alpha: 1,
            y: this.scale.height - 80,
            duration: 300,
            ease: "Back.easeOut",
        });
    }

    // ── Teclado da maquininha ────────────────────────────────────────────────

    _createKeypadButtons() {
        const buttonLayout = [
            { key: "7",      x: 1562, y: 553, width: 50,  height: 60  },
            { key: "8",      x: 1625, y: 553, width: 50,  height: 60  },
            { key: "9",      x: 1689, y: 553, width: 50,  height: 60  },
            { key: "DEL",    x: 1777, y: 553, width: 96,  height: 55  },
            { key: "4",      x: 1562, y: 623, width: 50,  height: 60  },
            { key: "5",      x: 1625, y: 623, width: 50,  height: 60  },
            { key: "6",      x: 1689, y: 623, width: 50,  height: 60  },
            { key: "CANCEL", x: 1777, y: 623, width: 96,  height: 55  },
            { key: "1",      x: 1562, y: 693, width: 50,  height: 60  },
            { key: "2",      x: 1625, y: 693, width: 50,  height: 60  },
            { key: "3",      x: 1689, y: 693, width: 50,  height: 60  },
            { key: "0",      x: 1625, y: 763, width: 50,  height: 60  },
            { key: "OK",     x: 1765, y: 727, width: 72,  height: 128 },
        ];

        this.keypadButtons = buttonLayout.map((button) => {
            const hitArea = this.add
                .zone(button.x, button.y, button.width, button.height)
                .setInteractive({ cursor: "pointer" })
                .setDepth(20);

            hitArea.on("pointerdown", () => this._handleKeypadInput(button.key));

            return hitArea;
        });
    }

    // ── Inputs (arrastar + teclado físico) ───────────────────────────────────

    _registerInput() {
        this.input.on("dragstart", (pointer, gameObject) => {
            if (gameObject !== this.card || this.completed) return;

            this.card.setScale(0.45);
            this.cardDragOffset.x = pointer.x - this.card.x;
            this.cardDragOffset.y = pointer.y - this.card.y;
        });

        this.input.on("drag", (pointer, gameObject) => {
            if (gameObject !== this.card || this.completed) return;

            gameObject.x = Phaser.Math.Clamp(pointer.x - this.cardDragOffset.x, 40, 1380);
            gameObject.y = Phaser.Math.Clamp(pointer.y - this.cardDragOffset.y, 230, 840);
            this.cardShadow.setPosition(gameObject.x + 260, gameObject.y + 40);
            this._updateReaderFeedback();
        });

        this.input.on("dragend", (pointer, gameObject) => {
            if (gameObject !== this.card || this.completed) return;

            this.card.setScale(0.42);

            if (this._isCardNearReader()) {
                this._unlockMachine();
                this.tweens.add({
                    targets: this.card,
                    x: 1045, y: 470, angle: -4,
                    duration: 260,
                    ease: "Sine.easeOut",
                    onUpdate: () => {
                        this.cardShadow.setPosition(this.card.x + 260, this.card.y + 40);
                    },
                });
            } else {
                this.tweens.add({
                    targets: this.card,
                    x: this.cardStart.x,
                    y: this.cardStart.y,
                    angle: this.cardStart.angle,
                    duration: 260,
                    ease: "Quad.easeOut",
                    onUpdate: () => {
                        this.cardShadow.setPosition(this.card.x + 260, this.card.y + 40);
                    },
                });
            }
        });

        this.input.keyboard.on("keydown", (event) => {
            if (this.completed || !this.machineUnlocked) return;

            if (/^\d$/.test(event.key))  { this._handleKeypadInput(event.key);   return; }
            if (event.key === "Backspace"){ this._handleKeypadInput("DEL");       return; }
            if (event.key === "Enter")    { this._handleKeypadInput("OK");        return; }
            if (event.key === "Escape")   { this._handleKeypadInput("CANCEL");            }
        });
    }

    // ── Lógica ───────────────────────────────────────────────────────────────

    _updateReaderFeedback() {
        if (this.completed) return;

        if (this._isCardNearReader()) {
            this.displayText.setText("SOLTE O\nCARTAO");
        } else if (!this.machineUnlocked) {
            this.displayText.setText("APROXIME SEU\nCARTAO AQUI!");
        }
    }

    _isCardNearReader() {
        const cardCenterX = this.card.x + this.card.displayWidth / 2;
        const cardCenterY = this.card.y;
        const dx = cardCenterX - this.slotZone.x;
        const dy = cardCenterY - this.slotZone.y;
        return Math.sqrt(dx * dx + dy * dy) < 185;
    }

    _unlockMachine() {
        if (this.machineUnlocked) return;

        this.machineUnlocked = true;
        this.helpText.setText("2. Digite o numero do cartao na maquina e pressione OK.");
        this.displayText.setText(this._formatDisplay(this.enteredDigits));
    }

    _handleKeypadInput(key) {
        if (!this.machineUnlocked || this.completed) return;

        if (/^\d$/.test(key)) {
            if (this.enteredDigits.length < CARD_NUMBER.length) {
                this.enteredDigits += key;
            }
            this.displayText.setText(this._formatDisplay(this.enteredDigits));
            return;
        }

        if (key === "DEL") {
            this.enteredDigits = this.enteredDigits.slice(0, -1);
            this.displayText.setText(this._formatDisplay(this.enteredDigits));
            return;
        }

        if (key === "CANCEL") {
            this.enteredDigits = "";
            this.displayText.setText(this._formatDisplay(this.enteredDigits));
            this._showTemporaryMessage("Numero limpo", 0x1d4ed8, 0x93c5fd);
            return;
        }

        if (key === "OK") {
            this._validateCardNumber();
        }
    }

    _validateCardNumber() {
        this.attempts += 1;

        if (this.enteredDigits === CARD_NUMBER) {
            this.completed = true;
            this.displayText.setText("SALDO DE FABIANA: R$50,00");
            this.helpText.setText("Agora Fabiana sabe seu saldo, parabéns! ");

            this.time.delayedCall(600, () => this._showContinueButton());
            return;
        }

        this.displayText.setText("NUMERO INVALIDO");
        this._showTemporaryMessage("Numero incorreto", 0x7f1d1d, 0xfca5a5);

        this.time.delayedCall(900, () => {
            if (!this.completed) {
                this.displayText.setText(this._formatDisplay(this.enteredDigits));
            }
        });
    }

    _formatDisplay(value) {
        if (!value) return "DIGITE O NUMERO";
        return value.replace(/(.{4})/g, "$1 ").trim();
    }

    _showTemporaryMessage(message, fillColor, strokeColor, persistent = false) {
        this.notificationBox.setFillStyle(fillColor, 0.95);
        this.notificationBox.setStrokeStyle(4, strokeColor, 1);
        this.notificationText.setText(message);

        this.tweens.killTweensOf([this.notificationBox, this.notificationText]);

        this.tweens.add({
            targets: [this.notificationBox, this.notificationText],
            alpha: 1,
            duration: 160,
            ease: "Sine.easeOut",
        });

        if (!persistent) {
            this.time.delayedCall(1200, () => {
                this.tweens.add({
                    targets: [this.notificationBox, this.notificationText],
                    alpha: 0,
                    duration: 220,
                    ease: "Sine.easeIn",
                });
            });
        }
    }
}
