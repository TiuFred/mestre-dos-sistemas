import { SCENES, SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants.js";
import SettingsUI from "../components/SettingsUI.js";

export default class PauseOverlayScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.PAUSE_OVERLAY });
        this._originSceneKey = SCENES.GAME;
    }

    init(data = {}) {
        this._originSceneKey = data.originSceneKey ?? SCENES.GAME;
    }

    create() {
        this._buildScrim();

        this._ui = new SettingsUI(
            this,
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            {
                showTitle: true,
                onClose: () => this._closeOverlay(),
                onSave: () => this._openSaveSlots("save"),
                onLoad: () => this._openSaveSlots("load"),
                onMenu: () => this._goToMenu(),
            }
        ).setDepth(999);

        this._animateIn();
    }

    _buildScrim() {
        this._scrim = this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0x000000,
            0
        ).setDepth(998).setInteractive();

        this._scrim.on("pointerdown", () => this._closeOverlay());
    }

    _animateIn() {
        const container = this._ui._root;

        this.tweens.add({
            targets: this._scrim,
            alpha: { from: 0, to: 0.65 },
            duration: 220,
            ease: "Sine.easeOut",
        });

        container.setAlpha(0);
        container.setY(SCREEN_HEIGHT / 2 + 40);
        this.tweens.add({
            targets: container,
            alpha: 1,
            y: SCREEN_HEIGHT / 2,
            duration: 280,
            ease: "Back.easeOut",
        });
    }

    _closeOverlay() {
        const container = this._ui?._root;
        if (!container) {
            this._resumeOriginScene();
            this.scene.stop();
            return;
        }

        this.tweens.add({
            targets: this._scrim,
            alpha: 0,
            duration: 200,
            ease: "Sine.easeIn",
        });

        this.tweens.add({
            targets: container,
            alpha: 0,
            y: SCREEN_HEIGHT / 2 + 30,
            duration: 220,
            ease: "Sine.easeIn",
            onComplete: () => {
                this._ui?.destroy();
                this._scrim?.destroy();
                this._resumeOriginScene();
                this.scene.stop();
            },
        });
    }

    _resumeOriginScene() {
        const originScene = this.scene.get(this._originSceneKey);
        if (originScene) {
            originScene.setPauseMenuOpen?.(false);
            originScene.scene.resume();
        }
    }

    _openSaveSlots(mode) {
        this.scene.launch(SCENES.SAVE_SLOTS, {
            mode,
            originSceneKey: this._originSceneKey,
            closeMode: "resume",
            resumeSceneKey: SCENES.PAUSE_OVERLAY,
        });
        this.scene.pause();
    }

    _goToMenu() {
        const originScene = this.scene.get(this._originSceneKey);
        originScene?._stopBackgroundMusic?.();
        originScene.setPauseMenuOpen?.(false);

        this._ui?.destroy();
        this._scrim?.destroy();

        if (originScene) {
            this.scene.stop(this._originSceneKey);
        }

        this.scene.stop();
        this.scene.start(SCENES.MENU);
    }
}
