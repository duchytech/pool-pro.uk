import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  colors: { name: string; value: string }[];
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  themeColor?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange, colors, icon, isOpen, onToggle, themeColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onToggle(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const radius = 7;
  const hexSize = 12;

  const hexGrid = React.useMemo(() => {
    const hslToHex = (h: number, s: number, l: number) => {
      l /= 100;
      const a = s * Math.min(l, 1 - l) / 100;
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
    };

    const hexes = [];
    for (let q = -radius + 1; q < radius; q++) {
      const r1 = Math.max(-radius + 1, -q - radius + 1);
      const r2 = Math.min(radius - 1, -q + radius - 1);
      for (let r = r1; r <= r2; r++) {
        const x = q;
        const y = r;
        const z = -q - r;
        const dist = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
        
        let angle = Math.atan2(r + q / 2, (Math.sqrt(3) / 2) * q);
        if (angle < 0) angle += 2 * Math.PI;
        const hue = (angle * 180) / Math.PI;

        let color;
        if (dist === 0) {
          color = '#FFFFFF';
        } else {
          const s = 100;
          const l = 100 - (dist / (radius - 1)) * 60;
          color = hslToHex(hue, s, l);
        }

        const posX = hexSize * (1.5 * q);
        const posY = hexSize * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);

        hexes.push({ color, posX, posY });
      }
    }
    return hexes;
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between p-3 bg-slate-950/30 rounded-xl border transition-colors cursor-pointer group"
           style={{ 
             borderColor: isOpen ? (themeColor || '#10b981') : 'rgba(255,255,255,0.05)',
           }}
           onClick={() => onToggle(!isOpen)}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg text-slate-400 transition-colors"
               style={{ color: isOpen ? (themeColor || '#10b981') : undefined }}>
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: value }} />
              <span className="text-sm font-medium text-slate-200 uppercase">{value}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[100] p-6 bg-slate-900 border rounded-3xl shadow-2xl backdrop-blur-xl min-w-[340px] flex flex-col items-center gap-6"
            style={{ borderColor: (themeColor || '#10b981') + '33' }}
          >
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Pick a Color</h4>
            </div>

            <div className="relative w-[260px] h-[260px] flex items-center justify-center bg-white/5 rounded-full p-4">
              {hexGrid.map((hex, idx) => {
                const isActive = value.toUpperCase() === hex.color.toUpperCase();
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onChange(hex.color);
                      onToggle(false);
                    }}
                    className="absolute group"
                    style={{
                      left: `calc(50% + ${hex.posX}px)`,
                      top: `calc(50% + ${hex.posY}px)`,
                      width: `${hexSize * 2.2}px`,
                      height: `${hexSize * 2.2}px`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={hex.color}
                  >
                    <div 
                      className={`w-full h-full transition-all duration-200 group-hover:scale-125 group-hover:z-10 ${isActive ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900 z-20' : ''}`}
                      style={{ 
                        backgroundColor: hex.color,
                        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {colors && colors.length > 0 && (
              <div className="w-full space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Presets</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {colors.slice(0, 12).map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        onChange(c.value);
                        onToggle(false);
                      }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${value.toUpperCase() === c.value.toUpperCase() ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
