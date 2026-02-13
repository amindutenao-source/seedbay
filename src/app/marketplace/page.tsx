"use client";

import Link from "next/link";
import { useState } from "react";

const mockProjects = [
  { id: "1", title: "SaaS Starter Kit", slug: "saas-starter-kit", description: "Template complet pour lancer votre SaaS avec auth et paiements Stripe.", price: 299, category: "template", tech_stack: ["Next.js", "TypeScript", "Tailwind"], maturity_level: "Production", avg_rating: 4.8, purchase_count: 847, emoji: "🚀" },
  { id: "2", title: "AI Content Generator", slug: "ai-content-generator", description: "Application de generation de contenu avec GPT-4.", price: 499, category: "application", tech_stack: ["React", "Node.js", "OpenAI"], maturity_level: "Production", avg_rating: 4.9, purchase_count: 523, emoji: "🤖" },
  { id: "3", title: "E-commerce API", slug: "ecommerce-api", description: "API REST complete pour e-commerce.", price: 199, category: "api", tech_stack: ["Node.js", "Express", "PostgreSQL"], maturity_level: "Production", avg_rating: 4.7, purchase_count: 412, emoji: "🛒" },
  { id: "4", title: "Analytics Dashboard", slug: "analytics-dashboard", description: "Dashboard analytics moderne avec graphiques.", price: 349, category: "application", tech_stack: ["Vue.js", "D3.js", "Python"], maturity_level: "Beta", avg_rating: 4.6, purchase_count: 234, emoji: "📊" },
  { id: "5", title: "Auth Microservice", slug: "auth-microservice", description: "Microservice auth avec JWT et OAuth2.", price: 149, category: "api", tech_stack: ["Go", "gRPC", "PostgreSQL"], maturity_level: "Production", avg_rating: 4.9, purchase_count: 892, emoji: "🔐" },
  { id: "6", title: "Landing Page Builder", slug: "landing-page-builder", description: "Constructeur de landing pages drag and drop.", price: 399, category: "application", tech_stack: ["React", "TypeScript", "Supabase"], maturity_level: "Production", avg_rating: 4.7, purchase_count: 345, emoji: "🎨" },
];

const categories = [
  { id: "all", name: "Tous", emoji: "🌟" },
  { id: "application", name: "Applications", emoji: "💻" },
  { id: "template", name: "Templates", emoji: "📋" },
  { id: "api", name: "APIs", emoji: "🔌" },
];

const techFilters = ["Next.js", "React", "TypeScript", "Node.js", "Python", "Vue.js", "Go"];

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");

  const filteredProjects = mockProjects.filter((project) => {
    const matchesCategory = selectedCategory === "all" || project.category === selectedCategory;
    const matchesTech = selectedTechs.length === 0 || selectedTechs.some((tech) => project.tech_stack.includes(tech));
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesTech && matchesSearch;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case "price-low": return a.price - b.price;
      case "price-high": return b.price - a.price;
      case "rating": return b.avg_rating - a.avg_rating;
      default: return b.purchase_count - a.purchase_count;
    }
  });

  const toggleTech = (tech: string) => {
    setSelectedTechs((prev) => prev.includes(tech) ? prev.filter((t) => t !== tech) : [...prev, tech]);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold text-white">SeedBay</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/marketplace" className="text-emerald-400 font-medium">Marketplace</Link>
              <Link href="/submit" className="text-gray-300 hover:text-white">Vendre</Link>
              <Link href="/auth/login" className="text-gray-300 hover:text-white">Connexion</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Marketplace</h1>
          <p className="text-gray-400">Decouvrez des projets innovants prets a etre acquis</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-gray-800 rounded-xl p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4">Filtres</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">Recherche</label>
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">Categories</label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors ${selectedCategory === cat.id ? "bg-emerald-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">Technologies</label>
                <div className="flex flex-wrap gap-2">
                  {techFilters.map((tech) => (
                    <button
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedTechs.includes(tech) ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Trier par</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="popular">Popularite</option>
                  <option value="rating">Note</option>
                  <option value="price-low">Prix croissant</option>
                  <option value="price-high">Prix decroissant</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-400">{sortedProjects.length} projets trouves</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedProjects.map((project) => (
                <div key={project.id} className="bg-gray-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all group">
                  <div className="h-40 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <span className="text-5xl">{project.emoji}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">{project.title}</h3>
                      <div className="flex items-center text-yellow-400">
                        <span>⭐</span>
                        <span className="ml-1 text-sm text-gray-300">{project.avg_rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.tech_stack.map((tech) => (
                        <span key={tech} className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">{tech}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                      <div>
                        <p className="text-emerald-400 font-bold text-lg">{project.price} EUR</p>
                        <p className="text-gray-500 text-xs">{project.purchase_count} ventes</p>
                      </div>
                      <Link href={"/projects/" + project.slug} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        Voir details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sortedProjects.length === 0 && (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">🔍</span>
                <h3 className="text-xl font-semibold text-white mb-2">Aucun projet trouve</h3>
                <p className="text-gray-400">Essayez de modifier vos filtres</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
