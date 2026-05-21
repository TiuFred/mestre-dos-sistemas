import { SCENES } from "../../constants.js";
import DayManager from "./DayManager.js";
import PlayerMoneyManager from "./PlayerMoneyManager.js";
import SceneManager from "./SceneManager.js";
import { getPersistedManagerInstance, serializePersistedManagers } from "./StateSerializerRegistry.js";
import { LocalStorage } from "../LocalStorage.js";

const AUTOSAVE_STORAGE_KEY = "mestre_do_sistema_autosave";
const SLOT_STORAGE_PREFIX = "mestre_do_sistema_slot_";
const SAVE_VERSION = 1;
const SLOT_COUNT = 5;

export default class SaveManager {
    static AUTOSAVE_ID = "autosave";

    static getSlotIds() {
        return Array.from({ length: SLOT_COUNT }, (_, index) => `slot_${index + 1}`);
    }

    static hasAutosave() {
        return LocalStorage.get(AUTOSAVE_STORAGE_KEY) !== null;
    }

    static clearAutosave() {
        LocalStorage.remove(AUTOSAVE_STORAGE_KEY);
    }

    static loadAutosave() {
        const parsed = LocalStorage.getJson(AUTOSAVE_STORAGE_KEY);
        return parsed?.version === SAVE_VERSION ? parsed : null;
    }

    static saveAutosave({ currentScene = SCENES.GAME } = {}) {
        const snapshot = this._buildSnapshot({
            currentScene,
            slotId: this.AUTOSAVE_ID,
            saveType: "autosave",
        });
        LocalStorage.setJson(AUTOSAVE_STORAGE_KEY, snapshot);
        return snapshot;
    }

    static getAutosavePreview() {
        const autosave = this.loadAutosave();
        return autosave?.preview ?? null;
    }

    static getAutosaveMetadata() {
        return this.loadAutosave();
    }

    static getManualSaveStatus() {
        // Acesso direto a .instance intencional: queremos checar existência sem criar instâncias.
        const dayManager = DayManager.instance;
        const playerMoneyManager = PlayerMoneyManager.instance;
        const currentSceneKey = SceneManager.instance?.getScene?.()?.scene?.key ?? null;

        if (!dayManager || !playerMoneyManager) {
            return {
                allowed: false,
                reason: "Nenhuma campanha ativa para salvar.",
            };
        }

        if (currentSceneKey === SCENES.EXAM || currentSceneKey === SCENES.END) {
            return {
                allowed: false,
                reason: "Nao e permitido salvar durante a prova ou na tela final.",
            };
        }

        return {
            allowed: dayManager.canManualSave(),
            reason: dayManager.getManualSaveBlockReason(),
        };
    }

    static listSlots() {
        return this.getSlotIds().map((slotId) => this.inspectSlot(slotId));
    }

    static loadSlot(slotId) {
        const inspected = this.inspectSlot(slotId);
        return inspected.status === "valid" ? inspected.data : null;
    }

    static inspectSlot(slotId) {
        const raw = LocalStorage.get(this._slotStorageKey(slotId));

        if (raw === null) {
            return { id: slotId, status: "empty", data: null };
        }

        try {
            const parsed = JSON.parse(raw);
            if (parsed?.version !== SAVE_VERSION) {
                return { id: slotId, status: "invalid", data: null };
            }
            return {
                id: slotId,
                status: "valid",
                data: { ...parsed, id: parsed.id ?? slotId },
            };
        } catch {
            return { id: slotId, status: "invalid", data: null };
        }
    }

    static getLatestManualSlotId() {
        const latest = this.listSlots()
            .filter((slot) => slot.status === "valid" && slot.data?.saveType === "manual")
            .sort((a, b) => new Date(b.data.savedAt).getTime() - new Date(a.data.savedAt).getTime())[0];

        return latest?.id ?? null;
    }

    static saveToSlot(slotId, { currentScene = SCENES.GAME } = {}) {
        const snapshot = this._buildSnapshot({ currentScene, slotId, saveType: "manual" });
        LocalStorage.setJson(this._slotStorageKey(slotId), snapshot);
        return snapshot;
    }

    static deleteSlot(slotId) {
        LocalStorage.remove(this._slotStorageKey(slotId));
    }

    static _buildSnapshot({ currentScene, slotId = null, saveType = "manual" }) {
        const dayManager = getPersistedManagerInstance("dayManager");
        const playerMoneyManager = getPersistedManagerInstance("playerMoney");

        return {
            id: slotId,
            version: SAVE_VERSION,
            saveType,
            savedAt: new Date().toISOString(),
            currentScene,
            preview: {
                ...(dayManager?.getSavePreview?.() ?? {}),
                money: playerMoneyManager?.getBalance?.() ?? 0,
            },
            state: serializePersistedManagers(),
        };
    }

    static _slotStorageKey(slotId) {
        return `${SLOT_STORAGE_PREFIX}${slotId}`;
    }
}
