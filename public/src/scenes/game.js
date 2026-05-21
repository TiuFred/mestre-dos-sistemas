import { Button } from "../components/Button.js";
import {DEBUG_ENDING_ID, DEBUG_START_AT_END, SCREEN_HEIGHT, SCREEN_WIDTH, SCENES} from "../constants.js";
import InterfaceTutorial from "../components/InterfaceTutorial.js";
import Guide from '../components/Guide.js';
import Dossier from '../components/Dossier.js';
import DialogueManager from '../components/managers/DialogueManager.js';
import EventsManager from "../components/managers/EventsManager.js";
import SettingsManager from "../components/managers/SettingsManager.js";
import CharacterManager from "../components/managers/CharacterManager.js";
import DossierManager from "../components/managers/DossierManager.js";
import SceneManager from "../components/managers/SceneManager.js";
import DayManager from "../components/managers/DayManager.js";
import MinigameManager from "../components/managers/MinigameManager.js";
import PlayerMoneyManager from "../components/managers/PlayerMoneyManager.js";
import Calculator from "../components/Calculator.js";
import AchievementManager from "../components/managers/AchievementManager.js";
import SettingsOverlay from "../components/SettingsOverlay.js";
import EndingManager from "../components/managers/EndingManager.js";
import FeedbackManager from "../components/managers/FeedbackManager.js";
import SaveManager from "../components/managers/SaveManager.js";
import { deserializePersistedManagers, resetPersistedManagers } from "../components/managers/StateSerializerRegistry.js";

export default class GameScene extends Phaser.Scene {
    
    dialogueManager = null;
    backgroundMusic = null;
    _isPauseMenuOpen = false;

    constructor() {
        super({ key: SCENES.GAME });
    }

    init(params = {}) {
        this.gameSession = {
            loadAutosave: !!params.loadAutosave,
            loadSlotId: params.loadSlotId ?? null,
        };
    }

