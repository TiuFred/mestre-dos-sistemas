import EventsManager from "./EventsManager.js";
import AchievementToast from "../AchievementToast.js";
import { LocalStorage } from "../LocalStorage.js";

// Conquistas que contam como "cosméticos" para desbloquear Colecionador e Eu Quero Todos
const COSMETIC_ACHIEVEMENT_IDS = [
    "primeiro_de_muitos",
    "apenas_o_comeco",
    "um_e_bom_dois_e_demais",
    "veloz_e_furioso",
    "nada_escapa_de_mim",
];

const ACHIEVEMENTS = [
    {
        id: "primeiro_de_muitos",
        event: "achievement_first_client",
        title: "Primeiro de muitos",
        description: "Atenda o seu primeiro cliente.",
        secret: false,
        iconKey: "conquista_garrafa",
    },
    {
        id: "apenas_o_comeco",
        event: "achievement_day_1_complete",
        title: "Apenas o começo",
        description: "Conclua o primeiro dia.",
        secret: false,
        iconKey: "conquista_dia1",
    },
    {
        id: "um_e_bom_dois_e_demais",
        event: "achievement_day_2_complete",
        title: "Um é bom, dois é demais!",
        description: "Conclua o segundo dia.",
        secret: false,
        iconKey: "conquista_dia2",
    },
    {
        id: "veloz_e_furioso",
        event: "achievement_fast_client",
        title: "Veloz e furioso",
        description: "Atenda um cliente em menos de 25 segundos.",
        secret: false,
        iconKey: "conquista_relogio",
    },
    {
        id: "nada_escapa_de_mim",
        event: "achievement_no_mistakes_one_day",
        title: "Nada escapa de mim",
        description: "Acerte todas as perguntas de um dia",
        secret: false,
        iconKey: "item_guide_conquista",
    },
    {
        id: "eu_quero_todos",
        event: "achievement_all_cosmetics",
        title: "Eu quero todos, todos, todos eles",
        description: "Ganhe todos os itens cosméticos.",
        secret: false,
        iconKey: "conquista_tigrinho",
    },
    {
        id: "mestre_dos_sistemas",
        event: "achievement_all_achievements",
        title: "Mestre dos Sistemas",
        description: "Zere o jogo.",
        secret: true,
        iconKey: "conquista_estatua_melhor_empregado",
    },
    
];

const STORAGE_KEY = "mds_achievements";

// ─────────────────────────────────────────────────────────────────────────────

export default class AchievementManager {
    static instance = null;
    _listenersRegistered = false;

    static getInstance(scene) {
        if (!AchievementManager.instance) {
            AchievementManager.instance = new AchievementManager(scene);
        } else if (scene) {
            AchievementManager.instance._rebindScene(scene);
        }
        return AchievementManager.instance;
    }

    static getAllDefinitions() {
        return ACHIEVEMENTS.map(e => ({ ...e, secret: !!e.secret }));
    }

    constructor(scene) {
        // Singleton — se já existe, reaproveita e devolve a instância existente
        if (AchievementManager.instance) {
            AchievementManager.instance._rebindScene(scene);
            return AchievementManager.instance;
        }

        this.unlocked = this._load();
        this.toast    = new AchievementToast(scene);
        this._registerListeners();

        AchievementManager.instance = this;
    }

    // ── Persistência ──────────────────────────────────────────────────────────

    _load() {
        const parsed = LocalStorage.getJson(STORAGE_KEY);
        return new Set(Array.isArray(parsed) ? parsed : []);
    }

    _save() {
        LocalStorage.setJson(STORAGE_KEY, [...this.unlocked]);
    }

    // ── Cena ──────────────────────────────────────────────────────────────────

    _rebindScene(scene) {
        if (!scene) return;

        if (!this.toast) {
            this.toast = new AchievementToast(scene);
        } else {
            // Apenas atualiza a referência de cena — NÃO descarta a fila
            this.toast.rebindScene(scene);
        }

        if (!this._listenersRegistered) {
            this._registerListeners();
        }
    }

    // ── Listeners ─────────────────────────────────────────────────────────────

    _registerListeners() {
        let events;
        try {
            events = EventsManager.getInstance();
        } catch (err) {
            // EventsManager ainda não está pronto. Os listeners serão registrados
            // na próxima chamada de _rebindScene() (via getInstance(scene)), que
            // verifica _listenersRegistered e tenta novamente.
            console.warn("AchievementManager: EventsManager não está pronto. Listeners adiados.", err);
            return;
        }

        for (const achievement of ACHIEVEMENTS) {
            events.on(
                achievement.event,
                `AchievementManager:${achievement.id}`,
                () => this._unlock(achievement)
            );
        }

        this._listenersRegistered = true;
    }

    // ── Desbloqueio ───────────────────────────────────────────────────────────

    /**
     * Desbloqueia uma conquista, persiste e exibe o toast.
     * Conquistas já desbloqueadas são silenciosamente ignoradas.
     */
    _unlock(achievement) {
        if (this.unlocked.has(achievement.id)) return;

        this.unlocked.add(achievement.id);
        this._save();

        this.toast?.show(achievement.title, achievement.description);

        EventsManager.getInstance().emit("achievement:unlocked", { id: achievement.id });

        this._checkCosmeticAchievements();
    }

    _checkCosmeticAchievements() {
        const events = EventsManager.getInstance();
        const unlockedCosmetics = COSMETIC_ACHIEVEMENT_IDS.filter(id => this.unlocked.has(id)).length;

        // Colecionador: 3 conquistas cosméticas desbloqueadas
        if (!this.unlocked.has("colecionador") && unlockedCosmetics >= 3) {
            events.emit("achievement_3_cosmetics");
        }

        // Eu quero todos: todas as 5 cosméticas + colecionador desbloqueados
        const allDone = unlockedCosmetics === COSMETIC_ACHIEVEMENT_IDS.length
            && this.unlocked.has("colecionador");

        if (!this.unlocked.has("eu_quero_todos") && allDone) {
            events.emit("achievement_all_cosmetics");
        }
    }

    // ── API pública ───────────────────────────────────────────────────────────

    isUnlocked(id) {
        return this.unlocked.has(id);
    }

    /**
     * Desbloqueia uma conquista por id (com toast e persistência).
     * Usa o mesmo fluxo de `_unlock` para garantir consistência.
     */
    unlockById(id) {
        const achievement = ACHIEVEMENTS.find(a => a.id === id);
        if (achievement) this._unlock(achievement);
    }

    /**
     * Desbloqueia todas as conquistas silenciosamente (sem toast).
     * Útil para debug/testes.
     */
    unlockAll() {
        ACHIEVEMENTS.forEach(a => this.unlocked.add(a.id));
        this._save();
    }

    reset() {
        this.unlocked.clear();
        this._save();
    }
}
