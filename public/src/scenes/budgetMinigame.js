import { SCENES } from "../constants.js";
import EventsManager from "../components/managers/EventsManager.js";
import PlayerMoneyManager from "../components/managers/PlayerMoneyManager.js";
import FeedbackManager from "../components/managers/FeedbackManager.js";
import WellbeingManager from "../components/managers/WellbeingManager.js";
import { createBudgetSessionData, gradeHex } from "../components/budgetMinigame/budgetMinigameData.js";
import { BUDGET_THEME } from "../components/budgetMinigame/budgetMinigameTheme.js";
import {
    createBackdrop,
    makeButton,
    makeRoundedPanel,
    makeText,
} from "../components/budgetMinigame/BudgetMinigameUI.js";

export default class BudgetMinigameScene extends Phaser.Scene {
    constructor() {
        super({ key: SCENES.BUDGET_MINIGAME });
    }

    init(data) {
        this._day = data?.config?.day ?? data?.day ?? 1;
    }

    create() {
        this._setupLayout();
        this._prepareState();

        createBackdrop(this);
        this._createFrame();
        this._createHeader();
        this._createSidebar();
        this._showStep();
    }

    _setupLayout() {
        const width = this.scale.width;
        const height = this.scale.height;

        this._layout = {
            width,
            height,
            outerX: 120,
            outerY: 80,
            outerW: width - 240,
            outerH: height - 160,
            headerH: 112,
            sidebarW: 360,
        };

        this._layout.contentX = this._layout.outerX + this._layout.sidebarW + 28;
        this._layout.contentY = this._layout.outerY + this._layout.headerH + 24;
        this._layout.contentW = this._layout.outerW - this._layout.sidebarW - 52;
        this._layout.contentH = this._layout.outerH - this._layout.headerH - 48;
    }

    _prepareState() {
        this._wb = WellbeingManager.getInstance();
        this._mm = PlayerMoneyManager.getInstance();

        const mistakes = FeedbackManager.getInstance().getMistakesOfDay().length;
        this._rawIncome = this._mm.getBalance();
        this._yieldValue = this._wb.applyFundYield();

        const session = createBudgetSessionData({
            income: this._rawIncome,
            mistakes,
            fund: this._wb.fund,
            wellbeing: this._wb,
        });

        this._hapPenalty = session.happinessPenalty;
        this._effectIncome = session.effectiveIncome;
        this._pendingDebts = session.pendingDebts;
        this._fixed = session.fixed;
        this._entertain = session.entertain;
        this._sporadic = session.sporadic;
        this._choices = [...this._entertain, ...this._sporadic];

        const debts = this._pendingDebts.reduce((sum, debt) => sum + debt.total, 0);
        const fixed = this._fixed.reduce((sum, item) => sum + item.value, 0);

        this._balance = this._effectIncome - debts - fixed;
        this._fixedPaying = this._fixed.map(() => true);
        this._entertainPaid = false;
        this._committed = false;
        this._step = 0;
        this._transitioning = false;
        this._content = null;
    }

    _createFrame() {
        const { outerX, outerY, outerW, outerH } = this._layout;

        makeRoundedPanel(this, null, outerX + 10, outerY + 12, outerW, outerH, {
            fillColor: 0xb69468,
            fillAlpha: 0.18,
            borderColor: 0xb69468,
            borderAlpha: 0,
            radius: 18,
        });

        makeRoundedPanel(this, null, outerX, outerY, outerW, outerH, {
            fillColor: BUDGET_THEME.surface.main,
            borderColor: BUDGET_THEME.surface.outlineStrong,
            radius: 18,
        });

        this.add.rectangle(
            outerX + this._layout.sidebarW + 14,
            outerY + this._layout.headerH + 12 + this._layout.contentH / 2,
            2,
            this._layout.contentH,
            BUDGET_THEME.surface.outline,
            0.4
        ).setOrigin(0, 0.5);
    }

