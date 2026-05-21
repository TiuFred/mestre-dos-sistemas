import { SCENES } from "../constants.js";

export default class SettingsOverlay {
    constructor(scene, { overlaySceneKey = SCENES.PAUSE_OVERLAY } = {}) {
        this._scene = scene;
        this._overlaySceneKey = overlaySceneKey;
    }

    get isOpen() {
        return this._scene.scene.isActive(this._overlaySceneKey);
    }

    open() {
        if (this.isOpen) { return; }

        this._scene.setPauseMenuOpen?.(true);
        this._scene.scene.launch(this._overlaySceneKey, {
            originSceneKey: this._scene.scene.key,
        });
        this._scene.scene.pause();
    }

    close() {
        if (!this.isOpen) { return; }

        const overlayScene = this._scene.scene.get(this._overlaySceneKey);
        overlayScene?._closeOverlay?.();
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }
}
