import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase-server'

// ============================================================================
// PAGE: /marketplace
// Liste des projets publiés
// ============================================================================

export const revalidate = 60

interface MarketplaceProps {
  searchParams?: { page?: string }
}

export default async function MarketplacePage({ searchParams }: MarketplaceProps) {
  const pageSize = 20
  const page = Math.max(parseInt(searchParams?.page || '1', 10) || 1, 1)
  const offset = (page - 1) * pageSize

  // Récupérer les projets publiés (RLS applique automatiquement)
  const supabase = await createSupabaseServerClient()
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      slug,
      description,
      price,
      currency,
      thumbnail_url,
      category,
      tech_stack,
      maturity_level,
      avg_rating,
      review_count,
      purchase_count
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const hasNextPage = (projects?.length || 0) === pageSize
  const prevPage = page > 1 ? page - 1 : null
  const nextPage = hasNextPage ? page + 1 : null

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-white">
              🚀 SeedBay
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login" className="text-gray-300 hover:text-white">
                Connexion
              </Link>
              <Link 
                href="/auth/signup" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-blue-900/50 to-transparent py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white mb-4">Marketplace</h1>
          <p className="text-gray-400">Découvrez des projets SaaS prêts à lancer</p>
        </div>
      </div>

      {/* Projects Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="text-center py-20">
            <p className="text-red-400">Erreur lors du chargement des projets</p>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Aucun projet disponible pour le moment</p>
            <p className="text-gray-500 mt-2">Revenez bientôt !</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link 
                key={project.id} 
                href={`/projects/${project.slug}`}
                className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-blue-500/50 transition group"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 relative">
                  {project.thumbnail_url ? (
                    <Image
                      src={project.thumbnail_url}
                      alt={project.title}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl">💻</span>
                    </div>
                  )}
                  {/* Badge maturité */}
                  <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {project.maturity_level}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition">
                    {project.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Tech Stack */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {project.tech_stack?.slice(0, 3).map((tech: string) => (
                      <span 
                        key={tech} 
                        className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.tech_stack && project.tech_stack.length > 3 && (
                      <span className="text-gray-500 text-xs">+{project.tech_stack.length - 3}</span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      {project.avg_rating > 0 && (
                        <span className="text-yellow-400 text-sm">
                          ★ {project.avg_rating.toFixed(1)}
                        </span>
                      )}
                      {project.purchase_count > 0 && (
                        <span className="text-gray-500 text-sm">
                          {project.purchase_count} ventes
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-bold text-white">
                      ${project.price}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!error && projects && projects.length > 0 && (
          <div className="flex justify-center gap-4 mt-10">
            {prevPage ? (
              <Link
                href={`/marketplace?page=${prevPage}`}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-blue-500/50 transition"
              >
                Page précédente
              </Link>
            ) : (
              <span className="px-4 py-2 rounded-lg border border-white/5 text-gray-600">
                Page précédente
              </span>
            )}
            {nextPage ? (
              <Link
                href={`/marketplace?page=${nextPage}`}
                className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:border-blue-500/50 transition"
              >
                Page suivante
              </Link>
            ) : (
              <span className="px-4 py-2 rounded-lg border border-white/5 text-gray-600">
                Page suivante
              </span>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