    _createHeader() {
        const { outerX, outerY, outerW, headerH } = this._layout;
        const headerInnerX = outerX + 20;
        const headerInnerY = outerY + 20;
        const headerInnerW = outerW - 40;
        const balanceAreaW = 250;
        const titleAreaRight = headerInnerX + headerInnerW - balanceAreaW - 32;

        makeRoundedPanel(this, null, headerInnerX, headerInnerY, headerInnerW, headerH - 28, {
            fillColor: BUDGET_THEME.surface.raised,
            borderColor: BUDGET_THEME.surface.outline,
            radius: 14,
        });

        makeText(this, null, headerInnerX + 24, headerInnerY + 18, `DIA ${this._day}`, {
            fontSize: "16px",
            color: BUDGET_THEME.text.accent,
        });

        makeText(this, null, headerInnerX + 24, headerInnerY + 48, "Planejamento Financeiro", {
            fontSize: "26px",
            color: BUDGET_THEME.text.primary,
        });

        makeText(this, null, headerInnerX + 520, headerInnerY + 60, "Organize o dinheiro do dia e feche o caixa com clareza.", {
            fontSize: "10px",
            color: BUDGET_THEME.text.secondary,
            wordWrap: { width: Math.max(120, titleAreaRight - (headerInnerX + 520)) },
        });

        this.add.rectangle(
            headerInnerX + headerInnerW - balanceAreaW - 18,
            headerInnerY + 16,
            2,
            48,
            BUDGET_THEME.surface.outline,
            0.35
        ).setOrigin(0, 0);

        makeText(this, null, headerInnerX + headerInnerW - balanceAreaW, headerInnerY + 18, "Saldo atual", {
            fontSize: "13px",
            color: BUDGET_THEME.text.muted,
        });

        this._headerBalance = makeText(this, null, headerInnerX + headerInnerW - balanceAreaW, headerInnerY + 42, "R$ 0", {
            fontSize: "24px",
            color: BUDGET_THEME.text.success,
        });
    }

    _createSidebar() {
        const { outerX, contentY, sidebarW, contentH } = this._layout;
        const x = outerX + 20;
        const y = contentY;
        const w = sidebarW - 12;

        makeRoundedPanel(this, null, x, y, w, contentH, {
            fillColor: BUDGET_THEME.surface.raised,
            borderColor: BUDGET_THEME.surface.outline,
            radius: 14,
        });

        makeText(this, null, x + 24, y + 24, "Resumo rapido", {
            fontSize: "18px",
            color: BUDGET_THEME.text.primary,
        });

        this._sidebarBalance = this._statBlock(x + 24, y + 72, w - 48, 94, "Saldo projetado", "R$ 0");
        this._sidebarStability = this._statBlock(x + 24, y + 182, w - 48, 84, "Estabilidade amanha", "100%");
        this._sidebarHappiness = this._statBlock(x + 24, y + 278, w - 48, 84, "Felicidade amanha", "100%");
        this._sidebarFund = this._statBlock(x + 24, y + 374, w - 48, 84, "Fundo de emergencia", `R$ ${this._wb.fund}`);

        makeText(this, null, x + 24, y + 488, "Como jogar", {
            fontSize: "16px",
            color: BUDGET_THEME.text.primary,
        });

        makeText(this, null, x + 24, y + 526,
            "1. Veja o dinheiro disponivel.\n2. Decida quais contas pagar.\n3. Resolva gastos extras.\n4. Feche o dia e, se der, guarde uma reserva.",
            {
                fontSize: "13px",
                color: BUDGET_THEME.text.secondary,
                lineSpacing: 12,
                wordWrap: { width: w - 48 },
            }
        );

        this._refreshSidebar();
    }

    _statBlock(x, y, width, height, label, value) {
        makeRoundedPanel(this, null, x, y, width, height, {
            fillColor: BUDGET_THEME.surface.main,
            borderColor: BUDGET_THEME.surface.outline,
            radius: 12,
        });

        makeText(this, null, x + 16, y + 14, label, {
            fontSize: "12px",
            color: BUDGET_THEME.text.muted,
        });

        return makeText(this, null, x + 16, y + 42, value, {
            fontSize: "22px",
            color: BUDGET_THEME.text.primary,
        });
    }

    _refreshSidebar() {
        const projectedStability = this._wb.projectStability(this._fixedPaying.filter((item) => !item).length);
        const projectedHappiness = this._wb.projectHappiness(this._entertainPaid);

        this._headerBalance
            .setText(`R$ ${this._balance}`)
            .setColor(this._balance < 0 ? BUDGET_THEME.text.danger : BUDGET_THEME.text.success);

        this._sidebarBalance
            .setText(`R$ ${this._balance}`)
            .setColor(this._balance < 0 ? BUDGET_THEME.text.danger : BUDGET_THEME.text.success);

        this._sidebarStability
            .setText(`${projectedStability}%`)
            .setColor(gradeHex(projectedStability / 100));

        this._sidebarHappiness
            .setText(`${projectedHappiness}%`)
            .setColor(gradeHex(projectedHappiness / 100));

        this._sidebarFund.setText(`R$ ${this._wb.fund}`).setColor(BUDGET_THEME.text.cyan);
    }

