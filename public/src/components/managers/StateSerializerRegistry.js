import DayManager from "./DayManager.js";
import EndingManager from "./EndingManager.js";
import FeedbackManager from "./FeedbackManager.js";
import PlayerMoneyManager from "./PlayerMoneyManager.js";
import WellbeingManager from "./WellbeingManager.js";

const PERSISTED_MANAGER_ENTRIES = [
    {
        key: "dayManager",
        getInstance: () => DayManager.instance,
        reset: (instance) => instance?.reset?.(),
    },
    {
        key: "playerMoney",
        getInstance: () => PlayerMoneyManager.instance,
        reset: (instance) => instance?.reset?.(),
    },
    {
        key: "ending",
        getInstance: () => EndingManager.instance,
        reset: (instance) => instance?.resetRun?.(),
    },
    {
        key: "feedback",
        getInstance: () => FeedbackManager.instance,
        reset: (instance) => instance?.resetDay?.(),
    },
    {
        key: "wellbeing",
        getInstance: () => WellbeingManager.getInstance(),
        reset: (instance) => instance?.reset?.(),
    },
];

export function serializePersistedManagers() {
    return PERSISTED_MANAGER_ENTRIES.reduce((state, entry) => {
        const instance = entry.getInstance();
        state[entry.key] = instance?.serialize?.() ?? null;
        return state;
    }, {});
}

export function deserializePersistedManagers(state = {}) {
    for (const entry of PERSISTED_MANAGER_ENTRIES) {
        const instance = entry.getInstance();
        instance?.deserialize?.(state[entry.key] ?? {});
    }
}

export function resetPersistedManagers() {
    for (const entry of PERSISTED_MANAGER_ENTRIES) {
        const instance = entry.getInstance();
        entry.reset?.(instance);
    }
}

/** Retorna a instância do manager associado à chave fornecida, ou null se não existir. */
export function getPersistedManagerInstance(key) {
    const entry = PERSISTED_MANAGER_ENTRIES.find((item) => item.key === key);
    return entry?.getInstance?.() ?? null;
}
