import { dialogTextStyle } from "../constants.js";
import DialogBox, { buildGuidePages } from "./DialogueBox.js";
import makeDraggable from "./Draggable.js";
import DayManager from "./managers/DayManager.js";

export default class Guide {
    constructor(scene, x, y, texture, scale = 0.7) {
        this.scene = scene;

        this.sprite = this.scene.add.image(x, y, texture);
        this.sprite.setScale(scale);
        this.sprite.setDepth(8000);
        this.sprite.setInteractive({ useHandCursor: true });
        /** @type {DialogBox|null} */
        this.guideBox = null;

        // CONTROLE DE DRAG VS CLICK
        this._dragged = false;

        // Torna arrastável
        this.dragController = makeDraggable(this.scene, this.sprite, this.scene.dragBounds);
    }

    enable() {
        this.sprite.removeAllListeners();

        // Quando começa a arrastar
        this.sprite.on("dragstart", () => {
            this._dragged = false;
        });

        // Enquanto arrasta
        this.sprite.on("drag", () => {
            this._dragged = true;
        });

        // Quando termina o drag
        this.sprite.on("dragend", () => {
            setTimeout(() => {
                this._dragged = false;
            }, 50);
        });

        this.sprite.on("pointerdown", (pointer) => {
            this._startX = pointer.x;
            this._startY = pointer.y;
        });

        this.sprite.on("pointerup", (pointer) => {
            const dx = Math.abs(pointer.x - this._startX);
            const dy = Math.abs(pointer.y - this._startY);

            const moved = dx > 10 || dy > 10;

            if (!moved) {
                this._openGuide();
            }
        });
    }

    disable() {
        this.sprite.removeAllListeners();
    }

    _openGuide() {
        if (this.guideBox) return;

        // actualDay começa em -1. O DayManager pula automaticamente o día 0
        // (chama startDay() de novo quando actualDay === 0), portanto o
        // Dia 1 real do jogo corresponde a actualDay === 1.
        const dayManager = new DayManager();
        const currentDay = dayManager.actualDay;

        this.guideBox = new DialogBox(this.scene, {
            x: 1150,
            y: 500,
            width: 800,
            height: 400,
            radius: 10,
            ...buildGuidePages(currentDay),
            backgroundColor: 0xFFAA67,
            strokeColor: 0x562600,
            strokeWidth: 5,
            textStyle: dialogTextStyle,
            titleStyle: {
                ...dialogTextStyle,
                color: '#562600',
                fontStyle: 'bold',
                fontSize: '18px',
            },
            onClose: () => this._closeGuide(),
        });

        this.sprite.setActive(false).setVisible(false);
    }

    _closeGuide() {
        this.guideBox.destroy();
        this.guideBox = null;

        this.sprite.setActive(true).setVisible(true);
    }

    upgradeTexture(textureKey) {
        this.sprite.setTexture(textureKey);
    }
}
