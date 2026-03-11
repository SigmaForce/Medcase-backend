import { Injectable } from '@nestjs/common'

export interface AntiCheatResult {
  isSuspect: boolean
  reason?: string
}

const CATEGORY_1_PATTERNS = [
  'qual é o diagnóstico',
  'qual e o diagnostico',
  'me diz a doença',
  'me diz a doenca',
  'o que eu tenho',
  'qual a resposta',
  'qual o diagnostico',
  'qual o diagnóstico',
]

const CATEGORY_2_PATTERNS = [
  'ignore as instruções anteriores',
  'ignore as instrucoes anteriores',
  'esqueça tudo que foi dito',
  'esqueca tudo que foi dito',
  'você agora é',
  'voce agora e',
  'act as',
  '[system]',
  '[inst]',
]

const CATEGORY_3_PATTERNS = [
  'confirme se é',
  'confirme se e',
  'você concorda que é',
  'voce concorda que e',
]

const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

@Injectable()
export class AntiCheatGuard {
  check(content: string): AntiCheatResult {
    const normalized = normalizeText(content)

    for (const pattern of CATEGORY_1_PATTERNS) {
      const normalizedPattern = normalizeText(pattern)
      if (normalized.includes(normalizedPattern)) {
        return { isSuspect: true, reason: 'ANTI_CHEAT_TRIGGERED' }
      }
    }

    for (const pattern of CATEGORY_2_PATTERNS) {
      const normalizedPattern = normalizeText(pattern)
      if (normalized.includes(normalizedPattern)) {
        return { isSuspect: true, reason: 'ANTI_CHEAT_TRIGGERED' }
      }
    }

    for (const pattern of CATEGORY_3_PATTERNS) {
      const normalizedPattern = normalizeText(pattern)
      if (normalized.includes(normalizedPattern)) {
        return { isSuspect: true, reason: 'ANTI_CHEAT_TRIGGERED' }
      }
    }

    return { isSuspect: false }
  }
}
