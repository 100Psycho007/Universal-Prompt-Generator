export function IDECardSkeleton() {
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
      <div className="h-4 bg-gray-700 rounded w-1/4"></div>
    </div>
  )
}

export function IDEGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 15 }).map((_, i) => (
        <IDECardSkeleton key={i} />
      ))}
    </div>
  )
}
