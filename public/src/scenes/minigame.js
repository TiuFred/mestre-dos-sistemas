import EventsManager from '../components/managers/EventsManager.js';

/**
 * Minijogo — Ordenar Documentos por Data
 *
 * O jogador recebe 5 documentos embaralhados e deve arrastá-los
 * para a pilha central na ordem cronológica correta (mais antigo → mais novo).
 *
 * Fluxo:
 *  - Documentos aparecem espalhados na tela
 *  - Jogador arrasta um documento para a "pilha" no centro
 *  - Se a ordem estiver correta, o documento encaixa com feedback verde
 *  - Se errar, o documento volta com feedback vermelho (sem penalidade — tente de novo)
 *  - Ao empilhar todos na ordem certa, emite `minigame:scene_result` { success: true }
 *
 * Registro no config do Phaser:
 *   { key: 'MinigameDocumentOrder', scene: MinigameDocumentOrder }
 */
export default class MinigameDocumentOrder extends Phaser.Scene {

    constructor() {
        super({ key: 'MinigameDocumentOrder' });
    }

    /** @type {Object[]} Documentos em ordem correta (cronológica) */
    _documents = [
        { id: 0, label: 'Contrato de Abertura',  date: '03/01/2018', display: 'Jan 2018' },
        { id: 1, label: 'Comprovante de Renda',  date: '15/06/2019', display: 'Jun 2019' },
        { id: 2, label: 'Ficha Cadastral',        date: '22/11/2020', display: 'Nov 2020' },
        { id: 3, label: 'Atualização de Dados',   date: '08/03/2022', display: 'Mar 2022' },
        { id: 4, label: 'Solicitação de Crédito', date: '30/09/2023', display: 'Set 2023' },
    ];

    /** Índice do próximo documento esperado na pilha (0 = mais antigo) */
    _nextExpected = 0;

    /** Containers Phaser de cada carta de documento */
    _cards = [];

    /** Zona de drop (pilha central) */
    _dropZone = null;

    /** Texto indicando qual documento colocar a seguir */
    _hintText = null;

    /** Pilha visual: retângulos empilhados no centro */
    _stackedCount = 0;

    /** Contador de erros do jogador */
    _errorCount = 0;

    /** Texto do contador de erros */
    _errorText = null;

    /** Referência ao retângulo da drop zone para animação de hover */
    _dropZoneRect = null;

    /** Label "PILHA" dentro da drop zone */
    _pilhaLabel = null;

