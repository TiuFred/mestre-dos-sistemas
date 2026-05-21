import CharacterManager from "./CharacterManager.js";
import CharacterAnimator from "../CharacterAnimator.js";
import DialogueManager from "./DialogueManager.js";
import EventsManager from "./EventsManager.js";
import SceneManager from "./SceneManager.js";
import FeedbackManager from "./FeedbackManager.js";
import SaveManager from "./SaveManager.js";
import DayTransitionUI, { DAY_END_MESSAGE_DURATION } from "../DayTransitionUI.js";
import { SCENES, IGNORED_MINIGAME_KEYS } from "../../constants.js";

const FINAL_DAY = 3;
const TIME_BETWEEN_CHARACTERS = 1500;

export default class DayManager {
    static instance = null;
    actualDay = -1;
    actualCharacter = -1;
    charactersOfDay = [];
    currentCharacterImage = null;
    _transitioning = false;
    _pendingDayEndMinigame = false;
    _postMinigameDialogueActive = false;

    constructor() {
        if (DayManager.instance) {
            return DayManager.instance;
        }

        EventsManager.getInstance().on("dialogue_end", "DayManager:dialogue_end", () => {
            this._onDialogueEnded();
        });

        EventsManager.getInstance().on("minigame:end", "DayManager:minigame_end", (payload) => {
            this._onMinigameEnded(payload);
        });

        EventsManager.getInstance().on("dialogue:wrong_answer", "DayManager:wrong_answer", (payload) => {
            FeedbackManager.getInstance().registerMistake(payload);
        });

        DayManager.instance = this;
    }

    startDay() {
        FeedbackManager.getInstance().resetDay();
        this.actualDay += 1;
        this.actualCharacter = -1;
        this.charactersOfDay = CharacterManager.getCharactersOfDay(this.actualDay);

        if (this.charactersOfDay.length === 0) {
            throw new Error(`DayManager: nenhum personagem encontrado para o dia ${this.actualDay}.`);
        }

        SaveManager.saveAutosave();

        DayTransitionUI.showDayStart(this.actualDay, () => {
            if (this.actualDay === 0) {
                // Tutorial da interface aparece antes do primeiro cliente do dia 0
                EventsManager.getInstance().emit("tutorial:interface", {
                    onComplete: () => this.enterClient()
                });
            } else {
                this.enterClient();
            }
        });
    }

    enterClient() {
        this._transitioning = true;
        this.actualCharacter += 1;
        this._clientStartTime = Date.now();

        const client = this.charactersOfDay[this.actualCharacter];

        SaveManager.saveAutosave();

        EventsManager.getInstance().emit("dossier:update", {
            characterName: client.name,
            day: this.actualDay,
            portrait: client.portrait
        });

        this.currentCharacterImage = CharacterAnimator.enter(
            client.portrait,
            500,
            800,
            2.9,
            () => {
                this._transitioning = false;
                DialogueManager.getInstance().loadDialogueGraph(
                    client.dialogues,
                    CharacterManager.getStartDialogue(client.name, this.actualDay),
                    client.name
                );
            }
        );
    }

    _onDialogueEnded() {
        if (this._transitioning || !this.currentCharacterImage) {
            return;
        }

        // Diálogo pós-minigame terminou: sai do personagem normalmente
        if (this._postMinigameDialogueActive) {
            this._postMinigameDialogueActive = false;
            this._exitCurrentCharacter();
            return;
        }

        const client = this.charactersOfDay[this.actualCharacter];
        const minigames = client.minigames || [];
        const validMinigames = minigames.filter(key => key && !IGNORED_MINIGAME_KEYS.includes(key));

        // Apenas o primeiro minigame válido do personagem é lançado.
        // Múltiplos minigames por personagem não são suportados no fluxo atual.
        if (validMinigames.length > 0) {
            this._transitioning = true;
            EventsManager.getInstance().emit("minigame:start", {
                type: validMinigames[0],
                config: { character: client.name, day: this.actualDay }
            });
            return;
        }

        this._exitCurrentCharacter();
    }

    _onMinigameEnded(payload) {
        if (this._pendingDayEndMinigame) {
            // Só consome a flag se for o minigame esperado (CUSTOS).
            // Eventos stale de outros minigames não devem interferir neste fluxo.
            if (payload?.type === SCENES.BUDGET_MINIGAME) {
                this._pendingDayEndMinigame = false;
                this._continueAfterDayEndMinigame();
            }
            return;
        }

        const client = this.charactersOfDay[this.actualCharacter];
        if (client?.post_minigame_start) {
            this._transitioning = false;
            this._postMinigameDialogueActive = true;
            DialogueManager.getInstance().loadDialogueGraph(
                client.dialogues,
                client.post_minigame_start,
                client.name
            );
            return;
        }

        this._exitCurrentCharacter();
    }

