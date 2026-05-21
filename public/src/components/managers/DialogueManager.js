import Keyboard from "../Keyboard.js";
import DialogueUI from "../dialogue/DialogueUI.js";
import ChoiceUI from "../dialogue/ChoiceUI.js";
import AnswerFeedbackUI from "../dialogue/AnswerFeedbackUI.js";
import EventsManager from "./EventsManager.js";
import { dialogueBoxPropertys } from "../../constants.js";
import { loadYamlFromCache } from "../yamlLoader.js";

const DialogueState = {
    TYPING: "typing",
    WAIT_INPUT: "wait_input",
    CHOICE: "choice",
    END: "end"
};

export default class DialogueManager {
    static instance = null;

    scene = null;
    keyboard = null;
    dialogueUI = null;
    choiceUI = null;
    answerFeedbackUI = null;
    graph = {};
    currentGraphKey = "";
    currentNode = null;
    currentNodeId = null;
    activeCharacterName = "";
    choiceIdx = 0;
    state = DialogueState.END;
    _inputLocked = false;

    constructor(scene) {
        if (DialogueManager.instance) {
            DialogueManager.instance._rebindScene(scene);
            return DialogueManager.instance;
        }

        this.scene = scene;
        this._setupSceneBindings(scene);
        DialogueManager.instance = this;

        EventsManager.getInstance().on(
            "dialogue_typing_finished",
            "DialogueManager:typing_finished",
            () => {
                if (this.state === DialogueState.TYPING) { this.finishTyping(); }
            }
        );

        EventsManager.getInstance().on(
            "dialogue:advance_request",
            "DialogueManager:advance_request",
            () => {
                this.handleAdvanceRequest();
            }
        );

        EventsManager.getInstance().on(
            "dialogue_choice_selected",
            "DialogueManager:choice_selected",
            (payload) => {
                this.handleChoiceSelection(payload?.index);
            }
        );
    }

    static getInstance() {
        if (!DialogueManager.instance) {
            throw new Error("DialogueManager nao inicializado.");
        }
        return DialogueManager.instance;
    }

    _rebindScene(scene) {
        this.scene = scene;
        this.graph = {};
        this.currentGraphKey = "";
        this.currentNode = null;
        this.currentNodeId = null;
        this.activeCharacterName = "";
        this.choiceIdx = 0;
        this.state = DialogueState.END;
        this._inputLocked = false;
        this.answerFeedbackUI?.rebindScene(scene);
        this._setupSceneBindings(scene);
    }

    _setupSceneBindings(scene) {
        this.keyboard = new Keyboard(scene);
        this.keyboard.init();

        const { width, height, radius } = dialogueBoxPropertys;
        // Reserva a lateral direita para a calculadora da HUD,
        // evitando que a caixa de escolhas avance sobre ela.
        const choiceSafeRightEdge = 990;
        const choiceBoxWidth = Math.min(width / 1.45, choiceSafeRightEdge - 40);
        const choiceBoxHeight = height * 1.75;

        this.dialogueUI = new DialogueUI(scene);
        this.choiceUI = new ChoiceUI(scene, choiceBoxWidth, choiceBoxHeight, radius);
        this.choiceUI.hide();
        this.choiceUI.setInteractiveEnabled(true);
        if (!this.answerFeedbackUI) {
            this.answerFeedbackUI = new AnswerFeedbackUI(scene);
        }
    }

    applyTextSettings() {
        this.dialogueUI?.applySettings?.();
        this.choiceUI?.applySettings?.();

        if (!this.currentNode) {
            return;
        }

        if (
            this.currentNode.choices &&
            this.state !== DialogueState.TYPING &&
            this.dialogueUI?.isOnLastPage?.()
        ) {
            if (this.choiceUI.getChoicesCount() === 0) {
                this.choiceUI.setOptions(Object.values(this.currentNode.choices));
            }
            this.choiceUI.show();
            this.choiceUI.setInteractiveEnabled(true);
            this.choiceUI.updateSelection(this.choiceIdx);
            this.state = DialogueState.CHOICE;
            this.dialogueUI.setIndicator("choice");
            return;
        }

        if (this.currentNode.choices) {
            this.choiceUI.hide();
            this.choiceUI.setInteractiveEnabled(false);
        }

        if (this.state !== DialogueState.TYPING) {
            this.state = DialogueState.WAIT_INPUT;
            this.dialogueUI.setIndicator("continue");
        }
    }

    loadDialogueGraph(graphKey, startId, characterName = "") {
        const data = loadYamlFromCache(this.scene, graphKey);
        this.graph = data;
        this.currentGraphKey = graphKey;
        this.activeCharacterName = characterName;
        const node = this.graph[startId];
        this.enterNode(node, startId);
    }

    enterNode(node, nodeId = null) {
        if (!node) {
            this.endDialogue();
            return;
        }

        this.currentNode = node;
        this.currentNodeId = nodeId;
        if (node.event) { EventsManager.getInstance().emit(node.event); }
        if (node.correct_choice) {
            EventsManager.getInstance().emit("dialogue:question_presented", {
                character: node.feedback?.character ?? this.activeCharacterName,
                questionId: this._getQuestionId(),
            });
        }
        this.choiceUI.hide();
        this.choiceUI.setInteractiveEnabled(true);
        this.dialogueUI.startTyping(node.text);
        this.state = DialogueState.TYPING;
    }

