import { SCENES, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants.js";
import { Button } from "../components/Button.js";
import SettingsManager from "../components/managers/SettingsManager.js";
import EndingManager from "../components/managers/EndingManager.js";
import EventsManager from "../components/managers/EventsManager.js";

const ENDING_THEME = {
    ruim: {
        sky: 0x05070d,
        tint: 0x2b161d,
        haze: 0x040507,
        accent: 0xd62839,
        accentSoft: 0x7a1e2c,
        panel: 0x12080d,
        text: "#f6ece7",
        button: 0x8b0000,
    },
    cledson: {
        sky: 0x130609,
        tint: 0x5a171c,
        haze: 0x1c090c,
        accent: 0xff8459,
        accentSoft: 0xffcf70,
        panel: 0x220a0f,
        text: "#fff3ea",
        button: 0x9b2226,
    },
    muito_bom: {
        sky: 0x071816,
        tint: 0x0d4a42,
        haze: 0x081311,
        accent: 0x72ef8d,
        accentSoft: 0xf9c74f,
        panel: 0x0c2422,
        text: "#effff9",
        button: 0x2e7d32,
    },
    bom: {
        sky: 0x35263a,
        tint: 0x8a5a35,
        haze: 0x16111a,
        accent: 0xffd166,
        accentSoft: 0xffefb0,
        panel: 0x3b2a3a,
        text: "#fffaf0",
        button: 0xb71c1c,
    },
    fallback: {
        sky: 0x10152d,
        tint: 0x384b8f,
        haze: 0x0d1020,
        accent: 0xf9c74f,
        accentSoft: 0x90be6d,
        panel: 0x151c3c,
        text: "#fffbea",
        button: 0xb71c1c,
    },
};

const PLAYER_ENDING_COPY = {
    muito_bom: {
        kicker: "No silêncio do banco já vazio, fica claro o que você construiu.",
        narrative:
            "Ao longo dos atendimentos, você não apenas respondeu certo: você soube ouvir, pesar riscos e agir com responsabilidade. Quando as luzes do expediente se apagam, o que permanece é a marca de alguém que aprendeu a orientar sem empurrar ninguém para o erro. Seu nome sai daquele balcão maior do que entrou.",
        closing: "Essa não foi só uma boa semana. Foi a prova de que você dominou o sistema.",
    },
    bom: {
        kicker: "O expediente termina, e a sensação não é de perfeição, mas de progresso real.",
        narrative:
            "Entre acertos, hesitações e decisões difíceis, você conseguiu conduzir boa parte dos clientes para caminhos mais seguros. Nem tudo saiu como poderia, mas ficou evidente que havia responsabilidade nas suas escolhas. Quando o banco esvazia, sobra a impressão de que você está no caminho certo e ainda pode ir além.",
        closing: "Você encerra o turno como alguém que aprendeu bastante e ainda tem espaço para crescer.",
    },
    ruim: {
        kicker: "As cadeiras vazias e o balcão silencioso deixam um peso difícil de ignorar.",
        narrative:
            "Ao final do expediente, as respostas dadas ao longo dos dias voltam como eco. Alguns conselhos empurraram clientes para escolhas piores, e o saldo não é apenas numérico. O banco fecha, mas a sensação que fica é a de que ainda falta atenção, leitura e cuidado para ocupar esse lugar com segurança.",
        closing: "O turno acaba, mas a impressão é de que o aprendizado ainda precisa acontecer de verdade.",
    },
};

export default class End extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.END });
    }

    init(data) {
        this.result = data.result;
        this.endingId = data.ending ?? null;
    }

    create() {
        EventsManager.getInstance().emit("achievement_all_achievements");

        const endingManager = EndingManager.getInstance();
        const endingState = endingManager.state;

        const legacyResultConfig = {
            ganhou: {
                id: "bom",
                title: "Final Bom",
                message: "Parabens por acertar!",
                expression: "client_cledson_sorrindo",
                resultSound: "acerto",
            },
            perdeu: {
                id: "cledson",
                title: "Final Cledson",
                message: "Voce endividou o Cledson!",
                expression: "client_cledson_triste",
                resultSound: "error",
            },
        };

        const resolvedEnding = (this.endingId
            ? endingManager.getEndingById(this.endingId)
            : legacyResultConfig[this.result]) ?? legacyResultConfig.ganhou;

        const {
            id = "fallback",
            title = "Fim",
            message = "",
            expression = "client_cledson_sorrindo",
            resultSound = "acerto",
        } = resolvedEnding;

        this.theme = ENDING_THEME[id] ?? ENDING_THEME.fallback;

        const dialogueCorrectAnswers = endingState?.correctAnswers ?? 0;
        const dialogueWrongAnswers = endingState?.wrongAnswers ?? 0;
        const examQuestions = endingState?.examQuestionCount ?? 0;
        const examCorrectAnswers = endingState?.examScore ?? 0;
        const examWrongAnswers = Math.max(examQuestions - examCorrectAnswers, 0);
        const totalCorrectAnswers = dialogueCorrectAnswers + examCorrectAnswers;
        const totalWrongAnswers = dialogueWrongAnswers + examWrongAnswers;
        const totalQuestions = totalCorrectAnswers + totalWrongAnswers;
        const accuracy = totalQuestions > 0 ? Math.round((totalCorrectAnswers / totalQuestions) * 100) : 0;

        const endingText = this._resolveEndingText({ id, title, message });
        const sfxVolume = SettingsManager.muted ? 0 : SettingsManager.sfxVolume;

        this._endingFlowFinished = false;
        this._statsBar = null;
        this._nextButton = null;

        this._buildBackground(id);

        if (id === "cledson") {
            this._buildCledsonEnding({
                title,
                expression,
                endingText,
                totalQuestions,
                totalCorrectAnswers,
                totalWrongAnswers,
                examCorrectAnswers,
                examQuestions,
                accuracy,
            });
        } else {
            this._buildPlayerEnding({
                title,
                endingText,
                totalQuestions,
                totalCorrectAnswers,
                totalWrongAnswers,
                examCorrectAnswers,
                examQuestions,
                accuracy,
            });
        }

        this._createNextButton(sfxVolume);
        this._playResultSound(resultSound, sfxVolume);

        this.brightnessOverlay = this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0x000000
        ).setDepth(9999).setAlpha(1 - SettingsManager.brightness);
    }

    _resolveEndingText({ id, title, message }) {
        if (id === "cledson") {
            return {
                kicker: "O banco ja fechou. Mas Cledson voltou.",
                narrative:
                    "Depois de seguir cada conselho ruim que voce deu, Cledson afundou de vez. Nome sujo, dividas explodindo e nenhuma saida. Quando ele atravessa o banco vazio, ja nao volta como cliente. Volta com odio, atravessa o salao na sua direcao e parte para cima de voce antes que haja tempo de reagir.",
                closing: "Voce nao arruinou so a vida financeira dele. Trouxe a vinganca dele ate a sua mesa.",
                title,
                rawMessage: message,
            };
        }

        const copy = PLAYER_ENDING_COPY[id] ?? PLAYER_ENDING_COPY.bom;
        return {
            ...copy,
            title,
            rawMessage: message,
        };
    }

    _buildBackground(endingId) {
        const isGoodEnding = endingId === "bom";
        const isBadEnding = endingId === "ruim";

        this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, this.theme.sky);

        this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "background_scenario_back_painting")
            .setOrigin(0.5)
            .setScale(1.79)
            .setTint(this.theme.tint)
            .setAlpha(0.88);

        this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "background_scenario_atm")
            .setOrigin(0.5)
            .setScale(1.79)
            .setTint(0xd6d6d6)
            .setAlpha(0.94);

        this.add.image(SCREEN_WIDTH / 2 + 453, SCREEN_HEIGHT / 2, "background_scenario_drawer")
            .setScale(7.55, 6.4)
            .setDepth(2)
            .setAlpha(0.9);
        this.add.image(960, SCREEN_HEIGHT / 2, "background_scenario_window_frame").setScale(1.79).setDepth(2);
        this.add.image(960 / 2 + 50, SCREEN_HEIGHT * 0.87, "background_scenario_drawer2").setScale(6.4).setDepth(2);
        this.add.image(950, 630, "item_plant").setScale(2).setDepth(2).setAlpha(0.88);
        this.add.rectangle(100, 500, 250, SCREEN_HEIGHT, 0x8d1f1f).setDepth(2).setAlpha(0.74);

        this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            this.theme.haze,
            isBadEnding ? 0.62 : isGoodEnding ? 0.2 : 0.42
        ).setDepth(5);
        this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            this.theme.tint,
            endingId === "muito_bom" ? 0.18 : isBadEnding ? 0.34 : isGoodEnding ? 0.18 : 0.24
        ).setDepth(6);

        const leftGlow = this.add.circle(
            isGoodEnding ? 320 : 260,
            isGoodEnding ? 280 : 360,
            isBadEnding ? 340 : isGoodEnding ? 360 : 260,
            this.theme.accent,
            isBadEnding ? 0.2 : isGoodEnding ? 0.16 : 0.09
        ).setDepth(7);
        const rightGlow = this.add.circle(
            isGoodEnding ? 1500 : 1660,
            isGoodEnding ? 240 : 220,
            isBadEnding ? 300 : isGoodEnding ? 430 : 340,
            this.theme.accentSoft,
            isBadEnding ? 0.08 : isGoodEnding ? 0.14 : 0.08
        ).setDepth(7);
        const floorGlow = this.add.ellipse(
            980,
            isGoodEnding ? 860 : 910,
            isGoodEnding ? 1420 : 1300,
            isGoodEnding ? 340 : 240,
            this.theme.accent,
            isBadEnding ? 0.03 : isGoodEnding ? 0.09 : 0.08
        ).setDepth(8);

        if (endingId !== "cledson" && !isBadEnding) {
            const spotlight = this.add.ellipse(
                970,
                isGoodEnding ? 360 : 420,
                isGoodEnding ? 1180 : 820,
                isGoodEnding ? 860 : 660,
                0xffffff,
                isGoodEnding ? 0.1 : 0.05
            ).setDepth(8);
            this.tweens.add({
                targets: spotlight,
                alpha: isGoodEnding ? { from: 0.08, to: 0.14 } : { from: 0.03, to: 0.08 },
                duration: 1800,
                yoyo: true,
                repeat: -1,
                ease: "Sine.InOut",
            });
        }

        if (isGoodEnding) {
            const softBloom = this.add.circle(980, 300, 260, 0xfff0b0, 0.09).setDepth(8);
            const warmEdge = this.add.ellipse(980, 1010, 1380, 220, 0xffb347, 0.06).setDepth(8);
            const sideWarmth = this.add.circle(1730, 180, 220, 0xffd27a, 0.05).setDepth(8);

            this.tweens.add({
                targets: [softBloom, warmEdge, sideWarmth],
                alpha: { from: 0.04, to: 0.1 },
                duration: 2400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.InOut",
            });
        }

        if (isBadEnding) {
            const leftWarningGlow = this.add.circle(40, 560, 520, 0xb80f24, 0.2).setDepth(8);
            const rightWarningGlow = this.add.circle(1860, 180, 360, 0x3a0710, 0.24).setDepth(8);
            const centerShadow = this.add.ellipse(980, 430, 980, 660, 0x000000, 0.28).setDepth(8);
            const topShadow = this.add.rectangle(960, 120, SCREEN_WIDTH, 260, 0x000000, 0.16).setDepth(8);
            const coldWash = this.add.rectangle(960, 540, SCREEN_WIDTH, SCREEN_HEIGHT, 0x0a1018, 0.16).setDepth(8);

            this.tweens.add({
                targets: [leftWarningGlow, rightWarningGlow, centerShadow, topShadow, coldWash],
                alpha: { from: 0.12, to: 0.28 },
                duration: 2600,
                yoyo: true,
                repeat: -1,
                ease: "Sine.InOut",
            });
        }

        this.tweens.add({
            targets: [leftGlow, rightGlow, floorGlow],
            alpha: isBadEnding ? { from: 0.1, to: 0.26 } : isGoodEnding ? { from: 0.1, to: 0.18 } : { from: 0.05, to: 0.16 },
            duration: 2200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        const topBar = this.add.rectangle(SCREEN_WIDTH / 2, -70, SCREEN_WIDTH, 140, 0x000000).setDepth(100);
        const bottomBar = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT + 70, SCREEN_WIDTH, 140, 0x000000).setDepth(100);

        this.tweens.add({ targets: topBar, y: 38, duration: 700, ease: "Cubic.Out" });
        this.tweens.add({ targets: bottomBar, y: SCREEN_HEIGHT - 38, duration: 700, ease: "Cubic.Out" });
    }

    _buildPlayerEnding(stats) {
        const deskGlow = this.add.ellipse(960, 835, 980, 220, this.theme.accent, 0.1).setDepth(20);
        const titleLine = this.add.rectangle(960, 186, 880, 3, this.theme.accentSoft, 0.8).setDepth(25).setAlpha(0);
        const titleText = this.add.text(960, 150, stats.title.toUpperCase(), {
            fontSize: "36px",
            color: this.theme.text,
            fontFamily: "PressStart2P",
            stroke: "#000000",
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(26).setAlpha(0);

        const kickerText = this.add.text(960, 250, stats.endingText.kicker, {
            fontSize: "18px",
            color: "#f7d98d",
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 1120 },
            lineSpacing: 10,
        }).setOrigin(0.5).setDepth(26).setAlpha(0);

        const narrativePanel = this.add.rectangle(960, 500, 1260, 420, this.theme.panel, 0.78)
            .setStrokeStyle(2, this.theme.accent, 0.5)
            .setDepth(24)
            .setAlpha(0);
        const narrativeText = this.add.text(960, 460, stats.endingText.narrative, {
            fontSize: "22px",
            color: this.theme.text,
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 1080 },
            lineSpacing: 14,
        }).setOrigin(0.5).setDepth(26).setAlpha(0);
        narrativeText.setText("");

        const closingText = this.add.text(960, 650, stats.endingText.closing, {
            fontSize: "17px",
            color: "#f2e4be",
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 860 },
            lineSpacing: 10,
        }).setOrigin(0.5).setDepth(26).setAlpha(0);
        closingText.setText("");

        this._statsBar = this._createStatsBar({
            x: 960,
            y: 930,
            totalQuestions: stats.totalQuestions,
            totalCorrectAnswers: stats.totalCorrectAnswers,
            totalWrongAnswers: stats.totalWrongAnswers,
            examCorrectAnswers: stats.examCorrectAnswers,
            examQuestions: stats.examQuestions,
            accuracy: stats.accuracy,
        });

        this.tweens.add({
            targets: deskGlow,
            alpha: { from: 0.06, to: 0.16 },
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        this.tweens.add({ targets: [titleLine, titleText], alpha: 1, duration: 450, delay: 280 });

        this.time.delayedCall(1250, () => {
            kickerText.setAlpha(1);
            this._typeText(kickerText, stats.endingText.kicker, 44, () => {
                this.time.delayedCall(650, () => {
                    this.tweens.add({ targets: [narrativePanel, narrativeText], alpha: 1, duration: 420 });
                    this._typeText(narrativeText, stats.endingText.narrative, 44, () => {
                        this.time.delayedCall(850, () => {
                            closingText.setAlpha(1);
                            this._typeText(closingText, stats.endingText.closing, 40, () => {
                                this._finishEndingFlow();
                            });
                        });
                    });
                });
            });
        });
    }

    _buildCledsonEnding(stats) {
        const characterGlow = this.add.circle(520, 560, 420, this.theme.accent, 0.14).setDepth(24);
        const characterShadow = this.add.ellipse(560, 960, 680, 126, 0x000000, 0.34).setDepth(24);
        const character = this.add.image(-40, 820, stats.expression).setScale(1.72).setDepth(25).setAlpha(0);
        const impactFlash = this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0xffffff,
            1
        ).setDepth(115).setAlpha(0);
        const blackout = this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0x000000,
            1
        ).setDepth(116).setAlpha(0);
        const dangerVignette = this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x4a0000, 0.06)
            .setDepth(23);
        const warningText = this.add.text(960, 210, "PASSOS PESADOS ECOAM NO SALAO.", {
            fontSize: "17px",
            color: "#ffcf70",
            fontFamily: "PressStart2P",
            stroke: "#000000",
            strokeThickness: 4,
            align: "center",
        }).setOrigin(0.5).setDepth(96).setAlpha(0);
        const finalBlackText = this.add.text(960, 430, "CLEDSON TE ALCANCA ANTES QUE VOCE CONSIGA ESCAPAR.", {
            fontSize: "24px",
            color: "#fff3d1",
            fontFamily: "PressStart2P",
            stroke: "#000000",
            strokeThickness: 5,
            align: "center",
            wordWrap: { width: 1200 },
            lineSpacing: 14,
        }).setOrigin(0.5).setDepth(117).setAlpha(0);

        const titlePanel = this.add.rectangle(1260, 192, 860, 110, this.theme.panel, 0.86)
            .setStrokeStyle(3, this.theme.accentSoft, 0.75)
            .setDepth(24)
            .setAlpha(0);
        const titleText = this.add.text(1260, 176, stats.title.toUpperCase(), {
            fontSize: "34px",
            color: this.theme.text,
            fontFamily: "PressStart2P",
            align: "center",
            stroke: "#000000",
            strokeThickness: 5,
            wordWrap: { width: 740 },
        }).setOrigin(0.5).setDepth(25).setAlpha(0);

        const kickerText = this.add.text(1260, 270, stats.endingText.kicker, {
            fontSize: "16px",
            color: "#f7d98d",
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 760 },
            lineSpacing: 10,
        }).setOrigin(0.5).setDepth(25).setAlpha(0);

        const narrativePanel = this.add.rectangle(1260, 500, 980, 400, this.theme.panel, 0.78)
            .setStrokeStyle(2, this.theme.accent, 0.5)
            .setDepth(24)
            .setAlpha(0);
        const narrativeText = this.add.text(1260, 460, stats.endingText.narrative, {
            fontSize: "21px",
            color: this.theme.text,
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 860 },
            lineSpacing: 14,
        }).setOrigin(0.5).setDepth(25).setAlpha(0);
        narrativeText.setText("");

        const closingText = this.add.text(1260, 648, stats.endingText.closing, {
            fontSize: "16px",
            color: "#f2e4be",
            fontFamily: "PressStart2P",
            align: "center",
            wordWrap: { width: 720 },
        }).setOrigin(0.5).setDepth(25).setAlpha(0);
        closingText.setText("");

        this._statsBar = this._createStatsBar({
            x: 960,
            y: 760,
            totalQuestions: stats.totalQuestions,
            totalCorrectAnswers: stats.totalCorrectAnswers,
            totalWrongAnswers: stats.totalWrongAnswers,
            examCorrectAnswers: stats.examCorrectAnswers,
            examQuestions: stats.examQuestions,
            accuracy: stats.accuracy,
        });

        this.tweens.add({
            targets: characterGlow,
            alpha: { from: 0.1, to: 0.18 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        this.tweens.add({
            targets: dangerVignette,
            alpha: { from: 0.05, to: 0.16 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.InOut",
        });

        this.tweens.add({ targets: [titlePanel, titleText], alpha: 1, duration: 450, delay: 420 });

        this.time.delayedCall(1450, () => {
            kickerText.setAlpha(1);
            this._typeText(kickerText, stats.endingText.kicker, 44, () => {
                this.time.delayedCall(650, () => {
                    this.tweens.add({ targets: [narrativePanel, narrativeText], alpha: 1, duration: 420 });
                    this._typeText(narrativeText, stats.endingText.narrative, 44, () => {
                        this.time.delayedCall(850, () => {
                            closingText.setAlpha(1);
                            this._typeText(closingText, stats.endingText.closing, 40, () => {
                                this.time.delayedCall(1200, () => {
                                    this.tweens.add({
                                        targets: [titlePanel, titleText, kickerText, narrativePanel, narrativeText, closingText],
                                        alpha: 0,
                                        duration: 380,
                                        ease: "Quad.Out",
                                    });
                                });

                                this.time.delayedCall(1700, () => {
                                    warningText.setAlpha(1);
                                    this._typeText(warningText, "PASSOS PESADOS ECOAM NO SALAO.", 44, () => {
                                        this.time.delayedCall(650, () => {
                                            this.tweens.add({
                                                targets: character,
                                                alpha: 1,
                                                x: 640,
                                                y: 650,
                                                scale: 2.02,
                                                duration: 1500,
                                                ease: "Sine.Out",
                                            });

                                            this.time.delayedCall(1550, () => {
                                                this.tweens.add({
                                                    targets: character,
                                                    x: 1450,
                                                    y: 930,
                                                    scale: 5.6,
                                                    angle: -12,
                                                    duration: 180,
                                                    ease: "Cubic.In",
                                                });

                                                this.tweens.add({
                                                    targets: characterGlow,
                                                    scale: 2.7,
                                                    alpha: 0.48,
                                                    duration: 170,
                                                    ease: "Cubic.In",
                                                });

                                                this.tweens.add({
                                                    targets: characterShadow,
                                                    scaleX: 2.9,
                                                    scaleY: 1.8,
                                                    alpha: 0.86,
                                                    duration: 170,
                                                    ease: "Cubic.In",
                                                });

                                                this.tweens.add({
                                                    targets: impactFlash,
                                                    alpha: 0.76,
                                                    duration: 60,
                                                    yoyo: true,
                                                    repeat: 1,
                                                    ease: "Quad.Out",
                                                });

                                                this.tweens.add({
                                                    targets: blackout,
                                                    alpha: 1,
                                                    duration: 200,
                                                    ease: "Quad.Out",
                                                });

                                                this.cameras.main.shake(520, 0.022);
                                                this.cameras.main.zoomTo(1.16, 150);

                                                this.time.delayedCall(220, () => {
            warningText.setAlpha(0);
            character.setAlpha(0);
            characterGlow.setAlpha(0);
            characterShadow.setAlpha(0);
            dangerVignette.setAlpha(0);
            blackout.setAlpha(1);
        });

                                                this.time.delayedCall(900, () => {
                                                    finalBlackText.setAlpha(1);
                                                    this._typeText(finalBlackText, "CLEDSON TE ALCANCA ANTES QUE VOCE CONSIGA ESCAPAR.", 42, () => {
                                                        this.time.delayedCall(700, () => {
                                                            this._finishEndingFlow();
                                                        });
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    _createStatsBar({ x, y, totalQuestions, totalCorrectAnswers, totalWrongAnswers, examCorrectAnswers, examQuestions, accuracy }) {
        const container = this.add.container(x, y).setDepth(117).setAlpha(0);
        const panel = this.add.rectangle(0, 0, 1020, 122, 0x090d1a, 0.72)
            .setStrokeStyle(2, this.theme.accentSoft, 0.7);

        const lines = [
            `Perguntas ${totalQuestions}`,
            `Acertos ${totalCorrectAnswers}`,
            `Erros ${totalWrongAnswers}`,
            `Precisao ${accuracy}%`,
            `Prova final ${examCorrectAnswers}/${examQuestions}`,
        ];

        const positions = [-390, -190, 0, 190, 390];
        const colors = ["#ffffff", "#72ef8d", "#ff8b8b", "#f9c74f", "#e5e5e5"];

        const texts = lines.map((line, index) => this.add.text(positions[index], 0, line, {
            fontSize: "14px",
            color: colors[index],
            fontFamily: "PressStart2P",
            align: "center",
        }).setOrigin(0.5));

        container.add([panel, ...texts]);

        return container;
    }

    _createNextButton(sfxVolume) {
        const nextButton = new Button(this, {
            x: 1760,
            y: 940,
            width: 250,
            height: 78,
            radius: 22,
            text: "Próximo",
            backgroundColor: this.theme.button,
            textStyle: {
                color: "#ffffff",
                fontSize: "21px",
                fontStyle: "bold",
                fontFamily: "PressStart2P",
            },
            onClick: () => {
                this.sound.play("button", { volume: sfxVolume });
                this.scene.transition({
                    target: SCENES.DEVELOPER_MESSAGE,
                    duration: 500,
                    moveBellow: true,
                    onUpdate: (progress) => this.cameras.main.setAlpha(1 - progress),
                });
            },
        });

        nextButton.container.setDepth(118);
        nextButton.container.setAlpha(0);
        this._nextButton = nextButton;
    }

    _finishEndingFlow() {
        if (this._endingFlowFinished) {
            return;
        }

        this._endingFlowFinished = true;

        if (this._statsBar) {
            this.tweens.add({
                targets: this._statsBar,
                alpha: 1,
                y: this._statsBar.y - 12,
                duration: 520,
                delay: 450,
                ease: "Quad.Out",
            });
        }

        if (this._nextButton?.container) {
            this.tweens.add({
                targets: this._nextButton.container,
                alpha: 1,
                y: 920,
                duration: 500,
                ease: "Quad.Out",
                delay: 900,
            });
        }
    }

    _playResultSound(resultSound, sfxVolume) {
        this.time.delayedCall(160, () => {
            if (this.sound.locked) {
                this.input.once("pointerdown", () => {
                    this.sound.play(resultSound, { volume: sfxVolume });
                });
            } else {
                this.sound.play(resultSound, { volume: sfxVolume });
            }
        });
    }

    _typeText(textObject, fullText, charDelay = 36, onComplete = null) {
        textObject.setText("");

        let index = 0;

        if (!fullText || fullText.length === 0) {
            onComplete?.();
            return;
        }

        const event = this.time.addEvent({
            delay: charDelay,
            repeat: Math.max(fullText.length - 1, 0),
            callback: () => {
                index += 1;
                textObject.setText(fullText.slice(0, index));
                if (index >= fullText.length) {
                    onComplete?.();
                    event.remove(false);
                }
            },
        });
    }
}
