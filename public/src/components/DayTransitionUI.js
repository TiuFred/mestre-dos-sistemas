import SceneManager from "./managers/SceneManager.js";

/**
 * Duração em ms da mensagem de fim de dia.
 * Exportada para que DayManager possa sincronizar seu delayedCall com esta janela.
 */
export const DAY_END_MESSAGE_DURATION = 1800;

/**
 * Duração em ms da mensagem de início de dia (incluindo fade-out).
 * @private
 */
const DAY_START_MESSAGE_DURATION = 2200;

/**
 * Responsável pelos painéis de transição entre dias:
 * - Mensagem de início de dia ("Dia X")
 * - Mensagem de fim de dia ("Dia X concluído!")
 *
 * Classe utilitária estática — sem estado, sem instância.
 *
 * Separada do DayManager para que lógica de fluxo de jogo e
 * apresentação visual fiquem em responsabilidades distintas.
 */
export default class DayTransitionUI {

    /**
     * Exibe a tela de início de dia com fade-in/fade-out.
     * Chama `onComplete` ao término da animação de saída.
     *
     * @param {number}   day
     * @param {Function} onComplete
     */
    static showDayStart(day, onComplete) {
        const scene = SceneManager.get().getScene();

        const panel = scene.add.rectangle(960, 540, 980, 180, 0x111111, 0.92)
            .setStrokeStyle(4, 0xF9C22B)
            .setDepth(4000);

        const dayLabel = scene.add.text(960, 490, day === 0 ? "MANHÃ DO DIA 1" : `Dia ${day}`, {
            fontFamily: "PressStart2P",
            fontSize: "48px",
            color: "#F9C22B",
            align: "center",
        }).setOrigin(0.5).setDepth(4001).setAlpha(0);

        const subLabel = scene.add.text(960, 570, _getDaySubtitle(day), {
            fontFamily: "PressStart2P",
            fontSize: "16px",
            color: "#AAAAAA",
            align: "center",
        }).setOrigin(0.5).setDepth(4001).setAlpha(0);

        scene.tweens.add({
            targets: [dayLabel, subLabel],
            alpha: 1,
            duration: 400,
            ease: "Power2.Out",
        });

        scene.time.delayedCall(DAY_START_MESSAGE_DURATION - 400, () => {
            scene.tweens.add({
                targets: [panel, dayLabel, subLabel],
                alpha: 0,
                duration: 400,
                ease: "Power2.In",
                onComplete: () => {
                    panel.destroy();
                    dayLabel.destroy();
                    subLabel.destroy();
                    onComplete();
                }
            });
        });
    }

    /**
     * Exibe a mensagem de fim de dia por `DAY_END_MESSAGE_DURATION` ms
     * e então se auto-destrói.
     *
     * @param {string} message
     */
    static showDayEnd(message) {
        const scene = SceneManager.get().getScene();

        const panel = scene.add.rectangle(960, 160, 980, 130, 0x111111, 0.88)
            .setStrokeStyle(4, 0xF9C22B)
            .setDepth(4000);

        const label = scene.add.text(960, 160, message, {
            fontFamily: "PressStart2P",
            fontSize: "24px",
            color: "#FFFFFF",
            align: "center",
            wordWrap: { width: 860 }
        })
            .setOrigin(0.5)
            .setDepth(4001);

        scene.time.delayedCall(DAY_END_MESSAGE_DURATION - 200, () => {
            panel.destroy();
            label.destroy();
        });
    }
}

/**
 * Retorna o subtítulo exibido no painel de início de cada dia.
 * @param {number} day
 * @returns {string}
 */
function _getDaySubtitle(day) {
    const subtitles = {
        0: "Bem vindo ao trabalho, mas você já conhece a chefe?",
        1: "Primeiro dia de trabalho. Boa sorte!",
        2: "Novos clientes, novos desafios.",
        3: "Último dia. Da seu melhor!",
    };
    return subtitles[day] ?? "";
}