    init(data) {
        this._config = data?.config ?? {};
        this._nextExpected = 0;
        this._stackedCount = 0;
        this._errorCount   = 0;
        this._cards        = [];
        this._lineSlots    = [];
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;

        // ─────────────────────────────────────────────────────────────────────
        // AMBIENTE — replica o estilo do jogo: parede + bancada
        // ─────────────────────────────────────────────────────────────────────

        // Parede de fundo (azul-acinzentado como na screenshot)
        this.add.rectangle(W / 2, H / 2, W, H, 0x6a96a8).setDepth(0);

        // Reflexos diagonais na parede (igual ao jogo)
        for (let i = 0; i < 5; i++) {
            const stripe = this.add.rectangle(
                W * 0.55 + i * 180, H * 0.35,
                60, H * 1.4, 0x7aaabb, 0.18
            ).setDepth(0).setRotation(-0.3);
        }

        // Bancada (parte inferior da tela — mesma cor bege-azulada do jogo)
        const DESK_Y   = H - 140;
        const DESK_H   = 280;
        this.add.rectangle(W / 2, DESK_Y + DESK_H / 2, W, DESK_H, 0x8ab4c2).setDepth(1);
        // Borda superior da bancada (linha mais escura)
        this.add.rectangle(W / 2, DESK_Y, W, 6, 0x5a8898).setDepth(2);
        // Sombra projetada na bancada
        this.add.rectangle(W / 2, DESK_Y + 18, W, 24, 0x000000, 0.12).setDepth(2);

        // ── Título flutuante no topo ──────────────────────────────────────────
        const titleBg = this.add.rectangle(W / 2, 38, W, 76, 0x1a1a2e, 0.88).setDepth(3);
        this.add.rectangle(W / 2, 76, W, 3, 0xF9C22B).setDepth(3);

        this.add.text(W / 2, 36, 'ORGANIZE OS DOCUMENTOS', {
            fontFamily: 'PressStart2P',
            fontSize: '15px',
            color: '#F9C22B',
        }).setOrigin(0.5).setDepth(4);

        // Instrução
        this.add.text(W / 2, H - 22, 'Arraste os papéis para a bandeja  •  do mais ANTIGO ao mais NOVO', {
            fontFamily: 'PressStart2P',
            fontSize: '8px',
            color: '#1a2a33',
        }).setOrigin(0.5).setDepth(4);

        // ── Contador de erros (canto superior direito) ────────────────────────
        this._errorText = this.add.text(W - 20, 36, '✗ 0', {
            fontFamily: 'PressStart2P',
            fontSize: '11px',
            color: '#ff5555',
        }).setOrigin(1, 0.5).setDepth(4);

        // ─────────────────────────────────────────────────────────────────────
        // BANDEJA VERTICAL — lado direito, envelopes empilham de baixo pra cima
        // ─────────────────────────────────────────────────────────────────────
        const TRAY_W   = 300;
        const TRAY_H   = H - 280;   // menos alta
        const TRAY_X   = W - 190;
        const TRAY_Y   = H / 2 + 20;

        // Sombra
        this.add.rectangle(TRAY_X + 5, TRAY_Y + 6, TRAY_W + 8, TRAY_H + 8, 0x000000, 0.4).setDepth(3);

        // Corpo externo
        this.add.rectangle(TRAY_X, TRAY_Y, TRAY_W, TRAY_H, 0x444440).setDepth(4);
        // Borda interna
        this.add.rectangle(TRAY_X, TRAY_Y, TRAY_W - 8, TRAY_H - 8, 0x777770).setDepth(4);
        // Fundo interno creme
        this.add.rectangle(TRAY_X, TRAY_Y + 2, TRAY_W - 16, TRAY_H - 16, 0xc8be98).setDepth(5);

        // Barra de título
        this.add.rectangle(TRAY_X, TRAY_Y - TRAY_H / 2 + 16, TRAY_W - 16, 24, 0x333330).setDepth(6);
        this.add.text(TRAY_X, TRAY_Y - TRAY_H / 2 + 16, 'ENTRADA', {
            fontFamily: 'PressStart2P', fontSize: '8px', color: '#ccccbb',
        }).setOrigin(0.5).setDepth(7);

        // Borda frontal inferior (dá profundidade de bandeja)
        this.add.rectangle(TRAY_X, TRAY_Y + TRAY_H / 2 - 5, TRAY_W, 10, 0x222220).setDepth(7);
        // Borda frontal esquerda
        this.add.rectangle(TRAY_X - TRAY_W / 2 + 4, TRAY_Y, 8, TRAY_H, 0x222220).setDepth(7);
        // Borda frontal direita
        this.add.rectangle(TRAY_X + TRAY_W / 2 - 4, TRAY_Y, 8, TRAY_H, 0x222220).setDepth(7);

        // Reflexo metálico no topo
        this.add.rectangle(TRAY_X, TRAY_Y - TRAY_H / 2 + 4, TRAY_W - 8, 5, 0xaaaaaa, 0.3).setDepth(7);

        // Drop zone interativa
        this._dropZoneRect = this.add.rectangle(TRAY_X, TRAY_Y, TRAY_W - 16, TRAY_H - 16, 0xffffff, 0).setDepth(5);

        // Label "SOLTE AQUI"
        this._pilhaLabel = this.add.text(TRAY_X, TRAY_Y + 40, 'SOLTE\nAQUI', {
            fontFamily: 'PressStart2P', fontSize: '10px', color: '#888870',
            align: 'center', lineSpacing: 6,
        }).setOrigin(0.5).setDepth(6);

        // Progresso — tracinhos na borda esquerda interna
        this._progressSlots = [];
        const slotSpacing = (TRAY_H - 60) / 5;
        const slotBaseY   = TRAY_Y + TRAY_H / 2 - 30;
        for (let i = 0; i < 5; i++) {
            const sy = slotBaseY - i * slotSpacing;
            this._progressSlots.push(
                this.add.rectangle(TRAY_X - TRAY_W / 2 + 12, sy, 6, 20, 0x555540)
                    .setDepth(8)
            );
        }

        // Hint
        this._hintBg = this.add.rectangle(W / 2, 96, W, 32, 0x111122, 0.75).setDepth(3);
        this._hintText = this.add.text(W / 2, 96, '', {
            fontFamily: 'PressStart2P', fontSize: '9px', color: '#ddddaa', align: 'center',
        }).setOrigin(0.5).setDepth(4);

        // Envelopes espalhados à esquerda
        const shuffled = Phaser.Utils.Array.Shuffle([...this._documents]);
        this._createCards(shuffled, W, H, TRAY_X, TRAY_Y, TRAY_W, TRAY_H);

        // Animação de entrada dos cards (caem levemente de cima)
        this._cards.forEach((card, i) => {
            const destY = card.y;
            card.setAlpha(0).setY(destY - 30);
            this.tweens.add({
                targets: card,
                alpha: 1,
                y: destY,
                duration: 320,
                delay: i * 90,
                ease: 'Back.easeOut',
            });
        });

        this._updateHint();
    }

