# Carteira e serviços demonstrativos

Esta aplicação é um projeto acadêmico. Não possui emissão de cartão, liquidação PIX, custódia de cripto nem conexão com uma instituição financeira. Os preços do mercado continuam vindo dos provedores externos já integrados.

## Roteiro para apresentação

1. Abra **Banco → Cobrar com PIX**. Digite R$ 150,50 e uma mensagem. O QR muda com o valor; copie o código e abra **PIX copia e cola** para ler os dados e revisar uma operação demonstrativa.
2. Abra **Pagar boleto → Usar boleto fictício para testar**. A linha tem banco fictício 999 e valor codificado. Altere um dígito para demonstrar a validação. O nome do beneficiário é informado pelo usuário, sem consulta bancária.
3. Crie um **Cofre** com meta. Faça um aporte e observe o saldo disponível diminuir. Resgate parte do valor; consulte o comprovante. Aporte e resgate não são classificados como renda ou despesa reconhecida.
4. Crie um **agendamento** ou **PIX recorrente**. A agenda mostra previsão de saldo, pausa e cancelamento. Quando a data chegar, o usuário revisa e confirma a operação. A recorrência avança um mês após o registro bem-sucedido, preservando o dia escolhido mesmo em meses curtos. Não há execução automática quando o navegador está fechado.
5. Em **Dividir uma cobrança**, informe valor e nomes separados por vírgula. O total é distribuído em centavos, com QR por pessoa e marcação manual de recebimento. Essa marcação não gera entrada fictícia de saldo.
6. Abra **Extrato mensal** para baixar um PDF com saldo inicial/final, saldo após cada movimento e paginação. **Visão do mês** reconhece compras no crédito e exclui o pagamento da fatura, evitando contá-las duas vezes.
7. Abra **Assinaturas**. As sugestões derivam de lançamentos com categoria Assinaturas ou mesmo estabelecimento em meses diferentes. A projeção anual supõe 12 cobranças iguais; não confirma a existência de um contrato. É possível preparar uma instrução recorrente.
8. Abra **Cartão → Controles de uso** e altere limite por compra, compras online ou aproximação. Essas regras são locais e interferem no formulário demonstrativo; os limites financeiros máximos são verificados nas Server Actions.
9. Crie um **cartão temporário**. O número começa com 0000, não é uma credencial bancária. Expira em dez minutos e é consumido por uma única compra demonstrativa. O servidor verifica expiração e uso anterior. Uma repetição do mesmo identificador de requisição retorna a operação existente.
10. Simule uma compra. Ela usa o limite do cartão e entra no histórico/fatura sem reduzir o saldo disponível. O pagamento da fatura reduz esse saldo e libera o limite. Abra os PDFs dos registros.

## Arquitetura e persistência

- `app/dashboard/banco/page.tsx`: Server Component que lê o histórico.
- `components/bank-hub.tsx`: formulários, QR, agenda e animações no cliente.
- `app/actions/bank.ts`: validação de entrada, saldo e idempotência antes da persistência.
- `lib/bank.ts`: BR Code estático com CRC16, leitura de PIX, boleto bancário de 47 dígitos, divisão exata e cálculos.
- `lib/statement-pdf.ts`: geração de PDF no servidor, sem escrita no sistema de arquivos da Vercel.
- Aportes, resgates, pagamentos e compras usam a tabela `transacoes` existente no Supabase. Nenhuma migração nova é necessária.
- Nome/meta dos cofres, agenda, cobranças divididas e controles de cartão usam localStorage neste navegador. O saldo dos cofres é reconstituído a partir do histórico mesmo se a meta local for perdida. O bloqueio visual existente é local e não equivale a autenticação bancária.
- Os testes das Server Actions usam um banco isolado em memória; não movimentam os dados de produção.

Para evoluir para múltiplos usuários reais: Supabase Auth, isolamento por usuário com RLS e funções PostgreSQL atômicas para saldo/idempotência são os próximos passos. Integração com bancos ou assinaturas on-chain exige um fluxo separado com credenciais e autorização apropriadas.

## Referências

- [Phantom Cash](https://phantom.com/cash): composição mobile e referência visual de cartão.
- [Banco Central — Manual de padrões para iniciação do Pix](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf): BR Code estático e CRC16.
- [CAIXA — Especificações técnicas de código de barras e linha digitável](https://www.caixa.gov.br/Downloads/cobranca-caixa/ESP_COD_BARRAS_SIGCB_COBRANCA_CAIXA.pdf): validação dos dígitos do boleto bancário.
