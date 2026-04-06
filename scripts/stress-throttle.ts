/**
 * Stress test para validar throttling por userId vs por IP.
 *
 * Pré-requisitos:
 *   - Servidor rodando em http://localhost:3000
 *   - Variável JWT_SECRET igual à do .env (passada via env ou hardcoded abaixo para testes locais)
 *
 * Uso:
 *   npx tsx scripts/stress-throttle.ts
 */

import { createHmac } from 'crypto'

const BASE_URL = process.env.SERVER_URL ?? 'http://localhost:3000'
const JWT_SECRET = process.env.JWT_SECRET ?? 'changeme'

// ─── helpers ────────────────────────────────────────────────────────────────

const base64url = (input: string | Buffer): string =>
  Buffer.from(input).toString('base64url')

const makeJwt = (userId: string): string => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({ sub: userId, role: 'student', iat: Math.floor(Date.now() / 1000) }),
  )
  const sig = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest()
  return `${header}.${payload}.${base64url(sig)}`
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface ReqResult {
  userId: string
  status: number
}

const sendRequest = async (userId: string, token: string): Promise<ReqResult> => {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  return { userId, status: res.status }
}

const printResults = (label: string, results: ReqResult[]) => {
  const total = results.length
  const ok = results.filter((r) => r.status !== 429).length
  const blocked = results.filter((r) => r.status === 429).length

  const byUser: Record<string, { ok: number; blocked: number }> = {}
  for (const r of results) {
    byUser[r.userId] ??= { ok: 0, blocked: 0 }
    if (r.status === 429) byUser[r.userId].blocked++
    else byUser[r.userId].ok++
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${label}`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`  Total de requisições : ${total}`)
  console.log(`  Respostas OK (2xx/4xx): ${ok}`)
  console.log(`  Bloqueadas (429)      : ${blocked}`)
  console.log(`\n  Por usuário:`)
  for (const [uid, counts] of Object.entries(byUser)) {
    const tag = counts.blocked > 0 ? '  BLOQUEADO' : '  ok'
    console.log(`    ${uid.padEnd(16)} → ok: ${counts.ok}  429: ${counts.blocked}${tag}`)
  }
}

// ─── Cenário A: mesmo IP, múltiplos usuários (comportamento ANTIGO) ──────────
// Simula N usuários fazendo muitas requests em sequência sem JWT
// (imita o que acontecia antes — bucket compartilhado por IP)
const runScenarioA = async () => {
  const REQUESTS_PER_USER = 50
  const USERS = ['userA', 'userB', 'userC']
  const results: ReqResult[] = []

  console.log(`\n[Cenário A] ${USERS.length} usuários × ${REQUESTS_PER_USER} req sem JWT (bucket por IP)`)
  console.log('  → requests sem Authorization header, todos compartilham o mesmo IP')

  for (const userId of USERS) {
    for (let i = 0; i < REQUESTS_PER_USER; i++) {
      const res = await fetch(`${BASE_URL}/users/me`)
      results.push({ userId, status: res.status })
    }
  }

  printResults('Cenário A — Sem JWT (por IP compartilhado)', results)
}

// ─── Cenário B: múltiplos usuários com JWT distintos (comportamento NOVO) ────
// Cada usuário tem seu próprio JWT → bucket isolado por userId
const runScenarioB = async () => {
  const REQUESTS_PER_USER = 50
  const users = ['user-uuid-001', 'user-uuid-002', 'user-uuid-003']
  const tokens = Object.fromEntries(users.map((u) => [u, makeJwt(u)]))
  const results: ReqResult[] = []

  console.log(`\n[Cenário B] ${users.length} usuários × ${REQUESTS_PER_USER} req com JWT (bucket por userId)`)
  console.log('  → cada usuário tem seu próprio bucket — não devem bloquear uns aos outros')

  // Dispara em paralelo para simular uso simultâneo real
  const allRequests = users.flatMap((userId) =>
    Array.from({ length: REQUESTS_PER_USER }, () => sendRequest(userId, tokens[userId])),
  )
  const resolved = await Promise.all(allRequests)
  results.push(...resolved)

  printResults('Cenário B — Com JWT (por userId isolado)', results)

  const blocked = results.filter((r) => r.status === 429).length
  if (blocked === 0) {
    console.log('\n  PASSOU: nenhum usuário foi bloqueado pelo bucket do outro.')
  } else {
    console.log(`\n  ATENÇÃO: ${blocked} req bloqueadas — verifique se o limite individual foi atingido.`)
  }
}

// ─── Cenário C: um único usuário esgota seu próprio bucket (paralelo) ────────
// Dispara todas as requisições de uma vez para garantir que caiam na mesma
// janela de 60s — evita que o TTL expire entre lotes sequenciais.
const runScenarioC = async () => {
  const userId = 'user-uuid-spammer'
  const token = makeJwt(userId)
  const REQUESTS = 350 // acima do limite default (300/min)

  console.log(`\n[Cenário C] 1 usuário × ${REQUESTS} req em paralelo (deve bloquear após 300)`)
  console.log('  → todas as requisições disparadas simultaneamente na mesma janela de 60s')

  const allRequests = Array.from({ length: REQUESTS }, () =>
    fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => ({ userId, status: res.status }) as ReqResult),
  )

  const results = await Promise.all(allRequests)

  printResults('Cenário C — Usuário único exaure o próprio bucket', results)

  const blocked = results.filter((r) => r.status === 429).length
  if (blocked > 0) {
    console.log(`\n  PASSOU: usuário foi corretamente bloqueado (${blocked} req com 429).`)
  } else {
    console.log('\n  ATENÇÃO: nenhum bloqueio — o servidor pode estar offline ou o limite não foi atingido.')
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
const main = async () => {
  console.log(`\nStress Test — Throttler por userId`)
  console.log(`Servidor: ${BASE_URL}`)

  // Verifica se servidor está no ar
  try {
    await fetch(`${BASE_URL}/health`).catch(() => fetch(`${BASE_URL}/`))
  } catch {
    console.error('\nERRO: Não foi possível conectar ao servidor. Inicie com `pnpm start:dev` primeiro.')
    process.exit(1)
  }

  await runScenarioA()
  await sleep(2000) // aguarda TTL parcial entre cenários
  await runScenarioB()
  await sleep(2000)
  await runScenarioC()

  console.log(`\n${'─'.repeat(60)}\n  Stress test finalizado.\n${'─'.repeat(60)}\n`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
