/**
 * WellbeingManager — rastreia estabilidade financeira e felicidade do jogador
 * entre os dias, além do fundo de emergência.
 *
 * Estabilidade: cai quando despesas fixas são puladas. Sobe levemente quando
 * todas são pagas. Controla dívidas com multa no dia seguinte.
 *
 * Felicidade: cai quando nenhum entretenimento é pago. Sobe quando ao menos
 * um é pago. Controla penalidade de renda por esgotamento no dia seguinte.
 *
 * Fundo de emergência: rende 5% a cada novo dia. Pode cobrir despesas
 * esporádicas sem tocar no saldo principal.
 */
export default class WellbeingManager {
    static instance = null;

    #stability    = 100;   // 0–100
    #happiness    = 100;   // 0–100
    #fund         = 0;     // saldo do fundo de emergência
    #pendingDebts = [];    // [{label, base, fine, total}] para o próximo dia

    constructor() {
        if (WellbeingManager.instance) return WellbeingManager.instance;
        WellbeingManager.instance = this;
    }

    static getInstance() {
        if (!WellbeingManager.instance) new WellbeingManager();
        return WellbeingManager.instance;
    }

    // ── Getters ────────────────────────────────────────────────────────────────
    get stability()    { return this.#stability; }
    get happiness()    { return this.#happiness; }
    get fund()         { return this.#fund; }
    get pendingDebts() { return [...this.#pendingDebts]; }

    // ── Fundo de emergência ────────────────────────────────────────────────────

    /** Acrescenta valor ao fundo. Chamado quando o jogador decide guardar. */
    addToFund(amount) {
        this.#fund += amount;
    }

    /**
     * Aplica rendimento de 5% ao fundo. Chamado no início de cada novo dia.
     * @returns {number} valor rendido (inteiro, arredondado pra baixo)
     */
    applyFundYield() {
        const yield_ = Math.floor(this.#fund * 0.05);
        this.#fund += yield_;
        return yield_;
    }

    /**
     * Tenta cobrir uma despesa com o fundo.
     * @returns {boolean} true se o fundo tinha saldo suficiente
     */
    coverWithFund(amount) {
        if (this.#fund >= amount) {
            this.#fund -= amount;
            return true;
        }
        return false;
    }

    // ── Dívidas ────────────────────────────────────────────────────────────────

    /** Retorna e limpa as dívidas pendentes (consumidas no início do relatório). */
    consumeDebts() {
        const debts = [...this.#pendingDebts];
        this.#pendingDebts = [];
        return debts;
    }

    // ── Fechamento do dia ──────────────────────────────────────────────────────

    /**
     * Processa o resultado do dia. Chamado ao confirmar o relatório.
     * @param {object[]} skippedFixed  despesas fixas puladas [{label, value}]
     * @param {boolean}  entertainPaid se ao menos um entretenimento foi pago
     */
    closeDay(skippedFixed, entertainPaid) {
        // Estabilidade
        if (skippedFixed.length === 0) {
            this.#stability = Math.min(100, this.#stability + 10);
        } else {
            this.#stability = Math.max(0, this.#stability - 30 * skippedFixed.length);
            skippedFixed.forEach(e => {
                const fine  = Math.round(e.value * 0.2);
                this.#pendingDebts.push({
                    label: e.label,
                    base:  e.value,
                    fine,
                    total: e.value + fine,
                });
            });
        }

        // Felicidade
        if (entertainPaid) {
            this.#happiness = Math.min(100, this.#happiness + 15);
        } else {
            this.#happiness = Math.max(0, this.#happiness - 25);
        }
    }

    /**
     * Penalidade de renda por felicidade baixa (esgotamento).
     * @returns {number} valor a deduzir da renda bruta
     */
    happinessPenalty(rawIncome) {
        if (this.#happiness >= 50) return 0;
        return Math.round(rawIncome * 0.10);
    }

    // ── Projeções para feedback em tempo real ──────────────────────────────────

    projectStability(skippedCount) {
        if (skippedCount === 0) return Math.min(100, this.#stability + 10);
        return Math.max(0, this.#stability - 30 * skippedCount);
    }

    projectHappiness(entertainPaid) {
        if (entertainPaid) return Math.min(100, this.#happiness + 15);
        return Math.max(0, this.#happiness - 25);
    }

    // ── Serialização ──────────────────────────────────────────────────────────

    serialize() {
        return {
            stability:    this.#stability,
            happiness:    this.#happiness,
            fund:         this.#fund,
            pendingDebts: this.#pendingDebts,
        };
    }

    deserialize(data = {}) {
        this.#stability    = Number.isFinite(data.stability)    ? data.stability    : 100;
        this.#happiness    = Number.isFinite(data.happiness)    ? data.happiness    : 100;
        this.#fund         = Number.isFinite(data.fund)         ? data.fund         : 0;
        this.#pendingDebts = Array.isArray(data.pendingDebts)   ? data.pendingDebts : [];
    }

    reset() {
        this.#stability    = 100;
        this.#happiness    = 100;
        this.#fund         = 0;
        this.#pendingDebts = [];
    }
}
