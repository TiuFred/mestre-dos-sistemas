import { LocalStorage } from "../LocalStorage.js";

/**
 * Gerencia todas as configurações globais do jogo.
 * Classe estática — sem instância, sem singleton.
 *
 * Uso:
 *   SettingsManager.setVolume(0.8);
 *   console.log(SettingsManager.volume); // 0.8
 */
export default class SettingsManager {
    static FONT_SIZE_PRESETS = Object.freeze({
        Pequeno: 0.9,
        Normal: 1,
        Grande: 1.18,
    });

    static COLOR_FILTER_PRESETS = Object.freeze({
        Nenhum: "none",
        Protanopia: "cb-filter-protanopia",
        Deuteranopia: "cb-filter-deuteranopia",
        Tritanopia: "cb-filter-tritanopia",
    });

    // ── Áudio ─────────────────────────────────────────────────────────────────
    static #volume    = 1;
    static #sfxVolume = 1;
    static #muted     = false;

    // ── Vídeo ─────────────────────────────────────────────────────────────────
    static #brightness = 1;
    static #resolution = "1920x1080";
    static #fullscreen = false;

    // ── Gameplay ──────────────────────────────────────────────────────────────
    static #textSpeed = 1;

    // ── Acessibilidade ────────────────────────────────────────────────────────
    static #fontSize     = "Normal";
    static #highContrast = false;
    static #colorFilter  = "Nenhum";

    // Previne saves parciais durante a desserialização.
    static #loading = false;

    // ── Getters / Setters — Áudio ─────────────────────────────────────────────

    static get volume()    { return this.#volume; }
    static setVolume(v)    { this.#volume    = Phaser.Math.Clamp(v, 0, 1); this.save(); }

    static get sfxVolume() { return this.#sfxVolume; }
    static setSfxVolume(v) { this.#sfxVolume = Phaser.Math.Clamp(v, 0, 1); this.save(); }

    static get muted()     { return this.#muted; }
    static setMuted(v)     { this.#muted = !!v; this.save(); }

    // ── Getters / Setters — Vídeo ─────────────────────────────────────────────

    static get brightness()    { return this.#brightness; }
    static setBrightness(v)    { this.#brightness = Phaser.Math.Clamp(v, 0, 1); this.save(); }

    static get resolution()    { return this.#resolution; }
    static setResolution(v)    { this.#resolution = v; this.save(); }

    static get fullscreen()    { return this.#fullscreen; }
    static setFullscreen(v)    { this.#fullscreen = !!v; this.save(); }

    // ── Getters / Setters — Gameplay ──────────────────────────────────────────

    static get textSpeed()     { return this.#textSpeed; }
    static setTextSpeed(v)     { this.#textSpeed = Phaser.Math.Clamp(v, 0.5, 2); this.save(); }

    // ── Getters / Setters — Acessibilidade ───────────────────────────────────

    static get fontSize()      { return this.#fontSize; }
    static setFontSize(v)      {
        this.#fontSize = Object.hasOwn(this.FONT_SIZE_PRESETS, v) ? v : "Normal";
        this.save();
    }

    static get fontScale() {
        return this.FONT_SIZE_PRESETS[this.#fontSize] ?? this.FONT_SIZE_PRESETS.Normal;
    }

    static get highContrast()  { return this.#highContrast; }
    static setHighContrast(v)  { this.#highContrast = !!v; this.save(); }

    static get colorFilter()   { return this.#colorFilter; }
    static setColorFilter(v)   {
        this.#colorFilter = Object.hasOwn(this.COLOR_FILTER_PRESETS, v) ? v : "Nenhum";
        this.save();
    }

    static get colorFilterCss() {
        const filterId = this.COLOR_FILTER_PRESETS[this.#colorFilter] ?? "none";
        return filterId === "none" ? "none" : `url(#${filterId})`;
    }

    // ── Persistência ─────────────────────────────────────────────────────────

    /** Salva todas as configurações em localStorage. Ignorado durante desserialização. */
    static save() {
        if (this.#loading) return;
        LocalStorage.setJson("settings", this.serialize());
    }

    /** Carrega configurações de localStorage (chama no boot do jogo). */
    static load() {
        const data = LocalStorage.getJson("settings");
        if (data) this.deserialize(data);
    }

    static serialize() {
        return {
            volume:       this.#volume,
            sfxVolume:    this.#sfxVolume,
            muted:        this.#muted,
            brightness:   this.#brightness,
            resolution:   this.#resolution,
            fullscreen:   this.#fullscreen,
            textSpeed:    this.#textSpeed,
            fontSize:     this.#fontSize,
            highContrast: this.#highContrast,
            colorFilter:  this.#colorFilter,
        };
    }

    static deserialize(data) {
        if (!data) return;
        this.#loading = true;
        try {
            if (data.volume       != null) this.setVolume(data.volume);
            if (data.sfxVolume    != null) this.setSfxVolume(data.sfxVolume);
            if (data.muted        != null) this.setMuted(data.muted);
            if (data.brightness   != null) this.setBrightness(data.brightness);
            if (data.resolution   != null) this.setResolution(data.resolution);
            if (data.fullscreen   != null) this.setFullscreen(data.fullscreen);
            if (data.textSpeed    != null) this.setTextSpeed(data.textSpeed);
            if (data.fontSize     != null) this.setFontSize(data.fontSize);
            if (data.highContrast != null) this.setHighContrast(data.highContrast);
            if (data.colorFilter  != null) this.setColorFilter(data.colorFilter);
        } finally {
            this.#loading = false;
        }
        this.save();
    }

    static reset() {
        this.#volume = 1; this.#sfxVolume = 1; this.#muted = false;
        this.#brightness = 1; this.#resolution = "1920x1080"; this.#fullscreen = false;
        this.#textSpeed = 1; this.#fontSize = "Normal"; this.#highContrast = false;
        this.#colorFilter = "Nenhum";
        this.save();
    }
}
