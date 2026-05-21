import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants.js";
import makeDraggable from "./Draggable.js";

/**
 * Componente visual de dossiê interativo.
 * Exibe um ícone clicável na cena que, ao ser acionado, abre um painel
 * com as informações do personagem (record e relatório).
 * @typedef {Object} DossieData
 * @property {Object}   record
 * @property {string}   record.nome
 * @property {string}   record.idade
 * @property {string}   record.profissao
 * @property {string}   record.renda
 * @property {string[]} report
 */

export default class Dossie {
    /**
     * @param {Phaser.Scene} scene        - A cena Phaser onde o dossiê será criado.
     * @param {number}       x            - Posição X do ícone clicável.
     * @param {number}       y            - Posição Y do ícone clicável.
     * @param {string}       texture      - Chave da textura do ícone no cache do Phaser.
     * @param {DossieData}   data         - Dados do personagem exibidos no painel.
     * @param {number}       [iconScale=1.5] - Escala aplicada ao ícone clicável.
     */
    constructor(scene, x, y, texture, data, iconScale = 1.5) {
        this.scene = scene;
        this.data  = data ?? {};
        this._dragged = false;  // Controle de drag vs click

        const SC = 4.875;
        const cx = (SCREEN_WIDTH  / 2) + 350;
        const cy =  SCREEN_HEIGHT / 2;

        this._SC = SC;
        this._cx = cx;
        this._cy = cy;

        // Container
        this.dossieContainer = this.scene.add.container(cx, cy);  // Já posiciona no centro
        this.dossieContainer.setDepth(20);
        this.dossieContainer.setVisible(false);

        // Ícone
        this.sprite = this.scene.add.image(x, y, texture);
        this.sprite.setScale(iconScale);
        this.sprite.setDepth(10);
        this.sprite.setInteractive({ useHandCursor: true });
        
        // Fundo (posição relativa ao container)
        this.dossieImage = this.scene.add.image(0, 0, "item_dossie");
        this.dossieImage.setOrigin(0.5);
        this.dossieImage.setScale(SC);
        this.dossieContainer.add(this.dossieImage);

        // Conteúdo
        this._contentObjects = [];
        this._buildContent();
        this._contentObjects.forEach(o => this.dossieContainer.add(o));

        // Botão fechar
        this.closeDossieButton = [];
        const IW = 127 * SC;
        const IH = 165 * SC;
        this._IW = IW;  // Guardar para uso no enable
        this._IH = IH;
        const btnR = 20;
        const btnX = cx + IW / 2 - btnR - 4;
        const btnY = cy - IH / 2 + btnR + 4;

        this.closeDossieButton[0] = this.scene.add.circle(btnX, btnY, btnR, 0xff2222)
            .setDepth(25).setVisible(false).setInteractive({ useHandCursor: true });

        this.closeDossieButton[1] = this.scene.add.text(btnX, btnY, "✕", {
            fontSize: "20px",
            color: "#ffffff",
            fontStyle: "bold",
            fontFamily: "Arial"
        }).setOrigin(0.5).setDepth(26).setVisible(false);

        // HitZone para drag (dentro do container para mover junto)
        this._dossieHitZone = this.scene.add.zone(0, -this._IH / 2 + 20, this._IW - 50, 50)
            .setInteractive({ useHandCursor: true })
            .setVisible(false)
            .setDepth(21);
        this.dossieContainer.add(this._dossieHitZone);

        this.enable();
    }

