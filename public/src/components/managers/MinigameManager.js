import EventsManager from './EventsManager.js';
import SceneManager  from './SceneManager.js';
import { IGNORED_MINIGAME_KEYS } from '../../constants.js';

/**
 * Gerenciador central de minijogos, baseado em Singleton.
 *
 * Responsabilidades:
 *  - Receber a solicitação de lançamento via evento `minigame:start`.
 *  - Lançar a cena Phaser correspondente ao tipo de minijogo.
 *  - Ouvir o resultado da cena (`minigame:scene_result`) e reemitir
 *    como `minigame:end` com payload padronizado para o `DayManager`.
 *
 * Fluxo de eventos:
 *  DayManager            →  emit('minigame:start', { type, config })
 *  MinigameManager       →  lança cena Phaser
 *  Cena do minijogo      →  emit('minigame:scene_result', { success, score, ... })
 *  MinigameManager       →  emit('minigame:end', { success, score, type })
 *  DayManager            →  ouve 'minigame:end' → startDay()
 */
export default class MinigameManager {
    /** @type {MinigameManager|null} */
    static instance = null;

    /** @type {string|null} Tipo do minijogo em execução. */
    _activeType = null;

    constructor() {
        if (MinigameManager.instance) { return MinigameManager.instance; }
        MinigameManager.instance = this;
        this._registerListeners();
    }

    static getInstance() {
        if (!MinigameManager.instance) {
            throw new Error('MinigameManager não inicializado.');
        }
        return MinigameManager.instance;
    }

    /**
     * Registra os listeners permanentes do manager.
     * Usa `listenerId` explícito para permitir múltiplos listeners no mesmo evento
     * sem conflitar com outros managers.
     * @private
     */
    _registerListeners() {
        const em = EventsManager.getInstance();

        // Ouve pedido de início de minijogo (emitido pelo DayManager)
        em.on('minigame:start', 'MinigameManager', (payload) => {
            this._startMinigame(payload);
        });

        // Ouve resultado emitido pela cena do minijogo
        em.on('minigame:scene_result', 'MinigameManager', (payload) => {
            this._onSceneResult(payload);
        });
    }

    /**
     * Lança a cena Phaser correspondente ao tipo de minijogo recebido.
     * A cena pai (game) é pausada para não processar updates durante o minijogo.
     * Aceita qualquer key que seja uma cena registrada no Phaser.
     * Keys marcadas como "pular" são ignoradas e emitem fim imediato.
     *
     * @param {{ type: string, config?: Object }} payload
     * @private
     */
    _startMinigame({ type, config = {} }) {
        // Keys ignoradas — emite fim imediato sem lançar cena
        if (!type || IGNORED_MINIGAME_KEYS.includes(type)) {
            EventsManager.getInstance().emit('minigame:end', { success: true, score: 0, type, skipped: true });
            return;
        }

        this._activeType = type;

        const mainScene = SceneManager.get().getScene();
        mainScene.scene.pause();                  // pausa a cena de jogo principal
        mainScene.scene.launch(type, { config }); // lança cena do minijogo em paralelo
    }

    /**
     * Recebe o resultado da cena do minijogo, encerra a cena, retoma a cena principal
     * e reemite o resultado padronizado como `minigame:end`.
     *
     * @param {{ success: boolean, score?: number }} payload
     * @private
     */
    _onSceneResult(payload) {
        const mainScene = SceneManager.get().getScene();
        const type = this._activeType;

        if (!type) {
            console.warn("MinigameManager: resultado recebido sem minijogo ativo.", payload);
            return;
        }

        mainScene.scene.stop(type);    // encerra a cena do minijogo
        mainScene.scene.resume();      // retoma a cena principal

        this._activeType = null;

        EventsManager.getInstance().emit('minigame:end', {
            success: payload?.success ?? false,
            score:   payload?.score   ?? 0,
            type,
        });
    }
}
