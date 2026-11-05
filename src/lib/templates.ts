import type { TemplatePreset } from './types'

/** Default showcase / new-draft template (洗衣房舞蹈). */
export const DEFAULT_TEMPLATE_ID = 'laundromat-dance'

interface TemplateTranslation {
  label: string
  prompt: string
}

export function getDefaultTemplate(templates: readonly TemplatePreset[]): TemplatePreset | undefined {
  return templates.find((preset) => preset.id === DEFAULT_TEMPLATE_ID) ?? templates[0]
}

export async function loadTemplates(): Promise<TemplatePreset[]> {
  const [catalogRes, localeRes] = await Promise.all([
    fetch('/templates/catalog.json'),
    fetch('/templates/locales/zh-cn.json')
  ])
  if (!catalogRes.ok || !localeRes.ok) {
    throw new Error('模板资源加载失败')
  }

  const catalog = (await catalogRes.json()) as string[]
  const locales = (await localeRes.json()) as Record<string, TemplateTranslation>

  return catalog.flatMap((id) => {
    const translation = locales[id]
    if (!translation) return []
    return [
      {
        id,
        label: translation.label,
        prompt: translation.prompt,
        imageUrl: `/templates/images/${id}.webp`
      }
    ]
  })
}
