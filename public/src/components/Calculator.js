import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants.js";

const PANEL_SCALE    = 0.42;
const PANEL_OFFSET_X = 100;
const MAX_DIGITS     = 9;

const REFERENCE_PANEL_SIZE = { width: 617, height: 939 };

const CALCULATOR_LAYOUT = {
    display: { x: 0, y: -292, fontSize: 100 },
    buttons: {
        width:   86,
        height:  86,
        columns: [-205, -73, 57, 187],
        rows:    [-83,  62, 207, 348],
    },
};

// Mapa de rótulo → valor interno para cada tecla.
// Separa o que o jogador vê do que a lógica processa.
const BUTTON_LAYOUT = [
    ["7",   "8", "9", "+"],
    ["4",   "5", "6", "-"],
    ["1",   "2", "3", "/"],
    ["DEL", "0", "=", "*"],
];

/**
 * Componente visual de calculadora interativa.
 * Exibe um ícone clicável na cena que, ao ser acionado, abre o painel
 * da calculadora para realizar operações matemáticas básicas.
 */
export default class Calculator {
    /**
     * @param {Phaser.Scene} scene
     * @param {number}       x
     * @param {number}       y
     * @param {string}       [texture="calculadora"]
     * @param {number}       [scale=4]
     */
    constructor(scene, x, y, texture = "calculadora", scale = 4) {
        this.scene   = scene;
        this.texture = texture;

        this._resetState();
        this._createSprite(x, y, scale);
        this._createContainer();
        this._createUI();
        this._bindToggle();
    }

    _resetState() {
        this.currentInput  = "";
        this.previousInput = "";
        this.operator      = null;
        // Flag que indica se o próximo dígito deve iniciar uma nova entrada
        // (logo após pressionar "="), permitindo encadeamento correto.
        this._justCalculated = false;
    }

    // ─── Criação visual ──────────────────────────────────────────────────────

    _createSprite(x, y, scale) {
        this.sprite = this.scene.add.image(x, y, this.texture)
            .setScale(scale)
            .setDepth(10)
            .setInteractive({ useHandCursor: true, pixelPerfect: true, alphaTolerance: 1 });

        // Feedback visual de hover no ícone.
        this.sprite.on("pointerover",  () => this.sprite.setTint(0xdddddd));
        this.sprite.on("pointerout",   () => this.sprite.clearTint());
    }

    _createContainer() {
        this.container = this.scene.add.container(
            (SCREEN_WIDTH / 1.6) + PANEL_OFFSET_X,
            SCREEN_HEIGHT / 2.5
        );
        this.container.setDepth(20).setVisible(false);
    }

    /**
     * Constrói os elementos visuais da interface (fundo, visor e botões).
     * @private
     */
    _createUI() {
        this.panel = this.scene.add.image(0, 0, this.texture)
            .setOrigin(0.5)
            .setScale(PANEL_SCALE);
        this.container.add(this.panel);

        const { scaleX, scaleY } = this._getPanelScale();
        const displayFontSize    = Math.round(CALCULATOR_LAYOUT.display.fontSize * scaleX);

        this.display = this.scene.add.text(
            CALCULATOR_LAYOUT.display.x * scaleX,
            CALCULATOR_LAYOUT.display.y * scaleY,
            "0",
            { fontSize: `${displayFontSize}px`, color: "#000000" }
        ).setOrigin(0.5);
        this.container.add(this.display);

        BUTTON_LAYOUT.forEach((row, rowIndex) => {
            row.forEach((label, colIndex) => {
                const x = CALCULATOR_LAYOUT.buttons.columns[colIndex] * scaleX;
                const y = CALCULATOR_LAYOUT.buttons.rows[rowIndex]    * scaleY;
                const w = CALCULATOR_LAYOUT.buttons.width  * scaleX;
                const h = CALCULATOR_LAYOUT.buttons.height * scaleY;
                this._createButton(x, y, w, h, label);
            });
        });
    }

    /**
     * Cria uma hitbox invisível para uma tecla.
     * @private
     */
    _createButton(x, y, width, height, label) {
        const hitbox = this.scene.add.rectangle(x, y, width, height, 0xff0000, 0.01)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        hitbox.on("pointerdown", () => this._handleInput(label));
        this.container.add(hitbox);
    }

    /**
     * Retorna os fatores de escala do painel em relação ao tamanho de referência.
     * @private
     */
    _getPanelScale() {
        const w = this.panel.width  * this.panel.scaleX;
        const h = this.panel.height * this.panel.scaleY;
        return {
            scaleX: w / REFERENCE_PANEL_SIZE.width,
            scaleY: h / REFERENCE_PANEL_SIZE.height,
        };
    }

