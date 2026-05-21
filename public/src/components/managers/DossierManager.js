import { loadYamlFromCache } from "../yamlLoader.js";

export default class DossierManager {
    static dossiers = [];

    static loadFromCache(scene, key = "dossiers") {
        const data = loadYamlFromCache(scene, key);
        this.loadDossiers(data);
    }

    static loadDossiers(dossiers) {
        this.dossiers = Array.isArray(dossiers) ? dossiers : [];
    }

    static getDossier(characterName, day = null) {
        if (this.dossiers.length === 0) {
            throw new Error("Nenhum dossie carregado");
        }

        let dossier = null;

        if (day !== null) {
            dossier = this.dossiers.find(entry => entry.name === characterName && entry.day === day);
        }

        if (!dossier) {
            dossier = this.dossiers.find(entry => entry.name === characterName);
        }

        if (!dossier) {
            throw new Error(`Dossie do personagem '${characterName}' nao encontrado`);
        }

        return {
            record: dossier.record || null,
            report: Array.isArray(dossier.report) ? dossier.report : []
        };
    }
}
