import EventsManager from "./EventsManager.js";

const REWARD_PER_CORRECT_ANSWER = 40;

export default class PlayerMoneyManager {
    static instance = null;
    #balance = 0;

    constructor() {
        if (PlayerMoneyManager.instance) {
            return PlayerMoneyManager.instance;
        }

        PlayerMoneyManager.instance = this;

        EventsManager.getInstance().on("correct_answer", "PlayerMoneyManager:correct_answer", () => {
            this.addReward(REWARD_PER_CORRECT_ANSWER);
        });
    }

    static getInstance() {
        if (!PlayerMoneyManager.instance) {
            PlayerMoneyManager.instance = new PlayerMoneyManager();
        }
        return PlayerMoneyManager.instance;
    }

    reset() {
        this.#balance = 0;
    }

    addReward(amount) {
        this.#balance += amount;
        return this.#balance;
    }

    spend(amount) {
        this.#balance = Math.max(0, this.#balance - amount);
        return this.#balance;
    }

    getBalance() {
        return this.#balance;
    }

    serialize() {
        return {
            balance: this.#balance,
        };
    }

    deserialize(data = {}) {
        this.#balance = Number.isFinite(data.balance) ? data.balance : 0;
    }
}
