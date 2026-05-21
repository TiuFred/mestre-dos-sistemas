import { SCENES, SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants.js";
import { Button } from "../components/Button.js";
import AchievementManager from "../components/managers/AchievementManager.js";

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
    BG_DEEP:    0x0d1124,
    BG_MID:     0x1b1f3a,
    PANEL:      0x141828,
    BORDER_LIT: 0xffd700,   // dourado — conquista desbloqueada
    BORDER_DIM: 0x7a8ab0,   // cinza-azul mais brilhante para bloqueada
    TEXT_LIT:   "#ffd700",
    TEXT_DIM:   "#d0d8f0",  // muito mais claro para contraste em bloqueado
    DESC_LIT:   "#e8f0ff",  // era "#c8d8ff" — levemente mais branco
    DESC_DIM:   "#b8c5e0",  // MUITO mais claro — contraste melhorado
    BAR_BG:     0x0d1124,
    BAR_FILL:   0x00e676,
    BAR_BORDER: 0x1a3a2a,
    LOCK_TINT:  0x4a5280,
    STAR_LIT:   0xffd700,
    STAR_DIM:   0x6a7a90,   // mais brilhante também
};

// ─── Dimensões dos cards ─────────────────────────────────────────────────────
const COLS        = 2;
const CARD_W      = 620;
const CARD_H      = 140;
const CARD_GAP_X  = 32;
const CARD_GAP_Y  = 22;
const GRID_TOP    = 210;    // Y onde começa o grid (abaixo do header)
const GRID_PAD_X  = (SCREEN_WIDTH - (COLS * CARD_W + (COLS - 1) * CARD_GAP_X)) / 2;

// Área scrollável (viewport)
const SCROLL_TOP  = GRID_TOP - 10;
const SCROLL_BOT  = SCREEN_HEIGHT - 120;
const SCROLL_H    = SCROLL_BOT - SCROLL_TOP;

