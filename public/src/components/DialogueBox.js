import SettingsManager from "./managers/SettingsManager.js";

/**
 * Configuração para criação do DialogBox.
 *
 * @typedef {Object} DialogBoxConfig
 * @property {number} x - Posição X do container.
 * @property {number} y - Posição Y do container.
 * @property {number} width - Largura base (será reduzida em 1% internamente).
 * @property {number} height - Altura do box.
 * @property {number} [radius=8] - Raio das bordas arredondadas.
 * @property {string[][]} pages - Array de páginas; cada página é um array de linhas de texto.
 * @property {Object.<number,number>} [dayStartIndices] - Índice inicial de cada dia no array de páginas.
 * @property {number} [currentDay=1] - Dia atual do jogador; controla quais dias estão clicáveis no sumário.
 * @property {Phaser.Types.GameObjects.Text.TextStyle} [textStyle] - Estilo do texto do conteúdo.
 * @property {Phaser.Types.GameObjects.Text.TextStyle} [titleStyle] - Estilo do texto do título.
 * @property {number} [backgroundColor=0x1a1a2e] - Cor de fundo.
 * @property {number} [strokeWidth=2] - Espessura da borda.
 * @property {number} [strokeColor=0xf0c040] - Cor da borda.
 * @property {Function} [onClose] - Callback chamado ao clicar no botão fechar.
 */

/**
 * Caixa de diálogo estilo guia com navegação por páginas.
 *
 * Estrutura visual:
 * - Fundo arredondado com borda decorativa
 * - Área de título (primeira linha de cada página)
 * - Corpo de texto com as demais linhas
 * - Botões "◀ Anterior" e "Próximo ▶" para navegar entre páginas
 * - Indicador de página (ex: 2 / 9)
 * - Sumário clicável na página 0, com links por dia
 * - Botão "📖 Sumário" nas páginas de conteúdo para voltar ao índice
 */
export default class DialogBox {
    /**
     * @param {Phaser.Scene} scene
     * @param {DialogBoxConfig} config
     */
    constructor(scene, config) {
        /** @type {Phaser.Scene} */
        this.scene = scene;
        // ? O audio do guia fica acoplado a esta instancia para poder ser
        // ? interrompido com seguranca no fechamento do componente.

        // ? O projeto usa esse deslocamento para encaixar o guia sobre a cena
        // ? sem exigir ajuste manual em cada ponto que o componente e aberto.
        this.config = {
            ...config,
            x: config.x + 350,
            width: Math.round(config.width * 0.99),
        };

        this._baseTextStyle = { ...(config.textStyle ?? {}) };
        this._baseTitleStyle = { ...(config.titleStyle ?? {}) };

        /** @type {number} */
        this.currentPage = 0;

        /** @type {Phaser.GameObjects.Container | null} */
        this.container = null;

        /** @type {Phaser.GameObjects.Graphics | null} */
        this.background = null;

        /** @type {Phaser.GameObjects.Graphics | null} */
        this.divider = null;

        /** @type {Phaser.GameObjects.Text | null} */
        this.titleLabel = null;

        /** @type {Phaser.GameObjects.Text | null} */
        this.bodyLabel = null;

        /** @type {Phaser.GameObjects.Text | null} */
        this.pageIndicator = null;

        /** @type {Phaser.GameObjects.Text | null} */
        this.btnPrev = null;

        /** @type {Phaser.GameObjects.Text | null} */
        this.btnNext = null;

        /** @type {Phaser.GameObjects.Text | null} */
        this.btnClose = null;

        // ? Links clicáveis criados dinamicamente na página de sumário.
        // ? São destruídos e recriados a cada vez que o sumário é renderizado
        // ? para refletir o estado atual de desbloqueio dos dias.
        /** @type {Phaser.GameObjects.Text[]} */
        this.summaryLinks = [];

        // ? Botão fixo de retorno ao sumário, visível apenas nas páginas de conteúdo.
        /** @type {Phaser.GameObjects.Text | null} */
        this.btnSummary = null;

        this._create();
    }

    // ─────────────────────────────────────────
    //  Criação
    // ─────────────────────────────────────────