    _exitCurrentCharacter() {
        if (!this.currentCharacterImage) {
            return;
        }

        // Conquista: cliente atendido em até 25 segundos (apenas a partir do dia 1)
        if (this._clientStartTime) {
            const elapsed = (Date.now() - this._clientStartTime) / 1000;
            if (this.actualDay >= 1 && elapsed <= 25) {
                EventsManager.getInstance().emit("achievement_fast_client");
            }
            this._clientStartTime = null;
        }

        this._transitioning = true;

        CharacterAnimator.exit(this.currentCharacterImage, () => {
            this.currentCharacterImage = null;

            const scene = SceneManager.get().getScene();
            const isLastCharacter = this.actualCharacter + 1 >= this.charactersOfDay.length;

            if (isLastCharacter) {
                this._transitioning = false;
                this.endDay();
                return;
            }

            scene.time.delayedCall(TIME_BETWEEN_CHARACTERS, () => {
                this.enterClient();
            });
        });
    }

    
    endDay() {
        // Bloqueia imediatamente para prevenir saves ou interações durante a transição de fim de dia.
        this._transitioning = true;

        // Dia 0 é apenas tutorial: pula feedback e minigame de orçamento
        if (this.actualDay === 0) {
            this._transitioning = false;
            this.startDay();
            return;
        }

        // Conquista: terminou o dia sem nenhum erro
        if (FeedbackManager.getInstance().mistakeCount === 0) {
            EventsManager.getInstance().emit("achievement_no_mistakes_one_day");
        }

        const scene = SceneManager.get().getScene();

        DayTransitionUI.showDayEnd(
            `Dia ${this.actualDay} concluido! Organize os custos antes de continuar.`
        );

        scene.time.delayedCall(DAY_END_MESSAGE_DURATION, () => {
            scene.scene.launch(SCENES.DAY_FEEDBACK, { day: this.actualDay });

            EventsManager.getInstance().once("day_feedback:closed", () => {
                this._pendingDayEndMinigame = true;
                EventsManager.getInstance().emit("minigame:start", {
                    type: SCENES.BUDGET_MINIGAME,
                    config: { day: this.actualDay, trigger: "day_end" }
                });
            });
        });
    }

    _continueAfterDayEndMinigame() {
        const scene = SceneManager.get().getScene();
        const isFinalDay = this.actualDay >= FINAL_DAY;

        this._transitioning = false;

        if (isFinalDay) {
            SaveManager.saveAutosave({ currentScene: SCENES.EXAM });
            scene.scene.start(SCENES.EXAM);
            return;
        }

        this.startDay();
    }

    reset() {
        this.actualDay = -1;
        this.actualCharacter = -1;
        this.charactersOfDay = [];
        this.currentCharacterImage = null;
        this._transitioning = false;
        this._pendingDayEndMinigame = false;
    }

    serialize() {
        return {
            actualDay: this.actualDay,
            actualCharacter: this.actualCharacter,
        };
    }

    deserialize(data = {}) {
        this.actualDay = Number.isInteger(data.actualDay) ? data.actualDay : -1;
        this.actualCharacter = Number.isInteger(data.actualCharacter) ? data.actualCharacter : -1;
        this.charactersOfDay = this.actualDay > 0 ? CharacterManager.getCharactersOfDay(this.actualDay) : [];
        this.currentCharacterImage = null;
        this._transitioning = false;
        this._pendingDayEndMinigame = false;
    }

    startFromCheckpoint() {
        if (this.actualDay <= 0) {
            this.startDay();
            return;
        }

        // `charactersOfDay` já foi populado por `deserialize()`.
        if (this.charactersOfDay.length === 0) {
            throw new Error(`DayManager: nenhum personagem encontrado para o dia ${this.actualDay}.`);
        }

        const nextCharacterIndex = Phaser.Math.Clamp(this.actualCharacter, 0, this.charactersOfDay.length - 1);
        this.actualCharacter = nextCharacterIndex - 1;

        DayTransitionUI.showDayStart(this.actualDay, () => {
            this.enterClient();
        });
    }

    getSavePreview() {
        const clientIndex = this.actualCharacter >= 0 ? this.actualCharacter : 0;
        const client = this.charactersOfDay[clientIndex] ?? null;

        return {
            day: this.actualDay,
            clientName: client?.name ?? null,
        };
    }

    getManualSaveBlockReason() {
        if (this.actualDay <= 0) {
            return "Progresso insuficiente para salvar.";
        }

        if (this._transitioning || this._pendingDayEndMinigame) {
            return "Espere a transicao atual terminar para salvar.";
        }

        if (!this.currentCharacterImage) {
            return "Aguarde o proximo cliente aparecer para salvar.";
        }

        return null;
    }

    canManualSave() {
        return this.getManualSaveBlockReason() === null;
    }
}