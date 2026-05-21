import { Button } from "../components/Button.js";
import SaveManager from "../components/managers/SaveManager.js";
import SettingsManager from "../components/managers/SettingsManager.js";
import { SCENES, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants.js";

const SLOT_IDS = SaveManager.getSlotIds();

// ── Layout ────────────────────────────────────────────────────────────────────
const PANEL_W   = 1560;
const PANEL_H   = 920;
const PANEL_X   = (SCREEN_WIDTH  - PANEL_W) / 2;   // 180
const PANEL_Y   = (SCREEN_HEIGHT - PANEL_H) / 2;   // 80
const HEADER_H  = 86;
const FOOTER_H  = 62;
const GRID_PAD  = 20;
const CARD_COLS = 2;
const CARD_ROWS = 3;
const CARD_GAP_X = 18;
const CARD_GAP_Y = 12;

const GRID_W = PANEL_W - GRID_PAD * 2;
const GRID_H = PANEL_H - HEADER_H - FOOTER_H - GRID_PAD * 2;
const CARD_W = Math.floor((GRID_W - CARD_GAP_X * (CARD_COLS - 1)) / CARD_COLS);
const CARD_H = Math.floor((GRID_H - CARD_GAP_Y * (CARD_ROWS - 1)) / CARD_ROWS);
const PREV_W = 190;  // largura da faixa de preview à esquerda do card

const GRID_X = PANEL_X + GRID_PAD;
const GRID_Y = PANEL_Y + HEADER_H + GRID_PAD;

// ── Paletas de preview por dia ─────────────────────────────────────────────────
const DAY_PAL = {
    1: { top: 0x0e1e32, mid: 0x1a3a5c, glow: 0x2a5a8c },  // azul-noturno
    2: { top: 0x180c2c, mid: 0x2e1858, glow: 0x4a2888 },  // púrpura
    3: { top: 0x2c0c0e, mid: 0x581820, glow: 0x882830 },  // vermelho escuro
};
const AUTO_PAL  = { top: 0x0c1c0e, mid: 0x183220, glow: 0x285830 };
const EMPTY_PAL = { top: 0x080808, mid: 0x111111, glow: 0x181818 };

// ── Cores gerais ──────────────────────────────────────────────────────────────
const C = {
    panelBg:      0x0a0604,
    panelBorder:  0x5c4210,
    panelAccent:  0xf9c22b,
    cardBg:       0x180e08,
    cardBgEmpty:  0x0c0806,
    cardBorder:   0x362010,
    cardHover:    0xf9c22b,
    btnPrimary:   0xb71c1c,
    btnDisabled:  0x38281e,
    btnDelete:    0x283038,
    badgeAuto:    0x183018,
    badgeRecent:  0x382c08,
    goldN:        0xf9c22b,
    gold:         "#f9c22b",
    white:        "#ffffff",
    silver:       "#c0a888",
    dim:          "#6a5040",
    soft:         "#907060",
};
const FONT = "PressStart2P";

// ─────────────────────────────────────────────────────────────────────────────

export default class SaveSlotsScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.SAVE_SLOTS });
        this._mode = "load";
        this._originSceneKey = SCENES.MENU;
        this._closeMode = "stop";
        this._resumeSceneKey = null;
    }

    init(data = {}) {
        this._mode           = data.mode           ?? "load";
        this._originSceneKey = data.originSceneKey ?? SCENES.MENU;
        this._closeMode      = data.closeMode      ?? "stop";
        this._resumeSceneKey = data.resumeSceneKey ?? null;
        this._isRestart      = data._isRestart     ?? false;
    }

    create() {
        this._slots              = SaveManager.listSlots();
        this._confirmOverlay     = null;
        this._manualSaveStatus   = SaveManager.getManualSaveStatus();
        this._latestManualSlotId = SaveManager.getLatestManualSlotId();

        this._buildBackdrop();
        this._buildPanel();
        this._buildHeader();
        this._buildCards();
        this._buildFooter();

        this.brightnessOverlay = this.add.rectangle(
            SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000
        ).setDepth(9999).setAlpha(1 - SettingsManager.brightness);

        // Fade in apenas na abertura inicial, não ao apagar um slot
        if (!this._isRestart) {
            this.cameras.main.setAlpha(0);
            this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 240, ease: "Sine.Out" });
        }
    }

    // ── Backdrop ──────────────────────────────────────────────────────────────

    _buildBackdrop() {
        this.add.rectangle(
            SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2,
            SCREEN_WIDTH, SCREEN_HEIGHT,
            0x000000, 0.82
        );
    }

    // ── Panel ─────────────────────────────────────────────────────────────────

    _buildPanel() {
        const gfx = this.add.graphics();

        // Sombra projetada
        gfx.fillStyle(0x000000, 0.55);
        gfx.fillRect(PANEL_X + 7, PANEL_Y + 10, PANEL_W, PANEL_H);

        // Borda dourada (3 px)
        gfx.fillStyle(C.panelBorder);
        gfx.fillRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);

        // Fundo do painel
        gfx.fillStyle(C.panelBg);
        gfx.fillRect(PANEL_X + 3, PANEL_Y + 3, PANEL_W - 6, PANEL_H - 6);

        // Quadradinhos dourados nos cantos
        const cs = 12;
        [
            [PANEL_X,              PANEL_Y],
            [PANEL_X + PANEL_W - cs, PANEL_Y],
            [PANEL_X,              PANEL_Y + PANEL_H - cs],
            [PANEL_X + PANEL_W - cs, PANEL_Y + PANEL_H - cs],
        ].forEach(([x, y]) => {
            gfx.fillStyle(C.panelAccent);
            gfx.fillRect(x, y, cs, cs);
        });

        // Linhas separadoras de header e footer
        gfx.lineStyle(1, C.panelBorder, 0.8);
        for (const lineY of [PANEL_Y + HEADER_H - 2, PANEL_Y + PANEL_H - FOOTER_H]) {
            gfx.beginPath();
            gfx.moveTo(PANEL_X + 18, lineY);
            gfx.lineTo(PANEL_X + PANEL_W - 18, lineY);
            gfx.strokePath();
        }
    }

    // ── Header ────────────────────────────────────────────────────────────────

    _buildHeader() {
        const cx = PANEL_X + PANEL_W / 2;
        const title    = this._mode === "save" ? "SALVAR JOGO" : "CARREGAR JOGO";
        const subtitle = this._mode === "save"
            ? "Selecione um slot para registrar o progresso"
            : "Selecione um registro salvo para continuar";

        this.add.text(cx, PANEL_Y + 26, title, {
            fontFamily: FONT, fontSize: "26px", color: C.gold,
            shadow: { offsetX: 2, offsetY: 2, color: "#3a1a00", blur: 0, fill: true },
        }).setOrigin(0.5);

        this.add.text(cx, PANEL_Y + 58, subtitle, {
            fontFamily: FONT, fontSize: "11px", color: C.silver,
        }).setOrigin(0.5);

        // Aviso de save bloqueado
        if (this._mode === "save" && !this._manualSaveStatus.allowed) {
            this.add.text(cx, PANEL_Y + 76, `⚠  ${this._manualSaveStatus.reason}`, {
                fontFamily: FONT, fontSize: "10px", color: "#e57373",
            }).setOrigin(0.5);
        }
    }

    // ── Cards ─────────────────────────────────────────────────────────────────

    _buildCards() {
        // Autosave + 5 slots manuais = 6 itens em grade 2×3
        const entries = [
            {
                id:       SaveManager.AUTOSAVE_ID,
                label:    "AUTOSAVE",
                isAuto:   true,
                slotMeta: _buildAutosaveMeta(),
                disabled: this._mode === "save",
            },
            ...SLOT_IDS.map((id, i) => ({
                id,
                label:    `SLOT ${i + 1}`,
                isAuto:   false,
                slotMeta: this._slots.find(s => s.id === id) ?? { id, status: "empty", data: null },
                disabled: this._mode === "save" && !this._manualSaveStatus.allowed,
            })),
        ];

        entries.forEach((entry, idx) => {
            const col = idx % CARD_COLS;
            const row = Math.floor(idx / CARD_COLS);
            const cx  = GRID_X + col * (CARD_W + CARD_GAP_X);
            const cy  = GRID_Y + row * (CARD_H + CARD_GAP_Y);
            this._buildCard(entry, cx, cy);
        });
    }

    _buildCard({ id, label, isAuto, slotMeta, disabled }, cx, cy) {
        const W = CARD_W, H = CARD_H;
        const data      = slotMeta?.data  ?? null;
        const status    = slotMeta?.status ?? "empty";
        const isEmpty   = !data;
        const isInvalid = status === "invalid";
        const isLatest  = id === this._latestManualSlotId;
        const day       = data?.preview?.day ?? null;
        const preview   = data?.preview ?? {};

        // ── Fundo do card ─────────────────────────────────────────────────────
        const gfx = this.add.graphics();

        // Sombra
        gfx.fillStyle(0x000000, 0.5);
        gfx.fillRect(cx + 4, cy + 4, W, H);

        // Borda (dourada se for o save mais recente)
        gfx.fillStyle(isLatest ? C.panelAccent : C.cardBorder);
        gfx.fillRect(cx, cy, W, H);

        // Fill interno
        gfx.fillStyle(isEmpty || disabled ? C.cardBgEmpty : C.cardBg);
        gfx.fillRect(cx + 2, cy + 2, W - 4, H - 4);

        // ── Faixa de preview — desenhada em gfx separado para não vazar ───────
        const prevGfx = this.add.graphics();
        _drawPreview(prevGfx, cx + 2, cy + 2, PREV_W - 2, H - 4, day, isAuto, isEmpty || disabled);

        // Linha divisória preview | info
        gfx.lineStyle(1, C.cardBorder, 0.8);
        gfx.beginPath();
        gfx.moveTo(cx + PREV_W + 1, cy + 6);
        gfx.lineTo(cx + PREV_W + 1, cy + H - 6);
        gfx.strokePath();

        // ── Texto da preview (número do dia) — adicionado DEPOIS do gfx ───────
        const prevCx = cx + 2 + (PREV_W - 2) / 2;
        const prevCy = cy + H / 2;

        if (!isEmpty && day !== null) {
            this.add.text(prevCx, prevCy - 10, String(day), {
                fontFamily: FONT, fontSize: "44px", color: "#ffffff",
                shadow: { offsetX: 2, offsetY: 3, color: "#000000", blur: 0, fill: true },
            }).setOrigin(0.5);

            this.add.text(prevCx, prevCy + 30, "DIA", {
                fontFamily: FONT, fontSize: "10px", color: "#9898b0",
                letterSpacing: 6,
            }).setOrigin(0.5);
        } else {
            // Slot vazio: traço visível em cinza claro
            this.add.text(prevCx, prevCy, "—", {
                fontFamily: FONT, fontSize: "32px", color: "#404050",
            }).setOrigin(0.5);
        }

        // ── Área de informações (direita) ─────────────────────────────────────
        const infoX    = cx + PREV_W + 16;
        const infoMaxW = W - PREV_W - 32;

        // ── Linha de cabeçalho: label do slot + badge ──────────────────────────
        this.add.text(infoX, cy + 14, label, {
            fontFamily: FONT, fontSize: "14px",
            color: isLatest ? C.gold : C.silver,
        });

        if (isAuto || isLatest) {
            const badgeLabel = isAuto ? "AUTOSAVE" : "RECENTE";
            const badgeBg    = isAuto ? C.badgeAuto   : C.badgeRecent;
            const badgeFg    = isAuto ? "#7cf0a9"     : C.gold;
            const badgeBd    = isAuto ? 0x3cf07c      : C.panelAccent;
            const bw  = badgeLabel.length * 10 + 18;
            const bh  = 24;
            const bx  = cx + W - 14 - bw;
            const by  = cy + 10;

            const bGfx = this.add.graphics();
            bGfx.fillStyle(badgeBg);
            bGfx.fillRect(bx, by, bw, bh);
            bGfx.lineStyle(1, badgeBd, 0.75);
            bGfx.strokeRect(bx, by, bw, bh);
            this.add.text(bx + bw / 2, by + bh / 2, badgeLabel, {
                fontFamily: FONT, fontSize: "10px", color: badgeFg,
            }).setOrigin(0.5);
        }

        // Linha separadora fina sob o cabeçalho
        const sep1Gfx = this.add.graphics();
        sep1Gfx.lineStyle(1, C.cardBorder, 0.6);
        sep1Gfx.beginPath();
        sep1Gfx.moveTo(infoX, cy + 38);
        sep1Gfx.lineTo(cx + W - 14, cy + 38);
        sep1Gfx.strokePath();

        // ── Conteúdo principal ────────────────────────────────────────────────
        if (isInvalid) {
            this.add.text(infoX, cy + H / 2 - 10, "Save inválido", {
                fontFamily: FONT, fontSize: "14px", color: "#e57373",
            }).setOrigin(0, 0.5);
            this.add.text(infoX, cy + H / 2 + 20, "Este slot pode ser apagado.", {
                fontFamily: FONT, fontSize: "11px", color: C.dim,
            }).setOrigin(0, 0.5);

        } else if (isEmpty) {
            this.add.text(infoX, cy + H / 2, "Espaço vazio", {
                fontFamily: FONT, fontSize: "16px", color: C.soft,
            }).setOrigin(0, 0.5);
            if (disabled && this._manualSaveStatus.reason) {
                this.add.text(infoX, cy + H / 2 + 30, this._manualSaveStatus.reason, {
                    fontFamily: FONT, fontSize: "10px", color: "#6a4838",
                    wordWrap: { width: infoMaxW },
                }).setOrigin(0, 0.5);
            }

        } else {
            const clientName = preview.clientName ?? "—";
            const moneyVal   = Number.isFinite(preview.money)
                ? `R$ ${preview.money.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                : "—";
            const dateSaved  = data.savedAt ? _formatDate(data.savedAt) : "—";

            // Bloco: Dia + Cliente
            this.add.text(infoX, cy + 52, "DIA  /  CLIENTE ATUAL", {
                fontFamily: FONT, fontSize: "9px", color: C.dim,
            });
            this.add.text(infoX, cy + 68, `${preview.day ?? "?"}  —  ${clientName}`, {
                fontFamily: FONT, fontSize: "15px", color: C.white,
                wordWrap: { width: infoMaxW },
            });

            // Bloco: Saldo
            this.add.text(infoX, cy + 102, "SALDO EM CONTA", {
                fontFamily: FONT, fontSize: "9px", color: C.dim,
            });
            this.add.text(infoX, cy + 118, moneyVal, {
                fontFamily: FONT, fontSize: "17px", color: C.gold,
            });

            // Separador + data (bem acima dos botões)
            const sep2Gfx = this.add.graphics();
            sep2Gfx.lineStyle(1, C.cardBorder, 0.5);
            sep2Gfx.beginPath();
            sep2Gfx.moveTo(infoX, cy + 152);
            sep2Gfx.lineTo(cx + W - 14, cy + 152);
            sep2Gfx.strokePath();

            this.add.text(infoX, cy + 164, dateSaved, {
                fontFamily: FONT, fontSize: "12px", color: C.silver,
            });
        }

        // ── Hover (borda dourada ao passar o mouse) ───────────────────────────
        const hoverRect = this.add.rectangle(cx + W / 2, cy + H / 2, W, H, 0x000000, 0)
            .setStrokeStyle(0, C.cardHover, 0)
            .setDepth(12);

        const hitArea = this.add.rectangle(cx + W / 2, cy + H / 2, W, H, 0x000000, 0.001)
            .setDepth(12)
            .setInteractive({ useHandCursor: !disabled });

        if (!disabled) {
            hitArea.on("pointerover", () => hoverRect.setStrokeStyle(2, C.cardHover, 1));
            hitArea.on("pointerout",  () => hoverRect.setStrokeStyle(0, C.cardHover, 0));
        }

        // ── Botões de ação ────────────────────────────────────────────────────
        // Posicionados na parte inferior do card, sempre abaixo do conteúdo.
        // Altura dos botões: 42px. Linha base em cy + H - 30.
        const btnY    = cy + H - 30;
        const btnH    = 42;
        const btnFs   = { color: "#ffffff", fontSize: "13px", fontStyle: "bold", fontFamily: FONT };
        const primX   = cx + W - 99;   // centro do botão primário (170px wide → 85px half)
        const delX    = primX - 85 - 14 - 55;  // centro do botão apagar (110px → 55px half)

        const _deleteSlot = () => {
            if (id === SaveManager.AUTOSAVE_ID) {
                SaveManager.clearAutosave();
            } else {
                SaveManager.deleteSlot(id);
            }
            this.scene.restart({
                mode:           this._mode,
                originSceneKey: this._originSceneKey,
                closeMode:      this._closeMode,
                resumeSceneKey: this._resumeSceneKey,
                _isRestart:     true,
            });
        };

        if (this._mode === "save" && !isAuto) {
            // Modo salvar: botão em todos os slots manuais
            const saveBtnLabel = isEmpty ? "Salvar aqui" : "Salvar";
            const btn = new Button(this, {
                x: primX, y: btnY,
                width: 170, height: btnH, radius: 8,
                text: saveBtnLabel,
                backgroundColor: disabled ? C.btnDisabled : C.btnPrimary,
                textStyle: btnFs,
                onClick: () => {
                    if (disabled) return;
                    isEmpty ? this._handlePrimaryAction(id, false) : this._openOverwriteConfirm(id);
                },
            });
            btn.setEnabled(!disabled);

        } else if (this._mode === "load") {
            if (!isEmpty && !isInvalid) {
                // Slot com save: Carregar + Apagar
                new Button(this, {
                    x: primX, y: btnY,
                    width: 170, height: btnH, radius: 8,
                    text: "Carregar",
                    backgroundColor: C.btnPrimary,
                    textStyle: btnFs,
                    onClick: () => this._handlePrimaryAction(id, true),
                });
                new Button(this, {
                    x: delX, y: btnY,
                    width: 110, height: btnH, radius: 8,
                    text: "Apagar",
                    backgroundColor: C.btnDelete,
                    textStyle: { ...btnFs, color: "#a0b8c0", fontSize: "12px" },
                    onClick: _deleteSlot,
                });
            } else if (isInvalid) {
                // Slot inválido: só Apagar
                new Button(this, {
                    x: primX, y: btnY,
                    width: 170, height: btnH, radius: 8,
                    text: "Apagar slot",
                    backgroundColor: C.btnDelete,
                    textStyle: { ...btnFs, color: "#a0b8c0" },
                    onClick: _deleteSlot,
                });
            }
            // Slot vazio em modo load: nenhum botão
        }

        // Overlay escuro em cards desabilitados
        if (disabled) {
            this.add.rectangle(cx + W / 2, cy + H / 2, W - 4, H - 4, 0x000000, 0.42).setDepth(11);
        }
    }

    // ── Footer ────────────────────────────────────────────────────────────────

    _buildFooter() {
        new Button(this, {
            x: PANEL_X + PANEL_W / 2,
            y: PANEL_Y + PANEL_H - FOOTER_H / 2 + 4,
            width: 200, height: 40, radius: 8,
            text: "Voltar",
            backgroundColor: 0x3c2010,
            textStyle: { color: C.gold, fontSize: "15px", fontStyle: "bold", fontFamily: FONT },
            onClick: () => this._closeScene(),
        });
    }

    // ── Confirm overlay ───────────────────────────────────────────────────────

    _openOverwriteConfirm(slotId) {
        if (this._confirmOverlay) { return; }

        const cx = SCREEN_WIDTH / 2, cy = SCREEN_HEIGHT / 2;
        const pw = 660, ph = 248;

        const scrim = this.add.rectangle(cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000, 0.65)
            .setDepth(12000).setInteractive();

        const pGfx = this.add.graphics().setDepth(12001);
        pGfx.fillStyle(C.panelBorder);
        pGfx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
        pGfx.fillStyle(0x120808);
        pGfx.fillRect(cx - pw / 2 + 3, cy - ph / 2 + 3, pw - 6, ph - 6);

        const title = this.add.text(cx, cy - 66, "SOBRESCREVER SLOT?", {
            fontFamily: FONT, fontSize: "18px", color: C.gold,
        }).setOrigin(0.5).setDepth(12002);

        const body = this.add.text(cx, cy - 16, "Esse slot já possui um save.\nDeseja substituir pelo progresso atual?", {
            fontFamily: FONT, fontSize: "11px", color: C.silver,
            align: "center", lineSpacing: 12,
        }).setOrigin(0.5).setDepth(12002);

        const confirmBtn = new Button(this, {
            x: cx - 110, y: cy + 74,
            width: 170, height: 42, radius: 8,
            text: "Confirmar",
            backgroundColor: C.btnPrimary,
            textStyle: { color: "#ffffff", fontSize: "12px", fontStyle: "bold", fontFamily: FONT },
            onClick: () => { this._closeConfirmOverlay(); this._handlePrimaryAction(slotId, true); },
        });
        confirmBtn.container.setDepth(12002);

        const cancelBtn = new Button(this, {
            x: cx + 110, y: cy + 74,
            width: 170, height: 42, radius: 8,
            text: "Cancelar",
            backgroundColor: 0x3c2010,
            textStyle: { color: C.gold, fontSize: "12px", fontStyle: "bold", fontFamily: FONT },
            onClick: () => this._closeConfirmOverlay(),
        });
        cancelBtn.container.setDepth(12002);

        scrim.on("pointerdown", () => this._closeConfirmOverlay());
        this._confirmOverlay = { scrim, pGfx, title, body, confirmBtn, cancelBtn };
    }

    _closeConfirmOverlay() {
        if (!this._confirmOverlay) { return; }
        const o = this._confirmOverlay;
        o.scrim.destroy(); o.pGfx.destroy();
        o.title.destroy(); o.body.destroy();
        o.confirmBtn.destroy(); o.cancelBtn.destroy();
        this._confirmOverlay = null;
    }

    // ── Ações ─────────────────────────────────────────────────────────────────

    _handlePrimaryAction(slotId, isUsed) {
        if (this._mode === "save") {
            SaveManager.saveToSlot(slotId);
            this._showSavedToast(slotId);
            this._closeScene();
            return;
        }

        if (!isUsed) { return; }

        if (this._originSceneKey !== SCENES.MENU) {
            const originScene = this.scene.get(this._originSceneKey);
            originScene?._stopBackgroundMusic?.();
            if (originScene) {
                originScene.setPauseMenuOpen?.(false);
                this.scene.stop(this._originSceneKey);
            }
            this.scene.stop(SCENES.PAUSE_OVERLAY);
        }

        this.scene.stop();
        this.scene.start(SCENES.GAME, {
            loadAutosave: slotId === SaveManager.AUTOSAVE_ID,
            loadSlotId:   slotId === SaveManager.AUTOSAVE_ID ? null : slotId,
        });
    }

    _showSavedToast(slotId) {
        const targetScene = this.scene.get(this._originSceneKey);
        if (!targetScene) { return; }

        const label = slotId === SaveManager.AUTOSAVE_ID
            ? "Autosave"
            : slotId.replace("slot_", "Slot ");

        const panel = targetScene.add.rectangle(SCREEN_WIDTH / 2, 110, 760, 76, 0x111111, 0.92)
            .setStrokeStyle(4, C.goldN).setDepth(12000).setAlpha(0);

        const text = targetScene.add.text(SCREEN_WIDTH / 2, 110, `Jogo salvo em ${label}.`, {
            fontFamily: FONT, fontSize: "16px", color: "#ffffff", align: "center",
        }).setOrigin(0.5).setDepth(12001).setAlpha(0);

        targetScene.tweens.add({ targets: [panel, text], alpha: 1, duration: 180, ease: "Sine.Out" });
        targetScene.time.delayedCall(1500, () => {
            targetScene.tweens.add({
                targets: [panel, text], alpha: 0, duration: 220, ease: "Sine.In",
                onComplete: () => { panel.destroy(); text.destroy(); },
            });
        });
    }

    _closeScene() {
        this._closeConfirmOverlay();
        if (this._resumeSceneKey) {
            this.scene.get(this._resumeSceneKey)?.scene.resume();
        }
        this.scene.stop();
    }
}

// ── Helpers de desenho ────────────────────────────────────────────────────────

/**
 * Desenha a faixa de preview do card (lado esquerdo).
 * Usa três bandas horizontais para simular profundidade + glow central.
 */
function _drawPreview(gfx, x, y, w, h, day, isAuto, isEmpty) {
    const pal = isEmpty
        ? EMPTY_PAL
        : (isAuto ? AUTO_PAL : (DAY_PAL[day] ?? DAY_PAL[1]));

    const band = Math.floor(h / 3);

    // Três faixas de cor (topo, meio, topo) para dar sensação de gradiente
    gfx.fillStyle(pal.top);
    gfx.fillRect(x, y, w, band);
    gfx.fillStyle(pal.mid);
    gfx.fillRect(x, y + band, w, band);
    gfx.fillStyle(pal.top);
    gfx.fillRect(x, y + band * 2, w, h - band * 2);

    // Glow central (elipse aproximada)
    gfx.fillStyle(pal.glow, 0.3);
    const ew = Math.floor(w * 0.72);
    const eh = Math.floor(h * 0.52);
    gfx.fillRect(x + (w - ew) / 2, y + (h - eh) / 2, ew, eh);

    // Hachura diagonal para slots vazios
    if (isEmpty) {
        gfx.lineStyle(1, 0x1e1e1e, 0.8);
        for (let i = -h; i < w + h; i += 16) {
            gfx.beginPath();
            gfx.moveTo(x + i, y);
            gfx.lineTo(x + i + h, y + h);
            gfx.strokePath();
        }
    }

    // Vinheta inferior (escurece o fundo do preview)
    gfx.fillStyle(0x000000, 0.5);
    gfx.fillRect(x, y + h - 28, w, 28);
}

// ── Helpers de dados ──────────────────────────────────────────────────────────

function _buildAutosaveMeta() {
    const data = SaveManager.getAutosaveMetadata();
    return { id: SaveManager.AUTOSAVE_ID, status: data ? "valid" : "empty", data };
}

function _formatDate(value) {
    try {
        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short",
        }).format(new Date(value));
    } catch (_) {
        return value;
    }
}
