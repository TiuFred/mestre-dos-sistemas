const rand5 = (min, max) => min + Phaser.Math.Between(0, Math.floor((max - min) / 5)) * 5;

export function gradeHex(ratio) {
    if (ratio >= 0.6) return "#55E08A";
    if (ratio >= 0.35) return "#FFB347";
    return "#FF6B6B";
}

export function createBudgetSessionData({ income, mistakes, fund, wellbeing }) {
    const fixed = [
        { label: "Alimentacao", caption: "Mercado da semana", value: rand5(10, 25), color: 0xE67E22 },
        { label: "Agua", caption: "Conta basica da casa", value: rand5(10, 20), color: 0x3498DB },
        { label: "Energia", caption: "Consumo mensal", value: rand5(15, 25), color: 0xF1C40F },
        { label: "Aluguel", caption: "Compromisso principal", value: rand5(20, 30), color: 0x9B59B6 },
    ];

    const entertain = [
        {
            label: "Noite de streaming",
            desc: "Assinatura mensal para descansar um pouco.",
            value: rand5(10, 15),
            color: 0xC0392B,
            pay: "Manter",
            payFx: "+15 felicidade",
            skip: "Cancelar",
            skipFx: "Sem bonus de descanso",
            skipGood: false,
        },
        {
            label: "Saida com amigos",
            desc: "Um respiro social para fechar o dia.",
            value: rand5(10, 25),
            color: 0x7D3C98,
            pay: "Ir",
            payFx: "+15 felicidade",
            skip: "Ficar em casa",
            skipFx: "Economiza, mas pesa no humor",
            skipGood: false,
        },
    ];

    const sporadic = [];

    if (mistakes > 0) {
        sporadic.push({
            label: "Desconto por erros",
            desc: `${mistakes} erro${mistakes > 1 ? "s" : ""} no atendimento de hoje.`,
            value: mistakes * 10,
            color: 0xA93226,
            pay: "Aceitar",
            payFx: "Valor descontado do saldo.",
            mandatory: true,
            isError: true,
        });
    }

    if (Math.random() < 0.4) {
        const value = rand5(15, 25);
        sporadic.push({
            label: "Reparo urgente",
            desc: "Algo quebrou em casa e precisa de atencao.",
            value,
            color: 0x2980B9,
            pay: "Pagar agora",
            payFx: "Problema resolvido.",
            skip: "Adiar",
            skipFx: "Risco de virar um gasto maior depois.",
            skipGood: false,
            fundOption: fund >= value,
        });
    }

    const pendingDebts = wellbeing.consumeDebts();
    const happinessPenalty = wellbeing.happinessPenalty(income);

    return {
        income,
        happinessPenalty,
        effectiveIncome: income - happinessPenalty,
        pendingDebts,
        fixed,
        entertain,
        sporadic,
    };
}
