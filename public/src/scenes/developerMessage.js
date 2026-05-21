import { SCENES, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants.js";
import SettingsManager from "../components/managers/SettingsManager.js";

const DEVELOPER_MESSAGE_TEXT = [
    "Recado dos desenvolvedores:",
    "",
    "Obrigado por jogar o Mestre dos Sistemas! Esse jogo foi feito por alunos do Inteli em parceria com a Mastercard.",
    "Como agradecimento por ter jogado, acesse o link abaixo para resgatar pontos no Mastercard Surpreenda.",
    "\nCódigo: MESTRE-DOS-SISTEMAS",
].join("\n");

const CREATORS_TEXT = [
    "Felipe Ianelli   Frederico Weiskopf   Heloisa Kadota   Manuella Lima",
    "Matheus Almeida   Rocco Petrella   Samuel Martins   Vinicius Baumgratz",
].join("\n");

const DEVELOPER_MESSAGE_LINK = "https://surpreenda.naotempreco.com.br/";

export default class DeveloperMessageScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.DEVELOPER_MESSAGE });
    }

    create() {
        const sfxVolume = SettingsManager.muted ? 0 : SettingsManager.sfxVolume;

        this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1A1535);
        this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 1540, 860, 0x2A224D, 0.96)
            .setStrokeStyle(6, 0xF9C22B);

        this.add.text(SCREEN_WIDTH / 2, 140, "RECADO FINAL", {
            fontSize: "42px",
            color: "#ffffff",
            fontFamily: "PressStart2P",
            align: "center",
        }).setOrigin(0.5);

        this.add.text(SCREEN_WIDTH / 2, 420, DEVELOPER_MESSAGE_TEXT, {
            fontSize: "24px",
            color: "#ffffff",
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 1320 },
            lineSpacing: 14,
        }).setOrigin(0.5);

        const linkText = this.add.text(SCREEN_WIDTH / 2, 680, DEVELOPER_MESSAGE_LINK, {
            fontSize: "20px",
            color: "#F9C22B",
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 1180 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        linkText.on("pointerover", () => linkText.setColor("#ffffff"));
        linkText.on("pointerout", () => linkText.setColor("#F9C22B"));
        linkText.on("pointerdown", () => {
            window.open(DEVELOPER_MESSAGE_LINK, "_blank", "noopener,noreferrer");
        });

        this.add.rectangle(SCREEN_WIDTH / 2, 755, 1200, 2, 0xF9C22B, 0.35);

        this.add.text(SCREEN_WIDTH / 2, 780, "Criadores", {
            fontSize: "18px",
            color: "#F9C22B",
            fontFamily: "PressStart2P",
            align: "center",
        }).setOrigin(0.5);

        this.add.text(SCREEN_WIDTH / 2, 840, CREATORS_TEXT, {
            fontSize: "15px",
            color: "#cccccc",
            fontFamily: "PressStart2P",
            align: "center",
            lineSpacing: 14,
        }).setOrigin(0.5);

        const menuButton = this.add.rectangle(SCREEN_WIDTH / 2, 960, 320, 80, 0x2E7D32)
            .setStrokeStyle(4, 0xF9C22B)
            .setInteractive({ useHandCursor: true });

        const menuLabel = this.add.text(SCREEN_WIDTH / 2, 960, "Menu", {
            color: "#ffffff",
            fontSize: "22px",
            fontStyle: "bold",
            fontFamily: "PressStart2P",
        }).setOrigin(0.5);

        menuButton.on("pointerover", () => {
            menuButton.setFillStyle(0x388E3C);
            menuLabel.setColor("#F9C22B");
        });

        menuButton.on("pointerout", () => {
            menuButton.setFillStyle(0x2E7D32);
            menuLabel.setColor("#ffffff");
        });

        menuButton.on("pointerdown", () => {
            this.sound.play("button", { volume: sfxVolume });
            this.scene.stop(SCENES.POST_EXAM_DIALOGUE);
            this.scene.stop(SCENES.END);

            if (this.scene.isSleeping(SCENES.MENU)) {
                this.scene.wake(SCENES.MENU);
            } else if (this.scene.isPaused(SCENES.MENU)) {
                this.scene.resume(SCENES.MENU);
            } else if (!this.scene.isActive(SCENES.MENU)) {
                this.scene.start(SCENES.MENU);
            }

            this.scene.bringToTop(SCENES.MENU);
            this.scene.stop();
        });

        this.brightnessOverlay = this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0x000000
        ).setDepth(9999).setAlpha(1 - SettingsManager.brightness);
    }
}
