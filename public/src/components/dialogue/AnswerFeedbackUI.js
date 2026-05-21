/**
 * Componente responsável pelo feedback visual de resposta correta/incorreta.
 * Exibe "CERTO!" ou "ERRADO!" com animação de pop-in/pop-out no centro da tela.
 */
export default class AnswerFeedbackUI {
    #scene;

    /**
     * @param {Phaser.Scene} scene
     */
    constructor(scene) {
        this.#scene = scene;
    }

    /**
     * Atualiza a referência de cena após uma transição.
     * @param {Phaser.Scene} scene
     */
    rebindScene(scene) {
        this.#scene = scene;
    }

    /**
     * Exibe o feedback animado de acerto ou erro.
     * O objeto de texto se cria e se destrói automaticamente.
     * @param {boolean} isCorrect
     */
    show(isCorrect) {
        const scene = this.#scene;
        const centerX = scene.cameras.main.centerX + 120;
        const centerY = scene.cameras.main.centerY;

        const text = scene.add.text(centerX, centerY, isCorrect ? "CERTO! +40" : "ERRADO! - 10", {
            fontFamily: "Arial Black, Impact, sans-serif",
            fontSize: "96px",
            fontStyle: "bold",
            color: isCorrect ? "#00e64d" : "#ff2222",
            stroke: "#000000",
            strokeThickness: 8,
            shadow: { offsetX: 4, offsetY: 4, color: "#000000", blur: 8, fill: true }
        });

        text.setOrigin(0.5, 0.5);
        text.setAngle(45);
        text.setDepth(9999);
        text.setAlpha(0);

        scene.tweens.add({
            targets: text,
            alpha: { from: 0, to: 1 },
            scaleX: { from: 0.3, to: 1.1 },
            scaleY: { from: 0.3, to: 1.1 },
            duration: 180,
            ease: "Back.Out",
            onComplete: () => {
                scene.tweens.add({
                    targets: text,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 80,
                    ease: "Linear",
                    onComplete: () => {
                        scene.time.delayedCall(900, () => {
                            scene.tweens.add({
                                targets: text,
                                alpha: 0,
                                scaleX: 1.4,
                                scaleY: 1.4,
                                duration: 350,
                                ease: "Power2.In",
                                onComplete: () => { text.destroy(); }
                            });
                        });
                    }
                });
            }
        });
    }
}
