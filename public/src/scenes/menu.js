import SaveManager from "../components/managers/SaveManager.js";
import SettingsManager from "../components/managers/SettingsManager.js";
import { SCREEN_WIDTH, SCREEN_HEIGHT, SCENES } from "../constants.js";

export default class MenuScene extends Phaser.Scene {
    musica = null;

    constructor() {
        super({ key: SCENES.MENU });
    }

    init(_params) {}

    create() {
        const cx = SCREEN_WIDTH / 2;

        const autosavePreview = SaveManager.getAutosavePreview();
        const hasAutosave = autosavePreview !== null;

        // Fundo
        this.add.image(0, 0, "background_menu").setScale(0.5).setOrigin(0, 0);
        this.overlayRect = this.add.rectangle(cx, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000)
            .setAlpha(0.52);

        // Logo
        this.add.image(cx, 410, "ui_logo").setScale(0.15);
        this.testButtonImage = this.add.image(cx, 305, "ui_home_title").setScale(0.5);

        // Botões
        const BW = 600;
        let cy = hasAutosave ? 500 : 520;

        this._btn(cx, cy, BW, 94, "Jogar", "48px", 0x8b0000, 0xb71c1c, () => {
            this.sound.play("button");
            this.musica?.stop();
            SaveManager.clearAutosave();
            this.scene.transition({
                target: SCENES.GAME,
                duration: 500,
                moveBellow: true,
                onUpdate: (p) => this.cameras.main.setAlpha(1 - p),
            });
        });
        cy += 94 + 14;

        if (hasAutosave) {
            this._btn(cx, cy, BW, 88, "Continuar", "28px", 0x3e2723, 0x5d4037, () => {
                this.sound.play("button");
                this.musica?.stop();
                this.scene.transition({
                    target: SCENES.GAME,
                    duration: 500,
                    moveBellow: true,
                    data: { loadAutosave: true },
                    onUpdate: (p) => this.cameras.main.setAlpha(1 - p),
                });
            }, _formatAutosavePreview(autosavePreview));
            cy += 88 + 12;
        }

        this._btn(cx, cy, BW, 76, "Carregar", "24px", 0x2a1c10, 0x4e342e, () => {
            this.sound.play("button");
            this.scene.launch(SCENES.SAVE_SLOTS, {
                mode: "load",
                originSceneKey: SCENES.MENU,
                closeMode: "resume",
                resumeSceneKey: SCENES.MENU,
            });
            this.scene.pause();
        });
        cy += 76 + 16;

        const dg = this.add.graphics().setDepth(4);
        dg.lineStyle(1, 0x7a5500, 0.55);
        dg.lineBetween(cx - 250, cy + 4, cx + 250, cy + 4);
        cy += 22;

        this._btn(cx - Math.floor((BW - 14) / 4) - 7, cy, Math.floor((BW - 14) / 2), 66, "Conquistas", "17px", 0x1b5e20, 0x2e7d32, () => {
            this.sound.play("button");
            this.scene.transition({
                target: SCENES.ACHIEVEMENTS,
                duration: 500,
                moveBellow: true,
                onUpdate: (p) => this.cameras.main.setAlpha(1 - p),
            });
        });

        this._btn(cx + Math.floor((BW - 14) / 4) + 7, cy, Math.floor((BW - 14) / 2), 66, "Opções", "17px", 0x7f0000, 0xc62828, () => {
            this.sound.play("button");
            this.scene.transition({
                target: SCENES.SETTINGS,
                duration: 500,
                moveBellow: true,
                onUpdate: (p) => this.cameras.main.setAlpha(1 - p),
            });
        });

        this._setupBackgroundMusic();

        this.brightnessOverlay = this.add.rectangle(cx, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000)
            .setDepth(9999)
            .setAlpha(1 - SettingsManager.brightness);

        // Quando a cena é retomada, reinicia para atualizar o estado do autosave.
        this.events.once("resume", () => this.scene.restart());
    }

    _btn(cx, y, w, h, text, fontSize, bgIdle, bgHover, onClick, subtitle = null) {
        const bx = cx - w / 2;
        const labelY = subtitle ? y + h / 2 - 14 : y + h / 2;

        const g = this.add.graphics().setDepth(4);

        const draw = (hot) => {
            g.clear();
            g.fillStyle(0x000000, 0.42);
            g.fillRoundedRect(bx + 5, y + 5, w, h, 11);
            g.fillStyle(hot ? bgHover : bgIdle, 1);
            g.fillRoundedRect(bx, y, w, h, 11);
            g.fillStyle(0xffffff, hot ? 0.13 : 0.06);
            g.fillRoundedRect(bx + 2, y + 2, w - 4, Math.ceil(h * 0.38), { tl: 10, tr: 10, bl: 0, br: 0 });
            g.lineStyle(2, hot ? 0xffd700 : 0x7a5500, 1);
            g.strokeRoundedRect(bx, y, w, h, 11);
        };
        draw(false);

        const lbl = this.add.text(cx, labelY, text, {
            fontFamily: "PressStart2P",
            fontSize,
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(5);

        if (subtitle) {
            this.add.text(cx, y + h / 2 + 16, subtitle, {
                fontFamily: "PressStart2P",
                fontSize: "13px",
                color: "#c8a060",
                stroke: "#000000",
                strokeThickness: 1,
            }).setOrigin(0.5).setDepth(5);
        }

        this.add.zone(cx, y + h / 2, w, h)
            .setInteractive({ useHandCursor: true })
            .setDepth(6)
            .on("pointerover", () => { draw(true); lbl.setColor("#ffd700"); })
            .on("pointerout", () => { draw(false); lbl.setColor("#ffffff"); })
            .on("pointerdown", () => onClick?.());
    }

    _setupBackgroundMusic() {
        try {
            this.musica = this.sound.get("sound_musica_jogo") ?? this.sound.add("sound_musica_jogo");
            this.musica.setVolume(SettingsManager.muted ? 0 : SettingsManager.volume);
            this._tryPlayBackgroundMusic();

            this.input.once("pointerdown", () => {
                this.sound.context?.resume?.().catch?.(() => {});
                this._tryPlayBackgroundMusic();
            });
        } catch (_error) {
            this.musica = null;
            console.warn('Audio key "sound_musica_jogo" could not be initialized on menu scene.');
        }
    }

    _tryPlayBackgroundMusic() {
        if (!this.musica || this.musica.isPlaying) {
            return;
        }

        const musicVolume = SettingsManager.muted ? 0 : SettingsManager.volume;
        this.musica.setVolume(musicVolume);

        try {
            this.musica.play({ loop: true, volume: musicVolume });
        } catch (_error) {
            // Browsers can block autoplay until the first user gesture.
        }
    }

    update(_time, _delta) {}
}

function _formatAutosavePreview(preview) {
    const clientText = preview.clientName ? ` - ${preview.clientName}` : "";
    return `Dia ${preview.day}${clientText}`;
}
