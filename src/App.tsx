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
  Clock,
  FileText,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, MatchHistoryEntry, MatchupSettings, FrameDetail } from './types';
import { 
  THEME_COLORS, 
  BACKGROUND_COLORS, 
  POOL_BALLS, 
  CLOTH_COLORS, 
  SPEED_CLOTH_COLORS, 
  DIAL_COLORS 
} from './constants';
import { ColorPicker } from './components/ColorPicker';

const SHOT_CLOCK_DEFAULT = 30;

export default function App() {
  // --- State ---
  const [player1, setPlayer1] = useState<Player>({ id: '1', name: '', score: 0, isTurn: true, color: '#FFFF33', bgColor: '#000000', screenColor: '#000000', bgStyle: 'default', screenStyle: 'default' });
  const [player2, setPlayer2] = useState<Player>({ id: '2', name: '', score: 0, isTurn: false, color: '#FF001C', bgColor: '#000000', screenColor: '#000000', bgStyle: 'default', screenStyle: 'default' });
  const [matchupSettings, setMatchupSettings] = useState<Record<number, MatchupSettings>>({});
  const [playerPreferences, setPlayerPreferences] = useState<Record<string, { color: string, bgColor: string, screenColor: string }>>({});
  const [team1Name, setTeam1Name] = useState<string>('');
  const [team2Name, setTeam2Name] = useState<string>('');
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [currentMatchFrameDetails, setCurrentMatchFrameDetails] = useState<FrameDetail[]>([]);
  const [viewingMatchDetailsId, setViewingMatchDetailsId] = useState<string | null>(null);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [view, setView] = useState<'scoreboard' | 'history' | 'settings' | 'teams' | 'match-details'>('scoreboard');
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [windowSize, setWindowSize] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768 
  });
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTeamTotals, setShowTeamTotals] = useState(false);
  const [isBreakTrackingEnabled, setIsBreakTrackingEnabled] = useState(true);
  const [currentBreakPlayerId, setCurrentBreakPlayerId] = useState<'1' | '2' | 'none'>('none');
  const [showRestoreDefaultsConfirm, setShowRestoreDefaultsConfirm] = useState(false);
  const [exportMethod, setExportMethod] = useState<'download' | 'share' | 'server'>('download');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportEmail, setExportEmail] = useState('');
  const [apiConfig, setApiConfig] = useState({ url: '', key: '' });
  const [isApiLocked, setIsApiLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [isApiSending, setIsApiSending] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [matchStartTime, setMatchStartTime] = useState<string | null>(null);
  const [showDeviceTime, setShowDeviceTime] = useState(true);
  const [deviceTimePosition, setDeviceTimePosition] = useState<{ x: number, y: number } | null>(null);
  const [matchClockPosition, setMatchClockPosition] = useState<{ x: number, y: number } | null>(null);
  const [shotClockPosition, setShotClockPosition] = useState<{ x: number, y: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const frameStartTimeRef = useRef<number>(Date.now());
  const isKeyboardOpenRef = useRef(false);
  const clockRef = useRef<HTMLDivElement>(null);
  const matchClockRef = useRef<HTMLDivElement>(null);
  const shotClockRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(timeInterval);
    };
  }, []);

  // Robust device detection based on User-Agent and screen width
  const deviceInfo = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    
    // We prioritize height for scaling tiers in landscape-intended apps.
    // Screens below 768px wide OR below 500px tall are treated as phone for compact top bars.
    const isPhone = windowSize.width < 768 || windowSize.height < 500;
    const isTablet = !isPhone && windowSize.width < 1024;
    const isDesktop = !isPhone && !isTablet;
    const isLandscape = windowSize.width > windowSize.height;
    const isPortrait = windowSize.width <= windowSize.height;
    const aspectRatioHW = windowSize.height / windowSize.width;
    const isCloserTo1_1Than1_2 = aspectRatioHW > 0.75;
    const shouldHideDeviceTime = isPortrait || isCloserTo1_1Than1_2 || !showDeviceTime;

    const isShort = windowSize.height < 500;

    // Unified title sizes based on device
    const titleSizes = {
      page: isPhone ? '6.655vh' : (isTablet ? '5.324vh' : '4.84vh'),
      subtitle: isPhone ? '3.5vh' : (isTablet ? '2.5vh' : '1.8vh'),
      section: isPhone ? '6.05vh' : (isTablet ? '4.84vh' : '4.4vh'),
      tile: isPhone ? '5.5vh' : (isTablet ? '4.4vh' : '4.0vh'),
      tileDesc: isPhone ? '3.3vh' : (isTablet ? '2.6vh' : '2.0vh')
    };

    return { isPhone, isTablet, isDesktop, isLandscape, isPortrait, isShort, shouldHideDeviceTime, titleSizes };
  }, [windowSize.width, windowSize.height, showDeviceTime]); 

  // Calculate shared font size for team names to occupy 95% of vertical space
  const sharedTeamNameFontSize = useMemo(() => {
    const topBarHeightVal = deviceInfo.isPhone ? windowSize.height * 0.16 : windowSize.height * 0.1;
    const topBarHeight = (deviceInfo.isPhone && !isNavVisible) ? 0 : topBarHeightVal;
    const availableHeight = windowSize.height - topBarHeight;
    const targetHeight = availableHeight * 0.9;
    
    const getFontSize = (name: string) => {
      const len = Math.max(1, name.length);
      const scale = 0.95; // Safely fit within target height
      return (targetHeight * scale) / len;
    };

    const fs1 = getFontSize(team1Name);
    const fs2 = getFontSize(team2Name);
    const shared = Math.min(fs1, fs2);

    const sidebarWidth = deviceInfo.isPhone ? (windowSize.width * 0.12) : (windowSize.width < 1024 ? (windowSize.width * 0.08) : (windowSize.width * 0.08));
    const maxFs = sidebarWidth * (deviceInfo.isPhone ? 1.2 : 1.05);

    return `${(Math.min(shared, maxFs) / windowSize.width) * 100}vw`;
  }, [windowSize.height, windowSize.width, team1Name, team2Name, deviceInfo, isNavVisible]);

  const sharedPlayerNameFontSize = useMemo(() => {
    const sidebarWidth = deviceInfo.isPhone ? (windowSize.width * 0.12) : (windowSize.width < 1024 ? (windowSize.width * 0.08) : (windowSize.width * 0.08));
    const mainPadding = deviceInfo.isPhone ? (windowSize.width * 0.04) : (windowSize.width < 1024 ? (windowSize.width * 0.05) : (windowSize.width * 0.04));
    let availableWidth = windowSize.width - (sidebarWidth * 2) - mainPadding;
    
    if (windowSize.width >= 1024) {
      availableWidth = Math.min(windowSize.width * 0.8, availableWidth);
    }

    let cardWidth;
    if (deviceInfo.isLandscape) {
      const gap = deviceInfo.isPhone ? (windowSize.width * 0.03) : (windowSize.width * 0.02);
      cardWidth = (availableWidth - gap) / 2;
    } else {
      cardWidth = availableWidth;
    }
    
    const cardPadding = deviceInfo.isPhone ? (windowSize.width * 0.04) : (windowSize.width < 1024 ? (windowSize.width * 0.03) : (windowSize.width * 0.04));
    const targetWidth = cardWidth - cardPadding;

    const getFontSize = (name: string) => {
      const len = Math.max(1, (name || "PLAYER").length);
      const scale = deviceInfo.isPhone ? 1.5 : 1.2;
      return (targetWidth * scale) / len;
    };

    const fs1 = getFontSize(player1.name);
    const fs2 = getFontSize(player2.name);
    const shared = Math.min(fs1, fs2);

    // Coordinate max font size with the TeamName scale (~14.4vw Phone, ~8.4vw Tablet/Desktop) - Reduced by another 20% from previous reduction
    const maxFs = sidebarWidth * (deviceInfo.isPhone ? 0.768 : 0.672);
    
    return `${(Math.min(shared, maxFs) / windowSize.width) * 100}vw`;
  }, [windowSize.width, player1.name, player2.name, deviceInfo]);

  const labelFontSize = useMemo(() => {
    // We want 1pt bigger than Teamname field.
    // teamEntryStyle baseFs: Phone: 6, Tablet: 4, Desktop: 3
    const offset = 0.5; 
    if (deviceInfo.isPhone) return `${(6 + offset)}vh`;
    if (deviceInfo.isTablet) return `${(4 + offset)}vh`;
    return `${(3 + offset)}vh`;
  }, [deviceInfo]);

  const playerPrefLabelFontSize = useMemo(() => {
    // 0.6x of the standard label font size
    const base = parseFloat(labelFontSize);
    const unit = labelFontSize.includes('vh') ? 'vh' : 'vw';
    return `${base * 0.6}${unit}`;
  }, [labelFontSize]);

  const settingsLabelFontSize = useMemo(() => {
    const offset = 0.5; 
    const baseScale = 1.4;
    if (deviceInfo.isPhone) return `${(6 + offset) * baseScale}vh`;
    if (deviceInfo.isTablet) return `${(4 + offset) * baseScale}vh`;
    return `${(3 + offset) * baseScale}vh`;
  }, [deviceInfo]);

  const teamEntryStyle = useMemo(() => {
    const baseFs = deviceInfo.isPhone ? 6 : (deviceInfo.isTablet ? 4 : 3);
    const fs = `${baseFs}vh`;
    const style: React.CSSProperties = { fontSize: fs };
    
    // Generous padding for all devices
    const vPad = deviceInfo.isPhone ? '1.5vh' : (deviceInfo.isTablet ? '2vh' : '2.5vh');
    const hPad = deviceInfo.isPhone ? '4vw' : (deviceInfo.isTablet ? '3vw' : '2vw');
    style.paddingTop = vPad;
    style.paddingBottom = vPad;
    style.paddingLeft = hPad;
    style.paddingRight = hPad;
    style.lineHeight = '1.2';
    
    return style;
  }, [deviceInfo]);

  const playerEntryStyle = useMemo(() => {
    const baseFs = deviceInfo.isPhone ? 6 : (deviceInfo.isTablet ? 4 : 3);
    const fs = `${baseFs}vh`;
    const style: React.CSSProperties = { fontSize: fs };
    
    // Reduced padding for cleaner look as requested
    const vPad = deviceInfo.isPhone ? '1.5vh' : (deviceInfo.isTablet ? '2vh' : '2.5vh');
    style.paddingTop = vPad;
    style.paddingBottom = vPad;
    style.paddingLeft = deviceInfo.isPhone ? '1vw' : '0.75vw';
    style.lineHeight = '1.2';
    
    return style;
  }, [deviceInfo]);

  const entryTotalHeight = useMemo(() => {
    const baseFs = deviceInfo.isPhone ? 6 : (deviceInfo.isTablet ? 4 : 3);
    const vPadValue = deviceInfo.isPhone ? 1.5 : (deviceInfo.isTablet ? 2 : 2.5);
    return `${(baseFs * 1.2) + (vPadValue * 2)}vh`;
  }, [deviceInfo]);

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
          const topBar = document.querySelector('nav');
          const headerHeight = topBar ? topBar.getBoundingClientRect().height : (deviceInfo.isPhone ? window.innerHeight * 0.16 : window.innerHeight * 0.1);
          const elementPosition = table.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerHeight - (window.innerHeight * 0.03); // 3vh extra buffer for breathing room

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
        const settings = matchupSettings[i];
        const match = getMatchResult(p1Name, p2Name);
        
        let m1 = settings?.score1 ?? 0;
        let m2 = settings?.score2 ?? 0;
        
        if (m1 === 0 && m2 === 0 && match) {
          if (match.player1 === p1Name) {
            m1 = match.score1;
            m2 = match.score2;
          } else {
            m1 = match.score2;
            m2 = match.score1;
          }
        }
        
        t1 += m1;
        t2 += m2;
      }
    }
    return { t1, t2 };
  }, [team1Players, team2Players, matchHistory, selectedMatchIndex, player1.score, player2.score, matchupSettings]);

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
      
      const selIndex = state.gameData?.selectedMatchIndex !== undefined ? state.gameData.selectedMatchIndex : null;
      if (selIndex !== null) setSelectedMatchIndex(selIndex);
      
      if (state.gameData?.shotClock !== undefined) setShotClock(state.gameData.shotClock);
      if (state.gameData?.matchClock !== undefined) setMatchClock(state.gameData.matchClock);
      if (state.gameData?.matchStartTime !== undefined) setMatchStartTime(state.gameData.matchStartTime);
      if (state.gameData?.currentMatchFrameDetails !== undefined) setCurrentMatchFrameDetails(state.gameData.currentMatchFrameDetails);

      // Prepare Player Objects
      let p1 = { ...player1 };
      let p2 = { ...player2 };

      // Load Preferences first
      if (state.userPreferences) {
        if (state.userPreferences.shotClockDuration !== undefined) setShotClockDuration(state.userPreferences.shotClockDuration);
        if (state.userPreferences.isShotClockEnabled !== undefined) setIsShotClockEnabled(state.userPreferences.isShotClockEnabled);
        if (state.userPreferences.matchClockDuration !== undefined) setMatchClockDuration(state.userPreferences.matchClockDuration);
        if (state.userPreferences.isMatchClockEnabled !== undefined) setIsMatchClockEnabled(state.userPreferences.isMatchClockEnabled);
        
        // Force break tracking to enabled for this version if it hasn't been explicitly migrated/toggled in this update session
        const forceEnabled = !state.userPreferences.breakTrackingV2Applied;
        if (forceEnabled) {
          setIsBreakTrackingEnabled(true);
        } else if (state.userPreferences.isBreakTrackingEnabled !== undefined) {
          setIsBreakTrackingEnabled(state.userPreferences.isBreakTrackingEnabled);
        }
        
        if (state.userPreferences.currentBreakPlayerId !== undefined) {
          // Only load saved breaker if there is an active score, otherwise default to "none" (Ready state)
          const hasActiveScore = (state.gameData?.player1Score || 0) > 0 || (state.gameData?.player2Score || 0) > 0;
          setCurrentBreakPlayerId(hasActiveScore ? state.userPreferences.currentBreakPlayerId : 'none');
        }
        
        if (state.userPreferences.player1) {
          p1 = { 
            ...p1, 
            ...state.userPreferences.player1,
            color: state.userPreferences.player1.borderColor || state.userPreferences.player1.color || p1.color
          };
        }
        if (state.userPreferences.player2) {
          p2 = { 
            ...p2, 
            ...state.userPreferences.player2,
            color: state.userPreferences.player2.borderColor || state.userPreferences.player2.color || p2.color
          };
        }
      } else {
        // Legacy Player Settings
        const p1Legacy = JSON.parse(localStorage.getItem('pool_player1_settings') || 'null');
        const p2Legacy = JSON.parse(localStorage.getItem('pool_player2_settings') || 'null');
        if (p1Legacy) p1 = { ...p1, ...p1Legacy };
        if (p2Legacy) p2 = { ...p2, ...p2Legacy };
      }

      // Add scores from gameData
      if (state.gameData?.player1Score !== undefined) p1.score = state.gameData.player1Score;
      if (state.gameData?.player2Score !== undefined) p2.score = state.gameData.player2Score;

      // Update state once
      setPlayer1(p1);
      setPlayer2(p2);

      // Load Other Data
      if (state.matchupSettings) setMatchupSettings(state.matchupSettings);
      if (state.playerPreferences) setPlayerPreferences(state.playerPreferences);
      if (state.apiConfig) setApiConfig(state.apiConfig);
      
      if (state.userPreferences?.view !== undefined) setView(state.userPreferences.view);
      if (state.userPreferences?.isNavVisible !== undefined) setIsNavVisible(state.userPreferences.isNavVisible);
      if (state.userPreferences?.showDeviceTime !== undefined) setShowDeviceTime(state.userPreferences.showDeviceTime);
      if (state.userPreferences?.deviceTimePosition !== undefined) setDeviceTimePosition(state.userPreferences.deviceTimePosition);
      if (state.userPreferences?.matchClockPosition !== undefined) setMatchClockPosition(state.userPreferences.matchClockPosition);
      if (state.userPreferences?.shotClockPosition !== undefined) setShotClockPosition(state.userPreferences.shotClockPosition);

      // Finalize loading after state updates are scheduled
      setTimeout(() => setIsLoaded(true), 10);
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      setIsLoaded(true);
    }
  }, []);

  // --- Persistence (Single JSON Source) ---
  const saveState = useCallback(() => {
    if (!isLoaded) return;

    const stateToSave = {
      teamData: { team1Name, team2Name, team1Players, team2Players },
      gameData: { 
        matchHistory, 
        player1Score: player1.score, 
        player2Score: player2.score, 
        selectedMatchIndex, 
        shotClock, 
        matchClock,
        matchStartTime,
        currentMatchFrameDetails
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
        isBreakTrackingEnabled,
        breakTrackingV2Applied: true,
        currentBreakPlayerId,
        view,
        isNavVisible,
        showDeviceTime,
        deviceTimePosition,
        matchClockPosition,
        shotClockPosition
      },
      matchupSettings,
      playerPreferences,
      apiConfig
    };
    localStorage.setItem('pool_app_state', JSON.stringify(stateToSave));
  }, [
    isLoaded,
    team1Name, team2Name, team1Players, team2Players,
    matchHistory, player1, player2, selectedMatchIndex, shotClock, matchClock,
    shotClockDuration, isShotClockEnabled, matchClockDuration, isMatchClockEnabled,
    isBreakTrackingEnabled, currentBreakPlayerId, matchStartTime, currentMatchFrameDetails,
    view, isNavVisible,
    showDeviceTime, deviceTimePosition, matchClockPosition, shotClockPosition,
    matchupSettings, playerPreferences, apiConfig
  ]);

  useEffect(() => {
    saveState();
  }, [saveState]);

  // Window-level safety save
  useEffect(() => {
    const handleUnload = () => saveState();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [saveState]);

  // Handle scrolling to top when switching to match details
  useEffect(() => {
    if (view === 'match-details') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view]);

  // Sync current player preferences when they change
  useEffect(() => {
    if (selectedMatchIndex !== null) {
      setMatchupSettings(prev => ({
        ...prev,
        [selectedMatchIndex]: {
          player1: { color: player1.color, bgColor: player1.bgColor, screenColor: player1.screenColor },
          player2: { color: player2.color, bgColor: player2.bgColor, screenColor: player2.screenColor },
          score1: player1.score,
          score2: player2.score
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
    player1.name, player1.score, player1.color, player1.bgColor, player1.screenColor,
    player2.name, player2.score, player2.color, player2.bgColor, player2.screenColor
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

  // Ensure player names are fresh whenever entering gameplay view
  useEffect(() => {
    if (view === 'gameplay' && selectedMatchIndex !== null) {
      const p1 = team1Players[selectedMatchIndex] || `PLAYER ${selectedMatchIndex + 1}`;
      const p2 = team2Players[selectedMatchIndex] || `PLAYER ${selectedMatchIndex + 1}`;
      
      setPlayer1(prev => ({ ...prev, name: p1 }));
      setPlayer2(prev => ({ ...prev, name: p2 }));
    }
  }, [view, selectedMatchIndex, team1Players, team2Players]);

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
    const now = Date.now();
    const duration = Math.round((now - frameStartTimeRef.current) / 1000);
    
    const nextScore1 = playerId === '1' ? player1.score + 1 : player1.score;
    const nextScore2 = playerId === '2' ? player2.score + 1 : player2.score;
    
    const breakerId = currentBreakPlayerId;
    const breakerName = breakerId === '1' ? player1.name : player2.name;
    
    const frameDetail: FrameDetail = {
      frameNumber: (player1.score + player2.score) + 1,
      startTime: new Date(frameStartTimeRef.current).toISOString(),
      timestamp: new Date().toISOString(),
      score1: nextScore1,
      score2: nextScore2,
      breakerId,
      breakerName: breakerName || (breakerId === '1' ? 'PLAYER 1' : 'PLAYER 2'),
      winnerId: playerId,
      winnerName: playerId === '1' ? player1.name : player2.name,
      duration
    };
    
    setCurrentMatchFrameDetails(prev => [...prev, frameDetail]);
    frameStartTimeRef.current = now;

    if (playerId === '1') {
      setPlayer1(prev => ({ ...prev, score: prev.score + 1 }));
    } else {
      setPlayer2(prev => ({ ...prev, score: prev.score + 1 }));
    }
    
    if (!matchStartTime) {
      setMatchStartTime(new Date().toISOString());
    }

    if (isBreakTrackingEnabled) {
      if (currentBreakPlayerId === 'none') {
        setCurrentBreakPlayerId(playerId === '1' ? '2' : '1');
      } else {
        setCurrentBreakPlayerId(prev => prev === '1' ? '2' : '1');
      }
    }
    
    resetTimer();
  };

  const decrementScore = (playerId: string) => {
    // Undo the last frame detail if it matches the player
    setCurrentMatchFrameDetails(prev => {
      if (prev.length === 0) return prev;
      const lastFrame = prev[prev.length - 1];
      if (lastFrame.winnerId === playerId) {
        return prev.slice(0, -1);
      }
      return prev;
    });

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
      startTime: matchStartTime || undefined,
      player1: player1.name,
      player2: player2.name,
      team1: team1Name || undefined,
      team2: team2Name || undefined,
      score1: player1.score,
      score2: player2.score,
      winner,
      shotClockSetting: isShotClockEnabled ? shotClockDuration : undefined,
      matchClockRemaining: isMatchClockEnabled ? matchClock : undefined,
      frameDetails: currentMatchFrameDetails
    };

    const updatedHistory = [newEntry, ...matchHistory];
    setMatchHistory(updatedHistory);
    setCurrentMatchFrameDetails([]);
    setMatchStartTime(null);
    frameStartTimeRef.current = Date.now();
    setCurrentBreakPlayerId('none');
    
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

  const clearMatchResult = (p1: string, p2: string, index?: number) => {
    // 1. Clear from history
    const updatedHistory = matchHistory.filter(m => 
      !((m.player1 === p1 && m.player2 === p2) || (m.player1 === p2 && m.player2 === p1))
    );
    setMatchHistory(updatedHistory);

    // 2. Reset live matchup settings if index is provided
    if (index !== undefined) {
      setMatchupSettings(prev => {
        const next = { ...prev };
        if (next[index]) {
          next[index] = {
            ...next[index],
            score1: 0,
            score2: 0
          };
        }
        return next;
      });
      
      // 3. If it's the active match, reset the live players' scores
      if (selectedMatchIndex === index) {
        setPlayer1(prev => ({ ...prev, score: 0 }));
        setPlayer2(prev => ({ ...prev, score: 0 }));
      }
    }
  };

  const selectTeamMatch = (index: number) => {
    const p1Name = team1Players[index] || `PLAYER ${index + 1}`;
    const p2Name = team2Players[index] || `PLAYER ${index + 1}`;
    
    // Load individual player preferences if they exist
    const p1Pref = playerPreferences[p1Name];
    const p2Pref = playerPreferences[p2Name];
    
    // Load matchup-specific settings (scores, colors)
    const settings = matchupSettings[index];

    // Load existing scores - prefer live matchups setting if available
    const existingResult = getMatchResult(p1Name, p2Name);
    let p1Score = settings?.score1 !== undefined ? settings.score1 : 0;
    let p2Score = settings?.score2 !== undefined ? settings.score2 : 0;

    if (p1Score === 0 && p2Score === 0 && existingResult) {
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
    setCurrentBreakPlayerId('none');
    setView('scoreboard');
    resetTimer();
    resetMatchClock();
  };

  const viewMatchDetails = (matchId: string) => {
    setViewingMatchDetailsId(matchId);
    setView('match-details');
  };

  const navigateToScoreboard = () => {
    const maxMatches = Math.max(team1Players.length, team2Players.length);
    
    // If we're already on scoreboard OR we have a match selected, just stay/go to it
    if (selectedMatchIndex !== null) {
      setView('scoreboard');
      return;
    }

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
    setCurrentBreakPlayerId('none');
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

    // Sync active player names if a match is selected
    if (selectedMatchIndex !== null) {
      const p1 = t1Players[selectedMatchIndex] || `PLAYER ${selectedMatchIndex + 1}`;
      const p2 = t2Players[selectedMatchIndex] || `PLAYER ${selectedMatchIndex + 1}`;
      setPlayer1(prev => ({ ...prev, name: p1 }));
      setPlayer2(prev => ({ ...prev, name: p2 }));
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>, id: string) => {
    setFocusedField(id);
    const target = e.target;
    const val = target.value;
    
    // Set cursor to end with a micro-delay to ensure browser focus logic completes
    requestAnimationFrame(() => {
      target.setSelectionRange(val.length, val.length);
    });
    
    // Scroll into view to ensure it's above keyboard
    setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
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

  const [finishButtonWidth, setFinishButtonWidth] = useState(0);

    // Calculate half-widths for centering widgets based on device and widget type
    const getWidgetHalfW = (type: 'clock') => {
      // Clocks - Mobile: 24vw, Tablet: 16vw, Desktop: 20.8vw
      if (deviceInfo.isPhone) return windowSize.width * 0.12;
      if (deviceInfo.isTablet) return windowSize.width * 0.08;
      return windowSize.width * 0.104;
    };

    const halfH = deviceInfo.isPhone ? (windowSize.height * 0.025) : (windowSize.height * 0.04);
    const gap = windowSize.height * 0.05;

    // Default positional offsets to ensure centralized alignment with score digits
    const vOffset = windowSize.height * 0.04; // Back to 4vh raise
    const topBarHeightVal = deviceInfo.isPhone ? windowSize.height * 0.16 : windowSize.height * 0.1;
    const topBarOffset = (deviceInfo.isPhone && !isNavVisible) ? -topBarHeightVal : topBarHeightVal;
    const centerY = (windowSize.height + topBarOffset) / 2;
    const centerX = windowSize.width / 2;

  return (
    <div className={`relative min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden ${deviceInfo.isPhone ? 'is-phone' : (deviceInfo.isTablet ? 'is-tablet' : 'is-desktop')}`}>
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
          {[player1, player2].map((p) => (
            <div 
              key={p.id} 
              className="flex-1 h-full relative overflow-hidden transition-colors duration-700" 
              style={{ backgroundColor: p.screenColor }}
            >
              {(p.screenStyle === 'cloth' || p.screenStyle === 'speed') && (CLOTH_COLORS.some(c => c.value.toLowerCase() === p.screenColor.toLowerCase()) || SPEED_CLOTH_COLORS.some(c => c.value.toLowerCase() === p.screenColor.toLowerCase())) && (
                <div className="absolute inset-0 z-0 scale-[1.05]">
                  <div 
                    className="w-full h-full border-[1.5vw] border-[#3d2b1f] shadow-[inset_0_0_10vh_rgba(0,0,0,0.5)]" 
                    style={{ backgroundColor: p.screenColor }}
                  >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: p.screenStyle === 'speed' ? 'radial-gradient(#000 0.03rem, transparent 0.03rem)' : 'radial-gradient(#000 0.06rem, transparent 0.06rem)', backgroundSize: p.screenStyle === 'speed' ? '0.8vw 0.8vw' : '1.5vw 1.5vw' }} />
                    {/* Corner Pockets */}
                    <div className={`absolute top-0 left-0 w-[8vw] h-[8vw] bg-black rounded-br-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    <div className={`absolute top-0 right-0 w-[8vw] h-[8vw] bg-black rounded-bl-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    <div className={`absolute bottom-0 left-0 w-[8vw] h-[8vw] bg-black rounded-tr-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    <div className={`absolute bottom-0 right-0 w-[8vw] h-[8vw] bg-black rounded-tl-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    {/* Side Pockets */}
                    <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-[5vw] h-[8vw] bg-black rounded-r-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-[5vw] h-[8vw] bg-black rounded-l-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                  </div>
                </div>
              )}
              {p.screenStyle === 'dial' && (
                <div 
                  className="absolute inset-0 opacity-40 z-0" 
                  style={{ 
                    backgroundImage: 'linear-gradient(45deg, #111 25.5%, transparent 25.5%), linear-gradient(-45deg, #111 25.5%, transparent 25.5%), linear-gradient(45deg, transparent 74.5%, #111 74.5%), linear-gradient(-45deg, transparent 74.5%, #111 74.5%)',
                    backgroundSize: '0.5rem 0.5rem',
                    backgroundColor: '#1a1a1a'
                  }}
                />
              )}
            </div>
          ))}
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
          )) ? (deviceInfo.isPhone ? '-16vh' : '-10vh') : 0,
          opacity: 1
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`fixed top-0 left-0 right-0 bg-black/20 backdrop-blur-md z-50 flex items-center justify-between px-[2.5vw]`}
        style={{ 
          borderBottom: '0.125rem solid',
          borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`,
          height: deviceInfo.isPhone ? '16vh' : '10vh'
        }}
      >
        <div className="flex items-center gap-[1vw] shrink-0 transform-none">
          <Trophy 
            className="transition-all duration-500" 
            style={{ 
              stroke: 'url(#cup-gradient)',
              width: deviceInfo.isPhone ? '12vh' : '8vh',
              height: deviceInfo.isPhone ? '12vh' : '8vh'
            }}
          />
          <h1 
            className={`transition-all duration-500 ${(isShotClockEnabled || isMatchClockEnabled) && deviceInfo.isPhone ? 'hidden' : ''} flex items-center`}
            style={{ 
              height: deviceInfo.isPhone ? '11vh' : '9vh',
            }}
          >
            <svg 
              height="100%" 
              viewBox="0 0 210 40" 
              preserveAspectRatio="xMinYMid meet"
              className="w-auto overflow-visible"
            >
              <defs>
                <linearGradient id="logo-grad-svg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={player1.color} />
                  <stop offset="100%" stopColor={player2.color} />
                </linearGradient>
              </defs>
                <text 
                  x="0" 
                  y="32" 
                  fill="url(#logo-grad-svg)" 
                  style={{ 
                    fontFamily: 'Inter, sans-serif', 
                    fontWeight: 900, 
                    fontSize: '2rem', 
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
              className="flex items-center justify-center px-4 bg-black/20 border-2 border-white/5 backdrop-blur-md pointer-events-auto shadow-xl"
              style={{ 
                height: '9vh',
                borderRadius: '1.5vh'
              }}
            >
              <span 
                className="font-mono font-black text-white tracking-wider tabular-nums leading-none"
                style={{
                  fontSize: '6vh'
                }}
              >
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-[1vw] shrink-0 justify-end">
          <button 
            onClick={toggleFullscreen}
            className="flex items-center justify-center transition-all duration-500 border border-slate-800 bg-black/50 hover:bg-slate-800/50"
            style={{
              width: deviceInfo.isPhone ? '12.5vh' : '8vh',
              height: deviceInfo.isPhone ? '12.5vh' : '8vh',
              borderRadius: '1.5vh'
            }}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? 
              <Minimize 
                style={{ 
                  stroke: 'url(#cup-gradient)',
                  width: deviceInfo.isPhone ? '9.5vh' : '7vh',
                  height: deviceInfo.isPhone ? '9.5vh' : '7vh'
                }} 
              /> : 
              <Maximize 
                style={{ 
                  stroke: 'url(#cup-gradient)',
                  width: deviceInfo.isPhone ? '9.5vh' : '7vh',
                  height: deviceInfo.isPhone ? '9.5vh' : '7vh'
                }} 
              />
            }
          </button>
          <button 
            onClick={navigateToScoreboard}
            className={`flex items-center justify-center transition-all duration-500 border ${view === 'scoreboard' ? 'border-white/20' : 'border-slate-800'} bg-black/50 hover:bg-slate-800/50`}
            style={{
              backgroundColor: view === 'scoreboard' ? `${player1.color}33` : undefined,
              width: deviceInfo.isPhone ? '12.5vh' : '8vh',
              height: deviceInfo.isPhone ? '12.5vh' : '8vh',
              borderRadius: '1.5vh'
            }}
          >
            <Trophy 
              style={{ 
                stroke: 'url(#cup-gradient)',
                width: deviceInfo.isPhone ? '9.5vh' : '7vh',
                height: deviceInfo.isPhone ? '9.5vh' : '7vh'
              }} 
            />
          </button>
          <button 
            onClick={() => {
              setView('teams');
              if (deviceInfo.isPhone) setIsNavVisible(false);
            }}
            className={`flex items-center justify-center transition-all duration-500 border ${view === 'teams' ? 'border-white/20' : 'border-slate-800'} bg-black/50 hover:bg-slate-800/50`}
            style={{
              backgroundColor: view === 'teams' ? `${player1.color}33` : undefined,
              width: deviceInfo.isPhone ? '12.5vh' : '8vh',
              height: deviceInfo.isPhone ? '12.5vh' : '8vh',
              borderRadius: '1.5vh'
            }}
          >
            <Users 
              style={{ 
                stroke: 'url(#cup-gradient)',
                width: deviceInfo.isPhone ? '9.5vh' : '7vh',
                height: deviceInfo.isPhone ? '9.5vh' : '7vh'
              }} 
            />
          </button>
          <button 
            onClick={() => {
              setView('settings');
              if (deviceInfo.isPhone) setIsNavVisible(false);
            }}
            className={`flex items-center justify-center transition-all duration-500 border ${view === 'settings' ? 'border-white/20' : 'border-slate-800'} bg-black/50 hover:bg-slate-800/50`}
            style={{
              backgroundColor: view === 'settings' ? `${player2.color}33` : undefined,
              width: deviceInfo.isPhone ? '12.5vh' : '8vh',
              height: deviceInfo.isPhone ? '12.5vh' : '8vh',
              borderRadius: '1.5vh'
            }}
          >
            <Settings 
              style={{ 
                stroke: 'url(#cup-gradient)',
                width: deviceInfo.isPhone ? '9.5vh' : '7vh',
                height: deviceInfo.isPhone ? '9.5vh' : '7vh'
              }} 
            />
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
                opacity: 1, 
                x: 0,
                y: (deviceInfo.isPhone && !isNavVisible) ? '-16vh' : 0
              }}
              exit={{ opacity: 0, x: -50 }}
              className="fixed left-0 top-0 bottom-0 w-[var(--sidebar-width)] flex flex-col pointer-events-none z-20"
            >
              <div style={{ height: deviceInfo.isPhone ? '16vh' : '10vh' }} />
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <h2 
                  className="vertical-text font-black uppercase tracking-widest select-none whitespace-nowrap leading-none m-0" 
                  style={{ 
                    color: player1.color,
                    fontSize: sharedTeamNameFontSize
                  }}
                >
                  {team1Name}
                </h2>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                y: (deviceInfo.isPhone && !isNavVisible) ? '-16vh' : 0
              }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed right-0 top-0 bottom-0 w-[var(--sidebar-width)] flex flex-col pointer-events-none z-20"
            >
              <div style={{ height: deviceInfo.isPhone ? '16vh' : '10vh' }} />
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <h2 
                  className="vertical-text font-black uppercase tracking-widest select-none whitespace-nowrap rotate-180 leading-none m-0" 
                  style={{ 
                    color: player2.color,
                    fontSize: sharedTeamNameFontSize
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
              x: centerX - getWidgetHalfW('clock'), 
              y: centerY + halfH + gap - vOffset
            }}
            animate={matchClockPosition ? { x: matchClockPosition.x, y: matchClockPosition.y } : {
              x: centerX - getWidgetHalfW('clock'),
              y: centerY + halfH + gap - vOffset
            }}
            className="fixed z-[100] cursor-move pointer-events-auto touch-none"
            style={{ left: 0, top: 0 }}
          >
            <div 
              className="flex items-center justify-between px-1 sm:px-3 rounded-2xl bg-black border-2 shadow-2xl floating-widget"
              style={{ 
                border: '0.125rem solid transparent',
                backgroundImage: `linear-gradient(#000, #000), linear-gradient(${deviceInfo.isPhone ? 'to bottom' : 'to right'}, ${player1.color}, ${player2.color})`,
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              <div className="flex flex-col items-center justify-center h-full pt-0.5 flex-1">
                <span className="font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-0.5 widget-label">Match</span>
                <div 
                  className={`flex items-center gap-1 font-mono font-black tabular-nums transition-all duration-500 widget-text ${matchClock <= 60 ? 'text-red-500 animate-pulse scale-110' : 'text-white'}`}
                >
                  <Timer className="widget-icon" />
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
              x: centerX - getWidgetHalfW('clock'), 
              y: centerY - halfH - gap - (halfH * 2) - vOffset
            }}
            animate={shotClockPosition ? { x: shotClockPosition.x, y: shotClockPosition.y } : {
              x: centerX - getWidgetHalfW('clock'),
              y: centerY - halfH - gap - (halfH * 2) - vOffset
            }}
            className="fixed z-[100] cursor-move pointer-events-auto touch-none"
            style={{ left: 0, top: 0 }}
          >
            <div 
              className="flex items-center justify-between px-1 sm:px-3 rounded-2xl bg-black border-2 shadow-2xl floating-widget"
              style={{ 
                border: '0.125rem solid transparent',
                backgroundImage: `linear-gradient(#000, #000), linear-gradient(${deviceInfo.isPhone ? 'to bottom' : 'to right'}, ${player2.color}, ${player1.color})`,
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box'
              }}
            >
              <div className="flex flex-col items-center justify-center h-full pt-0.5 flex-1">
                <span className="font-black uppercase tracking-[0.2em] text-slate-500 leading-none mb-0.5 widget-label">Shot</span>
                <div 
                  className={`flex items-center gap-1 font-mono font-black tabular-nums transition-all duration-500 widget-text ${shotClock <= 5 ? 'text-red-500 animate-pulse scale-110' : 'text-white'}`}
                >
                  <Timer className="widget-icon" />
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

      {/* Finish Match Button - Static layout between cards */}



      <motion.main 
        initial={false}
        animate={{ 
          paddingTop: (view === 'teams' || view === 'settings')
            ? `calc(${deviceInfo.isPhone ? '16vh' : (deviceInfo.isTablet ? '8vh' : '10vh')} + 4vh)`
            : (view === 'match-details'
                ? `calc(${deviceInfo.isPhone ? '16vh' : (deviceInfo.isTablet ? '8vh' : '10vh')} + 1vh)`
                : (view === 'scoreboard' 
                    ? (deviceInfo.isPhone ? '16vh' : (deviceInfo.isTablet ? '8vh' : '10vh')) 
                    : 0)),
          y: (deviceInfo.isPhone && !isNavVisible && view === 'scoreboard') ? (deviceInfo.isPhone ? '-16vh' : '-10vh') : 0,
          paddingBottom: 0 
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className={`relative z-10 min-h-[100dvh] flex flex-col ${view === 'scoreboard' ? 'justify-center gap-4' : 'justify-start pb-24'} ${(view === 'teams' || view === 'settings' || view === 'match-details') ? 'px-0' : 'px-4 sm:px-6'} mx-auto w-full`}
        style={{ 
          maxWidth: (view === 'teams' || view === 'settings' || view === 'match-details') ? '95vw' : (view === 'scoreboard' ? '100%' : 'min(95vw, 62rem)'),
          width: (view === 'teams' || view === 'settings' || view === 'match-details') ? '95vw' : 'auto',
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
                {/* Fixed Centered Finish Match Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <button
                    onClick={finishMatch}
                    className="pointer-events-auto hover:bg-black/40 backdrop-blur-md flex items-center justify-center font-black transition-all shadow-2xl active:scale-95 floating-widget widget-finish-match whitespace-nowrap"
                    style={{ 
                      width: 'auto',
                      padding: '2vh 1vw',
                      height: 'auto',
                      fontSize: !deviceInfo.isDesktop ? '4.5vh' : '4vh',
                      borderRadius: '1.5vh',
                      border: '0.2vh solid transparent',
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.95), rgba(0,0,0,0.95)), linear-gradient(${!deviceInfo.isDesktop ? 'to bottom' : 'to right'}, ${player2.color}, ${player1.color})`,
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      color: '#fff'
                    }}
                  >
                    <span className="leading-none uppercase tracking-wider">Finish Match</span>
                  </button>
                </div>

                {/* Score Cards Grid */}
                <div className="relative flex items-center justify-center w-full py-2">

                <div 
                  className="flex items-center justify-center w-full"
                  style={{ gap: '4vw' }}
                >
                  {[player1, player2].map((p, idx) => (
                      <div key={p.id} className="flex flex-col gap-1 relative">
                        <motion.div
                          onClick={() => {
                            if (!p.isTurn) {
                              setPlayer1(prev => ({ ...prev, isTurn: p.id === '1' }));
                              setPlayer2(prev => ({ ...prev, isTurn: p.id === '2' }));
                              resetTimer();
                            }
                          }}
                          className={`relative transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl flex flex-col justify-center gameplay-card ${
                            p.bgStyle === 'balls' && POOL_BALLS.some(b => b.value.toLowerCase() === p.bgColor.toLowerCase())
                            ? 'rounded-full aspect-square border-0' 
                            : 'rounded-3xl border-2'
                          }`}
                          style={{ 
                            padding: '1vh 2vh',
                            borderColor: p.color,
                            backgroundColor: p.bgColor,
                            backgroundImage: p.bgStyle === 'dial' ? 'linear-gradient(45deg, rgba(0,0,0,0.2) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.2) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.2) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.2) 75%)' : undefined,
                    backgroundSize: '0.25rem 0.25rem',
                            boxShadow: p.bgStyle === 'balls' && POOL_BALLS.some(b => b.value.toLowerCase() === p.bgColor.toLowerCase())
                              ? 'inset -1.25rem -1.25rem 3.75rem rgba(0,0,0,0.8), inset 1.25rem 1.25rem 3.75rem rgba(255,255,255,0.4), 0 1.25rem 2.5rem rgba(0,0,0,0.3)'
                              : `0 0 2.5rem -0.9375rem ${p.color}66`,
                            width: p.bgStyle === 'balls' && POOL_BALLS.some(b => b.value.toLowerCase() === p.bgColor.toLowerCase()) ? 'min(35vw, 65vh)' : '35vw',
                            margin: '0 auto',
                            height: p.bgStyle === 'balls' && POOL_BALLS.some(b => b.value.toLowerCase() === p.bgColor.toLowerCase()) ? 'min(35vw, 65vh)' : '65vh',
                            maxHeight: '65vh',
                            maxWidth: '35vw'
                          }}
                        >
                          {/* Pool Ball Visual Elements (Stripes & Reflections) - Only if Ball mode */}
                          {p.bgStyle === 'balls' && POOL_BALLS.some(b => b.value.toLowerCase() === p.bgColor.toLowerCase()) && (
                             <>
                               {(() => {
                                 const ball = POOL_BALLS.find(b => b.value.toLowerCase() === p.bgColor.toLowerCase());
                                 return (
                                   <>
                                     {ball?.isStripe && (
                                       <div className="absolute inset-x-0 top-[22%] bottom-[22%] bg-white z-0" />
                                     )}
                                     {/* Rotated Numeral Circle */}
                                     <div className={`absolute z-10 top-[15%] ${idx === 0 ? 'right-[15%]' : 'left-[15%]'} w-[25%] aspect-square bg-white rounded-full flex items-center justify-center shadow-lg`}>
                                        <span className="text-black font-black text-[min(1.25rem,2vh)] leading-none">{ball?.number}</span>
                                     </div>
                                     {/* 3D Highlight shadow wrap */}
                                     <div className="absolute inset-0 z-0 pointer-events-none rounded-full shadow-[inset_-2.5rem_-2.5rem_5rem_rgba(0,0,0,0.6)]" />
                                   </>
                                 );
                               })()}
                             </>
                          )}

                             {/* Global Unified Score Buttons - Circular and Anchored to Corners */}
                             
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 incrementScore(p.id);
                               }}
                               className="absolute bottom-[1vh] right-[1vh] rounded-full text-slate-950 flex items-center justify-center transition-all active:scale-95 shadow-lg z-20"
                               style={{ 
                                 width: '15vh',
                                 height: '15vh',
                                 backgroundColor: p.color
                               }}
                             >
                               <Plus className="w-[1.25rem] h-[1.25rem] font-bold" />
                             </button>

                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 decrementScore(p.id);
                               }}
                               className="absolute bottom-[2vh] left-[2vh] rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center transition-all active:scale-95 z-20 border border-slate-700"
                               style={{ 
                                 width: '12vh',
                                 height: '12vh'
                               }}
                             >
                               <Minus className="w-[1rem] h-[1rem]" />
                             </button>
                              

                           <div className="flex-1 flex flex-col items-center justify-evenly w-full m-0 p-0">
                          {isEditingNames ? (
                            <input
                              type="text"
                              value={p.name}
                              placeholder={`PLAYER ${idx + 1} NAME`}
                              onChange={(e) => {
                                const newName = e.target.value.toUpperCase();
                                if (idx === 0) {
                                  setPlayer1({...p, name: newName});
                                  if (selectedMatchIndex !== null) {
                                    const newPlayers = [...team1Players];
                                    newPlayers[selectedMatchIndex] = newName;
                                    setTeam1Players(newPlayers);
                                  }
                                } else {
                                  setPlayer2({...p, name: newName});
                                  if (selectedMatchIndex !== null) {
                                    const newPlayers = [...team2Players];
                                    newPlayers[selectedMatchIndex] = newName;
                                    setTeam2Players(newPlayers);
                                  }
                                }
                              }}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-1 text-center font-bold focus:outline-none focus:border-emerald-500 uppercase"
                              style={{ 
                                color: p.color,
                                fontSize: sharedPlayerNameFontSize
                              }}
                            />
                          ) : (
                            p.name && (
                              <h2 
                                className="font-bold uppercase w-full text-center whitespace-nowrap leading-none m-0 p-0" 
                                style={{ 
                                  color: p.color,
                                  fontSize: sharedPlayerNameFontSize
                                }}
                              >
                                {p.name}
                              </h2>
                            )
                          )}

                          <span 
                            className="font-black tracking-tighter tabular-nums leading-[0.75] block m-0 pb-15" 
                            style={{ 
                              color: p.color,
                              fontSize: deviceInfo.isPhone ? '25vh' : (deviceInfo.isTablet ? '28vh' : '35vh')
                            }}
                          >
                            {p.score}
                          </span>
                        </div>
                      </motion.div>
                      {/* White Ball Break Indicator - Outside clipped container to maintain visibility in ball mode */}
                      {isBreakTrackingEnabled && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isBreakTrackingEnabled) {
                                // Start game timestamp on first break selection
                                if (currentBreakPlayerId === 'none') {
                                  setMatchStartTime(new Date().toISOString());
                                }
                                frameStartTimeRef.current = Date.now();
                                // Manual Override: Always set to this player's side when clicked
                                setCurrentBreakPlayerId(p.id as '1' | '2');
                              }
                            }}
                            className={`absolute rounded-full transition-all duration-500 z-50 flex items-center justify-center 
                              ${currentBreakPlayerId === p.id 
                                ? 'bg-white border-white shadow-[0_0_1.5rem_rgba(255,255,255,1)] scale-125 z-50' 
                                : (currentBreakPlayerId === 'none' 
                                    ? 'bg-white/30 border-white/20 scale-100 opacity-40 grayscale-[0.5]' 
                                    : 'bg-white/10 border-white/5 scale-90 opacity-10 grayscale')}`}
                            style={{
                              width: '6vh',
                              height: '6vh',
                              borderWidth: '0.4vh',
                              borderStyle: 'solid',
                              top: deviceInfo.isPhone ? '1.8vh' : '0.8vh',
                              [idx === 0 ? 'left' : 'right']: deviceInfo.isPhone ? '1.8vh' : '0.8vh'
                            } as any}
                            title={currentBreakPlayerId === 'none' ? "Select Starting Breaker" : "Break Indicator"}
                          />
                      )}
                    </div>
                  ))}
                </div>

                {/* Score digit vertical center logic: the button is now moved to root level */}
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
                className="relative flex items-center justify-center pb-8 transition-all duration-500 mb-12 w-full"
                style={{ 
                  borderBottom: '0.125rem solid',
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
                }}
              >
                <div className="space-y-1 text-center">
                  <h2 className="font-black uppercase tracking-tight text-white" style={{ fontSize: deviceInfo.titleSizes.page }}>Team Setup</h2>
                </div>
                <div className="absolute right-[2.5vw] bottom-[1vh] flex items-center gap-3">
                  <button 
                    onClick={() => setShowExportMenu(true)}
                    className="flex items-center justify-between gap-5 px-4 sm:px-5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg sm:rounded-xl transition-all border-2"
                    style={{ 
                      borderColor: player1.color + '66',
                      color: '#fff',
                      backgroundColor: 'transparent',
                      minWidth: 'fit-content'
                    }}
                  >
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </button>
                  <button 
                    onClick={uploadData}
                    className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg sm:rounded-xl transition-all font-bold text-[0.625rem] sm:text-sm border-2"
                    style={{ 
                      borderColor: player1.color + '66',
                      color: '#fff',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <Upload className="w-[0.75rem] h-[0.75rem] sm:w-[1rem] sm:h-[1rem]" />
                    Import
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-10">
                {/* Team 1 Setup */}
                <div className="space-y-4 sm:space-y-8">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player1.color }}>Team 1 Name</label>
                      <Users className="w-4 h-4" style={{ color: player1.color }} />
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
                    <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player1.color }}>Players</label>
                    <div className="space-y-4 sm:space-y-6">
                      {team1Players.map((player, idx) => (
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
                              autoFocus={idx === team1Players.length - 1 && player === ''}
                              onChange={(e) => {
                                const newPlayers = [...team1Players];
                                newPlayers[idx] = e.target.value.toUpperCase();
                                updateTeamData(team1Name, newPlayers, team2Name, team2Players);
                              }}
                              onFocus={(e) => handleInputFocus(e, `p1-${idx}`)}
                              onBlur={() => setFocusedField(null)}
                              className="w-full bg-black/50 border-2 rounded-xl sm:rounded-2xl pr-14 sm:pr-20 text-slate-100 focus:outline-none uppercase font-bold transition-all shadow-lg"
                              style={{ 
                                ...playerEntryStyle, 
                                borderColor: focusedField === `p1-${idx}` ? player1.color : player1.color + '66' 
                              }}
                              placeholder={`P${idx + 1}`}
                            />
                            <button 
                              onClick={() => {
                                const newPlayers = team1Players.filter((_, i) => i !== idx);
                                updateTeamData(team1Name, newPlayers, team2Name, team2Players);
                              }}
                              className="absolute right-0 top-0 h-full px-2 sm:px-4 text-red-500 hover:bg-red-500/10 rounded-r-lg sm:rounded-r-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => updateTeamData(team1Name, [...team1Players, ''], team2Name, team2Players)}
                        className="w-full py-4 sm:py-6 border-2 border-dashed rounded-xl sm:rounded-2xl text-slate-500 transition-all flex items-center justify-center gap-2 text-[0.875rem] sm:text-lg font-black uppercase tracking-widest"
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
                        <Plus className="w-6 h-6" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Team 2 Setup */}
                <div className="space-y-4 sm:space-y-8">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player2.color }}>Team 2 Name</label>
                      <Users className="w-4 h-4" style={{ color: player2.color }} />
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
                    <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player2.color }}>Players</label>
                    <div className="space-y-4 sm:space-y-6">
                      {team2Players.map((player, idx) => (
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
                              autoFocus={idx === team2Players.length - 1 && player === ''}
                              onChange={(e) => {
                                const newPlayers = [...team2Players];
                                newPlayers[idx] = e.target.value.toUpperCase();
                                updateTeamData(team1Name, team1Players, team2Name, newPlayers);
                              }}
                              onFocus={(e) => handleInputFocus(e, `p2-${idx}`)}
                              onBlur={() => setFocusedField(null)}
                              className="w-full bg-black/50 border-2 rounded-xl sm:rounded-2xl pr-14 sm:pr-20 text-slate-100 focus:outline-none uppercase font-bold transition-all shadow-lg"
                              style={{ 
                                ...playerEntryStyle, 
                                borderColor: focusedField === `p2-${idx}` ? player2.color : player2.color + '66' 
                              }}
                              placeholder={`P${idx + 1}`}
                            />
                            <button 
                              onClick={() => {
                                const newPlayers = team2Players.filter((_, i) => i !== idx);
                                updateTeamData(team1Name, team1Players, team2Name, newPlayers);
                              }}
                              className="absolute right-0 top-0 h-full px-2 sm:px-4 text-red-500 hover:bg-red-500/10 rounded-r-lg sm:rounded-r-xl transition-all"
                            >
                              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => updateTeamData(team1Name, team1Players, team2Name, [...team2Players, ''])}
                        className="w-full py-4 sm:py-6 border-2 border-dashed rounded-xl sm:rounded-2xl text-slate-500 transition-all flex items-center justify-center gap-2 text-[0.875rem] sm:text-lg font-black uppercase tracking-widest"
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
                        <Plus className="w-6 h-6" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

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
                  <div 
                    className="bg-black border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
                  >
                    <div className="overflow-x-auto scrollbar-hide">
                      <table 
                        className="w-full text-left border-collapse table-fixed"
                      >
                        <thead>
                          <tr className="bg-slate-900/80 border-b-2 border-slate-800 font-black">
                            <th className="hidden sm:table-cell px-3 sm:px-6 py-4 text-[0.625rem] sm:text-xs lg:text-[0.9375rem] uppercase tracking-[0.2em] text-slate-400 w-[8%]">No.</th>
                            <th className="px-1 sm:px-6 py-4 text-[0.625rem] sm:text-[0.875rem] lg:text-[0.9375rem] uppercase tracking-widest text-white w-[27%] sm:w-[22%]">
                              <div className="truncate">{team1Name || 'TEAM A'}</div>
                            </th>
                            <th className="px-0.5 sm:px-6 py-4 text-[0.625rem] sm:text-[0.875rem] lg:text-[0.9375rem] uppercase tracking-widest text-slate-600 text-center w-[12%] sm:w-[8%]">VS</th>
                            <th className="px-1 sm:px-6 py-4 text-[0.625rem] sm:text-[0.875rem] lg:text-[0.9375rem] uppercase tracking-widest text-white w-[27%] sm:w-[22%]">
                              <div className="truncate">{team2Name || 'TEAM B'}</div>
                            </th>
                            <th className="px-1 sm:px-6 py-4 text-[0.625rem] sm:text-[0.875rem] lg:text-[0.9375rem] uppercase tracking-widest text-slate-400 w-[24%] sm:w-[17%]">Result</th>
                            <th className="px-1 sm:px-6 py-4 text-[0.625rem] sm:text-[0.875rem] lg:text-[0.9375rem] uppercase tracking-widest text-slate-400 text-right w-[10%] sm:w-[8%]">Clear</th>
                            <th className="hidden sm:table-cell px-3 sm:px-6 py-4 text-[0.625rem] sm:text-xs lg:text-[0.9375rem] uppercase tracking-widest text-slate-400 w-[15%]">TIMERS</th>
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
                            const matchup = matchupSettings[idx];
                            const lastMatch = getMatchResult(p1Name, p2Name);
                            
                            // Determine which score to display
                            let displayScore: { score1: number, score2: number, isLive: boolean } | null = null;
                            
                            if (selectedMatchIndex === idx) {
                              // Priority 1: Current active game
                              displayScore = { 
                                score1: player1.score, 
                                score2: player2.score, 
                                isLive: true 
                              };
                            } else if (matchup?.score1 !== undefined || matchup?.score2 !== undefined) {
                              // Priority 2: Other ongoing games in matchupSettings
                              displayScore = { 
                                score1: matchup.score1 || 0, 
                                score2: matchup.score2 || 0, 
                                isLive: true 
                              };
                            } else if (lastMatch) {
                              // Priority 3: Completed historical games
                              displayScore = { 
                                score1: lastMatch.score1,
                                score2: lastMatch.score2,
                                isLive: false 
                              };
                            }
                            
                            return (
                              <tr 
                                key={idx} 
                                onClick={() => selectTeamMatch(idx)}
                                className={`group cursor-pointer transition-colors hover:bg-emerald-500/5 ${selectedMatchIndex === idx ? 'bg-emerald-500/10' : ''}`}
                              >
                                <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-xs font-black text-slate-600">#{idx + 1}</td>
                                <td className="px-1 sm:px-6 py-4 text-[0.625rem] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors truncate">
                                  {p1 || <span className="text-slate-700 italic">EMPTY</span>}
                                </td>
                                <td className="px-0.5 sm:px-6 py-4 text-center text-slate-700 font-black text-[0.5rem]">VS</td>
                                <td className="px-1 sm:px-6 py-4 text-[0.625rem] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors truncate">
                                  {p2 || <span className="text-slate-700 italic">EMPTY</span>}
                                </td>
                                <td className="px-1 sm:px-6 py-4">
                                  {displayScore ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                                      <span className={`text-[0.5rem] sm:text-xs font-bold px-1 py-0.5 rounded w-fit ${
                                        displayScore.isLive 
                                          ? 'bg-blue-500/20 text-blue-400' 
                                          : (displayScore as any).winner === p1Name 
                                            ? 'bg-emerald-500/20 text-emerald-400' 
                                            : (displayScore as any).winner === p2Name
                                              ? 'bg-rose-500/20 text-rose-400'
                                              : 'bg-slate-800 text-slate-400'
                                      }`}>
                                        {displayScore.score1}-{displayScore.score2}
                                      </span>
                                      <span className="text-[0.375rem] sm:text-[1.125vh] text-slate-600 font-bold uppercase whitespace-nowrap">{displayScore.isLive ? 'LIVE' : new Date((displayScore as any).date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[0.5rem] text-slate-700 font-bold uppercase">NONE</span>
                                  )}
                                </td>
                                <td className="px-1 sm:px-6 py-4 text-right w-10 sm:w-auto">
                                  <div className="flex items-center justify-end gap-1">
                                    {lastMatch && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          viewMatchDetails(lastMatch.id);
                                        }}
                                        className="p-1 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="View Details"
                                      >
                                        <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </button>
                                    )}
                                    {(lastMatch || matchup) && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          clearMatchResult(p1Name, p2Name, idx);
                                        }}
                                        className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Clear Score"
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="hidden sm:table-cell px-3 sm:px-6 py-4">
                                  {lastMatch && (lastMatch.shotClockSetting || lastMatch.matchClockRemaining !== undefined) ? (
                                    <div className="flex flex-col gap-0.5">
                                      {lastMatch.shotClockSetting && <span className="text-[0.5625rem] font-bold text-slate-500">SHOT: {lastMatch.shotClockSetting}S</span>}
                                      {lastMatch.matchClockRemaining !== undefined && <span className="text-[0.5625rem] font-bold text-slate-500">MATCH: {formatTime(lastMatch.matchClockRemaining)}</span>}
                                    </div>
                                  ) : (
                                    <span className="text-[0.625rem] text-slate-600 font-bold uppercase">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {/* Totals Row */}
                          <tr className="bg-slate-900/80 border-t-2 border-slate-800 font-black">
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 text-[0.625rem] uppercase tracking-[0.2em] text-emerald-500">Total Score</td>
                            <td className="px-1 sm:px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-base sm:text-2xl text-emerald-400 tabular-nums">{teamTotals.t1}</span>
                                <span className="text-[0.375rem] text-slate-500 uppercase tracking-tighter truncate max-w-[3.75rem] sm:max-w-none">{team1Name}</span>
                              </div>
                            </td>
                            <td className="px-0.5 sm:px-6 py-4 text-center text-slate-700 font-black text-[0.5rem] w-4 sm:w-8">SUM</td>
                            <td className="px-1 sm:px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-base sm:text-2xl text-emerald-400 tabular-nums">{teamTotals.t2}</span>
                                <span className="text-[0.375rem] text-slate-500 uppercase tracking-tighter truncate max-w-[3.75rem] sm:max-w-none">{team2Name}</span>
                              </div>
                            </td>
                            <td colSpan={windowSize.width < 640 ? 1 : 2} className="px-1 sm:px-6 py-4">
                              <div className="flex flex-col items-end">
                                <span className="text-[0.625rem] sm:text-[0.875rem] text-slate-600 uppercase font-bold">Overall Lead</span>
                                <span className="text-[0.5625rem] sm:text-sm font-black text-slate-100 truncate max-w-full block">
                                  {teamTotals.t1 === teamTotals.t2 ? 'TIED' : 
                                   teamTotals.t1 > teamTotals.t2 ? `${team1Name} (+${teamTotals.t1 - teamTotals.t2})` : 
                                   `${team2Name} (+${teamTotals.t2 - teamTotals.t1})`}
                                </span>
                              </div>
                            </td>
                            <td className="px-1 sm:px-6 py-4 text-right w-10 sm:w-auto">
                              <button 
                                onClick={() => setShowTeamTotals(true)}
                                className="inline-flex w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-emerald-500/10 items-center justify-center border border-emerald-500/20 shrink-0 active:scale-95 transition-all hover:bg-emerald-500/20"
                              >
                                <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" style={{ transform: 'scale(1.4)' }} />
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

            <div className="flex justify-center pt-8">
              <button 
                onClick={() => setShowClearTeamsConfirm(true)}
                className="flex items-center gap-3 px-8 py-4 text-sm sm:text-base font-black uppercase tracking-[0.2em] rounded-2xl transition-all border-2 group hover:scale-105 active:scale-95 shadow-2xl"
                style={{ 
                  borderColor: player2.color + '44',
                  color: player2.color,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  backdropBlur: '0.625rem'
                }}
              >
                <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Clear Team Data
              </button>
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
                className="space-y-1 pb-8 transition-all duration-500 text-center w-full"
                style={{ 
                  borderBottom: '0.125rem solid',
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
                }}
              >
                <h2 className="font-black uppercase tracking-tight text-white uppercase" style={{ fontSize: deviceInfo.titleSizes.page }}>Settings</h2>
              </div>

              <div className="space-y-12">
                {/* 1. Colour Preferences */}
                <section className="space-y-6">
                  <h3 
                    className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                    style={{ 
                      borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                      color: 'white',
                      fontSize: deviceInfo.titleSizes.section
                    }}
                  >
                    Colour Preferences
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                    {[player1, player2].map((p, idx) => (
                      <div 
                        key={p.id} 
                        className="relative p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border-2 space-y-6 shadow-xl transition-all duration-500"
                        style={{ 
                          backgroundColor: p.bgColor,
                          borderColor: p.color,
                          boxShadow: `0 1rem 2.5rem -1rem ${p.color}33`,
                          '--player-color': p.color,
                          '--card-padding': deviceInfo.isPhone ? '1rem' : '2rem'
                        } as React.CSSProperties}
                      >
                      <div className="flex items-center justify-between">
                        <label 
                          className="font-black uppercase tracking-widest text-slate-500" 
                          style={{ fontSize: playerPrefLabelFontSize }}
                        >
                          Player {idx + 1} Name
                        </label>
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
                            onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, color})) : setPlayer2(prev => ({...prev, color}))}
                            colors={p.bgStyle === 'dial' ? DIAL_COLORS : THEME_COLORS}
                            icon={<Palette className="w-4 h-4" />}
                            isOpen={activePicker === `p${idx + 1}-theme`}
                            onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-theme` : null)}
                            themeColor={p.color}
                            pickerStyle={p.bgStyle === 'dial' ? 'dial' : 'default'}
                            allowedStyles={['default', 'dial']}
                            onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, bgStyle: style})) : setPlayer2(prev => ({...prev, bgStyle: style}))}
                          />

                          <ColorPicker
                            label="Card Background"
                            value={p.bgColor}
                            onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, bgColor: color})) : setPlayer2(prev => ({...prev, bgColor: color}))}
                            colors={p.bgStyle === 'balls' ? POOL_BALLS : p.bgStyle === 'dial' ? DIAL_COLORS : BACKGROUND_COLORS}
                            icon={<Layout className="w-4 h-4" />}
                            isOpen={activePicker === `p${idx + 1}-bg`}
                            onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-bg` : null)}
                            themeColor={p.color}
                            pickerStyle={p.bgStyle || 'default'}
                            allowedStyles={['default', 'balls', 'dial']}
                            onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, bgStyle: style})) : setPlayer2(prev => ({...prev, bgStyle: style}))}
                          />

                          <div className="relative">
                            <ColorPicker
                              label="Screen Background"
                              value={p.screenColor}
                              onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, screenColor: color})) : setPlayer2(prev => ({...prev, screenColor: color}))}
                              colors={p.screenStyle === 'cloth' ? CLOTH_COLORS : p.screenStyle === 'speed' ? SPEED_CLOTH_COLORS : p.screenStyle === 'dial' ? DIAL_COLORS : BACKGROUND_COLORS}
                              icon={<Maximize className="w-4 h-4" />}
                              isOpen={activePicker === `p${idx + 1}-screen`}
                              onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-screen` : null)}
                              themeColor={p.color}
                              pickerStyle={p.screenStyle || 'default'}
                              allowedStyles={['default', 'cloth', 'speed', 'dial']}
                              onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, screenStyle: style})) : setPlayer2(prev => ({...prev, screenStyle: style}))}
                            />
                            {/* Screen Color Indicator Circle - 3rem (w-12 h-12) - Attached to Card Edge */}
                            <div 
                              className={`absolute w-12 h-12 rounded-full shadow-2xl transition-all duration-500 z-20 top-1/2 border-2 ${idx === 0 ? 'left-0' : 'right-0'}`}
                              style={{ 
                                backgroundColor: p.screenColor,
                                borderColor: p.color,
                                transform: `translateY(-50%) ${idx === 0 ? 'translateX(calc(-1 * (var(--card-padding) + 1.5rem)))' : 'translateX(calc(var(--card-padding) + 1.5rem))'}`,
                                opacity: 1,
                                filter: `drop-shadow(0 0 1rem ${p.color}44)`
                              } as any}
                              title="Screen Background Color"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 2. Break Tracker */}
                <section className="space-y-6">
                  <h3 
                    className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                    style={{ 
                      borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                      color: 'white',
                      fontSize: deviceInfo.titleSizes.section
                    }}
                  >
                    Break Tracker
                  </h3>
                  <div 
                    onClick={() => setIsBreakTrackingEnabled(!isBreakTrackingEnabled)}
                    className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl cursor-pointer relative" 
                    style={{ borderColor: player1.color }}
                  >
                    {/* Title Box - Top */}
                    <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                      <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Break Tracking</p>
                    </div>

                    {/* Content Box - Description & Toggle */}
                    <div className="flex items-center justify-between gap-[4vw]">
                      <div className="flex-1">
                        <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Display a "white ball" break indicator that alternates with scores.</p>
                      </div>
                      <div className="shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsBreakTrackingEnabled(!isBreakTrackingEnabled);
                          }}
                          className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-colors relative`}
                          style={{ backgroundColor: isBreakTrackingEnabled ? player1.color : '#334155' }}
                        >
                          <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isBreakTrackingEnabled ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Device Time */}
                <section className="space-y-6">
                  <h3 
                    className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                    style={{ 
                      borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                      color: 'white',
                      fontSize: deviceInfo.titleSizes.section
                    }}
                  >
                    Device Time
                  </h3>
                  <div 
                    onClick={() => setShowDeviceTime(!showDeviceTime)}
                    className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl cursor-pointer relative"
                    style={{ borderColor: player1.color }}
                  >
                    {/* Title Box - Top */}
                    <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                      <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Show Device Time</p>
                    </div>

                    {/* Content Box - Description & Toggle */}
                    <div className="flex items-center justify-between gap-[4vw]">
                      <div className="flex-1">
                        <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Display a draggable clock on the gameplay screen.</p>
                      </div>
                      <div className="shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeviceTime(!showDeviceTime);
                          }}
                          className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-colors relative`}
                          style={{ backgroundColor: showDeviceTime ? player1.color : '#334155' }}
                        >
                          <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${showDeviceTime ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 4. Shot Clock */}
                <section className="space-y-6">
                  <h3 
                    className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                    style={{ 
                      borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                      color: 'white',
                      fontSize: deviceInfo.titleSizes.section
                    }}
                  >
                    Shot Clock
                  </h3>
                  <div 
                    onClick={() => {
                      setIsShotClockEnabled(!isShotClockEnabled);
                      if (isShotClockEnabled) pauseTimer();
                    }}
                    className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl cursor-pointer relative" 
                    style={{ borderColor: player2.color }}
                  >
                    {/* Title Box - Top */}
                    <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                      <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Enable Shot Clock</p>
                    </div>

                    {/* Content Box - Description & Toggle */}
                    <div className="flex items-center justify-between gap-[4vw]">
                      <div className="flex-1 text-left">
                        <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Toggle the visibility and timer on the scoreboard.</p>
                      </div>
                      <div className="shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsShotClockEnabled(!isShotClockEnabled);
                            if (isShotClockEnabled) pauseTimer();
                          }}
                          className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-colors relative`}
                          style={{ backgroundColor: isShotClockEnabled ? player2.color : '#334155' }}
                        >
                          <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isShotClockEnabled ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
                        </button>
                      </div>
                    </div>

                    {isShotClockEnabled && (
                      <div 
                        className="space-y-6 pt-8 border-t-2" 
                        style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between">
                          <label className="font-black text-slate-400 uppercase tracking-widest" style={{ fontSize: settingsLabelFontSize }}>Timer Duration</label>
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
                        <div className="flex justify-between text-[0.625rem] font-black text-slate-600 uppercase tracking-[0.2em]">
                          <span>10s</span>
                          <span>60s</span>
                          <span>120s</span>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* 5. Match Clock */}
                <section className="space-y-6">
                  <h3 
                    className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                    style={{ 
                      borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                      color: 'white',
                      fontSize: deviceInfo.titleSizes.section
                    }}
                  >
                    Match Clock
                  </h3>
                  <div 
                    onClick={() => {
                      setIsMatchClockEnabled(!isMatchClockEnabled);
                      if (isMatchClockEnabled) pauseTimer();
                    }}
                    className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl cursor-pointer relative" 
                    style={{ borderColor: player1.color }}
                  >
                    {/* Title Box - Top */}
                    <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                      <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Enable Match Clock</p>
                    </div>

                    {/* Content Box - Description & Toggle */}
                    <div className="flex items-center justify-between gap-[4vw]">
                      <div className="flex-1 text-left">
                        <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>A master countdown for the entire match.</p>
                      </div>
                      <div className="shrink-0">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMatchClockEnabled(!isMatchClockEnabled);
                            if (isMatchClockEnabled) pauseTimer();
                          }}
                          className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-colors relative`}
                          style={{ backgroundColor: isMatchClockEnabled ? player1.color : '#334155' }}
                        >
                          <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isMatchClockEnabled ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
                        </button>
                      </div>
                    </div>

                    {isMatchClockEnabled && (
                      <div className="space-y-6 pt-8 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                          <label className="font-black text-slate-400 uppercase tracking-widest" style={{ fontSize: settingsLabelFontSize }}>Match Duration</label>
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
                        <div className="flex justify-between text-[0.625rem] font-black text-slate-600 uppercase tracking-[0.2em]">
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

                {/* 6. Restore Defaults */}
                <section className="space-y-6">
                  <h3 
                    className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                    style={{ 
                      borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                      color: 'white',
                      fontSize: deviceInfo.titleSizes.section
                    }}
                  >
                    Restore Defaults
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    <div 
                      className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[20vw] sm:pb-[6vw] pt-[1vw] shadow-xl relative"
                      style={{ borderColor: player1.color }}
                    >
                      {/* Title Box - Top */}
                      <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                        <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Restore Defaults</p>
                      </div>

                      {/* Content Box - Description */}
                      <div className="w-full text-left">
                        <p className="text-white font-bold uppercase tracking-widest" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Resets colors and clock settings to default.</p>
                      </div>

                      {/* Restore Button - Absolute corner */}
                      <button 
                        onClick={() => {
                          setShowRestoreDefaultsConfirm(true);
                          setDeviceTimePosition(null);
                        }}
                        className="absolute bottom-[2vw] right-[2vw] px-[4vw] sm:px-8 py-[2vw] sm:py-4 bg-slate-800 hover:bg-slate-700 rounded-xl sm:rounded-2xl text-[2.5vw] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700"
                      >
                        <RotateCcw className="w-[3vw] sm:w-4 h-[3vw] sm:h-4" />
                        Restore Defaults
                      </button>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 
                    className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                    style={{ 
                      borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                      color: 'white',
                      fontSize: deviceInfo.titleSizes.section
                    }}
                  >
                    API Configuration
                  </h3>
                  <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl relative overflow-hidden">
                    {/* Title Box - Top */}
                    <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                       <p className="font-black text-slate-200 uppercase tracking-tight text-center leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Tournament Sync</p>
                    </div>

                    {/* Content Box */}
                    <div className="flex items-center gap-4 w-full">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                        <Server className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1 w-full text-center sm:text-left">
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
                          <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Target URL</label>
                          <input 
                            type="url"
                            value={apiConfig.url}
                            onChange={(e) => setApiConfig(prev => ({ ...prev, url: e.target.value }))}
                            placeholder="https://api.yourserver.com/sync"
                            className="w-full bg-black border border-slate-800 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">API Key</label>
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
                            className="w-full h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl text-[0.625rem] font-black uppercase tracking-widest text-slate-300 transition-all border border-slate-700 flex items-center justify-center gap-2"
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
                              className={`p-3 rounded-xl text-[0.625rem] font-bold border ${
                                apiTestStatus.type === 'success' 
                                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                                  : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                              }`}
                            >
                              {apiTestStatus.message}
                            </motion.div>
                          )}
                        </div>
                        <p className="text-[0.5625rem] text-slate-600 font-bold uppercase leading-relaxed">
                          This configuration enables the "Send to Server" option in the export menu. 
                          The payload is a full JSON representation of the current tournament state.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 space-y-4 opacity-50">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                          <Layout className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-[0.625rem] font-black uppercase tracking-widest text-slate-600">Enter PIN to unlock API settings</p>
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
                      <span className="font-mono" style={{ color: player1.color }}>0.6.9-BETA</span>
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

          {view === 'match-details' && (
            <motion.div
              key="match-details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8 pb-20 w-full max-w-[95vw] mx-auto"
            >
              <div 
                className="relative flex items-center justify-center pb-8 border-b-2 min-h-[5rem] sm:min-h-[7rem] w-full"
                style={{ 
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
                }}
              >
                <div className="absolute left-0 bottom-[1vh]">
                  <button 
                    onClick={() => setView('teams')}
                    className="group relative h-[calc(3rem+1vh)] sm:h-[calc(4rem+1vh)] active:scale-95 transition-all"
                    style={{ 
                        filter: `drop-shadow(0 0 1rem ${player1.color}22)`,
                        width: deviceInfo.isPhone ? '27vw' : '13vw'
                    }}
                  >
                    {/* Chunky Arrow Border Layer */}
                    <div 
                      className="absolute inset-0" 
                      style={{ 
                        background: `linear-gradient(to right, ${player1.color}, ${player2.color})`,
                        clipPath: 'polygon(1.5rem 0%, 100% 0%, 100% 100%, 1.5rem 100%, 0% 50%)'
                      }} 
                    />
                    {/* Chunky Arrow Inner Layer (Black) */}
                    <div 
                      className="absolute inset-[0.125rem] bg-black flex items-center justify-center gap-2 pr-2 group-hover:bg-slate-900 transition-colors"
                      style={{ 
                        clipPath: 'polygon(1.4rem 0%, 100% 0%, 100% 100%, 1.4rem 100%, 0.1rem 50%)',
                        paddingLeft: '1.4rem'
                      }}
                    >
                        <ChevronLeft className="w-5 h-5 shrink-0" style={{ color: player1.color }} />
                        <span 
                          className="text-sm sm:text-lg font-black uppercase tracking-tight leading-none"
                          style={{ 
                            backgroundImage: `linear-gradient(to right, ${player1.color}, ${player2.color})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          Back
                        </span>
                    </div>
                  </button>
                </div>
                <h2 className="font-black uppercase tracking-tight text-white line-clamp-1 leading-none text-center" style={{ fontSize: deviceInfo.titleSizes.page }}>Match Details</h2>
              </div>

              {matchHistory.find(m => m.id === viewingMatchDetailsId) ? (() => {
                const match = matchHistory.find(m => m.id === viewingMatchDetailsId)!;
                return (
                  <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                       <div className="p-3 sm:p-5 rounded-3xl bg-slate-900/50 border border-slate-800/50 shadow-lg flex flex-col items-center text-center">
                          <p className="text-[0.5625rem] sm:text-xs uppercase font-black text-slate-500 mb-2 tracking-[0.2em]">Detailed Frame Analysis</p>
                          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                            <span className="text-sm sm:text-xl font-black text-white uppercase">{match.player1}</span>
                            <span className="text-[0.5rem] sm:text-xs text-slate-600 font-black px-1">VS</span>
                            <span className="text-sm sm:text-xl font-black text-white uppercase">{match.player2}</span>
                          </div>
                          {match.team1 && <p className="text-[0.5rem] sm:text-[0.625rem] text-slate-500 font-bold uppercase mt-1.5">{match.team1} vs {match.team2}</p>}
                       </div>
                       <div className="p-3 sm:p-5 rounded-3xl bg-slate-900/50 border border-slate-800/50 text-right shadow-lg">
                          <p className="text-[0.5rem] sm:text-[0.625rem] uppercase font-black text-slate-500 mb-1 lg:tracking-widest">Outcome / Date</p>
                          <p className="text-base sm:text-2xl font-black text-emerald-400 tabular-nums">{match.score1} - {match.score2}</p>
                          <p className="text-[0.5rem] sm:text-[0.625rem] text-slate-500 font-bold uppercase mt-1.5">{new Date(match.date).toLocaleString('en-GB')}</p>
                       </div>
                    </div>

                    {/* Frame Table */}
                    <div className="overflow-hidden rounded-3xl border border-slate-800/50 shadow-2xl bg-black/40 backdrop-blur-3xl">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse table-fixed">
                          <thead>
                            <tr className="bg-slate-900/80 border-b-2 border-slate-800/50">
                              <th className="pl-[2vw] pr-0 sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[1.6vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[2%] whitespace-nowrap">#</th>
                              <th className="px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[1.8vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[22%]">Breaker</th>
                              <th className="px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[1.8vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[22%] text-left">Winner</th>
                              <th className="px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[1.8vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[12%] text-center">Score</th>
                              <th className="px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[1.8vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[14%] text-center">Start</th>
                              <th className="px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[1.8vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[14%] text-center whitespace-nowrap">Finish</th>
                              <th className="px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[1.8vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 text-right w-[14%] pr-[2vw]">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/30">
                            {match.frameDetails && match.frameDetails.length > 0 ? match.frameDetails.map((frame, fidx) => (
                              <tr key={fidx} className="hover:bg-emerald-500/5 transition-colors group">
                                <td className="pl-[2vw] pr-0 sm:px-5 py-[2vh] text-[2.2vw] sm:text-sm font-black text-slate-600 group-hover:text-emerald-500 transition-colors whitespace-nowrap">#{frame.frameNumber}</td>
                                <td className="px-[1vw] sm:px-5 py-[2vh]">
                                  <span className="text-[2.2vw] sm:text-sm font-bold text-slate-300 uppercase letter-spacing-tight truncate block">{frame.breakerName}</span>
                                </td>
                                <td className="px-[1vw] sm:px-5 py-[2vh]">
                                  <div className="flex items-center gap-[0.5vw] sm:gap-2">
                                    <div className="w-[0.8vw] sm:w-1.5 h-[0.8vw] sm:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[2.2vw] sm:text-sm font-black text-emerald-400 uppercase tracking-tight truncate">{frame.winnerName}</span>
                                  </div>
                                </td>
                                <td className="px-[0.5vw] sm:px-5 py-[2vh] font-mono text-[2.2vw] sm:text-base text-slate-500 font-bold tabular-nums whitespace-nowrap text-center">
                                  {frame.score1}<span className="text-slate-700 mx-[0.2vw] sm:mx-1">-</span>{frame.score2}
                                </td>
                                <td className="px-[0.5vw] sm:px-5 py-[2vh] text-center">
                                  <span className="text-[1.8vw] sm:text-xs font-black text-slate-500 tabular-nums whitespace-nowrap">
                                    {frame.startTime ? new Date(frame.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : (frame.duration ? new Date(new Date(frame.timestamp).getTime() - (frame.duration * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-')}
                                  </span>
                                </td>
                                <td className="px-[0.5vw] sm:px-5 py-[2vh] text-center">
                                  <span className="text-[1.8vw] sm:text-xs font-black text-slate-400 tabular-nums whitespace-nowrap">
                                    {new Date(frame.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </td>
                                <td className="px-[1vw] sm:px-5 py-[2vh] text-right pr-[2vw]">
                                  {frame.duration !== undefined && (
                                    <div className="flex items-center justify-end gap-[0.5vw] sm:gap-1 mt-0.5">
                                      <Clock className="w-[2vw] sm:w-2.5 h-[2vw] sm:h-2.5 text-slate-700 font-bold" />
                                      <span className="text-[2vw] sm:text-xs font-black text-slate-500 uppercase tabular-nums whitespace-nowrap">
                                        {Math.floor(frame.duration / 60)}m {frame.duration % 60}s
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={7} className="px-[2vw] py-[8vh] text-center text-slate-600 italic font-medium uppercase tracking-[0.2em] text-[1.8vw]">No detailed frame data available.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals Section - Dedicated Element */}
                      {match.frameDetails && match.frameDetails.length > 0 && (
                        <div className="bg-slate-900/60 border-t-2 border-slate-800/50 px-[2vw] py-[2vh] sm:py-[3vh]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-[2vw]">
                              <span className="text-[2.2vw] sm:text-sm font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Totals</span>
                            </div>

                            <div className="absolute left-1/2 -translate-x-1/2 flex items-center font-mono text-[4.5vw] sm:text-3xl font-black tabular-nums">
                              <span style={{ color: player1.color }}>{match.score1}</span>
                              <span className="text-slate-700 mx-[1vw] sm:mx-3">-</span>
                              <span style={{ color: player2.color }}>{match.score2}</span>
                            </div>

                            <div className="flex flex-col items-end">
                              <span className="text-[1.8vw] sm:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Total Duration</span>
                              <span className="text-[2.5vw] sm:text-lg font-black text-white tabular-nums">
                                {(() => {
                                  const totalSec = match.frameDetails.reduce((acc, f) => acc + (f.duration || 0), 0);
                                  return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center px-4">
                       <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-800" />
                          <p className="text-[0.5rem] font-black text-slate-700 uppercase tracking-widest">End of Record</p>
                       </div>
                       {match.shotClockSetting && (
                         <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-slate-700" />
                            <p className="text-[0.5rem] font-black text-slate-700 uppercase tracking-widest">Shot Clock: {match.shotClockSetting}S Enabled</p>
                         </div>
                       )}
                    </div>

                    <div className="pt-12 flex justify-start">
                       <button 
                         onClick={() => setView('teams')}
                         className="group relative h-[calc(5rem+1vh)] active:scale-95 transition-all"
                         style={{ 
                            filter: `drop-shadow(0 0 1.25rem ${player1.color}22)`,
                            width: deviceInfo.isPhone ? '48vw' : '21vw'
                         }}
                       >
                         {/* Chunky Arrow Border Layer */}
                         <div 
                           className="absolute inset-0" 
                           style={{ 
                             background: `linear-gradient(to right, ${player1.color}, ${player2.color})`,
                             clipPath: 'polygon(2.5rem 0%, 100% 0%, 100% 100%, 2.5rem 100%, 0% 50%)'
                           }} 
                         />
                         {/* Chunky Arrow Inner Layer (Black) */}
                         <div 
                           className="absolute inset-[0.125rem] bg-black flex items-center justify-center gap-4 pr-6 group-hover:bg-slate-900 transition-colors"
                           style={{ 
                             clipPath: 'polygon(2.4rem 0%, 100% 0%, 100% 100%, 2.4rem 100%, 0.15rem 50%)',
                             paddingLeft: '2.4rem'
                           }}
                         >
                            <ChevronLeft className="w-8 h-8 shrink-0" style={{ color: player1.color }} />
                            <div className="flex flex-col items-start pt-1">
                               <span 
                                 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-none"
                                 style={{ 
                                   backgroundImage: `linear-gradient(to right, ${player1.color}, ${player2.color})`,
                                   WebkitBackgroundClip: 'text',
                                   WebkitTextFillColor: 'transparent'
                                 }}
                               >
                                 Back
                               </span>
                               <span className="text-[0.5rem] sm:text-[0.625rem] font-bold text-slate-600 uppercase tracking-widest mt-1">Team Setup</span>
                            </div>
                         </div>
                       </button>
                    </div>
                  </div>
                );
              })() : (
                <div className="py-20 text-center space-y-4">
                  <div className="inline-flex p-5 rounded-full bg-slate-900 border border-slate-800 text-slate-600">
                    <FileText className="w-10 h-10" />
                  </div>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Match record not found.</p>
                  <button onClick={() => setView('history')} className="text-emerald-500 font-black uppercase text-[0.625rem] hover:text-emerald-400 transition-colors">Return to History</button>
                </div>
              )}
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
                className="bg-black border-2 p-4 sm:p-8 rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar"
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
                          <div className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-widest">{method.desc}</div>
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
                  <h3 className="text-xl font-bold">Restore Defaults?</h3>
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
                      setCurrentBreakPlayerId('none');
                      setShowRestoreDefaultsConfirm(false);
                    }}
                    className="flex-1 h-12 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl font-bold transition-all"
                  >
                    Restore
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
                className="bg-black border-2 p-6 sm:p-10 rounded-[1.875rem] sm:rounded-[2.5rem] max-w-2xl w-full space-y-6 sm:space-y-10 text-center"
                style={{ 
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`,
                  boxShadow: `0 0 3.125rem ${player1.color}11`
                }}
              >
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="p-3 sm:p-4 rounded-full" style={{ backgroundColor: `${player1.color}11` }}>
                      <Trophy className="w-8 h-8 sm:w-12 sm:h-12" style={{ color: player1.color }} />
                    </div>
                  </div>
                  <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">Team Totals</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[0.625rem] sm:text-xs">Final Session Results</p>
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
                    boxShadow: `0 0.625rem 1.25rem ${player1.color}33`
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
      {view !== 'scoreboard' && view !== 'teams' && view !== 'settings' && view !== 'match-details' && <div className="h-16 lg:h-32" />}

      {/* Quick Actions Floating Bar (Mobile) */}
      <AnimatePresence>
        {view !== 'scoreboard' && view !== 'teams' && view !== 'settings' && view !== 'match-details' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/90 backdrop-blur-xl border-2 p-2 rounded-2xl shadow-2xl md:hidden z-50"
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
