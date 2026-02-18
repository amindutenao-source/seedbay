import Link from 'next/link'

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Blog</h1>
        <p className="text-gray-300">
          Le blog éditorial de SeedBay sera publié prochainement. En attendant, consultez le marketplace
          et les ressources légales.
        </p>
        <div className="flex gap-4">
          <Link href="/marketplace" className="text-blue-400 hover:text-blue-300">Explorer les projets</Link>
          <Link href="/legal" className="text-blue-400 hover:text-blue-300">Documents légaux</Link>
        </div>
      </div>
    </main>
  )
}
