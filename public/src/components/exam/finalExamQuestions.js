/**
 * Banco de questoes da prova final.
 *
 * Mantemos os dados fora da cena para que o conteudo possa evoluir
 * sem acoplar regra de apresentacao com regra pedagogica.
 */
export const FINAL_EXAM_PASSING_SCORE = 3;

export const FINAL_EXAM_QUESTIONS = [
    {
        id: "emprestimo-finalidade",
        prompt: "Para que um empréstimo deve ser usado com mais responsabilidade?",
        choices: [
            "Para fazer apostas e tentar recuperar dinheiro.",
            "Para comprar qualquer coisa sem pensar no orçamento.",
            "Para cobrir uma necessidade real e planejada.",
        ],
        correctAnswer: 2,
        explanation: "O empréstimo deve apoiar uma necessidade real e entrar em um planejamento de pagamento."
    },
    {
        id: "parcelamento-custo",
        prompt: "Em geral, o que costuma acontecer quando aumentamos muito a quantidade de parcelas?",
        choices: [
            "O valor total pago sempre diminui.",
            "O valor total pago tende a aumentar.",
            "Os juros deixam de existir.",
        ],
        correctAnswer: 1,
        explanation: "Mais parcelas costumam aliviar o valor mensal, mas aumentam o custo total da dívida."
    },
    {
        id: "orcamento-prestacao",
        prompt: "Antes de aceitar uma prestação, qual e a análise mais importante?",
        choices: [
            "Ver se a parcela cabe no orçamento mensal sem comprometer despesas essenciais.",
            "Aceitar rápido antes da oferta acabar.",
            "Escolher a opção com mais parcelas sem comparar nada.",
        ],
        correctAnswer: 0,
        explanation: "A decisão precisa considerar renda, gastos fixos e segurança para o mês inteiro."
    },
    {
        id: "reserva-emergencia",
        prompt: "Se uma pessoa já tem dificuldade para guardar dinheiro, o melhor passo é:",
        choices: [
            "Fazer novas dívidas para organizar as antigas sem cálculo.",
            "Ignorar o planejamento porque depois resolve.",
            "Criar controle de gastos e começar uma reserva aos poucos.",
        ],
        correctAnswer: 2,
        explanation: "Organização financeira e reserva gradual reduzem dependência do crédito no futuro."
    },
    {
        id: "credito-consciente",
        prompt: "Qual atitude representa o uso consciente do crédito?",
        choices: [
            "Escolher qualquer proposta porque o valor da parcela parece pequeno.",
            "Assumir que toda dívida é segura se for parcelada.",
            "Comparar condições, juros e impacto no orçamento antes de decidir.",
        ],
        correctAnswer: 2,
        explanation: "Usar crédito com consciência exige comparação e entendimento do custo real."
    },
];
