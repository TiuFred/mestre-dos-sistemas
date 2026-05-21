import { SCENES, SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants.js";
import SettingsUI from "../components/SettingsUI.js";
import SettingsManager from "../components/managers/SettingsManager.js";

/**
 * Tela de opções completa — funciona como cena própria, transicionando
 * de/para o menu. Reutiliza SettingsUI para toda a lógica e visual.
 */
export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.SETTINGS });
    }

    create() {
        // ── Fade in ───────────────────────────────────────────────────────────
        this.cameras.main.setAlpha(0);
        this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 400 });

        // ── Fundo: imagem do menu com escurecimento ───────────────────────────
        this.add.image(0, 0, "background_menu")
            .setScale(0.5)
            .setOrigin(0, 0);

        this.add.rectangle(
            SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2,
            SCREEN_WIDTH, SCREEN_HEIGHT,
            0x000000
        ).setAlpha(0.72);

        // ── Overlay de brilho (manipulado pelo SettingsUI) ────────────────────
        this.brightnessOverlay = this.add.rectangle(
            SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2,
            SCREEN_WIDTH, SCREEN_HEIGHT,
            0x000000
        ).setDepth(9999).setAlpha(1 - (SettingsManager?.brightness ?? 1));

        // ── Painel de configurações ───────────────────────────────────────────
        this._ui = new SettingsUI(
            this,
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            {
                showTitle: true,
                onClose:   () => this._goBack(),
            }
        ).setDepth(10);
    }

    _goBack() {
        this.sound.play("button");
        this.scene.transition({
            target:     SCENES.MENU,
            duration:   400,
            moveBellow: true,
            onUpdate:   (p) => this.cameras.main.setAlpha(1 - p),
        });
    }
}