    _showStep() {
        const build = () => {
            this._transitioning = false;
            this._content = this.add.container(0, 0).setDepth(5).setAlpha(0);

            if (this._step === 0) this._buildIntro();
            else if (this._step === 1) this._buildFixed();
            else if (this._step - 2 < this._choices.length) this._buildChoice(this._choices[this._step - 2], this._step - 2);
            else this._buildSummary();

            this.tweens.add({ targets: this._content, alpha: 1, duration: 120 });
        };

        if (!this._content) {
            build();
            return;
        }

        this.tweens.add({
            targets: this._content,
            alpha: 0,
            duration: 100,
            onComplete: () => {
                this._content.destroy(true);
                this._content = null;
                build();
            },
        });
    }

    _advance() {
        if (this._transitioning) return;
        this._transitioning = true;
        this._step += 1;
        this._showStep();
    }

    _buildIntro() {
        const { contentX, contentY, contentW, contentH } = this._layout;

        this._paper(contentX, contentY, contentW, contentH);
        this._title(contentX, contentY, "Antes de gastar");
        this._subtitle(contentX, contentY, "Aqui esta o dinheiro que voce tem para organizar no fim do dia.");

        const rows = [
            { label: "Saldo acumulado do dia", value: `+ R$ ${this._rawIncome}`, color: BUDGET_THEME.text.success },
            ...(this._hapPenalty > 0 ? [{ label: "Desconto por esgotamento", value: `- R$ ${this._hapPenalty}`, color: BUDGET_THEME.text.danger }] : []),
            ...this._pendingDebts.map((debt) => ({
                label: `${debt.label} com multa`,
                value: `- R$ ${debt.total}`,
                color: BUDGET_THEME.text.warning,
            })),
            { label: "Rendimento do fundo", value: this._yieldValue > 0 ? `+ R$ ${this._yieldValue}` : "R$ 0", color: BUDGET_THEME.text.cyan },
        ];

        let y = contentY + 138;
        rows.forEach((row) => {
            this._lineItem(contentX + 40, y, contentW - 80, row.label, row.value, row.color, true);
            y += 64;
        });

        this.add.rectangle(contentX + 40, y + 10, contentW - 80, 2, BUDGET_THEME.surface.outline, 0.35).setOrigin(0, 0);

        makeText(this, this._content, contentX + 40, y + 34, "Dinheiro disponivel para planejar agora", {
            fontSize: "18px",
            color: BUDGET_THEME.text.primary,
        });

        makeText(this, this._content, contentX + contentW - 40, y + 24, `R$ ${this._effectIncome - this._pendingDebts.reduce((sum, debt) => sum + debt.total, 0)}`, {
            fontSize: "36px",
            color: this._balance < 0 ? BUDGET_THEME.text.danger : BUDGET_THEME.text.success,
            origin: [1, 0],
        });

        makeButton(this, this._content, contentX + contentW - 170, contentY + contentH - 52, 260, "Continuar", () => this._advance(), {
            fill: BUDGET_THEME.buttons.primary,
        });
    }

    _buildFixed() {
        const { contentX, contentY, contentW, contentH } = this._layout;

        this._paper(contentX, contentY, contentW, contentH);
        this._title(contentX, contentY, "Contas fixas");
        this._subtitle(contentX, contentY, "Clique em cada conta. Verde paga hoje, vermelho deixa para depois com multa.");

        const cols = 2;
        const gap = 20;
        const cardW = (contentW - 100 - gap) / cols;
        const cardH = 180;

        this._fixed.forEach((item, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);
            const x = contentX + 40 + col * (cardW + gap);
            const y = contentY + 138 + row * (cardH + 20);
            this._fixedCard(item, index, x, y, cardW, cardH);
        });

        makeText(this, this._content, contentX + 40, contentY + contentH - 98, "Contas puladas voltam no dia seguinte com 20% de multa.", {
            fontSize: "15px",
            color: BUDGET_THEME.text.warning,
        });

