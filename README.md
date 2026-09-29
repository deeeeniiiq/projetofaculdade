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


npm install
npm run dev
