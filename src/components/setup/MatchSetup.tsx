import React from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';

interface MatchSetupProps {
  player1: any;
  player2: any;
  team1Name: string;
  team2Name: string;
  team1Roster: string[];
  team2Roster: string[];
  team1Players: string[];
  team2Players: string[];
  updateTeamData: (t1Name: string, t1Players: string[], t2Name: string, t2Players: string[]) => void;
  updateRosterData: (t1Roster: string[], t2Roster: string[]) => void;
  handleOpenPicker: (team: number, type: 'singles' | 'doubles') => void;
  focusedField: string | null;
  setFocusedField: (field: string | null) => void;
  handleInputFocus: (e: React.FocusEvent<HTMLInputElement>, field: string) => void;
  labelFontSize: string;
  teamEntryStyle: React.CSSProperties;
  playerEntryStyle: React.CSSProperties;
  deviceInfo: any;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({
  player1,
  player2,
  team1Name,
  team2Name,
  team1Roster,
  team2Roster,
  team1Players,
  team2Players,
  updateTeamData,
  updateRosterData,
  handleOpenPicker,
  focusedField,
  setFocusedField,
  handleInputFocus,
  labelFontSize,
  teamEntryStyle,
  playerEntryStyle,
  deviceInfo
}) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-10">
      {/* Team 1 Setup */}
      <div className="space-y-4 sm:space-y-8">
        <div className="space-y-2 sm:space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-black uppercase tracking-widest text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player1.color }}>Home Team Name</label>
            <Users className="w-[1.8vh] h-[1.8vh] sm:w-[1.5vw] sm:h-[1.5vw]" style={{ color: player1.color }} />
          </div>
          <input 
            value={team1Name} 
            onChange={(e) => updateTeamData(e.target.value.toUpperCase(), team1Players, team2Name, team2Players)}
            onFocus={(e) => handleInputFocus(e, 'team1')}
            onBlur={() => setFocusedField(null)}
            className="w-full bg-black border-2 rounded-xl sm:rounded-2xl font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl" 
            style={{ 
              ...teamEntryStyle, 
              borderColor: focusedField === 'team1' ? player1.color : player1.color + '66' 
            }}
            placeholder="TEAM 1"
          />
        </div>
        <div className="space-y-3 sm:space-y-4">
          <label className="font-black uppercase tracking-widest text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player1.color }}>Players</label>
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
                      <Trash2 className="w-[1.8vh] h-[1.8vh] sm:w-[1.5vw] sm:h-[1.5vw]" />
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
                <Plus className="w-[2.2vh] h-[2.2vh] sm:w-[2vw] sm:h-[2vw] transition-transform group-hover:rotate-90" />
                Add Player
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenPicker(1, 'singles')}
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                  style={{ 
                    borderColor: player1.color + '44', 
                    color: player1.color,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
                  Create Singles
                </button>
                <button 
                  onClick={() => handleOpenPicker(1, 'doubles')}
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
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

      {/* Team 2 Setup */}
      <div className="space-y-4 sm:space-y-8">
        <div className="space-y-2 sm:space-y-4">
          <div className="flex items-center justify-between">
            <label className="font-black uppercase tracking-widest text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player2.color }}>Away Team Name</label>
            <Users className="w-[1.8vh] h-[1.8vh] sm:w-[1.5vw] sm:h-[1.5vw]" style={{ color: player2.color }} />
          </div>
          <input 
            value={team2Name} 
            onChange={(e) => updateTeamData(team1Name, team1Players, e.target.value.toUpperCase(), team2Players)}
            onFocus={(e) => handleInputFocus(e, 'team2')}
            onBlur={() => setFocusedField(null)}
            className="w-full bg-black border-2 rounded-xl sm:rounded-2xl font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl" 
            style={{ 
              ...teamEntryStyle, 
              borderColor: focusedField === 'team2' ? player2.color : player2.color + '66' 
            }}
            placeholder="TEAM 2"
          />
        </div>
        <div className="space-y-3 sm:space-y-4">
          <label className="font-black uppercase tracking-widest text-[2.5vw] sm:text-xs" style={{ fontSize: labelFontSize, color: player2.color }}>Players</label>
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
                      <Trash2 className="w-[1.8vh] h-[1.8vh] sm:w-[1.5vw] sm:h-[1.5vw]" />
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
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                  style={{ 
                    borderColor: player2.color + '44', 
                    color: player2.color,
                    backgroundColor: 'rgba(0,0,0,0.2)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
                  Create Singles
                </button>
                <button 
                  onClick={() => handleOpenPicker(2, 'doubles')}
                  className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[2.2vw] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
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
  );
};
