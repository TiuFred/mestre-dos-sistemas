import EventsManager from "./EventsManager.js";

const CLEDSON_CHARACTER_NAME = "Cledson";

const ENDINGS = [
    {
        id: "cledson",
        priority: 100,
        title: "Final Cledson",
        message: "Voce escolheu todas as escolhas que endividaram mais o Cledson. Ele voltou com sede de vinganca e o nome sujo no Serasa. Voce afundou ele financeiramente.",
        resultSound: "error",
        expression: "client_cledson_triste",
        thumbsFlip: [true, true],
        matches: (state) => {
            const totalQuestions = state.questionsByCharacter[CLEDSON_CHARACTER_NAME] ?? 0;
            const wrongAnswers = state.wrongAnswersByCharacter[CLEDSON_CHARACTER_NAME] ?? 0;
            return totalQuestions > 0 && wrongAnswers === totalQuestions;
        },
    },
    {
        id: "ruim",
        priority: 90,
        title: "Final Ruim",
        message: "Voce escolheu todos os piores conselhos para eles. Voce destinou seus clientes a divida eterna, arruinando a vida de todos que passaram por sua consultoria.",
        resultSound: "error",
        expression: "client_cledson_triste",
        thumbsFlip: [true, true],
        matches: (state) => {
            const totalQuestions = state.questionCount;
            const totalClients = state.clientsWithQuestions.size;
            const wrongAnswerThreshold = Math.ceil(totalQuestions * 0.6);
            const harmedClientsThreshold = Math.ceil(totalClients * 0.6);

            return totalQuestions > 0 &&
                totalClients > 0 &&
                state.wrongAnswers >= wrongAnswerThreshold &&
                state.harmedClients.size >= harmedClientsThreshold;
        },
    },
    {
        id: "muito_bom",
        priority: 80,
        title: "Final Muito Bom",
        message: "Voce conseguiu completar o jogo equilibrando tempo, dinheiro e conhecimento! Parabens por conseguir acertar todas as questoes no prazo e pagar todas as suas contas!",
        resultSound: "acerto",
        expression: "client_cledson_sorrindo",
        thumbsFlip: [true, false],
        matches: (state) =>
            state.examPassed &&
            state.examScore === state.examQuestionCount &&
            state.wrongAnswers === 0 &&
            state.finalMoney > 0,
    },
    {
        id: "bom",
        priority: 10,
        title: "Final Bom",
        message: "Voce conseguiu um resultado bom, mas nao o melhor. Tente novamente para alcancar o melhor final possivel!",
        resultSound: "acerto",
        expression: "client_cledson_sorrindo",
        thumbsFlip: [true, false],
        matches: () => true,
    },
];

export default class EndingManager {
    static instance = null;

    static getInstance() {
        if (!EndingManager.instance) {
            EndingManager.instance = new EndingManager();
        }
        return EndingManager.instance;
    }

    constructor() {
        if (EndingManager.instance) {
            return EndingManager.instance;
        }

        this.resetRun();
        this._registerListeners();
        EndingManager.instance = this;
    }

    _registerListeners() {
        const events = EventsManager.getInstance();

        events.on("dialogue:question_presented", "EndingManager:question_presented", (payload) => {
            this.registerQuestion(payload);
        });

        events.on("correct_answer", "EndingManager:correct_answer", (payload) => {
            this.registerAnswerResult(true, payload);
        });

        events.on("wrong_answer", "EndingManager:wrong_answer", (payload) => {
            this.registerAnswerResult(false, payload);
        });
    }

    resetRun() {
        this.state = {
            questionCount: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            questionsByCharacter: {},
            correctAnswersByCharacter: {},
            wrongAnswersByCharacter: {},
            harmedClients: new Set(),
            helpedClients: new Set(),
            clientsWithQuestions: new Set(),
            seenQuestionIds: new Set(),
            answeredQuestionIds: new Set(),
            examScore: 0,
            examPassed: false,
            examQuestionCount: 0,
            finalMoney: 0,
        };
    }

    registerQuestion({ character = "", questionId = "" } = {}) {
        if (!character || !questionId) { return; }
        if (this.state.seenQuestionIds.has(questionId)) { return; }

        this.state.seenQuestionIds.add(questionId);
        this.state.questionCount += 1;
        this.state.questionsByCharacter[character] = (this.state.questionsByCharacter[character] ?? 0) + 1;
        this.state.clientsWithQuestions.add(character);
    }

    registerAnswerResult(isCorrect, { character = "", questionId = "" } = {}) {
        if (!questionId || this.state.answeredQuestionIds.has(questionId)) { return; }

        this.state.answeredQuestionIds.add(questionId);

        if (isCorrect) {
            this.state.correctAnswers += 1;
            if (character) {
                this.state.correctAnswersByCharacter[character] = (this.state.correctAnswersByCharacter[character] ?? 0) + 1;
                this.state.helpedClients.add(character);
            }
            return;
        }

        this.state.wrongAnswers += 1;
        if (character) {
            this.state.wrongAnswersByCharacter[character] = (this.state.wrongAnswersByCharacter[character] ?? 0) + 1;
            this.state.harmedClients.add(character);
        }
    }

    setExamResult({ score = 0, passed = false, questionCount = 0 } = {}) {
        this.state.examScore = score;
        this.state.examPassed = passed;
        this.state.examQuestionCount = questionCount;
    }

    setFinalMoney(balance = 0) {
        this.state.finalMoney = balance;
    }

    serialize() {
        return {
            ...this.state,
            harmedClients: [...this.state.harmedClients],
            helpedClients: [...this.state.helpedClients],
            clientsWithQuestions: [...this.state.clientsWithQuestions],
            seenQuestionIds: [...this.state.seenQuestionIds],
            answeredQuestionIds: [...this.state.answeredQuestionIds],
        };
    }

    deserialize(data = {}) {
        this.state = {
            questionCount: Number.isFinite(data.questionCount) ? data.questionCount : 0,
            correctAnswers: Number.isFinite(data.correctAnswers) ? data.correctAnswers : 0,
            wrongAnswers: Number.isFinite(data.wrongAnswers) ? data.wrongAnswers : 0,
            questionsByCharacter: data.questionsByCharacter ?? {},
            correctAnswersByCharacter: data.correctAnswersByCharacter ?? {},
            wrongAnswersByCharacter: data.wrongAnswersByCharacter ?? {},
            harmedClients: new Set(data.harmedClients ?? []),
            helpedClients: new Set(data.helpedClients ?? []),
            clientsWithQuestions: new Set(data.clientsWithQuestions ?? []),
            seenQuestionIds: new Set(data.seenQuestionIds ?? []),
            answeredQuestionIds: new Set(data.answeredQuestionIds ?? []),
            examScore: Number.isFinite(data.examScore) ? data.examScore : 0,
            examPassed: !!data.examPassed,
            examQuestionCount: Number.isFinite(data.examQuestionCount) ? data.examQuestionCount : 0,
            finalMoney: Number.isFinite(data.finalMoney) ? data.finalMoney : 0,
        };
    }

    resolveEnding() {
        // O array é ordenado por priority desc. O ending "bom" (priority 10) tem
        // matches: () => true, garantindo que sempre haverá um resultado.
        return [...ENDINGS]
            .sort((a, b) => b.priority - a.priority)
            .find((candidate) => candidate.matches(this.state));
    }

    getEndingById(id) {
        return ENDINGS.find((ending) => ending.id === id) ?? null;
    }
}
