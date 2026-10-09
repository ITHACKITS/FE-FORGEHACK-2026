import React, { useEffect, useState } from "react";
import { Play, Pause, ChevronUp, ChevronDown } from "lucide-react";
import { formatHour } from "../../utils/formatters";

interface TimelinePlayerProps {
  currentHour: number;
  onHourChange: (hour: number) => void;
}

export const TimelinePlayer: React.FC<TimelinePlayerProps> = ({
  currentHour,
  onHourChange
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        onHourChange(currentHour >= 48 ? 0 : currentHour + 1);
      }, 450);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentHour, onHourChange]);

  const quickSteps = [0, 6, 12, 24, 36, 48];

  return (
    <div 
      className={`absolute left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[min(720px,calc(100%-28px))] z-[1000] transition-all duration-300 ease-in-out ${
        isExpanded ? "bottom-2 sm:bottom-3.5 translate-y-0" : "bottom-0 translate-y-full"
      }`}
    >
      {/* Tombol Toggle Slide */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-7 left-1/2 -translate-x-1/2 w-12 h-7 rounded-t-xl flex items-center justify-center cursor-pointer transition-colors shadow-lg aurora-glass-card border-b-0 text-purple-300 hover:text-white"
        title={isExpanded ? "Sembunyikan Horizon Waktu" : "Tampilkan Horizon Waktu"}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
      </button>

      {/* Main Panel */}
      <div 
        className="w-full aurora-glass-card rounded-2xl px-3 sm:px-4 py-2.5 shadow-2xl text-slate-100 transition-all"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer aurora-btn shrink-0"
              title={isPlaying ? "Jeda Animasi" : "Putar Animasi"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />}
            </button>
            <span className="text-xs font-bold text-white">Horizon Waktu:</span>
            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg bg-black/40 border border-white/15 text-emerald-300 shadow-xs">
              {formatHour(currentHour)}
            </span>
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
            {quickSteps.map((step) => (
              <button
                key={step}
                onClick={() => onHourChange(step)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition cursor-pointer shrink-0 shadow-xs ${
                  currentHour === step
                    ? "font-extrabold bg-gradient-to-r from-emerald-600/80 to-rose-600/80 border-white/40 text-white shadow-md"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 font-medium"
                }`}
              >
                T+{step}h
              </button>
            ))}
          </div>
        </div>

        <div>
          <input
            type="range"
            min={0}
            max={48}
            step={1}
            value={currentHour}
            onChange={(e) => onHourChange(parseInt(e.target.value, 10))}
            className="w-full cursor-pointer accent-emerald-400"
          />
          <div className="flex justify-between font-mono text-[9px] mt-0.5 font-bold text-slate-400">
            <span>00:00 (Awal)</span>
            <span>12:00</span>
            <span>24:00</span>
            <span>36:00</span>
            <span>48:00 (Akhir)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
