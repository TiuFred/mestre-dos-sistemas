import SceneManager from "./managers/SceneManager.js";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants.js";

/**
 * Responsável pelas animações de entrada e saída de personagens na cena.
 * Classe utilitária estática — sem estado, sem instância.
 *
 * Separada do CharacterManager para que gerenciamento de dados de personagens
 * e lógica de apresentação visual fiquem em responsabilidades distintas.
 */
export default class CharacterAnimator {

    /**
     * Anima a entrada de um personagem na cena em três fases:
     * desliza como sombra pela lateral, pausa brevemente e depois revela o sprite com claridade progressiva.
     *
     * @param {string}        textureKey  - Chave da textura no cache do Phaser.
     * @param {number}        targetX     - Posição X final.
     * @param {number}        targetY     - Posição Y final.
     * @param {number}        [scale=1]   - Escala aplicada à imagem.
     * @param {Function|null} [onComplete=null] - Callback ao término da animação.
     * @returns {Phaser.GameObjects.Image}
     */
    static enter(textureKey, targetX, targetY, scale = 1, onComplete = null) {
        const scene = SceneManager.get().getScene();
        const startX = -200;

        const image = scene.add.image(startX, targetY, textureKey)
            .setOrigin(0.5, 1)
            .setScale(scale)
            .setAlpha(0)
            .setTint(0x111111)
            .setDepth(1);

        const maskGraphics = scene.make.graphics();
        maskGraphics.fillRect(200, 0, SCREEN_WIDTH - 250, SCREEN_HEIGHT);
        image.setMask(maskGraphics.createGeometryMask());
        image.__maskGraphics = maskGraphics;
        image.once("destroy", () => {
            image.__maskGraphics?.destroy();
            image.__maskGraphics = null;
        });

        // ── Fase 1: desliza pela lateral como sombra ──────────────────────────
        scene.tweens.add({
            targets: image,
            x: targetX + 25,
            alpha: 0.45,
            duration: 1400,
            ease: "Power2.easeOut",
            onComplete: () => {
                // ── Pausa — sombra parada ─────────────────────────────────────
                scene.time.delayedCall(700, () => {
                    // ── Fase 2: clareia — revela o sprite ────────────────────
                    scene.tweens.add({
                        targets: image,
                        alpha: 1,
                        duration: 1100,
                        ease: "Sine.easeOut",
                        onUpdate: (tween) => {
                            const p = tween.progress;
                            const channel = Math.floor(Phaser.Math.Linear(0x11, 0xff, p));
                            image.setTint(Phaser.Display.Color.GetColor(channel, channel, channel));
                        },
                        onComplete: () => {
                            image.clearTint();
                            onComplete?.();
                        }
                    });
                });
            }
        });

        return image;
    }

    /**
     * Anima a saída de um personagem da cena em três fases:
     * escurece progressivamente até virar sombra, pausa brevemente
     * e então desliza para fora pela direita.
     *
     * @param {Phaser.GameObjects.Image|null} image       - Imagem a remover.
     * @param {Function|null}                 [onComplete=null] - Callback após destruição.
     */
    static exit(image, onComplete = null) {
        if (!image) { onComplete?.(); return; }
        const scene = SceneManager.get().getScene();

        // ── Fase 1: escurece — vira sombra ────────────────────────────────────
        scene.tweens.add({
            targets: image,
            alpha: 0.45,
            duration: 1000,
            ease: "Sine.easeIn",
            onUpdate: (tween) => {
                const p = tween.progress;
                const channel = Math.floor(Phaser.Math.Linear(0xff, 0x11, p));
                image.setTint(Phaser.Display.Color.GetColor(channel, channel, channel));
            },
            onComplete: () => {
                // ── Pausa — sombra parada um momento ─────────────────────────
                scene.time.delayedCall(500, () => {
                    // ── Fase 2: sai pela direita ──────────────────────────────
                    scene.tweens.add({
                        targets: image,
                        x: SCREEN_WIDTH + 200,
                        alpha: 0,
                        duration: 1400,
                        ease: "Power2.easeIn",
                        onComplete: () => {
                            image.__maskGraphics?.destroy();
                            image.__maskGraphics = null;
                            image.destroy();
                            onComplete?.();
                        }
                    });
                });
            }
        });
    }
}
