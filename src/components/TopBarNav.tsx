import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Maximize, Minimize, Users, Settings } from 'lucide-react';
import { Player, DeviceInfo } from '../types';

interface TopBarNavProps {
  view: string;
  isNavVisible: boolean;
  deviceInfo: DeviceInfo;
  player1: Player;
  player2: Player;
  isLoaded: boolean;
  isShotClockEnabled: boolean;
  isMatchClockEnabled: boolean;
  currentTime: Date;
  toggleFullscreen: () => void;
  navigateToScoreboard: () => void;
  navigateToView: (view: any) => void;
  isFullscreen: boolean;
}

export const TopBarNav: React.FC<TopBarNavProps> = ({
  view,
  isNavVisible,
  deviceInfo,
  player1,
  player2,
  isLoaded,
  isShotClockEnabled,
  isMatchClockEnabled,
  currentTime,
  toggleFullscreen,
  navigateToScoreboard,
  navigateToView,
  isFullscreen
}) => {
  return (
    <motion.nav 
      initial={false}
      animate={{ 
        y: (view === 'scoreboard' && !isNavVisible && !deviceInfo.isDesktop) 
          ? (deviceInfo.isPhone ? '-15vh' : (deviceInfo.isTablet ? '-8vh' : '-10vh')) 
          : 0,
        opacity: 1
      }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed top-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl z-[50] flex items-center justify-between pl-[0.5vw] pr-[0.5vw] shadow-[0_0.4vh_3vh_rgba(0,0,0,0.5)] border-b border-white/5"
      style={{ 
        height: deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh')
      }}
    >
      <div className="flex items-center gap-[0.5vw] shrink-0">
        <Trophy 
          className="transition-all duration-500" 
          style={{ 
            stroke: 'url(#topbar-cup-gradient)',
            width: deviceInfo.isPhone ? '8.64vh' : (deviceInfo.isTablet ? '5.76vh' : '7.2vh'),
            height: deviceInfo.isPhone ? '8.64vh' : (deviceInfo.isTablet ? '5.76vh' : '7.2vh')
          }}
        />
        <h1 
          className={`transition-all duration-500 ${(isShotClockEnabled || isMatchClockEnabled) && deviceInfo.isPhone ? 'hidden' : ''} flex items-center`}
          style={{ 
            height: deviceInfo.isPhone ? '13.5vh' : (deviceInfo.isTablet ? '7.2vh' : '9vh'),
          }}
        >
          <span className="sr-only">Pool-Pro | Digital Pool Scoreboard & Tournament Manager</span>
          <svg 
            height="100%" 
            viewBox="0 0 210 40" 
            preserveAspectRatio="xMinYMid meet"
            className="w-auto overflow-visible"
          >
              <text 
                x="0" 
                y="32" 
                fill="url(#topbar-logo-gradient)"
                style={{ 
                  fontFamily: 'Inter, sans-serif', 
                  fontWeight: 900, 
                  fontSize: '2.2rem', 
                  letterSpacing: '-0.03em' 
                }}
              >
              P<tspan textLength="13" lengthAdjust="spacingAndGlyphs">o</tspan><tspan textLength="13" lengthAdjust="spacingAndGlyphs">o</tspan>l<tspan textLength="6" lengthAdjust="spacingAndGlyphs" dx="1">-</tspan><tspan dx="1">P</tspan>r<tspan textLength="13" lengthAdjust="spacingAndGlyphs">o</tspan>.uk
            </text>
          </svg>
        </h1>
      </div>

      {/* Centered Device Time */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 flex items-center pointer-events-none">
        {!deviceInfo.shouldHideDeviceTime && (
          <div 
            className="flex items-center justify-center px-1.5 sm:px-4 bg-black/40 border border-white/10 backdrop-blur-md pointer-events-auto shadow-2xl max-w-[25vw] sm:max-w-none"
            style={{ 
              height: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.8vh' : '8.5vh'),
              borderRadius: deviceInfo.isPhone ? '1.5vh' : '1.5vh'
            }}
          >
            <span 
              className="font-mono font-black text-white tracking-wider tabular-nums leading-none truncate"
              style={{
                fontSize: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.4vh' : '5.5vh')
              }}
            >
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-[1vw] shrink-0 ml-auto mr-[0.5vw]">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
          className="group flex items-center justify-center transition-all duration-300 border border-white/10 bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative touch-manipulation"
          style={{
            width: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            height: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            borderRadius: deviceInfo.isPhone ? '1.5vh' : '1.5vh'
          }}
        >
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          {isFullscreen ? 
            <Minimize 
              className="relative z-10 transition-transform group-hover:scale-110"
              style={{ 
                stroke: 'url(#topbar-cup-gradient)',
                width: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
                height: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
              }} 
            /> : 
            <Maximize 
              className="relative z-10 transition-transform group-hover:scale-110"
              style={{ 
                stroke: 'url(#topbar-cup-gradient)',
                width: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
                height: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
              }} 
            />
          }
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); navigateToScoreboard(); }}
          className={`group flex items-center justify-center transition-all duration-300 border ${view === 'scoreboard' ? 'border-white/30' : 'border-white/10'} bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative touch-manipulation`}
          style={{
            backgroundColor: view === 'scoreboard' ? `${player1.color}22` : undefined,
            width: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            height: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            borderRadius: deviceInfo.isPhone ? '1.5vh' : '1.5vh'
          }}
        >
          <div className={`absolute inset-0 transition-opacity ${view === 'scoreboard' ? 'opacity-20' : 'opacity-0'} group-hover:opacity-10`} style={{ backgroundColor: player1.color }} />
          <Trophy 
            className="relative z-10 transition-transform group-hover:scale-110"
            style={{ 
              stroke: 'url(#topbar-cup-gradient)',
              width: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
              height: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
            }} 
          />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); navigateToView('teams'); }}
          className={`group flex items-center justify-center transition-all duration-300 border ${view === 'teams' ? 'border-white/30' : 'border-white/10'} bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative touch-manipulation`}
          style={{
            backgroundColor: view === 'teams' ? `${player1.color}22` : undefined,
            width: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            height: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            borderRadius: deviceInfo.isPhone ? '1.5vh' : '1.5vh'
          }}
        >
          <div className={`absolute inset-0 transition-opacity ${view === 'teams' ? 'opacity-20' : 'opacity-0'} group-hover:opacity-10`} style={{ backgroundColor: player1.color }} />
          <Users 
            className="relative z-10 transition-transform group-hover:scale-110"
            style={{ 
              stroke: 'url(#topbar-cup-gradient)',
              width: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
              height: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
            }} 
          />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); navigateToView('settings'); }}
          className={`group flex items-center justify-center transition-all duration-300 border ${view === 'settings' ? 'border-white/30' : 'border-white/10'} bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative touch-manipulation`}
          style={{
            backgroundColor: view === 'settings' ? `${player2.color}22` : undefined,
            width: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            height: deviceInfo.isPhone ? '10vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
            borderRadius: deviceInfo.isPhone ? '1.5vh' : '1.5vh'
          }}
        >
          <div className={`absolute inset-0 transition-opacity ${view === 'settings' ? 'opacity-20' : 'opacity-0'} group-hover:opacity-10`} style={{ backgroundColor: player2.color }} />
          <Settings 
            className="relative z-10 transition-transform group-hover:scale-110"
            style={{ 
              stroke: 'url(#topbar-cup-gradient)',
              width: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
              height: deviceInfo.isPhone ? '6vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
            }} 
          />
        </button>
      </div>
    </motion.nav>
  );
};
