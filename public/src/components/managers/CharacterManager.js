import { loadYamlFromCache } from "../yamlLoader.js";

/**
 * Gerencia os dados dos personagens do jogo: carregamento, filtragem por dia
 * e acesso aos dados de diálogo e relatório.
 *
 * Animações de entrada/saída de personagens são responsabilidade de CharacterAnimator.
 */
export default class CharacterManager {
    /**
     * Lista de todos os personagens carregados.
     * @type {Array<Object>}
     */
    static characters = [];

    /**
     * Carrega os personagens a partir de um texto YAML armazenado no cache da cena.
     * @param {Phaser.Scene} scene - A cena Phaser que contém o cache de texto.
     * @param {string} [key="characters"] - A chave do texto YAML no cache.
     */
    static loadFromCache(scene, key = "characters") {
        const data = loadYamlFromCache(scene, key);
        this.loadCharacters(data);
    }

    /**
     * Define a lista de personagens diretamente.
     * @param {Array<Object>} characters - Array de objetos representando os personagens.
     */
    static loadCharacters(characters) {
        this.characters = characters;
    }

    static _requireCharacters() {
        if (this.characters.length === 0) {
            throw new Error("Nenhum personagem carregado");
        }
    }

    /**
     * Retorna os personagens disponíveis em um determinado dia, ordenados pelo campo `order`.
     * @param {number|string} day - O identificador do dia.
     * @returns {Array<Object>} Array de personagens do dia, ordenados por `order`.
     * @throws {Error} Se nenhum personagem estiver carregado.
     */
    static getCharactersOfDay(day) {
        this._requireCharacters();
        return this.characters
            .filter(character => character.days?.some(d => d.day === day))
            .sort((a, b) => {
                const orderA = a.days.find(d => d.day === day)?.order ?? 0;
                const orderB = b.days.find(d => d.day === day)?.order ?? 0;
                return orderA - orderB;
            });
    }

    /**
     * Retorna o diálogo inicial de um personagem em um determinado dia.
     * @param {string} characterName - O nome do personagem.
     * @param {number|string} day - O identificador do dia.
     * @returns {string|null} O diálogo inicial do personagem no dia, ou `null` se não houver.
     * @throws {Error} Se nenhum personagem estiver carregado ou o personagem não for encontrado.
     */
    static getStartDialogue(characterName, day) {
        this._requireCharacters();
        const character = this.characters.find(c => c.name === characterName && c.days?.some(d => d.day === day));
        if (!character) { throw new Error(`Personagem '${characterName}' não encontrado para o dia ${day}`); }
        const dayData = character.days.find(d => d.day === day);
        return dayData ? (dayData.start_dialogue || null) : null;
    }

    /**
     * Retorna os dados (record e report) de um personagem.
     * Quando há entradas duplicadas (mesmo nome em dias diferentes),
     * o parâmetro `day` garante que a entrada correta seja retornada.
     * @param {string} characterName - O nome do personagem.
     * @param {number|string|null} [day=null] - O dia para desambiguar entradas duplicadas.
     * @returns {{ record: Object|null, report: Array<string> }}
     */
    static getCharacterData(characterName, day = null) {
        this._requireCharacters();

        let character;
        if (day !== null) {
            character = this.characters.find(c => c.name === characterName && c.days?.some(d => d.day === day));
        }
        if (!character) {
            character = this.characters.find(c => c.name === characterName);
        }
        if (!character) {
            throw new Error(`Personagem '${characterName}' não encontrado`);
        }

        return {
            record: character.record || null,
            report: character.report || []
        };
    }
}