    _buildContent() {
        this._contentObjects = [];

        const record   = this.data.record ?? {};
        const report   = Array.isArray(this.data.report) ? this.data.report : [];
        const portrait = this.data.portrait ?? null;

        const nome      = record.nome      ?? "";
        const idade     = record.idade     ?? "";
        const profissao = record.profissao ?? "";
        const renda     = record.renda     ?? "";

        const SC   = this._SC;
        const left = -(127 * SC) / 2;
        const top  = -(165 * SC) / 2;
        const pad  = 10;

        const fTitle = "35px";
        const fBody  = "22px";

        const lhTitle = 26;
        const lhBody  = 22;

        // ── Foto esquerda — ocupa todo o quadrado ────────────────────
        if (portrait) {
        const photoX = left + 28.5 * SC;
        const photoY = top  + 29   * SC;

        const scale =
                                           1.1;

        this._img(photoX, photoY, portrait, scale);
        }

        // ── Coluna direita: cada campo em sua caixa ──────────────────
        // As posições Y são os centros verticais de cada caixa
        const colDirX = left + 57 * SC + pad;
        const colDirW = (122 - 57) * SC - pad * 2;

        this._txt(colDirX, top + 12 * SC, nome, {
            fontSize: "22px",
            color: "#111111",
            fontFamily: "Arial",
            fontStyle: "bold",
            wordWrap: { width: colDirW }
        }).setOrigin(0, 0.5);

        this._txt(colDirX, top + 27 * SC, idade, {
            fontSize: fBody,
            color: "#333333",
            fontFamily: "Arial",
            wordWrap: { width: colDirW }
        }).setOrigin(0, 0.5);

        this._txt(colDirX, top + 38 * SC, profissao, {
            fontSize: fBody,
            color: "#333333",
            fontFamily: "Arial",
            wordWrap: { width: colDirW }
        }).setOrigin(0, 0.5);

        this._txt(colDirX, top + 50 * SC, renda, {
            fontSize: fBody,
            color: "#333333",
            fontFamily: "Arial",
            wordWrap: { width: colDirW }
        }).setOrigin(0, 0.5);

        // ── Área relatório ───────────────────────────────────────────
        const relX = left + 6  * SC + pad;
        const relW = (122 - 6) * SC - pad * 2;
        let curY   = top  + 56 * SC + pad;

        this._txt(relX, curY, "RELATÓRIO", {
            fontSize: fTitle,
            color: "#555555",
            fontFamily: "Arial",
            fontStyle: "bold",
            letterSpacing: 1
        });

        curY += lhTitle + 20;

        report.forEach(item => {
            this._txt(relX, curY, `• ${item}`, {
                fontSize: fBody,
                color: "#222222",
                fontFamily: "Arial",
                wordWrap: { width: relW }
            });

            const charsPerLine = Math.floor(relW / (parseInt(fBody) * 0.58));
            const lines = Math.ceil(item.length / charsPerLine);
            curY += lines * lhBody + 4;
        });
    }

    _img(x, y, key, scale = 1) {
        const img = this.scene.add.image(x, y, key)
            .setScale(scale)
            .setOrigin(0.5);
        this._contentObjects.push(img);
        return img;
    }

    _txt(x, y, text, style) {
        const t = this.scene.add.text(x, y, text, style);
        this._contentObjects.push(t);
        return t;
    }