    create() {
        this.input.addPointer(1);
        this.dragBounds = {
            minX: 1000,
            maxX: 1800,
            minY: 100,
            maxY: 950
        };

        const buttonTextStyle = { color: "#ffffff", fontSize: "20px", fontStyle: "bold", fontFamily: "PressStart2P" };

        this.cameras.main.setAlpha(0);
        this.tweens.add({ targets: this.cameras.main, alpha: 1, duration: 500 });

        const menuScene = this.scene.get(SCENES.MENU);
        menuScene?.musica?.stop();
        this._setupBackgroundMusic();

        this.events.once("shutdown", () => this._stopBackgroundMusic());
        this.events.once("destroy",  () => this._stopBackgroundMusic());
        this.events.on("sleep",      () => this._stopBackgroundMusic());
        this.events.on("pause",      () => this._stopBackgroundMusic());
        this.events.on("resume",     () => this._resumeBackgroundMusic());
        this.events.on("wake",       () => this._resumeBackgroundMusic());

        new EventsManager(this);   
        new DialogueManager(this);
        new MinigameManager();
        new EndingManager();
        new PlayerMoneyManager();
        FeedbackManager.getInstance();
        SceneManager.init(this);
        CharacterManager.loadFromCache(this, "characters");
        DossierManager.loadFromCache(this, "dossiers");

        if (DEBUG_START_AT_END) {
            this._startDebugEndingPreview();
            return;
        }

        this.loadScenario();

        this.dossier = new Dossier(this, 1400, SCREEN_HEIGHT / 1.27, "item_mini_dossie", {}, 1.5);

        EventsManager.getInstance().on("dossier:update", "GameScene:dossier_update", ({ characterName, day, portrait }) => {
            this.dossier.setData({ ...DossierManager.getDossier(characterName, day), portrait });
        });

        const dayManager = new DayManager();
        const autosave = this.gameSession.loadSlotId
            ? SaveManager.loadSlot(this.gameSession.loadSlotId)
            : (this.gameSession.loadAutosave ? SaveManager.loadAutosave() : null);

        if (autosave?.state) {
            deserializePersistedManagers(autosave.state);

            if (autosave.currentScene === SCENES.EXAM) {
                SaveManager.saveAutosave({ currentScene: SCENES.EXAM });
                this.scene.start(SCENES.EXAM);
                return;
            }

            dayManager.startFromCheckpoint();
        } else {
            resetPersistedManagers();
            dayManager.startDay();
        }

        this.guide = new Guide(this, 1750, 850, "item_guide", 0.7);
        this.guide.enable();
        this.settingsOverlay = new SettingsOverlay(this);

        this.brightnessOverlay = this.add.rectangle(
            SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x000000
        ).setDepth(9999).setAlpha(1 - SettingsManager.brightness);
        
        this.btnVoltar = new Button(this, {
            x: 1800, y: 70, width: 200, height: 70, radius: 50,
            text: "Pausar",
            backgroundColor: 0x6d4c41,
            textStyle: { ...buttonTextStyle },
            onClick: () => {
                this.sound.play("button");
                this.settingsOverlay.toggle();
            }
        });

        this.calculator = new Calculator(this, 1109, 850, "calculadora", 0.25);
        this.achievementManager = new AchievementManager(this);

        const ACHIEVEMENT_DESK_ITEMS = {
            "primeiro_de_muitos": { key: "conquista_garrafa", x: 400, y: 950, scale: 4.5 },
            "apenas_o_comeco": { key: "conquista_dia1", x: 1100, y: 160, scale: 2 },
            "um_e_bom_dois_e_demais": { key: "conquista_dia2", x: 1350, y: 160, scale: 2 },
            "veloz_e_furioso": { key: "conquista_relogio", x: 250, y: 950, scale: 0.1 },
            "eu_quero_todos": { key: "conquista_tigrinho", x: 510, y: 950, scale: 0.8 },
            "mestre_dos_sistemas": { key: "conquista_estatua_melhor_empregado", x: 850, y: 870, scale: 4 },
        };

        const addDeskItem = (config) => {
            this.add.image(config.x, config.y, config.key)
                .setScale(config.scale)
                .setDepth(3);
        };

        const GUIDE_UPGRADE_KEY = "item_guide_conquista";
        const upgradeGuide = () => this.guide.upgradeTexture(GUIDE_UPGRADE_KEY);

        // Restaura itens de conquistas jÃƒÂ¡ desbloqueadas em sessÃƒÂµes anteriores
        for (const [id, config] of Object.entries(ACHIEVEMENT_DESK_ITEMS)) {
            if (this.achievementManager.isUnlocked(id)) {
                addDeskItem(config);
            }
        }

        if (this.achievementManager.isUnlocked("nada_escapa_de_mim")) {
            upgradeGuide();
        }

        // Escuta novas conquistas desbloqueadas durante a sessÃƒÂ£o atual
        EventsManager.getInstance().on("achievement:unlocked", "GameScene:achievement_desk", ({ id }) => {
            const config = ACHIEVEMENT_DESK_ITEMS[id];
            if (config) addDeskItem(config);

            if (id === "nada_escapa_de_mim") {
                upgradeGuide();
            }
        });
        // Tutorial do Dia 0: destaque dos itens da interface
        EventsManager.getInstance().on("tutorial:interface", "GameScene:tutorial_interface", (payload) => {
            const onComplete = payload?.onComplete;
            // Posição da caixa de diálogo (DialogueUI: container em 40,40 | largura aproximada de 944 e altura aproximada de 330)
            const DIALOGUE_W = Math.round(1700 / 1.8);
            const DIALOGUE_H = Math.round(250 * 1.2 * 1.1);
            const DIALOGUE_CX = 40 + DIALOGUE_W / 2;
            const DIALOGUE_CY = 40 + DIALOGUE_H / 2;

            // Referência ao container do DialogueUI para mostrar e esconder no passo
            const dialogueContainer = DialogueManager.getInstance().dialogueUI?.container;

            const TUTORIAL_STEPS = [
                {
                    // Área do diálogo, sem sprite, usa glow retangular
                    shape: "rect",
                    x: DIALOGUE_CX,
                    y: DIALOGUE_CY,
                    width: DIALOGUE_W,
                    height: DIALOGUE_H,
                    title: "Diálogo",
                    description: "Aqui aparecem as falas\ndos clientes.\nLeia com atenção e\nresponda corretamente.",
                    usage: "Clique para avançar o texto",
                    onEnter: () => {
                        if (dialogueContainer) {
                            dialogueContainer.setVisible(true).setAlpha(1);
                            dialogueContainer.setDepth(8501);
                        }
                    },
                    onExit: () => {
                        if (dialogueContainer) {
                            dialogueContainer.setAlpha(0).setVisible(false);
                            dialogueContainer.setDepth(50);
                        }
                    }
                },
                {
                    // Sprite do dossiê pulsa; painel monitora abertura e fecha ao sair
                    x: 1400,
                    y: Math.round(SCREEN_HEIGHT / 1.27),
                    title: "Dossiê",
                    description: "Aqui está o dossiê do cliente.\nClique para ver nome, idade,\nprofissão e renda.",
                    usage: "Clique para abrir",
                    target: this.dossier.sprite,
                    watchPanel: () => this.dossier.dossieContainer.visible
                        ? this.dossier.dossieContainer
                        : null,
                    closePanel: () => {
                        if (this.dossier.dossieContainer.visible) {
                            this.dossier._closeDossie();
                        }
                    }
                },
                {
                    // Sprite da calculadora pulsa; painel monitora abertura e fecha ao sair
                    x: 1109,
                    y: 850,
                    title: "Calculadora",
                    description: "Use a calculadora para\nfazer seus cálculos\ndurante o atendimento.",
                    usage: "Clique para abrir",
                    target: this.calculator.sprite,
                    watchPanel: () => this.calculator.container.visible
                        ? this.calculator.container
                        : null,
                    closePanel: () => {
                        if (this.calculator.container.visible) {
                            this.calculator.close();
                        }
                    }
                },
                {
                    // Sprite do guia pulsa; DialogBox monitora abertura e fecha ao sair
                    x: 1750,
                    y: 850,
                    title: "Guia",
                    description: "O guia contém dicas\ne regras importantes.\nConsulte sempre que\nprecisar de ajuda.",
                    usage: "Clique ou arraste",
                    target: this.guide.sprite,
                    watchPanel: () => {
                        const gb = this.guide.guideBox;
                        if (!gb) return null;
                        // Retorna container, botões e indicador do guia
                        return [
                            gb.container,
                            gb.btnPrev,
                            gb.btnNext,
                            gb.btnClose,
                            gb.pageIndicator,
                        ].filter(Boolean);
                    },
                    closePanel: () => {
                        if (this.guide.guideBox) {
                            this.guide._closeGuide();
                        }
                    }
                },
                {
                    // Container do botão de pausar pulsa
                    x: 1800,
                    y: 70,
                    title: "Pausar",
                    description: "Clique aqui a qualquer\nmomento para pausar\no jogo, salvar e voltar ao menu.",
                    usage: "Clique para voltar",
                    target: this.btnVoltar.container
                }
            ];

            const tutorial = new InterfaceTutorial(this, TUTORIAL_STEPS, onComplete);
            tutorial.show();
        });
        // Fim do tutorial da interface
    }
    
