export default function FinanceLoading() {
  return (
    <main className="shell">
      <div className="page-loading">
        <div className="skeleton skeleton-title" />
        <div className="skeleton-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <div className="skeleton skeleton-card" key={index} />
          ))}
        </div>
        <div className="skeleton skeleton-table" />
      </div>
    </main>
  )
}
