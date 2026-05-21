// ! Constantes - Não alterar
export const SCREEN_WIDTH = 1920; // ? Largura da tela
export const SCREEN_HEIGHT = 1080; // ? Altura da tela


export const SCENES = {
    BOOT: "boot",
    PRELOAD: "preload",
    MENU: "menu",
    GAME: "game",
    CUSTOS: "custos",
    DAY_FEEDBACK: "day_feedback",
    SETTINGS: "settings",
    CREDITS: "credits",
    EXAM: "exam",
    POST_EXAM_DIALOGUE: "post_exam_dialogue",
    END: "end",
    DEVELOPER_MESSAGE: "developer_message",
    BUDGET_MINIGAME: "budget_minigame",
    ACHIEVEMENTS: "achievements",
    FABIANA_MINIGAME: "fabiana_minigame",
    MARCELO_MINIGAME: "marcelo_minigame",
    TUTORIAL: "tutorial",
    PAUSE_OVERLAY: "pause_overlay",
    SAVE_SLOTS: "save_slots",
}

export const DIALOG_TEXT_STYLE = {
    color: "#000000",
    fontSize: "28px",
    fontStyle: "bold",
    fontFamily: "PressStart2P",
};
export const DIALOGUE_BOX_PROPERTIES = {
    width: 1700,
    height: 250,
    radius: 20,
    backgroundColor: 0xF9C22B, 
    strokeColor: 0x000000, 
    strokeWidth: 5
}

export const dialogTextStyle = DIALOG_TEXT_STYLE;
export const dialogueBoxPropertys = DIALOGUE_BOX_PROPERTIES;

export const IGNORED_MINIGAME_KEYS = ["teste", "pular"];

export const DEBUG_START_AT_END = false;
export const DEBUG_ENDING_ID = "bom";
