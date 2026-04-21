import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Layout, Palette, Circle, Zap, Gauge } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  colors: { name: string; value: string; number?: number; isStripe?: boolean }[];
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  themeColor?: string;
  pickerStyle?: 'default' | 'balls' | 'cloth' | 'speed' | 'dial';
  onStyleChange?: (style: 'default' | 'balls' | 'cloth' | 'speed' | 'dial') => void;
  allowedStyles?: ('default' | 'balls' | 'cloth' | 'speed' | 'dial')[];
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  label, value, onChange, colors, icon, isOpen, onToggle, themeColor, 
  pickerStyle = 'default', onStyleChange, allowedStyles = ['default']
}) => {
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
  const hexSize = 1.25; // converted to vw-like scale in logic

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
  }, [hexSize]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center justify-between p-[min(2vh,1.5rem)] bg-slate-950/30 rounded-xl border transition-colors cursor-pointer group"
           style={{ 
             borderColor: isOpen ? (themeColor || '#10b981') : 'rgba(255,255,255,0.05)',
           }}
           onClick={() => onToggle(!isOpen)}>
        <div className="flex items-center gap-[1vw]">
          <div className="p-[1.5vh] bg-slate-800 rounded-lg text-slate-400 transition-colors"
               style={{ color: isOpen ? (themeColor || '#10b981') : undefined }}>
            {icon}
          </div>
          <div>
            <p className="text-[min(2.2vh,1.125rem)] font-bold uppercase tracking-wider text-slate-500">{label}</p>
            <div className="flex items-center gap-[0.5vw]">
              <div className="w-[2.4vw] h-[2.4vw] min-w-[1.5rem] min-h-[1.5rem] rounded-full border border-white/20" style={{ backgroundColor: value }} />
              <span className="text-[min(3.2vh,1.5rem)] font-black text-slate-200 uppercase">{value}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-[2.5vh] h-[2.5vh] text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-[1vh] z-[100] p-[3vh] bg-slate-900 border rounded-3xl shadow-2xl backdrop-blur-xl min-w-[80vw] sm:min-w-[21.25rem] flex flex-col items-center gap-[3vh]"
            style={{ borderColor: (themeColor || '#10b981') + '33' }}
          >
            {allowedStyles.length > 1 && (
              <div className="w-full flex p-[0.5vh] bg-black/40 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                {allowedStyles.map((style) => {
                  const labelMap = { 
                    default: 'Grid', 
                    balls: 'Balls', 
                    cloth: 'Standard', 
                    speed: 'Speed', 
                    dial: 'Dial' 
                  };
                  return (
                    <button
                      key={style}
                      onClick={() => onStyleChange?.(style)}
                      className={`flex-1 min-w-[15vw] sm:min-w-[3.75rem] flex items-center justify-center gap-[1vw] py-[1.5vh] rounded-xl transition-all ${pickerStyle === style ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <span className="text-[1.2vh] font-black uppercase tracking-widest">{labelMap[style]}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="text-center">
              <h4 className="text-[1.8vh] font-bold text-slate-400 uppercase tracking-[0.2em]">
                {pickerStyle === 'balls' ? 'Ball Rack' : pickerStyle === 'cloth' ? 'Standard Cloth' : pickerStyle === 'speed' ? 'Speed Cloth' : pickerStyle === 'dial' ? 'Precision Dial' : 'Pick a Color'}
              </h4>
            </div>

            {pickerStyle === 'default' ? (
              <div className="relative w-[70vw] h-[70vw] sm:w-[25vh] sm:h-[25vh] lg:w-[40vh] lg:h-[40vh] flex items-center justify-center bg-white/5 rounded-full p-[2vh]">
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
                        left: `calc(50% + ${hex.posX}vw)`,
                        top: `calc(50% + ${hex.posY}vw)`,
                        width: `${hexSize * 2.2}vw`,
                        height: `${hexSize * 2.2}vw`,
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
            ) : pickerStyle === 'balls' ? (
              <div className="grid grid-cols-5 gap-[2vw]">
                {colors.map((ball) => {
                  const isActive = value.toUpperCase() === ball.value.toUpperCase();
                  return (
                    <button
                      key={ball.number || ball.name}
                      onClick={() => {
                        onChange(ball.value);
                        onToggle(false);
                      }}
                      className={`relative w-[12vw] h-[12vw] sm:w-[3rem] sm:h-[3rem] rounded-full transition-all duration-300 group ${isActive ? 'scale-125 ring-2 ring-white ring-offset-4 ring-offset-slate-900 z-10' : 'hover:scale-110'}`}
                      style={{ 
                        backgroundColor: ball.value,
                        boxShadow: 'inset -0.25rem -0.25rem 0.625rem rgba(0,0,0,0.5), inset 0.25rem 0.25rem 0.625rem rgba(255,255,255,0.2), 0 0.25rem 0.5rem rgba(0,0,0,0.3)'
                      }}
                      title={ball.name}
                    >
                      {ball.isStripe && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5vh] bg-white pointer-events-none" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[40%] aspect-square bg-white rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-[1.2vh] font-bold text-black leading-none">{ball.number}</span>
                        </div>
                      </div>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-transparent to-white/30 pointer-events-none" />
                    </button>
                  );
                })}
              </div>
            ) : pickerStyle === 'dial' ? (
              <div className="relative w-[70vw] h-[70vw] sm:w-[35vh] sm:h-[35vh] flex items-center justify-center">
                {/* Carbon Fiber Dial Background */}
                <div 
                  className="absolute inset-0 rounded-full border-[1vh] border-slate-800 shadow-2xl overflow-hidden"
                  style={{ 
                    backgroundImage: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)',
                    backgroundSize: '0.5vh 0.5vh',
                    backgroundColor: '#1a1a1a'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-black/40 pointer-events-none" />
                </div>

                {/* Dial Center */}
                <div className="absolute inset-[20%] rounded-full bg-slate-900 border-[0.5vh] border-slate-800 shadow-inner flex flex-col items-center justify-center gap-[1vh]">
                  <div className="w-[20%] aspect-square rounded-full shadow-lg border-2 border-white/20" style={{ backgroundColor: value }} />
                  <span className="text-[1vh] font-black text-slate-500 uppercase tracking-widest">{colors.find(c => c.value === value)?.name || 'Selected'}</span>
                </div>

                {/* Option Nodes around the dial */}
                {colors.map((color, idx) => {
                  const angle = (idx / colors.length) * 2 * Math.PI - Math.PI / 2;
                  const r = 11; // relative to vw in logic
                  const x = Math.cos(angle) * r;
                  const y = Math.sin(angle) * r;
                  const isActive = value.toUpperCase() === color.value.toUpperCase();

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onChange(color.value);
                      }}
                      className="absolute group z-20"
                      style={{
                        left: `calc(50% + ${x}vh)`,
                        top: `calc(50% + ${y}vh)`,
                        width: '4vh',
                        height: '4vh',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div 
                        className={`w-full h-full rounded-full border-2 transition-all duration-300 ${isActive ? 'border-white scale-125 shadow-[0_0_1rem_rgba(255,255,255,0.5)]' : 'border-slate-700 group-hover:scale-110 group-hover:border-slate-500'}`}
                        style={{ backgroundColor: color.value }}
                      />
                    </button>
                  );
                })}

                {/* Rotating Needle */}
                {(() => {
                   const activeIdx = colors.findIndex(c => c.value.toUpperCase() === value.toUpperCase());
                   if (activeIdx === -1) return null;
                   const angle = (activeIdx / colors.length) * 360 - 90;
                   return (
                     <motion.div 
                       className="absolute inset-0 pointer-events-none"
                       animate={{ rotate: angle }}
                       transition={{ type: "spring", stiffness: 100, damping: 15 }}
                     >
                        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[0.5vh] h-[35%] bg-gradient-to-b from-white to-transparent opacity-40 rounded-full" />
                     </motion.div>
                   );
                })()}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-[2vh] w-full">
                {colors.map((cloth) => {
                  const isActive = value.toUpperCase() === cloth.value.toUpperCase();
                  return (
                    <button
                      key={cloth.value}
                      onClick={() => {
                        onChange(cloth.value);
                        onToggle(false);
                      }}
                      className={`flex flex-col gap-[1vh] p-[1vh] rounded-xl border transition-all ${isActive ? 'bg-white/10 border-white' : 'bg-white/5 border-transparent hover:bg-white/10 shrink-0'}`}
                    >
                      <div 
                        className="w-full h-[8vh] rounded-lg shadow-inner flex items-center justify-center overflow-hidden relative"
                        style={{ backgroundColor: cloth.value }}
                      >
                         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#000 0.0625rem, transparent 0.0625rem)', backgroundSize: '0.5vh 0.5vh' }} />
                         <div className="absolute inset-0 shadow-[inset_0_0_1.25rem_rgba(0,0,0,0.3)]" />
                         {pickerStyle === 'speed' && (
                           <div className="absolute top-[0.5vh] right-[0.5vh]">
                             <Zap className="w-[1.2vh] h-[1.2vh] text-white/40" />
                           </div>
                         )}
                      </div>
                      <span className="text-[1.2vh] font-bold text-slate-400 uppercase tracking-tighter text-center truncate w-full">{cloth.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {pickerStyle === 'default' && colors && colors.length > 0 && (
              <div className="w-full space-y-[1vh]">
                <p className="text-[1.2vh] font-bold text-slate-500 uppercase tracking-widest text-center">Presets</p>
                <div className="flex flex-wrap justify-center gap-[0.5vh]">
                  {colors.slice(0, 12).map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        onChange(c.value);
                        onToggle(false);
                      }}
                      className={`w-[2.5vh] h-[2.5vh] rounded-full border-2 transition-all ${value.toUpperCase() === c.value.toUpperCase() ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
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
