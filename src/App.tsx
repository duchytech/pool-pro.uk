import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Trophy, 
  Settings, 
  Timer, 
  RotateCcw, 
  User, 
  Play, 
  Pause, 
  Plus, 
  Minus, 
  Trash2,
  Circle,
  Palette,
  Maximize,
  Minimize,
  Layout,
  Users,
  Download,
  Upload,
  X,
  PlusCircle,
  Share2,
  Server,
  Zap,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, MatchHistoryEntry, MatchupSettings } from './types';
import { THEME_COLORS, BACKGROUND_COLORS } from './constants';
import { ColorPicker } from './components/ColorPicker';

const SHOT_CLOCK_DEFAULT = 30;

export default function App() {
  // --- State ---
  const [player1, setPlayer1] = useState<Player>({ id: '1', name: '', score: 0, isTurn: true, color: '#FFFF33', bgColor: '#000000', screenColor: '#000000' });
  const [player2, setPlayer2] = useState<Player>({ id: '2', name: '', score: 0, isTurn: false, color: '#FF001C', bgColor: '#000000', screenColor: '#000000' });
  const [matchupSettings, setMatchupSettings] = useState<Record<number, MatchupSettings>>({});
  const [playerPreferences, setPlayerPreferences] = useState<Record<string, { color: string, bgColor: string, screenColor: string }>>({});
  const [team1Name, setTeam1Name] = useState<string>('');
  const [team2Name, setTeam2Name] = useState<string>('');
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [view, setView] = useState<'scoreboard' | 'history' | 'settings' | 'teams'>('scoreboard');
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const isKeyboardOpenRef = useRef(false);
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768 
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Robust device detection based on User-Agent and screen width
  const deviceInfo = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isTabletUA = ua.includes("ipad") || (ua.includes("android") && !ua.includes("mobile"));
    
    // We prioritize window width for scaling tiers to ensure the user's specific test sizes are hit.
    // Tablet range now goes up to 1400px to accommodate the user's 1380px test environment.
    const isPhone = windowSize.width < 640;
    const isTablet = windowSize.width >= 640 && windowSize.width < 1400; 
    const isDesktop = windowSize.width >= 1400;
    const isLandscape = windowSize.width > windowSize.height;

    return { isPhone, isTablet, isDesktop, isLandscape };
  }, [windowSize.width, windowSize.height]); 

  // Calculate shared font size for team names to occupy 95% of vertical space
  const sharedTeamNameFontSize = useMemo(() => {
    const topBarHeight = (deviceInfo.isPhone && !isNavVisible) ? 0 : (deviceInfo.isPhone ? 56 : (deviceInfo.isTablet ? 80 : 112));
    const availableHeight = windowSize.height - topBarHeight;
    const targetHeight = availableHeight * 0.95;
    
    const getFontSize = (name: string) => {
      const len = Math.max(1, name.length);
      // Scaling: 1.1x for mobile, 1.2x for others as requested
      const scale = deviceInfo.isPhone ? 1.1 : 1.2;
      return (targetHeight * scale) / len;
    };

    const fs1 = getFontSize(team1Name);
    const fs2 = getFontSize(team2Name);
    const shared = Math.min(fs1, fs2);

    // Physical constraint: sidebar width
    const sidebarWidth = deviceInfo.isPhone ? 48 : (deviceInfo.isTablet ? 80 : 120);
    // Adjust maximum font size slightly based on device
    const maxFs = sidebarWidth * (deviceInfo.isPhone ? 1.0 : 1.05);

    return Math.min(shared, maxFs);
  }, [windowSize.height, team1Name, team2Name, deviceInfo, isNavVisible]);

  const sharedPlayerNameFontSize = useMemo(() => {
    // Precise width calculations to match the UI padding/gaps
    const sidebarWidth = deviceInfo.isPhone ? 48 : (deviceInfo.isTablet ? 80 : 120);
    const mainPadding = deviceInfo.isPhone ? 32 : (deviceInfo.isTablet ? 48 : 48);
    const cardPadding = deviceInfo.isPhone ? 16 : (deviceInfo.isTablet ? 32 : 48);
    
    // totalAvailableWidth is the space between the two sidebars
    const totalAvailableWidth = windowSize.width - (sidebarWidth * 2) - mainPadding;
    
    let cardWidth;
    if (deviceInfo.isLandscape) {
      // 2 columns, gap of 12-20px
      const gap = deviceInfo.isPhone ? 12 : 16;
      cardWidth = (totalAvailableWidth - gap) / 2;
    } else {
      // 1 column (usually mobile portrait)
      cardWidth = totalAvailableWidth;
    }
    
    // Usable width inside the card - conservative for phone/desktop, huge for tablet
    const usableWidthMultiplier = deviceInfo.isPhone ? 0.65 : (deviceInfo.isDesktop ? 0.82 : 0.98);
    const usableWidth = (cardWidth - cardPadding) * usableWidthMultiplier;

    const getFontSize = (name: string) => {
      const len = Math.max(1, (name || "PLAYER 1").length);
      // Applying another 20% reduction (Buffer * 1.25)
      // Mobile: 2.50 * 1.25 = 3.125. Tablet: 0.60 * 1.25 = 0.75.
      const bufferFactor = deviceInfo.isPhone ? 3.125 : (deviceInfo.isDesktop ? 0.85 : 0.75);
      return usableWidth / (len * bufferFactor);
    };

    const fs1 = getFontSize(player1.name);
    const fs2 = getFontSize(player2.name);
    const shared = Math.min(fs1, fs2);

    // Caps reduced by another 20%: Tablet 80->64. Phone 10->8.
    const maxFs = deviceInfo.isPhone ? 8 : (deviceInfo.isTablet ? 64 : 60);
    const minFs = deviceInfo.isPhone ? 6 : 12;

    return Math.max(minFs, Math.min(shared, maxFs));
  }, [windowSize.width, player1.name, player2.name, deviceInfo]);

  // Keyboard detection for mobile
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsKeyboardOpen(true);
        isKeyboardOpenRef.current = true;
        setIsNavVisible(false);
      }
    };

    const handleFocusOut = () => {
      setIsKeyboardOpen(false);
      isKeyboardOpenRef.current = false;
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Unified Navigation Logic
  useEffect(() => {
    // Keep nav visible unless keyboard is open
    if (isKeyboardOpen) {
      if (isNavVisible) setIsNavVisible(false);
    } else {
      if (!isNavVisible) setIsNavVisible(true);
    }
  }, [isKeyboardOpen, isNavVisible]);

  const hasScrolledTeamsRef = useRef(false);
  // Auto-scroll to matchups table when navigating to teams view if players exist
  useEffect(() => {
    // Reset the scroll lock when we leave the teams view
    if (view !== 'teams') {
      hasScrolledTeamsRef.current = false;
      return;
    }

    // Attempt scroll if we are in teams view, haven't scrolled yet in this session, 
    // there is data to scroll to, and the keyboard isn't blocking us.
    if (!hasScrolledTeamsRef.current && 
        (team1Players.length > 0 || team2Players.length > 0) && 
        !isKeyboardOpen) {
      
      const scrollHandler = () => {
        // Double check keyboard state in the async handler using Ref to get latest value
        if (isKeyboardOpenRef.current) return;
        
        const table = document.getElementById('matchups-table');
        if (table) {
          const headerHeight = deviceInfo.isPhone ? 56 : (deviceInfo.isTablet ? 80 : 112);
          const elementPosition = table.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerHeight - 24; // 24px extra buffer for breathing room

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Mark as scrolled so we don't trigger again for this entry session
          hasScrolledTeamsRef.current = true;
        }
      };

      // Try multiple times to catch the render after animations
      const timer1 = setTimeout(scrollHandler, 100);
      const timer2 = setTimeout(scrollHandler, 400);
      const timer3 = setTimeout(scrollHandler, 800);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [view, team1Players.length, team2Players.length, isKeyboardOpen, deviceInfo]);

  const [activePicker, setActivePicker] = useState<string | null>(null);
  const [shotClock, setShotClock] = useState(SHOT_CLOCK_DEFAULT);
  const [shotClockDuration, setShotClockDuration] = useState(SHOT_CLOCK_DEFAULT);
  const [isShotClockEnabled, setIsShotClockEnabled] = useState(false);
  const [matchClock, setMatchClock] = useState(600);
  const [matchClockDuration, setMatchClockDuration] = useState(600);
  const [isMatchClockEnabled, setIsMatchClockEnabled] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEditingNames, setIsEditingNames] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClearTeamsConfirm, setShowClearTeamsConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [showTeamTotals, setShowTeamTotals] = useState(false);
  const [showRestoreDefaultsConfirm, setShowRestoreDefaultsConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMethod, setExportMethod] = useState<'download' | 'share' | 'server'>('download');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportEmail, setExportEmail] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);

  const [apiConfig, setApiConfig] = useState({ url: '', key: '' });
  const [isApiLocked, setIsApiLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [isApiSending, setIsApiSending] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showDeviceTime, setShowDeviceTime] = useState(true);
  const [deviceTimePosition, setDeviceTimePosition] = useState<{ x: number, y: number } | null>(null);
  const [matchClockPosition, setMatchClockPosition] = useState<{ x: number, y: number } | null>(null);
  const [shotClockPosition, setShotClockPosition] = useState<{ x: number, y: number } | null>(null);
  const [finishButtonPosition, setFinishButtonPosition] = useState<{ x: number, y: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const clockRef = useRef<HTMLDivElement>(null);
  const matchClockRef = useRef<HTMLDivElement>(null);
  const shotClockRef = useRef<HTMLDivElement>(null);
  const finishButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Refs ---
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMatchResult = (p1: string, p2: string) => {
    if (!p1 || !p2) return null;
    return matchHistory.find(m => 
      (m.player1 === p1 && m.player2 === p2) || 
      (m.player1 === p2 && m.player2 === p1)
    );
  };

  const teamTotals = useMemo(() => {
    let t1 = 0;
    let t2 = 0;
    const maxMatches = Math.max(team1Players.length, team2Players.length);
    
    for (let i = 0; i < maxMatches; i++) {
      const p1Name = team1Players[i] || `PLAYER ${i + 1}`;
      const p2Name = team2Players[i] || `PLAYER ${i + 1}`;
      
      if (selectedMatchIndex === i) {
        t1 += player1.score;
        t2 += player2.score;
      } else {
        const match = getMatchResult(p1Name, p2Name);
        if (match) {
          if (match.player1 === p1Name) {
            t1 += match.score1;
            t2 += match.score2;
          } else {
            t1 += match.score2;
            t2 += match.score1;
          }
        }
      }
    }
    return { t1, t2 };
  }, [team1Players, team2Players, matchHistory, selectedMatchIndex, player1.score, player2.score]);

  // --- Initialization ---
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('pool_app_state');
      const state = savedState ? JSON.parse(savedState) : {};
      
      // Helper to get legacy or state value
      const getVal = (key: string, stateVal: any, legacyKey: string) => {
        return stateVal !== undefined ? stateVal : (localStorage.getItem(legacyKey) || undefined);
      };

      // Load Team Data
      const t1Name = getVal('team1Name', state.teamData?.team1Name, 'pool_team1_name');
      const t2Name = getVal('team2Name', state.teamData?.team2Name, 'pool_team2_name');
      if (t1Name !== undefined) setTeam1Name(t1Name);
      if (t2Name !== undefined) setTeam2Name(t2Name);

      const t1Players = state.teamData?.team1Players || JSON.parse(localStorage.getItem('pool_team1_players') || 'null');
      const t2Players = state.teamData?.team2Players || JSON.parse(localStorage.getItem('pool_team2_players') || 'null');
      if (t1Players) setTeam1Players(t1Players);
      if (t2Players) setTeam2Players(t2Players);

      // Load Game Data
      const history = state.gameData?.matchHistory || JSON.parse(localStorage.getItem('pool_match_history') || 'null');
      if (history) setMatchHistory(history);
      
      if (state.gameData?.selectedMatchIndex !== undefined) setSelectedMatchIndex(state.gameData.selectedMatchIndex);
      if (state.gameData?.shotClock !== undefined) setShotClock(state.gameData.shotClock);
      if (state.gameData?.matchClock !== undefined) setMatchClock(state.gameData.matchClock);
      if (state.gameData?.player1Score !== undefined) setPlayer1(prev => ({ ...prev, score: state.gameData.player1Score }));
      if (state.gameData?.player2Score !== undefined) setPlayer2(prev => ({ ...prev, score: state.gameData.player2Score }));

      // Load User Preferences
      if (state.userPreferences) {
        if (state.userPreferences.shotClockDuration !== undefined) setShotClockDuration(state.userPreferences.shotClockDuration);
        if (state.userPreferences.isShotClockEnabled !== undefined) setIsShotClockEnabled(state.userPreferences.isShotClockEnabled);
        if (state.userPreferences.matchClockDuration !== undefined) setMatchClockDuration(state.userPreferences.matchClockDuration);
        if (state.userPreferences.isMatchClockEnabled !== undefined) setIsMatchClockEnabled(state.userPreferences.isMatchClockEnabled);
        
        if (state.userPreferences.player1) {
          setPlayer1(prev => ({ 
            ...prev, 
            ...state.userPreferences.player1,
            color: state.userPreferences.player1.borderColor || state.userPreferences.player1.color || prev.color
          }));
        }
        if (state.userPreferences.player2) {
          setPlayer2(prev => ({ 
            ...prev, 
            ...state.userPreferences.player2,
            color: state.userPreferences.player2.borderColor || state.userPreferences.player2.color || prev.color
          }));
        }
      } else {
        // Legacy Player Settings
        const p1Settings = JSON.parse(localStorage.getItem('pool_player1_settings') || 'null');
        const p2Settings = JSON.parse(localStorage.getItem('pool_player2_settings') || 'null');
        if (p1Settings) setPlayer1(p1Settings);
        if (p2Settings) setPlayer2(p2Settings);
      }

      // Load Other Data
      if (state.matchupSettings) setMatchupSettings(state.matchupSettings);
      if (state.playerPreferences) setPlayerPreferences(state.playerPreferences);
      if (state.apiConfig) setApiConfig(state.apiConfig);
      
      if (state.userPreferences?.showDeviceTime !== undefined) setShowDeviceTime(state.userPreferences.showDeviceTime);
      if (state.userPreferences?.deviceTimePosition !== undefined) setDeviceTimePosition(state.userPreferences.deviceTimePosition);
      if (state.userPreferences?.matchClockPosition !== undefined) setMatchClockPosition(state.userPreferences.matchClockPosition);
      if (state.userPreferences?.shotClockPosition !== undefined) setShotClockPosition(state.userPreferences.shotClockPosition);
      if (state.userPreferences?.finishButtonPosition !== undefined) setFinishButtonPosition(state.userPreferences.finishButtonPosition);

      // Finalize loading
      setTimeout(() => setIsLoaded(true), 100);
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      setIsLoaded(true);
    }
  }, []);

  // --- Persistence (Single JSON Source) ---
  useEffect(() => {
    if (!isLoaded) return;

    const state = {
      teamData: { team1Name, team2Name, team1Players, team2Players },
      gameData: { 
        matchHistory, 
        player1Score: player1.score, 
        player2Score: player2.score, 
        selectedMatchIndex, 
        shotClock, 
        matchClock 
      },
      userPreferences: {
        player1: { 
          name: player1.name, 
          borderColor: player1.color,
          bgColor: player1.bgColor,
          screenColor: player1.screenColor
        },
        player2: { 
          name: player2.name, 
          borderColor: player2.color,
          bgColor: player2.bgColor,
          screenColor: player2.screenColor
        },
        shotClockDuration,
        isShotClockEnabled,
        matchClockDuration,
        isMatchClockEnabled,
        showDeviceTime,
        deviceTimePosition,
        matchClockPosition,
        shotClockPosition,
        finishButtonPosition
      },
      matchupSettings,
      playerPreferences,
      apiConfig
    };
    localStorage.setItem('pool_app_state', JSON.stringify(state));
  }, [
    isLoaded,
    team1Name, team2Name, team1Players, team2Players,
    matchHistory, player1, player2, selectedMatchIndex, shotClock, matchClock,
    shotClockDuration, isShotClockEnabled, matchClockDuration, isMatchClockEnabled,
    showDeviceTime, deviceTimePosition, matchClockPosition, shotClockPosition, finishButtonPosition,
    matchupSettings, playerPreferences, apiConfig
  ]);

  // Sync current player preferences when they change
  useEffect(() => {
    if (selectedMatchIndex !== null) {
      setMatchupSettings(prev => ({
        ...prev,
        [selectedMatchIndex]: {
          player1: { color: player1.color, bgColor: player1.bgColor, screenColor: player1.screenColor },
          player2: { color: player2.color, bgColor: player2.bgColor, screenColor: player2.screenColor }
        }
      }));
    }

    // Always sync player colors to playerPreferences if they have names
    if (player1.name) {
      setPlayerPreferences(prev => ({
        ...prev,
        [player1.name]: { color: player1.color, bgColor: player1.bgColor, screenColor: player1.screenColor }
      }));
    }
    if (player2.name) {
      setPlayerPreferences(prev => ({
        ...prev,
        [player2.name]: { color: player2.color, bgColor: player2.bgColor, screenColor: player2.screenColor }
      }));
    }
  }, [
    selectedMatchIndex, 
    player1.name, player1.color, player1.bgColor, player1.screenColor,
    player2.name, player2.color, player2.bgColor, player2.screenColor
  ]);

  // Load player preferences when names change (e.g. typed in scoreboard)
  useEffect(() => {
    if (player1.name && playerPreferences[player1.name]) {
      const pref = playerPreferences[player1.name];
      setPlayer1(prev => ({
        ...prev,
        color: pref.color,
        bgColor: pref.bgColor,
        screenColor: pref.screenColor
      }));
    }
  }, [player1.name]);

  useEffect(() => {
    if (player2.name && playerPreferences[player2.name]) {
      const pref = playerPreferences[player2.name];
      setPlayer2(prev => ({
        ...prev,
        color: pref.color,
        bgColor: pref.bgColor,
        screenColor: pref.screenColor
      }));
    }
  }, [player2.name]);

  // --- Timer Logic ---
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTimerRunning(true);
    timerRef.current = setInterval(() => {
      if (isShotClockEnabled) {
        setShotClock((prev) => Math.max(0, prev - 1));
      }
      if (isMatchClockEnabled) {
        setMatchClock((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
  }, [isShotClockEnabled, isMatchClockEnabled]);

  const pauseTimer = useCallback(() => {
    setIsTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      const shotClockFinished = isShotClockEnabled && shotClock === 0;
      const matchClockFinished = isMatchClockEnabled && matchClock === 0;
      
      if (shotClockFinished || matchClockFinished) {
        pauseTimer();
      }
    }
  }, [shotClock, matchClock, isTimerRunning, isShotClockEnabled, isMatchClockEnabled, pauseTimer]);

  const resetTimer = useCallback(() => {
    setShotClock(shotClockDuration);
    if (isTimerRunning && (isShotClockEnabled || isMatchClockEnabled)) startTimer();
  }, [isTimerRunning, startTimer, shotClockDuration, isShotClockEnabled, isMatchClockEnabled]);

  const resetMatchClock = useCallback(() => {
    setMatchClock(matchClockDuration);
  }, [matchClockDuration]);

  // --- Game Actions ---
  const incrementScore = (playerId: string) => {
    if (playerId === '1') {
      setPlayer1(prev => ({ ...prev, score: prev.score + 1 }));
    } else {
      setPlayer2(prev => ({ ...prev, score: prev.score + 1 }));
    }
    resetTimer();
  };

  const decrementScore = (playerId: string) => {
    if (playerId === '1') {
      setPlayer1(prev => ({ ...prev, score: Math.max(0, prev.score - 1) }));
    } else {
      setPlayer2(prev => ({ ...prev, score: Math.max(0, prev.score - 1) }));
    }
  };

  const finishMatch = () => {
    const winner = player1.score > player2.score ? player1.name : player2.name;
    const newEntry: MatchHistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      player1: player1.name,
      player2: player2.name,
      team1: team1Name || undefined,
      team2: team2Name || undefined,
      score1: player1.score,
      score2: player2.score,
      winner,
      shotClockSetting: isShotClockEnabled ? shotClockDuration : undefined,
      matchClockRemaining: isMatchClockEnabled ? matchClock : undefined
    };

    const updatedHistory = [newEntry, ...matchHistory];
    setMatchHistory(updatedHistory);
    
    // Move to next matchup if available
    if (selectedMatchIndex !== null) {
      const nextIndex = selectedMatchIndex + 1;
      const maxMatches = Math.max(team1Players.length, team2Players.length);
      
      if (nextIndex < maxMatches) {
        selectTeamMatch(nextIndex);
      } else {
        // Show team totals if it was the last match
        setShowTeamTotals(true);
        
        // Reset game if no more matches
        setPlayer1(prev => ({ ...prev, score: 0 }));
        setPlayer2(prev => ({ ...prev, score: 0 }));
        setSelectedMatchIndex(null);
        resetTimer();
      }
    } else {
      // Reset game for non-team matches
      setPlayer1(prev => ({ ...prev, score: 0 }));
      setPlayer2(prev => ({ ...prev, score: 0 }));
      resetTimer();
    }
  };

  const clearMatchResult = (p1: string, p2: string) => {
    const updatedHistory = matchHistory.filter(m => 
      !((m.player1 === p1 && m.player2 === p2) || (m.player1 === p2 && m.player2 === p1))
    );
    setMatchHistory(updatedHistory);
  };

  const selectTeamMatch = (index: number) => {
    const p1Name = team1Players[index] || `PLAYER ${index + 1}`;
    const p2Name = team2Players[index] || `PLAYER ${index + 1}`;
    
    // Load individual player preferences if they exist
    const p1Pref = playerPreferences[p1Name];
    const p2Pref = playerPreferences[p2Name];
    
    // Load matchup-specific settings (clocks)
    const settings = matchupSettings[index];

    // Load existing scores if available
    const existingResult = getMatchResult(p1Name, p2Name);
    let p1Score = 0;
    let p2Score = 0;

    if (existingResult) {
      if (existingResult.player1 === p1Name) {
        p1Score = existingResult.score1;
        p2Score = existingResult.score2;
      } else {
        p1Score = existingResult.score2;
        p2Score = existingResult.score1;
      }
    }
    
    setPlayer1(prev => ({ 
      ...prev, 
      name: p1Name, 
      score: p1Score,
      color: p1Pref?.color || (settings?.player1.color) || '#FFFF33',
      bgColor: p1Pref?.bgColor || (settings?.player1.bgColor) || '#000000',
      screenColor: p1Pref?.screenColor || (settings?.player1.screenColor) || '#000000'
    }));
    
    setPlayer2(prev => ({ 
      ...prev, 
      name: p2Name, 
      score: p2Score,
      color: p2Pref?.color || (settings?.player2.color) || '#FF001C',
      bgColor: p2Pref?.bgColor || (settings?.player2.bgColor) || '#000000',
      screenColor: p2Pref?.screenColor || (settings?.player2.screenColor) || '#000000'
    }));
    
    setSelectedMatchIndex(index);
    setView('scoreboard');
    resetTimer();
    resetMatchClock();
  };

  const navigateToScoreboard = () => {
    const maxMatches = Math.max(team1Players.length, team2Players.length);
    
    // If we're already on scoreboard and have a match, just stay
    if (view === 'scoreboard' && selectedMatchIndex !== null) return;

    if (maxMatches > 0) {
      // Find the first match with no data
      let firstUnplayedIndex = -1;
      for (let i = 0; i < maxMatches; i++) {
        const p1Name = team1Players[i] || `PLAYER ${i + 1}`;
        const p2Name = team2Players[i] || `PLAYER ${i + 1}`;
        if (!getMatchResult(p1Name, p2Name)) {
          firstUnplayedIndex = i;
          break;
        }
      }
      
      // If all matches have data, just select the first one (top row)
      const indexToSelect = firstUnplayedIndex !== -1 ? firstUnplayedIndex : 0;
      selectTeamMatch(indexToSelect);
    } else {
      setView('scoreboard');
    }
  };

  const clearTeams = () => {
    // Clear Team Data
    setTeam1Name('');
    setTeam2Name('');
    setTeam1Players([]);
    setTeam2Players([]);
    
    // Clear Game Data
    setPlayer1(prev => ({ ...prev, score: 0 }));
    setPlayer2(prev => ({ ...prev, score: 0 }));
    setMatchHistory([]);
    setMatchupSettings({});
    setSelectedMatchIndex(null);
    setShotClock(shotClockDuration);
    setMatchClock(matchClockDuration);
    
    setShowClearTeamsConfirm(false);
  };

  const updateTeamData = (
    t1Name: string, 
    t1Players: string[], 
    t2Name: string, 
    t2Players: string[]
  ) => {
    setTeam1Name(t1Name);
    setTeam1Players(t1Players);
    setTeam2Name(t2Name);
    setTeam2Players(t2Players);
  };

  const parseTime = (timeStr: string) => {
    if (!timeStr || timeStr === 'OFF') return undefined;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeStr);
  };

  const formatDateUK = (date: Date, includeTime = false) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const dateStr = `${d}.${m}.${y}`;
    if (includeTime) {
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      const s = String(date.getSeconds()).padStart(2, '0');
      return `${dateStr}, ${h}:${min}:${s}`;
    }
    return dateStr;
  };

  const parseUKDate = (str: string) => {
    if (!str || typeof str !== 'string') return null;
    // Handle DD.MM.YYYY, HH:MM:SS or DD/MM/YYYY, HH:MM:SS
    const parts = str.split(/[,\s]+/);
    const dateParts = parts[0].split(/[./-]/);
    if (dateParts.length === 3) {
      const d = parseInt(dateParts[0]);
      const m = parseInt(dateParts[1]) - 1;
      const y = parseInt(dateParts[2]);
      let h = 0, min = 0, s = 0;
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        h = parseInt(timeParts[0]) || 0;
        min = parseInt(timeParts[1]) || 0;
        s = parseInt(timeParts[2]) || 0;
      }
      const date = new Date(y, m, d, h, min, s);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    return null;
  };

  const generateCSV = () => {
    let csvContent = "SECTION: TEAM SETUP\n";
    csvContent += "Team,Player Name,Highlight Color\n";
    
    team1Players.forEach(p => {
      const pref = playerPreferences[p];
      csvContent += `"${team1Name}","${p}","${pref?.color || '#FFFF33'}"\n`;
    });
    team2Players.forEach(p => {
      const pref = playerPreferences[p];
      csvContent += `"${team2Name}","${p}","${pref?.color || '#FF001C'}"\n`;
    });

    csvContent += "\nSECTION: MATCH HISTORY\n";
    csvContent += "Date,Team 1,Player 1,Score 1,Team 2,Player 2,Score 2,Winner,Shot Clock Setting,Match Clock Remaining\n";
    matchHistory.forEach(entry => {
      const formattedDate = formatDateUK(new Date(entry.date), true);

      const row = [
        formattedDate,
        entry.team1 || team1Name,
        entry.player1,
        entry.score1,
        entry.team2 || team2Name,
        entry.player2,
        entry.score2,
        entry.winner,
        entry.shotClockSetting ? `${entry.shotClockSetting}s` : 'OFF',
        entry.matchClockRemaining !== undefined && entry.matchClockRemaining !== null ? formatTime(entry.matchClockRemaining) : 'OFF'
      ];
      csvContent += row.map(val => `"${val}"`).join(',') + '\n';
    });

    csvContent += "\nSECTION: TEAM TOTALS\n";
    csvContent += "Team,Total Score\n";
    csvContent += `"${team1Name}","${teamTotals.t1}"\n`;
    csvContent += `"${team2Name}","${teamTotals.t2}"\n`;

    csvContent += "\nSECTION: SETTINGS\n";
    csvContent += "Setting,Value\n";
    csvContent += `Shot Clock Enabled,"${isShotClockEnabled}"\n`;
    csvContent += `Shot Clock Duration,"${shotClockDuration}s"\n`;
    csvContent += `Match Clock Enabled,"${isMatchClockEnabled}"\n`;
    csvContent += `Match Clock Duration,"${formatTime(matchClockDuration)}"\n`;
    csvContent += `Player 1 Highlight Color,"${player1.color}"\n`;
    csvContent += `Player 2 Highlight Color,"${player2.color}"\n`;
    csvContent += `Selected Match Index,"${selectedMatchIndex}"\n`;
    csvContent += `Show Device Time,"${showDeviceTime}"\n`;
    if (deviceTimePosition) {
      csvContent += `Device Time Position X,"${deviceTimePosition.x}"\n`;
      csvContent += `Device Time Position Y,"${deviceTimePosition.y}"\n`;
    }
    if (matchClockPosition) {
      csvContent += `Match Clock Position X,"${matchClockPosition.x}"\n`;
      csvContent += `Match Clock Position Y,"${matchClockPosition.y}"\n`;
    }
    if (shotClockPosition) {
      csvContent += `Shot Clock Position X,"${shotClockPosition.x}"\n`;
      csvContent += `Shot Clock Position Y,"${shotClockPosition.y}"\n`;
    }
    if (finishButtonPosition) {
      csvContent += `Finish Button Position X,"${finishButtonPosition.x}"\n`;
      csvContent += `Finish Button Position Y,"${finishButtonPosition.y}"\n`;
    }

    csvContent += "\nSECTION: PLAYER PREFERENCES\n";
    csvContent += "Player Name,Highlight Color\n";
    // Include current active player names if they have colors
    csvContent += `"Player 1","${player1.color}"\n`;
    csvContent += `"Player 2","${player2.color}"\n`;
    
    Object.entries(playerPreferences).forEach(([name, pref]: [string, any]) => {
      csvContent += `"${name}","${pref.color}"\n`;
    });

    return csvContent;
  };

  const generateJSON = () => {
    const state = {
      settings: {
        player1: {
          id: player1.id,
          name: player1.name,
          score: player1.score,
          isTurn: player1.isTurn,
          highlightColor: player1.color
        },
        player2: {
          id: player2.id,
          name: player2.name,
          score: player2.score,
          isTurn: player2.isTurn,
          highlightColor: player2.color
        },
        shotClockDuration,
        isShotClockEnabled,
        matchClockDuration,
        isMatchClockEnabled
      },
      teams: {
        team1Name,
        team2Name,
        team1Players,
        team2Players,
        selectedMatchIndex,
        totals: teamTotals
      },
      playerPreferences: Object.entries(playerPreferences).reduce((acc, [name, pref]: [string, any]) => {
        acc[name] = pref.color;
        return acc;
      }, {} as Record<string, string>),
      history: matchHistory.map(entry => ({
        ...entry,
        date: formatDateUK(new Date(entry.date), true)
      })),
      lastUpdated: formatDateUK(new Date(), true)
    };
    return JSON.stringify(state, null, 2);
  };

  const downloadData = (format: 'csv' | 'json' = 'csv') => {
    const now = new Date();
    const ukDate = formatDateUK(now);
    const extension = format === 'json' ? 'json' : 'csv';
    const fileName = `${team1Name.replace(/\s+/g, '_')}_V_${team2Name.replace(/\s+/g, '_')}_${ukDate}.${extension}`;

    let content: string | Blob;
    if (format === 'json') {
      content = generateJSON();
    } else {
      content = generateCSV();
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareData = async (format: 'csv' | 'json' = 'csv') => {
    const now = new Date();
    const ukDate = formatDateUK(now);
    const extension = format === 'json' ? 'json' : 'csv';
    const fileName = `${team1Name.replace(/\s+/g, '_')}_V_${team2Name.replace(/\s+/g, '_')}_${ukDate}.${extension}`;

    let content: string;
    if (format === 'json') {
      content = generateJSON();
    } else {
      content = generateCSV();
    }

    const file = new File([content], fileName, { type: format === 'json' ? 'application/json' : 'text/csv' });

    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: 'Pool Tournament Data',
          text: `Tournament data for ${team1Name} vs ${team2Name}`
        });
      } catch (err) {
        console.error('Error sharing:', err);
        if ((err as Error).name !== 'AbortError') {
          // Fallback to download if share fails (common in some browsers/contexts)
          downloadData(format);
        }
      }
    } else {
      // Fallback to download if navigator.share is not supported (e.g. Firefox)
      downloadData(format);
    }
  };

  const handleExportAction = async () => {
    if (exportMethod === 'download') {
      downloadData(exportFormat);
    } else if (exportMethod === 'share') {
      shareData(exportFormat);
    } else if (exportMethod === 'server') {
      if (!apiConfig.url) {
        alert('API URL not configured. Please set it in Settings.');
        return;
      }
      
      setIsApiSending(true);
      try {
        const body = generateJSON();
        
        console.log('--- API POST REQUEST START ---');
        console.log('URL:', apiConfig.url);
        console.log('Headers:', {
          'Content-Type': 'application/json',
          'x-api-key': apiConfig.key.substring(0, 4) + '...' // Log partial key for safety
        });
        console.log('Payload:', JSON.parse(body));
        
        const response = await fetch(apiConfig.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiConfig.key
          },
          body
        });

        console.log('Response Status:', response.status);
        console.log('--- API POST REQUEST END ---');

        if (response.ok) {
          alert('Data sent to server successfully!');
        } else {
          throw new Error(`Server responded with ${response.status}`);
        }
      } catch (err) {
        console.error('API Error:', err);
        alert('Failed to send data to server. Check console for details.');
      } finally {
        setIsApiSending(false);
      }
    }
    setShowExportMenu(false);
  };

  const uploadData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.csv';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;

        try {
          // Check if it's JSON
          if (file.name.endsWith('.json')) {
            const state = JSON.parse(content) as any;
            
            // Support new structure
            if (state.settings) {
              setShotClockDuration(state.settings.shotClockDuration || SHOT_CLOCK_DEFAULT);
              setIsShotClockEnabled(!!state.settings.isShotClockEnabled);
              setMatchClockDuration(state.settings.matchClockDuration || 600);
              setIsMatchClockEnabled(!!state.settings.isMatchClockEnabled);
              
              if (state.settings.player1) {
                setPlayer1(prev => ({ 
                  ...prev, 
                  name: state.settings.player1.name || prev.name,
                  score: state.settings.player1.score ?? prev.score,
                  isTurn: state.settings.player1.isTurn ?? prev.isTurn,
                  color: state.settings.player1.highlightColor || prev.color 
                }));
              }
              if (state.settings.player2) {
                setPlayer2(prev => ({ 
                  ...prev, 
                  name: state.settings.player2.name || prev.name,
                  score: state.settings.player2.score ?? prev.score,
                  isTurn: state.settings.player2.isTurn ?? prev.isTurn,
                  color: state.settings.player2.highlightColor || prev.color 
                }));
              }
            }

            if (state.teams) {
              setTeam1Name(state.teams.team1Name || '');
              setTeam2Name(state.teams.team2Name || '');
              setTeam1Players(state.teams.team1Players || []);
              setTeam2Players(state.teams.team2Players || []);
              setSelectedMatchIndex(state.teams.selectedMatchIndex ?? 0);
            }

            if (state.history) {
              const importedHistory = (state.history || []).map((entry: any) => {
                if (typeof entry.date === 'string' && (entry.date.includes('.') || entry.date.includes('/'))) {
                  const parsed = parseUKDate(entry.date);
                  if (parsed) return { ...entry, date: parsed };
                }
                return entry;
              });
              setMatchHistory(importedHistory);
            }

            if (state.playerPreferences) {
              const mappedPrefs: Record<string, { color: string, bgColor: string, screenColor: string }> = {};
              Object.entries(state.playerPreferences).forEach(([name, pref]: [string, any]) => {
                // Handle both new (string) and old ({borderColor}) formats
                const color = typeof pref === 'string' ? pref : (pref.borderColor || '#FFFF33');
                mappedPrefs[name] = {
                  color: color,
                  bgColor: '#000000',
                  screenColor: '#000000'
                };
              });
              setPlayerPreferences(mappedPrefs);
            }

            // Legacy support
            if (state.teamData) {
              setTeam1Name(state.teamData.team1Name || '');
              setTeam2Name(state.teamData.team2Name || '');
              setTeam1Players(state.teamData.team1Players || []);
              setTeam2Players(state.teamData.team2Players || []);
            }
            if (state.gameData) {
              setMatchHistory(state.gameData.matchHistory || []);
              setSelectedMatchIndex(state.gameData.selectedMatchIndex);
              setShotClock(state.gameData.shotClock ?? SHOT_CLOCK_DEFAULT);
              setMatchClock(state.gameData.matchClock ?? 600);
              setPlayer1(prev => ({ ...prev, score: state.gameData.player1Score || 0 }));
              setPlayer2(prev => ({ ...prev, score: state.gameData.player2Score || 0 }));
            }
            if (state.userPreferences) {
              setShotClockDuration(state.userPreferences.shotClockDuration || SHOT_CLOCK_DEFAULT);
              setIsShotClockEnabled(!!state.userPreferences.isShotClockEnabled);
              setMatchClockDuration(state.userPreferences.matchClockDuration || 600);
              setIsMatchClockEnabled(!!state.userPreferences.isMatchClockEnabled);
              if (state.userPreferences.showDeviceTime !== undefined) setShowDeviceTime(state.userPreferences.showDeviceTime);
              if (state.userPreferences.deviceTimePosition !== undefined) setDeviceTimePosition(state.userPreferences.deviceTimePosition);
              if (state.userPreferences.matchClockPosition !== undefined) setMatchClockPosition(state.userPreferences.matchClockPosition);
              if (state.userPreferences.shotClockPosition !== undefined) setShotClockPosition(state.userPreferences.shotClockPosition);
              if (state.userPreferences.finishButtonPosition !== undefined) setFinishButtonPosition(state.userPreferences.finishButtonPosition);
              
              if (state.userPreferences.player1) {
                setPlayer1(prev => ({ 
                  ...prev, 
                  name: state.userPreferences.player1.name || prev.name,
                  color: state.userPreferences.player1.borderColor || prev.color 
                }));
              }
              if (state.userPreferences.player2) {
                setPlayer2(prev => ({ 
                  ...prev, 
                  name: state.userPreferences.player2.name || prev.name,
                  color: state.userPreferences.player2.borderColor || prev.color 
                }));
              }
            }
            if (state.matchupSettings) setMatchupSettings(state.matchupSettings);
            if (state.apiConfig) setApiConfig(state.apiConfig);
            
            alert('Tournament data loaded successfully!');
            return;
          }

          // Fallback to legacy CSV parsing
          const lines = content.split('\n').map(l => l.trim()).filter(l => l);
          if (lines.length < 2) return;

          const parseCSVLine = (line: string) => {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            return values;
          };

          // Check if it's the new multi-section format
          if (lines[0].startsWith('SECTION:')) {
            let currentSection = '';
            let t1Players: string[] = [];
            let t2Players: string[] = [];
            let t1Name = '';
            let t2Name = '';
            let importedHistory: MatchHistoryEntry[] = [];
            let importedPlayerPreferences: Record<string, { color: string, bgColor: string, screenColor: string }> = { ...playerPreferences };

            lines.forEach(line => {
              if (line.startsWith('SECTION:')) {
                currentSection = line.replace('SECTION:', '').trim();
                return;
              }
              if (!line || line.trim() === '') return;

              const values = parseCSVLine(line);
              
              if (currentSection === 'TEAM SETUP') {
                if (values[0] === 'Team') return;
                const team = values[0];
                const player = values[1];
                const color = values[2];
                if (team && player) {
                  if (!t1Name) t1Name = team;
                  if (team === t1Name) {
                    if (!t1Players.includes(player)) t1Players.push(player);
                  } else {
                    if (!t2Name) t2Name = team;
                    if (!t2Players.includes(player)) t2Players.push(player);
                  }
                  if (color) {
                    importedPlayerPreferences[player] = { color, bgColor: '#000000', screenColor: '#000000' };
                  }
                }
              } else if (currentSection === 'MATCH HISTORY') {
                if (values[0] === 'Date') return;
                const parsedDate = parseUKDate(values[0]);
                importedHistory.push({
                  id: `imported-${Date.now()}-${Math.random()}`,
                  date: parsedDate || new Date(values[0]).toISOString(),
                  team1: values[1],
                  player1: values[2],
                  score1: parseInt(values[3]) || 0,
                  team2: values[4],
                  player2: values[5],
                  score2: parseInt(values[6]) || 0,
                  winner: values[7],
                  shotClockSetting: values[8] !== 'OFF' ? parseInt(values[8].replace('s', '')) : undefined,
                  matchClockRemaining: values[9] !== 'OFF' ? parseTime(values[9]) : undefined
                });
              } else if (currentSection === 'SETTINGS') {
                if (values[0] === 'Setting') return;
                const key = values[0];
                const val = values[1];
                if (key === 'Shot Clock Enabled') setIsShotClockEnabled(val === 'true');
                if (key === 'Shot Clock Duration') setShotClockDuration(parseInt(val.replace('s', '')));
                if (key === 'Match Clock Enabled') setIsMatchClockEnabled(val === 'true');
                if (key === 'Match Clock Duration') setMatchClockDuration(parseTime(val) || 600);
                if (key === 'Player 1 Highlight Color') setPlayer1(p => ({ ...p, color: val }));
                if (key === 'Player 2 Highlight Color') setPlayer2(p => ({ ...p, color: val }));
                if (key === 'Selected Match Index') setSelectedMatchIndex(val === 'NULL' ? null : parseInt(val));
                if (key === 'Show Device Time') setShowDeviceTime(val === 'true');
                if (key === 'Device Time Position X') setDeviceTimePosition(prev => ({ x: parseFloat(val), y: prev?.y || 0 }));
                if (key === 'Device Time Position Y') setDeviceTimePosition(prev => ({ x: prev?.x || 0, y: parseFloat(val) }));
                if (key === 'Match Clock Position X') setMatchClockPosition(prev => ({ x: parseFloat(val), y: prev?.y || 0 }));
                if (key === 'Match Clock Position Y') setMatchClockPosition(prev => ({ x: prev?.x || 0, y: parseFloat(val) }));
                if (key === 'Shot Clock Position X') setShotClockPosition(prev => ({ x: parseFloat(val), y: prev?.y || 0 }));
                if (key === 'Shot Clock Position Y') setShotClockPosition(prev => ({ x: prev?.x || 0, y: parseFloat(val) }));
                if (key === 'Finish Button Position X') setFinishButtonPosition(prev => ({ x: parseFloat(val), y: prev?.y || 0 }));
                if (key === 'Finish Button Position Y') setFinishButtonPosition(prev => ({ x: prev?.x || 0, y: parseFloat(val) }));
              } else if (currentSection === 'PLAYER PREFERENCES') {
                if (values[0] === 'Player Name') return;
                const name = values[0];
                const color = values[1];
                if (name && color) {
                  importedPlayerPreferences[name] = { color, bgColor: '#000000', screenColor: '#000000' };
                }
              }
            });

            setMatchHistory(importedHistory);
            setPlayerPreferences(importedPlayerPreferences);
            updateTeamData(t1Name, t1Players, t2Name, t2Players);
            alert('Tournament data loaded successfully!');
            return;
          }

          const headers = parseCSVLine(lines[0]);
          
          if (headers[0] === 'Team' && headers[1] === 'Player Name') {
            const t1Players: string[] = [];
            const t2Players: string[] = [];
            let t1Name = '';
            let t2Name = '';

            lines.slice(1).forEach(line => {
              const values = parseCSVLine(line);
              const team = values[0];
              const player = values[1];
              if (team && player) {
                if (t1Players.length === 0) {
                  t1Name = team;
                  t1Players.push(player);
                } else if (team === t1Name) {
                  t1Players.push(player);
                } else {
                  t2Name = team;
                  t2Players.push(player);
                }
              }
            });
            
            updateTeamData(t1Name, t1Players, t2Name, t2Players);
            setMatchHistory([]);
            setSelectedMatchIndex(null);
            alert('Teams loaded successfully!');
          } else if (headers.includes('Team 1') && headers.includes('Player 1')) {
            const history: MatchHistoryEntry[] = [];
            const t1PlayersSet = new Set<string>();
            const t2PlayersSet = new Set<string>();
            let t1Name = '';
            let t2Name = '';

            lines.slice(1).forEach((line, idx) => {
              const values = parseCSVLine(line);
              const entry: any = {};
              headers.forEach((h, i) => {
                entry[h] = values[i];
              });

              if (idx === 0) {
                t1Name = entry['Team 1'];
                t2Name = entry['Team 2'];
              }

              if (entry['Player 1']) t1PlayersSet.add(entry['Player 1']);
              if (entry['Player 2']) t2PlayersSet.add(entry['Player 2']);

              let finalDate = new Date().toISOString();
              if (entry['Date']) {
                const parsed = parseUKDate(entry['Date']);
                if (parsed) {
                  finalDate = parsed;
                } else {
                  const d = new Date(entry['Date']);
                  if (!isNaN(d.getTime())) {
                    finalDate = d.toISOString();
                  }
                }
              }

              history.push({
                id: `imported-${idx}-${Date.now()}`,
                date: finalDate,
                team1: entry['Team 1'],
                player1: entry['Player 1'],
                score1: parseInt(entry['Score 1']) || 0,
                team2: entry['Team 2'],
                player2: entry['Player 2'],
                score2: parseInt(entry['Score 2']) || 0,
                winner: entry['Winner'],
                shotClockSetting: entry['Shot Clock Setting'] && entry['Shot Clock Setting'] !== 'OFF' ? parseInt(entry['Shot Clock Setting'].replace('s', '')) : undefined,
                matchClockRemaining: entry['Match Clock Remaining'] && entry['Match Clock Remaining'] !== 'OFF' ? parseTime(entry['Match Clock Remaining']) : undefined
              });
            });

            setMatchHistory(history);
            updateTeamData(t1Name, Array.from(t1PlayersSet), t2Name, Array.from(t2PlayersSet));
            setSelectedMatchIndex(null);
            alert('Match history and teams loaded successfully!');
          } else {
            alert('Unrecognized CSV format. Please use a file exported from this app.');
          }
        } catch (err) {
          console.error('Error parsing CSV:', err);
          alert('Failed to parse CSV file. Please ensure it is in the correct format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const clearHistory = () => {
    setMatchHistory([]);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const halfW = windowSize.width < 640 ? 66 : 98;
  const halfH = windowSize.width < 640 ? 22 : 26;
  const gap = windowSize.height * 0.05;

  return (
    <div className="relative min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* SVG Gradient Definitions */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id="cup-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={player1.color} />
            <stop offset="100%" stopColor={player2.color} />
          </linearGradient>
        </defs>
      </svg>

      {/* Background Layer */}
      <div className="fixed inset-0 z-[-10] overflow-hidden pointer-events-none">
        {/* Split Screen (Scoreboard only) */}
        <div className={`absolute inset-0 flex transition-opacity duration-700 ${view === 'scoreboard' ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex-1 h-full transition-colors duration-700" style={{ backgroundColor: player1.screenColor }} />
          <div className="flex-1 h-full transition-colors duration-700" style={{ backgroundColor: player2.screenColor }} />
        </div>
        
        {/* Plain Background (Teams & Settings) */}
        <div className={`absolute inset-0 bg-black transition-opacity duration-700 ${view !== 'scoreboard' ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Subtle Gradient Overlay for Plain Background */}
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from),_transparent_50%)] from-emerald-500/5 transition-opacity duration-700 ${view !== 'scoreboard' ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Navigation Bar */}
      <motion.nav 
        initial={false}
        animate={{ 
          y: (!deviceInfo.isDesktop && (
            (!isNavVisible && deviceInfo.isPhone) || 
            (isKeyboardOpen && (deviceInfo.isPhone || (deviceInfo.isTablet && view === 'teams')))
          )) ? (deviceInfo.isPhone ? -56 : -80) : 0,
          opacity: 1
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed top-0 left-0 right-0 h-14 sm:h-20 lg:h-28 bg-black/20 backdrop-blur-md z-50 flex items-center justify-between px-6 nav-zoom"
        style={{ 
          borderBottom: '2px solid',
          borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
        }}
      >
        <div className="flex items-center gap-3 lg:gap-6 shrink-0">
          <Trophy 
            className="w-8 h-8 lg:w-16 lg:h-16 transition-all duration-500" 
            style={{ stroke: 'url(#cup-gradient)' }}
          />
          <h1 
            className={`text-4xl lg:text-7xl font-black tracking-tight bg-clip-text text-transparent transition-all duration-500 ${(isShotClockEnabled || isMatchClockEnabled) ? 'hidden sm:block' : ''}`}
            style={{ backgroundImage: `linear-gradient(to right, ${player1.color}, ${player2.color})` }}
          >
            Pool-Pro.uk
          </h1>
        </div>

        {/* Centered Controls - Removed as they are now in the widgets */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center pointer-events-none">
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-8 shrink-0">
          <button 
            onClick={toggleFullscreen}
            className="w-9 h-9 lg:w-[72px] lg:h-[72px] rounded-lg lg:rounded-2xl flex items-center justify-center transition-all duration-500 border border-slate-800 bg-black/50 hover:bg-slate-800/50 flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? 
              <Minimize className="w-5 h-5 lg:w-10 lg:h-10" style={{ stroke: 'url(#cup-gradient)' }} /> : 
              <Maximize className="w-5 h-5 lg:w-10 lg:h-10" style={{ stroke: 'url(#cup-gradient)' }} />
            }
          </button>
          <button 
            onClick={navigateToScoreboard}
            className={`w-9 h-9 lg:w-[72px] lg:h-[72px] rounded-lg lg:rounded-2xl flex items-center justify-center transition-all duration-500 border ${view === 'scoreboard' ? 'border-white/20' : 'border-slate-800'} bg-black/50 hover:bg-slate-800/50`}
            style={view === 'scoreboard' ? { backgroundColor: `${player1.color}33` } : {}}
          >
            <Trophy className="w-5 h-5 lg:w-10 lg:h-10" style={{ stroke: 'url(#cup-gradient)' }} />
          </button>
          <button 
            onClick={() => {
              setView('teams');
              if (deviceInfo.isPhone) setIsNavVisible(false);
            }}
            className={`w-9 h-9 lg:w-[72px] lg:h-[72px] rounded-lg lg:rounded-2xl flex items-center justify-center transition-all duration-500 border ${view === 'teams' ? 'border-white/20' : 'border-slate-800'} bg-black/50 hover:bg-slate-800/50`}
            style={view === 'teams' ? { backgroundColor: `${player1.color}33` } : {}}
          >
            <Users className="w-5 h-5 lg:w-10 lg:h-10" style={{ stroke: 'url(#cup-gradient)' }} />
          </button>
          <button 
            onClick={() => {
              setView('settings');
              if (deviceInfo.isPhone) setIsNavVisible(false);
            }}
            className={`w-9 h-9 lg:w-[72px] lg:h-[72px] rounded-lg lg:rounded-2xl flex items-center justify-center transition-all duration-500 border ${view === 'settings' ? 'border-white/20' : 'border-slate-800'} bg-black/50 hover:bg-slate-800/50`}
            style={view === 'settings' ? { backgroundColor: `${player2.color}33` } : {}}
          >
            <Settings className="w-5 h-5 lg:w-10 lg:h-10" style={{ stroke: 'url(#cup-gradient)' }} />
          </button>
        </div>
      </motion.nav>

      {/* Vertical Team Names - Moved to root for stability */}
      <AnimatePresence>
        {view === 'scoreboard' && (
          <>
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ 
                opacity: 0.7, 
                x: 0,
                y: (deviceInfo.isPhone && !isNavVisible) ? -56 : 0
              }}
              exit={{ opacity: 0, x: -50 }}
              className="fixed left-0 top-0 bottom-0 w-[var(--sidebar-width)] flex flex-col pointer-events-none z-20"
            >
              <div className="h-14 sm:h-20 lg:h-28 flex-shrink-0" />
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <h2 
                  className="vertical-text font-black uppercase tracking-widest select-none whitespace-nowrap leading-none m-0" 
                  style={{ 
                    color: player1.color,
                    fontSize: `${sharedTeamNameFontSize}px`
                  }}
                >
                  {team1Name}
                </h2>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ 
                opacity: 0.7, 
                x: 0,
                y: (deviceInfo.isPhone && !isNavVisible) ? -56 : 0
              }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed right-0 top-0 bottom-0 w-[var(--sidebar-width)] flex flex-col pointer-events-none z-20"
            >
              <div className="h-14 sm:h-20 lg:h-28 flex-shrink-0" />
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <h2 
                  className="vertical-text font-black uppercase tracking-widest select-none whitespace-nowrap rotate-180 leading-none m-0" 
                  style={{ 
                    color: player2.color,
                    fontSize: `${sharedTeamNameFontSize}px`
                  }}
                >
                  {team2Name}
                </h2>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Match Clock Widget */}
      <AnimatePresence>
        {isMatchClockEnabled && view === 'scoreboard' && (
          <motion.div
            ref={matchClockRef}
            drag
            dragMomentum={false}
            onDragEnd={() => {
              if (matchClockRef.current) {
                const rect = matchClockRef.current.getBoundingClientRect();
                setMatchClockPosition({ x: rect.left, y: rect.top });
              }
            }}
            initial={matchClockPosition || { 
              x: windowSize.width / 2 - halfW, 
              y: windowSize.height / 2 + halfH + gap
            }}
            animate={matchClockPosition ? { x: matchClockPosition.x, y: matchClockPosition.y } : {
              x: windowSize.width / 2 - halfW,
              y: windowSize.height / 2 + halfH + gap
            }}
            className="fixed z-[100] cursor-move pointer-events-auto touch-none"
            style={{ left: 0, top: 0 }}
          >
            <div 
              className="w-32 sm:w-48 h-10 sm:h-12 flex items-center justify-between px-2 sm:px-3 rounded-2xl bg-black border-2 shadow-2xl"
              style={{ 
                border: '2px solid transparent',
                backgroundImage: `linear-gradient(#000, #000), linear-gradient(${deviceInfo.isPhone ? 'to bottom' : 'to right'}, ${player1.color}, ${player2.color})`,
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              <div className="flex flex-col items-center justify-center h-full pt-1 flex-1">
                <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-0.5">Match</span>
                <div 
                  className={`flex items-center gap-1 text-lg sm:text-2xl font-mono font-black tabular-nums transition-all duration-500 ${matchClock <= 60 ? 'text-red-500 animate-pulse scale-110' : 'text-white'}`}
                >
                  <Timer className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  {formatTime(matchClock)}
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  resetMatchClock();
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-slate-400 active:scale-90"
                title="Reset Match Clock"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Shot Clock Widget */}
      <AnimatePresence>
        {isShotClockEnabled && view === 'scoreboard' && (
          <motion.div
            ref={shotClockRef}
            drag
            dragMomentum={false}
            onDragEnd={() => {
              if (shotClockRef.current) {
                const rect = shotClockRef.current.getBoundingClientRect();
                setShotClockPosition({ x: rect.left, y: rect.top });
              }
            }}
            initial={shotClockPosition || { 
              x: windowSize.width / 2 - halfW, 
              y: windowSize.height / 2 - halfH - gap - (halfH * 2)
            }}
            animate={shotClockPosition ? { x: shotClockPosition.x, y: shotClockPosition.y } : {
              x: windowSize.width / 2 - halfW,
              y: windowSize.height / 2 - halfH - gap - (halfH * 2)
            }}
            className="fixed z-[100] cursor-move pointer-events-auto touch-none"
            style={{ left: 0, top: 0 }}
          >
            <div 
              className="w-32 sm:w-48 h-10 sm:h-12 flex items-center justify-between px-2 sm:px-3 rounded-2xl bg-black border-2 shadow-2xl"
              style={{ 
                border: '2px solid transparent',
                backgroundImage: `linear-gradient(#000, #000), linear-gradient(${deviceInfo.isPhone ? 'to bottom' : 'to right'}, ${player2.color}, ${player1.color})`,
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              <div className="flex flex-col items-center justify-center h-full pt-1 flex-1">
                <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-0.5">Shot</span>
                <div 
                  className={`flex items-center gap-1 text-lg sm:text-2xl font-mono font-black tabular-nums transition-all duration-500 ${shotClock <= 5 ? 'text-red-500 animate-pulse scale-110' : 'text-white'}`}
                >
                  <Timer className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                  {shotClock}s
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    isTimerRunning ? pauseTimer() : startTimer();
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-all active:scale-90"
                  style={{ color: isTimerRunning ? player2.color : player1.color }}
                  title={isTimerRunning ? "Pause" : "Start"}
                >
                  {isTimerRunning ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    resetTimer();
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-all text-slate-400 active:scale-90"
                  title="Reset Shot Clock"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Device Time Clock */}
      <AnimatePresence>
        {showDeviceTime && view === 'scoreboard' && (
          <motion.div
            ref={clockRef}
            drag
            dragMomentum={false}
            onDragEnd={() => {
              if (clockRef.current) {
                const rect = clockRef.current.getBoundingClientRect();
                setDeviceTimePosition({ x: rect.left, y: rect.top });
              }
            }}
            initial={deviceTimePosition || { 
              x: windowSize.width / 2 - halfW, 
              y: 12 
            }}
            animate={deviceTimePosition ? { x: deviceTimePosition.x, y: deviceTimePosition.y } : {
              x: windowSize.width / 2 - halfW,
              y: 12
            }}
            className="fixed z-[100] cursor-move pointer-events-auto touch-none"
            style={{ left: 0, top: 0 }}
          >
            <div 
              className="w-32 sm:w-48 h-10 sm:h-12 flex items-center justify-center gap-2 rounded-2xl bg-black border-2 shadow-2xl"
              style={{ 
                border: '2px solid transparent',
                backgroundImage: `linear-gradient(#000, #000), linear-gradient(${deviceInfo.isPhone ? 'to bottom' : 'to right'}, ${player2.color}, ${player1.color})`,
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-slate-400" />
              <span className="text-lg sm:text-2xl font-mono font-black text-white tracking-wider tabular-nums">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.main 
        initial={false}
        animate={{ 
          paddingTop: (view === 'teams' || view === 'settings')
            ? `calc(${deviceInfo.isPhone ? '56px' : (deviceInfo.isTablet ? '80px' : '112px')} + 8vh)`
            : (view === 'scoreboard' 
                ? (deviceInfo.isPhone ? '56px' : (deviceInfo.isTablet ? '80px' : '112px')) 
                : 0),
          y: (deviceInfo.isPhone && !isNavVisible && view === 'scoreboard') ? -56 : 0,
          paddingBottom: 0 
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`relative z-10 min-h-[100dvh] flex flex-col ${view === 'scoreboard' ? 'justify-center sm:gap-4 lg:gap-6' : 'justify-start pb-24'} px-4 sm:px-6 mx-auto w-full responsive-zoom left-0 right-0`}
        style={{ 
          maxWidth: view === 'scoreboard' ? 'var(--gameplay-width)' : 'min(95vw, 985px)',
          margin: '0 auto'
        }}
      >
        <AnimatePresence mode="wait">
          {view === 'scoreboard' && (
            <motion.div
              key="scoreboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="flex flex-col flex-1 sm:flex-none w-full justify-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative flex flex-col gap-2 min-h-0 flex-1 justify-center"
              >
              {/* Score Cards Grid */}
              <div className="relative sm:flex-1 flex items-center justify-center w-full py-0 sm:py-2">
                <div className={`grid gap-3 sm:gap-4 lg:gap-5 w-full ${deviceInfo.isLandscape ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  {[player1, player2].map((p, idx) => (
                      <div key={p.id} className="flex flex-col gap-1">
                        <motion.div
                          onClick={() => {
                            if (!p.isTurn) {
                              setPlayer1(prev => ({ ...prev, isTurn: p.id === '1' }));
                              setPlayer2(prev => ({ ...prev, isTurn: p.id === '2' }));
                              resetTimer();
                            }
                          }}
                          className={`relative p-2 sm:p-4 lg:p-6 ${idx === 0 || idx === 1 ? 'rounded-b-3xl sm:rounded-3xl' : 'rounded-3xl'} border-2 transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl flex flex-col justify-center gameplay-card sm:min-h-0 sm:max-h-none`}
                          style={{ 
                            borderColor: p.color,
                            backgroundColor: p.bgColor,
                            boxShadow: `0 0 40px -15px ${p.color}66`
                          }}
                        >
                            {/* Mobile Score Buttons - Absolute Positioned */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                incrementScore(p.id);
                              }}
                              className={`sm:hidden absolute top-2 ${idx === 0 ? 'left-2' : 'right-2'} w-12 h-12 text-slate-950 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-lg z-10`}
                              style={{ 
                                backgroundColor: p.color,
                                boxShadow: `0 4px 10px -2px ${p.color}66`
                              }}
                            >
                              <Plus className="w-6 h-6 font-bold" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                decrementScore(p.id);
                              }}
                              className={`sm:hidden absolute bottom-2 ${idx === 0 ? 'left-2' : 'right-2'} w-12 h-12 bg-slate-800/80 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-95 z-10 border border-slate-700`}
                            >
                              <Minus className="w-5 h-5" />
                            </button>

                          <div className="flex flex-col items-center gap-0 sm:gap-6">
                          {isEditingNames ? (
                            <input
                              type="text"
                              value={p.name}
                              placeholder={`PLAYER ${idx + 1} NAME`}
                              onChange={(e) => idx === 0 ? setPlayer1({...p, name: e.target.value}) : setPlayer2({...p, name: e.target.value})}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-center font-bold focus:outline-none focus:border-emerald-500 uppercase"
                              style={{ 
                                color: p.color,
                                fontSize: `${sharedPlayerNameFontSize}px`
                              }}
                            />
                          ) : (
                            p.name && (
                              <h2 
                                className="font-bold uppercase truncate w-full text-center leading-none sm:leading-normal" 
                                style={{ 
                                  color: p.color,
                                  fontSize: `${sharedPlayerNameFontSize}px`
                                }}
                              >
                                {p.name}
                              </h2>
                            )
                          )}

                          <div className="relative group mt-[-4px] sm:mt-0">
                            <span className="text-[min(16vw,48px)] sm:text-[min(10rem,25vh)] lg:text-[min(12rem,30vh)] font-black tracking-tighter tabular-nums leading-none" style={{ color: p.color }}>
                              {p.score}
                            </span>
                          </div>

                          {/* Desktop Score Buttons */}
                          <div className="hidden sm:flex items-center gap-3 w-full max-w-[200px] sm:max-w-none">
                            <button
                              onClick={() => decrementScore(p.id)}
                              className="flex-1 h-8 sm:h-[min(4rem,10vh)] bg-slate-800 hover:bg-slate-700 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                            >
                              <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                incrementScore(p.id);
                              }}
                              className="flex-[2] h-8 sm:h-[min(4rem,10vh)] text-slate-950 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg"
                              style={{ 
                                backgroundColor: p.color,
                                boxShadow: `0 10px 15px -3px ${p.color}33`
                              }}
                            >
                              <Plus className="w-5 h-5 sm:w-6 sm:h-6 font-bold" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>

                {/* Finish Match Button - Centered between cards */}
                <AnimatePresence>
                  {view === 'scoreboard' && (
                    <motion.div 
                      ref={finishButtonRef}
                      key="finish-button"
                      drag
                      dragMomentum={false}
                      onDragEnd={() => {
                        if (finishButtonRef.current) {
                          const rect = finishButtonRef.current.getBoundingClientRect();
                          setFinishButtonPosition({ x: rect.left, y: rect.top });
                        }
                      }}
                      initial={finishButtonPosition || { 
                        x: windowSize.width / 2 - halfW, 
                        y: windowSize.height / 2 - halfH 
                      }}
                      animate={finishButtonPosition ? { x: finishButtonPosition.x, y: finishButtonPosition.y } : {
                        x: windowSize.width / 2 - halfW,
                        y: windowSize.height / 2 - halfH
                      }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                      className="fixed z-[100] cursor-move pointer-events-auto touch-none"
                      style={{ left: 0, top: 0 }}
                    >
                      <button
                        onClick={finishMatch}
                        className="w-32 sm:w-48 h-10 sm:h-12 hover:bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black transition-all shadow-2xl border-2 active:scale-95"
                        style={{ 
                          border: '2px solid transparent',
                          backgroundImage: `linear-gradient(rgba(0,0,0,0.95), rgba(0,0,0,0.95)), linear-gradient(${deviceInfo.isPhone ? 'to bottom' : 'to right'}, ${player2.color}, ${player1.color})`,
                          backgroundOrigin: 'border-box',
                          backgroundClip: 'padding-box, border-box'
                        }}
                      >
                        <span className="leading-none uppercase tracking-wider">Finish Match</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}

          {view === 'teams' && (
            <motion.div
              key="teams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12 pb-10"
            >
              <div 
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-8 transition-all duration-500"
                style={{ 
                  borderBottom: '2px solid',
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
                }}
              >
                <div className="space-y-1">
                  <h2 className="text-4xl font-black uppercase tracking-tight text-white">Team Setup</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Configure your session players</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => setShowExportMenu(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all font-bold text-sm border-2"
                    style={{ 
                      borderColor: player2.color,
                      color: player2.color,
                      backgroundColor: player2.color + '11'
                    }}
                  >
                    <Download className="w-4 h-4" style={{ color: player2.color }} />
                    Export
                  </button>
                  <button 
                    onClick={uploadData}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all font-bold text-sm border-2"
                    style={{ 
                      borderColor: player2.color,
                      color: player2.color,
                      backgroundColor: player2.color + '11'
                    }}
                  >
                    <Upload className="w-4 h-4" style={{ color: player2.color }} />
                    Import
                  </button>
                  <button 
                    onClick={() => setShowClearTeamsConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all border-2"
                    style={{ 
                      borderColor: player2.color,
                      color: player2.color,
                      backgroundColor: player2.color + '11'
                    }}
                  >
                    <Trash2 className="w-4 h-4" style={{ color: player2.color }} />
                    Clear Team Data
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-10">
                {/* Team 1 Setup */}
                <div className="space-y-4 sm:space-y-8">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team 1 Name</label>
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <input 
                      value={team1Name} 
                      onChange={(e) => updateTeamData(e.target.value.toUpperCase(), team1Players, team2Name, team2Players)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-black border-2 rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-2xl font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl" 
                      style={{ borderColor: player1.color, fontSize: '16px' }}
                      placeholder="TEAM 1"
                    />
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Players</label>
                    <div className="space-y-2 sm:space-y-3">
                      {team1Players.map((player, idx) => (
                        <div key={idx} className="flex gap-2 sm:gap-3 group">
                          <div 
                            className="w-8 sm:w-10 h-10 sm:h-12 flex items-center justify-center text-[10px] sm:text-xs font-black bg-black border-2 rounded-lg sm:rounded-xl"
                            style={{ borderColor: player1.color + '33', color: player1.color }}
                          >
                            {idx + 1}
                          </div>
                          <div className="relative flex-1 group">
                            <input 
                              value={player}
                              autoFocus={idx === team1Players.length - 1 && player === ''}
                              onChange={(e) => {
                                const newPlayers = [...team1Players];
                                newPlayers[idx] = e.target.value.toUpperCase();
                                updateTeamData(team1Name, newPlayers, team2Name, team2Players);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-black/50 border rounded-lg sm:rounded-xl pl-2 sm:pl-4 pr-10 sm:pr-14 py-2 text-slate-100 focus:outline-none uppercase font-bold transition-all"
                              style={{ borderColor: player1.color + '22', fontSize: '16px' }}
                              placeholder={`P${idx + 1}`}
                            />
                            <button 
                              onClick={() => {
                                const newPlayers = team1Players.filter((_, i) => i !== idx);
                                updateTeamData(team1Name, newPlayers, team2Name, team2Players);
                              }}
                              className="absolute right-0 top-0 h-full px-2 sm:px-4 text-red-500 hover:bg-red-500/10 rounded-r-lg sm:rounded-r-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => updateTeamData(team1Name, [...team1Players, ''], team2Name, team2Players)}
                        className="w-full py-2 sm:py-4 border-2 border-dashed rounded-xl sm:rounded-2xl text-slate-500 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm font-black uppercase tracking-widest"
                        style={{ 
                          borderColor: player1.color + '33', 
                          color: player1.color,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = player1.color + '11';
                          e.currentTarget.style.borderColor = player1.color + '66';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = player1.color + '33';
                        }}
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team 2 Setup */}
                <div className="space-y-4 sm:space-y-8">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Team 2 Name</label>
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <input 
                      value={team2Name} 
                      onChange={(e) => updateTeamData(team1Name, team1Players, e.target.value.toUpperCase(), team2Players)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-black border-2 rounded-xl sm:rounded-2xl px-3 sm:px-6 py-2 sm:py-4 text-sm sm:text-2xl font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl" 
                      style={{ borderColor: player2.color, fontSize: '16px' }}
                      placeholder="TEAM 2"
                    />
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Players</label>
                    <div className="space-y-2 sm:space-y-3">
                      {team2Players.map((player, idx) => (
                        <div key={idx} className="flex gap-2 sm:gap-3 group">
                          <div 
                            className="w-8 sm:w-10 h-10 sm:h-12 flex items-center justify-center text-[10px] sm:text-xs font-black bg-black border-2 rounded-lg sm:rounded-xl"
                            style={{ borderColor: player2.color + '33', color: player2.color }}
                          >
                            {idx + 1}
                          </div>
                          <div className="relative flex-1 group">
                            <input 
                              value={player}
                              autoFocus={idx === team2Players.length - 1 && player === ''}
                              onChange={(e) => {
                                const newPlayers = [...team2Players];
                                newPlayers[idx] = e.target.value.toUpperCase();
                                updateTeamData(team1Name, team1Players, team2Name, newPlayers);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-black/50 border rounded-lg sm:rounded-xl pl-2 sm:pl-4 pr-10 sm:pr-14 py-2 text-slate-100 focus:outline-none uppercase font-bold transition-all"
                              style={{ borderColor: player2.color + '22', fontSize: '16px' }}
                              placeholder={`P${idx + 1}`}
                            />
                            <button 
                              onClick={() => {
                                const newPlayers = team2Players.filter((_, i) => i !== idx);
                                updateTeamData(team1Name, team1Players, team2Name, newPlayers);
                              }}
                              className="absolute right-0 top-0 h-full px-2 sm:px-4 text-red-500 hover:bg-red-500/10 rounded-r-lg sm:rounded-r-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => updateTeamData(team1Name, team1Players, team2Name, [...team2Players, ''])}
                        className="w-full py-2 sm:py-4 border-2 border-dashed rounded-xl sm:rounded-2xl text-slate-500 transition-all flex items-center justify-center gap-2 text-[10px] sm:text-sm font-black uppercase tracking-widest"
                        style={{ 
                          borderColor: player2.color + '33', 
                          color: player2.color,
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = player2.color + '11';
                          e.currentTarget.style.borderColor = player2.color + '66';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.borderColor = player2.color + '33';
                        }}
                      >
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Results Table */}
              <div id="matchups-table" className="space-y-6 pt-8 border-t-2" style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white whitespace-pre-wrap">Match  Results  Table</h3>
                </div>
                <div className="bg-black border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto scrollbar-hide">
                    <table 
                      className="w-full text-left border-collapse table-fixed"
                    >
                      <thead>
                        <tr className="bg-slate-900/80 border-b-2 border-slate-800 font-black">
                          <th className="hidden sm:table-cell px-3 sm:px-6 py-4 text-[15px] uppercase tracking-[0.2em] text-slate-400 w-[8%]">No.</th>
                          <th className="px-1 sm:px-6 py-4 text-xs sm:text-[15px] uppercase tracking-widest text-white w-[27%] sm:w-[22%]">
                            <div className="truncate">{team1Name || 'TEAM A'}</div>
                          </th>
                          <th className="px-0.5 sm:px-6 py-4 text-xs sm:text-[15px] uppercase tracking-widest text-slate-600 text-center w-[12%] sm:w-[8%]">VS</th>
                          <th className="px-1 sm:px-6 py-4 text-xs sm:text-[15px] uppercase tracking-widest text-white w-[27%] sm:w-[22%]">
                            <div className="truncate">{team2Name || 'TEAM B'}</div>
                          </th>
                          <th className="px-1 sm:px-6 py-4 text-xs sm:text-[15px] uppercase tracking-widest text-slate-400 w-[24%] sm:w-[17%]">Result</th>
                          <th className="px-1 sm:px-6 py-4 text-xs sm:text-[15px] uppercase tracking-widest text-slate-400 text-right w-[10%] sm:w-[8%]">Clear Score</th>
                          <th className="hidden sm:table-cell px-3 sm:px-6 py-4 text-[15px] uppercase tracking-widest text-slate-400 w-[15%]">TIMERS</th>
                        </tr>
                      </thead>
                    <tbody>
                      {Math.max(team1Players.length, team2Players.length) === 0 ? (
                        <tr>
                          <td colSpan={windowSize.width < 640 ? 5 : 7} className="px-6 py-12 text-center text-slate-500 italic">Add players to generate matchups.</td>
                        </tr>
                      ) : (
                        <>
                          {Array.from({ length: Math.max(team1Players.length, team2Players.length) }).map((_, idx) => {
                            const p1 = team1Players[idx];
                            const p2 = team2Players[idx];
                            
                            // Skip if both are empty (don't show "empty vs empty" rows)
                            if (!p1 && !p2) return null;

                            const p1Name = p1 || `PLAYER ${idx + 1}`;
                            const p2Name = p2 || `PLAYER ${idx + 1}`;
                            const lastMatch = getMatchResult(p1Name, p2Name);
                            
                            return (
                              <tr 
                                key={idx} 
                                onClick={() => selectTeamMatch(idx)}
                                className={`group cursor-pointer transition-colors hover:bg-emerald-500/5 ${selectedMatchIndex === idx ? 'bg-emerald-500/10' : ''}`}
                              >
                                <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-xs font-black text-slate-600">#{idx + 1}</td>
                                <td className="px-1 sm:px-6 py-4 text-[10px] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors truncate">
                                  {p1 || <span className="text-slate-700 italic">EMPTY</span>}
                                </td>
                                <td className="px-0.5 sm:px-6 py-4 text-center text-slate-700 font-black text-[8px]">VS</td>
                                <td className="px-1 sm:px-6 py-4 text-[10px] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors truncate">
                                  {p2 || <span className="text-slate-700 italic">EMPTY</span>}
                                </td>
                                <td className="px-1 sm:px-6 py-4">
                                  {lastMatch ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                                      <span className={`text-[8px] sm:text-xs font-bold px-1 py-0.5 rounded w-fit ${lastMatch.winner === p1Name ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                        {lastMatch.score1}-{lastMatch.score2}
                                      </span>
                                      <span className="text-[6px] sm:text-[10px] text-slate-600 font-bold uppercase whitespace-nowrap">{new Date(lastMatch.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[8px] text-slate-700 font-bold uppercase">NONE</span>
                                  )}
                                </td>
                                <td className="px-1 sm:px-6 py-4 text-right w-10 sm:w-auto">
                                  {lastMatch && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        clearMatchResult(p1Name, p2Name);
                                      }}
                                      className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="Clear Result"
                                    >
                                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                    </button>
                                  )}
                                </td>
                                <td className="hidden sm:table-cell px-3 sm:px-6 py-4">
                                  {lastMatch && (lastMatch.shotClockSetting || lastMatch.matchClockRemaining !== undefined) ? (
                                    <div className="flex flex-col gap-0.5">
                                      {lastMatch.shotClockSetting && <span className="text-[9px] font-bold text-slate-500">SHOT: {lastMatch.shotClockSetting}S</span>}
                                      {lastMatch.matchClockRemaining !== undefined && <span className="text-[9px] font-bold text-slate-500">MATCH: {formatTime(lastMatch.matchClockRemaining)}</span>}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-600 font-bold uppercase">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Totals Row */}
                          <tr className="bg-slate-900/80 border-t-2 border-slate-800 font-black">
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-emerald-500">Total Score</td>
                            <td className="px-1 sm:px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-base sm:text-2xl text-emerald-400 tabular-nums">{teamTotals.t1}</span>
                                <span className="text-[6px] text-slate-500 uppercase tracking-tighter truncate max-w-[60px] sm:max-w-none">{team1Name}</span>
                              </div>
                            </td>
                            <td className="px-0.5 sm:px-6 py-4 text-center text-slate-700 font-black text-[8px] w-4 sm:w-8">SUM</td>
                            <td className="px-1 sm:px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-base sm:text-2xl text-emerald-400 tabular-nums">{teamTotals.t2}</span>
                                <span className="text-[6px] text-slate-500 uppercase tracking-tighter truncate max-w-[60px] sm:max-w-none">{team2Name}</span>
                              </div>
                            </td>
                            <td colSpan={windowSize.width < 640 ? 1 : 2} className="px-1 sm:px-6 py-4">
                              <div className="flex flex-col items-end">
                                <span className="text-[6px] sm:text-[10px] text-slate-600 uppercase font-bold">Overall Lead</span>
                                <span className="text-[9px] sm:text-sm font-black text-slate-100 truncate max-w-full block">
                                  {teamTotals.t1 === teamTotals.t2 ? 'TIED' : 
                                   teamTotals.t1 > teamTotals.t2 ? `${team1Name} (+${teamTotals.t1 - teamTotals.t2})` : 
                                   `${team2Name} (+${teamTotals.t2 - teamTotals.t1})`}
                                </span>
                              </div>
                            </td>
                            <td className="px-1 sm:px-6 py-4 text-right w-10 sm:w-auto">
                              <button 
                                onClick={() => setShowTeamTotals(true)}
                                className="inline-flex w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 items-center justify-center border border-emerald-500/20 shrink-0 active:scale-95 transition-all hover:bg-emerald-500/20"
                              >
                                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                              </button>
                            </td>
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4" />
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12 pb-20"
            >
              <div 
                className="space-y-1 pb-8 transition-all duration-500"
                style={{ 
                  borderBottom: '2px solid',
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
                }}
              >
                <h2 className="text-4xl font-black uppercase tracking-tight text-white">Settings</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Customize your scoring experience</p>
              </div>

              <div className="space-y-12">
                <section className="space-y-6">
                  <h3 
                    className="text-[10px] font-black uppercase tracking-widest pb-2 border-b-2"
                    style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, color: player1.color }}
                  >
                    Player Customization
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    {[player1, player2].map((p, idx) => (
                      <div 
                        key={p.id} 
                        className="relative p-8 rounded-[32px] border-2 space-y-6 shadow-xl transition-all duration-500"
                        style={{ 
                          backgroundColor: p.bgColor,
                          borderColor: p.color,
                          boxShadow: `0 20px 50px -20px ${p.color}33`,
                          '--player-color': p.color 
                        } as React.CSSProperties}
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Player {idx + 1} Name</label>
                          <Palette className="w-4 h-4" style={{ color: p.color }} />
                        </div>
                        <input
                          type="text"
                          value={p.name}
                          placeholder={`PLAYER ${idx + 1} NAME`}
                          readOnly
                          className="w-full bg-slate-950/30 border border-white/10 rounded-2xl px-6 py-3 text-2xl font-black focus:outline-none uppercase transition-all cursor-not-allowed opacity-70"
                          style={{ 
                            borderColor: 'transparent',
                            outline: 'none',
                            boxShadow: 'none'
                          }}
                        />
                        <div className="space-y-6">
                          <ColorPicker
                            label="Text & Border"
                            value={p.color}
                            onChange={(color) => idx === 0 ? setPlayer1({...p, color}) : setPlayer2({...p, color})}
                            colors={THEME_COLORS}
                            icon={<Palette className="w-4 h-4" />}
                            isOpen={activePicker === `p${idx + 1}-theme`}
                            onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-theme` : null)}
                            themeColor={p.color}
                          />

                          <ColorPicker
                            label="Card Background"
                            value={p.bgColor}
                            onChange={(color) => idx === 0 ? setPlayer1({...p, bgColor: color}) : setPlayer2({...p, bgColor: color})}
                            colors={BACKGROUND_COLORS}
                            icon={<Layout className="w-4 h-4" />}
                            isOpen={activePicker === `p${idx + 1}-bg`}
                            onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-bg` : null)}
                            themeColor={p.color}
                          />

                          <div className="relative">
                            <ColorPicker
                              label="Screen Background"
                              value={p.screenColor}
                              onChange={(color) => idx === 0 ? setPlayer1({...p, screenColor: color}) : setPlayer2({...p, screenColor: color})}
                              colors={BACKGROUND_COLORS}
                              icon={<Maximize className="w-4 h-4" />}
                              isOpen={activePicker === `p${idx + 1}-screen`}
                              onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-screen` : null)}
                              themeColor={p.color}
                            />
                            {/* Screen Color Indicator Circle - 3rem (w-12 h-12) */}
                            <div 
                              className={`absolute w-12 h-12 rounded-full shadow-2xl transition-all duration-500 z-20 top-1/2 border-2 ${idx === 0 ? 'left-0' : 'right-0'}`}
                              style={{ 
                                backgroundColor: p.screenColor,
                                borderColor: p.color,
                                transform: `translateY(-50%) ${idx === 0 ? 'translateX(calc(-1 * var(--circle-offset)))' : 'translateX(var(--circle-offset))'}`,
                              } as any}
                              title="Screen Background Color"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 
                    className="text-[10px] font-black uppercase tracking-widest pb-2 border-b-2"
                    style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, color: player1.color }}
                  >
                    Master Match Clock
                  </h3>
                  <div 
                    className="bg-black/80 backdrop-blur-md border-2 rounded-[32px] p-8 space-y-8 shadow-xl" 
                    style={{ borderColor: player1.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xl font-black text-slate-200 uppercase tracking-tight">Enable Match Clock</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">A master countdown for the entire match.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsMatchClockEnabled(!isMatchClockEnabled);
                          if (isMatchClockEnabled) pauseTimer();
                        }}
                        className={`w-14 h-7 rounded-full transition-colors relative`}
                        style={{ backgroundColor: isMatchClockEnabled ? player1.color : '#334155' }}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isMatchClockEnabled ? 'left-8' : 'left-1'}`} />
                      </button>
                    </div>

                    {isMatchClockEnabled && (
                      <div className="space-y-6 pt-8 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Match Duration</label>
                          <span className="text-3xl font-mono font-black" style={{ color: player1.color }}>{Math.floor(matchClockDuration / 60)}m</span>
                        </div>
                        <input 
                          type="range" 
                          min="300" 
                          max="3600" 
                          step="300"
                          value={matchClockDuration}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setMatchClockDuration(val);
                            setMatchClock(val);
                          }}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                          style={{ accentColor: player1.color }}
                        />
                        <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                          <span>5m</span>
                          <span>30m</span>
                          <span>60m</span>
                        </div>
                        <button 
                          onClick={resetMatchClock}
                          className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Reset Match Clock
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 
                    className="text-[10px] font-black uppercase tracking-widest pb-2 border-b-2"
                    style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, color: player2.color }}
                  >
                    Shot Clock Settings
                  </h3>
                  <div 
                    className="bg-black/80 backdrop-blur-md border-2 rounded-[32px] p-8 space-y-8 shadow-xl" 
                    style={{ borderColor: player2.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xl font-black text-slate-200 uppercase tracking-tight">Enable Shot Clock</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Toggle the visibility and timer on the scoreboard.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setIsShotClockEnabled(!isShotClockEnabled);
                          if (isShotClockEnabled) pauseTimer();
                        }}
                        className={`w-14 h-7 rounded-full transition-colors relative`}
                        style={{ backgroundColor: isShotClockEnabled ? player2.color : '#334155' }}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${isShotClockEnabled ? 'left-8' : 'left-1'}`} />
                      </button>
                    </div>

                    {isShotClockEnabled && (
                      <div className="space-y-6 pt-8 border-t-2" style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-black text-slate-400 uppercase tracking-widest">Timer Duration</label>
                          <span className="text-3xl font-mono font-black" style={{ color: player2.color }}>{shotClockDuration}s</span>
                        </div>
                        <input 
                          type="range" 
                          min="10" 
                          max="120" 
                          step="5"
                          value={shotClockDuration}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setShotClockDuration(val);
                            setShotClock(val);
                          }}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                          style={{ accentColor: player2.color }}
                        />
                        <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                          <span>10s</span>
                          <span>60s</span>
                          <span>120s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 
                    className="text-[10px] font-black uppercase tracking-widest pb-2 border-b-2"
                    style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, color: player1.color }}
                  >
                    System Settings
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div 
                      className="bg-black/80 backdrop-blur-md border-2 rounded-[32px] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl"
                      style={{ borderColor: player1.color }}
                    >
                      <div className="space-y-1 text-center sm:text-left">
                        <p className="text-xl font-black text-slate-200 uppercase tracking-tight">Show Device Time</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Display a draggable clock on the gameplay screen.</p>
                      </div>
                      <button 
                        onClick={() => setShowDeviceTime(!showDeviceTime)}
                        className={`w-14 h-7 rounded-full transition-colors relative`}
                        style={{ backgroundColor: showDeviceTime ? player1.color : '#334155' }}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${showDeviceTime ? 'left-8' : 'left-1'}`} />
                      </button>
                    </div>

                    <div 
                      className="bg-black/80 backdrop-blur-md border-2 rounded-[32px] p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl"
                      style={{ borderColor: player1.color }}
                    >
                      <div className="space-y-1 text-center sm:text-left">
                        <p className="text-xl font-black text-slate-200 uppercase tracking-tight">Reset Settings</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Resets colors and clock settings to default.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setShowRestoreDefaultsConfirm(true);
                          setDeviceTimePosition(null);
                        }}
                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset Settings
                      </button>
                    </div>
                  </div>
                </section>

                <section className="pt-8">
                  <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-8 space-y-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <Server className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black uppercase tracking-tight text-white">API Configuration</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Outbound Tournament Data Sync</p>
                      </div>
                      {isApiLocked ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="password"
                            value={pinInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPinInput(val);
                              if (val === '90210') {
                                setIsApiLocked(false);
                                setPinInput('');
                              }
                            }}
                            placeholder="PIN"
                            className="w-20 bg-black border border-slate-800 rounded-xl px-3 py-2 text-center text-slate-100 focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                          />
                        </div>
                      ) : (
                        <button 
                          onClick={() => setIsApiLocked(true)}
                          className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {!isApiLocked ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target URL</label>
                          <input 
                            type="url"
                            value={apiConfig.url}
                            onChange={(e) => setApiConfig(prev => ({ ...prev, url: e.target.value }))}
                            placeholder="https://api.yourserver.com/sync"
                            className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">API Key</label>
                          <input 
                            type="password"
                            value={apiConfig.key}
                            onChange={(e) => setApiConfig(prev => ({ ...prev, key: e.target.value }))}
                            placeholder="Secret API Key"
                            className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-all font-mono"
                          />
                        </div>
                        <div className="pt-2 flex flex-col gap-3">
                          <button
                            onClick={async () => {
                              console.log('Test Connection clicked');
                              if (!apiConfig.url) {
                                setApiTestStatus({ type: 'error', message: 'Please enter a URL first.' });
                                return;
                              }
                              setIsApiSending(true);
                              setApiTestStatus({ type: 'idle', message: 'Testing...' });
                              try {
                                const testBody = JSON.stringify({ test: true, timestamp: formatDateUK(new Date(), true), type: 'connection_test' });
                                console.log('Testing connection to:', apiConfig.url);
                                const res = await fetch(apiConfig.url, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json', 'x-api-key': apiConfig.key },
                                  body: testBody
                                });
                                if (res.ok) {
                                  setApiTestStatus({ type: 'success', message: 'Success! Server responded with 200 OK.' });
                                } else {
                                  setApiTestStatus({ type: 'error', message: `Failed. Server responded with ${res.status}.` });
                                }
                              } catch (err) {
                                console.error('Test Connection Error:', err);
                                setApiTestStatus({ type: 'error', message: 'Connection failed. Check console for CORS/Network errors.' });
                              } finally {
                                setIsApiSending(false);
                              }
                            }}
                            disabled={isApiSending}
                            className="w-full h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all border border-slate-700 flex items-center justify-center gap-2"
                          >
                            {isApiSending ? (
                              <>
                                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <Zap className="w-3 h-3 text-amber-400" />
                                Test Connection
                              </>
                            )}
                          </button>

                          {apiTestStatus.type !== 'idle' && (
                            <motion.div 
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`p-3 rounded-xl text-[10px] font-bold border ${
                                apiTestStatus.type === 'success' 
                                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                  : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                              }`}
                            >
                              {apiTestStatus.message}
                            </motion.div>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase leading-relaxed">
                          This configuration enables the "Send to Server" option in the export menu. 
                          The payload is a full JSON representation of the current tournament state.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4 opacity-50">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                          <Layout className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Enter PIN to unlock API settings</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="pt-12">
                  <div 
                    className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-8 space-y-4 shadow-xl"
                  >
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Version</span>
                      <span className="font-mono" style={{ color: player1.color }}>0.6.9-pro</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Developer</span>
                      <span className="font-mono" style={{ color: player2.color }}>Stealthton</span>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Modals */}
        <AnimatePresence>
          {showClearTeamsConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-black border-2 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6"
                style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
              >
                <div className="flex items-center gap-4 text-red-500">
                  <Trash2 className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Clear Team Data?</h3>
                </div>
                <p className="text-slate-400">This will permanently delete team names, player lists, current scores, and match history. This action cannot be undone.</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowClearTeamsConfirm(false)}
                    className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={clearTeams}
                    className="flex-1 h-12 bg-red-500 hover:bg-red-400 text-slate-950 rounded-xl font-bold transition-all"
                  >
                    Clear Team Data
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {showExportMenu && (
            <div 
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowExportMenu(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-black border-2 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar"
                style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-emerald-500">
                    <Download className="w-8 h-8" />
                    <h3 className="text-xl font-bold uppercase tracking-tight">Export Tournament</h3>
                  </div>
                  <button 
                    onClick={() => setShowExportMenu(false)}
                    className="p-2 hover:bg-slate-800 rounded-full transition-all"
                  >
                    <X className="w-6 h-6 text-slate-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Format Toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <span className="font-bold uppercase tracking-widest text-xs text-slate-400">File Format</span>
                    <div className="flex bg-black p-1 rounded-xl border border-slate-800">
                      <button 
                        onClick={() => setExportFormat('csv')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${exportFormat === 'csv' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}
                      >
                        CSV
                      </button>
                      <button 
                        onClick={() => setExportFormat('json')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${exportFormat === 'json' ? 'bg-emerald-500 text-slate-950' : 'text-slate-500'}`}
                      >
                        JSON
                      </button>
                    </div>
                  </div>

                  {/* Export Methods */}
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { id: 'download', label: 'Download', icon: Download, desc: 'Save to device' },
                      { id: 'share', label: 'Share', icon: Share2, desc: 'Open system share' },
                      { id: 'server', label: 'Send to Server', icon: Server, desc: 'Upload to tournament server' }
                    ].map((method) => (
                      <button 
                        key={method.id}
                        onClick={() => {
                          const id = method.id as 'download' | 'share' | 'server';
                          setExportMethod(id);
                          if (id === 'server') {
                            setExportFormat('json');
                          } else if (id === 'download') {
                            setExportFormat('csv');
                          } else if (id === 'share') {
                            shareData(exportFormat);
                          }
                        }}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${exportMethod === method.id ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${exportMethod === method.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                          <method.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className={`font-black uppercase tracking-tight ${exportMethod === method.id ? 'text-emerald-500' : 'text-slate-200'}`}>{method.label}</div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{method.desc}</div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${exportMethod === method.id ? 'border-emerald-500' : 'border-slate-700'}`}>
                          {exportMethod === method.id && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
                        </div>
                      </button>
                    ))}
                  </div>

                </div>

                <button 
                  onClick={handleExportAction}
                  disabled={isApiSending}
                  className={`w-full h-16 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3 ${isApiSending ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'}`}
                >
                  {isApiSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      {exportMethod === 'download' && 'Download'}
                      {exportMethod === 'share' && 'Share'}
                      {exportMethod === 'server' && 'Upload to Server'}
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          )}

          {showRestoreDefaultsConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-black border-2 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6"
                style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
              >
                <div className="flex items-center gap-4 text-blue-500">
                  <RotateCcw className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Reset Settings?</h3>
                </div>
                <p className="text-slate-400">This will reset all player colors and clock settings to their original defaults. Your names, scores, and history will not be affected.</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowRestoreDefaultsConfirm(false)}
                    className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      // Restore User Preferences Only (Colors and Clocks)
                      setPlayer1(prev => ({ 
                        ...prev, 
                        color: '#FFFF33', 
                        bgColor: '#000000', 
                        screenColor: '#000000' 
                      }));
                      setPlayer2(prev => ({ 
                        ...prev, 
                        color: '#FF001C', 
                        bgColor: '#000000', 
                        screenColor: '#000000' 
                      }));
                      setShotClockDuration(SHOT_CLOCK_DEFAULT);
                      setIsShotClockEnabled(false);
                      setMatchClockDuration(600);
                      setIsMatchClockEnabled(false);
                      setPlayerPreferences({});
                      setMatchupSettings({});
                      setShowDeviceTime(true);
                      setDeviceTimePosition(null);
                      setMatchClockPosition(null);
                      setShotClockPosition(null);
                      setFinishButtonPosition(null);
                      setShowRestoreDefaultsConfirm(false);
                    }}
                    className="flex-1 h-12 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl font-bold transition-all"
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          {showClearHistoryConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-black border-2 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6"
                style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
              >
                <div className="flex items-center gap-4 text-red-500">
                  <Trash2 className="w-8 h-8" />
                  <h3 className="text-xl font-bold">Clear Match History?</h3>
                </div>
                <p className="text-slate-400">This will permanently delete all saved match results. This action cannot be undone.</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowClearHistoryConfirm(false)}
                    className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      clearHistory();
                      setShowClearHistoryConfirm(false);
                    }}
                    className="flex-1 h-12 bg-red-500 hover:bg-red-400 text-slate-950 rounded-xl font-bold transition-all"
                  >
                    Clear All
                  </button>
                </div>
              </motion.div>
            </div>
          )}
          {showTeamTotals && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div 
                initial={{ scale: !deviceInfo.isDesktop ? 0.5 : 0.8, opacity: 0, y: 20 }}
                animate={{ scale: !deviceInfo.isDesktop ? 0.7 : 1, opacity: 1, y: 0 }}
                exit={{ scale: !deviceInfo.isDesktop ? 0.5 : 0.8, opacity: 0, y: 20 }}
                className="bg-black border-2 p-6 sm:p-10 rounded-[30px] sm:rounded-[40px] max-w-2xl w-full space-y-6 sm:space-y-10 text-center"
                style={{ 
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`,
                  boxShadow: `0 0 50px ${player1.color}11`
                }}
              >
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="p-3 sm:p-4 rounded-full" style={{ backgroundColor: `${player1.color}11` }}>
                      <Trophy className="w-8 h-8 sm:w-12 sm:h-12" style={{ color: player1.color }} />
                    </div>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">Team Totals</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">Final Session Results</p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-8 items-center">
                  <div className="space-y-2 sm:space-y-4">
                    <p className="text-sm sm:text-xl font-black uppercase tracking-tight truncate px-1" style={{ color: player1.color }}>{team1Name || 'TEAM 1'}</p>
                    <p className="text-4xl sm:text-8xl font-black text-white tabular-nums">
                      {teamTotals.t1}
                    </p>
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <p className="text-sm sm:text-xl font-black uppercase tracking-tight truncate px-1" style={{ color: player2.color }}>{team2Name || 'TEAM 2'}</p>
                    <p className="text-4xl sm:text-8xl font-black text-white tabular-nums">
                      {teamTotals.t2}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setShowTeamTotals(false);
                    setView('teams');
                  }}
                  className="w-full h-14 sm:h-20 text-slate-950 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-2xl uppercase tracking-widest transition-all active:scale-95"
                  style={{ 
                    backgroundImage: `linear-gradient(to right, ${player1.color}, ${player2.color})`,
                    boxShadow: `0 10px 20px ${player1.color}33`
                  }}
                >
                  Close Results
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.main>

      {/* Navigation Bar Spacing for history view */}
      {view !== 'scoreboard' && view !== 'teams' && view !== 'settings' && <div className="h-16 lg:h-32" />}

      {/* Quick Actions Floating Bar (Mobile) */}
      <AnimatePresence>
        {view !== 'scoreboard' && view !== 'teams' && view !== 'settings' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/90 backdrop-blur-xl border-2 p-2 rounded-2xl shadow-2xl md:hidden z-50 bar-zoom"
            style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
          >
            <button 
              onClick={navigateToScoreboard}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'scoreboard' ? 'text-slate-950' : 'text-slate-400'}`}
              style={view === 'scoreboard' ? { backgroundColor: player1.color } : {}}
            >
              Score
            </button>
            <button 
              onClick={() => setView('teams')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'teams' ? 'text-slate-950' : 'text-slate-400'}`}
              style={view === 'teams' ? { backgroundColor: player1.color } : {}}
            >
              Teams
            </button>
            <button 
              onClick={() => setView('settings')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === 'settings' ? 'text-slate-950' : 'text-slate-400'}`}
              style={view === 'settings' ? { backgroundColor: player2.color } : {}}
            >
              Settings
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
