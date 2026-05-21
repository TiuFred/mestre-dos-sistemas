/**
 * Gerenciador de cena global baseado em Singleton.
 * Mantém uma referência centralizada à cena Phaser ativa,
 * permitindo acesso a ela de qualquer parte da aplicação.
 */
export default class SceneManager {
    /**
     * Instância única da classe (padrão Singleton).
     * @type {SceneManager|null}
     */
    static instance = null;

    /**
     * A cena Phaser gerenciada.
     * @type {Phaser.Scene|null}
     */
    scene = null;

    /**
     * @param {Phaser.Scene} scene - A cena Phaser a ser gerenciada.
     */
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Inicializa o Singleton com a cena fornecida.
     * Se já houver uma instância, atualiza a referência de cena para a nova cena ativa.
     * @param {Phaser.Scene} scene - A cena Phaser a ser armazenada.
     */
    static init(scene) {
        if (!SceneManager.instance) {
            SceneManager.instance = new SceneManager(scene);
        } else {
            SceneManager.instance.scene = scene;
        }
        return SceneManager.instance;
    }

    /**
     * Retorna a instância existente do SceneManager.
     * @returns {SceneManager} A instância singleton.
     * @throws {Error} Se a instância ainda não tiver sido inicializada.
     */
    static get() {
        if (!SceneManager.instance) throw new Error("Nenhuma cena inicializada");
        return SceneManager.instance;
    }

    /**
     * Retorna a cena Phaser armazenada na instância.
     * @returns {Phaser.Scene} A cena Phaser ativa.
     */
    getScene() {
        return this.scene;
    }
}