    // ─── Lógica de entrada ───────────────────────────────────────────────────

    /**
     * Processa cada tecla pressionada e atualiza o estado interno.
     * @param {string} label
     * @private
     */
    _handleInput(label) {
        if (!isNaN(label)) {
            this._inputDigit(label);
        } else if (label === "DEL") {
            this._inputDelete();
        } else if (label === "=") {
            this._inputEquals();
        } else {
            this._inputOperator(label);
        }

        this._updateDisplay();
    }

    /** Adiciona um dígito à entrada atual. */
    _inputDigit(digit) {
        // Após "=", começa nova entrada em vez de continuar o resultado.
        if (this._justCalculated) {
            this.currentInput    = "";
            this._justCalculated = false;
        }
        if (this.currentInput.length >= MAX_DIGITS) return;
        this.currentInput += digit;
    }

    /** Apaga o último dígito ou limpa se o visor mostrar um erro. */
    _inputDelete() {
        if (this.currentInput === "Erro") {
            this._resetState();
            return;
        }
        this.currentInput = this.currentInput.slice(0, -1);
    }

    /**
     * Registra um operador. Se já há operador e entrada atual,
     * calcula o resultado intermediário antes de registrar o novo operador,
     * permitindo encadeamento correto (ex: 3 + 4 * 2).
     */
    _inputOperator(op) {
        if (this.currentInput === "" && this.previousInput === "") return;

        // Se já existe uma operação pendente com valor atual, resolve antes.
        if (this.operator && this.currentInput !== "") {
            this._calculate();
        }

        // previousInput recebe o resultado acumulado ou a entrada atual.
        if (this.currentInput !== "") {
            this.previousInput = this.currentInput;
            this.currentInput  = "";
        }

        this.operator          = op;
        this._justCalculated   = false;
    }

    /** Executa o cálculo e exibe o resultado. */
    _inputEquals() {
        if (!this.operator || this.currentInput === "" || this.previousInput === "") return;
        this._calculate();
        this.operator          = null;
        this._justCalculated   = true;
    }

    /**
     * Executa a operação aritmética com `previousInput` e `currentInput`.
     * O resultado é armazenado em `currentInput`.
     * @private
     */
    _calculate() {
        const a = parseFloat(this.previousInput);
        const b = parseFloat(this.currentInput);

        if (isNaN(a) || isNaN(b)) return;

        let result;
        switch (this.operator) {
            case "+": result = a + b; break;
            case "-": result = a - b; break;
            case "*": result = a * b; break;
            case "/":
                if (b === 0) { this.currentInput = "Erro"; this.previousInput = ""; this.operator = null; return; }
                result = a / b;
                break;
            default: return;
        }
        // Formata o resultado para caber no visor sem notação científica.
        this.currentInput  = this._formatResult(result);
        this.previousInput = "";
    }

    /**
     * Formata um número para exibição: sem notação científica, sem zeros
     * desnecessários, respeitando MAX_DIGITS caracteres.
     * @param {number} value
     * @returns {string}
     * @private
     */
    _formatResult(value) {
        // Inteiro: retorna direto se couber.
        if (Number.isInteger(value)) {
            const s = String(value);
            return s.length <= MAX_DIGITS ? s : value.toExponential(3);
        }

        // Decimal: usa toPrecision para controlar dígitos significativos,
        // remove zeros à direita e ponto final. Evita notação científica
        // convertendo de volta para Number se necessário.
        let s = parseFloat(value.toPrecision(MAX_DIGITS)).toString();

        // Se ainda ficou em notação científica (ex: 1e+10), trunca como inteiro.
        if (s.includes("e")) {
            s = Math.round(value).toString();
            if (s.length > MAX_DIGITS) s = s.slice(0, MAX_DIGITS);
        }

        return s;
    }

    // ─── Display ─────────────────────────────────────────────────────────────

    _updateDisplay() {
        this.display.setText(this.currentInput || "0");
    }

    // ─── Toggle ──────────────────────────────────────────────────────────────

    _bindToggle() {
        this.sprite.on("pointerdown", () => this._toggle());
    }

    _toggle() {
        const opening = !this.container.visible;
        this.container.setVisible(opening);

        // Limpa o estado ao fechar para não manter operação suspensa.
        if (!opening) this._resetState();
        this._updateDisplay();
    }

    /**
     * Abre o painel programaticamente.
     */
    open() {
        this.container.setVisible(true);
    }

    /**
     * Fecha o painel programaticamente e limpa o estado.
     */
    close() {
        this.container.setVisible(false);
        this._resetState();
        this._updateDisplay();
    }
}
