/**
 * Wrapper utilitário para localStorage com tratamento silencioso de erros.
 * Previne crashes em ambientes sem localStorage (modo privado, quota excedida, etc.).
 */
export const LocalStorage = {
    /** Retorna o valor bruto da chave, ou null se ausente/indisponível. */
    get(key) {
        try { return localStorage.getItem(key); }
        catch { return null; }
    },

    /** Armazena um valor bruto. Falha silenciosamente se indisponível. */
    set(key, value) {
        try { localStorage.setItem(key, value); }
        catch { /* indisponível */ }
    },

    /** Remove a chave. Falha silenciosamente se indisponível. */
    remove(key) {
        try { localStorage.removeItem(key); }
        catch { }
    },

    /** Retorna o valor deserializado de JSON, ou null em caso de erro. */
    getJson(key) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    },

    /** Serializa e armazena um valor como JSON. Falha silenciosamente se indisponível. */
    setJson(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); }
        catch { }
    },
};
