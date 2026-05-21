/**
 * Configuração para criação do botão.
 * 
 * @typedef {Object} ButtonConfig
 * @property {number} x - Posição X do botão.
 * @property {number} y - Posição Y do botão.
 * @property {number} width - Largura do botão.
 * @property {number} height - Altura do botão.
 * @property {number} [radius=8] - Raio da borda arredondada.
 * @property {string} text - Texto exibido no botão.
 * @property {Phaser.Types.GameObjects.Text.TextStyle} [textStyle] - Estilo do texto.
 * @property {number} [backgroundColor=0xffffff] - Cor de fundo (hexadecimal).
 * @property {Function} onClick - Função chamada ao clicar no botão.
 */
/**
 * Classe utilitária para criação de botões interativos.
 * 
 * TODO: Adicionar a opção de imagens como fundo
 * O botão é composto por:
 * - Um `Rectangle` como fundo
 * - Um `Text` centralizado
 * - Um `Container` agrupando ambos
 * 
 * Inclui efeitos de hover (scale) e controle de estado habilitado/desabilitado.
 */
export class Button {
    /**
     * @param {Phaser.Scene} scene - Cena onde o botão será criado.
     * @param {ButtonConfig} config - Configuração do botão.
     */
    constructor(scene, config) {
        /** @type {Phaser.Scene} */
        this.scene = scene;
        /** @type {ButtonConfig} */
        this.config = config;

        /** @type {Phaser.GameObjects.Container | null} */
        this.container = null;
        /** @type {Phaser.GameObjects.Rectangle | null} */
        this.background = null;
        /** @type {Phaser.GameObjects.Text | null} */
        this.label = null;
        /** @type {Phaser.Sound.BaseSound | null} */
        this.clickSound = null;

        this.create();
    }
    
    /**
     * Cria os elementos visuais do botão e configura interações.
     * @private
     * */
    create() {
        const {x, y, width, height, radius = 8, text, textStyle, backgroundColor, onClick} = this.config;
        this.clickSound = this.scene.sound.add("button");

        this.background = this.scene.add.rectangle(0, 0, width, height, backgroundColor).setRounded(radius)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown',
                onClick)
            .on('pointerover', () => {
                this.background.setScale(1.05)
                this.label.setScale(1.05)
            })
            .on('pointerout', () => {
                this.background.setScale(1)
                this.label.setScale(1)
            });

        this.label = this.scene.add.text(0, 0, text, textStyle).setOrigin(0.5);

        this.container = this.scene.add.container(x, y, [this.background, this.label])
            .setDepth(5000); // depth aplicado aqui
    }

    /**
     * Atualiza o texto do botão.
     * @param {string} text - Novo texto.
    */
    setText(text) {
        this.label.setText(text);
    }

    /**
     * Habilita ou desabilita o botão visual e interativamente.
     * 
     * @param {boolean} enabled - Define se o botão está habilitado.
    */
    setEnabled(enabled) {
        this.background.disableInteractive();

        if (enabled) {
            this.background.setInteractive({ useHandCursor: true });
        }

        this.container.setAlpha(enabled ? 1 : 0.5);
        return this;
    }
    /**
     * Remove completamente o botão da cena.
     */
    destroy() {
        this.container.destroy(true);
    }
}
