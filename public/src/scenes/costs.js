import { SCENES } from "../constants.js";
import EventsManager from "../components/managers/EventsManager.js";
import PlayerMoneyManager from "../components/managers/PlayerMoneyManager.js";

const COST_OPTIONS = [
    { x: 420, y: 295, key: "botoes1", cost: 200, textOffsetX: -180, textOffsetY: -50 },
    { x: 1300, y: 195, key: "botoes2", cost: 30, textOffsetX: -140, textOffsetY: 60 },
    { x: 920, y: 240, key: "botoes3", cost: 160, textOffsetX: -240, textOffsetY: 10 },
];

export default class Costs extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.CUSTOS });
    }

    init(data) {
        this.minigameConfig = data?.config ?? {};
    }

    preload() {
        this.load.image("botoes1", "src/assets/minigames/Roberto/food.png");
        this.load.image("botoes2", "src/assets/minigames/Roberto/expel.png");
        this.load.image("botoes3", "src/assets/minigames/Roberto/outing.png");
        this.load.image("botoes4", "src/assets/minigames/Roberto/sofa.png");
        this.load.image("botoes5", "src/assets/minigames/Roberto/spa.png");
        this.load.image("fundo", "src/assets/minigames/Roberto/table.png");
    }

    create() {
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        let totalSpent = 0;
        const playerMoneyManager = PlayerMoneyManager.getInstance();
        const startingBalance = playerMoneyManager.getBalance();

        this.add.image(gameWidth / 2, gameHeight / 2, "fundo").setScale(1);

        const totalText = this.add.text(gameWidth - 100, 1015, "Total: R$ 0", {
            fontSize: "50px",
            color: "#000000",
            stroke: "#000000",
            strokeThickness: 6,
        }).setOrigin(1, 1);

        this.add.text(1060, 985, "Clique nas caixas para organizar os seus gastos.", {
            fontSize: "35px",
            color: "#000000",
            stroke: "#000000",
            strokeThickness: 5,
        }).setOrigin(1, 1);

        const currentMoneyText = this.add.text(600, 1020, "", {
            fontSize: "44px",
            color: "#000000",
            stroke: "#000000",
            strokeThickness: 5,
        }).setOrigin(1, 1);

        const limitText = this.add.text(1045, 1060, "", {
            fontSize: "35px",
            color: "#000000",
            stroke: "#000000",
            strokeThickness: 5,
        }).setOrigin(1, 1);

        const updateAvailableMoney = () => {
            const currentBalance = Math.max(0, startingBalance - totalSpent);
            currentMoneyText.setText(`Dinheiro atual: R$ ${currentBalance}`);
        };

        updateAvailableMoney();

        COST_OPTIONS.forEach((option) => {
            const optionButton = this.add.sprite(option.x, option.y, option.key)
                .setScale(1.5)
                .setInteractive({ pixelPerfect: true });

            optionButton.isActive = false;

            this.add.text(
                option.x + option.textOffsetX,
                option.y + option.textOffsetY,
                `R$ ${option.cost}`,
                {
                    fontSize: "40px",
                    color: "#000000",
                    stroke: "#000000",
                    strokeThickness: 5,
                }
            ).setOrigin(0.5);

            optionButton.on("pointerdown", () => {
                if (optionButton.isActive) {
                    optionButton.clearTint();
                    optionButton.isActive = false;
                    totalSpent -= option.cost;
                    limitText.setText("");
                } else {
                    if (totalSpent + option.cost > startingBalance) {
                        limitText.setText("Saldo insuficiente para selecionar esse gasto.");
                        return;
                    }

                    optionButton.setTint(0x00ff00);
                    optionButton.isActive = true;
                    totalSpent += option.cost;
                    limitText.setText("");
                }

                totalText.setText(`Total: R$ ${totalSpent}`);
                updateAvailableMoney();
            });
        });

        const finishButton = this.add.text(gameWidth - 180, 1050, "FINALIZAR", {
            fontSize: "40px",
            color: "#ffffff",
            backgroundColor: "#C0392B",
            stroke: "#ffffff",
            strokeThickness: 5,
            padding: { x: 30, y: 14 },
        })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        finishButton.on("pointerover", () => {
            finishButton.setStyle({ backgroundColor: "#E74C3C" });
        });

        finishButton.on("pointerout", () => {
            finishButton.setStyle({ backgroundColor: "#C0392B" });
        });

        finishButton.on("pointerdown", () => {
            const remainingBalance = playerMoneyManager.spend(totalSpent);

            EventsManager.getInstance().emit("minigame:scene_result", {
                success: totalSpent > 0,
                score: remainingBalance,
            });
        });
    }

}
