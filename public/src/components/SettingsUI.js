import SettingsManager from "./managers/SettingsManager.js";
import DialogueManager from "./managers/DialogueManager.js";
import AccessibilityFilterManager from "./managers/AccessibilityFilterManager.js";
import { SCENES } from "../constants.js";

// ── Paleta ────────────────────────────────────────────────────────────────────
const FONT     = "PressStart2P";
const FONT_TAB = "Tiny5";
const GOLD_N   = 0xf9c22b;
const GOLD     = "#f9c22b";
const WHITE    = "#ffffff";
const MUTED    = "#4a3828";
const DIM      = "#6a4f38";
const BG_N     = 0x08060a;
const ACCENT_N = 0xf9c22b;

// ── Dimensões ─────────────────────────────────────────────────────────────────
const W         = 1144;   // 880 × 1.3
const H         = 689;    // 530 × 1.3
const SIDEBAR_W = 333;    // 256 × 1.3
const ROW_H     = 86;     // 66 × 1.3
const BAR_W     = 286;    // 220 × 1.3
const BAR_H     = 13;     // 10 × 1.3
const HANDLE_R  = 12;     // 9 × 1.3

// Área de conteúdo
const CX_LEFT  = -W / 2 + SIDEBAR_W + 31;   // 24 × 1.3
const CX_RIGHT = W / 2 - 42;                // 32 × 1.3

