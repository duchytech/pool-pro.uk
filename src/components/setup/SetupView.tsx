import React from 'react';
import { motion } from 'motion/react';
import { Share2, Download, Upload, GripVertical, Trash2, RotateCcw, FileText, Plus, Users, Glasses, Trophy } from 'lucide-react';
import { MatchSetup } from './MatchSetup';
import { GroupSetup } from './GroupSetup';

interface SetupViewProps {
  player1: any;
  player2: any;
  activeSetupTab: string;
  handleTabSwitch: (tab: any) => void;
  setShowExportMenu: (show: boolean) => void;
  uploadData: () => void;
  deviceInfo: any;
  isLoaded: boolean;
  team1Name: string;
  team2Name: string;
  team1Players: string[];
  setTeam1Players: React.Dispatch<React.SetStateAction<string[]>>;
  team2Players: string[];
  setTeam2Players: React.Dispatch<React.SetStateAction<string[]>>;
  team1Roster: string[];
  team2Roster: string[];
  updateTeamData: (t1Name: string, t1Players: string[], t2Name: string, t2Players: string[]) => void;
  updateRosterData: (t1Roster: string[], t2Roster: string[]) => void;
  handleOpenPicker: (team: number, type: 'singles' | 'doubles') => void;
  matchupSettings: any;
  setMatchupSettings: React.Dispatch<React.SetStateAction<any>>;
  selectedMatchIndex: number | null;
  setSelectedMatchIndex: (index: number | null) => void;
  selectTeamMatch: (index: number, skipNavigate?: boolean) => void;
  getMatchResult: (p1: string, p2: string, tab: string) => any;
  deleteMatchup: (idx: number) => void;
  clearMatchResult: (p1: string, p2: string, idx: number) => void;
  viewMatchDetails: (id: string) => void;
  setShowDeleteAllConfirm: (show: boolean) => void;
  selectedHistoryEntryId: string | null;
  setSelectedHistoryEntryId: (id: string | null) => void;
  matchHistory: any[];
  teamTotals: { t1: number; t2: number };
  formatTime: (time: number) => string;
  setShowRefereePicker: (state: any) => void;
  setShowClearTeamsConfirm: (show: boolean) => void;
  setShowTeamTotals: (show: boolean) => void;
  groupSetup: any;
  setGroupSetup: React.Dispatch<React.SetStateAction<any>>;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  handleInputFocus: (e: React.FocusEvent<HTMLInputElement>, field: string) => void;
  labelFontSize: string;
  teamEntryStyle: React.CSSProperties;
  playerEntryStyle: React.CSSProperties;
  currentMatchFrameDetails: any[];
  setCurrentMatchFrameDetails: (details: any[]) => void;
  setMatchStartTime: (time: number | null) => void;
  setPlayer1: React.Dispatch<React.SetStateAction<any>>;
  setPlayer2: React.Dispatch<React.SetStateAction<any>>;
  setView: (view: string) => void;
  getPlayerPref: (name: string, slot: 'p1' | 'p2') => any;
  SLOT1_DEFAULTS: any;
  SLOT2_DEFAULTS: any;
  sensors: any;
  handleDragEnd: (event: any) => void;
  persistentRefereeRegistry: any;
  isBreakTrackingEnabled: boolean;
  matchModeBreakSide: string;
}

