import { unzip } from 'fflate'

export async function extractTxtFromZip(file: File): Promise<{ name: string; content: string }[]> {
  const buf = await file.arrayBuffer()
  const bytes = new Uint8Array(buf)

  return new Promise((resolve, reject) => {
    unzip(bytes, (err, files) => {
      if (err) { reject(err); return }
      const results: { name: string; content: string }[] = []
      for (const [name, data] of Object.entries(files)) {
        /* Ignore les métadonnées macOS (__MACOSX/, fichiers AppleDouble « ._x.txt »)
           et accepte l'extension quelle que soit la casse (.TXT). */
        const base = name.split('/').pop() ?? name
        if (name.startsWith('__MACOSX/') || base.startsWith('._')) continue
        if (name.toLowerCase().endsWith('.txt') && data.length > 0) {
          results.push({ name, content: new TextDecoder('utf-8').decode(data) })
        }
      }
      resolve(results)
    })
  })
}
