import React from 'react';
import { Clock, Glasses } from 'lucide-react';
import { MatchHistoryEntry } from '../types';

interface MatchMatchDetailsTableProps {
  match: MatchHistoryEntry;
  player1Color: string;
  player2Color: string;
}

export const MatchMatchDetailsTable: React.FC<MatchMatchDetailsTableProps> = ({
  match,
  player1Color,
  player2Color
}) => {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/50 shadow-2xl bg-black/40 backdrop-blur-3xl">
      <div className="w-full flex flex-col scrollbar-hide overflow-x-auto min-w-[50vw]">
        {/* Header Row */}
        <div className="flex items-center bg-slate-900/80 border-b-2 border-slate-800/50">
          <div className="flex pl-[2vw] pr-0 sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.2vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[6%] whitespace-nowrap items-center">#</div>
          <div className="flex px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[12%] justify-center items-center">Ref</div>
          <div className="flex px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[16%] items-center">Breaker</div>
          <div className="flex px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[18%] items-center">Winner</div>
          <div className="flex px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[10%] justify-center items-center">Score</div>
          <div className="flex px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[15%] justify-center items-center">Start</div>
          <div className="flex px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[15%] justify-center items-center whitespace-nowrap">Finish</div>
          <div className="flex px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-sm lg:text-[0.85rem] uppercase tracking-widest font-black text-slate-500 w-[8%] justify-end pr-[2vw] items-center">Dur.</div>
        </div>

        {/* Body */}
        <div className="flex flex-col divide-y divide-slate-800/30">
          {match.frameDetails && match.frameDetails.length > 0 ? match.frameDetails.map((frame, fidx) => (
            <div key={fidx} className="flex items-center hover:bg-emerald-500/5 transition-colors group">
              <div className="flex pl-[2vw] pr-0 sm:px-5 py-[2vh] text-[2.2vw] sm:text-sm lg:text-base font-black text-slate-600 group-hover:text-emerald-500 transition-colors whitespace-nowrap w-[6%] items-center">#{frame.frameNumber}</div>
              
              <div className="flex px-[1vw] sm:px-5 py-[2vh] justify-center w-[12%] items-center">
                <span className="text-[1.8vw] sm:text-sm font-black text-amber-500 uppercase truncate text-center">
                  {frame.referee?.name || match.referee?.name || '-'}
                </span>
              </div>

              <div className="flex px-[1vw] sm:px-5 py-[2vh] w-[16%] items-center overflow-hidden">
                {frame.breakerName && frame.breakerName.includes('/') ? (
                  <div className="flex flex-col">
                    <span className="text-[2vw] sm:text-sm font-bold text-slate-300 uppercase tracking-tight truncate block leading-none">{frame.breakerName.split('/')[0].trim()}</span>
                    <span className="text-[2vw] sm:text-xs font-bold text-slate-500 uppercase tracking-tight truncate block leading-none mt-1">{frame.breakerName.split('/')[1].trim()}</span>
                  </div>
                ) : (
                  <span className="text-[2.2vw] sm:text-sm lg:text-base font-bold text-slate-300 uppercase tracking-tight truncate block">{frame.breakerName}</span>
                )}
              </div>
              <div className="flex px-[1vw] sm:px-5 py-[2vh] w-[18%] items-center overflow-hidden">
                <div className="flex items-center gap-[0.5vw] sm:gap-2 truncate">
                  <div className="w-[0.8vw] sm:w-[1.2vw] h-[0.8vw] sm:h-[1.2vw] rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  {frame.winnerName && frame.winnerName.includes('/') ? (
                    <div className="flex flex-col">
                      <span className="text-[2vw] sm:text-sm font-black text-emerald-400 uppercase tracking-tight truncate leading-none">{frame.winnerName.split('/')[0].trim()}</span>
                      <span className="text-[2vw] sm:text-xs font-black text-emerald-600 uppercase tracking-tight truncate leading-none mt-1">{frame.winnerName.split('/')[1].trim()}</span>
                    </div>
                  ) : (
                    <span className="text-[2.2vw] sm:text-sm lg:text-base font-black text-emerald-400 uppercase tracking-tight truncate">{frame.winnerName}</span>
                  )}
                </div>
              </div>

              <div className="flex px-[0.5vw] sm:px-5 py-[2vh] font-mono text-[2.2vw] sm:text-lg lg:text-xl text-slate-500 font-bold tabular-nums whitespace-nowrap justify-center w-[10%] items-center">
                {frame.score1}<span className="text-slate-700 mx-[0.2vw] sm:mx-1">-</span>{frame.score2}
              </div>
              <div className="flex px-[0.5vw] sm:px-5 py-[2vh] justify-center w-[15%] items-center">
                <span className="text-[1.8vw] sm:text-sm font-black text-slate-500 tabular-nums whitespace-nowrap">
                  {frame.startTime ? new Date(frame.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : (frame.duration ? new Date(new Date(frame.timestamp).getTime() - (frame.duration * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-')}
                </span>
              </div>
              <div className="flex px-[0.5vw] sm:px-5 py-[2vh] justify-center w-[15%] items-center">
                <span className="text-[1.8vw] sm:text-sm font-black text-slate-400 tabular-nums whitespace-nowrap">
                  {new Date(frame.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <div className="flex px-[1vw] sm:px-5 py-[2vh] justify-end w-[8%] pr-[2vw] items-center">
                {frame.duration !== undefined && (
                  <div className="flex items-center justify-end gap-[0.5vw] sm:gap-1 mt-0.5">
                    <Clock className="w-[2vw] sm:w-[1.5vw] h-[2vw] sm:h-[1.5vw] text-slate-700 font-bold" />
                    <span className="text-[2vw] sm:text-sm font-black text-slate-500 uppercase tabular-nums whitespace-nowrap">
                      {(() => {
                        const h = Math.floor(frame.duration / 3600);
                        const m = Math.floor((frame.duration % 3600) / 60);
                        const s = frame.duration % 60;
                        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                        return `${m}:${String(s).padStart(2, '0')}`;
                      })()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <div className="px-[2vw] py-[8vh] text-center text-slate-600 italic font-medium uppercase tracking-[0.2em] text-[1.8vw]">No detailed frame data available.</div>
          )}
        </div>

        {/* Totals Section */}
        {match.frameDetails && match.frameDetails.length > 0 && (
          <div className="bg-slate-900/60 border-t-2 border-slate-800/50 px-[2vw] py-[2vh] sm:py-[3vh] min-h-[8vh] flex items-center relative">
            <div className="flex items-center gap-[2vw]">
              <span className="text-[2.2vw] sm:text-sm font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Totals</span>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center font-mono text-[4.5vw] sm:text-3xl font-black tabular-nums">
              <span style={{ color: player1Color }}>{match.score1}</span>
              <span className="text-slate-700 mx-[1vw] sm:mx-3">-</span>
              <span style={{ color: player2Color }}>{match.score2}</span>
            </div>

            <div className="flex flex-col items-end ml-auto">
              <span className="text-[1.8vw] sm:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Total Duration</span>
              <span className="text-[2.5vw] sm:text-lg font-black text-white tabular-nums">
                {(() => {
                  const totalSec = match.frameDetails!.reduce((acc, f) => acc + (f.duration || 0), 0);
                  const h = Math.floor(totalSec / 3600);
                  const m = Math.floor((totalSec % 3600) / 60);
                  const s = totalSec % 60;
                  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                })()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
