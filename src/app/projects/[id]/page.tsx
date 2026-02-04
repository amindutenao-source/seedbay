import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase'

// ============================================================================
// PAGE: /projects/[id]
// Détail d'un projet
// ============================================================================

interface Props {
  params: { id: string }
}

export default async function ProjectPage({ params }: Props) {
  const supabase = await createSupabaseServerClient()
  const user = await getCurrentUser()

  // Récupérer le projet (RLS applique automatiquement)
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
      thumbnail_url,
      category,
      tech_stack,
      maturity_level,
      license_type,
      tags,
      avg_rating,
      review_count,
      purchase_count,
      seller_id,
      created_at
    `)
    .eq('id', params.id)
    .eq('status', 'published')
    .single()

  if (error || !project) {
    notFound()
  }

  // Récupérer les infos du vendeur
  const { data: seller } = await supabase
    .from('users')
    .select('username, avatar_url, avg_rating, seller_verified')
    .eq('id', project.seller_id)
    .single()

  // Vérifier si l'utilisateur a déjà acheté ce projet
  let hasPurchased = false
  if (user) {
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('project_id', project.id)
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .single()
    hasPurchased = !!order
  }

  // Vérifier si c'est le propre projet du vendeur
  const isOwner = user?.id === project.seller_id

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
              <Link href="/marketplace" className="text-gray-300 hover:text-white">
                Marketplace
              </Link>
              {user ? (
                <Link href="/dashboard" className="text-gray-300 hover:text-white">
                  Dashboard
                </Link>
              ) : (
                <Link 
                  href="/auth/login" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl overflow-hidden relative">
              {project.thumbnail_url ? (
                <Image
                  src={project.thumbnail_url}
                  alt={project.title}
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 66vw, 100vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl">💻</span>
                </div>
              )}
            </div>

            {/* Title & Meta */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-blue-500/20 text-blue-300 text-sm px-3 py-1 rounded-full">
                  {project.category}
                </span>
                <span className="bg-purple-500/20 text-purple-300 text-sm px-3 py-1 rounded-full">
                  {project.maturity_level}
                </span>
                <span className="bg-gray-500/20 text-gray-300 text-sm px-3 py-1 rounded-full">
                  {project.license_type}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white">{project.title}</h1>
            </div>

            {/* Description */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Description</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{project.description}</p>
            </div>

            {/* Problem & Solution */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-red-500/10 rounded-xl p-6 border border-red-500/20">
                <h3 className="text-lg font-semibold text-red-400 mb-3">🚨 Problème</h3>
                <p className="text-gray-300">{project.problem}</p>
              </div>
              <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/20">
                <h3 className="text-lg font-semibold text-green-400 mb-3">✅ Solution</h3>
                <p className="text-gray-300">{project.solution}</p>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Technologies</h2>
              <div className="flex flex-wrap gap-2">
                {project.tech_stack?.map((tech) => (
                  <span 
                    key={tech} 
                    className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-lg"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Purchase Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-white/5 rounded-xl p-6 border border-white/10">
              {/* Price */}
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-white">
                  ${project.price}
                </span>
                <span className="text-gray-400 ml-2">{project.currency}</span>
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-6 mb-6 text-sm">
                {project.avg_rating > 0 && (
                  <div className="text-center">
                    <span className="text-yellow-400">★ {project.avg_rating.toFixed(1)}</span>
                    <p className="text-gray-500">{project.review_count} avis</p>
                  </div>
                )}
                <div className="text-center">
                  <span className="text-white">{project.purchase_count}</span>
                  <p className="text-gray-500">ventes</p>
                </div>
              </div>

              {/* Action Button */}
              {isOwner ? (
                <div className="text-center text-gray-400">
                  C&apos;est votre projet
                </div>
              ) : hasPurchased ? (
                <Link
                  href={`/orders`}
                  className="block w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-center font-semibold transition"
                >
                  ✅ Déjà acheté - Télécharger
                </Link>
              ) : (
                <Link
                  href={user ? `/checkout/${project.id}` : `/auth/login?redirect=/projects/${project.id}`}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-center font-semibold transition"
                >
                  Acheter maintenant
                </Link>
              )}

              {/* Seller Info */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-gray-400 text-sm mb-2">Vendu par</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {seller?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {seller?.username}
                      {seller?.seller_verified && (
                        <span className="ml-1 text-blue-400">✓</span>
                      )}
                    </p>
                    {seller?.avg_rating && seller.avg_rating > 0 && (
                      <p className="text-gray-500 text-sm">
                        ★ {seller.avg_rating.toFixed(1)} vendeur
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Guarantee */}
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <p className="text-gray-500 text-sm">
                  🔒 Paiement sécurisé via Stripe
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