    finishTyping() {
        if (this.dialogueUI.hasNextPage()) {
            this.state = DialogueState.WAIT_INPUT;
            this.dialogueUI.setIndicator("continue");
            return;
        }

        if (this.currentNode.choices) {
            const choices = Object.values(this.currentNode.choices);
            this.choiceUI.show();
            this.choiceUI.setOptions(choices);
            this.choiceUI.setInteractiveEnabled(true);
            this.choiceIdx = 0;
            this.choiceUI.updateSelection(this.choiceIdx);
            this.state = DialogueState.CHOICE;
            this._lockInputBriefly(200);
            this.dialogueUI.setIndicator("choice");
            return;
        }

        this.state = DialogueState.WAIT_INPUT;
        this.dialogueUI.setIndicator("continue");
    }

    moveChoiceUp() {
        const total = Object.values(this.currentNode.choices).length;
        this.choiceIdx = (this.choiceIdx - 1 + total) % total;
        this.choiceUI.updateSelection(this.choiceIdx);
    }

    moveChoiceDown() {
        const total = Object.values(this.currentNode.choices).length;
        this.choiceIdx = (this.choiceIdx + 1) % total;
        this.choiceUI.updateSelection(this.choiceIdx);
    }

    chooseOption() {
        this.choiceUI.setInteractiveEnabled(false);

        const choiceEntries = Object.entries(this.currentNode.choices);
        const [choiceId, option] = choiceEntries[this.choiceIdx];

        if (this.currentNode.correct_choice) {
            const isCorrect = choiceId === this.currentNode.correct_choice;
            const characterName = this.currentNode.feedback?.character ?? this.activeCharacterName;
            const questionId = this._getQuestionId();

            if (isCorrect) {
                this.scene.sound.play("acerto");
            } else {
                this.scene.sound.play("error");
                const fb = this.currentNode.feedback;
                if (fb) {
                    EventsManager.getInstance().emit("dialogue:wrong_answer", {
                        character:     fb.character     ?? "",
                        question:      fb.question      ?? this.currentNode.text,
                        wrongAnswer:   option.text      ?? "",
                        correctAnswer: fb.correctAnswer ?? "",
                        tip:           fb.tip           ?? "",
                    });
                }
            }

            EventsManager.getInstance().emit(isCorrect ? "correct_answer" : "wrong_answer", {
                character: characterName,
                questionId,
            });
            this.showAnswerFeedback(isCorrect);
        }

        if (option.event) {
            EventsManager.getInstance().emit(option.event);
        }

        if (!option.next_node) {
            this.endDialogue();
            return;
        }

        this.enterNode(this.graph[option.next_node], option.next_node);
    }

    nextDialogue() {
        if (this.dialogueUI.hasNextPage()) {
            this.state = DialogueState.TYPING;
            this.dialogueUI.showNextPage();
            return;
        }

        if (this.currentNode.terminal) {
            this.endDialogue();
            return;
        }

        this.enterNode(this.graph[this.currentNode.next_node], this.currentNode.next_node);
    }

    endDialogue() {
        this.state = DialogueState.END;
        this.dialogueUI.setIndicator("end");

        this.scene.time.delayedCall(800, () => {
            this.dialogueUI.hide?.();
            this.choiceUI.hide();
            this.choiceUI.setInteractiveEnabled(true);
            this.currentNode = null;
            this.currentNodeId = null;
            EventsManager.getInstance().emit("dialogue_end");
        });
    }

    update() {
        if (this.state === DialogueState.END || this._inputLocked) { return; }

        switch (this.state) {
            case DialogueState.TYPING:
                if (this.keyboard.isJustDown("ENTER") || this.keyboard.isJustDown("SPACE")) {
                    this._lockInputBriefly(200);
                    this.dialogueUI.skipTyping();
                }
                break;
            case DialogueState.WAIT_INPUT:
                if (this.keyboard.isJustDown("ENTER") || this.keyboard.isJustDown("SPACE")) {
                    this._lockInputBriefly(200);
                    this.nextDialogue();
                }
                break;
            case DialogueState.CHOICE:
                if (this.keyboard.isJustDown("W")) { this.moveChoiceUp(); }
                if (this.keyboard.isJustDown("S")) { this.moveChoiceDown(); }
                if (this.keyboard.isJustDown("ENTER")) { this.chooseOption(); }
                break;
        }
    }

    handleAdvanceRequest() {
        if (this.state === DialogueState.END || this._inputLocked) { return; }

        if (this.state === DialogueState.TYPING) {
            this._lockInputBriefly(200);
            this.dialogueUI.skipTyping();
            return;
        }

        if (this.state === DialogueState.WAIT_INPUT) {
            this._lockInputBriefly(150);
            this.nextDialogue();
        }
    }

    handleChoiceSelection(index) {
        if (this.state !== DialogueState.CHOICE || this._inputLocked) { return; }
        if (typeof index !== "number" || index < 0 || index >= this.choiceUI.getChoicesCount()) { return; }

        this.choiceIdx = index;
        this.choiceUI.updateSelection(this.choiceIdx);
        this._lockInputBriefly(150);
        this.chooseOption();
    }

    _getQuestionId() {
        const graphKey = this.currentGraphKey || "unknown_graph";
        const characterName = this.activeCharacterName || "unknown_character";
        const nodeId = this.currentNodeId ?? "unknown_node";
        return `${graphKey}:${characterName}:${nodeId}`;
    }

    _lockInputBriefly(ms = 200) {
        this._inputLocked = true;
        this.scene.time.delayedCall(ms, () => { this._inputLocked = false; });
    }

    showAnswerFeedback(isCorrect) {
        this.answerFeedbackUI.show(isCorrect);
    }
}
