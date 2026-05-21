import { SCENES } from "../constants.js";
import SettingsManager from "../components/managers/SettingsManager.js";
import AccessibilityFilterManager from "../components/managers/AccessibilityFilterManager.js";

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.BOOT});
    }
   preload(){
        // ? Carregamento do arquivo JSON com a referência dos assets
        this.load.json("assets_manifest", "src/assets/assets.json");
   }
   create() {
        SettingsManager.load();
        AccessibilityFilterManager.applyCurrentSettings();
        // ? Transição para a cena de preload
        this.scene.start(SCENES.PRELOAD);
    }
}   