    enable() {
        const BASE  = this.sprite.scaleX;
        const HOVER = BASE + 0.2;

        // Torna ícone arrastável
        this.dragController = makeDraggable(this.scene, this.sprite, this.scene.dragBounds);

        // Rastreia drag no ícone
        this.sprite.on("dragstart", () => {
            this._dragged = false;
        });

        this.sprite.on("drag", () => {
            this._dragged = true;
        });

        this.sprite.on("dragend", () => {
            this._dragged = false;
        });

        // Rastreia pointerdown para detectar movimento
        this.sprite.on("pointerdown", (pointer) => {
            this._startX = pointer.x;
            this._startY = pointer.y;
        });

        this.sprite.on("pointerover", () =>
            this.scene.tweens.add({ targets: this.sprite, scale: HOVER, duration: 200, ease: "Power2" })
        );

        this.sprite.on("pointerout", () =>
            this.scene.tweens.add({ targets: this.sprite, scale: BASE, duration: 200, ease: "Power2" })
        );

        this.sprite.on("pointerup", (pointer) => {
            // Só abre se não foi arrastado
            const dx = Math.abs(pointer.x - this._startX);
            const dy = Math.abs(pointer.y - this._startY);
            const moved = dx > 10 || dy > 10;

            if (!moved && !this._dragged) {
                this._openDossie();
            }
        });

        // Torna container arrastável via hitZone
        let isDraggingContainer = false;
        let dragStartX = undefined;
        let dragStartY = undefined;
        let dragStartContainerX = 0;
        let dragStartContainerY = 0;

        this._dossieHitZone.on("pointerdown", (pointer) => {
            dragStartX = pointer.x;
            dragStartY = pointer.y;
            dragStartContainerX = this.dossieContainer.x;
            dragStartContainerY = this.dossieContainer.y;
            isDraggingContainer = false;
        });

        // Listener global para movimento enquanto arrasta
        this._dragMoveListener = (pointer) => {
            if (!this.dossieContainer.visible || !pointer.isDown) return;
            if (dragStartX === undefined) return;

            const distance = Phaser.Math.Distance.Between(dragStartX, dragStartY, pointer.x, pointer.y);
            if (distance > 5) {
                isDraggingContainer = true;
            }

            if (isDraggingContainer) {
                const dx = pointer.x - dragStartX;
                const dy = pointer.y - dragStartY;
                
                const newX = dragStartContainerX + dx;
                const newY = dragStartContainerY + dy;

                // Aplicar bounds
                const clampedX = Phaser.Math.Clamp(newX, this.scene.dragBounds.minX + this._IW / 2, this.scene.dragBounds.maxX - this._IW / 2);
                const clampedY = Phaser.Math.Clamp(newY, this.scene.dragBounds.minY + this._IH / 2, this.scene.dragBounds.maxY - this._IH / 2);

                this.dossieContainer.setPosition(clampedX, clampedY);

                // Mover botão de fechar junto
                const btnOffsetX = this._IW / 2 - 20 - 4;
                const btnOffsetY = -this._IH / 2 + 20 + 4;
                this.closeDossieButton[0].setPosition(clampedX + btnOffsetX, clampedY + btnOffsetY);
                this.closeDossieButton[1].setPosition(clampedX + btnOffsetX, clampedY + btnOffsetY);
            }
        };

        // Listener global para soltar
        this._dragUpListener = () => {
            dragStartX = undefined;
            isDraggingContainer = false;
        };

        this.scene.input.on("pointermove", this._dragMoveListener);
        this.scene.input.on("pointerup", this._dragUpListener);

        this.closeDossieButton[0].on("pointerdown", () => {
            // Só fecha se não foi arrastado o container
            if (!isDraggingContainer) {
                this._closeDossie();
            }
            isDraggingContainer = false;
            dragStartX = undefined;
        });
    }

    _closeDossie() {
        this.dossieContainer.setVisible(false);
        this.closeDossieButton[0].setVisible(false);
        this.closeDossieButton[1].setVisible(false);
        this._dossieHitZone.setVisible(false);
        this.sprite.setVisible(true);
    }

    _openDossie() {
        // Container já está posicionado no centro, apenas mostra
        this.sprite.setVisible(false);
        this.dossieContainer.setVisible(true);
        
        // Posiciona botão de fechar
        const btnX = this._cx + this._IW / 2 - 20 - 4;
        const btnY = this._cy - this._IH / 2 + 20 + 4;
        this.closeDossieButton[0].setPosition(btnX, btnY).setVisible(true);
        this.closeDossieButton[1].setPosition(btnX, btnY).setVisible(true);
        
        this._dossieHitZone.setVisible(true);
    }

    disable() {
        this.sprite.removeAllListeners();
        this.closeDossieButton[0].removeAllListeners();
        this._dossieHitZone.removeAllListeners();
        if (this._dragMoveListener) {
            this.scene.input.off("pointermove", this._dragMoveListener);
        }
        if (this._dragUpListener) {
            this.scene.input.off("pointerup", this._dragUpListener);
        }
    }

    setData(newData) {
        this._contentObjects.forEach(o => this.dossieContainer.remove(o, true));
        this.data = newData ?? {};
        this._buildContent();
        this._contentObjects.forEach(o => this.dossieContainer.add(o));
    }
}