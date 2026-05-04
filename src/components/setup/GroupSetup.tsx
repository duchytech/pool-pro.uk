import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface GroupSetupProps {
  player1: any;
  player2: any;
  team1Roster: string[];
  team2Roster: string[];
  team1Players: string[];
  team2Players: string[];
  updateRosterData: (t1Roster: string[], t2Roster: string[]) => void;
  setTeam1Players: (players: string[]) => void;
  setTeam2Players: (players: string[]) => void;
  setSelectedMatchIndex: (index: number | null) => void;
  setPlayer1: React.Dispatch<React.SetStateAction<any>>;
  setPlayer2: React.Dispatch<React.SetStateAction<any>>;
  setMatchupSettings: React.Dispatch<React.SetStateAction<any>>;
  setCurrentMatchFrameDetails: (details: any[]) => void;
  setMatchStartTime: (time: number | null) => void;
  setView: (view: string) => void;
  handleOpenPicker: (team: number, type: 'singles' | 'doubles') => void;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  handleInputFocus: (e: React.FocusEvent<HTMLInputElement>, field: string) => void;
  getPlayerPref: (name: string, slot: 'p1' | 'p2') => any;
  groupSetup: any;
  setGroupSetup: React.Dispatch<React.SetStateAction<any>>;
  labelFontSize: string;
  playerEntryStyle: React.CSSProperties;
  teamEntryStyle: React.CSSProperties;
  deviceInfo: any;
  SLOT1_DEFAULTS: any;
  SLOT2_DEFAULTS: any;
  matchupSettings: any;
}