        makeButton(this, this._content, contentX + contentW - 180, contentY + contentH - 52, 280, "Confirmar contas", () => this._advance(), {
            fill: BUDGET_THEME.buttons.primary,
        });
    }

    _fixedCard(item, index, x, y, width, height) {
        const shadow = this.add.rectangle(x + 6, y + 8, width, height, 0xb69468, 0.12)
            .setOrigin(0, 0)
            .setRounded(14);
        this._content.add(shadow);

        const bg = this.add.rectangle(x, y, width, height, BUDGET_THEME.surface.raised, 1)
            .setOrigin(0, 0)
            .setRounded(14)
            .setStrokeStyle(3, item.color, 0.7);
        this._content.add(bg);

        const activeRail = this.add.rectangle(x + 18, y + 20, 8, height - 40, item.color, 0.9)
            .setOrigin(0, 0)
            .setRounded(6);
        this._content.add(activeRail);

        const statusBg = this.add.rectangle(x + width - 118, y + 22, 94, 32, BUDGET_THEME.status.success, 1)
            .setOrigin(0, 0)
            .setRounded(12)
            .setStrokeStyle(2, item.color, 1);
        this._content.add(statusBg);

        const statusText = makeText(this, this._content, x + width - 71, y + 38, "PAGO", {
            fontSize: "9px",
            color: BUDGET_THEME.text.success,
            origin: [0.5, 0.5],
        });

        const title = makeText(this, this._content, x + 36, y + 24, item.label, {
            fontSize: "18px",
            color: BUDGET_THEME.text.primary,
        });

        makeText(this, this._content, x + 36, y + 68, item.caption, {
            fontSize: "13px",
            color: BUDGET_THEME.text.secondary,
        });

        const value = makeText(this, this._content, x + 36, y + 104, `R$ ${item.value}`, {
            fontSize: "30px",
            color: BUDGET_THEME.text.accent,
        });

        const helper = makeText(this, this._content, x + 36, y + 150, "Conta entra no saldo de hoje.", {
            fontSize: "14px",
            color: BUDGET_THEME.text.success,
        });

        const actionBg = this.add.rectangle(x + width - 118, y + height - 40, 94, 24, BUDGET_THEME.surface.main, 1)
            .setOrigin(0, 0)
            .setRounded(10)
            .setStrokeStyle(2, item.color, 0.8);
        this._content.add(actionBg);

        const actionText = makeText(this, this._content, x + width - 71, y + height - 28, "ADIAR", {
            fontSize: "8px",
            color: BUDGET_THEME.text.success,
            origin: [0.5, 0.5],
        });

        let hovered = false;

        const redraw = () => {
            const paying = this._fixedPaying[index];
            bg
                .setFillStyle(paying ? BUDGET_THEME.surface.raised : 0xfff1ec, 1)
                .setStrokeStyle(hovered ? 4 : 3, paying ? item.color : 0xC94B3C, hovered ? 1 : 0.9);
            shadow.setFillStyle(paying ? 0xb69468 : 0xc94b3c, hovered ? 0.18 : (paying ? 0.12 : 0.08));
            activeRail.setFillStyle(paying ? item.color : 0xC94B3C, 0.92);
            statusBg
                .setFillStyle(paying ? BUDGET_THEME.status.success : BUDGET_THEME.status.danger, 1)
                .setStrokeStyle(2, paying ? item.color : 0xC94B3C, 1);
            statusText
                .setText(paying ? "PAGO" : "ADIADA")
                .setColor(paying ? BUDGET_THEME.text.success : BUDGET_THEME.text.danger);
            helper
                .setText(paying ? "Clique para adiar esta conta." : "Clique para pagar esta conta.")
                .setColor(paying ? BUDGET_THEME.text.success : BUDGET_THEME.text.danger);
            actionBg
                .setFillStyle(
                    paying
                        ? (hovered ? BUDGET_THEME.status.success : BUDGET_THEME.surface.main)
                        : (hovered ? BUDGET_THEME.status.danger : BUDGET_THEME.surface.main),
                    1
                )
                .setStrokeStyle(2, paying ? item.color : 0xC94B3C, 1);
            actionText
                .setText(paying ? "ADIAR" : "PAGAR")
                .setColor(paying ? BUDGET_THEME.text.success : BUDGET_THEME.text.danger);
            value.setColor(paying ? BUDGET_THEME.text.accent : BUDGET_THEME.text.danger);
            title.setColor(BUDGET_THEME.text.primary);
        };

        redraw();

        const zone = this.add.zone(x + width / 2, y + height / 2, width, height)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => {
                hovered = true;
                redraw();
            })
            .on("pointerout", () => {
                hovered = false;
                redraw();
            })
            .on("pointerdown", () => {
                this._fixedPaying[index] = !this._fixedPaying[index];
                this._recalculateBalance();
                redraw();
                this._refreshSidebar();
            });

        this._content.add(zone);
    }

    _buildChoice(choice, index) {
        const { contentX, contentY, contentW, contentH } = this._layout;

        this._paper(contentX, contentY, contentW, contentH);
        this._title(contentX, contentY, choice.label);
        this._subtitle(contentX, contentY, `Etapa ${index + 1} de ${this._choices.length}. Escolha a acao que faz mais sentido para hoje.`);

        makeRoundedPanel(this, this._content, contentX + 40, contentY + 136, contentW - 80, 150, {
            fillColor: BUDGET_THEME.surface.main,
            borderColor: choice.color ?? BUDGET_THEME.surface.outline,
            radius: 14,
        });

        const infoStartX = contentX + 410;
        const infoWidth = contentW - 470;

        makeText(this, this._content, contentX + 64, contentY + 162, "Custo desta escolha", {
            fontSize: "16px",
            color: BUDGET_THEME.text.muted,
        });

        makeText(this, this._content, contentX + 64, contentY + 198, `R$ ${choice.value}`, {
            fontSize: "46px",
            color: choice.color ? `#${choice.color.toString(16).padStart(6, "0")}` : BUDGET_THEME.text.primary,
        });

        this._content.add(
            this.add.rectangle(contentX + 360, contentY + 160, 2, 102, BUDGET_THEME.surface.outline, 0.22).setOrigin(0, 0)
        );

        makeText(this, this._content, infoStartX, contentY + 164, "O que esta acontecendo", {
            fontSize: "16px",
            color: BUDGET_THEME.text.primary,
        });

        makeText(this, this._content, infoStartX, contentY + 206, choice.desc, {
            fontSize: "16px",
            color: BUDGET_THEME.text.secondary,
            wordWrap: { width: infoWidth },
            lineSpacing: 12,
        });

        if (choice.mandatory) {
            makeRoundedPanel(this, this._content, contentX + 40, contentY + 316, contentW - 80, 150, {
                fillColor: BUDGET_THEME.status.danger,
                borderColor: choice.color ?? BUDGET_THEME.surface.outline,
                radius: 14,
            });

            makeText(this, this._content, contentX + 64, contentY + 346, "Desconto obrigatorio", {
                fontSize: "20px",
                color: BUDGET_THEME.text.primary,
            });

            makeText(this, this._content, contentX + 64, contentY + 390, choice.payFx, {
                fontSize: "18px",
                color: BUDGET_THEME.text.secondary,
                wordWrap: { width: contentW - 128 },
            });

            makeButton(this, this._content, contentX + contentW - 210, contentY + contentH - 52, 280, choice.pay, () => this._resolveChoice(choice, "pay"), {
                fill: choice.color ?? BUDGET_THEME.buttons.primary,
                textColor: BUDGET_THEME.text.primary,
            });
            return;
        }

        const actions = [
            {
                label: choice.pay,
                action: "pay",
                title: "Pagar agora",
                effect: choice.payFx,
                fillColor: BUDGET_THEME.status.warning,
                borderColor: choice.color ?? BUDGET_THEME.surface.outline,
                buttonFill: choice.color ?? BUDGET_THEME.buttons.primary,
                textColor: "#FFF8EB",
            },
        ];

        if (choice.fundOption) {
            actions.push({
                label: "Usar fundo",
                action: "fund",
                title: "Usar reserva",
                effect: "Resolve o problema sem mexer no saldo principal do dia.",
                fillColor: BUDGET_THEME.status.info,
                borderColor: 0x5b8d9a,
                buttonFill: BUDGET_THEME.buttons.success,
                textColor: BUDGET_THEME.text.primary,
            });
        }

        actions.push({
            label: choice.skip,
            action: "skip",
            title: "Deixar para depois",
            effect: choice.skipFx,
            fillColor: BUDGET_THEME.surface.main,
            borderColor: BUDGET_THEME.surface.outline,
            buttonFill: BUDGET_THEME.buttons.tertiary,
            textColor: BUDGET_THEME.text.primary,
            outline: true,
        });

        const gap = 20;
        const cardWidth = (contentW - 80 - gap * (actions.length - 1)) / actions.length;
        const cardHeight = 250;
        const startX = contentX + 40;
        const y = contentY + 326;

        actions.forEach((action, actionIndex) => {
            this._choiceActionCard(
                startX + actionIndex * (cardWidth + gap),
                y,
                cardWidth,
                cardHeight,
                action,
                () => this._resolveChoice(choice, action.action)
            );
        });
    }

    _choiceActionCard(x, y, width, height, config, onClick) {
        makeRoundedPanel(this, this._content, x, y, width, height, {
            fillColor: config.fillColor,
            borderColor: config.borderColor,
            radius: 14,
        });

        makeText(this, this._content, x + 22, y + 22, config.title, {
            fontSize: "18px",
            color: BUDGET_THEME.text.primary,
        });

        makeText(this, this._content, x + 22, y + 64, config.effect, {
            fontSize: "14px",
            color: BUDGET_THEME.text.secondary,
            wordWrap: { width: width - 44 },
            lineSpacing: 10,
        });

        makeButton(this, this._content, x + width / 2, y + height - 42, width - 36, config.label, onClick, {
            fill: config.buttonFill,
            textColor: config.textColor,
            outline: config.outline,
            height: 62,
            fontSize: "16px",
            borderColor: config.borderColor,
        });
    }

    _resolveChoice(choice, action) {
        const idx = this._step - 2;
        const isEntertainment = idx < this._entertain.length;

        if (action === "pay") {
            this._balance -= choice.value;
            if (isEntertainment && !choice.isError) this._entertainPaid = true;
        } else if (action === "fund") {
            this._wb.coverWithFund(choice.value);
        }

        this._refreshSidebar();
        this._advance();
    }

    _buildSummary() {
        if (!this._committed) this._commitDay();

        const { contentX, contentY, contentW, contentH } = this._layout;
        this._paper(contentX, contentY, contentW, contentH);
        this._title(contentX, contentY, "Fechamento final");
        this._subtitle(contentX, contentY, "Confira como o dia terminou e decida se quer guardar uma reserva.");

        makeText(this, this._content, contentX + 50, contentY + 160, "Saldo final", {
            fontSize: "18px",
            color: BUDGET_THEME.text.muted,
        });

        makeText(this, this._content, contentX + 50, contentY + 198, `R$ ${this._balance}`, {
            fontSize: "54px",
            color: this._balance < 0 ? BUDGET_THEME.text.danger : BUDGET_THEME.text.success,
        });

        const message = this._balance < 0
            ? "Voce fechou o dia no vermelho. O ideal agora e evitar mais risco no proximo ciclo."
            : this._balance >= 20
                ? "Sobrou dinheiro. Se quiser, uma parte pode ir para o fundo de emergencia."
                : "Voce terminou no azul, mas com pouca margem.";

        makeText(this, this._content, contentX + 50, contentY + 286, message, {
            fontSize: "18px",
            color: BUDGET_THEME.text.secondary,
            wordWrap: { width: contentW - 100 },
            lineSpacing: 12,
        });

        if (this._balance >= 20) {
            const amounts = [...new Set([0.25, 0.5, 0.75, 1].map((ratio) => Math.max(5, Math.round(this._balance * ratio / 5) * 5)))];
            this._selectedFundAmount = 0;

            makeText(this, this._content, contentX + 50, contentY + 390, "Quanto guardar?", {
                fontSize: "18px",
                color: BUDGET_THEME.text.primary,
            });

            amounts.forEach((amount, index) => {
                const x = contentX + 50 + index * 156;
                const bg = this.add.rectangle(x, contentY + 430, 136, 72, BUDGET_THEME.surface.raised, 1)
                    .setOrigin(0, 0)
                    .setRounded(12)
                    .setStrokeStyle(2, BUDGET_THEME.surface.outline, 1);
                this._content.add(bg);

                const label = makeText(this, this._content, x + 68, contentY + 466, amount >= this._balance ? "Tudo" : `R$ ${amount}`, {
                    fontSize: "16px",
                    color: BUDGET_THEME.text.primary,
                    origin: [0.5, 0.5],
                });

                const draw = (selected) => {
                    bg
                        .setFillStyle(selected ? BUDGET_THEME.status.success : BUDGET_THEME.surface.raised, 1)
                        .setStrokeStyle(2, selected ? 0x2F8A57 : BUDGET_THEME.surface.outline, 1);
                    label.setColor(selected ? BUDGET_THEME.text.success : BUDGET_THEME.text.primary);
                };

                const zone = this.add.zone(x + 68, contentY + 466, 136, 72)
                    .setInteractive({ useHandCursor: true })
                    .on("pointerdown", () => {
                        this._selectedFundAmount = amount;
                        this._fundPickers.forEach((picker) => picker.draw(picker.amount === amount));
                    });

                this._fundPickers.push({ amount, draw });
                this._content.add(zone);
                draw(false);
            });

            makeButton(this, this._content, contentX + contentW - 350, contentY + contentH - 52, 260, "Guardar", () => this._storeInFund(), {
                fill: BUDGET_THEME.buttons.success,
                textColor: BUDGET_THEME.text.primary,
            });
            makeButton(this, this._content, contentX + contentW - 150, contentY + contentH - 52, 180, "Fechar dia", () => this._finish(), {
                fill: BUDGET_THEME.buttons.tertiary,
                textColor: BUDGET_THEME.text.secondary,
                outline: true,
            });
        } else {
            makeButton(this, this._content, contentX + contentW - 170, contentY + contentH - 52, 260, "Fechar dia", () => this._finish(), {
                fill: BUDGET_THEME.buttons.primary,
            });
        }
    }

    _commitDay() {
        this._committed = true;
        this._fundPickers = [];

        const skipped = this._fixed
            .filter((_, index) => !this._fixedPaying[index])
            .map((item) => ({ label: item.label, value: item.value }));

        this._wb.closeDay(skipped, this._entertainPaid);
        const spentToday = Math.max(0, this._rawIncome - Math.max(0, this._balance));
        this._mm.spend(spentToday);
        this._refreshSidebar();
    }

    _storeInFund() {
        if (!this._selectedFundAmount) return;
        this._wb.addToFund(this._selectedFundAmount);
        this._mm.spend(this._selectedFundAmount);
        this._balance -= this._selectedFundAmount;
        this._refreshSidebar();
        this._finish();
    }

    _recalculateBalance() {
        const debts = this._pendingDebts.reduce((sum, debt) => sum + debt.total, 0);
        const fixed = this._fixed
            .filter((_, index) => this._fixedPaying[index])
            .reduce((sum, item) => sum + item.value, 0);
        this._balance = this._effectIncome - debts - fixed;
    }

    _paper(x, y, width, height) {
        makeRoundedPanel(this, this._content, x + 8, y + 10, width, height, {
            fillColor: 0xb69468,
            fillAlpha: 0.12,
            borderColor: 0xb69468,
            borderAlpha: 0,
            radius: 14,
        });
        makeRoundedPanel(this, this._content, x, y, width, height, {
            fillColor: BUDGET_THEME.surface.raised,
            borderColor: BUDGET_THEME.surface.outline,
            radius: 14,
        });
    }

    _title(x, y, text) {
        makeText(this, this._content, x + 40, y + 34, text, {
            fontSize: "28px",
            color: BUDGET_THEME.text.primary,
        });
    }

    _subtitle(x, y, text) {
        makeText(this, this._content, x + 40, y + 78, text, {
            fontSize: "15px",
            color: BUDGET_THEME.text.secondary,
            wordWrap: { width: this._layout.contentW - 80 },
        });
    }

    _lineItem(x, y, width, label, value, color, divider = false) {
        makeText(this, this._content, x, y, label, {
            fontSize: "18px",
            color: BUDGET_THEME.text.primary,
        });
        makeText(this, this._content, x + width, y, value, {
            fontSize: "20px",
            color,
            origin: [1, 0],
        });
        if (divider) {
            this._content.add(this.add.rectangle(x + width / 2, y + 42, width, 1, BUDGET_THEME.surface.outline, 0.22));
        }
    }

    _finish() {
        EventsManager.getInstance().emit("minigame:scene_result", {
            success: this._balance >= 0,
            score: Math.max(0, this._balance),
        });
        this.scene.stop();
    }
}
