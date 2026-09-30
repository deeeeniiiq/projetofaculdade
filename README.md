# Saldo — carteira financeira demonstrativa

Aplicação acadêmica full-stack feita com Next.js App Router. Reúne resumo financeiro, transações, histórico, comprovantes em PDF, consulta de criptoativos e um cartão de crédito **demonstrativo**. A interface prioriza uso no celular, movimentos curtos e suporte à preferência do sistema por movimento reduzido.

## Executar

Requer Node.js 22.18+ ou 24.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `.env.local` com a URL e a chave publicável do projeto Supabase. A estrutura inicial está em `supabase/schema.sql`; a migração de detalhes de transferências está em `supabase/migrations/20260929203000_transfer_details.sql`. Sem Supabase, o ambiente de desenvolvimento usa um arquivo local em `.data/`. Em produção, configure as variáveis no provedor de hospedagem.

## Como a aplicação funciona

| Parte | Responsabilidade |
| --- | --- |
| `src/app/dashboard/page.tsx` | Server Component que carrega transações e calcula o resumo antes de renderizar. |
| `src/app/dashboard/cartao/page.tsx` | Server Component da fatura, limite e atividade do cartão. |
| `src/components/dashboard-view.tsx` e `src/components/card-wallet.tsx` | Client Components das interações, diálogos e animações. |
| `src/app/actions/transactions.ts` e `src/app/actions/card.ts` | Server Actions que validam e registram as operações. |
| `src/lib/transactions.ts` | Acesso ao Supabase ou armazenamento local em desenvolvimento. |
| `src/lib/card.ts` | Cálculos em centavos do saldo à vista, despesas e fatura. |
| `src/app/api/receipt/[id]/pdf/route.ts` | Emissão de comprovante PDF a partir de uma transação registrada. |

No cartão, uma compra reduz o **limite disponível** e aumenta a **fatura**, mas não desconta imediatamente o saldo da carteira. Pagar a fatura reduz o saldo e libera limite; o pagamento não é contado novamente como despesa. A tela mostra o impacto antes da confirmação, registra o evento no histórico e oferece o comprovante. Nome do titular e pausa do cartão são preferências locais do navegador. O número exibido é apenas uma máscara fictícia, sem PAN completo, validade ou CVV.

**Todas as operações de cartão e envio de dinheiro são simulações.** Os comprovantes documentam registros internos, não liquidação bancária, cobrança real ou transferência na blockchain. A configuração atual do Supabase é acadêmica e usa políticas públicas de leitura e inserção sem autenticação: não coloque dados pessoais reais. Para contas individuais e pagamentos reais, o próximo passo é implementar Supabase Auth com políticas RLS por usuário e integrar um provedor de pagamentos em ambiente de teste antes de qualquer operação financeira real.

## Verificação

```bash
npm run lint
npm test
npm run build
```

Os testes cobrem cálculos de saldo, fatura e lançamentos para impedir contagem dupla entre compras no crédito e pagamento da fatura.