    loadScenario() {
        this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "background_scenario_back_painting").setOrigin(0.5).setScale(1.79);
        this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "background_scenario_atm").setOrigin(0.5).setScale(1.79);
        this.add.image(SCREEN_WIDTH / 2 + 453, SCREEN_HEIGHT / 2, "background_scenario_drawer").setScale(7.55, 6.4).setDepth(2);
        this.add.rectangle(100, 500, 250, SCREEN_HEIGHT, 0x8D1F1F).setDepth(2);
        this.add.image(960, SCREEN_HEIGHT / 2, "background_scenario_window_frame").setScale(1.79).setDepth(2);
        this.add.image(960/2 + 50, SCREEN_HEIGHT * 0.87, "background_scenario_drawer2").setScale(6.40).setDepth(2);
        this.add.image(950, 630, "item_plant").setScale(2).setDepth(2);
    }

    setPauseMenuOpen(value) {
        this._isPauseMenuOpen = value;
    }

    _setupBackgroundMusic() {
    try {
        const volume = SettingsManager.muted ? 0 : SettingsManager.volume;

        this.backgroundMusic = this.sound.add("sound_musica_jogo", {
            loop: true,
            volume
        });

        this.input.once("pointerdown", () => {
            if (this.sound.context.state === "suspended") {
                this.sound.context.resume();
            }

            if (!this.backgroundMusic.isPlaying) {
                this.backgroundMusic.play();
            }
        });

    } catch (_error) {
        this.backgroundMusic = null;
        console.warn('Audio key "sound_musica_jogo" could not be initialized.');
    }
}

    _stopBackgroundMusic() {
        if (this.backgroundMusic?.isPlaying) {
            this.backgroundMusic.stop();
        }
    }

    _resumeBackgroundMusic() {
        if (this.backgroundMusic && !this.backgroundMusic.isPlaying) {
            const volume = SettingsManager.muted ? 0 : SettingsManager.volume;
            try {
                this.backgroundMusic.play({ loop: true, volume });
            } catch (_error) {
                // Ignore resume failures when the browser blocks or loses the audio resource.
            }
        }
    }

    _startDebugEndingPreview() {
        const endingManager = EndingManager.getInstance();

        endingManager.resetRun();

        const previewStateByEnding = {
            muito_bom: {
                questionCount: 14,
                correctAnswers: 14,
                wrongAnswers: 0,
                questionsByCharacter: {
                    Cledson: 8,
                    Fernanda: 3,
                    Vanessa: 3,
                },
                correctAnswersByCharacter: {
                    Cledson: 8,
                    Fernanda: 3,
                    Vanessa: 3,
                },
                wrongAnswersByCharacter: {},
                harmedClients: [],
                helpedClients: ["Cledson", "Fernanda", "Vanessa"],
                clientsWithQuestions: ["Cledson", "Fernanda", "Vanessa"],
                seenQuestionIds: [],
                answeredQuestionIds: [],
                examScore: 5,
                examPassed: true,
                examQuestionCount: 5,
                finalMoney: 320,
            },
            bom: {
                questionCount: 14,
                correctAnswers: 10,
                wrongAnswers: 4,
                questionsByCharacter: {
                    Cledson: 8,
                    Fernanda: 3,
                    Vanessa: 3,
                },
                correctAnswersByCharacter: {
                    Cledson: 5,
                    Fernanda: 3,
                    Vanessa: 2,
                },
                wrongAnswersByCharacter: {
                    Cledson: 3,
                    Vanessa: 1,
                },
                harmedClients: ["Cledson", "Vanessa"],
                helpedClients: ["Cledson", "Fernanda", "Vanessa"],
                clientsWithQuestions: ["Cledson", "Fernanda", "Vanessa"],
                seenQuestionIds: [],
                answeredQuestionIds: [],
                examScore: 4,
                examPassed: true,
                examQuestionCount: 5,
                finalMoney: 180,
            },
            ruim: {
                questionCount: 14,
                correctAnswers: 4,
                wrongAnswers: 10,
                questionsByCharacter: {
                    Cledson: 5,
                    Fernanda: 4,
                    Vanessa: 5,
                },
                correctAnswersByCharacter: {
                    Vanessa: 1,
                    Fernanda: 2,
                    Cledson: 1,
                },
                wrongAnswersByCharacter: {
                    Cledson: 4,
                    Fernanda: 2,
                    Vanessa: 4,
                },
                harmedClients: ["Cledson", "Fernanda", "Vanessa"],
                helpedClients: ["Fernanda"],
                clientsWithQuestions: ["Cledson", "Fernanda", "Vanessa"],
                seenQuestionIds: [],
                answeredQuestionIds: [],
                examScore: 1,
                examPassed: false,
                examQuestionCount: 5,
                finalMoney: 0,
            },
            cledson: {
                questionCount: 8,
                correctAnswers: 2,
                wrongAnswers: 6,
                questionsByCharacter: {
                    Cledson: 6,
                    Fernanda: 2,
                },
                correctAnswersByCharacter: {
                    Fernanda: 2,
                },
                wrongAnswersByCharacter: {
                    Cledson: 6,
                },
                harmedClients: ["Cledson"],
                helpedClients: ["Fernanda"],
                clientsWithQuestions: ["Cledson", "Fernanda"],
                seenQuestionIds: [],
                answeredQuestionIds: [],
                examScore: 2,
                examPassed: false,
                examQuestionCount: 5,
                finalMoney: 30,
            },
        };

        endingManager.deserialize(
            previewStateByEnding[DEBUG_ENDING_ID] ?? previewStateByEnding.bom
        );

        this.time.delayedCall(50, () => {
            this.scene.start(SCENES.END, {
                ending: DEBUG_ENDING_ID,
            });
        });
    }

    update(_time, _delta) {
        if (this._isPauseMenuOpen) { return; }
        DialogueManager.getInstance().update();
    }
}
