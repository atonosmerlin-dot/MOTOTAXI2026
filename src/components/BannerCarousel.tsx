import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Banner, useBanners } from '@/hooks/useBanners';
import siteConfig from '@/lib/siteConfig';

interface BannerCarouselProps {
  className?: string;
}

export const BannerCarousel: React.FC<BannerCarouselProps> = ({ className = '' }) => {
  const { data: banners = [], isLoading } = useBanners();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Load site config to decide whether to show banners
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await siteConfig.getSiteConfigs(['banners_enabled']);
        if (!mounted) return;
        const val = cfg.banners_enabled;
        setEnabled(val === undefined ? true : String(val) !== 'false');
      } catch (e) {
        if (!mounted) return;
        setEnabled(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    console.debug('BannerCarousel: fetched', banners.length, 'banners; enabled=', enabled);
  }, [banners, enabled]);

  // Auto-play logic
  useEffect(() => {
    if (!isAutoPlay || banners.length === 0) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, banners[currentIndex]?.transition_speed || 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, isAutoPlay, banners]);

  // Pause on hover
  const handleMouseEnter = () => setIsAutoPlay(false);
  const handleMouseLeave = () => setIsAutoPlay(true);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  if (isLoading || enabled === null) {
    return (
      <div className={`w-full bg-slate-800/30 rounded-xl h-40 flex items-center justify-center ${className}`}>
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  // NOTE: Temporarily ignore `enabled === false` so we can debug rendering
  // and verify that banners are received and images render correctly.
  // If there are no banners, keep returning null.
  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div
      className={`w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="relative w-full rounded-xl overflow-hidden shadow-lg group bg-slate-800/40 min-h-[160px]">
        {/* Banner Image */}
        <a
          href={currentBanner.link_destination || '#'}
          target={currentBanner.link_destination ? '_blank' : undefined}
          rel={currentBanner.link_destination ? 'noopener noreferrer' : undefined}
          className="block w-full aspect-video overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
        >
          <img
            src={currentBanner.image_url}
            alt={currentBanner.title}
            className="w-full h-full object-cover"
            onError={(e: any) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23334155" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="%2394a3b8"%3EImagem não encontrada%3C/text%3E%3C/svg%3E';
            }}
          />
        </a>

        {/* Gradient overlay for better text readability if needed */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Navigation Arrows - Only show if multiple banners */}
        {banners.length > 1 && (
          <>
            {/* Left Arrow */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full opacity-100 transition-all duration-200 z-10 backdrop-blur-sm"
              aria-label="Banner anterior"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Right Arrow */}
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full opacity-100 transition-all duration-200 z-10 backdrop-blur-sm"
              aria-label="Próximo banner"
            >
              <ChevronRight size={20} />
            </button>

            {/* Dots/Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 opacity-100 transition-opacity">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Ir para banner ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Fade in/out animation */}
        <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .banner-fade { animation: fadeIn 500ms ease-in; }`}</style>
      </div>

      {/* Debug: show fetched banner URLs and count to help diagnose rendering issues */}
      <div className="mt-2 text-xs text-slate-300 text-center">
        Debug banners: {banners.length}
        <div className="mt-1">
          {banners.map((b, i) => (
            <div key={b.id} className="truncate">
              {i + 1}. {b.image_url}
            </div>
          ))}
        </div>
      </div>

      {/* Info below carousel */}
      {currentBanner.title && (
        <p className="text-slate-400 text-sm mt-2 text-center">{currentBanner.title}</p>
      )}
    </div>
  );
};

export default BannerCarousel;
