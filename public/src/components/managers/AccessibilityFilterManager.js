import SettingsManager from "./SettingsManager.js";

export default class AccessibilityFilterManager {
    static applyCurrentSettings() {
        this.applyColorFilter(SettingsManager.colorFilterCss);
    }

    static applyColorFilter(filterCss = "none") {
        const root = document.getElementById("game");
        if (!root) {
            return;
        }

        const target = root.querySelector("canvas") ?? root;

        root.dataset.colorFilter = SettingsManager.colorFilter ?? "Nenhum";
        root.style.filter = target === root ? filterCss : "none";
        root.style.webkitFilter = target === root ? filterCss : "none";

        if (target !== root) {
            target.style.filter = filterCss;
            target.style.webkitFilter = filterCss;
        }
    }
}
