# Saldo — Carteira Financeira em Next.js

Aplicação web full-stack para controle de finanças pessoais, construída com **Next.js App Router**, **React**, **TypeScript**, **Tailwind CSS** e **Supabase/PostgreSQL**.

## Requisitos atendidos

- Dashboard com saldo atual, total de receitas e total de despesas.
- Cadastro de movimentações com descrição, valor e tipo.
- Histórico cronológico com diferenciação visual entre entradas e saídas.
- Server Component para buscar e calcular os dados do dashboard.
- Client Component no formulário, com estado de envio e erros de validação.
- Server Action para validar, persistir, revalidar o cache e redirecionar.
- Integração com Supabase/PostgreSQL.
- Interface responsiva para desktop e mobile.
- Modo de demonstração local quando as credenciais do Supabase ainda não existem.

## Arquitetura

### Mercado e conversão

- O dashboard inclui um gráfico compacto; a página Cripto oferece o gráfico completo e o painel de compra/swap.
- Períodos 24h, 7D, 30D e 1A consultam candles distintos da API pública Binance.
- A atualização ocorre a cada 30 segundos enquanto a página está visível. Requisições da seleção anterior são canceladas.
- O histórico em reais usa a cotação atual USDT/BRL; não representa o câmbio histórico.
- Compra e swap são simulações: conversão, revisão e confirmação não enviam ordens, não alteram saldos e não gravam transações financeiras.
- A revisão usa uma cotação congelada, válida por 90 segundos. Taxas e slippage não estão incluídos.
- Os logotipos de moedas ficam em `public/coins`, com fontes documentadas no próprio diretório.
- Favoritos são marcadores da sessão da tela. Os controles e gráficos respeitam a preferência de movimento reduzido.

Validação: `npm run lint`, `npm run build` e `npm run test` (testes com suporte nativo a TypeScript do Node 22.18+ / 24).

```text
src/
├── app/
│   ├── actions/transactions.ts       # Server Action
│   ├── dashboard/
│   │   ├── page.tsx                  # Server Component / resumo + histórico
│   │   └── nova-transacao/page.tsx   # Tela de cadastro
│   └── layout.tsx
├── components/
│   ├── transaction-form.tsx          # Client Component
│   ├── transaction-list.tsx
│   └── summary-card.tsx
├── lib/transactions.ts               # Camada de acesso a dados
└── types/transaction.ts
```

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Sem `.env.local`, a aplicação entra automaticamente em modo de demonstração e persiste os dados em `.data/transactions.json`.

## Conectar ao Supabase

O Supabase funciona como banco/backend desta aplicação. O frontend Next.js deve ser publicado em um host como a Vercel; não existe envio de um APK para o Supabase neste projeto web.

1. Crie um projeto chamado `projetofaculdade` no Supabase.
2. No terminal, execute `npx supabase login` e conclua o login no navegador.
3. No painel do Supabase, copie o **Project Ref** em **Project Settings > General**.
4. Vincule o projeto local com `npx supabase link --project-ref SEU_PROJECT_REF`.
5. Envie a migration com `npx supabase db push`. A migration inicial está em `supabase/migrations/20260929185757_initial_schema.sql`.
6. Copie `.env.example` para `.env.local`.
7. No painel do Supabase, abra o diálogo **Connect** ou **Settings > API Keys** e preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no `.env.local`.
8. Reinicie `npm run dev`.

Como alternativa ao CLI, abra o **SQL Editor** do Supabase e execute `supabase/schema.sql` manualmente.

Quando as duas variáveis estão definidas, a camada `src/lib/transactions.ts` usa o Supabase automaticamente. Chaves `SUPABASE_ANON_KEY` antigas continuam aceitas por compatibilidade.

## Fluxo de uma nova transação

1. O usuário preenche `TransactionForm`, um Client Component.
2. O formulário chama `createTransaction`, uma Server Action.
3. A action valida os dados e chama a camada de acesso ao banco.
4. O Supabase insere a linha em PostgreSQL.
5. `revalidatePath('/dashboard')` invalida o cache do dashboard.
6. `redirect('/dashboard')` devolve o usuário ao resumo já atualizado.

## Deploy na Vercel

Suba o repositório para o GitHub, importe o projeto na Vercel e configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` em **Environment Variables**. O arquivo `.env.local` nunca deve ser versionado.

> O fallback local existe apenas para facilitar demonstração e correção sem credenciais. No deploy, configure o Supabase.
