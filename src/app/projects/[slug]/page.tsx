import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

interface ProjectPageProps {
  params: {
    slug: string
  }
}

export const revalidate = 60

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = await createSupabaseServerClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      slug,
      description,
      problem,
      solution,
      price,
      currency,
      category,
      tech_stack,
      maturity_level,
      license_type,
      tags,
      avg_rating,
      review_count,
      purchase_count,
      thumbnail_url,
      seller:users!seller_id (
        username,
        avatar_url,
        seller_verified
      )
    `)
    .eq('slug', params.slug)
    .eq('status', 'published')
    .single()

  if (error || !project) {
    notFound()
  }

  const techStack = Array.isArray(project.tech_stack) ? project.tech_stack : []
  const tags = Array.isArray(project.tags) ? project.tags : []
  const sellerName = project.seller?.username || 'Vendeur'
  const sellerAvatar = sellerName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-white">SeedBay</Link>
            <div className="flex items-center space-x-4">
              <Link href="/marketplace" className="text-gray-300 hover:text-white">Marketplace</Link>
              <Link href="/auth/login" className="text-gray-300 hover:text-white">Connexion</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-8">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <span>/</span>
          <span className="text-white">{project.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="w-full h-64 bg-gray-700 rounded-lg mb-6 relative overflow-hidden">
                {project.thumbnail_url ? (
                  <Image
                    src={project.thumbnail_url}
                    alt={project.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 66vw, 100vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-5xl">💻</div>
                )}
              </div>

              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{project.title}</h1>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-medium px-2 py-1 rounded-full">
                  {project.maturity_level}
                </span>
              </div>

              <p className="text-gray-400 text-lg mb-4">{project.description}</p>

              <div className="flex items-center gap-4">
                <div className="flex items-center text-yellow-400">
                  <span>★</span>
                  <span className="ml-1 text-white font-medium">{Number(project.avg_rating || 0).toFixed(1)}</span>
                  <span className="ml-1 text-gray-400">({project.review_count || 0} avis)</span>
                </div>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400">{project.purchase_count || 0} ventes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Problème</h3>
                <p className="text-gray-400">{project.problem}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Solution</h3>
                <p className="text-gray-400">{project.solution}</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Stack technique</h3>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech: string) => (
                  <span key={tech} className="bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-white mb-1">{project.price} {project.currency}</p>
                <p className="text-gray-400 text-sm">Licence {project.license_type}</p>
              </div>

              <Link
                href={`/checkout/${project.id}`}
                className="w-full inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold mb-3 transition-colors"
              >
                Acheter maintenant
              </Link>

              <Link
                href={`/checkout/${project.id}?source=cart`}
                className="w-full inline-flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Ajouter au panier
              </Link>
            </div>

            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vendeur</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {sellerAvatar}
                </div>
                <div>
                  <p className="text-white font-medium">{sellerName}</p>
                  <p className="text-gray-400 text-sm">
                    {project.seller?.seller_verified ? 'Vendeur vérifié' : 'Vendeur'}
                  </p>
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <span key={tag} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
