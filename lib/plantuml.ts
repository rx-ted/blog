import { deflateSync } from 'fflate'

const PLANTUML_SERVER_URL = 'https://www.plantuml.com/plantuml'

function encode6Bit(value: number) {
  if (value < 10) return String.fromCharCode(48 + value)
  const alphaUpper = value - 10
  if (alphaUpper < 26) return String.fromCharCode(65 + alphaUpper)
  const alphaLower = alphaUpper - 26
  if (alphaLower < 26) return String.fromCharCode(97 + alphaLower)
  return alphaLower === 26 ? '-' : '_'
}

function appendEncodedBytes(b1: number, b2: number, b3: number) {
  return [
    b1 >> 2,
    ((b1 & 0x3) << 4) | (b2 >> 4),
    ((b2 & 0xf) << 2) | (b3 >> 6),
    b3 & 0x3f,
  ]
    .map((value) => encode6Bit(value & 0x3f))
    .join('')
}

function encodePlantUmlBytes(bytes: Uint8Array) {
  let encoded = ''

  for (let index = 0; index < bytes.length; index += 3) {
    encoded += appendEncodedBytes(
      bytes[index] ?? 0,
      bytes[index + 1] ?? 0,
      bytes[index + 2] ?? 0,
    )
  }

  return encoded
}

export function normalizePlantUmlCode(code: string) {
  const trimmed = code.trim()
  if (!trimmed) return ''
  if (/@start\w*/i.test(trimmed) && /@end\w*/i.test(trimmed)) return trimmed
  return `@startuml\n${trimmed}\n@enduml`
}

export function encodePlantUml(code: string) {
  const input = new TextEncoder().encode(normalizePlantUmlCode(code))
  return encodePlantUmlBytes(deflateSync(input, { level: 9 }))
}

export function buildPlantUmlSvgUrl(
  code: string,
  serverUrl = PLANTUML_SERVER_URL,
) {
  return `${serverUrl.replace(/\/+$/, '')}/svg/${encodePlantUml(code)}`
}
