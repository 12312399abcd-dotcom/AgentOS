type ContentDetailPageProps = {
  params: Promise<{ contentId: string }>
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  const { contentId } = await params

  return (
    <main className="shell">
      <h1>Content Detail</h1>
      <p className="muted">Content item: {contentId}</p>
    </main>
  )
}
