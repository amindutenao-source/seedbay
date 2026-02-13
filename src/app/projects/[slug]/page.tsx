"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const mockProjects: Record<string, any> = {
  "saas-starter-kit": {
    id: "1",
    title: "SaaS Starter Kit",
    slug: "saas-starter-kit",
    description: "Template complet pour lancer votre SaaS avec authentification et paiements Stripe integres.",
    problem: "Creer un SaaS from scratch prend des mois de developpement pour les fonctionnalites de base.",
    solution: "Ce kit vous donne une base solide avec auth, paiements, dashboard admin, et plus encore.",
    price: 299,
    currency: "EUR",
    category: "template",
    tech_stack: ["Next.js", "TypeScript", "Tailwind", "Stripe", "Prisma"],
    maturity_level: "Production",
    license_type: "MIT",
    tags: ["SaaS", "Starter", "Auth", "Payments"],
    avg_rating: 4.8,
    review_count: 124,
    purchase_count: 847,
    emoji: "🚀",
    seller: { name: "Jean Dupont", avatar: "JD" },
    features: ["Authentification complete", "Integration Stripe", "Dashboard admin", "API REST", "Documentation complete"],
  },
  "ai-content-generator": {
    id: "2",
    title: "AI Content Generator",
    slug: "ai-content-generator",
    description: "Application de generation de contenu avec GPT-4 pour blogs, reseaux sociaux et marketing.",
    problem: "Creer du contenu de qualite prend du temps et necessite des competences en redaction.",
    solution: "Generez du contenu optimise SEO en quelques clics grace a l'IA.",
    price: 499,
    currency: "EUR",
    category: "application",
    tech_stack: ["React", "Node.js", "OpenAI", "MongoDB"],
    maturity_level: "Production",
    license_type: "Commercial",
    tags: ["AI", "Content", "GPT-4", "Marketing"],
    avg_rating: 4.9,
    review_count: 89,
    purchase_count: 523,
    emoji: "🤖",
    seller: { name: "Marie Martin", avatar: "MM" },
    features: ["Generation GPT-4", "Templates personnalisables", "Export multi-format", "Historique", "API incluse"],
  },
  "ecommerce-api": {
    id: "3",
    title: "E-commerce API",
    slug: "ecommerce-api",
    description: "API REST complete pour e-commerce avec gestion produits, commandes et paiements.",
    problem: "Developper une API e-commerce robuste demande beaucoup de temps et d'expertise.",
    solution: "Une API prete a l'emploi avec toutes les fonctionnalites essentielles.",
    price: 199,
    currency: "EUR",
    category: "api",
    tech_stack: ["Node.js", "Express", "PostgreSQL", "Redis"],
    maturity_level: "Production",
    license_type: "MIT",
    tags: ["E-commerce", "API", "REST", "Backend"],
    avg_rating: 4.7,
    review_count: 67,
    purchase_count: 412,
    emoji: "🛒",
    seller: { name: "Pierre Bernard", avatar: "PB" },
    features: ["CRUD Produits", "Gestion commandes", "Webhooks", "Rate limiting", "Documentation Swagger"],
  },
  "analytics-dashboard": {
    id: "4",
    title: "Analytics Dashboard",
    slug: "analytics-dashboard",
    description: "Dashboard analytics moderne avec graphiques interactifs et rapports automatises.",
    problem: "Visualiser et comprendre ses donnees business est complexe sans outils adaptes.",
    solution: "Un dashboard cle en main avec des visualisations puissantes.",
    price: 349,
    currency: "EUR",
    category: "application",
    tech_stack: ["Vue.js", "D3.js", "Python", "FastAPI"],
    maturity_level: "Beta",
    license_type: "Commercial",
    tags: ["Analytics", "Dashboard", "Data", "Visualization"],
    avg_rating: 4.6,
    review_count: 45,
    purchase_count: 234,
    emoji: "📊",
    seller: { name: "Sophie Leroy", avatar: "SL" },
    features: ["Graphiques interactifs", "Rapports PDF", "Alertes", "Multi-sources", "Temps reel"],
  },
  "auth-microservice": {
    id: "5",
    title: "Auth Microservice",
    slug: "auth-microservice",
    description: "Microservice d'authentification avec JWT, OAuth2 et gestion des sessions.",
    problem: "L'authentification securisee est critique mais complexe a implementer correctement.",
    solution: "Un microservice battle-tested avec toutes les bonnes pratiques de securite.",
    price: 149,
    currency: "EUR",
    category: "api",
    tech_stack: ["Go", "gRPC", "PostgreSQL", "Redis"],
    maturity_level: "Production",
    license_type: "Apache-2.0",
    tags: ["Auth", "Security", "JWT", "OAuth2"],
    avg_rating: 4.9,
    review_count: 156,
    purchase_count: 892,
    emoji: "🔐",
    seller: { name: "Lucas Petit", avatar: "LP" },
    features: ["JWT + Refresh tokens", "OAuth2 (Google, GitHub)", "2FA", "Rate limiting", "Audit logs"],
  },
  "landing-page-builder": {
    id: "6",
    title: "Landing Page Builder",
    slug: "landing-page-builder",
    description: "Constructeur de landing pages drag and drop avec templates professionnels.",
    problem: "Creer des landing pages qui convertissent necessite des competences en design et dev.",
    solution: "Un builder intuitif avec des templates optimises pour la conversion.",
    price: 399,
    currency: "EUR",
    category: "application",
    tech_stack: ["React", "TypeScript", "Supabase", "Tailwind"],
    maturity_level: "Production",
    license_type: "Commercial",
    tags: ["Landing Page", "Builder", "No-Code", "Marketing"],
    avg_rating: 4.7,
    review_count: 78,
    purchase_count: 345,
    emoji: "🎨",
    seller: { name: "Emma Moreau", avatar: "EM" },
    features: ["Drag and drop", "50+ templates", "A/B testing", "Analytics integre", "Export HTML"],
  },
};

