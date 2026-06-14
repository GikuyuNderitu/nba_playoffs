import React, { useState, useMemo } from 'react';

export default function HomeView({ tournaments = [], onSelectTournament, onToggleWatched }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'watching', 'unwatched', 'watched'

  // Filter tournaments by search query and tab
  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const status = t.is_watched === 1 
        ? 'watched' 
        : (t.is_watching === 1 ? 'watching' : 'unwatched');

      const matchesTab = activeTab === 'all' || status === activeTab;

      return matchesSearch && matchesTab;
    });
  }, [tournaments, searchQuery, activeTab]);

  // Shelf for active "Watching" tournaments
  const watchingTournaments = useMemo(() => {
    return tournaments.filter(t => t.is_watching === 1 && t.is_watched === 0);
  }, [tournaments]);

  return (
    <div className="space-y-10 fade-in">
      {/* Hero Section */}
      <section className="glass-panel text-center relative overflow-hidden py-12 md:py-16 flex flex-col items-center justify-center border border-solid border-white/5 rounded-2xl bg-gradient-to-br from-[#0d0e17] via-[#121424]/90 to-[#0d0e17]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,242,254,0.08),transparent_50%)] pointer-events-none" />
        <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight bg-gradient-to-r from-[#f5f6fa] via-[#00f2fe] to-[#ff007f] bg-clip-text text-transparent">
          Spoiler-Free Sports & Esports
        </h2>
        <p className="max-w-2xl text-sm md:text-base text-[#8a8f9f] mb-8 leading-relaxed px-4">
          Catch up on your favorite tournaments chronologically without getting spoiled. Lock future matchups, unlock games sequentially, and maintain independent watch sessions.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-xs md:text-sm text-[#4e5264] font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 bg-white/3 border border-solid border-white/5 px-3 py-1.5 rounded-full text-[#00f2fe]">
            🔒 Locked Spoilers
          </span>
          <span className="flex items-center gap-1.5 bg-white/3 border border-solid border-white/5 px-3 py-1.5 rounded-full text-[#ff007f]">
            ⚡ Dynamic Timeline
          </span>
          <span className="flex items-center gap-1.5 bg-white/3 border border-solid border-white/5 px-3 py-1.5 rounded-full text-[#ffb800]">
            👥 Shared Progress
          </span>
        </div>
      </section>

      {/* Continue Watching Shelf */}
      {watchingTournaments.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 text-[#ff007f]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff007f] animate-pulse" />
            Continue Watching
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {watchingTournaments.map(t => (
              <div 
                key={t.id} 
                className="glass-panel relative flex flex-col justify-between group cursor-pointer hover:border-[#ff007f]/40 transition-all duration-300"
                onClick={() => onSelectTournament(t.id)}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="badge badge-pink">Watching</span>
                    <span className="text-xs text-[#4e5264] font-semibold">{t.type === 'bracket' ? 'Bracket Tree' : 'Linear List'}</span>
                  </div>
                  <h4 className="text-lg font-bold group-hover:text-[#ff007f] transition-colors duration-200">{t.title}</h4>
                  <p className="text-xs text-[#8a8f9f] mt-1 line-clamp-2">{t.description}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-solid border-white/5 flex justify-between items-center text-xs text-[#4e5264]">
                  <span>Last Updated: {t.last_sync_at ? new Date(t.last_sync_at).toLocaleDateString() : 'Never'}</span>
                  <span className="text-[#ff007f] group-hover:translate-x-1 transition-transform duration-200">Resume Matchups →</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Browse Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold">Browse All Tournaments</h3>
          
          {/* Search bar */}
          <div className="relative w-full md:max-w-xs">
            <input 
              type="text"
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151726]/80 text-[#f5f6fa] text-sm px-4 py-2.5 pl-10 rounded-xl border border-solid border-white/6 focus:outline-none focus:border-[#00f2fe]/50 focus:ring-1 focus:ring-[#00f2fe]/30 transition-all duration-300"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4e5264]">
              🔍
            </span>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex border-b border-solid border-white/5 pb-2 overflow-x-auto gap-2">
          {['all', 'watching', 'unwatched', 'watched'].map((tab) => {
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-xs md:text-sm font-semibold py-2 px-4 rounded-lg cursor-pointer border border-solid border-transparent transition-all duration-300 uppercase tracking-wider shrink-0 ${
                  isActive 
                    ? 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]/20' 
                    : 'text-[#8a8f9f] hover:text-[#f5f6fa]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="glass-panel text-center py-16 text-[#8a8f9f]">
            <p className="text-base mb-2">No tournaments found matching the filters.</p>
            <p className="text-xs text-[#4e5264]">Try adjusting your search queries or filter status.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredTournaments.map(t => {
              const status = t.is_watched === 1 
                ? 'watched' 
                : (t.is_watching === 1 ? 'watching' : 'unwatched');

              return (
                <div 
                  key={t.id} 
                  className="glass-panel flex flex-col justify-between hover:border-white/10 transition-all duration-300 group hover:-translate-y-1 relative"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => onSelectTournament(t.id)}
                  >
                    <div className="flex justify-between items-center mb-3">
                      {status === 'watched' && <span className="badge border-solid border-yellow-500/30 bg-yellow-500/10 text-yellow-500">Watched</span>}
                      {status === 'watching' && <span className="badge badge-pink">Watching</span>}
                      {status === 'unwatched' && <span className="badge badge-cyan">Unwatched</span>}
                      
                      <span className="badge border-solid border-purple-500/30 bg-purple-500/10 text-purple-400 text-[10px]">
                        {t.type === 'bracket' ? 'Bracket' : 'Linear'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#f5f6fa] group-hover:text-[#00f2fe] transition-colors duration-200 line-clamp-1">{t.title}</h4>
                    <p className="text-xs text-[#8a8f9f] mt-1.5 line-clamp-3 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-solid border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-[#4e5264]">Sync: {t.last_sync_at ? new Date(t.last_sync_at).toLocaleDateString() : 'Never'}</span>
                    
                    {/* Mark as Watched / Unwatched toggle */}
                    <button
                      className={`text-xs px-2.5 py-1 rounded-md border border-solid cursor-pointer transition-colors duration-200 ${
                        status === 'watched'
                          ? 'border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10'
                          : 'border-white/10 text-[#8a8f9f] hover:text-[#f5f6fa] hover:border-white/20'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card navigation click
                        onToggleWatched(t.id, status === 'watched');
                      }}
                    >
                      {status === 'watched' ? '✓ Watched' : 'Mark Watched'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
