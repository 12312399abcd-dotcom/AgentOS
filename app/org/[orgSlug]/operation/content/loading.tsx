export default function ContentLoading() {
  return (
    <main className="shell">
      <div className="page-loading">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-filter" />
        <div className="skeleton-grid">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="skeleton skeleton-card" key={index} />
          ))}
        </div>
      </div>
    </main>
  )
}