export default function ProjectPage() {
  const params = useParams();
  const slug = params.slug as string;
  const project = mockProjects[slug];

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🔍</span>
          <h1 className="text-2xl font-bold text-white mb-2">Projet non trouve</h1>
          <p className="text-gray-400 mb-6">Ce projet n existe pas ou a ete supprime.</p>
          <Link href="/marketplace" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium">
            Retour au Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold text-white">SeedBay</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/marketplace" className="text-gray-300 hover:text-white">Marketplace</Link>
              <Link href="/auth/login" className="text-gray-300 hover:text-white">Connexion</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-400 mb-8">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          <span>/</span>
          <span className="text-white">{project.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="bg-gray-800 rounded-xl p-8">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center text-4xl">
                  {project.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-white">{project.title}</h1>
                    <span className="bg-emerald-500/20 text-emerald-400 text-xs font-medium px-2 py-1 rounded-full">
                      {project.maturity_level}
                    </span>
                  </div>
                  <p className="text-gray-400 text-lg mb-4">{project.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center text-yellow-400">
                      <span>⭐</span>
                      <span className="ml-1 text-white font-medium">{project.avg_rating}</span>
                      <span className="ml-1 text-gray-400">({project.review_count} avis)</span>
                    </div>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400">{project.purchase_count} ventes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Problem & Solution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-red-400">❌</span> Probleme
                </h3>
                <p className="text-gray-400">{project.problem}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-green-400">✅</span> Solution
                </h3>
                <p className="text-gray-400">{project.solution}</p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Fonctionnalites incluses</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-center gap-2 text-gray-300">
                    <span className="text-emerald-400">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Tech Stack */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Stack technique</h3>
              <div className="flex flex-wrap gap-2">
                {project.tech_stack.map((tech: string) => (
                  <span key={tech} className="bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-gray-800 rounded-xl p-6 sticky top-24">
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-white mb-1">{project.price} {project.currency}</p>
                <p className="text-gray-400 text-sm">Licence {project.license_type}</p>
              </div>
              
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-semibold mb-3 transition-colors">
                Acheter maintenant
              </button>
              
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors">
                Ajouter au panier
              </button>

              <div className="mt-6 pt-6 border-t border-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span>✓</span>
                  <span>Acces au code source complet</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span>✓</span>
                  <span>Mises a jour gratuites</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span>✓</span>
                  <span>Support 6 mois inclus</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <span>✓</span>
                  <span>Garantie satisfait ou rembourse 30j</span>
                </div>
              </div>
            </div>

            {/* Seller Card */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Vendeur</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {project.seller.avatar}
                </div>
                <div>
                  <p className="text-white font-medium">{project.seller.name}</p>
                  <p className="text-gray-400 text-sm">Vendeur verifie</p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag: string) => (
                  <span key={tag} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