export const SetupView: React.FC<SetupViewProps> = (props) => {
  const {
    player1,
    player2,
    activeSetupTab,
    handleTabSwitch,
    setShowExportMenu,
    uploadData,
    deviceInfo,
    team1Name,
    team2Name,
    team1Players,
    team2Players,
    matchupSettings,
    selectedMatchIndex,
    selectTeamMatch,
    getMatchResult,
    persistentRefereeRegistry,
    isBreakTrackingEnabled,
    matchModeBreakSide,
    sensors,
    handleDragEnd,
    labelFontSize
  } = props;

  const renderSetupTabs = () => (
    <div className="flex items-center justify-center w-[95vw] mx-auto gap-3 mb-10">
      {(['group', 'match']).map(tab => (
        <button
          key={tab}
          onClick={() => handleTabSwitch(tab)}
          className={`flex-1 py-3 sm:py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all text-[0.75rem] sm:text-sm border-2 relative overflow-hidden group shadow-lg ${
            activeSetupTab === tab 
              ? 'text-slate-950 scale-105 z-10 border-transparent shadow-[0_0_1.5vh_rgba(255,255,255,0.1)]' 
              : 'border-dashed bg-black/20 hover:bg-white/5 active:scale-[0.98]'
          }`}
          style={activeSetupTab === tab 
            ? { backgroundColor: player1.color } 
            : { borderColor: player1.color + '44', color: player1.color }
          }
        >
          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none ${
            activeSetupTab === tab ? 'animate-shimmer' : 'group-hover:animate-shimmer'
          }`} />
          {tab}
        </button>
      ))}
    </div>
  );

  return (
    <motion.div
      key="teams"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12 pb-10"
    >
      {/* Header */}
      <div 
        className="relative flex items-center justify-center pb-8 transition-all duration-500 mb-12 w-full"
        style={{ 
          borderBottom: '0.125rem solid',
          borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
        }}
      >
        <div className="space-y-1 text-center">
          <h2 className="font-black uppercase tracking-tight text-white text-3xl sm:text-5xl" style={{ fontSize: deviceInfo.titleSizes.page }}>Setup</h2>
        </div>
        <div className="absolute right-[2.5vw] bottom-[1vh] flex items-center gap-3">
          <button 
            onClick={() => setShowExportMenu(true)}
            className="flex items-center justify-between gap-5 px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all border-2 border-dashed relative overflow-hidden group shadow-lg active:scale-[0.98]"
            style={{ 
              borderColor: player1.color + '44',
              color: '#fff',
              backgroundColor: 'rgba(0,0,0,0.2)',
              minWidth: 'fit-content'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 relative z-10" />
            <Download className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 relative z-10" />
          </button>
          <button 
            onClick={uploadData}
            className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all font-bold text-[0.625rem] sm:text-sm border-2 border-dashed relative overflow-hidden group shadow-lg active:scale-[0.98]"
            style={{ 
              borderColor: player1.color + '44', 
              color: '#fff', 
              backgroundColor: 'rgba(0,0,0,0.2)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
            <Upload className="w-[0.75rem] h-[0.75rem] sm:w-[1rem] sm:h-[1rem] relative z-10" />
            <span className="relative z-10">Import</span>
          </button>
        </div>
      </div>

      {renderSetupTabs()}

      {/* Swappable Setup Components */}
      {activeSetupTab === 'match' && <MatchSetup {...props} />}
      {activeSetupTab === 'group' && (
        <GroupSetup 
          {...props} 
          setTeam1Players={props.setTeam1Players}
          setTeam2Players={props.setTeam2Players}
          setSelectedMatchIndex={props.setSelectedMatchIndex}
          setPlayer1={props.setPlayer1}
          setPlayer2={props.setPlayer2}
          setMatchupSettings={props.setMatchupSettings}
          setCurrentMatchFrameDetails={props.setCurrentMatchFrameDetails}
          setMatchStartTime={props.setMatchStartTime}
          setView={props.setView}
          getPlayerPref={props.getPlayerPref}
          SLOT1_DEFAULTS={props.SLOT1_DEFAULTS}
          SLOT2_DEFAULTS={props.SLOT2_DEFAULTS}
          matchupSettings={props.matchupSettings}
        />
      )}

      {/* Match Results Table */}
      <div id="matchups-table" className="space-y-8 pt-12 border-t-2" style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}>
        <h3 
          className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
          style={{ 
            borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
            color: 'white',
            fontSize: deviceInfo.titleSizes.section
          }}
        >
          Match Results
        </h3>
          <div className="bg-black border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
            <div className="w-full flex flex-col scrollbar-hide overflow-x-auto min-w-[40vw]">
              {/* Header Row */}
              <div className="flex items-center bg-slate-900/80 border-b-2 border-slate-800 font-black">
                <div className="hidden sm:flex px-[1vw] py-[2vh] text-[2vw] sm:text-xs lg:text-[0.85rem] uppercase tracking-[0.2em] text-slate-400 w-[6%] shrink-0 items-center">No.</div>
                
                {activeSetupTab === 'group' && (
                  <div className="flex px-[1vw] py-[2vh] text-slate-400 w-[8%] sm:w-[6%] shrink-0 items-center justify-center uppercase tracking-widest text-[1.5vw] sm:text-[0.625rem]">
                    Select
                  </div>
                )}
                
                <div className="flex px-[0.5vw] py-[2vh] text-[2vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-400 justify-center w-[12%] sm:w-[10%] shrink-0 items-center" title="Referee">Ref</div>
                
                <div className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-[0.85rem] uppercase tracking-widest flex-1 min-w-0 items-center truncate text-white">
                  <span>{activeSetupTab === 'group' ? 'SIDE A' : (team1Name || 'TEAM A')}</span>
                </div>
                <div className="flex px-[0.5vw] py-[2vh] text-[2.5vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-600 justify-center w-[8%] sm:w-[6%] shrink-0 items-center">VS</div>
                <div className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-[0.85rem] uppercase tracking-widest flex-1 min-w-0 items-center truncate text-white">
                  <span>{activeSetupTab === 'group' ? 'SIDE B' : (team2Name || 'TEAM B')}</span>
                </div>
                <div className="flex px-[1.5vw] py-[2vh] text-[2.5vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-400 w-[18%] sm:w-[12%] shrink-0 items-center">Result</div>
                <div className="flex px-[1vw] py-[2vh] text-[2.2vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-400 justify-end w-[13%] sm:w-[10%] shrink-0 items-center">Clear</div>
                <div className="hidden sm:flex px-[1.5vw] py-[2vh] text-[2vw] sm:text-xs lg:text-[0.85rem] uppercase tracking-widest text-slate-400 w-[12%] shrink-0 items-center">TIMERS</div>
              </div>

              {/* Body */}
              <div className="flex flex-col">
                {Math.max(team1Players.length, team2Players.length) === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-500 italic uppercase tracking-widest font-bold text-[3vw] sm:text-sm">Add players to generate matchups.</div>
                ) : (
                  <>
                        {Array.from({ length: Math.max(team1Players.length, team2Players.length) }).map((_, idx) => {
                          const p1 = team1Players[idx];
                          const p2 = team2Players[idx];
                          const p1Name = p1 || '';
                          const p2Name = p2 || '';
                          const matchup = matchupSettings[idx];
                          const lastMatch = getMatchResult(p1Name, p2Name, activeSetupTab);
                          const regKey = [p1Name.trim().toUpperCase(), p2Name.trim().toUpperCase()].sort().join(' VS ');
                          const autoRef = persistentRefereeRegistry[regKey];
                          const effectiveReferee = (matchup && matchup.hasOwnProperty('referee')) 
                                                  ? matchup.referee 
                                                  : (lastMatch && lastMatch.referee ? lastMatch.referee : autoRef);
                          
                          let displayScore: any = null;
                          if (selectedMatchIndex === idx) {
                            displayScore = { score1: props.player1.score, score2: props.player2.score, isLive: true };
                          } else if (matchup && (matchup.score1 !== undefined || matchup.score2 !== undefined || (matchup.frameDetails && matchup.frameDetails.length > 0))) {
                            displayScore = { score1: matchup.score1 || 0, score2: matchup.score2 || 0, isLive: matchup.isLive !== false };
                          }
                          
                          const rowBreaker = matchModeBreakSide === 'none' ? 'none' : ((idx % 2 === 0) ? matchModeBreakSide : (matchModeBreakSide === '1' ? '2' : '1'));

                          return (
                            <div key={idx} onClick={() => selectTeamMatch(idx)} className={`group flex items-center cursor-pointer transition-all border-b border-slate-800/30 font-bold last:border-0 hover:bg-emerald-500/5 ${activeSetupTab === 'group' && selectedMatchIndex === idx ? 'bg-emerald-500/10' : ''}`}>
                              <div className="hidden sm:flex px-[1vw] py-[2vh] text-[2vw] sm:text-xs font-black text-slate-600 w-[6%] shrink-0 items-center whitespace-nowrap">#{idx + 1}</div>
                              {activeSetupTab === 'group' && (
                                <div className="flex px-[1vw] py-[2vh] w-[8%] sm:w-[6%] shrink-0 items-center justify-center">
                                  <div onClick={(e) => { e.stopPropagation(); selectTeamMatch(idx, true); }} className={`w-[7vw] h-[7vw] sm:w-[3.5vw] sm:h-[3.5vw] rounded-full border-[0.3vh] sm:border-[0.2vh] transition-all flex items-center justify-center shrink-0 ${selectedMatchIndex === idx ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_1.5vw_rgba(16,185,129,0.3)]' : 'border-slate-700 hover:border-slate-500'}`}>
                                    {selectedMatchIndex === idx && <div className="w-[4.5vw] h-[4.5vw] sm:w-[2vw] sm:h-[2vw] rounded-full bg-emerald-500 shadow-[0_0_1.5vw_rgba(16,185,129,0.8)]" />}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex px-[0.5vw] py-[2vh] justify-center w-[12%] sm:w-[10%] shrink-0 items-center" onClick={(e) => { e.stopPropagation(); props.setShowRefereePicker({ isOpen: true, matchIndex: idx, side: '1' }); }}>
                                {effectiveReferee ? <span className="text-[3vw] sm:text-sm font-black text-amber-500 uppercase truncate">{effectiveReferee.name}</span> : <Glasses className="w-[6vw] h-[6vw] sm:w-[2.5vw] sm:h-[2.5vw] text-orange-500 animate-pulse drop-shadow-[0_0_0.8vw_rgba(249,115,22,0.6)]" />}
                              </div>

                              <div 
                                className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors flex-1 min-w-0 items-center overflow-hidden"
                                onClick={(e) => { e.stopPropagation(); selectTeamMatch(idx); }}
                              >
                                {isBreakTrackingEnabled && rowBreaker === '1' && (
                                  <div className="mr-2 shrink-0"><div className="w-[1vw] h-[1vw] rounded-full bg-white shadow-[0_0_0.8vw_white]" /></div>
                                )}
                                <span className={`truncate ${selectedMatchIndex === idx ? 'text-emerald-400' : ''}`}>{p1Name || <span className="text-slate-700 italic">EMPTY</span>}</span>
                              </div>
                              
                              <div className="flex px-[0.5vw] py-[2vh] text-center text-slate-700 font-black text-[2vw] sm:text-[0.625rem] justify-center w-[8%] sm:w-[6%] shrink-0 items-center">VS</div>

                              <div 
                                className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors flex-1 min-w-0 items-center overflow-hidden"
                                onClick={(e) => { e.stopPropagation(); selectTeamMatch(idx); }}
                              >
                                <span className={`truncate ${selectedMatchIndex === idx ? 'text-emerald-400' : ''}`}>{p2Name || <span className="text-slate-700 italic">EMPTY</span>}</span>
                                {isBreakTrackingEnabled && rowBreaker === '2' && (
                                  <div className="ml-2 shrink-0"><div className="w-[1vw] h-[1vw] rounded-full bg-white shadow-[0_0_0.8vw_white]" /></div>
                                )}
                              </div>

                              <div className="flex px-[1.5vw] py-[2vh] w-[18%] sm:w-[12%] shrink-0 items-center justify-end">
                                {displayScore ? (
                                  <div className="flex flex-col items-center gap-1 overflow-hidden w-full">
                                    <span className={`text-[2.5vw] sm:text-[0.625rem] font-black px-1.5 py-0.5 rounded transition-all tabular-nums ${displayScore.isLive ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                                      {displayScore.score1}-{displayScore.score2}
                                      {displayScore.isLive && <span className="ml-1 opacity-80">LIVE</span>}
                                    </span>
                                  </div>
                                ) : <span className="text-[2.5vw] sm:text-[0.625rem] text-slate-700 font-bold uppercase">READY</span>}
                              </div>
                              
                              <div className="flex px-[1vw] py-[2vh] justify-end w-[13%] sm:w-[10%] items-center">
                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                  <button onClick={(e) => { e.stopPropagation(); props.clearMatchResult(p1Name, p2Name, idx); }} className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg active:scale-90"><RotateCcw className="w-4 h-4" /></button>
                                  <button onClick={(e) => { e.stopPropagation(); props.deleteMatchup(idx); }} className="p-2 bg-red-700 hover:bg-red-600 text-white rounded-lg active:scale-90"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                              <div className="hidden sm:flex px-[1.5vw] py-[2vh] w-[12%] items-center overflow-hidden">
                                {lastMatch?.shotClockSetting && <span className="text-[0.625rem] font-bold text-slate-500">SHOT: {lastMatch.shotClockSetting}S</span>}
                              </div>
                            </div>
                          );
                        })}

                    {/* Footer Row Actions */}
                    <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex flex-wrap justify-center gap-4">
                      <button 
                        onClick={() => {
                          if (activeSetupTab === 'group') {
                            if (props.selectedHistoryEntryId) {
                               props.viewMatchDetails(props.selectedHistoryEntryId);
                            } else if (selectedMatchIndex !== null) {
                               props.viewMatchDetails(`live-${selectedMatchIndex}`);
                            }
                          } else {
                            props.viewMatchDetails('session');
                          }
                        }} 
                        disabled={activeSetupTab === 'group' && props.selectedHistoryEntryId === null && selectedMatchIndex === null}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl uppercase font-black text-xs transition-all ${
                          (activeSetupTab === 'group' && props.selectedHistoryEntryId === null && selectedMatchIndex === null) 
                            ? 'bg-slate-800 text-slate-600 grayscale cursor-not-allowed opacity-50' 
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 active:scale-95'
                        }`}
                      >
                        <FileText className="w-4 h-4" /> View Details
                      </button>
                      <button onClick={() => props.setShowDeleteAllConfirm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white uppercase font-black text-xs">
                        <Trash2 className="w-4 h-4" /> Delete All
                      </button>
                    </div>

                    {/* Totals Row */}
                    <div className="flex items-center bg-slate-900/80 border-t-2 border-slate-800 font-black">
                      <div className="flex px-[1.5vw] py-[2vh] w-[27%] sm:w-[22%] items-center flex-col">
                        <span className="text-xl sm:text-3xl text-emerald-400 tabular-nums">{props.teamTotals.t1}</span>
                        <span className="text-[1.4vw] sm:text-[0.625rem] text-slate-500 uppercase">{activeSetupTab === 'group' ? 'SIDE A' : (team1Name || 'TEAM A')}</span>
                      </div>
                      <div className="flex px-[0.5vw] py-[2vh] text-center text-slate-700 flex-1 justify-center">SUM</div>
                      <div className="flex px-[1.5vw] py-[2vh] w-[27%] sm:w-[22%] items-center flex-col">
                        <span className="text-xl sm:text-3xl text-emerald-400 tabular-nums">{props.teamTotals.t2}</span>
                        <span className="text-[1.4vw] sm:text-[0.625rem] text-slate-500 uppercase">{activeSetupTab === 'group' ? 'SIDE B' : (team2Name || 'TEAM B')}</span>
                      </div>
                      <div className="flex px-[1.5vw] py-[2vh] justify-end w-[10%] sm:w-[15%] items-center">
                        <button 
                          onClick={() => props.setShowTeamTotals(true)}
                          className="inline-flex w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-emerald-500/10 items-center justify-center border border-emerald-500/20 shrink-0 active:scale-95 transition-all hover:bg-emerald-500/20"
                        >
                          <Trophy className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400" style={{ transform: 'scale(1.4)' }} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <button 
                onClick={() => props.setShowClearTeamsConfirm(true)}
                className="flex items-center gap-3 px-8 py-4 text-sm sm:text-base font-black uppercase tracking-[0.2em] rounded-2xl transition-all border-2 group hover:scale-105 active:scale-95 shadow-2xl"
                style={{ 
                  borderColor: player2.color + '44',
                  color: player2.color,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(1vh)'
                }}
              >
                <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                {activeSetupTab === 'match' ? 'Clear Team Data' : 'Clear Player Data'}
              </button>
            </div>
          </div>
      </div>
    </motion.div>
  );
};
