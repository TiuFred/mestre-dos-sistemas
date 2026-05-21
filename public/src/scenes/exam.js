import { Button } from "../components/Button.js";
import { FINAL_EXAM_PASSING_SCORE, FINAL_EXAM_QUESTIONS } from "../components/exam/finalExamQuestions.js";
import { SCENES, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants.js";
import SettingsManager from "../components/managers/SettingsManager.js";
import PlayerMoneyManager from "../components/managers/PlayerMoneyManager.js";
import EndingManager from "../components/managers/EndingManager.js";
import EventsManager from "../components/managers/EventsManager.js";

const EXAM_TEXT_STYLE = {
    fontFamily: "PressStart2P",
    color: "#FFFFFF",
};

export default class ExamScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.EXAM });
    }

    create() {
        this.currentQuestionIndex = 0;
        this.selectedAnswers = [];
        this.optionButtons = [];
        this.feedbackText = null;
        this._buildLayout();
        this._renderQuestion();
    }

    _buildLayout() {
        this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 0x1A1535);
        this.add.rectangle(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 1480, 860, 0x2A224D, 0.96)
            .setStrokeStyle(6, 0xF9C22B);

        this.add.text(960, 50, "PROVA DE PROMOÇÃO", {
            ...EXAM_TEXT_STYLE,
            fontSize: "44px",
        }).setOrigin(0.5);

        this.progressText = this.add.text(240, 170, "", {
            ...EXAM_TEXT_STYLE,
            fontSize: "35px",
        });

        this.questionText = this.add.text(240, 250, "", {
            ...EXAM_TEXT_STYLE,
            fontSize: "30px",
            wordWrap: { width: 1440 },
            lineSpacing: 10,
        });

        this.feedbackText = this.add.text(240, 840, "", {
            ...EXAM_TEXT_STYLE,
            fontSize: "30px",
            color: "#F9C22B",
            wordWrap: { width: 1200 },
            lineSpacing: 6,
        });

        this.resultText = this.add.text(960, 870, "", {
            ...EXAM_TEXT_STYLE,
            fontSize: "30px",
            align: "center",
            wordWrap: { width: 1200 },
        }).setOrigin(0.5);

        this.nextButton = new Button(this, {
            x: 1550,
            y: 880,
            width: 260,
            height: 80,
            radius: 20,
            text: "Confirmar",
            backgroundColor: 0x2E7D32,
            textStyle: {
                color: "#FFFFFF",
                fontSize: "22px",
                fontStyle: "bold",
                fontFamily: "PressStart2P",
            },
            onClick: () => this._confirmAnswer(),
        });

        this.nextButton.setEnabled(false);

        this.brightnessOverlay = this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0x000000
        ).setDepth(9999).setAlpha(1 - SettingsManager.brightness);
    }

    _renderQuestion() {
        const question = FINAL_EXAM_QUESTIONS[this.currentQuestionIndex];

        this.progressText.setText(`Questao ${this.currentQuestionIndex + 1} de ${FINAL_EXAM_QUESTIONS.length}`);
        this.questionText.setText(question.prompt);
        this.feedbackText.setText("");
        this.resultText.setText("");
        this.nextButton.container.setVisible(true);
        this.nextButton.setText(this._isLastQuestion() ? "Finalizar" : "Confirmar");
        this.nextButton.setEnabled(false);

        this.optionButtons.forEach((button) => button.destroy());
        this.optionButtons = question.choices.map((choice, index) => this._createOptionButton(choice, index));
    }

    _createOptionButton(choice, index) {
        return new Button(this, {
            x: 960,
            y: 470 + (index * 120),
            width: 1360,
            height: 84,
            radius: 18,
            text: choice,
            backgroundColor: 0x4E3B8C,
            textStyle: {
                color: "#FFFFFF",
                fontSize: "25px",
                fontStyle: "bold",
                fontFamily: "PressStart2P",
                align: "center",
                wordWrap: { width: 1220 },
            },
            onClick: () => this._selectAnswer(index),
        });
    }

    _selectAnswer(selectedIndex) {
        this.selectedAnswers[this.currentQuestionIndex] = selectedIndex;
        this.nextButton.setEnabled(true);

        this.optionButtons.forEach((button, index) => {
            const isSelected = index === selectedIndex;
            button.background.setFillStyle(isSelected ? 0xF9C22B : 0x4E3B8C);
            button.label.setColor(isSelected ? "#1A1535" : "#FFFFFF");
        });
    }

    _confirmAnswer() {
        const question = FINAL_EXAM_QUESTIONS[this.currentQuestionIndex];
        const selectedAnswer = this.selectedAnswers[this.currentQuestionIndex];
        const isCorrect = selectedAnswer === question.correctAnswer;

        this.optionButtons.forEach((button) => button.setEnabled(false));
        this.nextButton.setEnabled(false);

        this.feedbackText.setText(
            `${isCorrect ? "Resposta correta." : "Resposta incorreta."} ${question.explanation}`
        );

        this.time.delayedCall(5000, () => {
            if (this._isLastQuestion()) {
                this._finishExam();
                return;
            }

            this.currentQuestionIndex += 1;
            this._renderQuestion();
        });
    }

    _finishExam() {
        const score = this.selectedAnswers.reduce((total, selectedAnswer, index) => {
            return total + (selectedAnswer === FINAL_EXAM_QUESTIONS[index].correctAnswer ? 1 : 0);
        }, 0);

        const passed = score >= FINAL_EXAM_PASSING_SCORE;

        this.progressText.setText("");
        this.questionText.setText("");
        this.feedbackText.setText("");

        this.optionButtons.forEach((button) => button.destroy());
        this.optionButtons = [];

        this.resultText.setText(
            passed
                ? "Prova concluida com sucesso. Aguarde seu resultado final."
                : "Prova concluida. Aguarde seu resultado final."
        );

        this.nextButton.container.setVisible(false);
        this.nextButton.setEnabled(false);

        this.time.delayedCall(5000, () => {
            const endingManager = EndingManager.getInstance();
            endingManager.setExamResult({
                score,
                passed,
                questionCount: FINAL_EXAM_QUESTIONS.length,
            });
            endingManager.setFinalMoney(PlayerMoneyManager.getInstance().getBalance());
            const ending = endingManager.resolveEnding();

            this.scene.start(SCENES.POST_EXAM_DIALOGUE, {
                ending: ending.id,
                score,
                passed,
            });
        });
    }

    _isLastQuestion() {
        return this.currentQuestionIndex === FINAL_EXAM_QUESTIONS.length - 1;
    }
}
