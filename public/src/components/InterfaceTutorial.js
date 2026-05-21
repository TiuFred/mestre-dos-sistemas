import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants.js";

// Depths acima do Guide (8000) e outros elementos do jogo
const OVERLAY_DEPTH   = 8500;
const HIGHLIGHT_DEPTH = 8501;
const TEXT_DEPTH      = 8502;
const BUTTON_DEPTH    = 8503;

const HIGHLIGHT_COLOR = 0xF9C22B;

/**
 * Tutorial interativo que destaca itens da interface um a um.
 *
 * Estrutura de cada passo:
 *   {
 *     shape?:       'circle' | 'rect'  — só usado quando não há target
 *     x, y:         posição do item (centro do destaque / caixa de texto)
 *     radius?:      raio (circle sem target)
 *     width?,height?: dimensões (rect sem target)
 *     title:        título exibido no painel
 *     description:  texto explicativo
 *     usage?:       instrução de como interagir ("Clique para abrir", etc.)
 *     target?:      game object Phaser — quando fornecido, o sprite pulsa e
 *                   fica visível acima do overlay em sua cor natural
 *     onEnter?():   callback chamado ao entrar no passo
 *     onExit?():    callback chamado ao sair do passo
 *   }
 */
export default class InterfaceTutorial {
    constructor(scene, steps, onComplete) {
        this.scene       = scene;
        this.steps       = steps;
        this.onComplete  = onComplete;
        this.currentStep = -1;   // -1 = nenhum passo ativo ainda

        this._overlay         = null;
        this._stepObjs        = [];
        this._tweens          = [];
        this._targetBackup    = null; // { target, origScaleX, origScaleY, origDepth }
        this._panelWatchTimer = null; // TimerEvent que monitora abertura do painel
        this._panelWatchState = null; // { panels: [], origDepths: [] }
    }

    // ─── API pública ─────────────────────────────────────────────────────────

    show() {
        this._createOverlay();
        this._showStep(0);
    }

    // ─── Overlay ─────────────────────────────────────────────────────────────

    _createOverlay() {
        this._overlay = this.scene.add.rectangle(
            SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2,
            SCREEN_WIDTH, SCREEN_HEIGHT,
            0x000000, 0.80
        )
        .setDepth(OVERLAY_DEPTH)
        .setInteractive();
    }

    // ─── Renderização de cada passo ──────────────────────────────────────────

    _showStep(index) {
        this._clearStep();
        this.currentStep = index;

        const step   = this.steps[index];
        const isLast = index === this.steps.length - 1;

        step.onEnter?.();

        if (step.target) {
            this._animateTarget(step.target);
        } else if (step.shape === 'rect') {
            this._createRectGlow(step.x, step.y, step.width, step.height);
        } else {
            this._createCircleGlow(step.x, step.y, step.radius);
        }

        // Se o step tem um painel que pode ser aberto, monitora e pulsa quando abrir
        if (step.watchPanel) {
            this._startPanelWatch(step.watchPanel);
        }

        const layout = this._computeLayout(step);
        this._createTextBox(step, layout);
        this._createButton(isLast, layout);
    }

    // ─── Monitoramento do painel aberto ───────────────────────────────────────

    // getPanel deve retornar um game object, um array deles, ou null quando fechado
    _startPanelWatch(getPanel) {
        this._panelWatchState = { panels: [], origDepths: [] };

        this._panelWatchTimer = this.scene.time.addEvent({
            delay: 100,
            loop:  true,
            callback: () => {
                // Só age uma vez (enquanto panels estiver vazio)
                if (this._panelWatchState.panels.length > 0) return;

                const result = getPanel();
                if (!result) return;

                // Normaliza para array
                const list = Array.isArray(result) ? result : [result];

                // Eleva cada objeto acima do overlay — sem efeito visual
                const origDepths = list.map(obj => obj.depth);
                list.forEach(obj => obj.setDepth(OVERLAY_DEPTH + 2));

                this._panelWatchState = { panels: list, origDepths };
            }
        });
    }

    // ─── Layout calculado uma vez, compartilhado entre textbox e botão ────────

    _computeLayout(step) {
        const targetX  = step.x;
        const targetY  = step.y;
        const hasUsage = !!step.usage;

        // Posição horizontal e vertical da caixa
        const boxX = targetX > SCREEN_WIDTH  / 2 ? SCREEN_WIDTH  * 0.27 : SCREEN_WIDTH  * 0.73;
        const boxY = targetY > SCREEN_HEIGHT / 2 ? SCREEN_HEIGHT * 0.28 : SCREEN_HEIGHT * 0.68;

        const boxW = 700;

        // Alturas fixas das seções
        const TITLE_H  = 60;
        const FOOTER_H = 56;
        const USAGE_H  = 48;

        const boxH = hasUsage ? 370 : 310;

        const boxTop    = boxY - boxH / 2;
        const boxBottom = boxY + boxH / 2;

        const titleCenter  = boxTop + TITLE_H / 2;        // centro da faixa amarela
        const contentTop   = boxTop + TITLE_H;             // início da área de conteúdo
        const footerTop    = boxBottom - FOOTER_H;         // início do rodapé
        const footerCenter = footerTop + FOOTER_H / 2;     // centro do rodapé

        let contentBottom, usageCenter;
        if (hasUsage) {
            contentBottom = footerTop - USAGE_H;
            usageCenter   = contentBottom + USAGE_H / 2;
        } else {
            contentBottom = footerTop;
        }

        const contentCenter = (contentTop + contentBottom) / 2;

        return {
            boxX, boxY, boxW, boxH,
            hasUsage,
            titleCenter,
            contentCenter,
            usageCenter,
            footerTop,
            footerCenter,
        };
    }

