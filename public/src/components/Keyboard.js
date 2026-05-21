/**
 * Encapsula o sistema de teclado do Phaser, fornecendo acesso simplificado
 * ao estado das teclas registradas na cena.
 */
export default class Keyboard {
    /**
     * @param {Phaser.Scene} scene - A cena Phaser à qual o teclado está vinculado.
     */
    constructor(scene) {
        this.scene = scene;
        this.keys = null;
    }

    /**
     * Inicializa o teclado registrando o conjunto de teclas suportadas.
     * Deve ser chamado antes de qualquer uso dos métodos de consulta de teclas.
     * @throws {Error} Se o plugin de teclado não estiver habilitado na cena.
     */
    init() {
        if (!this.scene.input.keyboard) {
            throw new Error("Nenhum teclado habilitado na cena");
        }
        this.keys = this.scene.input.keyboard.addKeys("W,A,S,D,UP,LEFT,DOWN,RIGHT,ENTER,SPACE");
    }

    /**
     * Retorna o objeto de tecla do Phaser correspondente ao identificador informado.
     * @param {string} keyId - O identificador da tecla (ex: `"W"`, `"ENTER"`, `"SPACE"`).
     * @returns {Phaser.Input.Keyboard.Key} O objeto de tecla do Phaser.
     * @throws {Error} Se o teclado não tiver sido inicializado.
     * @throws {Error} Se a tecla informada não estiver entre as cadastradas.
     */
    getKey(keyId) {
        if (!this.keys) {
            throw new Error("Teclado não inicializado");
        }
        const key = this.keys[keyId];
        if (!key) {
            throw new Error(`Tecla "${keyId}" não cadastrada`);
        }
        return key;
    }

    /**
     * Verifica se uma tecla está pressionada no frame atual.
     * @param {string} keyId - O identificador da tecla.
     * @returns {boolean} `true` se a tecla estiver pressionada, `false` caso contrário.
     */
    isDown(keyId) {
        return this.getKey(keyId).isDown;
    }

    /**
     * Verifica se uma tecla foi pressionada exatamente neste frame (borda de subida).
     * @param {string} keyId - O identificador da tecla.
     * @returns {boolean} `true` se a tecla foi pressionada neste frame, `false` caso contrário.
     */
    isJustDown(keyId) {
        return Phaser.Input.Keyboard.JustDown(this.getKey(keyId));
    }
}