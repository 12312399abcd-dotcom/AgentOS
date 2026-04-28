import type { ContentItemRow } from '@/lib/services/content-queries'

export function contentClientName(item: ContentItemRow) {
  const client = Array.isArray(item.clients) ? item.clients[0] : item.clients
  return client?.name ?? 'No client'
}

export function ContentCard({ item }: { item: ContentItemRow }) {
  return (
    <article className="card">
      <strong>{item.title}</strong>
      <p className="muted">{contentClientName(item)} · {item.platform}</p>
      <p>{item.publish_date ?? 'No publish date'} · {item.status.replaceAll('_', ' ')}</p>
      <p>Risk: {item.production_risk}</p>
    </article>
  )
}