    // ─── Pulsação + cor natural no sprite real ────────────────────────────────

    _animateTarget(target) {
        const origScaleX = target.scaleX;
        const origScaleY = target.scaleY;
        const origDepth  = target.depth;

        this._targetBackup = { target, origScaleX, origScaleY, origDepth };

        // Eleva o sprite acima do overlay → aparece em sua cor natural
        target.setDepth(OVERLAY_DEPTH + 1);

        const t = this.scene.tweens.add({
            targets: target,
            scaleX:  { from: origScaleX, to: origScaleX * 1.22 },
            scaleY:  { from: origScaleY, to: origScaleY * 1.22 },
            duration: 550,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut'
        });
        this._tweens.push(t);
    }

    // ─── Glow retangular (para área sem sprite) ───────────────────────────────

    _createRectGlow(cx, cy, w, h) {
        const scene = this.scene;

        const bg = scene.add.rectangle(cx, cy, w + 30, h + 30, HIGHLIGHT_COLOR, 0.06)
            .setDepth(HIGHLIGHT_DEPTH);
        this._stepObjs.push(bg);

        const outerRect = scene.add.rectangle(cx, cy, w + 14, h + 14, 0x000000, 0)
            .setStrokeStyle(3, HIGHLIGHT_COLOR, 0.4)
            .setDepth(HIGHLIGHT_DEPTH);
        this._stepObjs.push(outerRect);

        const rect = scene.add.rectangle(cx, cy, w, h, 0x000000, 0)
            .setStrokeStyle(5, HIGHLIGHT_COLOR, 1)
            .setDepth(HIGHLIGHT_DEPTH);
        this._stepObjs.push(rect);

        const t1 = scene.tweens.add({
            targets: rect,
            scaleX:  { from: 1, to: 1.03 },
            scaleY:  { from: 1, to: 1.03 },
            alpha:   { from: 1, to: 0.2 },
            duration: 800,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this._tweens.push(t1);

        const t2 = scene.tweens.add({
            targets: bg,
            alpha:   { from: 0.35, to: 0.06 },
            duration: 800,
            yoyo: true, repeat: -1, delay: 80,
            ease: 'Sine.easeInOut'
        });
        this._tweens.push(t2);
    }

    // ─── Glow circular (fallback) ──────────────────────────────────────────────

    _createCircleGlow(cx, cy, radius) {
        const scene = this.scene;

        const ring = scene.add.arc(cx, cy, radius, 0, 360, false)
            .setFillStyle(0, 0)
            .setStrokeStyle(5, HIGHLIGHT_COLOR, 1)
            .setDepth(HIGHLIGHT_DEPTH);
        this._stepObjs.push(ring);

        const t = scene.tweens.add({
            targets: ring,
            scaleX:  { from: 1, to: 1.18 },
            scaleY:  { from: 1, to: 1.18 },
            alpha:   { from: 1, to: 0.15 },
            duration: 800,
            yoyo: true, repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this._tweens.push(t);
    }

    // ─── Caixa de texto ───────────────────────────────────────────────────────

    _createTextBox(step, L) {
        const scene = this.scene;
        const { boxX, boxY, boxW, boxH, hasUsage,
                titleCenter, contentCenter, usageCenter, footerTop } = L;

        // Sombra
        this._stepObjs.push(
            scene.add.rectangle(boxX + 6, boxY + 6, boxW, boxH, 0x000000, 0.5)
                .setDepth(TEXT_DEPTH - 1)
        );

        // Fundo
        this._stepObjs.push(
            scene.add.rectangle(boxX, boxY, boxW, boxH, 0x111111, 0.95)
                .setStrokeStyle(4, HIGHLIGHT_COLOR)
                .setDepth(TEXT_DEPTH)
        );

        // ── Seção 1: título (faixa amarela no topo) ──
        this._stepObjs.push(
            scene.add.rectangle(boxX, titleCenter, boxW, 60, HIGHLIGHT_COLOR, 1)
                .setDepth(TEXT_DEPTH + 1)
        );
        this._stepObjs.push(
            scene.add.text(boxX, titleCenter, step.title, {
                fontFamily: "PressStart2P", fontSize: "24px", color: "#111111",
            }).setOrigin(0.5).setDepth(TEXT_DEPTH + 2)
        );

        // ── Seção 2: descrição (área central) ──
        this._stepObjs.push(
            scene.add.text(boxX, contentCenter, step.description, {
                fontFamily: "PressStart2P", fontSize: "16px",
                color: "#EEEEEE", align: "center",
                lineSpacing: 12, wordWrap: { width: boxW - 60 }
            }).setOrigin(0.5).setDepth(TEXT_DEPTH + 2)
        );

        // ── Seção 3: como usar (faixa acima do rodapé, só se hasUsage) ──
        if (hasUsage) {
            this._stepObjs.push(
                scene.add.rectangle(boxX, usageCenter, boxW, 48, 0x1c1c1c, 1)
                    .setDepth(TEXT_DEPTH + 1)
            );
            // linha separadora entre conteúdo e uso
            this._stepObjs.push(
                scene.add.rectangle(boxX, usageCenter - 24, boxW, 2, HIGHLIGHT_COLOR, 0.3)
                    .setDepth(TEXT_DEPTH + 2)
            );
            this._stepObjs.push(
                scene.add.text(boxX, usageCenter, `>> ${step.usage}`, {
                    fontFamily: "PressStart2P", fontSize: "14px",
                    color: "#F9C22B", align: "center",
                }).setOrigin(0.5).setDepth(TEXT_DEPTH + 3)
            );
        }

        // ── Seção 4: rodapé — linha separadora ──
        this._stepObjs.push(
            scene.add.rectangle(boxX, footerTop, boxW, 2, HIGHLIGHT_COLOR, 0.3)
                .setDepth(TEXT_DEPTH + 1)
        );
    }

    // ─── Botão + indicador (rodapé) ───────────────────────────────────────────

    _createButton(isLast, L) {
        const scene = this.scene;
        const { boxX, boxY, boxW, boxH, footerCenter } = L;

        // Fundo do rodapé
        this._stepObjs.push(
            scene.add.rectangle(boxX, footerCenter, boxW, 56, 0x1a1a1a, 1)
                .setDepth(TEXT_DEPTH + 1)
        );

        // Indicador de passo (lado esquerdo)
        this._stepObjs.push(
            scene.add.text(boxX - boxW / 2 + 60, footerCenter,
                `${this.currentStep + 1} / ${this.steps.length}`, {
                fontFamily: "PressStart2P", fontSize: "14px", color: "#888888",
            }).setOrigin(0.5).setDepth(TEXT_DEPTH + 2)
        );

        // Botão (lado direito)
        const label = isLast ? "Entendi!" : "Próximo >";
        const btnX  = boxX + boxW / 2 - 140;

        const bg = scene.add.rectangle(btnX, footerCenter, 240, 42, 0xb71c1c)
            .setDepth(BUTTON_DEPTH)
            .setInteractive({ useHandCursor: true })
            .setStrokeStyle(2, HIGHLIGHT_COLOR);
        this._stepObjs.push(bg);

        this._stepObjs.push(
            scene.add.text(btnX, footerCenter, label, {
                fontFamily: "PressStart2P", fontSize: "16px", color: "#FFFFFF",
            }).setOrigin(0.5).setDepth(BUTTON_DEPTH + 1)
        );

        bg.on("pointerover",  () => bg.setFillStyle(0xd32f2f));
        bg.on("pointerout",   () => bg.setFillStyle(0xb71c1c));
        bg.on("pointerdown",  () => {
            scene.sound.play("button");
            isLast ? this._finish() : this._showStep(this.currentStep + 1);
        });
    }

    // ─── Limpeza ──────────────────────────────────────────────────────────────

    _clearStep() {
        // 1. Para tweens do sprite
        this._tweens.forEach(t => t.stop());
        this._tweens = [];

        // 2. Para o timer de monitoramento do painel
        if (this._panelWatchTimer) {
            this._panelWatchTimer.remove();
            this._panelWatchTimer = null;
        }

        // 3. Restaura depth original de todos os objetos do painel
        if (this._panelWatchState?.panels?.length) {
            this._panelWatchState.panels.forEach((obj, i) => {
                obj.setDepth(this._panelWatchState.origDepths[i]);
            });
        }
        this._panelWatchState = null;

        // 4. Fecha o painel automaticamente (antes de restaurar o sprite)
        if (this.currentStep >= 0) {
            this.steps[this.currentStep]?.closePanel?.();
        }

        // 5. Restaura escala e depth original do sprite
        if (this._targetBackup) {
            const { target, origScaleX, origScaleY, origDepth } = this._targetBackup;
            target.setScale(origScaleX, origScaleY);
            target.setDepth(origDepth);
            this._targetBackup = null;
        }

        // 6. Chama onExit do passo encerrado
        if (this.currentStep >= 0) {
            this.steps[this.currentStep]?.onExit?.();
        }

        // 7. Destrói objetos de UI
        this._stepObjs.forEach(o => o.destroy());
        this._stepObjs = [];
    }

    _finish() {
        this._clearStep();
        this._overlay?.destroy();
        this._overlay = null;
        this.onComplete?.();
    }
}
