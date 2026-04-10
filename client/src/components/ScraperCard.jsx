import { Link } from 'react-router-dom'
import { Play, Star, User, Tag, Coins } from 'lucide-react'

export default function ScraperCard({ scraper }) {
  const pricingLabel = scraper.pricing_type === 'free' ? 'Free'
    : scraper.pricing_type === 'one_time' ? `${scraper.price} credits`
    : `${scraper.price} cr/run`

  const pricingClass = scraper.pricing_type === 'free' ? 'badge-free'
    : scraper.pricing_type === 'one_time' ? 'badge-paid'
    : 'badge-per-run'

  return (
    <Link to={`/scrapers/${scraper.id}`}
      className="card glow-card group flex flex-col gap-4 hover:border-primary/30 transition-all duration-300 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-base group-hover:text-primary transition-colors truncate text-lg">
            {scraper.name}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <User size={12} className="text-muted shrink-0" />
            <span className="text-xs text-muted truncate">{scraper.creator_name}</span>
          </div>
        </div>
        <span className={`badge ${scraper.language === 'python' ? 'badge-python' : 'badge-javascript'} ml-2 shrink-0`}>
          {scraper.language === 'python' ? '🐍 Python' : '⚡ JS'}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-muted line-clamp-2 flex-1">
        {scraper.description || 'No description provided.'}
      </p>

      {/* Tags */}
      {scraper.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scraper.tags.slice(0, 3).map(tag => (
            <span key={tag} className="badge bg-surface-3 text-muted border border-border text-xs">
              <Tag size={9} />{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1"><Play size={11} />{scraper.runs_count?.toLocaleString()} runs</span>
        </div>
        <span className={`badge ${pricingClass} font-medium`}>
          {scraper.pricing_type === 'free' ? pricingLabel : <><Coins size={10} />{pricingLabel}</>}
        </span>
      </div>
    </Link>
  )
}
