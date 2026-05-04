import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Layout, Palette, Circle, Zap, Gauge } from 'lucide-react';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  colors: { name: string; value: string; number?: number; isStripe?: boolean; image?: string; thumbnail?: string }[];
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: (isOpen: boolean) => void;
  themeColor?: string;
  pickerStyle?: 'default' | 'balls' | 'dial' | 'backdrop' | 'cloth';
  onStyleChange?: (style: 'default' | 'balls' | 'dial' | 'backdrop' | 'cloth') => void;
  allowedStyles?: ('default' | 'balls' | 'dial' | 'backdrop' | 'cloth')[];
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ 
  label, value, onChange, colors, icon, isOpen, onToggle, themeColor, 
  pickerStyle = 'default', onStyleChange, allowedStyles = ['default'],
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const hexUnit = 4.2; // Base unit in percentage for the hex grid

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

        const posX = hexUnit * (1.5 * q);
        const posY = hexUnit * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);

        hexes.push({ color, posX, posY });
      }
    }
    return hexes;
  }, [hexUnit]);

  return (
    <div className={`relative w-full ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`} ref={containerRef}>
      <div className="flex items-center justify-between p-[2vh] bg-slate-950/30 rounded-xl border transition-all cursor-pointer group active:scale-[0.98] w-full"
           style={{ 
             borderColor: isOpen ? (themeColor || '#10b981') : 'rgba(255,255,255,0.05)',
           }}
           onClick={() => !disabled && onToggle(!isOpen)}>
        <div className="flex items-center gap-[1vw]">
          <div className="p-[1.5vh] bg-slate-800 rounded-lg text-slate-400 transition-colors"
               style={{ color: isOpen ? (themeColor || '#10b981') : undefined }}>
            {icon}
          </div>
          <div>
            {pickerStyle !== 'backdrop' && (
              <p className="font-bold uppercase tracking-wider text-slate-500 text-[2vw] sm:text-[1.5vh]">{label}</p>
            )}
            <div className={`flex items-center gap-[2.5vw] sm:gap-[1vw] transition-all`}>
              {(() => {
                const selectedItem = colors.find(c => c.value.toLowerCase() === value.toLowerCase());
                
                // 1. BACKDROP (POOL TABLE) STYLE
                if (pickerStyle === 'backdrop' && selectedItem) {
                  const imgSrc = selectedItem.thumbnail || selectedItem.image;
                  return (
                    <div className="w-[22vw] sm:w-[14vw] h-[7vh] sm:h-[8vh] rounded-lg overflow-hidden border border-white/20 shadow-lg flex items-center justify-center bg-slate-800 shrink-0">
                      {imgSrc ? (
                        <img 
                          src={imgSrc} 
                          alt="Selected"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = document.createElement('div');
                            fallback.className = 'text-[2.2vw] sm:text-[1vh] text-slate-400 font-bold uppercase p-1 text-center';
                            fallback.innerText = selectedItem.name;
                            target.parentElement?.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <div className="text-[2.2vw] sm:text-[1vh] text-slate-500 font-bold">{selectedItem.name}</div>
                      )}
                    </div>
                  );
                } 
                
                // 2. BALLS STYLE
                else if (pickerStyle === 'balls' && selectedItem && (selectedItem.thumbnail || selectedItem.image)) {
                  return (
                    <div className="w-[10vw] h-[10vw] min-w-[32px] min-h-[32px] sm:w-12 sm:h-12 rounded-full overflow-hidden border border-white/20 shadow-lg bg-slate-800 shrink-0">
                      <img 
                        src={selectedItem.thumbnail || selectedItem.image} 
                        alt="Selected Ball"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  );
                }
                
                // 3. DEFAULT (STANDARD COLOR) STYLE
                return (
                  <div 
                    className="w-[10vw] h-[10vw] min-w-[32px] min-h-[32px] sm:w-[5vh] sm:h-[5vh] rounded-full border border-white/20 shrink-0" 
                    style={{ backgroundColor: value }} 
                  />
                );
              })()}
              <span className="text-[2vh] sm:text-lg font-black text-slate-200 uppercase leading-none truncate max-w-[40vw]">
                {colors.find(c => c.value.toLowerCase() === value.toLowerCase())?.name || value}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-[2vh] h-[2vh] sm:w-5 sm:h-5 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1 
            }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`absolute top-full mt-[1.5vh] z-[200] bg-slate-900 border rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col items-center origin-top
              ${pickerStyle === 'default' 
                ? 'py-4 sm:py-[2.5vh] gap-4 px-[6%]' 
                : pickerStyle === 'backdrop' ? 'pt-2 pb-6 gap-2 px-[2.5%]' : 'pt-4 pb-8 gap-4 px-[6%]' 
              }
              ${isMobile ? 'fixed left-1/2 -translate-x-1/2 w-[92vw]' : 'inset-x-0'}
            `}
            style={{ 
              borderColor: (themeColor || '#10b981') + '33',
            }}
          >
            {allowedStyles.length > 1 && (
              <div className="w-full flex p-1 bg-black/40 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                {allowedStyles.map((style) => {
                  const labelMap = { 
                    default: 'Grid', 
                    balls: 'Balls', 
                    dial: 'Dial',
                    backdrop: 'Backdrop'
                  };
                  return (
                    <button
                      key={style}
                      onClick={() => onStyleChange?.(style)}
                      className={`flex-1 min-w-[14vmin] sm:min-w-[3.75rem] flex items-center justify-center gap-[1vmin] py-[0.1vh] sm:py-[0.15vh] rounded-xl transition-all active:scale-90 ${pickerStyle === style ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <span className="text-[2.8vh] sm:text-[3.2vh] font-black uppercase tracking-widest">{labelMap[style as keyof typeof labelMap]}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {pickerStyle === 'default' ? (
              <div className="relative w-[92%] aspect-square flex items-center justify-center bg-white/5 rounded-full p-[1%] mt-[0.5vh]">
                {hexGrid.map((hex, idx) => {
                  const isActive = value.toUpperCase() === hex.color.toUpperCase();
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        onChange(hex.color);
                        onToggle(false);
                      }}
                      className="absolute group active:scale-90 transition-transform"
                      style={{
                        left: `calc(50% + ${hex.posX}%)`,
                        top: `calc(50% + ${hex.posY}%)`,
                        width: `${hexUnit * 2.1}%`,
                        height: `${hexUnit * 2.1}%`,
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
              <div className="grid grid-cols-3 gap-[3vh] w-full max-h-[60vh] overflow-y-auto no-scrollbar p-2">
                {colors.map((ball) => {
                  const isActive = value.toUpperCase() === ball.value.toUpperCase();
                  return (
                      <button
                        key={ball.number || ball.name}
                        onClick={() => {
                          onChange(ball.value);
                          onToggle(false);
                        }}
                        className={`relative w-full aspect-square rounded-full transition-all duration-300 group active:scale-90 ${isActive ? 'scale-110 ring-4 ring-white ring-offset-4 ring-offset-slate-900 z-10' : 'hover:scale-110'}`}
                        style={{ 
                          backgroundColor: ball.value,
                          boxShadow: '0 0.8vh 1.6vh rgba(0,0,0,0.5)'
                        }}
                        title={ball.name}
                      >
                        { (ball.thumbnail || ball.image) ? (
                          <img 
                            src={ball.thumbnail || ball.image} 
                            alt={ball.name} 
                            className="absolute inset-0 w-full h-full object-contain rounded-full p-0.5"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'absolute inset-0 flex items-center justify-center font-bold text-[3vh] text-white';
                              fallback.innerText = ball.number?.toString() || ball.name;
                              target.parentElement?.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center font-bold text-[3.5vh] text-white">
                            {ball.number}
                          </div>
                        )}
                      </button>
                  );
                })}
              </div>
            ) : pickerStyle === 'backdrop' ? (
              <div className="grid grid-cols-2 landscape:grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-4 w-full max-h-[60vh] overflow-y-auto no-scrollbar p-3">
                {colors.map((b) => {
                  const isActive = value.toLowerCase() === b.value.toLowerCase();
                  return (
                    <button
                      key={b.value}
                      onClick={() => {
                        onChange(b.value);
                        onToggle(false);
                      }}
                      className={`flex flex-col gap-1 p-1 rounded-xl border-2 transition-all active:scale-95 ${isActive ? 'bg-white/20 border-white ring-2 ring-white/30' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    >
                      <div className="w-full aspect-[21/9] sm:aspect-[16/10] rounded-lg shadow-2xl flex items-center justify-center overflow-hidden relative bg-slate-800">
                         { (b.thumbnail || b.image) ? (
                           <img 
                             src={b.thumbnail || b.image} 
                             alt={b.name} 
                             className="w-full h-full object-cover transition-transform group-hover:scale-110"
                             onError={(e) => {
                               (e.target as HTMLImageElement).style.display = 'none';
                               (e.target as HTMLImageElement).parentElement!.classList.add('flex', 'items-center', 'justify-center');
                               const fallback = document.createElement('div');
                               fallback.className = 'text-[2.2vw] sm:text-[1vh] text-slate-400 font-bold uppercase p-2 text-center';
                               fallback.innerText = b.name;
                               (e.target as HTMLImageElement).parentElement!.appendChild(fallback);
                             }}
                           />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-[2.2vw] sm:text-[1vh] text-slate-500 font-bold uppercase">
                             {b.name}
                           </div>
                         )}
                         <div className="absolute inset-0 shadow-[inset_0_0_1rem_rgba(0,0,0,0.4)]" />
                         {isActive && (
                           <div className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-lg">
                             <Check className="w-2 h-2 text-slate-900" strokeWidth={5} />
                           </div>
                         )}
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-tight text-center truncate w-full mt-1">{b.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-[0.8vmin] w-full">
                {colors.map((cloth) => {
                  const isActive = value.toUpperCase() === cloth.value.toUpperCase();
                  return (
                    <button
                      key={cloth.value}
                      onClick={() => {
                        onChange(cloth.value);
                        onToggle(false);
                      }}
                      className={`flex flex-col gap-[0.4vmin] p-[0.6vmin] rounded-xl border transition-all active:scale-95 ${isActive ? 'bg-white/10 border-white' : 'bg-white/5 border-transparent hover:bg-white/10 shrink-0'}`}
                    >
                      <div 
                        className="w-full h-[1.75vh] sm:h-[7vh] rounded-lg shadow-inner flex items-center justify-center overflow-hidden relative"
                        style={{ backgroundColor: cloth.value }}
                      >
                         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#000 0.0625rem, transparent 0.0625rem)', backgroundSize: '0.4vh 0.4vh' }} />
                         <div className="absolute inset-0 shadow-[inset_0_0_1.25rem_rgba(0,0,0,0.3)]" />
                      </div>
                      <span className="text-[1vh] sm:text-[1.1vh] font-bold text-slate-400 uppercase tracking-tighter text-center truncate w-full">{cloth.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {pickerStyle === 'default' && colors && colors.length > 0 && (
              <div className="w-full space-y-[2%]">
                <p className="text-[3%] font-bold text-slate-500 uppercase tracking-widest text-center">Presets</p>
                <div className="flex flex-wrap justify-center gap-[1%]">
                  {colors.slice(0, 12).map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        onChange(c.value);
                        onToggle(false);
                      }}
                      className={`w-[8%] aspect-square rounded-full border-2 transition-all active:scale-90 ${value.toUpperCase() === c.value.toUpperCase() ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
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
