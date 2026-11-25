import { describe, expect, it } from 'vitest'
import { build } from 'esbuild'

// Inspect the real bundler graph: dynamic feature imports are deliberately excluded.
// This catches transitive imports through shared controls, not just the editor source.
describe('editor startup bundle', () => {
  it.each(['components/NovelEditor.tsx', 'components/InlineArticleEditor.tsx'])(
    '%s keeps optional dependencies off the writing path',
    async (entryPoint) => {
      const { metafile } = await build({
        entryPoints: [entryPoint],
        bundle: true,
        splitting: true,
        format: 'esm',
        platform: 'browser',
        write: false,
        outdir: '.bundle-test',
        metafile: true,
        alias: { '@': process.cwd() },
        loader: { '.css': 'empty' },
        external: ['next/*', 'react', 'react-dom', 'react/jsx-runtime'],
      })
      const outputs = metafile!.outputs
      const entry = Object.keys(outputs).find(
        (path) => outputs[path].entryPoint === entryPoint,
      )!
      const visited = new Set<string>()
      const walk = (path: string) => {
        if (visited.has(path)) return
        visited.add(path)
        for (const dependency of outputs[path].imports) {
          if (!dependency.external && dependency.kind === 'import-statement')
            walk(dependency.path)
        }
      }
      walk(entry)
      const inputs = [...visited].flatMap((path) =>
        Object.keys(outputs[path].inputs),
      )
      expect(inputs).toContain(entryPoint)
      expect(inputs.some((path) => path.includes('prosemirror-view'))).toBe(
        true,
      )
      for (const dependency of [
        'html2pdf.js',
        'html2canvas',
        'jspdf',
        '/juice/',
        '/konva/',
        'react-konva',
        'CollageModal.tsx',
        'EditorAiChatPanel.tsx',
        'WeChatPublishModal.tsx',
      ]) {
        expect(
          inputs.filter((path) => path.includes(dependency)),
          `${dependency} should load on demand`,
        ).toEqual([])
      }
      // Features are split, not removed from the product.
      const allInputs = Object.keys(metafile!.inputs)
      for (const dependency of ['html2pdf.js', '/juice/', '/konva/']) {
        expect(allInputs.some((path) => path.includes(dependency))).toBe(true)
      }
    },
  )
})