export const GroupSetup: React.FC<GroupSetupProps> = ({
  player1,
  player2,
  team1Roster,
  team2Roster,
  team1Players,
  team2Players,
  updateRosterData,
  setTeam1Players,
  setTeam2Players,
  setSelectedMatchIndex,
  setPlayer1,
  setPlayer2,
  setMatchupSettings,
  setCurrentMatchFrameDetails,
  setMatchStartTime,
  setView,
  handleOpenPicker,
  focusedField,
  setFocusedField,
  handleInputFocus,
  getPlayerPref,
  groupSetup,
  setGroupSetup,
  labelFontSize,
  playerEntryStyle,
  teamEntryStyle,
  deviceInfo,
  SLOT1_DEFAULTS,
  SLOT2_DEFAULTS,
  matchupSettings
}) => {
  const onStartQuickMatch = () => {
    if (!groupSetup.quickP1 || !groupSetup.quickP2) return;

    // 1. Auto-add to roster if not already there
    let nextT1Roster = [...team1Roster];
    let nextT2Roster = [...team2Roster];
    let changed = false;

    if (!team1Roster.includes(groupSetup.quickP1)) {
      nextT1Roster = [groupSetup.quickP1, ...team1Roster].filter(Boolean);
      changed = true;
    }
    if (!team2Roster.includes(groupSetup.quickP2)) {
      nextT2Roster = [groupSetup.quickP2, ...team2Roster].filter(Boolean);
      changed = true;
    }
    if (changed) {
      updateRosterData(nextT1Roster, nextT2Roster);
    }

    // 2. Check if this exact pair already exists in the table (any order)
    let existingIdx = -1;
    const maxExisting = Math.max(team1Players.length, team2Players.length);
    for (let i = 0; i < maxExisting; i++) {
      const p1 = team1Players[i];
      const p2 = team2Players[i];
      if ((p1 === groupSetup.quickP1 && p2 === groupSetup.quickP2) ||
          (p1 === groupSetup.quickP2 && p2 === groupSetup.quickP1)) {
        existingIdx = i;
        break;
      }
    }

    if (existingIdx !== -1) {
      // Already in table, just select and go
      setSelectedMatchIndex(existingIdx);
      const match = matchupSettings[existingIdx];
      
      const p1NameFound = team1Players[existingIdx] || '';
      const p2NameFound = team2Players[existingIdx] || '';
      const p1Prefs = getPlayerPref(p1NameFound, 'p1') || SLOT1_DEFAULTS;
      const p2Prefs = getPlayerPref(p2NameFound, 'p2') || SLOT2_DEFAULTS;
      
      const p1Data = { name: p1NameFound, score: match?.score1 || 0, ...p1Prefs };
      const p2Data = { name: p2NameFound, score: match?.score2 || 0, ...p2Prefs };
      
      setPlayer1((prev: any) => ({ ...prev, ...p1Data }));
      setPlayer2((prev: any) => ({ ...prev, ...p2Data }));
      
      setGroupSetup((prev: any) => ({ ...prev, quickP1: '', quickP2: '' }));
      setView('scoreboard');
      return;
    }

    // 3. New matchup, append to the end
    const newIdx = maxExisting;
    const nextT1Players = [...team1Players];
    const nextT2Players = [...team2Players];
    nextT1Players[newIdx] = groupSetup.quickP1;
    nextT2Players[newIdx] = groupSetup.quickP2;
    
    setTeam1Players(nextT1Players);
    setTeam2Players(nextT2Players);

    const p1Prefs = getPlayerPref(groupSetup.quickP1, 'p1') || SLOT1_DEFAULTS;
    const p2Prefs = getPlayerPref(groupSetup.quickP2, 'p2') || SLOT2_DEFAULTS;
    const p1Update = { name: groupSetup.quickP1, score: 0, ...p1Prefs };
    const p2Update = { name: groupSetup.quickP2, score: 0, ...p2Prefs };

    setMatchupSettings((prev: any) => ({
      ...prev,
      [newIdx]: {
        score1: 0,
        score2: 0,
        player1: p1Update,
        player2: p2Update,
        currentBreakPlayerId: 'none',
        isLive: true
      }
    }));

    setPlayer1((prev: any) => ({ ...prev, ...p1Update }));
    setPlayer2((prev: any) => ({ ...prev, ...p2Update }));
    setSelectedMatchIndex(newIdx);
    setCurrentMatchFrameDetails([]);
    setMatchStartTime(null);
    
    setGroupSetup((prev: any) => ({ ...prev, quickP1: '', quickP2: '' }));
    setView('scoreboard');
  };

  return (
    <div className="space-y-12">
      {/* Quick Match Entry */}
      <div className="grid grid-cols-2 gap-4 sm:gap-10">
        <div className="space-y-4">
          <label className="font-black uppercase tracking-widest text-center block text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player1.color }}>Player 1</label>
          <div className="relative group">
            <input 
              value={groupSetup.quickP1} 
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setGroupSetup((prev: any) => ({ ...prev, quickP1: val }));
              }}
              onFocus={(e) => handleInputFocus(e, 'p1-quick')}
              onBlur={() => {
                setFocusedField(null);
                const pref = getPlayerPref(groupSetup.quickP1, 'p1');
                setPlayer1((prev: any) => ({ ...prev, ...SLOT1_DEFAULTS, ...(pref || {}) }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && groupSetup.quickP1 && groupSetup.quickP2) {
                  onStartQuickMatch();
                }
              }}
              className="w-full bg-black border-2 rounded-2xl font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl text-center pr-10" 
              style={{ 
                ...teamEntryStyle, 
                borderColor: focusedField === 'p1-quick' ? player1.color : player1.color + '66',
                fontSize: '4vh'
              }}
              placeholder="NAME"
            />
            {groupSetup.quickP1 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button 
                  onClick={() => {
                    setGroupSetup((prev: any) => ({ ...prev, quickP1: '' }));
                    setPlayer1((prev: any) => ({ ...prev, name: '', score: 0 }));
                  }}
                  className="p-1 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <label className="font-black uppercase tracking-widest text-center block text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player2.color }}>Player 2</label>
          <div className="relative group">
            <input 
              value={groupSetup.quickP2} 
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setGroupSetup((prev: any) => ({ ...prev, quickP2: val }));
              }}
              onFocus={(e) => handleInputFocus(e, 'p2-quick')}
              onBlur={() => {
                setFocusedField(null);
                const pref = getPlayerPref(groupSetup.quickP2, 'p2');
                setPlayer2((prev: any) => ({ ...prev, ...SLOT2_DEFAULTS, ...(pref || {}) }));
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && groupSetup.quickP1 && groupSetup.quickP2) {
                  onStartQuickMatch();
                }
              }}
              className="w-full bg-black border-2 rounded-2xl font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl text-center pr-10" 
              style={{ 
                ...teamEntryStyle, 
                borderColor: focusedField === 'p2-quick' ? player2.color : player2.color + '66',
                fontSize: '4vh'
              }}
              placeholder="NAME"
            />
            {groupSetup.quickP2 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button 
                  onClick={() => {
                    setGroupSetup((prev: any) => ({ ...prev, quickP2: '' }));
                    setPlayer2((prev: any) => ({ ...prev, name: '', score: 0 }));
                  }}
                  className="p-1 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center -mt-6">
        <button 
          onClick={onStartQuickMatch}
          disabled={!groupSetup.quickP1 || !groupSetup.quickP2}
          className={`px-8 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all hover:scale-105 active:scale-95 shadow-xl ${(!groupSetup.quickP1 || !groupSetup.quickP2) ? 'opacity-50 grayscale' : ''}`}
          style={{ backgroundColor: player1.color, color: '#000' }}
        >
          Start Quick Match
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-10 pt-8 border-t border-white/5">
      {/* Side A Setup */}
      <div className="space-y-4 sm:space-y-8">
        <div className="space-y-3 sm:space-y-4">
          <label className="font-black uppercase tracking-widest text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player1.color }}>Players (Side A)</label>
          <div className="space-y-4 sm:space-y-6">
            {team1Roster.map((player, idx) => (
              <div key={idx} className="flex items-stretch gap-2 sm:gap-4 group">
                <div 
                  className="flex items-center justify-center font-black bg-black border-2 rounded-lg sm:rounded-xl aspect-square"
                  style={{ 
                    borderColor: player1.color + '33', 
                    color: player1.color,
                    fontSize: deviceInfo.isPhone ? '4vh' : '2.5vh',
                    minWidth: '2vw'
                  }}
                >
                  {idx + 1}
                </div>
                <div className="relative flex-1 group">
                  <input 
                    value={player}
                    autoFocus={idx === team1Roster.length - 1 && player === ''}
                    onChange={(e) => {
                      const newRoster = [...team1Roster];
                      newRoster[idx] = e.target.value.toUpperCase();
                      updateRosterData(newRoster, team2Roster);
                    }}
                    onFocus={(e) => handleInputFocus(e, `p1-${idx}`)}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateRosterData([...team1Roster, ''], team2Roster);
                      }
                    }}
                    className="w-full bg-black/50 border-2 rounded-xl sm:rounded-2xl pr-12 sm:pr-20 text-slate-100 focus:outline-none uppercase font-bold transition-all shadow-lg"
                    style={{ 
                      ...playerEntryStyle, 
                      borderColor: focusedField === `p1-${idx}` ? player1.color : player1.color + '66' 
                    }}
                    placeholder={`P${idx + 1}`}
                    readOnly={player.includes('/')}
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center pr-2 sm:pr-4">
                    <button 
                      onClick={() => {
                        const newRoster = team1Roster.filter((_, i) => i !== idx);
                        updateRosterData(newRoster, team2Roster);
                      }}
                      className="h-full px-1.5 sm:px-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-90"
                      title="Clear Player"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex flex-col gap-2">
               <button 
                 onClick={() => updateRosterData([...team1Roster, ''], team2Roster)}
                 className="w-full py-4 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                style={{ 
                  borderColor: player1.color + '44', 
                  color: player1.color,
                  backgroundColor: 'rgba(0,0,0,0.2)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                Add Player
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenPicker(1, 'singles')}
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-[0.625rem] font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                  style={{ 
                    borderColor: player1.color + '44', 
                    color: player1.color,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
                  Add Singles
                </button>
                <button 
                  onClick={() => handleOpenPicker(1, 'doubles')}
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-[0.625rem] font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                  style={{ 
                    borderColor: player1.color + '44', 
                    color: player1.color,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
                  Create Doubles
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side B Setup */}
      <div className="space-y-4 sm:space-y-8">
        <div className="space-y-3 sm:space-y-4">
          <label className="font-black uppercase tracking-widest text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player2.color }}>Players (Side B)</label>
          <div className="space-y-4 sm:space-y-6">
            {team2Roster.map((player, idx) => (
              <div key={idx} className="flex items-stretch gap-2 sm:gap-4 group">
                <div 
                  className="flex items-center justify-center font-black bg-black border-2 rounded-lg sm:rounded-xl aspect-square"
                  style={{ 
                    borderColor: player2.color + '33', 
                    color: player2.color,
                    fontSize: deviceInfo.isPhone ? '4vh' : '2.5vh',
                    minWidth: '2vw'
                  }}
                >
                  {idx + 1}
                </div>
                <div className="relative flex-1 group">
                  <input 
                    value={player}
                    autoFocus={idx === team2Roster.length - 1 && player === ''}
                    onChange={(e) => {
                      const newRoster = [...team2Roster];
                      newRoster[idx] = e.target.value.toUpperCase();
                      updateRosterData(team1Roster, newRoster);
                    }}
                    onFocus={(e) => handleInputFocus(e, `p2-${idx}`)}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateRosterData(team1Roster, [...team2Roster, '']);
                      }
                    }}
                    className="w-full bg-black/50 border-2 rounded-xl sm:rounded-2xl pr-12 sm:pr-20 text-slate-100 focus:outline-none uppercase font-bold transition-all shadow-lg"
                    style={{ 
                      ...playerEntryStyle, 
                      borderColor: focusedField === `p2-${idx}` ? player2.color : player2.color + '66' 
                    }}
                    placeholder={`P${idx + 1}`}
                    readOnly={player.includes('/')}
                  />
                  <div className="absolute right-0 top-0 h-full flex items-center pr-2 sm:pr-4">
                    <button 
                      onClick={() => {
                        const newRoster = team2Roster.filter((_, i) => i !== idx);
                        updateRosterData(team1Roster, newRoster);
                      }}
                      className="h-full px-1.5 sm:px-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
                      title="Clear Player"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-2">
               <button 
                onClick={() => updateRosterData(team1Roster, [...team2Roster, ''])}
                className="w-full py-4 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                style={{ 
                  borderColor: player2.color + '44', 
                  color: player2.color,
                  backgroundColor: 'rgba(0,0,0,0.2)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none group-hover:animate-shimmer" />
                <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                Add Player
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenPicker(2, 'singles')}
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-[0.625rem] font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                  style={{ 
                    borderColor: player2.color + '44', 
                    color: player2.color,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none group-hover:animate-shimmer" />
                  Add Singles
                </button>
                <button 
                  onClick={() => handleOpenPicker(2, 'doubles')}
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-[0.625rem] font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                  style={{ 
                    borderColor: player2.color + '44', 
                    color: player2.color,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none group-hover:animate-shimmer" />
                  Create Doubles
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
