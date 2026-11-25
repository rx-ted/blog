import { describe, expect, it } from 'vitest'
import {
  buildPlantUmlSvgUrl,
  encodePlantUml,
  normalizePlantUmlCode,
} from '@/lib/plantuml'

describe('plantuml helpers', () => {
  it('wraps snippets without start and end markers', () => {
    expect(normalizePlantUmlCode('Bob -> Alice : hello')).toBe(
      '@startuml\nBob -> Alice : hello\n@enduml',
    )
    expect(normalizePlantUmlCode('@startuml\nA -> B\n@enduml')).toBe(
      '@startuml\nA -> B\n@enduml',
    )
  })

  it('encodes PlantUML source into a server URL', () => {
    const encoded = encodePlantUml('Bob -> Alice : hello')

    expect(encoded).toBeTruthy()
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(buildPlantUmlSvgUrl('Bob -> Alice : hello')).toBe(
      `https://www.plantuml.com/plantuml/svg/${encoded}`,
    )
  })
})