const TABS = [
    { key: "audio",    label: "ÁUDIO",          sym: "♪" },
    { key: "video",    label: "VÍDEO",           sym: "◉" },
    { key: "gameplay", label: "GAMEPLAY",        sym: "⚙" },
    { key: "acesso",   label: "ACESSIBILIDADE",  sym: "✦" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default class SettingsUI {

    constructor(scene, cx, cy,
        { onClose, onMenu = null, onSave = null, onLoad = null, showTitle = true } = {}) {

        this._scene  = scene;
        this._cx     = cx;
        this._cy     = cy;
        this._close  = onClose;
        this._menu   = onMenu;
        this._save   = onSave;
        this._load   = onLoad;
        this._active = "audio";

        this._root = scene.add.container(cx, cy);
        this._drawBg();

        // ── Cabeçalho ─────────────────────────────────────────────────────────
        const titleH = showTitle ? 48 : 0;
        if (showTitle) this._buildHeader(titleH);

        // ── Layout ────────────────────────────────────────────────────────────
        const areaTop  = -H / 2 + titleH;
        const areaBot  = H / 2 - 72;
        const areaH    = areaBot - areaTop;

        const SIDE_ACT_H = 52;
        const sideActions = [];
        if (this._save) sideActions.push({ label: "💾  SALVAR",   cb: this._save });
        if (this._load) sideActions.push({ label: "📂  CARREGAR", cb: this._load });
        const sideExtraH = sideActions.length > 0 ? 10 + sideActions.length * SIDE_ACT_H : 0;

        const TAB_BTN_H = Math.floor((areaH - sideExtraH) / TABS.length);
        this._areaTop    = areaTop;
        this._TAB_BTN_H  = TAB_BTN_H;
        this._sideActions = sideActions;
        this._SIDE_ACT_H  = SIDE_ACT_H;
        this._sideExtraH  = sideExtraH;
        this._tabsEndY    = areaTop + TABS.length * TAB_BTN_H;

        // ── Sidebar ───────────────────────────────────────────────────────────
        this._tabGfx = scene.add.graphics();
        this._root.add(this._tabGfx);

        const sideCX = -W / 2 + SIDEBAR_W / 2;
        this._tabObjs = {};
        TABS.forEach((tab, i) => {
            const btnCY = areaTop + i * TAB_BTN_H + TAB_BTN_H / 2;

            const sym = scene.add.text(sideCX - SIDEBAR_W / 2 + 18, btnCY, tab.sym, {
                fontFamily: FONT_TAB, fontSize: "36px", color: MUTED,
            }).setOrigin(0, 0.5);

            const lbl = scene.add.text(sideCX - SIDEBAR_W / 2 + 68, btnCY, tab.label, {
                fontFamily: FONT_TAB, fontSize: "29px",
                color: MUTED, wordWrap: { width: SIDEBAR_W - 84 },
            }).setOrigin(0, 0.5);

            this._tabObjs[tab.key] = { lbl, sym };
            this._root.add([sym, lbl]);

            const zone = scene.add.zone(sideCX, btnCY, SIDEBAR_W, TAB_BTN_H)
                .setInteractive({ useHandCursor: true });
            zone.on("pointerdown", () => this._switchTab(tab.key));
            zone.on("pointerover", () => {
                if (this._active !== tab.key) { lbl.setColor(WHITE); sym.setColor(WHITE); }
            });
            zone.on("pointerout", () => {
                if (this._active !== tab.key) { lbl.setColor(MUTED); sym.setColor(MUTED); }
            });
            this._root.add(zone);
        });

        // ── Ações na sidebar (SALVAR / CARREGAR) ──────────────────────────────
        sideActions.forEach((act, i) => {
            const actCY = this._tabsEndY + 10 + i * SIDE_ACT_H + SIDE_ACT_H / 2;
            const g = scene.add.graphics();
            const drawBtn = (hot) => {
                g.clear();
                g.fillStyle(hot ? 0x1a1016 : 0x100c12, 1);
                g.fillRoundedRect(-W / 2 + 10, actCY - SIDE_ACT_H / 2 + 4,
                    SIDEBAR_W - 20, SIDE_ACT_H - 8, 6);
                g.lineStyle(1, hot ? GOLD_N : 0x3a2a48, 1);
                g.strokeRoundedRect(-W / 2 + 10, actCY - SIDE_ACT_H / 2 + 4,
                    SIDEBAR_W - 20, SIDE_ACT_H - 8, 6);
            };
            drawBtn(false);

            const lbl = scene.add.text(sideCX, actCY, act.label, {
                fontFamily: FONT_TAB, fontSize: "29px", color: DIM, align: "center",
            }).setOrigin(0.5);

            const zone = scene.add.zone(sideCX, actCY, SIDEBAR_W, SIDE_ACT_H)
                .setInteractive({ useHandCursor: true });
            zone.on("pointerdown", () => act.cb?.());
            zone.on("pointerover", () => { drawBtn(true);  lbl.setColor(GOLD); });
            zone.on("pointerout",  () => { drawBtn(false); lbl.setColor(DIM); });

            this._root.add([g, lbl, zone]);
        });

        // ── Containers de conteúdo ────────────────────────────────────────────
        this._tabConts = {};
        TABS.forEach(tab => {
            const c = scene.add.container(0, 0);
            this._tabConts[tab.key] = c;
            this._root.add(c);
        });

        const contentY = areaTop + 8;
        this._buildAudioTab(contentY);
        this._buildVideoTab(contentY);
        this._buildGameplayTab(contentY);
        this._buildAccessTab(contentY);

        // ── Rodapé ────────────────────────────────────────────────────────────
        this._buildFooter(H / 2 - 36);

        // ── Decoração final ───────────────────────────────────────────────────
        this._drawDecor(areaTop);

        // ── Estado inicial ────────────────────────────────────────────────────
        this._drawSidebar();
        this._updateVisibility();

        this._esc = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this._esc?.on("down", () => this._close?.());
    }

    destroy() { this._root.destroy(true); this._esc?.destroy(); }
    setDepth(d) { this._root.setDepth(d); return this; }

    // ── Fundo e decoração ─────────────────────────────────────────────────────

    _drawBg() {
        const g = this._scene.add.graphics();
        // Sombra
        g.fillStyle(0x000000, 0.7);
        g.fillRect(-W / 2 + 12, -H / 2 + 12, W, H);
        // Corpo
        g.fillStyle(BG_N, 1);
        g.fillRect(-W / 2, -H / 2, W, H);
        // Faixa lateral escura da sidebar
        g.fillStyle(0x000000, 0.35);
        g.fillRect(-W / 2, -H / 2, SIDEBAR_W, H);
        this._root.add(g);
    }

    _drawDecor(areaTop) {
        const g = this._scene.add.graphics();

        // Borda exterior ouro fino
        g.lineStyle(1, ACCENT_N, 0.9);
        g.strokeRect(-W / 2, -H / 2, W, H);

        // Chanfros nos 4 cantos
        const ch = 16;
        g.lineStyle(2, ACCENT_N, 1);
        [
            [-W/2, -H/2,  1,  1],
            [ W/2, -H/2, -1,  1],
            [-W/2,  H/2,  1, -1],
            [ W/2,  H/2, -1, -1],
        ].forEach(([x, y, dx, dy]) => {
            g.beginPath(); g.moveTo(x, y + dy * ch); g.lineTo(x, y); g.lineTo(x + dx * ch, y); g.strokePath();
        });

        // Linha divisória topo da área de conteúdo (abaixo do header)
        g.lineStyle(1, 0x3a2a48, 1);
        g.lineBetween(-W / 2, areaTop, W / 2, areaTop);

        // Linha divisória rodapé
        const footY = H / 2 - 72;
        g.lineStyle(1, 0x3a2a48, 1);
        g.lineBetween(-W / 2 + SIDEBAR_W, footY, W / 2, footY);

        this._root.add(g);
    }

    _buildHeader(titleH) {
        const hy = -H / 2 + titleH / 2;

        // Fundo do header levemente diferente
        const g = this._scene.add.graphics();
        g.fillStyle(0x000000, 0.4);
        g.fillRect(-W / 2, -H / 2, W, titleH);
        g.lineStyle(1, 0xf9c22b, 0.3);
        g.lineBetween(-W / 2, -H / 2 + titleH, W / 2, -H / 2 + titleH);
        this._root.add(g);

        // Acento dourado à esquerda
        const ag = this._scene.add.graphics();
        ag.fillStyle(ACCENT_N, 1);
        ag.fillRect(-W / 2 + 16, hy - 14, 5, 28);
        this._root.add(ag);

        this._root.add(this._scene.add.text(-W / 2 + 28, hy, "OPÇÕES", {
            fontFamily: FONT, fontSize: "23px",
            color: GOLD, stroke: "#000", strokeThickness: 2,
        }).setOrigin(0, 0.5));
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────

    _switchTab(key) {
        this._active = key;
        this._drawSidebar();
        this._updateVisibility();
    }

    _updateVisibility() {
        TABS.forEach(t => this._tabConts[t.key].setVisible(t.key === this._active));
    }

    _drawSidebar() {
        const g   = this._tabGfx;
        const ai  = TABS.findIndex(t => t.key === this._active);
        const sx  = -W / 2;
        const H2  = this._TAB_BTN_H;
        const top = this._areaTop;

        g.clear();

        TABS.forEach((_tab, i) => {
            const ty       = top + i * H2;
            const isActive = i === ai;

            if (isActive) {
                // Fundo da tab ativa: mais claro
                g.fillStyle(0x18101e, 1);
                g.fillRect(sx, ty, SIDEBAR_W, H2);
                // Barra de acento vertical à esquerda (4px)
                g.fillStyle(ACCENT_N, 1);
                g.fillRect(sx, ty, 4, H2);
                // Linha inferior + superior finas
                g.lineStyle(1, 0x5a4060, 0.6);
                g.beginPath(); g.moveTo(sx + 4, ty);      g.lineTo(sx + SIDEBAR_W, ty);      g.strokePath();
                g.beginPath(); g.moveTo(sx + 4, ty + H2); g.lineTo(sx + SIDEBAR_W, ty + H2); g.strokePath();
            } else {
                // Linha separadora sutil
                g.lineStyle(1, 0x1e1626, 1);
                g.beginPath(); g.moveTo(sx + 14, ty + H2); g.lineTo(sx + SIDEBAR_W - 8, ty + H2); g.strokePath();
            }
        });

        // Linha vertical divisória sidebar | conteúdo
        const divX  = sx + SIDEBAR_W;
        const aTop  = top + ai * H2;
        const aBot  = aTop + H2;
        const tEnd  = this._tabsEndY;
        const sEnd  = tEnd + this._sideExtraH;

        g.lineStyle(1, 0x3a2a48, 1);
        if (aTop > top)  { g.beginPath(); g.moveTo(divX, top);  g.lineTo(divX, aTop); g.strokePath(); }
        if (aBot < sEnd) { g.beginPath(); g.moveTo(divX, aBot); g.lineTo(divX, sEnd); g.strokePath(); }

        // Separador antes das ações
        if (this._sideExtraH > 0) {
            g.lineStyle(1, 0x2a1e34, 1);
            g.beginPath(); g.moveTo(sx + 14, tEnd + 5); g.lineTo(sx + SIDEBAR_W - 8, tEnd + 5); g.strokePath();
        }

        // Cores dos textos
        TABS.forEach((tab, i) => {
            const { lbl, sym } = this._tabObjs[tab.key];
            const active = i === ai;
            lbl?.setColor(active ? WHITE : MUTED);
            sym?.setColor(active ? GOLD  : MUTED);
        });
    }

    // ── Construtores de conteúdo ──────────────────────────────────────────────

    _sectionLabel(cont, y, tab) {
        const lbl = this._scene.add.text(CX_LEFT, y + 18, tab.sym + "  " + tab.label, {
            fontFamily: FONT_TAB, fontSize: "26px", color: GOLD,
            stroke: "#000", strokeThickness: 1,
        }).setOrigin(0, 0.5);
        const line = this._scene.add.graphics();
        line.lineStyle(1, 0x3a2a48, 1);
        line.lineBetween(CX_LEFT, y + 32, CX_RIGHT, y + 32);
        cont.add([lbl, line]);
        return y + 38;
    }

    _buildAudioTab(y) {
        const c = this._tabConts["audio"];
        y = this._sectionLabel(c, y, TABS[0]);
        y = this._slider(c, y, "Volume da Música", 0, 1,
            SettingsManager.volume,
            v => { SettingsManager.setVolume(v); this._vol(v); });
        y = this._slider(c, y, "Efeitos Sonoros", 0, 1,
            SettingsManager.sfxVolume ?? 1,
            v => SettingsManager.setSfxVolume(v));
        this._toggle(c, y, "Mudo",
            (SettingsManager.muted ?? false),
            v => { SettingsManager.setMuted(v); this._vol(v ? 0 : SettingsManager.volume); });
    }

    _buildVideoTab(y) {
        const c = this._tabConts["video"];
        y = this._sectionLabel(c, y, TABS[1]);
        y = this._slider(c, y, "Brilho", 0.1, 1,
            SettingsManager.brightness,
            v => { SettingsManager.setBrightness(v); this._bright(v); },
            v => `${Math.round(v * 100)}%`);
        y = this._pick(c, y, "Resolução", ["1280x720", "1600x900", "1920x1080"],
            SettingsManager.resolution ?? "1920x1080",
            v => SettingsManager.setResolution(v));
        this._toggle(c, y, "Tela cheia",
            (SettingsManager.fullscreen ?? false),
            v => {
                SettingsManager.setFullscreen(v);
                v ? this._scene.scale.startFullscreen() : this._scene.scale.stopFullscreen();
            });
    }

    _buildGameplayTab(y) {
        const c = this._tabConts["gameplay"];
        y = this._sectionLabel(c, y, TABS[2]);
        this._slider(c, y, "Velocidade do Texto", 0.5, 2,
            SettingsManager.textSpeed ?? 1,
            v => {
                SettingsManager.setTextSpeed(v);
                this._applyLiveSettings();
            },
            v => `${v.toFixed(1)}×`);
    }

    _buildAccessTab(y) {
        const c = this._tabConts["acesso"];
        y = this._sectionLabel(c, y, TABS[3]);
        y = this._pick(c, y, "Tamanho da fonte", ["Pequeno", "Normal", "Grande"],
            SettingsManager.fontSize ?? "Normal",
            v => {
                SettingsManager.setFontSize(v);
                this._applyLiveSettings();
            });
        y = this._toggle(c, y, "Alto contraste",
            (SettingsManager.highContrast ?? false),
            v => {
                SettingsManager.setHighContrast(v);
                this._applyLiveSettings();
            });
        this._pick(c, y, "Filtro de cor",
            ["Nenhum", "Protanopia", "Deuteranopia", "Tritanopia"],
            SettingsManager.colorFilter ?? "Nenhum",
            v => {
                SettingsManager.setColorFilter(v);
                this._applyLiveSettings();
            });
    }

    // ── Linha base ────────────────────────────────────────────────────────────

    _row(cont, y, label) {
        const cy = y + ROW_H / 2;
        const lbl = this._scene.add.text(CX_LEFT, cy, label, {
            fontFamily: FONT, fontSize: "17px",
            color: WHITE, stroke: "#000", strokeThickness: 1,
        }).setOrigin(0, 0.5);
        cont.add(lbl);

        // Linha separadora inferior muito sutil
        const sep = this._scene.add.graphics();
        sep.lineStyle(1, 0x1e1626, 1);
        sep.lineBetween(CX_LEFT, y + ROW_H, CX_RIGHT, y + ROW_H);
        cont.add(sep);

        const zone = this._scene.add.zone(
            CX_LEFT + (CX_RIGHT - CX_LEFT) / 2, cy,
            CX_RIGHT - CX_LEFT, ROW_H
        ).setInteractive({ useHandCursor: true });
        zone.on("pointerover", () => lbl.setColor(GOLD));
        zone.on("pointerout",  () => lbl.setColor(WHITE));
        cont.add(zone);

        return cy;
    }

    // ── Slider ────────────────────────────────────────────────────────────────

    _slider(cont, y, label, min, max, val, onChange, fmt) {
        const cy    = this._row(cont, y, label);
        const fmtFn = fmt ?? (v => `${Math.round(((v - min) / (max - min)) * 100)}%`);
        const pct0  = Phaser.Math.Clamp((val - min) / (max - min), 0, 1);
        const bx    = CX_RIGHT - BAR_W;
        const by    = cy - BAR_H / 2;

        const vt = this._scene.add.text(bx - 14, cy, fmtFn(val), {
            fontFamily: FONT, fontSize: "16px", color: GOLD,
        }).setOrigin(1, 0.5);

        const tr = this._scene.add.graphics();
        const drawTr = (pct) => {
            tr.clear();
            // Trilha vazia
            tr.fillStyle(0x2a1e34, 1);
            tr.fillRoundedRect(bx, by, BAR_W, BAR_H, BAR_H / 2);
            // Preenchimento ouro
            const fw = Math.max(BAR_H, BAR_W * pct);
            tr.fillStyle(GOLD_N, 1);
            tr.fillRoundedRect(bx, by, fw, BAR_H, BAR_H / 2);
            // Reflexo sutil
            tr.fillStyle(0xffffff, 0.15);
            tr.fillRoundedRect(bx, by, fw, BAR_H / 2, BAR_H / 2);
        };
        drawTr(pct0);

        const hg = this._scene.add.graphics();
        const drawH = (hx, hot) => {
            hg.clear();
            hg.fillStyle(0x000000, 0.5);
            hg.fillCircle(hx + 1, cy + 1, HANDLE_R);
            hg.fillStyle(hot ? GOLD_N : 0xffffff, 1);
            hg.fillCircle(hx, cy, HANDLE_R);
            hg.fillStyle(0x000000, 0.3);
            hg.fillCircle(hx, cy, HANDLE_R / 2);
        };
        let hx = bx + BAR_W * pct0;
        drawH(hx, false);

        const hz = this._scene.add.zone(hx, cy, HANDLE_R * 2 + 4, HANDLE_R * 2 + 4)
            .setInteractive({ useHandCursor: true });
        this._scene.input.setDraggable(hz);

        hz.on("drag", ptr => {
            const lx = Phaser.Math.Clamp(ptr.x - this._cx, bx, bx + BAR_W);
            hx = lx; hz.x = lx;
            const t = (lx - bx) / BAR_W;
            drawTr(t); drawH(lx, true);
            vt.setText(fmtFn(min + t * (max - min)));
            onChange(min + t * (max - min));
        });
        hz.on("pointerover", () => drawH(hx, true));
        hz.on("pointerout",  () => drawH(hx, false));

        cont.add([vt, tr, hg, hz]);
        return y + ROW_H;
    }

    // ── Toggle (ON/OFF pill) ──────────────────────────────────────────────────

    _toggle(cont, y, label, initVal, onChange) {
        this._row(cont, y, label);
        let on = initVal;

        // Pill: bolinha num extremo, texto no outro
        const px    = CX_RIGHT - 6;
        const ph    = 36;
        const pr    = 18;            // raio = ph/2
        const pw    = 100;           // largura fixa: bolinha (36) + gap (8) + texto (~56)
        const pby   = y + ROW_H / 2 - ph / 2;
        const pbx   = px - pw;
        const ballR = pr - 5;

        const g = this._scene.add.graphics();
        const draw = () => {
            g.clear();
            // Fundo do pill
            g.fillStyle(on ? GOLD_N : 0x2a1e34, 1);
            g.fillRoundedRect(pbx, pby, pw, ph, pr);
            // Borda sutil
            g.lineStyle(1, on ? 0xc8960a : 0x4a3a5a, 1);
            g.strokeRoundedRect(pbx, pby, pw, ph, pr);
            // Bolinha — sempre no lado oposto ao texto
            g.fillStyle(0xffffff, 1);
            const bx = on ? pbx + pw - pr : pbx + pr;
            g.fillCircle(bx, pby + ph / 2, ballR);
        };
        draw();

        // Texto centrado na metade livre do pill (lado oposto à bolinha)
        // Bolinha ocupa ~pr*2 de espaço num extremo; texto fica no restante
        const textX = () => on
            ? pbx + (pw - pr * 2) / 2           // ON: bolinha à direita → centro da área esquerda
            : pbx + pr * 2 + (pw - pr * 2) / 2; // OFF: bolinha à esquerda → centro da área direita

        const vt = this._scene.add.text(textX(), y + ROW_H / 2, on ? "ON" : "OFF", {
            fontFamily: FONT, fontSize: "13px",
            color: on ? "#1a0e00" : GOLD,
        }).setOrigin(0.5);

        const zone = this._scene.add.zone(pbx + pw / 2, y + ROW_H / 2, pw + 12, ROW_H)
            .setInteractive({ useHandCursor: true });
        zone.on("pointerdown", () => {
            on = !on;
            draw();
            vt.setText(on ? "ON" : "OFF");
            vt.setColor(on ? "#1a0e00" : GOLD);
            vt.setX(textX());
            onChange(on);
        });

        cont.add([g, vt, zone]);
        return y + ROW_H;
    }

    // ── Pick ──────────────────────────────────────────────────────────────────

    _pick(cont, y, label, opts, val, onChange) {
        const cy  = this._row(cont, y, label);
        const GAP = 10;
        let idx   = Math.max(0, opts.indexOf(val));

        const vt = this._scene.add.text(0, cy, opts[idx], {
            fontFamily: FONT, fontSize: "16px", color: GOLD,
        }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

        const al = this._scene.add.text(0, cy, "‹", {
            fontFamily: FONT_TAB, fontSize: "39px", color: DIM,
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

        const ar = this._scene.add.text(CX_RIGHT - 4, cy, "›", {
            fontFamily: FONT_TAB, fontSize: "39px", color: DIM,
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

        const reflow = () => {
            vt.setText(opts[idx]);
            vt.setX(ar.x - ar.width - GAP - vt.width / 2);
            al.setX(vt.x - vt.width / 2 - GAP);
        };
        this._scene.time.delayedCall(0, reflow);

        const advance = () => { idx = (idx + 1) % opts.length; reflow(); onChange(opts[idx]); };
        const retreat = () => { idx = (idx - 1 + opts.length) % opts.length; reflow(); onChange(opts[idx]); };
        al.on("pointerdown", retreat);
        ar.on("pointerdown", advance);
        vt.on("pointerdown", advance);
        vt.on("pointerover", () => vt.setColor(WHITE));
        vt.on("pointerout",  () => vt.setColor(GOLD));
        al.on("pointerover", () => al.setColor(GOLD));
        al.on("pointerout",  () => al.setColor(DIM));
        ar.on("pointerover", () => ar.setColor(GOLD));
        ar.on("pointerout",  () => ar.setColor(DIM));

        cont.add([vt, al, ar]);
        return y + ROW_H;
    }

    // ── Rodapé ────────────────────────────────────────────────────────────────

    _buildFooter(cy) {
        const BW = 260, BH = 57;

        // VOLTAR — ghost com seta desenhada
        this._footBtn(-W / 2 + BW / 2 + 20, cy, BW, BH, "VOLTAR", "left", false, this._close);

        // MENU — filled vermelho
        if (this._menu) {
            this._footBtn(W / 2 - BW / 2 - 20, cy, BW, BH, "MENU", "right", true, this._menu);
        }
    }

    // Seta desenhada com Graphics (triângulo simples, sem glyph de fonte)
    _drawArrow(g, cx, cy, dir, color, size = 8) {
        g.fillStyle(color, 1);
        if (dir === "left") {
            g.fillTriangle(cx - size, cy, cx + size / 2, cy - size, cx + size / 2, cy + size);
        } else {
            g.fillTriangle(cx + size, cy, cx - size / 2, cy - size, cx - size / 2, cy + size);
        }
    }

    _footBtn(cx, cy, w, h, label, arrowDir, filled, onClick) {
        const bx = cx - w / 2, by = cy - h / 2;
        const g  = this._scene.add.graphics();
        const ag = this._scene.add.graphics();   // gfx separado para a seta (redraw no hover)

        const arrowX = arrowDir === "left" ? bx + 22 : bx + w - 22;
        const textX  = arrowDir === "left" ? cx + 8  : cx - 8;

        const draw = (hot) => {
            g.clear();
            if (filled) {
                g.fillStyle(hot ? 0xb71c1c : 0x7f0000, 1);
                g.fillRoundedRect(bx, by, w, h, 6);
                g.fillStyle(0xffffff, hot ? 0.12 : 0.06);
                g.fillRoundedRect(bx + 1, by + 1, w - 2, h * 0.4, { tl: 5, tr: 5, bl: 0, br: 0 });
                g.lineStyle(1, hot ? 0xff5555 : 0xc62828, 1);
            } else {
                if (hot) { g.fillStyle(0x1a1020, 1); g.fillRoundedRect(bx, by, w, h, 6); }
                g.lineStyle(1, hot ? GOLD_N : 0x4a3a5a, 1);
            }
            g.strokeRoundedRect(bx, by, w, h, 6);

            const arrowColor = hot ? GOLD_N : (filled ? 0xffffff : 0x6a4f38);
            this._drawArrow(ag, arrowX, cy, arrowDir, arrowColor);
        };
        draw(false);

        const lbl = this._scene.add.text(textX, cy, label, {
            fontFamily: FONT, fontSize: "17px",
            color: filled ? WHITE : DIM,
            stroke: "#000", strokeThickness: 1,
        }).setOrigin(0.5);

        const zone = this._scene.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
        zone.on("pointerover",  () => { draw(true);  lbl.setColor(filled ? WHITE : GOLD); });
        zone.on("pointerout",   () => { draw(false); lbl.setColor(filled ? WHITE : DIM); });
        zone.on("pointerdown",  () => onClick?.());

        this._root.add([g, ag, lbl, zone]);
    }

    // ── Efeitos colaterais ────────────────────────────────────────────────────

    _bright(v) {
        this._scene.scene.manager.scenes.forEach(s => {
            if (s.brightnessOverlay) s.brightnessOverlay.setAlpha(1 - v);
        });
    }

    _vol(v) {
        [SCENES.MENU, SCENES.GAME].forEach(k => {
            const s = this._scene.scene.manager.getScene(k);
            s?.musica?.setVolume(v);
            s?.backgroundMusic?.setVolume(v);
        });
    }

    _applyLiveSettings() {
        try {
            DialogueManager.getInstance().applyTextSettings();
        } catch (_) {
            // Sem DialogueManager ativo nesta cena: nada para atualizar agora.
        }

        const gameScene = this._scene.scene.manager.getScene(SCENES.GAME);
        gameScene?.guide?.guideBox?.applySettings?.();
        AccessibilityFilterManager.applyCurrentSettings();
    }
}
