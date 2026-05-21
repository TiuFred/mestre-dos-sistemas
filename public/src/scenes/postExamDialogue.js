import { SCENES, SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants.js";
import DialogueManager from "../components/managers/DialogueManager.js";
import EventsManager from "../components/managers/EventsManager.js";
import SettingsManager from "../components/managers/SettingsManager.js";

export default class PostExamDialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.POST_EXAM_DIALOGUE });
    }

    init(data) {
        this.endingId = data?.ending ?? null;
    }

    create() {
        new EventsManager(this);
        new DialogueManager(this);

        this._loadScenario();
        this.add.image(500, 500, "client_laiza").setScale(2.9);

        this.brightnessOverlay = this.add.rectangle(
            SCREEN_WIDTH / 2,
            SCREEN_HEIGHT / 2,
            SCREEN_WIDTH,
            SCREEN_HEIGHT,
            0x000000
        ).setDepth(9999).setAlpha(1 - SettingsManager.brightness);

        EventsManager.getInstance().once("dialogue_end", () => {
            this.scene.start(SCENES.END, {
                ending: this.endingId,
            });
        });

        DialogueManager.getInstance().loadDialogueGraph(
            "dialogue_laiza",
            "laiza_pos_prova_inicio",
            "Laíza"
        );
    }

    update() {
        DialogueManager.getInstance().update();
    }

    _loadScenario() {
        this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "background_scenario_back_painting").setOrigin(0.5).setScale(1.79);
        this.add.image(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, "background_scenario_atm").setOrigin(0.5).setScale(1.79);
        this.add.image(SCREEN_WIDTH / 2 + 453, SCREEN_HEIGHT / 2, "background_scenario_drawer").setScale(7.55, 6.4).setDepth(2);
        this.add.rectangle(100, 500, 250, SCREEN_HEIGHT, 0x8D1F1F).setDepth(2);
        this.add.image(960, SCREEN_HEIGHT / 2, "background_scenario_window_frame").setScale(1.79).setDepth(2);
        this.add.image(960 / 2 + 50, SCREEN_HEIGHT * 0.87, "background_scenario_drawer2").setScale(6.40).setDepth(2);
        this.add.image(950, 630, "item_plant").setScale(2).setDepth(2);
    }
}