    /**
     * Cria os cards espalhados sobre a bancada, do lado esquerdo,
     * longe da bandeja.
     * @param {Object[]} docs
     * @param {number} W
     * @param {number} H
     * @param {number} trayX  - centro X da bandeja (drop zone)
     * @param {number} trayY  - centro Y da bandeja
     * @param {number} trayW
     * @param {number} trayH
     * @private
     */
    _createCards(docs, W, H, trayX, trayY, trayW, trayH) {
        const leftEdge = trayX - trayW / 2 - 60; // margem direita dos envelopes
        const positions = [
            { x: leftEdge - 300, y: H * 0.22, rot: -0.05 },
            { x: leftEdge - 100, y: H * 0.22, rot:  0.04 },
            { x: leftEdge - 200, y: H * 0.46, rot: -0.03 },
            { x: leftEdge - 350, y: H * 0.60, rot:  0.06 },
            { x: leftEdge - 120, y: H * 0.65, rot: -0.04 },
        ];

        docs.forEach((doc, i) => {
            const pos = positions[i];
            const card = this._buildCard(doc, pos.x, pos.y, trayX, trayY, trayW, trayH);
            card.setRotation(pos.rot);
            card._homeRot = pos.rot;
            this._cards.push(card);
        });
    }

    /**
     * Constrói um card de documento interativo (container Phaser arrastável).
     * @param {Object} doc
     * @param {number} x
     * @param {number} y
     * @param {number} trayX  - centro X da bandeja
     * @param {number} trayY  - centro Y da bandeja
     * @param {number} trayW  - largura da bandeja
     * @param {number} trayH  - altura da bandeja
     * @private
     */
    _buildCard(doc, x, y, trayX, trayY, trayW, trayH) {
        const EW = 280;
        const EH = 130;

        const container = this.add.container(x, y).setDepth(10);
        container.setSize(EW, EH);

        // Sombra
        const shadow = this.add.rectangle(4, 5, EW, EH, 0x000000, 0.4);

        // Corpo do envelope (kraft)
        const bg = this.add.rectangle(0, 0, EW, EH, 0xd4b483).setStrokeStyle(2, 0xa08050);

        // Aba triangular superior
        const flap = this.add.graphics();
        flap.fillStyle(0xc0a060, 1);
        flap.fillTriangle(-EW / 2, -EH / 2, EW / 2, -EH / 2, 0, -EH / 2 + 40);
        flap.lineStyle(1, 0xa08050, 0.8);
        flap.strokeTriangle(-EW / 2, -EH / 2, EW / 2, -EH / 2, 0, -EH / 2 + 40);

        // Dobras dos cantos inferiores
        const folds = this.add.graphics();
        folds.lineStyle(1, 0xa08050, 0.4);
        folds.lineBetween(-EW / 2, EH / 2, 0, 5);
        folds.lineBetween( EW / 2, EH / 2, 0, 5);

        // Carimbo (canto superior direito)
        const stamp = this.add.rectangle(EW / 2 - 28, -EH / 2 + 26, 40, 40, 0xffffff).setStrokeStyle(2, 0xcc3333);
        const stampText = this.add.text(EW / 2 - 28, -EH / 2 + 26, doc.display, {
            fontFamily: 'PressStart2P', fontSize: '6px', color: '#cc2222',
            align: 'center', wordWrap: { width: 34 },
        }).setOrigin(0.5);

        // Data em destaque no centro
        const dateText = this.add.text(-20, 8, doc.date, {
            fontFamily: 'PressStart2P', fontSize: '16px', color: '#1a0f00',
        }).setOrigin(0.5);

        // Nome do documento embaixo da data
        const labelText = this.add.text(-20, 36, doc.label, {
            fontFamily: 'PressStart2P', fontSize: '7px', color: '#44330a',
            align: 'center', wordWrap: { width: EW - 80 },
        }).setOrigin(0.5);

        // Linhas decorativas simulando texto (lado esquerdo)
        const deco = this.add.graphics();
        deco.fillStyle(0x998855, 0.35);
        [- 22, -12, -2].forEach(dy => deco.fillRect(-EW / 2 + 10, dy, 30, 3));

        container.add([shadow, bg, flap, folds, deco, stamp, stampText, dateText, labelText]);

        // Interatividade
        container.setInteractive({ draggable: true, useHandCursor: true });
        container.docData  = doc;
        container._homeX   = x;
        container._homeY   = y;
        container._homeRot = 0;

        this.input.setDraggable(container);

        container.on('pointerover', () => {
            if (!container.input?.enabled) return;
            bg.setStrokeStyle(2, 0xF9C22B);
            this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 80 });
        });

        container.on('pointerout', () => {
            if (!container.input?.enabled) return;
            bg.setStrokeStyle(2, 0xa08050);
            this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
        });

        container.on('dragstart', () => {
            container.setDepth(50).setRotation(0);
            this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });
            this._dropZoneRect.setFillStyle(0xF9C22B, 0.08);
            this._pilhaLabel.setColor('#F9C22B');
        });

        container.on('drag', (_p, dragX, dragY) => container.setPosition(dragX, dragY));

        container.on('dragend', () => {
            container.setDepth(10);
            this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
            this._dropZoneRect.setFillStyle(0xffffff, 0);
            this._pilhaLabel.setColor('#888870');

            const inTray =
                container.x > trayX - trayW / 2 &&
                container.x < trayX + trayW / 2 &&
                container.y > trayY - trayH / 2 &&
                container.y < trayY + trayH / 2;

            inTray ? this._tryStack(container, trayX, trayY, trayW, trayH)
                   : this._returnCard(container);
        });

        return container;
    }

    /**
     * Tenta encaixar o card na bandeja. Valida se é o documento esperado.
     * @param {Phaser.GameObjects.Container} container
     * @param {number} trayX
     * @param {number} trayY
     * @param {number} trayW
     * @param {number} trayH
     * @private
     */
    _tryStack(container, trayX, trayY, trayW, trayH) {
        const isCorrect = container.docData.id === this._nextExpected;

        if (isCorrect) {
            const slotIdx = this._stackedCount;
            this._stackedCount++;
            this._nextExpected++;

            // Calcula posição Y dentro da bandeja: empilha de baixo pra cima
            // O primeiro envelope fica no fundo, cada novo vai acima
            const INNER_H   = trayH - 40;           // altura útil interna
            const ENV_H     = 80;                    // altura reduzida do envelope na pilha
            const bottomY   = trayY + trayH / 2 - 30;
            const destY     = bottomY - slotIdx * (ENV_H - 18); // sobreposição leve
            const destX     = trayX;

            this._flashCard(container, 0x22cc66);

            this.tweens.add({
                targets: container,
                x: destX,
                y: destY,
                rotation: 0,
                scaleX: 0.88,
                scaleY: 0.62,
                duration: 300,
                ease: 'Back.easeOut',
                onComplete: () => {
                    container.setDepth(8 + slotIdx);
                    container.disableInteractive();
                },
            });

            // Acende marcador lateral
            const slot = this._progressSlots[slotIdx];
            if (slot) {
                slot.setFillStyle(0x88cc66);
                this.tweens.add({ targets: slot, scaleX: 2, duration: 120, yoyo: true });
            }

            // Esconde label "SOLTE AQUI" após o primeiro acerto
            if (this._stackedCount === 1) this._pilhaLabel.setVisible(false);

            this._updateHint();

            if (this._stackedCount === this._documents.length) {
                this.time.delayedCall(500, () => this._onComplete());
            }
        } else {
            this._errorCount++;
            this._errorText.setText(`✗ ${this._errorCount}`);

            this._flashCard(container, 0xcc2222);
            this._shakeCard(container);
            this._returnCard(container);
            this._shakeHint();

            this._hintText.setColor('#ff6644');
            this.time.delayedCall(600, () => this._hintText.setColor('#ddddaa'));
        }
    }

    /**
     * Devolve o envelope à posição original com física suave.
     * Usa dois tweens encadeados: primeiro sobe levemente (bounce),
     * depois desce em arco até a posição de origem — sem teleporte.
     * @private
     */
    _returnCard(container) {
        // Cancela tweens anteriores nesse container para evitar conflito
        this.tweens.killTweensOf(container);

        const tx = container._homeX;
        const ty = container._homeY;
        const tr = container._homeRot ?? 0;

        // Fase 1: pausa breve no ar (leve subida)
        this.tweens.add({
            targets: container,
            y: container.y - 20,
            duration: 80,
            ease: 'Sine.easeOut',
            onComplete: () => {
                // Fase 2: cai em arco até a origem
                this.tweens.add({
                    targets: container,
                    x: tx,
                    y: ty,
                    rotation: tr,
                    duration: 420,
                    ease: 'Cubic.easeIn',
                });
            },
        });
    }

    /**
     * Pisca o fundo e borda do card com a cor indicada (acerto/erro).
     * @private
     */
    _flashCard(container, color) {
        const bg = container.list[1]; // index 1 = bg (após shadow)
        const originalFill   = 0xd4b483;
        const originalStroke = 0xa08050;

        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 150,
            yoyo: true,
            repeat: 1,
            onUpdate: (tween) => {
                const v = tween.getValue();
                if (v > 0.5) {
                    bg.setFillStyle(color);
                    bg.setStrokeStyle(2, color);
                } else {
                    bg.setFillStyle(originalFill);
                    bg.setStrokeStyle(2, originalStroke);
                }
            },
        });
    }

    /**
     * Animação de shake lateral no card para indicar erro.
     * @private
     */
    _shakeCard(container) {
        const baseX = container.x;
        this.tweens.add({
            targets: container,
            x: { from: baseX - 10, to: baseX + 10 },
            duration: 50,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut',
            onComplete: () => container.setX(baseX),
        });
    }

    /**
     * Atualiza o texto de dica mostrando qual documento colocar a seguir,
     * e destaca visualmente o card correspondente.
     * @private
     */
    _updateHint() {
        if (this._nextExpected >= this._documents.length) {
            this._hintText.setText('');
            this._hintBg.setVisible(false);
            return;
        }

        const next = this._documents[this._nextExpected];
        this._hintText.setText(`► Próximo: ${next.label}  (${next.display})`);

        // Destaca o card correto com brilho suave
        this._cards.forEach(card => {
            if (!card.input?.enabled) return;
            const isNext = card.docData.id === this._nextExpected;
            const bg = card.list[1];
            if (isNext) {
                bg.setStrokeStyle(2, 0xF9C22B);
            } else {
                bg.setStrokeStyle(2, 0xa08050);
            }
        });
    }

    /**
     * Animação de shake no hint para indicar erro.
     * @private
     */
    _shakeHint() {
        this.tweens.add({
            targets: this._hintText,
            x: { from: this.scale.width / 2 - 8, to: this.scale.width / 2 + 8 },
            duration: 60,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this._hintText.setX(this.scale.width / 2);
            },
        });
    }


    /**
     * Chamado quando todos os documentos foram empilhados corretamente.
     * Exibe painel de conclusão com score e emite o resultado.
     * @private
     */
    _onComplete() {
        const W = this.scale.width;
        const H = this.scale.height;

        const score = Math.max(0, 100 - this._errorCount * 10);

        // Overlay escurecido
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
            .setDepth(200);
        this.tweens.add({ targets: overlay, alpha: 0.6, duration: 300 });

        // Painel principal
        const panel = this.add.rectangle(W / 2, H / 2, 560, 260, 0x0f1a2e, 1)
            .setStrokeStyle(3, 0xF9C22B)
            .setDepth(201)
            .setAlpha(0);

        this.tweens.add({ targets: panel, alpha: 1, scaleX: { from: 0.7, to: 1 }, scaleY: { from: 0.7, to: 1 }, duration: 350, ease: 'Back.easeOut' });

        // Ícone de check
        this.add.text(W / 2, H / 2 - 80, '✓', {
            fontFamily: 'PressStart2P',
            fontSize: '32px',
            color: '#22cc66',
        }).setOrigin(0.5).setDepth(202).setAlpha(0)
            .setName('check_icon');

        this.time.delayedCall(200, () => {
            const icon = this.children.getByName('check_icon');
            this.tweens.add({ targets: icon, alpha: 1, y: H / 2 - 90, duration: 300, ease: 'Back.easeOut' });
        });

        this.add.text(W / 2, H / 2 - 18, 'DOCUMENTOS ORGANIZADOS!', {
            fontFamily: 'PressStart2P',
            fontSize: '16px',
            color: '#F9C22B',
            align: 'center',
        }).setOrigin(0.5).setDepth(202);

        // Score
        const scoreColor = score >= 80 ? '#22cc66' : score >= 50 ? '#F9C22B' : '#cc4444';
        this.add.text(W / 2, H / 2 + 28, `PONTUAÇÃO: ${score}`, {
            fontFamily: 'PressStart2P',
            fontSize: '13px',
            color: scoreColor,
        }).setOrigin(0.5).setDepth(202);

        // Erros cometidos
        const erroMsg = this._errorCount === 0
            ? 'Perfeito! Nenhum erro!'
            : `Erros: ${this._errorCount}`;
        this.add.text(W / 2, H / 2 + 62, erroMsg, {
            fontFamily: 'PressStart2P',
            fontSize: '10px',
            color: this._errorCount === 0 ? '#22cc66' : '#cc8844',
        }).setOrigin(0.5).setDepth(202);

        this.time.delayedCall(2200, () => {
            EventsManager.getInstance().emit('minigame:scene_result', {
                success: true,
                score,
            });
        });
    }
}