export default class AchievementsScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.ACHIEVEMENTS });
    }

    // ── Ciclo de vida ─────────────────────────────────────────────────────────

    create() {
        this._scrollY     = 0;
        this._maxScrollY  = 0;
        this._cardContainers = [];

        this.achievementManager = AchievementManager.getInstance(this);
        this._achievements = AchievementManager.getAllDefinitions();

        this._drawBackground();
        this._drawHeader();
        this._drawProgressBar();
        this._buildGrid();
        this._setupScroll();
        this._createBackButton();
        this._animateEntrance();
    }

    // ── Fundo ─────────────────────────────────────────────────────────────────

    _drawBackground() {
        // Gradiente simulado com dois retângulos
        const bg = this.add.graphics();
        bg.fillStyle(C.BG_DEEP);
        bg.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Grade de pontos pixel-art
        const dots = this.add.graphics();
        dots.fillStyle(0xffffff, 0.025);
        for (let x = 0; x < SCREEN_WIDTH; x += 32) {
            for (let y = 0; y < SCREEN_HEIGHT; y += 32) {
                dots.fillRect(x, y, 2, 2);
            }
        }

        // Vinheta lateral
        const vignette = this.add.graphics();
        const vW = 220;
        for (let i = 0; i < vW; i++) {
            const a = (1 - i / vW) * 0.35;
            vignette.fillStyle(0x000000, a);
            vignette.fillRect(i, 0, 1, SCREEN_HEIGHT);
            vignette.fillRect(SCREEN_WIDTH - 1 - i, 0, 1, SCREEN_HEIGHT);
        }
    }

    // ── Header ────────────────────────────────────────────────────────────────

    _drawHeader() {
        // Linha decorativa topo
        const line = this.add.graphics();
        line.fillStyle(C.BORDER_LIT, 1);
        line.fillRect(0, 0, SCREEN_WIDTH, 3);

        // Estrelinhas decorativas (pixel-art)
        this._drawPixelStar(60,  55, 14, C.STAR_LIT);
        this._drawPixelStar(SCREEN_WIDTH - 60, 55, 14, C.STAR_LIT);
        this._drawPixelStar(130, 62, 8,  C.STAR_DIM);
        this._drawPixelStar(SCREEN_WIDTH - 130, 62, 8, C.STAR_DIM);

        // Título
        this.add.text(SCREEN_WIDTH / 2, 58, "CONQUISTAS", {
            fontFamily: "PressStart2P",
            fontSize:   "52px",
            color:      C.TEXT_LIT,
            stroke:     "#000000",
            strokeThickness: 6,
            shadow: { x: 0, y: 4, color: "#000000", blur: 0, fill: true },
        }).setOrigin(0.5);

        // Sublinhado pixel-art
        const ul = this.add.graphics();
        ul.fillStyle(C.BORDER_LIT, 0.5);
        ul.fillRect(SCREEN_WIDTH / 2 - 220, 90, 440, 2);
        ul.fillStyle(C.BORDER_LIT, 0.2);
        ul.fillRect(SCREEN_WIDTH / 2 - 180, 94, 360, 1);
    }

    _drawPixelStar(cx, cy, size, color) {
        const g = this.add.graphics();
        g.fillStyle(color, 1);
        const h = Math.floor(size / 2);
        g.fillRect(cx - 1, cy - h, 2, size);       // vertical
        g.fillRect(cx - h, cy - 1, size, 2);       // horizontal
        g.fillRect(cx - 2, cy - 2, 4, 4);          // centro
    }

    // ── Barra de progresso ────────────────────────────────────────────────────

    _drawProgressBar() {
        const achs      = this._achievements;
        const total     = achs.length;
        const unlocked  = achs.filter(a => this.achievementManager.isUnlocked(a.id)).length;
        const pct       = total > 0 ? unlocked / total : 0;

        const barW  = 700;
        const barH  = 22;
        const barX  = SCREEN_WIDTH / 2 - barW / 2;
        const barY  = 115;

        // Fundo da barra
        const bg = this.add.graphics();
        bg.fillStyle(C.BAR_BG);
        bg.fillRect(barX, barY, barW, barH);
        bg.lineStyle(1, C.BAR_BORDER, 1);
        bg.strokeRect(barX, barY, barW, barH);

        // Fill animado
        const fill = this.add.graphics();
        this._drawBarFill(fill, barX, barY, barW, barH, 0);

        this.tweens.add({
            targets:  { t: 0 },
            t:        pct,
            duration: 1200,
            ease:     "Cubic.easeOut",
            delay:    300,
            onUpdate: (_tween, target) => {
                this._drawBarFill(fill, barX, barY, barW, barH, target.t);
            },
        });

        // Marcações de 25%
        const tick = this.add.graphics();
        tick.fillStyle(0x000000, 0.4);
        [0.25, 0.5, 0.75].forEach(p => {
            tick.fillRect(barX + barW * p - 1, barY, 2, barH);
        });

        // Contador texto
        this._progressText = this.add.text(
            SCREEN_WIDTH / 2, barY + barH + 12,
            `0 / ${total} desbloqueadas`,
            {
                fontFamily: "PressStart2P",
                fontSize:   "18px",
                color:      "#7080b0",
            }
        ).setOrigin(0.5);

        // Anima contador
        this.tweens.addCounter({
            from:     0,
            to:       unlocked,
            duration: 1200,
            ease:     "Cubic.easeOut",
            delay:    300,
            onUpdate: (tween) => {
                const v = Math.round(tween.getValue());
                this._progressText.setText(`${v} / ${total} desbloqueadas`);
                const c = v === total ? C.TEXT_LIT : "#7080b0";
                this._progressText.setColor(c);
            },
        });
    }

    _drawBarFill(gfx, x, y, w, h, pct) {
        gfx.clear();
        if (pct <= 0) return;
        const fw = Math.max(4, Math.floor(w * pct));
        // Segmentos coloridos (verde → amarelo conforme progresso)
        const r = Math.floor(Phaser.Math.Linear(0x00, 0xff, pct));
        const g = 0xe6;
        const b = Math.floor(Phaser.Math.Linear(0x76, 0x00, pct));
        const col = (r << 16) | (g << 8) | b;
        gfx.fillStyle(col, 1);
        gfx.fillRect(x + 1, y + 1, fw - 2, h - 2);
        // Brilho topo
        gfx.fillStyle(0xffffff, 0.15);
        gfx.fillRect(x + 1, y + 1, fw - 2, Math.floor(h / 3));
    }

    // ── Grid de cards ─────────────────────────────────────────────────────────

    _buildGrid() {
        let achs = this._achievements;

        // Ordena: desbloqueadas + bloqueadas não-secretas, depois secretas
        achs = achs.sort((a, b) => {
            const aSecret = !!a.secret;
            const bSecret = !!b.secret;
            if (aSecret === bSecret) return 0;
            return aSecret ? 1 : -1; // secretas por último
        });

        // Container pai — será movido no scroll
        this._gridContainer = this.add.container(0, 0);

        achs.forEach((ach, i) => {
            const col     = i % COLS;
            const row     = Math.floor(i / COLS);
            const cx      = GRID_PAD_X + col * (CARD_W + CARD_GAP_X) + CARD_W / 2;
            const cy      = GRID_TOP + row * (CARD_H + CARD_GAP_Y) + CARD_H / 2;
            const unlocked = this.achievementManager.isUnlocked(ach.id);
            const secret  = !!ach.secret && !unlocked;

            const card = this._buildCard(ach, cx, cy, unlocked, secret, i);
            this._gridContainer.add(card);
            this._cardContainers.push(card);
        });

        // Calcula scroll máximo
        const rows     = Math.ceil(achs.length / COLS);
        const totalH   = rows * (CARD_H + CARD_GAP_Y) + GRID_TOP;
        this._maxScrollY = Math.max(0, totalH - SCROLL_BOT + 40);

        // Máscara para o grid
        const maskShape = this.make.graphics({ add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(0, SCROLL_TOP, SCREEN_WIDTH, SCROLL_H);
        this._gridContainer.setMask(maskShape.createGeometryMask());
    }

    /**
     * Constrói um Container com todos os elementos visuais de um card.
     */
    _buildCard(ach, cx, cy, unlocked, secret, idx) {
        const container = this.add.container(cx, cy);

        const title = secret ? "Jogue para desbloquear" : ach.title;
        const desc  = secret ? "as conquistas" : ach.description;
        const icon  = secret ? "🔒" : (ach.icon || "⭐");

        // ── Sombra ──
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.5);
        shadow.fillRect(-CARD_W / 2 + 5, -CARD_H / 2 + 5, CARD_W, CARD_H);

        // ── Fundo ──
        const bg = this.add.graphics();
        
        // Cores diferentes: desbloqueado vs bloqueado vs secreto
        let bgColor;
        if (unlocked) {
            bgColor = 0x161e36;
        } else if (secret) {
            bgColor = 0x2a1a35;  // roxo escuro para secretas
        } else {
            bgColor = 0x1a2035;  // cinza para bloqueadas
        }
        
        bg.fillStyle(bgColor);
        bg.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
        
        // Padrão hachurado para secretas bloqueadas
        if (secret && !unlocked) {
            const hatch = this.add.graphics();
            hatch.lineStyle(1, 0x8b2e7f, 0.25);
            for (let i = 0; i < CARD_W; i += 8) {
                hatch.lineBetween(-CARD_W / 2 + i, -CARD_H / 2, -CARD_W / 2 + i - CARD_H, CARD_H / 2);
            }
            container.add(hatch);
        }

        // ── Borda ──
        const border = this.add.graphics();
        if (unlocked) {
            // Borda dupla dourada
            border.lineStyle(2, C.BORDER_LIT, 1);
            border.strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
            border.lineStyle(1, C.BORDER_LIT, 0.35);  // era 0.25 — pouco visível
            border.strokeRect(-CARD_W / 2 + 3, -CARD_H / 2 + 3, CARD_W - 6, CARD_H - 6);
            // Cantos pixel-art (quadradinhos dourados)
            border.fillStyle(C.BORDER_LIT, 1);
            [[-CARD_W/2, -CARD_H/2], [CARD_W/2-4, -CARD_H/2],
             [-CARD_W/2, CARD_H/2-4], [CARD_W/2-4, CARD_H/2-4]].forEach(([x,y]) => {
                border.fillRect(x, y, 4, 4);
            });
            // Brilho lateral esquerdo
            border.fillStyle(C.BORDER_LIT, 0.12);
            border.fillRect(-CARD_W / 2, -CARD_H / 2, 4, CARD_H);
        } else if (secret) {
            // Borda dupla roxa para secretas
            border.lineStyle(2, 0xb050d0, 1);  // roxo brilhante
            border.strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
            border.lineStyle(1, 0xb050d0, 0.4);
            border.strokeRect(-CARD_W / 2 + 3, -CARD_H / 2 + 3, CARD_W - 6, CARD_H - 6);
            // Cantos roxos
            border.fillStyle(0xb050d0, 1);
            [[-CARD_W/2, -CARD_H/2], [CARD_W/2-4, -CARD_H/2],
             [-CARD_W/2, CARD_H/2-4], [CARD_W/2-4, CARD_H/2-4]].forEach(([x,y]) => {
                border.fillRect(x, y, 4, 4);
            });
        } else {
            border.lineStyle(2, C.BORDER_DIM, 1);      // cinza para bloqueadas
            border.strokeRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
        }

        // ── Ícone ──
        const iconBg = this.add.graphics();
        const ibSize = 90;
        const ibX    = -CARD_W / 2 + 18;
        const ibY    = -ibSize / 2;
        
        // Cores diferentes para states
        let iconBgColor, iconBorderColor;
        if (unlocked) {
            iconBgColor = 0x1e2d4a;
            iconBorderColor = C.BORDER_LIT;
        } else if (secret) {
            iconBgColor = 0x3d1a4a;     // roxo escuro
            iconBorderColor = 0xb050d0; // roxo brilhante
        } else {
            iconBgColor = 0x202a3a;
            iconBorderColor = C.BORDER_DIM;
        }
        
        iconBg.fillStyle(iconBgColor);
        iconBg.fillRect(ibX, ibY, ibSize, ibSize);
        
        if (unlocked) {
            iconBg.lineStyle(1, iconBorderColor, 0.4);
            iconBg.strokeRect(ibX, ibY, ibSize, ibSize);
        } else {
            iconBg.lineStyle(2, iconBorderColor, 0.8);
            iconBg.strokeRect(ibX, ibY, ibSize, ibSize);
        }

        let iconTxt;
        if (unlocked && ach.iconKey) {
            iconTxt = this.add.image(ibX + ibSize / 2, 0, ach.iconKey)
                .setOrigin(0.5)
                .setDisplaySize(ibSize - 10, ibSize - 10);
        } else {
            iconTxt = this.add.text(
                ibX + ibSize / 2, 0, icon,
                { fontSize: "50px" }
            ).setOrigin(0.5);

            // Tint para secretas bloqueadas
            if (secret && !unlocked) {
                iconTxt.setColor("#b050d0");
            }
        }

        // ── Número do índice (canto superior direito) ──
        const numTxt = this.add.text(
            CARD_W / 2 - 14, -CARD_H / 2 + 10,
            `#${String(idx + 1).padStart(2, "0")}`,
            {
                fontFamily: "PressStart2P",
                fontSize:   "15px",
                color:      unlocked ? C.TEXT_LIT : C.TEXT_DIM,
            }
        ).setOrigin(1, 0);

        // ── Título ──
        const titleTxt = this.add.text(
            ibX + ibSize + 18, -CARD_H / 2 + 22,
            title,
            {
                fontFamily:      "PressStart2P",
                fontSize:        "20px",
                color:           unlocked ? C.TEXT_LIT : (secret ? "#d080e0" : C.TEXT_DIM),
                stroke:          "#000000",
                strokeThickness: unlocked ? 3 : 4,  // mais espesso para bloqueado
                wordWrap:        { width: CARD_W - ibSize - 80 },
            }
        ).setOrigin(0, 0);

        // ── Descrição ──
        const descTxt = this.add.text(
            ibX + ibSize + 18, -CARD_H / 2 + 75,  // aumentado de 60 para 75
            desc,
            {
                fontFamily:      "Courier New",
                fontSize:        "26px",
                color:           unlocked ? C.DESC_LIT : (secret ? "#d080e0" : C.DESC_DIM),
                stroke:          "#000000",
                strokeThickness: unlocked ? 2 : 3,  // mais espesso para bloqueado
                wordWrap:        { width: CARD_W - ibSize - 80 },
                lineSpacing:     3,
            }
        ).setOrigin(0, 0);

        // ── Badge "NOVO" para recém-desbloqueado ──
        if (unlocked && ach.isNew) {
            const badgeBg = this.add.graphics();
            badgeBg.fillStyle(0x00e676);
            badgeBg.fillRect(-CARD_W / 2 + 8, -CARD_H / 2 - 10, 48, 18);
            const badgeTxt = this.add.text(
                -CARD_W / 2 + 32, -CARD_H / 2 - 1,
                "NOVO",
                { fontFamily: "PressStart2P", fontSize: "8px", color: "#000000" }
            ).setOrigin(0.5);
            container.add([badgeBg, badgeTxt]);
        }

        container.add([shadow, bg, border, iconBg, iconTxt, numTxt, titleTxt, descTxt]);

        // ── Hover (apenas desbloqueadas) ──
        if (unlocked) {
            const hitZone = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: false });
            hitZone.on("pointerover", () => {
                this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 120, ease: "Sine.easeOut" });
                bg.clear();
                bg.fillStyle(0x1e2e50);
                bg.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
            });
            hitZone.on("pointerout", () => {
                this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: "Sine.easeOut" });
                bg.clear();
                bg.fillStyle(0x161e36);
                bg.fillRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H);
            });
            container.add(hitZone);
        }

        // Estado inicial para animação de entrada
        container.setAlpha(0);
        container.setScale(0.88);

        return container;
    }

    // ── Scroll ────────────────────────────────────────────────────────────────

    _setupScroll() {
        if (this._maxScrollY <= 0) return;

        // Scroll via roda do mouse
        this.input.on("wheel", (_ptr, _objs, _dx, dy) => {
            this._scrollY = Phaser.Math.Clamp(this._scrollY + dy * 0.8, 0, this._maxScrollY);
            this._applyScroll();
        });

        // Scroll via drag (touch / click-drag)
        let dragStartY   = 0;
        let dragStartScroll = 0;
        let isDragging = false;

        // Área de scroll (fundo invisível para capturar eventos)
        const scrollZone = this.add.zone(SCREEN_WIDTH / 2, SCROLL_TOP + SCROLL_H / 2, SCREEN_WIDTH, SCROLL_H)
            .setInteractive({ draggable: true });

        scrollZone.on("pointerdown", (ptr) => {
            dragStartY      = ptr.y;
            dragStartScroll = this._scrollY;
            isDragging      = true;
        });

        scrollZone.on("pointermove", (ptr) => {
            if (!isDragging) return;
            const delta = dragStartY - ptr.y;
            this._scrollY = Phaser.Math.Clamp(dragStartScroll + delta, 0, this._maxScrollY);
            this._applyScroll();
        });

        scrollZone.on("pointerup", () => {
            isDragging = false;
        });

        scrollZone.on("pointerout", () => {
            isDragging = false;
        });

        // Suporte adicional para touch
        this.input.on("pointerdown", (ptr) => {
            if (ptr.y < SCROLL_TOP || ptr.y > SCROLL_BOT) return;
            dragStartY      = ptr.y;
            dragStartScroll = this._scrollY;
            isDragging      = true;
        });

        this.input.on("pointermove", (ptr) => {
            if (!isDragging) return;
            if (ptr.y < SCROLL_TOP - 40 || ptr.y > SCROLL_BOT + 40) {
                isDragging = false;
                return;
            }
            const delta = dragStartY - ptr.y;
            this._scrollY = Phaser.Math.Clamp(dragStartScroll + delta, 0, this._maxScrollY);
            this._applyScroll();
        });

        this.input.on("pointerup", () => {
            isDragging = false;
        });

        // Indicador de scroll (seta pulsante)
        this._scrollHint = this.add.text(
            SCREEN_WIDTH / 2, SCROLL_BOT + 8,
            "▼  ROLE PARA VER MAIS  ▼",
            {
                fontFamily: "PressStart2P",
                fontSize:   "10px",
                color:      "#3a5080",
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets:  this._scrollHint,
            alpha:    { from: 0.3, to: 0.9 },
            duration: 900,
            yoyo:     true,
            repeat:   -1,
            ease:     "Sine.easeInOut",
        });
    }

    _applyScroll() {
        this._gridContainer.setY(-this._scrollY);
        // Esconde hint quando chegou no final
        if (this._scrollHint) {
            this._scrollHint.setAlpha(
                this._scrollY >= this._maxScrollY - 10 ? 0 : 1
            );
        }
    }

    // ── Animação de entrada ───────────────────────────────────────────────────

    _animateEntrance() {
        // Cards entram em cascata (stagger por linha)
        this._cardContainers.forEach((card, i) => {
            const row   = Math.floor(i / COLS);
            const delay = 80 + row * 60 + (i % COLS) * 30;

            this.tweens.add({
                targets:  card,
                alpha:    1,
                scaleX:   1,
                scaleY:   1,
                duration: 320,
                delay,
                ease:     "Back.easeOut",
            });
        });
    }

    /**
     * Anima um card específico como recém-desbloqueado (pode ser chamado externamente).
     * @param {number} idx índice da conquista
     */
    unlockAnimation(idx) {
        const card = this._cardContainers[idx];
        if (!card) return;

        // Flash dourado
        this.tweens.add({
            targets:  card,
            scaleX:   { from: 1, to: 1.08 },
            scaleY:   { from: 1, to: 1.08 },
            duration: 200,
            yoyo:     true,
            repeat:   2,
            ease:     "Sine.easeInOut",
            onComplete: () => card.setScale(1),
        });

        // Partículas de estrela
        this._burstParticles(card.x, card.y);
    }

    _burstParticles(cx, cy) {
        const gfx = this.add.graphics().setDepth(200);
        const particles = Array.from({ length: 12 }, () => ({
            x: cx, y: cy,
            vx: (Math.random() - 0.5) * 280,
            vy: (Math.random() - 0.5) * 280 - 60,
            life: 1,
            size: 3 + Math.random() * 4,
            color: [C.STAR_LIT, 0x00e676, 0xffffff][Math.floor(Math.random() * 3)],
        }));

        this.time.addEvent({
            delay: 16,
            repeat: 40,
            callback: () => {
                gfx.clear();
                particles.forEach(p => {
                    p.x  += p.vx * 0.016;
                    p.y  += p.vy * 0.016;
                    p.vy += 200 * 0.016; // gravidade
                    p.life -= 0.04;
                    if (p.life <= 0) return;
                    gfx.fillStyle(p.color, p.life);
                    gfx.fillRect(p.x, p.y, p.size, p.size);
                });
            },
            callbackScope: this,
        });

        this.time.delayedCall(700, () => { gfx.destroy(); });
    }

    // ── Botão Voltar ──────────────────────────────────────────────────────────

    _createBackButton() {
        new Button(this, {
            x:               SCREEN_WIDTH / 2,
            y:               SCREEN_HEIGHT - 52,
            width:           300,
            height:          64,
            radius:          8,
            text:            "VOLTAR",
            backgroundColor: 0x7a1515,
            textStyle: {
                color:      "#ffffff",
                fontStyle:  "bold",
                fontFamily: "PressStart2P",
                fontSize:   "18px",
            },
            onClick: () => {
                this.sound.play("button");
                this.scene.transition({
                    target:    SCENES.MENU,
                    duration:  500,
                    moveBellow: true,
                    onUpdate:  (progress) => this.cameras.main.setAlpha(1 - progress),
                });
            },
        });
    }
}
