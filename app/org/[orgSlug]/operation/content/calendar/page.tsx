import { contentClientName } from '@/components/content/content-card'
import { ContentFilters } from '@/components/content/content-filters'
import { getOrganizationBySlug, requireWorkspaceAccess } from '@/lib/services/permissions'
import { getContentFilterOptions, getContentItems, parseContentFilters, type ContentItemRow } from '@/lib/services/content-queries'

type ContentCalendarPageProps = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthKeyFromFilters(filters: ReturnType<typeof parseContentFilters>) {
  return (filters.publishFrom ?? new Date().toISOString().slice(0, 10)).slice(0, 7)
}

function getMonthCells(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const start = new Date(firstDay)
  start.setUTCDate(firstDay.getUTCDate() - firstDay.getUTCDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    const iso = date.toISOString().slice(0, 10)

    return {
      iso,
      day: date.getUTCDate(),
      isCurrentMonth: iso.startsWith(monthKey),
      isToday: iso === new Date().toISOString().slice(0, 10)
    }
  })
}

function getItemsByDate(items: ContentItemRow[]) {
  return items.reduce<Record<string, ContentItemRow[]>>((groups, item) => {
    if (!item.publish_date) return groups
    groups[item.publish_date] = [...(groups[item.publish_date] ?? []), item]
    return groups
  }, {})
}

function calendarNavHref(orgSlug: string, monthKey: string, direction: -1 | 1, searchParams: Record<string, string | string[] | undefined>) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + direction, 1))
  const nextMonth = date.toISOString().slice(0, 7)
  const params = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value[0]) params.set(key, value[0])
    } else if (value) {
      params.set(key, value)
    }
  })

  params.set('publishFrom', `${nextMonth}-01`)
  params.set('publishTo', new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).toISOString().slice(0, 10))

  return `/org/${orgSlug}/operation/content/calendar?${params.toString()}`
}

export default async function ContentCalendarPage({ params, searchParams }: ContentCalendarPageProps) {
  const { orgSlug } = await params
  const rawSearchParams = await searchParams
  const filters = parseContentFilters(rawSearchParams)
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    return null
  }

  await requireWorkspaceAccess(organization.id, 'operation')
  const [{ clients, members }, contentItems] = await Promise.all([
    getContentFilterOptions(organization.id),
    getContentItems(organization.id, filters)
  ])
  const monthKey = monthKeyFromFilters(filters)
  const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${monthKey}-01T00:00:00.000Z`))
  const monthCells = getMonthCells(monthKey)
  const itemsByDate = getItemsByDate(contentItems)
  const noDateItems = contentItems.filter((item) => !item.publish_date)

  return (
    <main className="shell">
      <h1>Content Calendar</h1>
      <ContentFilters clients={clients} members={members} filters={filters} />
      <section className="content-calendar-shell">
        <div className="content-calendar-toolbar">
          <div>
            <p className="muted">Calendar view</p>
            <h2>{monthLabel}</h2>
          </div>
          <div className="actions">
            <a href={`/org/${orgSlug}/operation/content/schedule`}>Schedule content</a>
            <a href={calendarNavHref(orgSlug, monthKey, -1, rawSearchParams)}>Previous</a>
            <a href={`/org/${orgSlug}/operation/content/calendar`}>Today</a>
            <a href={calendarNavHref(orgSlug, monthKey, 1, rawSearchParams)}>Next</a>
          </div>
        </div>
        <div className="content-calendar-grid" role="grid" aria-label={`${monthLabel} content calendar`}>
          {weekdayLabels.map((day) => (
            <div className="content-calendar-weekday" key={day}>{day}</div>
          ))}
          {monthCells.map((cell) => {
            const dayItems = itemsByDate[cell.iso] ?? []

            return (
              <div
                className={[
                  'content-calendar-day',
                  cell.isCurrentMonth ? '' : 'content-calendar-day-muted',
                  cell.isToday ? 'content-calendar-day-today' : ''
                ].filter(Boolean).join(' ')}
                key={cell.iso}
                role="gridcell"
              >
                <div className="content-calendar-date">
                  <span>{cell.day}</span>
                  {dayItems.length > 0 ? <strong>{dayItems.length}</strong> : null}
                </div>
                <div className="content-calendar-items">
                  {dayItems.slice(0, 4).map((item) => (
                    <a className={`content-calendar-item risk-${item.production_risk}`} href={`/org/${orgSlug}/operation/content/${item.id}`} key={item.id}>
                      <span>{item.title}</span>
                      <small>{contentClientName(item)} · {item.platform}</small>
                    </a>
                  ))}
                  {dayItems.length > 4 ? <p className="content-calendar-more">+{dayItems.length - 4} more</p> : null}
                </div>
              </div>
            )
          })}
        </div>
        {noDateItems.length > 0 ? (
          <div className="content-no-date">
            <h3>No publish date</h3>
            <div className="content-no-date-list">
              {noDateItems.map((item) => (
                <a href={`/org/${orgSlug}/operation/content/${item.id}`} key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{contentClientName(item)} · {item.status.replaceAll('_', ' ')}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>
      <section>
        <h2>Calendar summary</h2>
        <div className="grid">
          <div className="card"><strong>Total items</strong><p>{contentItems.length}</p></div>
          <div className="card"><strong>Scheduled dates</strong><p>{Object.keys(itemsByDate).length}</p></div>
          <div className="card"><strong>No publish date</strong><p>{noDateItems.length}</p></div>
        </div>
      </section>
    </main>
  )
}