    /** @private */
    _create() {
        const {
            x, y,
            width, height,
            radius = 8,
            strokeWidth = 2,
        } = this.config;
        const theme = this._getTheme();

        // Aumenta altura internamente para acomodar barra de navegação
        // ? A area total cresce para abrir espaco fixo para o rodape com
        // ? paginacao e navegacao, mantendo o corpo de texto legivel.
        const totalHeight = height * 2;
        this._totalHeight = totalHeight;

        const hw = width / 2;
        const hh = totalHeight / 2;

        // ── Fundo ──────────────────────────────
        this.background = this.scene.add.graphics();
        this._drawBackground(width, totalHeight, radius, theme.backgroundColor, strokeWidth, theme.strokeColor);

        // ── Divisor título ──────────────────────
        this.divider = this.scene.add.graphics();
        this._drawDivider(width, theme.strokeColor, hh);

        // ── Divisor rodapé ──────────────────────
        this.dividerFooter = this.scene.add.graphics();
        this._drawDividerFooter(width, theme.strokeColor, hh);

        // ── Título ─────────────────────────────
        const resolvedTitleStyle = {
            fontSize: '18px',
            color: theme.titleColor,
            fontStyle: 'bold',
            wordWrap: { width: width - 48 },
            ...this._baseTitleStyle,
        };
        this.titleLabel = this.scene.add
            .text(-hw + 24, -hh + 16, '', resolvedTitleStyle)
            .setOrigin(0, 0);

        // ── Corpo ──────────────────────────────
        const resolvedTextStyle = {
            fontSize: '14px',
            color: theme.bodyColor,
            wordWrap: { width: width - 48 },
            lineSpacing: 8,
            ...this._baseTextStyle,
        };
        this.bodyLabel = this.scene.add
            .text(-hw + 24, -hh + 62, '', resolvedTextStyle)
            .setOrigin(0, 0);

        // ── Container (fundo + texto, SEM botões) ─
        // ? Os botoes ficam fora do container porque o input do Phaser se
        // ? comporta de forma mais previsivel quando eles ficam independentes.
        this.container = this.scene.add.container(x, y, [
            this.background,
            this.divider,
            this.dividerFooter,
            this.titleLabel,
            this.bodyLabel,
        ]);
        this.container.setDepth(1000);

        // ── Botões fora do container (input funciona) ──

        // Botão Anterior
        this.btnPrev = this.scene.add
            .text(x - hw + 20, y + hh - 18, '◀ Anterior', {
                fontSize: '36px',
                color: theme.buttonColor,
                fontStyle: 'bold',
            })
            .setOrigin(0, 0.5)
            .setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this._goTo(this.currentPage - 1))
            .on('pointerover', () => this.btnPrev.setAlpha(0.6))
            .on('pointerout',  () => this.btnPrev.setAlpha(1));

        // Indicador de página
        this.pageIndicator = this.scene.add
            .text(x, y + hh - 18, '', {
                fontSize: '30px',
                color: theme.pageIndicatorColor,
                fontStyle: 'bold',
            })
            .setOrigin(0.5, 0.5)
            .setDepth(1001);

