import React from 'react';

interface AudioVisualizerProps {
  level: number;
  isActive: boolean;
  barsCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  level,
  isActive,
  barsCount = 16,
}) => {
  return (
    <div className="flex items-center gap-1 h-7 px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800">
      {Array.from({ length: barsCount }).map((_, i) => {
        // Vary heights based on active audio level and bar index
        const heightMultiplier = Math.sin((i / barsCount) * Math.PI);
        const dynamicHeight = isActive
          ? Math.max(15, Math.min(100, (level * 1.2 + Math.random() * 20) * heightMultiplier))
          : 15;

        const isHigh = dynamicHeight > 60;
        const isMed = dynamicHeight > 30;

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              !isActive
                ? 'bg-slate-700/50'
                : isHigh
                ? 'bg-emerald-400'
                : isMed
                ? 'bg-emerald-500/80'
                : 'bg-emerald-600/50'
            }`}
            style={{
              height: `${dynamicHeight}%`,
            }}
          />
        );
      })}
    </div>
  );
};
