
// * Importação das cenas do jogo
import Menu from './scenes/menu.js';
import Options from './scenes/options.js';
import GameScene from './scenes/game.js';
import BootScene from './scenes/boot.js'
import End from './scenes/end.js';
import ExamScene from './scenes/exam.js';
import DeveloperMessageScene from './scenes/developerMessage.js';
import PostExamDialogueScene from './scenes/postExamDialogue.js';
import PreloadScene from './scenes/preload.js';
import BudgetMinigameScene from './scenes/budgetMinigame.js';
import AchievementsScene from './scenes/achievements.js';
import MinigameDocumentOrder from './scenes/minigame.js';
import Costs from './scenes/costs.js';
import DayFeedbackScene from './scenes/dayFeedback.js';
import FabianaMinigameScene from './scenes/fabianaMinigame.js';
import MarceloMinigameScene from './scenes/marceloMinigame.js';
import PauseOverlayScene from './scenes/pauseOverlay.js';
import SaveSlotsScene from './scenes/saveSlots.js';
// ? Configurações da instância do jogo

const CONFIG = {
    type: Phaser.AUTO,
    // ? Definição do scale para o escalonamento do jogo, de acordo com o tamanho da tela
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // * Proporção 16:9
    width: 1920,
    height: 1080,
    parent: 'game',
    backgroundColor: '#8D1F1F',
    scene: [
        BootScene,
        PreloadScene,
        AchievementsScene,
        Menu,
        Options,
        GameScene,
        DayFeedbackScene,
        Costs,
        ExamScene,
        PostExamDialogueScene,
        End,
        DeveloperMessageScene,
        BudgetMinigameScene,
        MinigameDocumentOrder,
        FabianaMinigameScene,
        MarceloMinigameScene,
        PauseOverlayScene,
        SaveSlotsScene,
    ],
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    pixelArt: true,
    fps: {
        target: 30
    }
};
window.onload = () => {
    new Phaser.Game(CONFIG);
};
