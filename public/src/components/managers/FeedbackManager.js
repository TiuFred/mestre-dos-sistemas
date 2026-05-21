/**
 * FeedbackManager
 * Singleton que coleta os erros cometidos pelo jogador ao longo do dia.
 * Cada entrada registra a pergunta, a resposta errada escolhida e o feedback educativo.
 *
 * Uso:
 *   FeedbackManager.getInstance().registerMistake({ ... })
 *   FeedbackManager.getInstance().getMistakesOfDay()
 *   FeedbackManager.getInstance().resetDay()
 */

export default class FeedbackManager {
    static instance = null;

    /** @type {Array<{ character: string, question: string, wrongAnswer: string, correctAnswer: string, tip: string }>} */
    _mistakes = [];

    static getInstance() {
        if (!FeedbackManager.instance) {
            FeedbackManager.instance = new FeedbackManager();
        }
        return FeedbackManager.instance;
    }

    /**
     * Registra um erro cometido pelo jogador.
     * @param {{ character: string, question: string, wrongAnswer: string, correctAnswer: string, tip: string }} data
     */
    registerMistake(data) {
        this._mistakes.push({ ...data });
    }

    /** Retorna uma cópia dos erros do dia. */
    getMistakesOfDay() {
        return [...this._mistakes];
    }

    /** Retorna quantos erros foram cometidos. */
    get mistakeCount() {
        return this._mistakes.length;
    }

    /** Limpa os erros ao iniciar um novo dia. */
    resetDay() {
        this._mistakes = [];
    }

    serialize() {
        return {
            mistakes: this.getMistakesOfDay(),
        };
    }

    deserialize(data = {}) {
        this._mistakes = Array.isArray(data.mistakes) ? data.mistakes.map((mistake) => ({ ...mistake })) : [];
    }
}
