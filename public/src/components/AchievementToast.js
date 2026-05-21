import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants.js';

export default class AchievementToast {
    constructor(scene) {
        this.scene      = scene;
        this.queue      = [];
        this.isShowing  = false;

        this.PADDING_X        = 48;
        this.PADDING_Y        = 36;
        this.MARGIN           = 42;
        this.WIDTH            = 630;
        this.ICON_SIZE        = 84;
        this.GAP              = 24;
        this.SHOW_DURATION    = 3000;
        this.ANIM_IN_DURATION = 400;
        this.ANIM_OUT_DURATION = 350;
    }

    /**
     * Atualiza a referência de cena SEM descartar a fila.
     * Chamado na troca de cena para que novos toasts sejam criados
     * na cena correta, mas os já enfileirados não se percam.
     */
    rebindScene(scene) {
        this.scene = scene;
        // Se não havia nada rodando, tenta processar a fila na nova cena
        if (!this.isShowing && this.queue.length > 0) {
            this._processQueue();
        }
    }

    /** @deprecated use rebindScene — mantido para compatibilidade */
    setScene(scene) {
        this.rebindScene(scene);
    }

    show(title, description) {
        this.queue.push({ title, description });
        if (!this.isShowing) this._processQueue();
    }

    _processQueue() {
        if (this.queue.length === 0) {
            this.isShowing = false;
            return;
        }

        // Cena pode ter sido destruída ou não estar ativa — adia para o próximo frame
        if (!this.scene?.sys?.isActive?.()) {
            this.isShowing = false;
            return;
        }

        this.isShowing = true;
        const { title, description } = this.queue.shift();
        this._render(title, description);
    }

    _render(title, description) {
        const scene = this.scene;

        const iconSize = this.ICON_SIZE;
        const padX     = this.PADDING_X;
        const padY     = this.PADDING_Y;
        const gap      = this.GAP;
        const w        = this.WIDTH;

        const titleStyle = {
            fontFamily: '"Segoe UI", sans-serif',
            fontSize:   '30px',
            fontStyle:  'bold',
            color:      '#FFD700',
            wordWrap:   { width: w - padX * 2 - iconSize - gap, useAdvancedWrap: true },
        };
        const descStyle = {
            fontFamily: '"Segoe UI", sans-serif',
            fontSize:   '24px',
            color:      '#CCCCCC',
            wordWrap:   { width: w - padX * 2 - iconSize - gap, useAdvancedWrap: true },
        };
        const labelStyle = {
            fontFamily: '"Segoe UI", sans-serif',
            fontSize:   '20px',
            fontStyle:  'bold',
            color:      '#FFD700',
            alpha:      0.7,
        };

        // Mede altura real dos textos antes de montar
        const tmpTitle = scene.add.text(0, 0, title,       titleStyle).setVisible(false);
        const tmpDesc  = scene.add.text(0, 0, description, descStyle ).setVisible(false);
        const titleH   = tmpTitle.height;
        const descH    = tmpDesc.height;
        tmpTitle.destroy();
        tmpDesc.destroy();

        const labelH      = 27;
        const textBlockH  = labelH + 4 + titleH + 4 + descH;
        const contentH    = Math.max(iconSize, textBlockH);
        const totalH      = contentH + padY * 2;

        const startX  = SCREEN_WIDTH - this.MARGIN - w;
        const offscreenY = SCREEN_HEIGHT + totalH + 10;
        const restY   = SCREEN_HEIGHT - this.MARGIN - totalH;

        const container = scene.add.container(startX, offscreenY);
        container.setDepth(99999);

        const bg = scene.add.graphics();
        bg.fillStyle(0x1a1a2e, 0.95);
        bg.fillRoundedRect(0, 0, w, totalH, 10);
        bg.lineStyle(1.5, 0xFFD700, 0.6);
        bg.strokeRoundedRect(0, 0, w, totalH, 10);

        const accentBar = scene.add.graphics();
        accentBar.fillStyle(0xFFD700, 1);
        accentBar.fillRect(w - 3, 10, 3, totalH - 20);

        const iconBg = scene.add.graphics();
        iconBg.fillStyle(0xFFD700, 0.15);
        iconBg.fillRoundedRect(padX, padY + (contentH - iconSize) / 2, iconSize, iconSize, 8);

        const iconText = scene.add.text(
            padX + iconSize / 2,
            padY + (contentH - iconSize) / 2 + iconSize / 2,
            '🏆',
            { fontSize: '42px' }
        ).setOrigin(0.5, 0.5);

        const textX     = padX + iconSize + gap;
        const textBaseY = padY + (contentH - textBlockH) / 2;

        const labelText = scene.add.text(textX, textBaseY,                            'CONQUISTA DESBLOQUEADA', labelStyle);
        const titleText = scene.add.text(textX, textBaseY + labelH + 4,               title,       titleStyle);
        const descText  = scene.add.text(textX, textBaseY + labelH + 4 + titleH + 4,  description, descStyle);

        container.add([bg, accentBar, iconBg, iconText, labelText, titleText, descText]);

        // Guarda referência para poder verificar se ainda está ativo nos callbacks
        let alive = true;
        container.once('destroy', () => { alive = false; });

        scene.tweens.add({
            targets:  container,
            y:        restY,
            duration: this.ANIM_IN_DURATION,
            ease:     'Back.easeOut',
            onComplete: () => {
                if (!alive) { this._processQueue(); return; }

                scene.time.delayedCall(this.SHOW_DURATION, () => {
                    if (!alive) { this._processQueue(); return; }

                    scene.tweens.add({
                        targets:  container,
                        x:        SCREEN_WIDTH + w + 30,
                        duration: this.ANIM_OUT_DURATION,
                        ease:     'Cubic.easeIn',
                        onComplete: () => {
                            if (alive) container.destroy();
                            this._processQueue();
                        },
                    });
                });
            },
        });
    }
}