        // Botão Próximo
        this.btnNext = this.scene.add
            .text(x + hw - 20, y + hh - 18, 'Próximo ▶', {
                fontSize: '36px',
                color: theme.buttonColor,
                fontStyle: 'bold',
            })
            .setOrigin(1, 0.5)
            .setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this._goTo(this.currentPage + 1))
            .on('pointerover', () => this.btnNext.setAlpha(0.6))
            .on('pointerout',  () => this.btnNext.setAlpha(1));

        // ── Botão Fechar (X no canto superior direito) ──
        this.btnClose = this.scene.add
            .text(x + hw - 12, y - hh + 12, '✕', {
                fontSize: '32px',
                color: theme.buttonColor,
                fontStyle: 'bold',
            })
            .setOrigin(1, 0)
            .setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => { if (this.config.onClose) this.config.onClose(); else this.destroy(); })
            .on('pointerover', () => this.btnClose.setAlpha(0.6))
            .on('pointerout',  () => this.btnClose.setAlpha(1));

        // ── Botão Voltar ao Sumário (visível apenas nas páginas de conteúdo) ──
        // ? Fica no indicador de página (centro do rodapé), pois tem mais
        // ? importância que o número de página enquanto há sumário disponível.
        // ? É ocultado na própria página de sumário (página 0).
        this.btnSummary = this.scene.add
            .text(x, y + hh - 18, '📖 Sumário', {
                fontSize: '28px',
                color: theme.buttonColor,
                fontStyle: 'bold',
            })
            .setOrigin(0.5, 0.5)
            .setDepth(1001)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this._goTo(0))
            .on('pointerover', () => this.btnSummary.setAlpha(0.6))
            .on('pointerout',  () => this.btnSummary.setAlpha(1))
            .setVisible(false);

        // Renderiza a primeira página
        this._renderPage();
    }

    _getTheme() {
        if (SettingsManager.highContrast) {
            return {
                backgroundColor: 0x101010,
                strokeColor: 0xffffff,
                titleColor: "#f9c22b",
                bodyColor: "#ffffff",
                buttonColor: "#ffffff",
                pageIndicatorColor: "#f9c22b",
                summaryUnlockedColor: "#ffffff",
                summaryLockedColor: "#8e8e8e",
            };
        }

        return {
            backgroundColor: this.config.backgroundColor ?? 0x1a1a2e,
            strokeColor: this.config.strokeColor ?? 0xf0c040,
            titleColor: this._baseTitleStyle.color ?? "#562600",
            bodyColor: this._baseTextStyle.color ?? "#3a1a00",
            buttonColor: this._baseTitleStyle.color ?? "#562600",
            pageIndicatorColor: "#7a4010",
            summaryUnlockedColor: this._baseTitleStyle.color ?? "#562600",
            summaryLockedColor: "#7a5a42",
        };
    }

    // ─────────────────────────────────────────
    //  Renderização interna
    // ─────────────────────────────────────────

    /** @private */
    _drawBackground(width, height, radius, bgColor, strokeWidth, strokeColor) {
        const hw = width / 2;
        const hh = height / 2;
        this.background.clear();
        this.background.fillStyle(bgColor, 0.97);
        this.background.fillRoundedRect(-hw, -hh, width, height, radius);
        this.background.lineStyle(strokeWidth, strokeColor, 1);
        this.background.strokeRoundedRect(-hw, -hh, width, height, radius);
    }

    /** @private */
    _drawDivider(width, strokeColor, hh) {
        const hw = width / 2;
        const y = -hh + 54;
        this.divider.clear();
        this.divider.lineStyle(2, strokeColor, 0.6);
        this.divider.beginPath();
        this.divider.moveTo(-hw + 16, y);
        this.divider.lineTo(hw - 16, y);
        this.divider.strokePath();
    }

    /** @private */
    _drawDividerFooter(width, strokeColor, hh) {
        const hw = width / 2;
        const y = hh - 36;
        this.dividerFooter.clear();
        this.dividerFooter.lineStyle(2, strokeColor, 0.6);
        this.dividerFooter.beginPath();
        this.dividerFooter.moveTo(-hw + 16, y);
        this.dividerFooter.lineTo(hw - 16, y);
        this.dividerFooter.strokePath();
    }

    /** @private */
    _renderPage() {
        // ? Os links do sumário são objetos Phaser criados dinamicamente.
        // ? Precisam ser destruídos antes de cada re-renderização para evitar
        // ? acúmulo de objetos fantasmas na cena.
        this._clearSummaryLinks();

        const pages = this.config.pages;
        const page = pages[this.currentPage];
        const isSummary = this.currentPage === 0;

        const [title, ...bodyLines] = page;
        this.titleLabel.setText(title);

        const hasSummary = !!this.config.dayStartIndices;

        if (isSummary && hasSummary) {
            // ── Página de sumário: corpo vira links clicáveis ──
            this.bodyLabel.setVisible(false);
            this.btnSummary.setVisible(false);
            this.pageIndicator.setVisible(true);
            this._renderSummaryLinks(bodyLines);
        } else {
            // ── Página de conteúdo: corpo normal + botão sumário no centro do rodapé ──
            // ? O botão de sumário ocupa o centro, então o indicador de página é ocultado
            // ? para não sobrepor. O indicador aparece apenas quando não há sumário.
            this.bodyLabel.setVisible(true);
            this.bodyLabel.setText(bodyLines.join('\n'));
            this.btnSummary.setVisible(hasSummary);
            this.pageIndicator.setVisible(!hasSummary);
        }

        // Indicador (só atualiza o texto, visibilidade já controlada acima)
        this.pageIndicator.setText(`${this.currentPage + 1} / ${pages.length}`);

        // Visibilidade dos botões de navegação
        this.btnPrev.setVisible(this.currentPage > 0);
        this.btnNext.setVisible(this.currentPage < pages.length - 1);
    }

    /**
     * Cria os textos clicáveis do sumário com base nas linhas da página 0.
     * Dias bloqueados aparecem em cinza e sem interatividade.
     * @private
     * @param {string[]} lines - Linhas do corpo da página de sumário (exceto o título).
     */
    _renderSummaryLinks(lines) {
        const { x, y, width, dayStartIndices, currentDay = 1 } = this.config;
        const theme = this._getTheme();
        const hw = width / 2;
        const hh = this._totalHeight / 2;

        // Filtra linhas vazias que servem apenas como espaçamento no array
        const dayLines = lines.filter(l => l.trim() !== '');

        dayLines.forEach((line, i) => {
            const dayNum = i + 1;
            const unlocked = currentDay >= dayNum;
            const startIndex = dayStartIndices[dayNum];

            const linkWorldY = y - hh + 80 + i * 52;

            const link = this.scene.add
                .text(x - hw + 32, linkWorldY, line, {
                    fontSize: '30px',
                    color: unlocked ? theme.summaryUnlockedColor : theme.summaryLockedColor,
                    fontStyle: unlocked ? 'bold' : 'normal',
                    wordWrap: { width: width - 64 },
                })
                .setOrigin(0, 0)
                .setDepth(1001);

            if (unlocked && startIndex !== undefined) {
                link
                    .setInteractive({ useHandCursor: true })
                    .on('pointerdown', () => this._goTo(startIndex))
                    .on('pointerover', () => link.setAlpha(0.6))
                    .on('pointerout',  () => link.setAlpha(1));
            }

            this.summaryLinks.push(link);
        });
    }

    /**
     * Destrói todos os links do sumário atualmente na cena.
     * @private
     */
    _clearSummaryLinks() {
        this.summaryLinks.forEach(link => link.destroy());
        this.summaryLinks = [];
    }

    /** @private */
    _goTo(index) {
        const total = this.config.pages.length;
        if (index < 0 || index >= total) return;
        this.currentPage = index;
        this._renderPage();
    }

    // ─────────────────────────────────────────
    //  API pública
    // ─────────────────────────────────────────

    /**
     * Avança para a próxima página, se houver.
     */
    nextPage() {
        this._goTo(this.currentPage + 1);
    }

    /**
     * Volta para a página anterior, se houver.
     */
    prevPage() {
        this._goTo(this.currentPage - 1);
    }

    /**
     * Vai diretamente para uma página pelo índice (base 0).
     * @param {number} index
     */
    goToPage(index) {
        this._goTo(index);
    }

    applySettings() {
        const { width, radius = 8, strokeWidth = 2 } = this.config;
        const theme = this._getTheme();
        const hh = this._totalHeight / 2;

        this._drawBackground(width, this._totalHeight, radius, theme.backgroundColor, strokeWidth, theme.strokeColor);
        this._drawDivider(width, theme.strokeColor, hh);
        this._drawDividerFooter(width, theme.strokeColor, hh);

        this.titleLabel.setColor(theme.titleColor);
        this.bodyLabel.setColor(theme.bodyColor);
        this.btnPrev.setColor(theme.buttonColor);
        this.btnNext.setColor(theme.buttonColor);
        this.btnClose.setColor(theme.buttonColor);
        this.btnSummary.setColor(theme.buttonColor);
        this.pageIndicator.setColor(theme.pageIndicatorColor);

        this._renderPage();
    }

    /**
     * Mostra ou esconde o container.
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.container.setVisible(visible);
        this.btnPrev.setVisible(visible && this.currentPage > 0);
        this.btnNext.setVisible(visible && this.currentPage < this.config.pages.length - 1);
        this.pageIndicator.setVisible(visible);
        this.btnClose.setVisible(visible);
        this.btnSummary.setVisible(visible && this.currentPage > 0 && !!this.config.dayStartIndices);
        this.summaryLinks.forEach(link => link.setVisible(visible));
    }

    /**
     * Remove completamente o DialogBox da cena.
     */
    destroy() {

        this._clearSummaryLinks();
        this.container.destroy(true);
        // Botões estão fora do container, precisam ser destruídos separadamente
        this.btnPrev.destroy();
        this.btnNext.destroy();
        this.pageIndicator.destroy();
        this.btnClose.destroy();
        this.btnSummary.destroy();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Dados das páginas do guia financeiro organizados por dia
//  Use buildGuidePages(currentDay) para obter o objeto de configuração correto.
// ─────────────────────────────────────────────────────────────────────────────

// ── Dia 1 — Empréstimo e Parcelamento (sempre desbloqueado) ──────────────────
const DAY1_PAGES = [
    // Página 1 — Empréstimo (conceito)
    [
        '💰 1. Empréstimo',
        'É pegar algo agora para usar e devolver depois,\nnormalmente devolvendo um pouco a mais.',
        '',
        '📌 Exemplo:',
        'Pegar 1 kg de arroz com o vizinho e devolver 1,5 kg.',
    ],

    // Página 2 — Empréstimo (obrigação e juros)
    [
        '💰 1. Empréstimo',
        '🔁 Obrigação de devolver',
        'Quando você pega algo emprestado, precisa devolver no prazo combinado.',
        'Ex: devolver uma furadeira após usar.',
        '',
        '📈 Juros',
        'É um custo extra — o preço por usar algo que não era seu. Ex: pagar multa por devolver dinheiro atrasado.',
    ],

    // Página 3 — Parcelamento (conceito)
    [
        '📊 2. Parcelamento',
        'É dividir um valor grande em partes menores para pagar aos poucos.',
        '',
        '📌 Exemplo:',
        'Pagar um celular de R$1.000 em 10 prestações de R$100.',
    ],

    // Página 4 — Parcelamento (cuidados)
    [
        '📊 2. Parcelamento',
        '⚠️ Mais parcelas podem aumentar o valor final.',
        'Quanto mais tempo você leva para pagar, maior pode ser o total pago.',
        '',
        '⚠️ Parcela pequena ≠ preço menor.',
        'Às vezes a prestação parece leve, mas no final você paga mais — juros aumentam como multa\npelo atraso em cada parcela.',
    ],

    // Página 5 — Juros simples
    [
        '📈 3. Juros Simples',
        'É o valor extra pago por usar algo antes de ter pago tudo.',
        'Ex: devolver mais açúcar do que pegou emprestado.',
        '',
        '🧮 Como calcular?',
        'Empréstimo: R$1.000 | Taxa: 10% ao mês | Prazo: 1 mês',
        '10% de 1.000 = R$100 de juros',
        'Total a pagar: R$1.000 + R$100 = R$1.100',
    ],

    // Página 6 — Cálculo do valor total
    [
        '🧮 4. Cálculo do Valor Total',
        'Para saber quanto vai pagar no final, multiplique:',
        '',
        '    valor da parcela × quantidade de parcelas',
        '',
        '📌 Exemplo: 3 parcelas de R$100 = R$300 no total.',
        '',
        '💡 Dica: sempre compare o valor TOTAL, não só o valor da parcela.',
    ],

    // Página 7 — Cartão Pré-pago
    [
        '💳 5. Cartão Pré-pago',
        'Você precisa depositar dinheiro ANTES de usar.',
        'Ex: comprar fichas para brincar no parque.',
        '',
        '✅ Saldo carregado: o dinheiro vira crédito para gastar.',
        '🚫 Limitação: quando o saldo acaba, não dá para usar.',
        '⚠️ Risco: se não usar dentro do prazo, pode perder o valor depositado.',
    ],

    // Página 8 — Débito
    [
        '🏦 6. Débito',
        'O valor sai NA HORA da sua conta bancária.',
        'Ex: pagar algo usando dinheiro físico da carteira.',
        '',
        '✅ Em geral, você usa o saldo disponível na conta.',
        '⚠️ Sem saldo suficiente, a compra pode ser negada.',
        '💡 Se houver cheque especial habilitado, o banco pode usar esse limite extra e cobrar taxas.',
    ],

    // Página 9 — Segurança
    [
        '🔐 7. Segurança',
        'Proteger seus dados evita que outras pessoas usem o que é seu.',
        '',
        '🚨 Fraude:',
        'Quando alguém usa seu dinheiro sem a sua autorização.',
        '',
        '🛑 Bloqueio:',
        'Se notar algo estranho, é possível interromper o uso do cartão ou conta imediatamente.',
    ],
];


// ── Dia 2 — (conteúdo a ser inserido) ───────────────────────────────────────
const DAY2_PAGES = [
    // Página 1 — Valor Total Pago (conceito)
    [
        '📈 1. Valor Total Pago',
        'É quanto você realmente paga no final, somando tudo.',
        '',
        '📌 Exemplo:',
        'Pegar R$1.000 e devolver R$1.200.',
    ],

    // Página 2 — Valor Total Pago (diferença)
    [
        '📈 1. Valor Total Pago',
        'O que você pega não é o que paga no fim.',
        '',
        '📌 Exemplo:',
        'Pegar 10 pizzas e devolver 12.',
    ],

    // Página 3 — Parcelas menores (conceito)
    [
        '🔁 2. Parcelas Menores Não Significam Economia',
        'Uma parcela pequena pode durar mais tempo e aumentar o valor final.',
        '',
        '📌 Exemplo:',
        'R$50 por 20 meses pode custar mais que R$200 por 5 meses.',
    ],

    // Página 4 — Parcelas menores (tempo)
    [
        '🔁 2. Parcelas Menores Não Significam Economia',
        '⏳ Tempo aumenta o custo.',
        'Quanto mais tempo pagando, maior pode ser o total.',
        '',
        '💡 A inflação pode influenciar os juros ao longo do tempo.',
    ],

    // Página 5 — Percentual da renda (conceito)
    [
        '📊 3. Percentual da Renda',
        'É a parte do que você ganha usada para pagar dívidas.',
        '',
        '📌 Exemplo:',
        'Se ganha R$1.000 e paga R$200, usa 20% da renda.',
    ],

    // Página 6 — Percentual da renda (regra)
    [
        '📊 3. Percentual da Renda',
        'Organize seu dinheiro com prioridade:',
        '',
        '1. Investimentos (quando possível)',
        '2. Contas fixas',
        '3. Gastos não essenciais',
        '',
        '⚠️ Evite gastar tudo com supérfluos.',
    ],

    // Página 7 — Planejamento familiar
    [
        '👨‍👩‍👧 4. Planejamento Familiar',
        'É organizar os gastos considerando todos da casa.',
        '',
        '📌 Exemplo:',
        'Dividir as despesas da casa entre todos os membros.',
    ],
];

// ── Dia 3 — (conteúdo a ser inserido) ───────────────────────────────────────
const DAY3_PAGES = [
    // Página 1 — Nome negativado (conceito)
    [
        '🚨 1. Nome Negativado',
        'É quando a pessoa não paga algo no prazo e fica registrada com dívida.',
        '',
        '📌 Exemplo:',
        'Ficar conhecido como alguém que não devolve o que pega.',
    ],

    // Página 2 — Nome negativado (consequência)
    [
        '🚨 1. Nome Negativado',
        'Outras pessoas passam a confiar menos.',
        'Bancos podem negar crédito ou empréstimos.',
        '',
        '📌 Exemplo:',
        'Vizinho não empresta mais ferramentas.',
    ],

    // Página 3 — Inadimplência (conceito)
    [
        '📉 2. Inadimplência',
        'É quando a pessoa não consegue pagar o que prometeu.',
        '',
        '📌 Exemplo:',
        'Combinar pagar algo e não cumprir.',
    ],

    // Página 4 — Inadimplência (impacto)
    [
        '📉 2. Inadimplência',
        'Dificulta conseguir crédito ou ajuda novamente.',
        '',
        '⚠️ Quem não paga perde confiança no mercado.',
    ],

    // Página 5 — Comprometimento excessivo (conceito)
    [
        '📊 3. Comprometimento Excessivo da Renda',
        'É quando quase todo o dinheiro já está comprometido.',
        '',
        '📌 Exemplo:',
        'Ganhar R$2.000 e ter R$1.900 em contas.',
    ],

    // Página 6 — Comprometimento excessivo (risco)
    [
        '📊 3. Comprometimento Excessivo',
        'Sobra muito pouco dinheiro no mês.',
        '',
        '⚠️ Imprevistos podem virar dívidas.',
    ],

    // Página 7 — Cálculo de sobra real
    [
        '🧮 4. Cálculo de Sobra Real',
        'Sobra real = renda – gastos – parcelas.',
        '',
        '📌 Exemplo:',
        'R$3.000 – R$2.500 = R$500 livres.',
    ],

    // Página 8 — Juros compostos (conceito)
    [
        '📈 5. Juros Compostos',
        'Os juros crescem sobre valores já aumentados.',
        '',
        '📌 Exemplo:',
        'Dívida de R$100 vira R$110, depois cresce sobre R$110.',
    ],

    // Página 9 — Juros compostos (efeito)
    [
        '📈 5. Juros Compostos',
        'Quanto mais tempo passa, maior o crescimento.',
        '',
        '⚠️ Pequenos juros viram grandes valores.',
    ],

    // Página 10 — Ciclo de dívida (conceito)
    [
        '🔄 6. Ciclo de Dívida',
        'É pegar dinheiro novo para pagar dívida antiga.',
        '',
        '📌 Exemplo:',
        'Fazer empréstimo para quitar outro.',
    ],

    // Página 11 — Ciclo de dívida (problema)
    [
        '🔄 6. Ciclo de Dívida',
        'A dívida nunca termina, só muda de lugar.',
        '',
        '⚠️ Pode piorar a situação financeira.',
    ],

    // Página 12 — Risco moral (conceito)
    [
        '🎭 7. Risco Moral',
        'É usar justificativas emocionais para conseguir algo.',
        '',
        '📌 Exemplo:',
        'Inventar história para conseguir dinheiro.',
    ],

    // Página 13 — Risco moral (atenção)
    [
        '🎭 7. Risco Moral',
        'Decisões devem ser feitas com base em dados.',
        '',
        '⚠️ Não decidir só pela emoção.',
    ],

    // Página 14 — Decisão responsável
    [
        '⚖ 8. Decisão Responsável',
        'Nem sempre dizer "sim" é ajudar.',
        '',
        '📌 Às vezes negar evita problemas maiores.',
        '',
        '💡 Evita mais endividamento.',
    ],
];

/**
 * Monta o objeto de configuração do guia com base no dia atual do jogador.
 *
 * Retorna { pages, dayStartIndices, currentDay } pronto para ser espalhado
 * no config do DialogBox:
 *
 *   new DialogBox(scene, { x, y, width, height, ...buildGuidePages(currentDay) });
 *
 * - Dia 1: sempre desbloqueado.
 * - Dia 2: desbloqueado ao atingir o Dia 2.
 * - Dia 3: desbloqueado ao atingir o Dia 3.
 *
 * @param {number} currentDay - Dia atual do jogador (1, 2 ou 3+).
 * @returns {{ pages: string[][], dayStartIndices: Object.<number,number>, currentDay: number }}
 */
export function buildGuidePages(currentDay) {
    const day2Unlocked = currentDay >= 2;
    const day3Unlocked = currentDay >= 3;

    // ── Sumário (página 0) ────────────────────────────────────────────────────
    const summary = [
        '📖 Sumário',
        '',
        '📅 Dia 1 — Conceitos Financeiros',
        day2Unlocked
            ? '📅 Dia 2 — Planejamento e Organização'
            : '🔒 Dia 2 — Disponível no Dia 2',
        day3Unlocked
            ? '📅 Dia 3 — Dívidas e suas Consequências'
            : '🔒 Dia 3 — Disponível no Dia 3',
    ];

    // ── Seção Dia 2 ───────────────────────────────────────────────────────────
    const day2Section = day2Unlocked && DAY2_PAGES.length > 0
        ? DAY2_PAGES
        : [[
            day2Unlocked
                ? '📅 Dia 2'
                : '🔒 Dia 2 — Conteúdo Bloqueado',
            day2Unlocked
                ? 'Conteúdo ainda não disponível.'
                : 'Este conteúdo será desbloqueado\nquando você chegar ao Dia 2.',
        ]];

    // ── Seção Dia 3 ───────────────────────────────────────────────────────────
    const day3Section = day3Unlocked && DAY3_PAGES.length > 0
        ? DAY3_PAGES
        : [[
            day3Unlocked
                ? '📅 Dia 3'
                : '🔒 Dia 3 — Conteúdo Bloqueado',
            day3Unlocked
                ? 'Conteúdo ainda não disponível.'
                : 'Este conteúdo será desbloqueado\nquando você chegar ao Dia 3.',
        ]];

    const pages = [summary, ...DAY1_PAGES, ...day2Section, ...day3Section];

    const dayStartIndices = {
        1: 1,
        2: 1 + DAY1_PAGES.length,
        3: 1 + DAY1_PAGES.length + day2Section.length,
    };

    return { pages, dayStartIndices, currentDay };
}

/**
 * Objeto de configuração padrão com apenas o Dia 1 desbloqueado.
 * Prefira usar buildGuidePages(currentDay) diretamente.
 */
export const GUIDE_PAGES = buildGuidePages(1);
