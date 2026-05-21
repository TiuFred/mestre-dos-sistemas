/**
 * Gerenciador de eventos global baseado em Singleton.
 *
 * Suporta múltiplos listeners por evento via `on(event_id, listenerId, cb)`.
 * O método legado `register(event_id, cb)` continua funcionando — ele usa
 * o próprio `event_id` como `listenerId`, mantendo o comportamento 1:1 anterior.
 */
export default class EventsManager {
    /** @type {EventsManager|null} */
    static instance = null;

    /** @type {Phaser.Scene|null} */
    scene = null;

    /**
     * Mapa de listeners: event_id → { listenerId → wrappedCallback }
     * @type {Object.<string, Object.<string, Function>>}
     */
    _listeners = {};

    constructor(scene) {
        if (EventsManager.instance) {
            EventsManager.instance._rebindScene(scene);
            return EventsManager.instance;
        }
        this.scene = scene;
        EventsManager.instance = this;
    }

    /**
     * Reanexa todos os listeners rastreados ao emitter da nova cena ativa.
     * Isso mantém os singletons funcionando após transições/recriações de cena.
     * @param {Phaser.Scene} scene
     */
    _rebindScene(scene) {
        const previousScene = this.scene;
        this.scene = scene;

        if (!scene || previousScene === scene) { return; }

        for (const [eventId, group] of Object.entries(this._listeners)) {
            for (const callback of Object.values(group)) {
                previousScene?.events?.off(eventId, callback);
                scene.events.on(eventId, callback);
            }
        }
    }

    static getInstance() {
        if (!EventsManager.instance) {
            throw new Error('EventsManager não inicializado.');
        }
        return EventsManager.instance;
    }

    /**
     * Registra um listener identificado por `listenerId` para um `event_id`.
     * Se já existir um listener com o mesmo `(event_id, listenerId)`, ele é
     * substituído — útil para re-registros sem empilhamento.
     *
     * @param {string}   event_id   - Identificador do evento.
     * @param {string}   listenerId - Chave única do listener dentro do evento.
     * @param {Function} callback   - Função chamada quando o evento for emitido.
     */
    on(event_id, listenerId, callback) {
        if (!this.scene) { throw new Error('EventsManager: cena não inicializada.'); }

        if (!this._listeners[event_id]) { 
            this._listeners[event_id] = {}; 
        }

        // Remove versão anterior do mesmo (event_id, listenerId) se existir
        if (this._listeners[event_id][listenerId]) {
            this.scene.events.off(event_id, this._listeners[event_id][listenerId]);
        }

        this._listeners[event_id][listenerId] = callback;
        this.scene.events.on(event_id, callback);
    }

    /**
     * Remove o listener identificado por `(event_id, listenerId)`.
     * Chamada silenciosa se não houver nada registrado.
     *
     * @param {string} event_id   - Identificador do evento.
     * @param {string} listenerId - Chave do listener a remover.
     */
    off(event_id, listenerId) {
        const group = this._listeners[event_id];
        if (!group || !group[listenerId]) { return; }
        this.scene.events.off(event_id, group[listenerId]);
        delete group[listenerId];
    }

    /**
     * API legada — mantém compatibilidade total com o código existente.
     * Usa o `event_id` como `listenerId`, garantindo comportamento 1:1.
     *
     * @param {string}   event_id
     * @param {Function} callback
     */
    register(event_id, callback) {
        this.on(event_id, event_id, callback);
    }

    /**
     * Remove todos os listeners de um evento.
     * @param {string} event_id
     */
    unregisterAll(event_id) {
        const group = this._listeners[event_id];
        if (!group) { return; }
        for (const cb of Object.values(group)) {
            this.scene.events.off(event_id, cb);
        }
        delete this._listeners[event_id];
    }

    /** API legada — remove pelo listenerId = event_id. */
    unregister(event_id) {
        this.off(event_id, event_id);
    }

    /**
     * Emite um evento, acionando todos os listeners registrados.
     * @param {string} event_id
     * @param {*}      [payload]
     */
    emit(event_id, payload) {
        this.scene.events.emit(event_id, payload);
    }

    /**
     * Registra um listener que dispara uma única vez e se remove automaticamente.
     * @param {string}   event_id
     * @param {Function} callback
     */
    once(event_id, callback) {
        if (!this.scene) { throw new Error('EventsManager: cena não inicializada.'); }

        if (!this._listeners[event_id]) {
            this._listeners[event_id] = {};
        }

        const listenerId = `once:${event_id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        const wrappedCallback = (...args) => {
            try {
                callback(...args);
            } finally {
                this.off(event_id, listenerId);
            }
        };

        this._listeners[event_id][listenerId] = wrappedCallback;
        this.scene.events.on(event_id, wrappedCallback);
    }
}
