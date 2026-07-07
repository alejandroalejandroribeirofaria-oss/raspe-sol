# Raspe SOL

Raspe SOL é uma raspadinha digital baseada em Solana, organizada exclusivamente por lotes de 5.000 bilhetes. O backend gera os bilhetes, distribui os prêmios com aleatoriedade criptograficamente segura, protege cada registro com HMAC SHA-256 e nunca confia em resultados vindos do frontend.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- ORM: Prisma
- Dev DB: SQLite
- Produção: PostgreSQL
- Wallet: Phantom Wallet
- Blockchain: Solana Devnet ou Mainnet

## Regras implementadas

- Cada lote possui exatamente 5.000 bilhetes.
- Cada bilhete usa UUID v4 como chave primária global.
- Prêmios por lote:
  - 1 × 5 SOL
  - 1 × 2 SOL
  - 1 × 1 SOL
  - 10 × 0.02 SOL
- Os demais bilhetes recebem mensagens perdedoras aleatórias.
- Todo bilhete possui HMAC SHA-256 sobre campos críticos.
- Compra, raspagem, pagamento de prêmio e criação de lote usam transações de banco.
- O usuário não escolhe bilhete; o servidor reserva um bilhete disponível.
- Ao vender o último bilhete do lote, o lote é fechado e outro lote é criado automaticamente.
- Painel admin inclui métricas, histórico, criação de lote, busca e relatório CSV.
- Interface em português, inglês e chinês.

## Configuração local

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run backend:dev
npm run frontend:dev
```

Para desenvolvimento sem validação on-chain, mantenha:

```env
REQUIRE_CHAIN_CONFIRMATION=false
SOLANA_CLUSTER=devnet
```

Em produção, use:

```env
REQUIRE_CHAIN_CONFIRMATION=true
SOLANA_CLUSTER=mainnet-beta
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
```

Depois rode:

```bash
npm run prisma:generate:postgres -w backend
npm run prisma:deploy:postgres -w backend
npm run build
npm run start
```

## Variáveis essenciais

| Nome | Descrição |
|---|---|
| `DATABASE_URL` | SQLite local ou PostgreSQL em produção |
| `HMAC_SECRET` | Segredo forte, somente no servidor |
| `ADMIN_TOKEN` | Token enviado no header `x-admin-token` |
| `TREASURY_WALLET` | Wallet que recebe os pagamentos |
| `SOLANA_CLUSTER` | `devnet` ou `mainnet-beta` |
| `SOLANA_COMMITMENT` | `confirmed` em dev, `finalized` em produção |
| `REQUIRE_CHAIN_CONFIRMATION` | Valida assinatura e transferência na Solana |
| `MAX_TRANSACTION_AGE_SECONDS` | Idade máxima aceita para assinatura de pagamento |
| `ALLOW_OVERPAYMENT` | Permite calcular mais bilhetes quando o valor pago excede o solicitado |
| `IGNORE_REMAINDER` | Ignora sobra menor que um bilhete |
| `MAX_TICKETS_PER_PURCHASE` | Limite máximo por compra |

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/config` | Configuração pública |
| `GET` | `/api/stats` | Métricas do lote aberto |
| `GET` | `/api/leaderboard` | Maiores prêmios revelados |
| `GET` | `/api/tickets?wallet=` | Bilhetes de uma wallet |
| `POST` | `/api/tickets/purchase` | Reserva bilhete após assinatura |
| `POST` | `/api/purchase` | Alias para compra multi-bilhete |
| `POST` | `/api/tickets/:id/scratch` | Raspa bilhete comprado |
| `GET` | `/api/admin/stats` | Métricas admin |
| `POST` | `/api/admin/batches/manual` | Fecha lote atual e cria novo |
| `POST` | `/api/admin/batches/auto` | Garante lote aberto |
| `GET` | `/api/admin/tickets/search` | Busca por UUID, wallet ou lote |
| `POST` | `/api/admin/tickets/:uuid/pay` | Marca prêmio como pago |
| `GET` | `/api/admin/report.csv` | Exporta relatório |

## Segurança

- Não há geração de prêmio no frontend.
- HMAC invalida alteração manual em campos críticos.
- `helmet`, CORS configurável e rate limit reduzem abuso.
- Assinaturas de transação são únicas.
- O backend valida signer, payer e source da transação Solana contra a wallet informada.
- O commitment é configurável por `SOLANA_COMMITMENT`; use `finalized` para dinheiro real.
- Transações antigas são rejeitadas por `MAX_TRANSACTION_AGE_SECONDS`.
- Compras multi-bilhete são calculadas exclusivamente pelo valor recebido on-chain.
- `TransactionRecord.purchaseSignature` é único e bloqueia race conditions/replay.
- Cada compra registra slot, blockTime, cluster, valor recebido, valor esperado, quantidade, IP, User-Agent e hash anti-replay.
- Auditoria registra ação, IP, wallet, assinatura e metadados.
- Produção deve usar HTTPS, segredo HMAC forte, token admin forte e PostgreSQL gerenciado.

## Compra multi-bilhete

Rota compatível:

```http
POST /api/tickets/purchase
POST /api/purchase
```

Payload:

```json
{
  "wallet": "buyer-public-key",
  "signature": "solana-transaction-signature",
  "quantity": 100,
  "cluster": "mainnet-beta"
}
```

O servidor calcula a quantidade real a partir de `amountLamports / ticketPriceLamports`.
Se `ALLOW_OVERPAYMENT=true`, um pagamento maior gera o máximo de bilhetes inteiros possível.
Se `IGNORE_REMAINDER=true`, sobras menores que o preço de um bilhete são ignoradas e nunca geram bilhete parcial.
