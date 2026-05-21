import YAML from "https://cdn.jsdelivr.net/npm/yaml@2/+esm";

/**
 * Lê e parseia um arquivo YAML armazenado no cache de texto da cena.
 *
 * @param {Phaser.Scene} scene - Cena com o cache de texto populado.
 * @param {string}       key   - Chave do texto YAML no cache.
 * @returns {*} Objeto JavaScript resultante do parse.
 */
export function loadYamlFromCache(scene, key) {
    const yamlText = scene.cache.text.get(key);
    return YAML.parse(yamlText);
}
