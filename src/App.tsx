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
  Check,
  PlusCircle,
  Share2,
  Server,
  Zap,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eraser,
  RefreshCw,
  Glasses
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, FrameDetail, MatchHistoryEntry, MatchupSettings, DeviceInfo } from './types';
import { GroupMatchDetailsTable } from './components/GroupMatchDetailsTable';
import { MatchMatchDetailsTable } from './components/MatchMatchDetailsTable';
import { TopBarNav } from './components/TopBarNav';

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { 
  THEME_COLORS, 
  BACKGROUND_COLORS, 
  POOL_BALLS, 
  CLOTH_COLORS, 
  SPEED_CLOTH_COLORS,
  FULL_SCREEN_BACKDROPS
} from './constants';
import { SetupView } from './components/setup/SetupView';
import { ColorPicker } from './components/ColorPicker';
const portraitBackdrop = '/assets/portrait_mode_backdrop.webp';

const SHOT_CLOCK_DEFAULT = 30;

type SetupTab = 'group' | 'match';


const SLOT1_DEFAULTS = {
  color: '#33FF33',
  bgColor: '#800080',
  screenColor: '#000000',
  bgStyle: 'balls',
  screenStyle: 'default'
};

const SLOT2_DEFAULTS = {
  color: '#001CFF',
  bgColor: '#111111',
  screenColor: '#000000',
  bgStyle: 'balls',
  screenStyle: 'default'
};

export default function App() {
  // --- State ---
  const [activeSetupTab, setActiveSetupTab] = useState<SetupTab>('group');
  const [matchModeBreakSide, setMatchModeBreakSide] = useState<'1' | '2' | 'none'>('none');
  const [showDoublesPicker, setShowDoublesPicker] = useState<{ isOpen: boolean, mode: 'singles' | 'doubles' }>({ isOpen: false, mode: 'doubles' });
  const [showRefereePicker, setShowRefereePicker] = useState<{ isOpen: boolean, matchIndex: number | null, side: '1' | '2' }>({
    isOpen: false,
    matchIndex: null,
    side: '1'
  });
  const [selection1, setSelection1] = useState<string[]>([]);
  const [selection2, setSelection2] = useState<string[]>([]);
  const [player1, setPlayer1] = useState<Player>({ id: '1', name: '', score: 0, isTurn: true, ...SLOT1_DEFAULTS });
  const [player2, setPlayer2] = useState<Player>({ id: '2', name: '', score: 0, isTurn: false, ...SLOT2_DEFAULTS });
  const [matchupSettings, setMatchupSettings] = useState<Record<number, MatchupSettings>>({});
  const [playerPreferences, setPlayerPreferences] = useState<Record<string, { color: string, bgColor: string, screenColor: string, bgStyle: string, screenStyle: string }>>({});
  const [team1Name, setTeam1Name] = useState<string>('');
  const [team2Name, setTeam2Name] = useState<string>('');
  const [team1Players, setTeam1Players] = useState<string[]>([]);
  const [team2Players, setTeam2Players] = useState<string[]>([]);
  const [team1Roster, setTeam1Roster] = useState<string[]>([]);
  const [team2Roster, setTeam2Roster] = useState<string[]>([]);
  const [singlesSetup, setSinglesSetup] = useState({ 
    p1Name: '', 
    p2Name: '', 
    history: [] as MatchHistoryEntry[],
    frameDetails: [] as FrameDetail[],
    matchStartTime: null as string | null,
    score1: 0,
    score2: 0,
    currentBreakPlayerId: 'none' as '1' | '2' | 'none',
    breakBalls: [] as number[]
  });
  const [matchSetup, setMatchSetup] = useState({ 
    t1Name: '', 
    t2Name: '', 
    t1Players: [] as string[], 
    t2Players: [] as string[],
    t1Roster: [] as string[],
    t2Roster: [] as string[],
    settings: {} as Record<number, MatchupSettings>,
    selectedIndex: null as number | null,
    history: [] as MatchHistoryEntry[],
    frameDetails: [] as FrameDetail[],
    matchStartTime: null as string | null,
    score1: 0,
    score2: 0,
    currentBreakPlayerId: 'none' as '1' | '2' | 'none',
    breakBalls: [] as number[]
  });
  const [groupSetup, setGroupSetup] = useState({ 
    t1Players: [] as string[], 
    t2Players: [] as string[],
    t1Roster: [] as string[],
    t2Roster: [] as string[],
    settings: {} as Record<number, MatchupSettings>,
    selectedIndex: null as number | null,
    history: [] as MatchHistoryEntry[],
    frameDetails: [] as FrameDetail[],
    matchStartTime: null as string | null,
    score1: 0,
    score2: 0,
    currentBreakPlayerId: 'none' as '1' | '2' | 'none',
    breakBalls: [] as number[],
    quickP1: '',
    quickP2: ''
  });
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [currentMatchFrameDetails, setCurrentMatchFrameDetails] = useState<FrameDetail[]>([]);
  const [viewingMatchDetailsId, setViewingMatchDetailsId] = useState<string | null>(null);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [selectedHistoryEntryId, setSelectedHistoryEntryId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [view, setView] = useState<'scoreboard' | 'history' | 'settings' | 'teams' | 'match-details'>('scoreboard');
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isSwitchingTab, setIsSwitchingTab] = useState(false);
  const prevNamesRef = useRef({ p1: player1.name, p2: player2.name });
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
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTeamTotals, setShowTeamTotals] = useState(false);
  const [pendingMatchAdvance, setPendingMatchAdvance] = useState(false);
  const [shouldFlashBreaker, setShouldFlashBreaker] = useState(false);
  const [matchWinner, setMatchWinner] = useState<{name: string, team?: string, color: string, score1: number, score2: number} | null>(null);
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });
  const [breakBalls, setBreakBalls] = useState<number[]>([]);
  const [pairTrackerSettings, setPairTrackerSettings] = useState<Record<string, { breakBalls: number[], currentBreakPlayerId: '1' | '2' | 'none' }>>({});
  const [persistentRefereeRegistry, setPersistentRefereeRegistry] = useState<Record<string, { name: string, team: '1' | '2' }>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [matchStartTime, setMatchStartTime] = useState<string | null>(null);
  const [showDeviceTime, setShowDeviceTime] = useState(true);
  const [fullScreenBackdrop, setFullScreenBackdrop] = useState<string>('green');
  const [deviceTimePosition, setDeviceTimePosition] = useState<{ x: number, y: number } | null>(null);
  const [matchClockPosition, setMatchClockPosition] = useState<{ x: number, y: number } | null>(null);
  const [shotClockPosition, setShotClockPosition] = useState<{ x: number, y: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const frameStartTimeRef = useRef<number>(Date.now());
  const isFinishingMatchRef = useRef(false);
  const isKeyboardOpenRef = useRef(false);
  const clockRef = useRef<HTMLDivElement>(null);
  const matchClockRef = useRef<HTMLDivElement>(null);
  const shotClockRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString());
      const newIndex = parseInt(over.id.toString());

      // 1. Move player arrays
      const nextT1 = arrayMove(team1Players, oldIndex, newIndex) as string[];
      const nextT2 = arrayMove(team2Players, oldIndex, newIndex) as string[];
      updateTeamData(team1Name, nextT1, team2Name, nextT2);

      // 2. Reorder matchupSettings keys correctly
      setMatchupSettings(prev => {
        const next: Record<number, MatchupSettings> = {};
        const maxIdx = Math.max(nextT1.length, nextT2.length);
        const indices = Array.from({ length: maxIdx }, (_, i) => i);
        
        // movedIndices[newIdx] = oldIdx
        const movedIndices = arrayMove(indices, oldIndex, newIndex);
        
        // The arrayMove above actually gives us the NEW order of original values.
        // If we move value 0 to position 2 in [0, 1, 2], we get [1, 2, 0].
        // So newIdx 0 corresponds to oldIdx 1, etc.
        movedIndices.forEach((oldIdx, newIdx) => {
          if (prev[oldIdx]) {
            next[newIdx] = prev[oldIdx];
          }
        });
        
        return next;
      });

      // 3. Update selectedMatchIndex if it was moved
      if (selectedMatchIndex !== null) {
        const maxIdx = Math.max(team1Players.length, team2Players.length);
        const indices = Array.from({ length: maxIdx }, (_, i) => i);
        const movedIndices = arrayMove(indices, oldIndex, newIndex);
        // We want to find where the old selectedMatchIndex is now
        const newSelectedIdx = movedIndices.indexOf(selectedMatchIndex);
        if (newSelectedIdx !== -1) {
          setSelectedMatchIndex(newSelectedIdx);
        }
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Preload Pool Ball Assets
    const preloadImage = (src: string) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = resolve;
        img.onerror = resolve; // Continue even if one fails
      });
    };

    const assetsToPreload: string[] = [];
    
    POOL_BALLS.forEach(ball => {
      if (ball.image) assetsToPreload.push(ball.image);
      if (ball.thumbnail) assetsToPreload.push(ball.thumbnail);
      if (ball.mediumImage) assetsToPreload.push(ball.mediumImage);
    });

    FULL_SCREEN_BACKDROPS.forEach(backdrop => {
      if (backdrop.image) assetsToPreload.push(backdrop.image);
      if (backdrop.thumbnail) assetsToPreload.push(backdrop.thumbnail);
    });

    assetsToPreload.push(portraitBackdrop);

    // Run Preload
    Promise.all(assetsToPreload.map(src => preloadImage(src))).then(() => {
      console.log('All critical assets preloaded');
      setIsLoaded(true);
    });

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
    const isSquarish = (windowSize.width / windowSize.height) < 1.5;
    const shouldHideDeviceTime = isPortrait || isSquarish || !showDeviceTime;

    const isShort = windowSize.height < 500;
    
    // PWA Detection
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /android/.test(ua);

    // Unified title sizes based on device
    const titleSizes = {
      page: isPhone ? '6.655vh' : (isTablet ? '5.324vh' : '4.84vh'),
      subtitle: isPhone ? '3.5vh' : (isTablet ? '2.5vh' : '1.8vh'),
      section: isPhone ? '6.05vh' : (isTablet ? '4.84vh' : '4.4vh'),
      tile: isPhone ? '5.5vh' : (isTablet ? '4.4vh' : '4.0vh'),
      tileDesc: isPhone ? '3.3vh' : (isTablet ? '2.6vh' : '2.0vh')
    };

    return { 
      isPhone, isTablet, isDesktop, isLandscape, isPortrait, isShort, isSquarish,
      shouldHideDeviceTime, titleSizes,
      isStandalone, isIOS, isAndroid
    };
  }, [windowSize.width, windowSize.height, showDeviceTime]); 

  // Calculate shared font size for team names to occupy up to 95% of the gap below the top bar
  const sharedTeamNameFontSize = useMemo(() => {
    const topBarHeightVal = windowSize.height * (deviceInfo.isTablet ? 0.08 : 0.1);
    const topBarHeight = (deviceInfo.isPhone && !isNavVisible) ? 0 : topBarHeightVal;
    
    // The "gap" height is everything below the top bar
    const availableGapHeight = windowSize.height - topBarHeight;
    const targetHeight = availableGapHeight * 0.95;
    
    const getFontSizePerName = (name: string) => {
      const len = Math.max(1, name.length);
      return targetHeight / len;
    };

    const fs1 = getFontSizePerName(team1Name || 'TEAM A');
    const fs2 = getFontSizePerName(team2Name || 'TEAM B');
    const sharedLimit = Math.min(fs1, fs2);

    // Sidebar width is ~12vw on mobile, ~10vw on desktop
    const sidebarWidth = deviceInfo.isPhone ? (windowSize.width * 0.12) : (windowSize.width * 0.104);
    // Increase maximum size significantly to allow bolder side labels
    const maxFs = sidebarWidth * (deviceInfo.isPhone ? 1.6 : 1.4); 

    const finalFsPx = Math.min(sharedLimit, maxFs);
    
    // Return in vh for precise vertical autoscaling
    return `${(finalFsPx / windowSize.height) * 100}vh`;
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
      const parts = (name || "").split(' / ');
      const longestPart = parts.reduce((a, b) => a.length > b.length ? a : b, "");
      const len = Math.max(1, (longestPart || "PLAYER").length);
      const scale = deviceInfo.isPhone ? 1.5 : 1.2;
      let fs = (targetWidth * scale) / len;
      // If it's doubles, we need to scale down slightly for vertical space
      if (parts.length > 1) fs *= 0.85;
      return fs;
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
        (team1Players.some(p => p.trim() !== '') || team2Players.some(p => p.trim() !== '')) && 
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

  const getPlayerPref = (name: string, pSlot: 'p1' | 'p2') => {
    if (!name) return null;
    const collisionKey = `${pSlot}:${name}`;
    return playerPreferences[collisionKey] || playerPreferences[name] || null;
  };

  const getMatchResult = (p1: string, p2: string, mode?: string) => {
    if (!p1 || !p2) return null;
    const p1Clean = p1.trim().toLowerCase();
    const p2Clean = p2.trim().toLowerCase();
    return matchHistory.find(m => {
      const mhP1 = m.player1.trim().toLowerCase();
      const mhP2 = m.player2.trim().toLowerCase();
      const playersMatch = (mhP1 === p1Clean && mhP2 === p2Clean) || (mhP1 === p2Clean && mhP2 === p1Clean);
      const modeMatch = !mode || m.mode === mode;
      return playersMatch && modeMatch;
    });
  };

  const teamTotals = useMemo(() => {
    let t1 = 0;
    let t2 = 0;
    
    // Default Match/Group mode matching logic
    const maxMatches = Math.max(team1Players.length, team2Players.length);
    for (let i = 0; i < maxMatches; i++) {
      const p1Name = team1Players[i] || '';
      const p2Name = team2Players[i] || '';
      
      let m1 = 0;
      let m2 = 0;

      // 1. If it's the currently active match, use the live scores directly from player state
      if (selectedMatchIndex === i) {
        m1 = Number(player1.score) || 0;
        m2 = Number(player2.score) || 0;
      } else {
        const settings = matchupSettings[i];
        const match = getMatchResult(p1Name, p2Name, activeSetupTab);
        
        // 2. Use matchupSettings if available (which carries progress from the session)
        m1 = Number(settings?.score1 ?? 0) || 0;
        m2 = Number(settings?.score2 ?? 0) || 0;
      }
      
      t1 += m1;
      t2 += m2;
    }
    return { t1, t2 };
  }, [team1Players, team2Players, matchHistory, selectedMatchIndex, player1.name, player2.name, player1.score, player2.score, matchupSettings, activeSetupTab]);

  // --- Preference Synchronization ---
  useEffect(() => {
    if (!isLoaded) return;
    
    const updatePrefs = (player: Player) => {
      if (!player.name || player.name.includes('PLAYER')) return;
      
      setPlayerPreferences(prev => {
        const current = prev[player.name];
        if (current && 
            current.color === player.color && 
            current.bgColor === player.bgColor && 
            current.screenColor === player.screenColor && 
            current.bgStyle === player.bgStyle && 
            current.screenStyle === player.screenStyle) {
          return prev;
        }
        
        return {
          ...prev,
          [player.name]: {
            color: player.color,
            bgColor: player.bgColor,
            screenColor: player.screenColor,
            bgStyle: player.bgStyle,
            screenStyle: player.screenStyle
          }
        };
      });
    };

    updatePrefs(player1);
    updatePrefs(player2);
  }, [player1.color, player1.bgColor, player1.screenColor, player1.bgStyle, player1.screenStyle,
      player2.color, player2.bgColor, player2.screenColor, player2.bgStyle, player2.screenStyle,
      player1.name, player2.name, isLoaded]);

  // --- Initialization ---
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('pool_app_state');
      const state = savedState ? JSON.parse(savedState) : {};
      
      // Helper to get legacy or state value
      const getVal = (key: string, stateVal: any, legacyKey: string) => {
        return stateVal !== undefined ? stateVal : (localStorage.getItem(legacyKey) || undefined);
      };

      // Load active tab
      const savedTab = state.activeSetupTab;
      const loadedTab: SetupTab = (savedTab === 'group' || savedTab === 'match') ? savedTab : 'group';
      const t1Name = getVal('team1Name', state.teamData?.team1Name, 'pool_team1_name');
      const t2Name = getVal('team2Name', state.teamData?.team2Name, 'pool_team2_name');
      const t1PlayersLoaded = (state.teamData?.team1Players || JSON.parse(localStorage.getItem('pool_team1_players') || 'null') || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER '));
      const t2PlayersLoaded = (state.teamData?.team2Players || JSON.parse(localStorage.getItem('pool_team2_players') || 'null') || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER '));

      setActiveSetupTab(loadedTab);

      // Load isolated setup buffers
      if (state.matchSetup) {
        setMatchSetup({
          ...state.matchSetup,
          t1Players: (state.matchSetup.t1Players || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER ')),
          t2Players: (state.matchSetup.t2Players || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER ')),
          t1Roster: (state.matchSetup.t1Roster || (state.matchSetup.t1Players || [])).filter((p: string) => p && !p.includes('/')),
          t2Roster: (state.matchSetup.t2Roster || (state.matchSetup.t2Players || [])).filter((p: string) => p && !p.includes('/')),
        });
      }
      if (state.groupSetup) {
        setGroupSetup({
          ...state.groupSetup,
          t1Players: (state.groupSetup.t1Players || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER ')),
          t2Players: (state.groupSetup.t2Players || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER ')),
          t1Roster: (state.groupSetup.t1Roster || (state.groupSetup.t1Players || [])).filter((p: string) => p && !p.includes('/')),
          t2Roster: (state.groupSetup.t2Roster || (state.groupSetup.t2Players || [])).filter((p: string) => p && !p.includes('/')),
        });
      }

      // Initialize defaults for active players
      let p1Name = '';
      let p2Name = '';
      let currentT1Name = t1Name || '';
      let currentT2Name = t2Name || '';
      let currentT1Players = t1PlayersLoaded;
      let currentT2Players = t2PlayersLoaded;
      let currentT1Roster = state.teamData?.team1Roster || [];
      let currentT2Roster = state.teamData?.team2Roster || [];
      let history = state.gameData?.matchHistory || JSON.parse(localStorage.getItem('pool_match_history') || 'null') || [];
      let frameDetails = state.gameData?.currentMatchFrameDetails || [];
      let selIndex = state.gameData?.selectedMatchIndex !== undefined ? state.gameData.selectedMatchIndex : null;

      // Refine based on tab
      if (loadedTab === 'match' && state.matchSetup) {
        currentT1Name = state.matchSetup.t1Name || currentT1Name;
        currentT2Name = state.matchSetup.t2Name || currentT2Name;
        if (state.matchSetup.t1Players?.length > 0) currentT1Players = state.matchSetup.t1Players;
        if (state.matchSetup.t2Players?.length > 0) currentT2Players = state.matchSetup.t2Players;
        currentT1Roster = state.matchSetup.t1Roster || (state.matchSetup.t1Players || []).filter((p: string) => p && !p.includes('/'));
        currentT2Roster = state.matchSetup.t2Roster || (state.matchSetup.t2Players || []).filter((p: string) => p && !p.includes('/'));
        if (state.matchSetup.history?.length > 0) history = state.matchSetup.history;
        if (state.matchSetup.frameDetails?.length > 0) frameDetails = state.matchSetup.frameDetails;
        if (state.matchSetup.settings && Object.keys(state.matchSetup.settings).length > 0) {
          setMatchupSettings(state.matchSetup.settings);
        }
        selIndex = state.matchSetup.selectedIndex;
        if (selIndex !== null) {
          p1Name = currentT1Players[selIndex] || '';
          p2Name = currentT2Players[selIndex] || '';
        }
      } else if (loadedTab === 'group') {
        currentT1Name = '';
        currentT2Name = '';
        if (state.groupSetup) {
          if (state.groupSetup.t1Players?.length > 0) currentT1Players = state.groupSetup.t1Players;
          if (state.groupSetup.t2Players?.length > 0) currentT2Players = state.groupSetup.t2Players;
          currentT1Roster = state.groupSetup.t1Roster || (state.groupSetup.t1Players || []).filter((p: string) => p && !p.includes('/'));
          currentT2Roster = state.groupSetup.t2Roster || (state.groupSetup.t2Players || []).filter((p: string) => p && !p.includes('/'));
          if (state.groupSetup.history?.length > 0) history = state.groupSetup.history;
          if (state.groupSetup.frameDetails?.length > 0) frameDetails = state.groupSetup.frameDetails;
          if (state.groupSetup.settings && Object.keys(state.groupSetup.settings).length > 0) {
            setMatchupSettings(state.groupSetup.settings);
          }
          selIndex = state.groupSetup.selectedIndex;
          if (selIndex !== null) {
            p1Name = currentT1Players[selIndex] || '';
            p2Name = currentT2Players[selIndex] || '';
          }
        }
      }


      // Apply states
      setTeam1Name(currentT1Name);
      setTeam2Name(currentT2Name);
      setTeam1Players(currentT1Players);
      setTeam2Players(currentT2Players);
      setTeam1Roster(currentT1Roster);
      setTeam2Roster(currentT2Roster);
      setMatchHistory(history);
      setCurrentMatchFrameDetails(frameDetails);
      setSelectedMatchIndex(selIndex);

      if (state.gameData?.shotClock !== undefined) setShotClock(state.gameData.shotClock);
      if (state.gameData?.matchClock !== undefined) setMatchClock(state.gameData.matchClock);
      if (state.gameData?.matchStartTime !== undefined) setMatchStartTime(state.gameData.matchStartTime);
      if (state.gameData?.breakBalls !== undefined) setBreakBalls(state.gameData.breakBalls);
      if (state.gameData?.matchModeBreakSide !== undefined) setMatchModeBreakSide(state.gameData.matchModeBreakSide);
      if (state.pairTrackerSettings) setPairTrackerSettings(state.pairTrackerSettings);
      if (state.persistentRefereeRegistry) setPersistentRefereeRegistry(state.persistentRefereeRegistry);

      // Load Other Data (Load preferences early so they can be applied to player objects)
      const loadedPrefs = state.playerPreferences || {};
      if (state.playerPreferences) setPlayerPreferences(state.playerPreferences);
      
      // Load matchup settings: priority to the global settings if tab-specific ones are missing or empty
      const tabPrefix = loadedTab === 'match' ? 'match' : 'group';
      const tabSettings = state[`${tabPrefix}Setup`]?.settings;
      if (tabSettings && Object.keys(tabSettings).length > 0) {
        setMatchupSettings(tabSettings);
      } else if (state.matchupSettings) {
        setMatchupSettings(state.matchupSettings);
      }
      if (state.apiConfig) setApiConfig(state.apiConfig);

      // Prepare Player Objects
      let p1 = { ...player1, name: p1Name };
      let p2 = { ...player2, name: p2Name };

      // Load Preferences onto Player Objects
      if (state.userPreferences) {
        // ... (existing code for clocks etc)
        if (state.userPreferences.shotClockDuration !== undefined) setShotClockDuration(state.userPreferences.shotClockDuration);
        if (state.userPreferences.isShotClockEnabled !== undefined) setIsShotClockEnabled(state.userPreferences.isShotClockEnabled);
        if (state.userPreferences.matchClockDuration !== undefined) setMatchClockDuration(state.userPreferences.matchClockDuration);
        if (state.userPreferences.isMatchClockEnabled !== undefined) setIsMatchClockEnabled(state.userPreferences.isMatchClockEnabled);
        
        // Break tracking migration
        const forceEnabled = !state.userPreferences.breakTrackingV2Applied;
        if (forceEnabled) {
          setIsBreakTrackingEnabled(true);
        } else if (state.userPreferences.isBreakTrackingEnabled !== undefined) {
          setIsBreakTrackingEnabled(state.userPreferences.isBreakTrackingEnabled);
        }
        
        if (state.userPreferences.currentBreakPlayerId !== undefined) {
          setCurrentBreakPlayerId(state.userPreferences.currentBreakPlayerId || 'none');
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
      }

      // NOW: Overlay name-based preferences if they exist (This ensures cloth choice etc is restored)
      const p1Pref = (p1Name === p2Name && p1Name !== 'PLAYER 1') ? loadedPrefs[`p1:${p1Name}`] : loadedPrefs[p1Name];
      if (p1Pref) p1 = { ...p1, ...p1Pref };
      
      const p2Pref = (p1Name === p2Name && p2Name !== 'PLAYER 2') ? loadedPrefs[`p2:${p2Name}`] : loadedPrefs[p2Name];
      if (p2Pref) p2 = { ...p2, ...p2Pref };

      // Add scores from setup buffers (modern) or legacy gameData
      let s1 = 0;
      let s2 = 0;

      if (selIndex !== null) {
        const activeSettings = tabSettings?.[selIndex] || state.matchupSettings?.[selIndex];
        if (activeSettings) {
          s1 = activeSettings.score1 !== undefined ? activeSettings.score1 : (state.gameData?.player1Score || 0);
          s2 = activeSettings.score2 !== undefined ? activeSettings.score2 : (state.gameData?.player2Score || 0);
        } else {
          s1 = state.gameData?.player1Score || 0;
          s2 = state.gameData?.player2Score || 0;
        }
      } else {
        s1 = state.gameData?.player1Score || 0;
        s2 = state.gameData?.player2Score || 0;
      }

      p1.score = s1;
      p2.score = s2;

      // Update state once
      setPlayer1(p1);
      setPlayer2(p2);
      
      if (state.userPreferences?.fullScreenBackdrop !== undefined) {
        setFullScreenBackdrop(state.userPreferences.fullScreenBackdrop);
      } else if (state.gameData?.fullScreenBackdrop !== undefined) {
        setFullScreenBackdrop(state.gameData.fullScreenBackdrop);
      }
      
      if (state.userPreferences?.view !== undefined) setView(state.userPreferences.view);
      if (state.userPreferences?.isNavVisible !== undefined) setIsNavVisible(state.userPreferences.isNavVisible);
      if (state.userPreferences?.showDeviceTime !== undefined) setShowDeviceTime(state.userPreferences.showDeviceTime);
      if (state.userPreferences?.deviceTimePosition !== undefined) setDeviceTimePosition(state.userPreferences.deviceTimePosition);
      if (state.userPreferences?.matchClockPosition !== undefined) setMatchClockPosition(state.userPreferences.matchClockPosition);
      if (state.userPreferences?.shotClockPosition !== undefined) setShotClockPosition(state.userPreferences.shotClockPosition);

      // Finalize loading after state updates
      // setTimeout(() => setIsLoaded(true), 100); // Moved to asset preloader
    } catch (error) {
      console.error('Failed to load data from localStorage:', error);
      // Do not set isLoaded to true here to prevent wiping data with empty state
    }
  }, []);

  // --- Persistence (Single JSON Source) ---
  const getSelectionName = (value: string, style: string, type: 'bg' | 'screen') => {
    if (!value) return '';
    const list = type === 'bg' 
      ? (style === 'balls' ? POOL_BALLS : BACKGROUND_COLORS)
      : BACKGROUND_COLORS;
    return list.find(c => c.value.toLowerCase() === value.toLowerCase())?.name || value;
  };

  // --- Sync Buffer Effect ---
  // Keeps the setup buffers (matchSetup, groupSetup) updated in memory 
  // as the live game state changes. This ensures tab switching doesn't load stale data.
  useEffect(() => {
    if (!isLoaded || isSwitchingTab) return;

    const currentData = {
      history: matchHistory,
      frameDetails: currentMatchFrameDetails,
      matchStartTime: matchStartTime,
      score1: player1.score,
      score2: player2.score,
      currentBreakPlayerId: currentBreakPlayerId,
      breakBalls: [...breakBalls],
      settings: { ...matchupSettings },
      selectedIndex: selectedMatchIndex
    };

    if (activeSetupTab === 'match') {
      setMatchSetup(prev => ({ 
        ...prev, 
        ...currentData,
        t1Name: team1Name,
        t2Name: team2Name,
        t1Players: [...team1Players],
        t2Players: [...team2Players],
        t1Roster: [...team1Roster],
        t2Roster: [...team2Roster]
      }));
    } else if (activeSetupTab === 'group') {
      setGroupSetup(prev => ({ 
        ...prev, 
        ...currentData,
        t1Players: [...team1Players],
        t2Players: [...team2Players],
        t1Roster: [...team1Roster],
        t2Roster: [...team2Roster]
      }));
    }
  }, [
    isLoaded, isSwitchingTab, activeSetupTab,
    player1.score, player2.score, player1.name, player2.name,
    matchHistory, currentMatchFrameDetails, matchStartTime,
    currentBreakPlayerId, breakBalls, matchupSettings, selectedMatchIndex,
    team1Name, team2Name, team1Players, team2Players, team1Roster, team2Roster
  ]);

  // --- Global Persistence (Atomic and Isolated) ---
  const saveState = useCallback(() => {
    if (!isLoaded || isSwitchingTab) return;

    // Capture current data for the ACTIVE tab
    const currentActiveData: any = {
      history: matchHistory,
      frameDetails: currentMatchFrameDetails,
      matchStartTime: matchStartTime,
      score1: player1.score,
      score2: player2.score,
      currentBreakPlayerId: currentBreakPlayerId,
      breakBalls: [...breakBalls],
      settings: { ...matchupSettings },
      selectedIndex: selectedMatchIndex
    };

    // Atomic Score Sync: Force current live scores into the settings buffer for the active slot
    // This prevents race conditions where matchupSettings state update lags behind saveState.
    if (selectedMatchIndex !== null) {
      const currentLiveSettings = matchupSettings[selectedMatchIndex] || {};
      // ONLY sync if it was already marked as live, to avoid overwriting finished matches
      if (currentLiveSettings.isLive !== false) {
        currentActiveData.settings[selectedMatchIndex] = {
          ...currentLiveSettings,
          score1: player1.score,
          score2: player2.score,
          player1: { ...player1 },
          player2: { ...player2 },
          currentBreakPlayerId,
          breakBalls: [...breakBalls],
          frameDetails: currentMatchFrameDetails,
          isLive: true
        };
      }
    }

    const stateToSave = {
      activeSetupTab,
      // Global/Shared variables
      teamData: { 
        team1Name, team2Name, team1Players, team2Players, team1Roster, team2Roster 
      },
      playerPreferences,
      pairTrackerSettings,
      persistentRefereeRegistry,
      apiConfig,
      matchModeBreakSide,
      
      // Mode-Specific Buffers
      matchSetup: (activeSetupTab === 'match') 
        ? { ...matchSetup, ...currentActiveData, t1Name: team1Name, t2Name: team2Name, t1Players: [...team1Players], t2Players: [...team2Players], t1Roster: [...team1Roster], t2Roster: [...team2Roster] } 
        : matchSetup,
      groupSetup: (activeSetupTab === 'group') 
        ? { ...groupSetup, ...currentActiveData, t1Players: [...team1Players], t2Players: [...team2Players], t1Roster: [...team1Roster], t2Roster: [...team2Roster] } 
        : groupSetup,

      // UI/Shared Preference States
      userPreferences: {
        shotClockDuration,
        isShotClockEnabled,
        matchClockDuration,
        isMatchClockEnabled,
        isBreakTrackingEnabled,
        breakTrackingV2Applied: true,
        view,
        isNavVisible,
        showDeviceTime,
        fullScreenBackdrop,
        deviceTimePosition,
        matchClockPosition,
        shotClockPosition
      }
    };
    localStorage.setItem('pool_app_state', JSON.stringify(stateToSave));
  }, [
    isLoaded, isSwitchingTab, activeSetupTab,
    team1Name, team2Name, team1Players, team2Players, team1Roster, team2Roster,
    matchSetup, groupSetup,
    matchHistory, currentMatchFrameDetails, matchStartTime,
    player1.score, player2.score, player1.name, player2.name,
    currentBreakPlayerId, breakBalls, matchupSettings, selectedMatchIndex,
    shotClockDuration, isShotClockEnabled, matchClockDuration, isMatchClockEnabled,
    isBreakTrackingEnabled, view, isNavVisible, matchModeBreakSide, fullScreenBackdrop,
    showDeviceTime, deviceTimePosition, matchClockPosition, shotClockPosition,
    playerPreferences, pairTrackerSettings, persistentRefereeRegistry, apiConfig
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

  // PWA Install Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent browser's automatic behavior (like the mini-infobar on mobile)
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Handle scrolling to top when switching to match details
  useEffect(() => {
    if (view === 'match-details') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view]);

  // Sync current player preferences when they change
  useEffect(() => {
    if (!isLoaded) return;
    
    if (selectedMatchIndex !== null) {
      const currentSetting = matchupSettings[selectedMatchIndex];
      const newP1 = { name: player1.name, color: player1.color, bgColor: player1.bgColor, screenColor: player1.screenColor, bgStyle: player1.bgStyle, screenStyle: player1.screenStyle };
      const newP2 = { name: player2.name, color: player2.color, bgColor: player2.bgColor, screenColor: player2.screenColor, bgStyle: player2.bgStyle, screenStyle: player2.screenStyle };
      
      const hasChanged = !currentSetting || 
        JSON.stringify(currentSetting.player1) !== JSON.stringify(newP1) ||
        JSON.stringify(currentSetting.player2) !== JSON.stringify(newP2) ||
        currentSetting.score1 !== player1.score ||
        currentSetting.score2 !== player2.score ||
        currentSetting.currentBreakPlayerId !== currentBreakPlayerId ||
        JSON.stringify(currentSetting.breakBalls) !== JSON.stringify(breakBalls) ||
        currentSetting.isShotClockEnabled !== isShotClockEnabled ||
        currentSetting.shotClock !== shotClockDuration ||
        JSON.stringify(currentSetting.frameDetails) !== JSON.stringify(currentMatchFrameDetails);

      if (hasChanged) {
        setMatchupSettings(prev => ({
          ...prev,
          [selectedMatchIndex]: {
            player1: newP1,
            player2: newP2,
            score1: player1.score,
            score2: player2.score,
            currentBreakPlayerId: currentBreakPlayerId,
            breakBalls: breakBalls,
            isShotClockEnabled: isShotClockEnabled,
            shotClock: shotClockDuration,
            frameDetails: currentMatchFrameDetails
          }
        }));
      }
    }

    // Always sync player colors to playerPreferences if they have names
    // BUT: Skip if the name just changed in this render, to let the "Sync FROM" hook load the right prefs first
    const name1Changed = prevNamesRef.current.p1 !== player1.name;
    const name2Changed = prevNamesRef.current.p2 !== player2.name;
    
    if (player1.name && !name1Changed) {
      const newPref = { 
        color: player1.color, 
        colorName: THEME_COLORS.find(c => c.value.toLowerCase() === player1.color.toLowerCase())?.name || player1.color,
        bgColor: player1.bgColor, 
        bgName: getSelectionName(player1.bgColor, player1.bgStyle || 'default', 'bg'),
        screenColor: player1.screenColor,
        screenName: getSelectionName(player1.screenColor, player1.screenStyle || 'default', 'screen'),
        bgStyle: player1.bgStyle || 'default' as any,
        screenStyle: player1.screenStyle || 'default' as any
      };
      
      // Handle Unique Dataset constraint: If names are same, use a more specific key
      const prefKey = (player1.name === player2.name) ? `p1:${player1.name}` : player1.name;
      
      if (JSON.stringify(playerPreferences[prefKey]) !== JSON.stringify(newPref)) {
        setPlayerPreferences(prev => ({
          ...prev,
          [prefKey]: newPref
        }));
      }
    }
    if (player2.name && !name2Changed) {
      const newPref = { 
        color: player2.color, 
        colorName: THEME_COLORS.find(c => c.value.toLowerCase() === player2.color.toLowerCase())?.name || player2.color,
        bgColor: player2.bgColor, 
        bgName: getSelectionName(player2.bgColor, player2.bgStyle || 'default', 'bg'),
        screenColor: player2.screenColor,
        screenName: getSelectionName(player2.screenColor, player2.screenStyle || 'default', 'screen'),
        bgStyle: player2.bgStyle || 'default' as any,
        screenStyle: player2.screenStyle || 'default' as any
      };
      
      // Handle Unique Dataset constraint: If names are same, use a more specific key
      const prefKey = (player1.name === player2.name) ? `p2:${player2.name}` : player2.name;

      if (JSON.stringify(playerPreferences[prefKey]) !== JSON.stringify(newPref)) {
        setPlayerPreferences(prev => ({
          ...prev,
          [prefKey]: newPref
        }));
      }
    }

    // Update refs for next render
    prevNamesRef.current = { p1: player1.name, p2: player2.name };
  }, [
    selectedMatchIndex, 
    player1.name, player1.score, player1.color, player1.bgColor, player1.screenColor, player1.bgStyle, player1.screenStyle,
    player2.name, player2.score, player2.color, player2.bgColor, player2.screenColor, player2.bgStyle, player2.screenStyle,
    isShotClockEnabled, shotClockDuration,
    matchupSettings, playerPreferences, currentBreakPlayerId, breakBalls,
    currentMatchFrameDetails
  ]);

  // --- Ball Tracker Persistence Logic ---
  const pairKey = useMemo(() => {
    if (!player1.name || !player2.name) return null;
    return `${player1.name}|${player2.name}`;
  }, [player1.name, player2.name]);

  // Load from Pair Persistence when players change
  useEffect(() => {
    if (!isLoaded || !pairKey || activeSetupTab === 'match') return;
    const saved = pairTrackerSettings[pairKey];
    if (saved) {
      setBreakBalls(saved.breakBalls);
      setCurrentBreakPlayerId(saved.currentBreakPlayerId);
    } else {
      // It's a new pair of players - reset to defaults
      setBreakBalls([]);
      setCurrentBreakPlayerId('none');
    }
  }, [pairKey, isLoaded, activeSetupTab]);

  // Save to Pair Persistence when state changes
  useEffect(() => {
    if (!isLoaded || !pairKey) return;
    
    // Only save if the values are actually different to avoid unnecessary state updates
    const current = pairTrackerSettings[pairKey];
    if (!current || 
        JSON.stringify(current.breakBalls) !== JSON.stringify(breakBalls) || 
        current.currentBreakPlayerId !== currentBreakPlayerId) {
      setPairTrackerSettings(prev => ({
        ...prev,
        [pairKey]: { breakBalls, currentBreakPlayerId }
      }));
    }
  }, [breakBalls, currentBreakPlayerId, pairKey, isLoaded, activeSetupTab]);

  // Load matchup settings when match index changes
  useEffect(() => {
    if (!isLoaded || selectedMatchIndex === null || !matchupSettings[selectedMatchIndex]) return;
    
    const settings = matchupSettings[selectedMatchIndex];
    if (settings.player1) {
      setPlayer1(prev => ({
        ...prev,
        color: settings.player1.color || prev.color,
        bgColor: settings.player1.bgColor || prev.bgColor,
        screenColor: settings.player1.screenColor || prev.screenColor,
        bgStyle: settings.player1.bgStyle || 'default',
        screenStyle: settings.player1.screenStyle || 'default'
      }));
    }
    if (settings.player2) {
      setPlayer2(prev => ({
        ...prev,
        color: settings.player2.color || prev.color,
        bgColor: settings.player2.bgColor || prev.bgColor,
        screenColor: settings.player2.screenColor || prev.screenColor,
        bgStyle: settings.player2.bgStyle || 'default',
        screenStyle: settings.player2.screenStyle || 'default'
      }));
    }

    if (settings.breakBalls) {
      setBreakBalls(settings.breakBalls);
    }
    
    // Load frame details for the selected matchup
    setCurrentMatchFrameDetails(settings.frameDetails || []);

    // In Match Mode, we use session-wide deterministic logic if matchModeBreakSide is set,
    // so we only load from individual match settings if it's NOT Match Mode or no session logic exists.
    if (settings.currentBreakPlayerId && (activeSetupTab !== 'match' || matchModeBreakSide === 'none')) {
      setCurrentBreakPlayerId(settings.currentBreakPlayerId);
    }
  }, [selectedMatchIndex, isLoaded, activeSetupTab, matchModeBreakSide]); // Only run when match index or session logic changes

  // Synchronize breaker in Match mode when session settings change
  useEffect(() => {
    if (activeSetupTab === 'match' && matchModeBreakSide !== 'none' && selectedMatchIndex !== null) {
      const expectedSide = (selectedMatchIndex % 2 === 0) ? matchModeBreakSide : (matchModeBreakSide === '1' ? '2' : '1');
      setCurrentBreakPlayerId(expectedSide);
    }
  }, [matchModeBreakSide, selectedMatchIndex, activeSetupTab]);

  // Load player preferences when names change (e.g. typed in scoreboard)
  useEffect(() => {
    if (!isLoaded || !player1.name || focusedField) return;
    
    const pref = getPlayerPref(player1.name, 'p1');
    if (pref) {
      const hasChanges = 
        player1.color !== pref.color ||
        player1.bgColor !== pref.bgColor ||
        player1.screenColor !== pref.screenColor ||
        (pref.bgStyle && player1.bgStyle !== pref.bgStyle) ||
        (pref.screenStyle && player1.screenStyle !== pref.screenStyle);

      if (hasChanges) {
        // Use a functional update to ensure we don't accidentally revert name or score
        setPlayer1(prev => {
          // Double check the name in the hook context hasn't changed again before this update
          if (prev.name !== player1.name) return prev;
          
          return {
            ...prev,
            color: pref.color,
            bgColor: pref.bgColor,
            screenColor: pref.screenColor,
            bgStyle: (pref.bgStyle as any) || 'default',
            screenStyle: (pref.screenStyle as any) || 'default'
          };
        });
      }
    }
  }, [player1.name, playerPreferences, isLoaded, focusedField]); // Removed player1.id/others from deps to be focused

  useEffect(() => {
    if (!isLoaded || !player2.name || focusedField) return;
    
    const pref = getPlayerPref(player2.name, 'p2');
    if (pref) {
      const hasChanges = 
        player2.color !== pref.color ||
        player2.bgColor !== pref.bgColor ||
        player2.screenColor !== pref.screenColor ||
        (pref.bgStyle && player2.bgStyle !== pref.bgStyle) ||
        (pref.screenStyle && player2.screenStyle !== pref.screenStyle);

      if (hasChanges) {
        setPlayer2(prev => {
          if (prev.name !== player2.name) return prev;
          return {
            ...prev,
            color: pref.color,
            bgColor: pref.bgColor,
            screenColor: pref.screenColor,
            bgStyle: (pref.bgStyle as any) || 'default',
            screenStyle: (pref.screenStyle as any) || 'default'
          };
        });
      }
    }
  }, [player2.name, playerPreferences, isLoaded, focusedField]);

  // Ensure player names are fresh whenever entering gameplay view
  useEffect(() => {
    if (view === 'gameplay' && selectedMatchIndex !== null) {
      const p1 = team1Players[selectedMatchIndex] || '';
      const p2 = team2Players[selectedMatchIndex] || '';
      
      setPlayer1(prev => {
        const pref = getPlayerPref(p1, 'p1');
        return {
          ...prev,
          name: p1,
          color: pref?.color || '#33FF33',
          bgColor: pref?.bgColor || '#800080',
          screenColor: '#000000',
          bgStyle: (pref?.bgStyle as any) || 'balls',
          screenStyle: (pref?.screenStyle as any) || 'default'
        };
      });
      setPlayer2(prev => {
        const pref = getPlayerPref(p2, 'p2');
        return {
          ...prev,
          name: p2,
          color: pref?.color || '#001CFF',
          bgColor: pref?.bgColor || '#111111',
          screenColor: '#000000',
          bgStyle: (pref?.bgStyle as any) || 'balls',
          screenStyle: (pref?.screenStyle as any) || 'default'
        };
      });
    }
  }, [view, selectedMatchIndex, team1Players, team2Players]); // Removed playerPreferences to prevent feedback loop

  // --- Sound Logic ---
  const playBeep = useCallback((freq: number, volume = 0.012) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio context might be blocked by browser policy until interaction
    }
  }, []);

  // Beeps for shot clock (Higher tone: 880Hz)
  useEffect(() => {
    if (isTimerRunning && isShotClockEnabled && shotClock <= 5 && shotClock > 0) {
      playBeep(880);
    }
  }, [shotClock, isTimerRunning, isShotClockEnabled, playBeep]);

  // Beeps for match clock (Lower tone: 440Hz)
  useEffect(() => {
    if (isTimerRunning && isMatchClockEnabled && matchClock <= 5 && matchClock > 0) {
      playBeep(440);
    }
  }, [matchClock, isTimerRunning, isMatchClockEnabled, playBeep]);

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
    const isMatchMode = activeSetupTab === 'match';
    
    // Enforce break tracking if enabled
    if (isBreakTrackingEnabled && currentBreakPlayerId === 'none') {
      setShouldFlashBreaker(true);
      setTimeout(() => setShouldFlashBreaker(false), 1000);
      return;
    }

    // In "Match" mode, limit score to 1 (Best of 1) and do not auto-advance
    if (isMatchMode && (player1.score >= 1 || player2.score >= 1)) {
      return; 
    }

    const now = Date.now();
    const duration = Math.round((now - frameStartTimeRef.current) / 1000);
    
    const nextScore1 = playerId === '1' ? (Number(player1.score) || 0) + 1 : (Number(player1.score) || 0);
    const nextScore2 = playerId === '2' ? (Number(player2.score) || 0) + 1 : (Number(player2.score) || 0);
    
    const breakerId = currentBreakPlayerId;
    const breakerName = breakerId === '1' ? player1.name : player2.name;
    
    const p1NameValue = player1.name || '';
    const p2NameValue = player2.name || '';
    const lastMatch = getMatchResult(p1NameValue, p2NameValue, activeSetupTab);
    const regKey = [p1NameValue.trim().toUpperCase(), p2NameValue.trim().toUpperCase()].sort().join(' VS ');
    const autoRef = persistentRefereeRegistry[regKey];
    const currentRefSetting = selectedMatchIndex !== null ? matchupSettings[selectedMatchIndex]?.referee : undefined;
    const hasExplicitRef = selectedMatchIndex !== null && matchupSettings[selectedMatchIndex] && matchupSettings[selectedMatchIndex].hasOwnProperty('referee');
    
    const effectiveReferee = hasExplicitRef ? currentRefSetting : (lastMatch && lastMatch.referee ? lastMatch.referee : autoRef);

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
      duration,
      breakBalls: [...breakBalls],
      referee: effectiveReferee
    };
    
    setCurrentMatchFrameDetails(prev => [...prev, frameDetail]);
    frameStartTimeRef.current = now;

    if (playerId === '1') {
      setPlayer1(prev => ({ ...prev, score: nextScore1 }));
    } else {
      setPlayer2(prev => ({ ...prev, score: nextScore2 }));
    }
    
    if (selectedMatchIndex !== null) {
      setMatchupSettings(prev => ({
        ...prev,
        [selectedMatchIndex]: {
          ...prev[selectedMatchIndex],
          score1: nextScore1,
          score2: nextScore2,
          player1: playerId === '1' ? { ...player1, score: nextScore1 } : player1,
          player2: playerId === '2' ? { ...player2, score: nextScore2 } : player2,
          frameDetails: [...currentMatchFrameDetails, frameDetail]
        }
      }));
    }
    
    if (!matchStartTime) {
      setMatchStartTime(new Date().toISOString());
      
      // If we are in Match Mode and haven't selected a breaker for the match yet,
      // assume the one currently breaking (or the expected one) was the starting breaker for the session
      if (isMatchMode && matchModeBreakSide === 'none') {
        const side = currentBreakPlayerId === 'none' ? '1' : currentBreakPlayerId;
        const idx = selectedMatchIndex ?? 0;
        const sessionFirstSide = (idx % 2 === 0) ? side : (side === '1' ? '2' : '1');
        setMatchModeBreakSide(sessionFirstSide);
      }
    }

    if (isBreakTrackingEnabled) {
      // Global alternating break logic
      let nextBreaker: '1' | '2' | 'none' = currentBreakPlayerId;
      if (currentBreakPlayerId === 'none') {
        nextBreaker = playerId === '1' ? '2' : '1';
      } else {
        nextBreaker = currentBreakPlayerId === '1' ? '2' : '1';
      }

      // In Match Mode (Best of 1), do NOT swap breaker on score increment if match is over (score reached 1)
      const isEndOfMatch = isMatchMode && (nextScore1 >= 1 || nextScore2 >= 1);
      
      if (!isEndOfMatch) {
        setCurrentBreakPlayerId(nextBreaker);

        // Save break tracker state to matchup settings immediately
        if (selectedMatchIndex !== null) {
          setMatchupSettings(prev => ({
            ...prev,
            [selectedMatchIndex]: {
              ...prev[selectedMatchIndex],
              currentBreakPlayerId: nextBreaker
            }
          }));
        }
      }
    }
    
    // Save shot clock state to matchup settings
    if (selectedMatchIndex !== null) {
       setMatchupSettings(prev => ({
         ...prev,
         [selectedMatchIndex]: {
           ...prev[selectedMatchIndex],
           shotClock: shotClockDuration,
           isShotClockEnabled: isShotClockEnabled
         }
       }));
    }
    
    resetTimer();

    // In match mode, if score reaches 1, we show results automatically but don't finish until confirmed
    // (UI will show "Finish Match" or "Declare Winner" context)
  };

  const decrementScore = (playerId: string) => {
    // Undo the last frame detail if it matches the player
    let nextDetails = currentMatchFrameDetails;
    setCurrentMatchFrameDetails(prev => {
      if (prev.length === 0) return prev;
      const lastFrame = prev[prev.length - 1];
      if (lastFrame.winnerId === playerId) {
        nextDetails = prev.slice(0, -1);
        return nextDetails;
      }
      return prev;
    });

    if (playerId === '1') {
      const nextScore = Math.max(0, player1.score - 1);
      setPlayer1(prev => ({ ...prev, score: nextScore }));
      
      // Reset break tracker to 'none' if scores are wiped
      if (nextScore === 0 && player2.score === 0) {
        setCurrentBreakPlayerId('none');
      } else if (isBreakTrackingEnabled && currentBreakPlayerId !== 'none') {
        setCurrentBreakPlayerId(prev => prev === '1' ? '2' : '1');
      }

      if (selectedMatchIndex !== null) {
        setMatchupSettings(prev => ({
          ...prev,
          [selectedMatchIndex]: {
            ...prev[selectedMatchIndex],
            score1: nextScore,
            player1: { ...player1, score: nextScore },
            frameDetails: nextDetails,
            currentBreakPlayerId: (nextScore === 0 && player2.score === 0) ? 'none' : (prev[selectedMatchIndex].currentBreakPlayerId || 'none')
          }
        }));
      }
    } else {
      const nextScore = Math.max(0, player2.score - 1);
      setPlayer2(prev => ({ ...prev, score: nextScore }));

      // Reset break tracker to 'none' if scores are wiped
      if (nextScore === 0 && player1.score === 0) {
        setCurrentBreakPlayerId('none');
      } else if (isBreakTrackingEnabled && currentBreakPlayerId !== 'none') {
        setCurrentBreakPlayerId(prev => prev === '1' ? '2' : '1');
      }

      if (selectedMatchIndex !== null) {
        setMatchupSettings(prev => ({
          ...prev,
          [selectedMatchIndex]: {
            ...prev[selectedMatchIndex],
            score2: nextScore,
            player2: { ...player2, score: nextScore },
            frameDetails: nextDetails,
            currentBreakPlayerId: (nextScore === 0 && player1.score === 0) ? 'none' : (prev[selectedMatchIndex].currentBreakPlayerId || 'none')
          }
        }));
      }
    }
  };

  const getFinishButtonText = () => {
    if (selectedMatchIndex !== null) {
      const maxMatches = Math.max(team1Players.length, team2Players.length);
      const isLastMatch = selectedMatchIndex >= maxMatches - 1;
      
      if (activeSetupTab === 'match') {
        return isLastMatch ? "Finish Team Match" : "Next Match";
      } else if (activeSetupTab === 'group') {
        return isLastMatch ? "Finish Group" : "Next Match";
      }
    }
    
    return "Finish Match";
  };

  const finishMatch = () => {
    // 1. Navigation & State Persistence Logic:
    // This button primarily serves as a bridge back to the setup screen.
    if (selectedMatchIndex !== null) {
      setMatchupSettings(prev => ({
        ...prev,
        [selectedMatchIndex]: {
          ...prev[selectedMatchIndex],
          isLive: false,
          score1: player1.score,
          score2: player2.score,
          player1: { ...player1 },
          player2: { ...player2 },
          frameDetails: [...currentMatchFrameDetails],
          currentBreakPlayerId: currentBreakPlayerId,
          breakBalls: [...breakBalls],
          matchStartTime: matchStartTime
        }
      }));
    }
    completeMatchAndAdvance();
  };

  const clearAllTableData = () => {
    if (activeSetupTab === 'match') {
      clearMatchData(false);
    } else if (activeSetupTab === 'group') {
      clearGroupData(false);
    }
    
    // Close confirm
    setShowDeleteAllConfirm(false);
  };

  const completeMatchAndAdvance = () => {
    const isMatchMode = activeSetupTab === 'match';
    const isGroupMode = activeSetupTab === 'group';

    // Commit to persistent match history if there's any data
    const p1NameValue = (selectedMatchIndex !== null ? (team1Players[selectedMatchIndex] || '') : '');
    const p2NameValue = (selectedMatchIndex !== null ? (team2Players[selectedMatchIndex] || '') : '');

    if (p1NameValue && p2NameValue && (player1.score > 0 || player2.score > 0 || currentMatchFrameDetails.length > 0)) {
      const lastMatch = getMatchResult(p1NameValue, p2NameValue, activeSetupTab);
      const regKey = [p1NameValue.trim().toUpperCase(), p2NameValue.trim().toUpperCase()].sort().join(' VS ');
      const autoRef = persistentRefereeRegistry[regKey];
      const currentRefSetting = selectedMatchIndex !== null ? matchupSettings[selectedMatchIndex]?.referee : undefined;
      const hasExplicitRef = selectedMatchIndex !== null && matchupSettings[selectedMatchIndex] && matchupSettings[selectedMatchIndex].hasOwnProperty('referee');
      
      const effectiveReferee = hasExplicitRef ? currentRefSetting : (lastMatch && lastMatch.referee ? lastMatch.referee : autoRef);

      const historyEntry: MatchHistoryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        player1: p1NameValue,
        player2: p2NameValue,
        team1: (isMatchMode || isGroupMode) ? team1Name : undefined,
        team2: (isMatchMode || isGroupMode) ? team2Name : undefined,
        score1: player1.score,
        score2: player2.score,
        winner: player1.score > player2.score ? p1NameValue : (player2.score > player1.score ? p2NameValue : 'TIE'),
        mode: activeSetupTab as any,
        frameDetails: [...currentMatchFrameDetails],
        referee: effectiveReferee
      };
      setMatchHistory(prev => [historyEntry, ...prev]);
    }

    setCurrentMatchFrameDetails([]);
    setMatchStartTime(null);
    frameStartTimeRef.current = Date.now();
    
    // Logic for Match or Group
    if (isMatchMode || isGroupMode) {
      if (selectedMatchIndex !== null) {
        // Mark match as finalized in matchups
        setMatchupSettings(prev => ({
          ...prev,
          [selectedMatchIndex]: {
            ...prev[selectedMatchIndex],
            isLive: false,
            score1: player1.score,
            score2: player2.score,
            player1: { ...player1 },
            player2: { ...player2 },
            frameDetails: [...currentMatchFrameDetails],
            currentBreakPlayerId: currentBreakPlayerId,
            breakBalls: [...breakBalls],
            matchStartTime: matchStartTime
          }
        }));

        const maxMatches = Math.max(team1Players.length, team2Players.length);
        const nextIndex = selectedMatchIndex + 1;
        
        // Advance only in multi-match modes
        if (nextIndex < maxMatches) {
          selectTeamMatch(nextIndex);
        } else {
          // Finish session / match
          setCurrentBreakPlayerId('none');
          setBreakBalls([]);
          setSelectedMatchIndex(null);
          
          // Keep scores as-is for display in the table
          resetTimer();
          navigateToView('teams');
          
          // Auto-scroll to results table after transition
          setTimeout(() => {
            const table = document.getElementById('matchups-table');
            if (table) {
              table.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        }
      } else {
        // Fallback / null index cleanup
        setCurrentBreakPlayerId('none');
        setBreakBalls([]);
        setSelectedMatchIndex(null);
        resetTimer();
        navigateToView('teams');
      }
    } else {
      // Emergency fallback / Other modes
      setCurrentBreakPlayerId('none');
      setBreakBalls([]);
      setSelectedMatchIndex(null);
      resetTimer();
      navigateToView('teams');
    }
  };

  const deleteMatchup = (index: number) => {
    const newT1 = team1Players.filter((_, i) => i !== index);
    const newT2 = team2Players.filter((_, i) => i !== index);
    
    // Shift settings
    const newSettings: Record<number, MatchupSettings> = {};
    Object.entries(matchupSettings).forEach(([idxStr, val]) => {
      const idx = parseInt(idxStr);
      if (idx < index) {
        newSettings[idx] = val as MatchupSettings;
      } else if (idx > index) {
        newSettings[idx - 1] = val as MatchupSettings;
      }
    });

    setMatchupSettings(newSettings);
    updateTeamData(team1Name, newT1, team2Name, newT2);

    if (selectedMatchIndex === index) {
      setSelectedMatchIndex(null);
    } else if (selectedMatchIndex !== null && selectedMatchIndex > index) {
      setSelectedMatchIndex(selectedMatchIndex - 1);
    }
  };

  const clearMatchResult = (p1: string, p2: string, index?: number) => {
    const p1Clean = p1.trim().toLowerCase();
    const p2Clean = p2.trim().toLowerCase();

    // 1. Clear from history using functional update for robustness
    setMatchHistory(prev => prev.filter(m => {
      const mhP1 = m.player1.trim().toLowerCase();
      const mhP2 = m.player2.trim().toLowerCase();
      return !((mhP1 === p1Clean && mhP2 === p2Clean) || (mhP1 === p2Clean && mhP2 === p1Clean));
    }));

    // 2. Reset live matchup settings if index is provided
    if (index !== undefined) {
      setMatchupSettings(prev => {
        const next = { ...prev };
        const existing = next[index];
        next[index] = {
          player1: existing?.player1 || { name: p1 },
          player2: existing?.player2 || { name: p2 },
          score1: 0,
          score2: 0,
          currentBreakPlayerId: 'none',
          breakBalls: [],
          frameDetails: [],
          referee: existing?.referee
        };
        return next;
      });
      
      // 3. If it's the active match, reset the live players' scores
      if (selectedMatchIndex === index) {
        setPlayer1(prev => ({ ...prev, score: 0 }));
        setPlayer2(prev => ({ ...prev, score: 0 }));
        setCurrentBreakPlayerId('none');
        setBreakBalls([]);
        setCurrentMatchFrameDetails([]);
        setMatchStartTime(null);
      }
    }
  };

  const selectTeamMatch = (index: number, skipNavigate = false) => {
    const p1Name = team1Players[index] || '';
    const p2Name = team2Players[index] || '';
    
    // Load individual player preferences if they exist
    const p1Pref = getPlayerPref(p1Name, 'p1');
    const p2Pref = getPlayerPref(p2Name, 'p2');
    
    // Load matchup-specific settings (scores, colors)
    const settings = matchupSettings[index];

    // Check history for inferred status (like who should break next) but NOT for scores
    const existingResult = getMatchResult(p1Name, p2Name, activeSetupTab);
    let p1Score = settings?.score1 !== undefined ? settings.score1 : 0;
    let p2Score = settings?.score2 !== undefined ? settings.score2 : 0;
    let frameDetails = settings?.frameDetails || [];
    let startTime = settings?.matchStartTime || null;
    
    // Safety check: if names match existing active session, 
    // prefer the live scoreboard state if settings are empty or 0-0 but we have a live game
    const isActuallyCurrentSession = (p1Name === player1.name && p2Name === player2.name);
    
    let currentBreaker = settings?.currentBreakPlayerId || 'none';
    let currentBalls = settings?.breakBalls || [];

    if (isActuallyCurrentSession && (p1Score === 0 && p2Score === 0) && (player1.score > 0 || player2.score > 0 || currentMatchFrameDetails.length > 0)) {
      p1Score = player1.score;
      p2Score = player2.score;
      frameDetails = currentMatchFrameDetails;
      startTime = matchStartTime;
      currentBreaker = currentBreakPlayerId;
      currentBalls = breakBalls;
    }
    
    setPlayer1(prev => ({ 
      ...prev, 
      ...SLOT1_DEFAULTS,
      name: p1Name, 
      score: p1Score,
      ...(settings?.player1 || {}),
      ...(p1Pref || {})
    }));
    
    setPlayer2(prev => ({ 
      ...prev, 
      ...SLOT2_DEFAULTS,
      name: p2Name, 
      score: p2Score,
      ...(settings?.player2 || {}),
      ...(p2Pref || {})
    }));

    setCurrentMatchFrameDetails(frameDetails);
    setMatchStartTime(startTime);
    setCurrentBreakPlayerId(currentBreaker);
    setBreakBalls(currentBalls);
    
    // Auto-persist referee from registry if missing in settings
    const hasExplicitReferee = settings && settings.hasOwnProperty('referee');
    if (!hasExplicitReferee) {
      const p1 = team1Players[index];
      const p2 = team2Players[index];
      if (p1 && p2) {
        const regKey = [p1.trim().toUpperCase(), p2.trim().toUpperCase()].sort().join(' VS ');
        const autoRef = persistentRefereeRegistry[regKey];
        const lastMatch = getMatchResult(p1, p2, activeSetupTab);
        const effectiveRef = autoRef || (lastMatch && lastMatch.referee ? lastMatch.referee : undefined);
        
        if (effectiveRef) {
          setMatchupSettings(prev => ({
            ...prev,
            [index]: {
              ...(prev[index] || {
                score1: 0,
                score2: 0,
                player1: { name: p1 },
                player2: { name: p2 },
                currentBreakPlayerId: 'none'
              }),
              referee: effectiveRef
            }
          }));
        }
      }
    }

    setSelectedMatchIndex(index);
    setSelectedHistoryEntryId(null);
    
    // Match Mode Deterministic Break Logic: Use the session's starting side and alternate by index
    if (activeSetupTab === 'match') {
      const p1p2Key = `${p1Name}|${p2Name}`;
      const p2p1Key = `${p2Name}|${p1Name}`;
      const savedHistory = pairTrackerSettings[p1p2Key];
      const reversedHistory = pairTrackerSettings[p2p1Key];
      
      // Deep fallback to last finished match in matchHistory if pairTrackerSettings is missing
      let historyInferredSide: '1' | '2' | 'none' = 'none';
      if (!savedHistory && !reversedHistory && existingResult && existingResult.frameDetails && existingResult.frameDetails.length > 0) {
        const lastFrame = existingResult.frameDetails[existingResult.frameDetails.length - 1];
        if (lastFrame.breakerId === '1' || lastFrame.breakerId === '2') {
          const lastBreakerId = lastFrame.breakerId as '1' | '2';
          const isSameOrder = existingResult.player1 === p1Name;
          // If we finished a frame, the NEXT breaker should be the other one (alternating)
          if (isSameOrder) {
            historyInferredSide = lastBreakerId === '1' ? '2' : '1';
          } else {
            // If order reversed, '1' was the current P2
            const actualLastBreaker = lastBreakerId === '1' ? '2' : '1'; 
            historyInferredSide = actualLastBreaker === '1' ? '2' : '1';
          }
        }
      }

      if (matchModeBreakSide === 'none') {
        // If session breaker isn't set, respect the individual match's saved breaker
        if (settings?.currentBreakPlayerId && settings.currentBreakPlayerId !== 'none') {
          setCurrentBreakPlayerId(settings.currentBreakPlayerId);
        } else if (savedHistory) {
          setCurrentBreakPlayerId(savedHistory.currentBreakPlayerId);
        } else if (reversedHistory) {
          // If reversed, '1' becomes '2' and vice versa
          const rev = reversedHistory.currentBreakPlayerId;
          setCurrentBreakPlayerId(rev === '1' ? '2' : (rev === '2' ? '1' : 'none'));
        } else if (historyInferredSide !== 'none') {
          setCurrentBreakPlayerId(historyInferredSide);
        } else {
          setCurrentBreakPlayerId('none');
        }
      } else {
        // The expected breaker for this specific match index based on session rotation
        // This is STATIC and known right from the start of the first match
        const expectedSide = (index % 2 === 0) ? matchModeBreakSide : (matchModeBreakSide === '1' ? '2' : '1');
        
        // Always prioritize the deterministic session side in Match Mode for consistency
        setCurrentBreakPlayerId(expectedSide);
      }
    } else {
      const p1p2Key = `${p1Name}|${p2Name}`;
      const p2p1Key = `${p2Name}|${p1Name}`;
      const savedHistory = pairTrackerSettings[p1p2Key];
      const reversedHistory = pairTrackerSettings[p2p1Key];

      // Deep fallback to last finished match in matchHistory if pairTrackerSettings is missing
      let historyInferredSide: '1' | '2' | 'none' = 'none';
      if (!savedHistory && !reversedHistory && existingResult && existingResult.frameDetails && existingResult.frameDetails.length > 0) {
        const lastFrame = existingResult.frameDetails[existingResult.frameDetails.length - 1];
        if (lastFrame.breakerId === '1' || lastFrame.breakerId === '2') {
          const lastBreakerId = lastFrame.breakerId as '1' | '2';
          const isSameOrder = existingResult.player1 === p1Name;
          if (isSameOrder) {
            historyInferredSide = lastBreakerId === '1' ? '2' : '1';
          } else {
            const actualLastBreaker = lastBreakerId === '1' ? '2' : '1'; 
            historyInferredSide = actualLastBreaker === '1' ? '2' : '1';
          }
        }
      }

      if (settings?.currentBreakPlayerId && settings.currentBreakPlayerId !== 'none') {
        setCurrentBreakPlayerId(settings.currentBreakPlayerId);
      } else if (savedHistory) {
        setCurrentBreakPlayerId(savedHistory.currentBreakPlayerId);
      } else if (reversedHistory) {
        const rev = reversedHistory.currentBreakPlayerId;
        setCurrentBreakPlayerId(rev === '1' ? '2' : (rev === '2' ? '1' : 'none'));
      } else if (historyInferredSide !== 'none') {
        setCurrentBreakPlayerId(historyInferredSide);
      } else {
        setCurrentBreakPlayerId('none');
      }
    }
    
    setBreakBalls(settings?.breakBalls || []);
    setCurrentMatchFrameDetails(settings?.frameDetails || []);
    
    // Load shot clock state for this matchup
    if (settings?.isShotClockEnabled !== undefined) {
      setIsShotClockEnabled(settings.isShotClockEnabled);
      if (settings.shotClock !== undefined) {
        setShotClockDuration(settings.shotClock);
        setShotClock(settings.shotClock);
      }
    }

    if (!skipNavigate) {
      setView('scoreboard');
    }
    resetTimer();
    resetMatchClock();
  };

  const goNextMatch = () => {
    const max = Math.max(team1Players.length, team2Players.length);
    if (max <= 0) return;
    const nextIndex = (selectedMatchIndex === null || selectedMatchIndex >= max - 1) ? 0 : selectedMatchIndex + 1;
    selectTeamMatch(nextIndex);
  };

  const goPrevMatch = () => {
    const max = Math.max(team1Players.length, team2Players.length);
    if (max <= 0) return;
    const prevIndex = (selectedMatchIndex === null || selectedMatchIndex <= 0) ? max - 1 : selectedMatchIndex - 1;
    selectTeamMatch(prevIndex);
  };

  const viewMatchDetails = (matchId: string) => {
    setViewingMatchDetailsId(matchId);
    navigateToView('match-details');
  };

  const navigateToView = (newView: typeof view) => {
    setView(newView);
    if (deviceInfo.isPhone && newView !== 'scoreboard') setIsNavVisible(false);
  };

  const navigateBack = () => {
    // If we're in details, going "back" always means returning to the setup page (teams)
    if (view === 'match-details') {
      navigateToView('teams');
    } else {
      navigateToView('scoreboard');
    }
  };

  const getFirstUnplayedMatchupIndex = () => {
    const maxIdx = Math.max(team1Players.length, team2Players.length);
    for (let i = 0; i < maxIdx; i++) {
        const matchup = matchupSettings[i];
        const hasData = matchup && (
            (matchup.score1 || 0) > 0 || 
            (matchup.score2 || 0) > 0 || 
            (matchup.frameDetails && matchup.frameDetails.length > 0) ||
            matchup.isFinished
        );
        if (!hasData) return i;
    }
    return -1;
  };

  const navigateToScoreboard = () => {
    if (activeSetupTab === 'group' && selectedMatchIndex === null) {
      const firstUnplayed = getFirstUnplayedMatchupIndex();
      if (firstUnplayed !== -1) {
        selectTeamMatch(firstUnplayed);
      } else if (team1Players.length > 0) {
        selectTeamMatch(0);
      }
    }
    navigateToView('scoreboard');
    if (deviceInfo.isPhone) setIsNavVisible(true);
  };

  const clearMatchData = (clearNames = false) => {
    // 1. Clear Match Mode Specific State
    const currentT1 = (team1Name || '').trim().toLowerCase();
    const currentT2 = (team2Name || '').trim().toLowerCase();

    if (clearNames) {
      setTeam1Name('');
      setTeam2Name('');
      setTeam1Players([]);
      setTeam2Players([]);
      setTeam1Roster([]);
      setTeam2Roster([]);
      setMatchupSettings({});
      setMatchHistory([]); // Also clear history if we are clearing "Team Data" (the whole session)
      setPairTrackerSettings({}); // Clear all pair memories if clearing the whole team session
    } else {
      // Preserve the matchups (slots/referees) but clear scores and frames
      setMatchupSettings(prev => {
        const reset: Record<number, any> = {};
        Object.entries(prev).forEach(([idx, settings]) => {
          reset[parseInt(idx)] = {
            ...(settings as any),
            score1: 0,
            score2: 0,
            frameDetails: [],
            isLive: false,
            matchStartTime: undefined,
            currentBreakPlayerId: 'none'
          };
        });
        return reset;
      });
    }
    
    setMatchSetup(prev => ({ 
      ...prev,
      t1Name: clearNames ? '' : prev.t1Name, 
      t2Name: clearNames ? '' : prev.t2Name, 
      t1Players: clearNames ? [] : prev.t1Players, 
      t2Players: clearNames ? [] : prev.t2Players, 
      t1Roster: clearNames ? [] : (prev as any).t1Roster,
      t2Roster: clearNames ? [] : (prev as any).t2Roster,
      settings: clearNames ? {} : (() => {
        const reset: Record<number, any> = {};
        Object.entries(prev.settings || {}).forEach(([idx, settings]) => {
          reset[parseInt(idx)] = {
            ...(settings as any),
            score1: 0,
            score2: 0,
            frameDetails: [],
            isLive: false
          };
        });
        return reset;
      })(), 
      selectedIndex: null,
      history: clearNames ? [] : prev.history, 
      frameDetails: clearNames ? [] : prev.frameDetails, 
      matchStartTime: null, 
      score1: 0, 
      score2: 0,
      currentBreakPlayerId: 'none',
      breakBalls: []
    }));
    
    setSelectedMatchIndex(null);
    setSelectedHistoryEntryId(null);
    setMatchModeBreakSide('none');
    
    // Reset scores and names in current view if active
    if (activeSetupTab === 'match') {
      setPlayer1(prev => ({ ...prev, name: clearNames ? '' : prev.name, score: 0 }));
      setPlayer2(prev => ({ ...prev, name: clearNames ? '' : prev.name, score: 0 }));
      setCurrentMatchFrameDetails([]);
      setMatchStartTime(null);
    }

    // 2. Clear history entries specifically for this session to prevent "reappearing scores"
    // AND clear pairTrackerSettings for all pairings in this session
    setMatchHistory(prev => prev.filter(m => {
      // If we have team names, remove history that matches these teams to ensure a fresh session
      if (currentT1 && currentT2) {
        const mT1 = (m.team1 || m.player1 || '').trim().toLowerCase();
        const mT2 = (m.team2 || m.player2 || '').trim().toLowerCase();
        
        const isExactMatch = (mT1 === currentT1 && mT2 === currentT2) || (mT1 === currentT2 && mT2 === currentT1);
        if (isExactMatch) return false;
      }
      
      // ALSO clear history for any specific pairings currently defined in the setup
      const currentMatchups = Object.values(matchupSettings) as MatchupSettings[];
      for (const matchup of currentMatchups) {
        const p1 = (matchup.player1?.name || '').trim().toLowerCase();
        const p2 = (matchup.player2?.name || '').trim().toLowerCase();
        if (p1 && p2) {
          const mP1 = (m.player1 || '').trim().toLowerCase();
          const mP2 = (m.player2 || '').trim().toLowerCase();
          if ((mP1 === p1 && mP2 === p2) || (mP1 === p2 && mP2 === p1)) return false;
        }
      }
      
      // If no team names, we only clear it if it was explicitly a 'match' mode entry AND we are clearing everything
      if (clearNames && m.mode === 'match') return false;

      return true;
    }));

    // Clear specific pair tracker settings for all current matchups
    setPairTrackerSettings(prev => {
      const next = { ...prev };
      const currentMatchups = Object.values(matchupSettings) as MatchupSettings[];
      for (const matchup of currentMatchups) {
        const p1 = (matchup.player1?.name || '').trim().toLowerCase();
        const p2 = (matchup.player2?.name || '').trim().toLowerCase();
        if (p1 && p2) {
          delete next[`${p1}|${p2}`];
          delete next[`${p2}|${p1}`];
        }
      }
      return next;
    });
  };

  const clearGroupData = (clearNames = false) => {
    // 1. Clear Group Specific State
    const currentT1 = (team1Name || '').trim().toLowerCase();
    const currentT2 = (team2Name || '').trim().toLowerCase();

    if (clearNames) {
      setTeam1Name('');
      setTeam2Name('');
      setTeam1Players([]);
      setTeam2Players([]);
      setTeam1Roster([]);
      setTeam2Roster([]);
      setMatchupSettings({});
      setMatchHistory([]);
      setPairTrackerSettings({});
    }

    setGroupSetup(prev => ({ 
      ...prev,
      t1Players: clearNames ? [] : prev.t1Players, 
      t2Players: clearNames ? [] : prev.t2Players, 
      t1Roster: clearNames ? [] : (prev as any).t1Roster,
      t2Roster: clearNames ? [] : (prev as any).t2Roster,
      quickP1: clearNames ? '' : prev.quickP1,
      quickP2: clearNames ? '' : prev.quickP2,
      settings: {}, 
      selectedIndex: null,
      history: [], 
      frameDetails: [], 
      matchStartTime: null, 
      score1: 0, 
      score2: 0,
      currentBreakPlayerId: 'none',
      breakBalls: []
    }));
    
    // Reset scores and names in current view if active
    if (activeSetupTab === 'group') {
      setPlayer1(prev => ({ ...prev, name: clearNames ? '' : prev.name, score: 0 }));
      setPlayer2(prev => ({ ...prev, name: clearNames ? '' : prev.name, score: 0 }));
      setCurrentMatchFrameDetails([]);
      setMatchStartTime(null);
      setSelectedHistoryEntryId(null);
    }

    // 2. Clear history entries specifically for this session and clear pair tracker settings
    setMatchHistory(prev => prev.filter(m => {
      // If we have team names, remove history that matches these teams
      if (currentT1 && currentT2) {
        const mT1 = (m.team1 || m.player1 || '').trim().toLowerCase();
        const mT2 = (m.team2 || m.player2 || '').trim().toLowerCase();
        
        const isExactMatch = (mT1 === currentT1 && mT2 === currentT2) || (mT1 === currentT2 && mT2 === currentT1);
        if (isExactMatch) return false;
      }

      // ALSO clear history for any specific pairings currently defined
      for (let i = 0; i < Math.max(team1Players.length, team2Players.length); i++) {
        const p1 = (team1Players[i] || '').trim().toLowerCase();
        const p2 = (team2Players[i] || '').trim().toLowerCase();
        if (p1 && p2) {
          const mP1 = (m.player1 || '').trim().toLowerCase();
          const mP2 = (m.player2 || '').trim().toLowerCase();
          if ((mP1 === p1 && mP2 === p2) || (mP1 === p2 && mP2 === p1)) return false;
        }
      }

      // If clearing everything, remove group entries
      if (clearNames && m.mode === 'group') return false;
      
      return true;
    }));

    // Clear specific pair tracker settings for all current matchups
    setPairTrackerSettings(prev => {
      const next = { ...prev };
      for (let i = 0; i < Math.max(team1Players.length, team2Players.length); i++) {
        const p1 = (team1Players[i] || '').trim().toLowerCase();
        const p2 = (team2Players[i] || '').trim().toLowerCase();
        if (p1 && p2) {
          delete next[`${p1}|${p2}`];
          delete next[`${p2}|${p1}`];
        }
      }
      return next;
    });
  };

  const clearTeams = () => {
    if (activeSetupTab === 'match') {
      clearMatchData(true);
    } else if (activeSetupTab === 'group') {
      clearGroupData(true);
    }
    
    setShowClearTeamsConfirm(false);
  };

  const updateTeamData = (
    t1Name: string, 
    t1Players: string[], 
    t2Name: string, 
    t2Players: string[]
  ) => {
    // Basic guards
    if (!Array.isArray(t1Players) || !Array.isArray(t2Players)) return;

    setTeam1Name(t1Name);
    setTeam1Players([...t1Players]);
    setTeam2Name(t2Name);
    setTeam2Players([...t2Players]);

    const currentData: any = {
      history: matchHistory,
      frameDetails: currentMatchFrameDetails,
      matchStartTime: matchStartTime,
      score1: player1.score,
      score2: player2.score,
      currentBreakPlayerId: currentBreakPlayerId,
      breakBalls: [...breakBalls],
      settings: { ...matchupSettings },
      selectedIndex: selectedMatchIndex
    };

    // Atomic Sync: merge current live player state into the settings for this slot
    if (selectedMatchIndex !== null) {
      currentData.settings[selectedMatchIndex] = {
        ...(matchupSettings[selectedMatchIndex] || {}),
        score1: player1.score,
        score2: player2.score,
        player1: { ...player1 },
        player2: { ...player2 },
        currentBreakPlayerId,
        breakBalls: [...breakBalls],
        frameDetails: currentMatchFrameDetails
      };
    }

    // Sync buffers
    if (activeSetupTab === 'match' && !isSwitchingTab) {
      setMatchSetup(prev => ({ 
        ...prev, 
        t1Name, t2Name, t1Players: [...t1Players], t2Players: [...t2Players],
        ...currentData
      }));
    } else if (activeSetupTab === 'group' && !isSwitchingTab) {
      setGroupSetup(prev => ({ 
        ...prev, 
        t1Players: [...t1Players], t2Players: [...t2Players],
        ...currentData
      }));
    }

    // Sync active player names if a match is selected
    if (selectedMatchIndex !== null) {
      const p1 = t1Players[selectedMatchIndex] || '';
      const p2 = t2Players[selectedMatchIndex] || '';
      const settings = matchupSettings[selectedMatchIndex];
      
      setPlayer1(prev => {
        const pref = getPlayerPref(p1, 'p1');
        return {
          ...prev,
          ...SLOT1_DEFAULTS,
          name: p1,
          ...(settings?.player1 || {}),
          ...(pref || {})
        };
      });
      setPlayer2(prev => {
        const pref = getPlayerPref(p2, 'p2');
        return {
          ...prev,
          ...SLOT2_DEFAULTS,
          name: p2,
          ...(settings?.player2 || {}),
          ...(pref || {})
        };
      });
    }
  };

  const updateRosterData = (
    t1Roster: string[], 
    t2Roster: string[]
  ) => {
    setTeam1Roster([...t1Roster]);
    setTeam2Roster([...t2Roster]);

    if (activeSetupTab === 'match' && !isSwitchingTab) {
      setMatchSetup(prev => ({ ...prev, t1Roster: [...t1Roster], t2Roster: [...t2Roster] }));
    } else if (activeSetupTab === 'group' && !isSwitchingTab) {
      setGroupSetup(prev => ({ ...prev, t1Roster: [...t1Roster], t2Roster: [...t2Roster] }));
    }
  };

  const handleOpenPicker = (team: 1 | 2, mode: 'singles' | 'doubles') => {
    setSelection1([]);
    setSelection2([]);
    setShowDoublesPicker({ isOpen: true, mode });
  };

  const handleTabSwitch = (newTab: SetupTab) => {
    if (newTab === activeSetupTab) return;
    
    // Set transition guard to prevent saveState from scrambling data during the multi-variable swap
    setIsSwitchingTab(true);
    
    // 1. Capture current data for the tab we are LEAVING
    const currentData: any = {
      history: [...matchHistory],
      frameDetails: [...currentMatchFrameDetails],
      matchStartTime: matchStartTime,
      score1: player1.score,
      score2: player2.score,
      currentBreakPlayerId: currentBreakPlayerId,
      breakBalls: [...breakBalls],
      settings: { ...matchupSettings },
      selectedIndex: selectedMatchIndex
    };

    // Ensure the current live score is merged into the settings buffer before switching out
    if (selectedMatchIndex !== null) {
      const currentLiveSettings = matchupSettings[selectedMatchIndex] || {};
      // ONLY sync if it was already marked as live, to avoid overwriting finished matches
      if (currentLiveSettings.isLive !== false) {
        currentData.settings[selectedMatchIndex] = {
          ...currentLiveSettings,
          score1: player1.score,
          score2: player2.score,
          player1: { ...player1 },
          player2: { ...player2 },
          currentBreakPlayerId,
          breakBalls: [...breakBalls],
          frameDetails: currentMatchFrameDetails,
          isLive: true
        };
      }
    }

    // Save LEAVING tab back into its persist-buffer
    if (activeSetupTab === 'match') {
      setMatchSetup(prev => ({ 
        ...prev,
        t1Name: team1Name, 
        t2Name: team2Name, 
        t1Players: [...team1Players], 
        t2Players: [...team2Players],
        t1Roster: [...team1Roster],
        t2Roster: [...team2Roster],
        ...currentData
      }));
    } else if (activeSetupTab === 'group') {
      setGroupSetup(prev => ({ 
        ...prev,
        t1Players: [...team1Players], 
        t2Players: [...team2Players],
        t1Roster: [...team1Roster],
        t2Roster: [...team2Roster],
        ...currentData
      }));
    }

    // 2. LOAD data for the new tab from its persist-buffer
    let nextHistory: MatchHistoryEntry[] = activeSetupTab === newTab ? currentData.history : [];
    let nextFrameDetails: FrameDetail[] = activeSetupTab === newTab ? currentData.frameDetails : [];
    let nextStartTime: string | null = activeSetupTab === newTab ? currentData.matchStartTime : null;
    let nextScore1 = activeSetupTab === newTab ? currentData.score1 : 0;
    let nextScore2 = activeSetupTab === newTab ? currentData.score2 : 0;
    let nextBreakPlayer: '1' | '2' | 'none' = activeSetupTab === newTab ? currentData.currentBreakPlayerId : 'none';
    let nextBreakBalls: number[] = activeSetupTab === newTab ? currentData.breakBalls : [];
    let nextIdx: number | null = activeSetupTab === newTab ? currentData.selectedIndex : null;
    let nextSettings: Record<number, MatchupSettings> = activeSetupTab === newTab ? currentData.settings : {};
    let nextT1Name = '';
    let nextT2Name = '';
    let nextT1Players: string[] = [];
    let nextT2Players: string[] = [];
    let nextT1Roster: string[] = [];
    let nextT2Roster: string[] = [];
    let nextP1Name = '';
    let nextP2Name = '';

    if (newTab === 'match') {
      nextHistory = matchSetup.history;
      nextFrameDetails = matchSetup.frameDetails;
      nextStartTime = matchSetup.matchStartTime;
      nextScore1 = matchSetup.score1;
      nextScore2 = matchSetup.score2;
      nextBreakPlayer = matchSetup.currentBreakPlayerId;
      nextBreakBalls = matchSetup.breakBalls;
      nextT1Name = matchSetup.t1Name;
      nextT2Name = matchSetup.t2Name;
      nextT1Players = [...matchSetup.t1Players];
      nextT2Players = [...matchSetup.t2Players];
      nextT1Roster = [...(matchSetup.t1Roster || [])];
      nextT2Roster = [...(matchSetup.t2Roster || [])];
      nextSettings = { ...matchSetup.settings };
      nextIdx = matchSetup.selectedIndex;
      if (nextIdx !== null) {
        nextP1Name = nextT1Players[nextIdx] || '';
        nextP2Name = nextT2Players[nextIdx] || '';
      }
    } else if (newTab === 'group') {
      nextHistory = groupSetup.history;
      nextFrameDetails = groupSetup.frameDetails;
      nextStartTime = groupSetup.matchStartTime;
      nextScore1 = groupSetup.score1;
      nextScore2 = groupSetup.score2;
      nextBreakPlayer = groupSetup.currentBreakPlayerId;
      nextBreakBalls = groupSetup.breakBalls;
      nextT1Players = [...groupSetup.t1Players];
      nextT2Players = [...groupSetup.t2Players];
      nextT1Roster = [...(groupSetup.t1Roster || [])];
      nextT2Roster = [...(groupSetup.t2Roster || [])];
      nextSettings = { ...groupSetup.settings };
      nextIdx = groupSetup.selectedIndex;
      if (nextIdx !== null) {
        nextP1Name = nextT1Players[nextIdx] || '';
        nextP2Name = nextT2Players[nextIdx] || '';
      }
    }

    // 3. Batch apply the next tab's state
    setTeam1Name(nextT1Name);
    setTeam2Name(nextT2Name);
    setTeam1Players(nextT1Players);
    setTeam2Players(nextT2Players);
    setTeam1Roster(nextT1Roster);
    setTeam2Roster(nextT2Roster);
    setMatchupSettings(nextSettings);
    setSelectedMatchIndex(nextIdx);
    setMatchHistory(nextHistory);
    setCurrentMatchFrameDetails(nextFrameDetails);
    setMatchStartTime(nextStartTime);
    setCurrentBreakPlayerId(nextBreakPlayer);
    setBreakBalls(nextBreakBalls);

    // Apply names and current scores with preferences or slot defaults
    const p1Pref = getPlayerPref(nextP1Name, 'p1');
    const p2Pref = getPlayerPref(nextP2Name, 'p2');
    const settings = nextIdx !== null ? nextSettings[nextIdx] : null;

    setPlayer1(prev => ({ 
      ...prev, 
      ...SLOT1_DEFAULTS,
      name: nextP1Name, 
      score: nextScore1,
      ...(settings?.player1 || {}),
      ...(p1Pref || {})
    }));
    setPlayer2(prev => ({ 
      ...prev, 
      ...SLOT2_DEFAULTS,
      name: nextP2Name, 
      score: nextScore2,
      ...(settings?.player2 || {}),
      ...(p2Pref || {})
    }));

    setActiveSetupTab(newTab);
    
    setTimeout(() => {
      setIsSwitchingTab(false);
    }, 100);
  };

  const confirmMatchup = () => {
    const isDoubles = showDoublesPicker.mode === 'doubles';
    const playersPerSide = isDoubles ? 2 : 1;
    
    const count1 = selection1.length;
    const count2 = selection2.length;
    
    const matchCount = Math.min(
      Math.floor(count1 / playersPerSide),
      Math.floor(count2 / playersPerSide)
    );
    
    if (matchCount === 0) return;

    let nextPlayers1 = [...team1Players];
    let nextPlayers2 = [...team2Players];
    let nextSettings = { ...matchupSettings };

    for (let i = 0; i < matchCount; i++) {
      const name1 = isDoubles 
        ? `${selection1[i*2]} / ${selection1[i*2+1]}` 
        : selection1[i];
      const name2 = isDoubles 
        ? `${selection2[i*2]} / ${selection2[i*2+1]}` 
        : selection2[i];

      nextPlayers1.push(name1);
      nextPlayers2.push(name2);
      const newIndex = nextPlayers1.length - 1;

      // Check registry for reassociation
      const regKey = [name1.trim().toUpperCase(), name2.trim().toUpperCase()].sort().join(' VS ');
      const autoRef = persistentRefereeRegistry[regKey];

      nextSettings[newIndex] = {
        score1: 0,
        score2: 0,
        frameDetails: [],
        isLive: false,
        isDoubles: isDoubles,
        player1: { ...SLOT1_DEFAULTS, name: name1 },
        player2: { ...SLOT2_DEFAULTS, name: name2 },
        referee: autoRef
      };
    }
    
    setMatchupSettings(nextSettings);
    updateTeamData(team1Name, nextPlayers1, team2Name, nextPlayers2);
    setSelection1([]);
    setSelection2([]);
    setShowDoublesPicker({ isOpen: false });
  };

  const updateReferee = (idx: number, player: string | null, team: '1' | '2') => {
    setMatchupSettings(prev => {
      const next = { ...prev };
      const currentMatchup = next[idx] || {
        score1: 0,
        score2: 0,
        player1: { name: team1Players[idx] || 'Player 1' },
        player2: { name: team2Players[idx] || 'Player 2' },
        currentBreakPlayerId: 'none'
      };
      
      const updatedMatchup = { ...currentMatchup };
      
      const p1 = team1Players[idx];
      const p2 = team2Players[idx];
      const regKey = (p1 && p2) ? [p1.trim().toUpperCase(), p2.trim().toUpperCase()].sort().join(' VS ') : null;

      if (!player) {
        // Use null to explicitly indicate "no referee" and avoid fallback to autoRef in UI
        updatedMatchup.referee = null as any; 
        
        // Also remove from persistent registry so it doesn't auto-apply later
        if (regKey) {
          setPersistentRefereeRegistry(prevReg => {
            const nextReg = { ...prevReg };
            delete nextReg[regKey];
            return nextReg;
          });
        }
      } else {
        updatedMatchup.referee = { name: player, team };
        
        // Matchup reference for reassociation
        if (regKey) {
          setPersistentRefereeRegistry(prevReg => ({ ...prevReg, [regKey]: { name: player, team } }));
        }
      }
      
      next[idx] = updatedMatchup;
      return next;
    });
    setShowRefereePicker({ isOpen: false, matchIndex: null, side: '1' });
  };

  const renderRefereePicker = () => {
    const { matchIndex, side } = showRefereePicker;
    if (matchIndex === null) return null;
    
    // Get the current participants for this specific match index
    const p1Name = team1Players[matchIndex];
    const p2Name = team2Players[matchIndex];
    
    // Split any doubles strings (e.g. "Player 1 / Player 2") into individual names
    const participantNames = [p1Name, p2Name]
      .filter(Boolean)
      .flatMap(p => p.includes(' / ') ? p.split(' / ') : [p]);

    // Combine roster and current players for BOTH sides, keeping them distinct to group them
    const leftPool = [...team1Roster, ...team1Players, ...selection1]
      .filter(p => p && p.trim() !== "")
      .flatMap(p => p.includes(' / ') ? p.split(' / ') : [p])
      .filter((v, i, a) => a.indexOf(v) === i);

    const rightPool = [...team2Roster, ...team2Players, ...selection2]
      .filter(p => p && p.trim() !== "")
      .flatMap(p => p.includes(' / ') ? p.split(' / ') : [p])
      .filter((v, i, a) => a.indexOf(v) === i);

    // Build the final list: Left side players first, then Right side (excluding duplicates and active players)
    const leftFinal = leftPool.filter(p => !participantNames.includes(p));
    const rightFinal = rightPool.filter(p => !participantNames.includes(p) && !leftFinal.includes(p));
    
    const players = [...leftFinal, ...rightFinal];

    const teamColor = side === '1' ? player1.color : player2.color;
    
    return (
      <div key="referee-picker-overlay" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full h-[100dvh] sm:max-w-md sm:h-[90vh] bg-slate-900 border-x-0 sm:border-x-2 border-white/10 shadow-2xl relative flex flex-col pt-1 sm:pt-4"
          style={{ borderTop: `0.4vh solid ${teamColor}` }}
        >
          <div className="px-4 py-2 sm:px-8 sm:py-4 flex items-center justify-between shrink-0 border-b border-white/5 bg-[#141414]">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center bg-white/5 border border-white/10">
                <Glasses className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: teamColor }} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base sm:text-2xl font-black uppercase tracking-tight text-white leading-none">Select Referee</h3>
              </div>
            </div>
            <button 
              onClick={() => setShowRefereePicker({ ...showRefereePicker, isOpen: false })} 
              className="p-1.5 sm:p-3 hover:bg-white/10 rounded-xl sm:rounded-2xl transition-colors text-white/40 hover:text-white"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-8 space-y-3 min-h-0">
            {players.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-[12vw] h-[12vw] sm:w-[4vw] sm:h-[4vw] rounded-full bg-white/5 flex items-center justify-center mx-auto opacity-20">
                  <Glasses className="w-[6vw] h-[6vw] sm:w-[2vw] sm:h-[2vw] text-white" />
                </div>
                <div className="space-y-[1vh]">
                  <p className="text-slate-500 italic font-bold uppercase tracking-widest text-[2.5vw] sm:text-xs">No available players found</p>
                  <p className="text-slate-700 text-[2vw] sm:text-[0.625rem] font-bold uppercase tracking-tighter max-w-[40vw] sm:max-w-[15vw] mx-auto">Add names to the {side === '1' ? 'Home' : 'Away'} roster first</p>
                </div>
              </div>
            ) : (
              players.map((name) => {
                const isSelected = matchupSettings[matchIndex!]?.referee?.name === name && 
                                  matchupSettings[matchIndex!]?.referee?.team === side;
                
                return (
                    <button
                      key={`ref-${name}`}
                      onClick={() => {
                        const isCurrentlySelected = matchupSettings[matchIndex!]?.referee?.name === name && 
                                                   matchupSettings[matchIndex!]?.referee?.team === side;
                        updateReferee(matchIndex!, isCurrentlySelected ? null : name, side);
                      }}
                      className={`w-full p-[2vh] sm:p-[2.5vh] rounded-[3vh] flex items-center justify-between text-left transition-all border-[0.2vh] group ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_3vw_rgba(16,185,129,0.15)]' 
                          : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="truncate font-black uppercase tracking-[0.1em] text-[3vw] sm:text-sm">{name}</span>
                      <div className={`p-[1vh] rounded-full transition-colors ${isSelected ? 'bg-emerald-500 text-slate-900' : 'bg-white/5 group-hover:bg-white/10 text-transparent group-hover:text-white/20'}`}>
                        <Check className="w-[4vw] h-[4vw] sm:w-[1.25vw] sm:h-[1.25vw] shrink-0" strokeWidth={3} />
                      </div>
                    </button>
                );
              })
            )}
          </div>

          <div 
            className="px-[4vw] sm:px-[2vw] border-t border-white/5 shrink-0 bg-slate-900 shadow-[0_-2vh_4vh_rgba(0,0,0,0.5)] flex items-center justify-center"
            style={{ height: '5vh' }}
          >
             <button
               onClick={() => updateReferee(matchIndex!, null, side!)}
               className="w-full h-full flex items-center justify-center text-[2.2vw] sm:text-xs font-black uppercase tracking-[0.4em] text-white hover:text-red-500 transition-colors"
             >
               Clear Selection
             </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderDoublesPicker = () => {
    const isSingles = showDoublesPicker.mode === 'singles';
    const players1 = team1Roster.filter(p => p && !p.includes('/')).filter((v, i, a) => a.indexOf(v) === i);
    const players2 = team2Roster.filter(p => p && !p.includes('/')).filter((v, i, a) => a.indexOf(v) === i);
    const playersPerSide = isSingles ? 1 : 2;
    
    // Calculate how many COMPLETE matches we have
    const matchCount = Math.min(
      Math.floor(selection1.length / playersPerSide),
      Math.floor(selection2.length / playersPerSide)
    );
    const canConfirm = matchCount > 0;

    const pairingColors = ['#10b981', '#f59e0b', '#3b82f6', '#d946ef', '#06b6d4', '#f43f5e', '#8b5cf6', '#ec4899'];
    const getPairColor = (idx: number) => pairingColors[Math.floor(idx / playersPerSide) % pairingColors.length];

    return (
      <div key="doubles-picker-overlay" className="fixed inset-0 z-[10005] flex items-end sm:items-center justify-center p-0 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-5xl bg-slate-900 border-t-2 lg:border-2 border-slate-800 rounded-t-[2.5rem] lg:rounded-[3rem] px-5 pt-3 sm:pt-6 pb-0 lg:p-10 space-y-2 sm:space-y-6 shadow-2xl h-[100dvh] lg:h-[95vh] flex flex-col relative z-[10000]"
        >
          <div className="flex items-center justify-between shrink-0 mb-1">
            <div className="flex flex-col">
              <h3 className="text-base sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                {isSingles ? 'Singles Groups' : 'Doubles Groups'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => { setSelection1([]); setSelection2([]); }}
                className="px-3 py-1.5 rounded-xl text-[2vw] sm:text-[0.625rem] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
              >
                Reset
              </button>
              <button onClick={() => setShowDoublesPicker({ ...showDoublesPicker, isOpen: false })} className="p-1 sm:p-2 text-slate-400 hover:text-white transition-colors">
                <X className="w-7 h-7 sm:w-10 sm:h-10" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col gap-2 sm:gap-3">
            <div className="grid grid-cols-2 gap-4 sm:gap-8 h-full min-h-0">
              {/* Team 1 Side */}
              <div className="flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between px-3 shrink-0">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest truncate" style={{ color: player1.color }}>{team1Name || 'SIDE A'}</span>
                  <span className="text-[2.2vw] font-bold text-slate-500 uppercase tracking-tighter">Matches: {selection1.length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {players1.length === 0 && <p className="text-center text-slate-600 italic text-xs py-10">Empty Roster</p>}
                  {players1.map((name, pIdx) => {
                    const mySelections = selection1.map((n, i) => n === name ? i : -1).filter(i => i !== -1);
                    return (
                      <button
                        key={`sel1-${pIdx}-${name}`}
                        onClick={() => {
                          const lastIdx = selection1.lastIndexOf(name);
                          if (lastIdx !== -1) {
                            setSelection1(selection1.filter((_, i) => i !== lastIdx));
                          } else {
                            setSelection1([...selection1, name]);
                          }
                        }}
                        className={`w-full p-2.5 sm:p-3.5 rounded-xl font-bold uppercase transition-all flex items-center justify-between gap-2 border-2 text-left group ${
                          mySelections.length > 0 ? 'bg-white/10' : 'bg-white/5 border-transparent hover:bg-white/10'
                        }`}
                        style={{ 
                          borderColor: mySelections.length > 0 ? getPairColor(mySelections[0]) : 'transparent',
                          boxShadow: mySelections.length > 0 ? `0 0 1.5vh ${getPairColor(mySelections[0])}22` : 'none'
                        }}
                      >
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className={`truncate text-[2.2vw] sm:text-sm tracking-tight ${mySelections.length > 0 ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{name}</span>
                          {mySelections.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {mySelections.map(idx => (
                                <div key={`dot1-${idx}`} className="w-[1.2vh] h-[1.2vh] sm:w-[1.5vw] sm:h-[1.5vw] rounded-full shadow-[0_0_0.4vh_rgba(0,0,0,0.5)]" style={{ backgroundColor: getPairColor(idx) }} />
                              ))}
                            </div>
                          )}
                        </div>
                        <Plus className="w-[1.8vh] h-[1.8vh] sm:w-[1.5vw] sm:h-[1.5vw] opacity-20 shrink-0" style={{ color: player1.color }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Team 2 Side */}
              <div className="flex flex-col gap-3 min-h-0 border-l border-white/5 pl-4 sm:pl-8">
                <div className="flex items-center justify-between px-3 shrink-0">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest truncate" style={{ color: player2.color }}>{team2Name || 'SIDE B'}</span>
                  <span className="text-[2.2vw] font-bold text-slate-500 uppercase tracking-tighter">Matches: {selection2.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {players2.length === 0 && <p className="text-center text-slate-600 italic text-xs py-10">Empty Roster</p>}
                  {players2.map((name, pIdx) => {
                    const mySelections = selection2.map((n, i) => n === name ? i : -1).filter(i => i !== -1);
                    return (
                      <button
                        key={`sel2-${pIdx}-${name}`}
                        onClick={() => {
                          const lastIdx = selection2.lastIndexOf(name);
                          if (lastIdx !== -1) {
                            setSelection2(selection2.filter((_, i) => i !== lastIdx));
                          } else {
                            setSelection2([...selection2, name]);
                          }
                        }}
                        className={`w-full p-2.5 sm:p-3.5 rounded-xl font-bold uppercase transition-all flex items-center justify-between gap-2 border-2 text-left group ${
                          mySelections.length > 0 ? 'bg-white/10' : 'bg-white/5 border-transparent hover:bg-white/10'
                        }`}
                        style={{ 
                          borderColor: mySelections.length > 0 ? getPairColor(mySelections[0]) : 'transparent',
                          boxShadow: mySelections.length > 0 ? `0 0 1.5vh ${getPairColor(mySelections[0])}22` : 'none'
                        }}
                      >
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className={`truncate text-[2.2vw] sm:text-sm tracking-tight ${mySelections.length > 0 ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{name}</span>
                          {mySelections.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {mySelections.map(idx => (
                                <div key={`dot2-${idx}`} className="w-[1.2vh] h-[1.2vh] sm:w-[1.5vw] sm:h-[1.5vw] rounded-full shadow-[0_0_0.4vh_rgba(0,0,0,0.5)]" style={{ backgroundColor: getPairColor(idx) }} />
                              ))}
                            </div>
                          )}
                        </div>
                        <Plus className="w-[1.8vh] h-[1.8vh] sm:w-[1.5vw] sm:h-[1.5vw] opacity-20 shrink-0" style={{ color: player2.color }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div 
            className="mt-auto border-t border-white/5 shrink-0 flex flex-col items-center justify-center px-5"
            style={{ 
              height: '5vh'
            }}
          >
             {canConfirm && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center h-[1vh] items-center">
                  <span className="text-[2.2vw] sm:text-[0.625rem] font-black uppercase tracking-widest text-emerald-500 bg-black/90 px-[1.5vw] py-[0.5vh] rounded-full border border-emerald-500/30 backdrop-blur-md">
                    Ready: {matchCount} doubles matchup{matchCount === 1 ? '' : 's'}
                  </span>
                </div>
             )}
            <button 
              disabled={!canConfirm}
              onClick={() => confirmMatchup()}
              className={`w-full rounded-lg sm:rounded-xl font-black uppercase tracking-widest transition-all text-[2.2vw] sm:text-base flex items-center justify-center ${
                canConfirm 
                  ? 'opacity-100 shadow-2xl active:scale-95' 
                  : 'opacity-50 cursor-not-allowed grayscale'
              }`}
              style={{ 
                backgroundColor: canConfirm ? 'white' : '#334155', 
                color: '#000',
                height: '3.5vh'
              }}
            >
              Confirm Matchups
            </button>
          </div>
        </motion.div>
      </div>
    );
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

  const generateCSV = (tab: string = 'all') => {
    let csvContent = "";
    
    if (tab === 'match' || tab === 'all') {
      csvContent += "SECTION: TEAM SETUP\n";
      csvContent += "Team,Player Name,Highlight Color,BG Color,Screen Color,BG Style,Screen Style\n";
      
      team1Players.forEach(p => {
        const pref = getPlayerPref(p, 'p1');
        csvContent += `"${team1Name}","${p}","${pref?.color || '#33FF33'}","${pref?.bgColor || '#800080'}","${pref?.screenColor || '#000000'}","${pref?.bgStyle || 'balls'}","${pref?.screenStyle || 'default'}"\n`;
      });
      team2Players.forEach(p => {
        const pref = getPlayerPref(p, 'p2');
        csvContent += `"${team2Name}","${p}","${pref?.color || '#001CFF'}","${pref?.bgColor || '#111111'}","${pref?.screenColor || '#000000'}","${pref?.bgStyle || 'balls'}","${pref?.screenStyle || 'default'}"\n`;
      });
    }

    if (tab === 'match' || tab === 'all') {
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
    }

    if (tab === 'match' || tab === 'all') {
      csvContent += "\nSECTION: SETTINGS\n";
      csvContent += "Setting,Value\n";
      csvContent += `Shot Clock Enabled,"${isShotClockEnabled}"\n`;
      csvContent += `Shot Clock Duration,"${shotClockDuration}s"\n`;
      csvContent += `Match Clock Enabled,"${isMatchClockEnabled}"\n`;
      csvContent += `Match Clock Duration,"${formatTime(matchClockDuration)}"\n`;
      csvContent += `Selected Match Index,"${selectedMatchIndex}"\n`;
    }

    if (tab === 'group' || tab === 'all') {
      csvContent += "\nSECTION: PLAYER PREFERENCES\n";
      csvContent += "Player Name,Highlight Color,BG Color,Screen Color,BG Style,Screen Style\n";
      
      Object.entries(playerPreferences).forEach(([name, pref]: [string, any]) => {
        csvContent += `"${name}","${pref.color}","${pref.bgColor || '#000000'}","${pref.screenColor || '#000000'}","${pref.bgStyle || 'default'}","${pref.screenStyle || 'default'}"\n`;
      });

      csvContent += "\nSECTION: ROSTERS\n";
      csvContent += "Team,Player Name\n";
      team1Roster.forEach(name => {
        if (name) csvContent += `"SIDE A","${name}"\n`;
      });
      team2Roster.forEach(name => {
        if (name) csvContent += `"SIDE B","${name}"\n`;
      });
    }

    return csvContent;
  };

  const generateJSON = (tab: string = 'all') => {
    const state: any = {};
    
    if (tab === 'match' || tab === 'all') {
      state.settings = {
        player1: {
          id: player1.id,
          name: player1.name,
          score: player1.score,
          isTurn: player1.isTurn,
          highlightColor: player1.color,
          bgColor: player1.bgColor,
          screenColor: player1.screenColor,
          bgStyle: player1.bgStyle,
          screenStyle: player1.screenStyle
        },
        player2: {
          id: player2.id,
          name: player2.name,
          score: player2.score,
          isTurn: player2.isTurn,
          highlightColor: player2.color,
          bgColor: player2.bgColor,
          screenColor: player2.screenColor,
          bgStyle: player2.bgStyle,
          screenStyle: player2.screenStyle
        },
        shotClockDuration,
        isShotClockEnabled,
        matchClockDuration,
        isMatchClockEnabled
      };
      
      state.teams = {
        team1Name,
        team2Name,
        team1Players,
        team2Players,
        selectedMatchIndex,
        totals: teamTotals
      };

      state.history = matchHistory.map(entry => ({
        ...entry,
        date: formatDateUK(new Date(entry.date), true)
      }));
    }

    if (tab === 'group' || tab === 'all') {
      state.playerPreferences = Object.entries(playerPreferences).reduce((acc, [name, pref]: [string, any]) => {
        acc[name] = pref;
        return acc;
      }, {} as Record<string, any>);

      state.rosters = {
        team1: team1Roster,
        team2: team2Roster
      };
    }
    
    state.lastUpdated = formatDateUK(new Date(), true);
    state.exportType = tab;

    return JSON.stringify(state, null, 2);
  };

  const downloadData = (format: 'csv' | 'json' = 'csv') => {
    const now = new Date();
    const ukDate = formatDateUK(now);
    const extension = format === 'json' ? 'json' : 'csv';
    const tag = activeSetupTab === 'group' ? 'GROUP' : 'MATCH';
    const fileName = `${tag}_${team1Name.replace(/\s+/g, '_')}_V_${team2Name.replace(/\s+/g, '_')}_${ukDate}.${extension}`;

    let content: string | Blob;
    if (format === 'json') {
      content = generateJSON(activeSetupTab);
    } else {
      content = generateCSV(activeSetupTab);
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
    const tag = activeSetupTab === 'group' ? 'GROUP' : 'MATCH';
    const fileName = `${tag}_${team1Name.replace(/\s+/g, '_')}_V_${team2Name.replace(/\s+/g, '_')}_${ukDate}.${extension}`;

    let content: string;
    if (format === 'json') {
      content = generateJSON(activeSetupTab);
    } else {
      content = generateCSV(activeSetupTab);
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
        const body = generateJSON('match');
        
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
                  color: state.settings.player1.highlightColor || prev.color,
                  bgColor: state.settings.player1.bgColor || prev.bgColor,
                  screenColor: state.settings.player1.screenColor || prev.screenColor,
                  bgStyle: state.settings.player1.bgStyle || prev.bgStyle,
                  screenStyle: state.settings.player1.screenStyle || prev.screenStyle
                }));
              }
              if (state.settings.player2) {
                setPlayer2(prev => ({ 
                  ...prev, 
                  name: state.settings.player2.name || prev.name,
                  score: state.settings.player2.score ?? prev.score,
                  isTurn: state.settings.player2.isTurn ?? prev.isTurn,
                  color: state.settings.player2.highlightColor || prev.color,
                  bgColor: state.settings.player2.bgColor || prev.bgColor,
                  screenColor: state.settings.player2.screenColor || prev.screenColor,
                  bgStyle: state.settings.player2.bgStyle || prev.bgStyle,
                  screenStyle: state.settings.player2.screenStyle || prev.screenStyle
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
              const mappedPrefs: Record<string, { color: string, bgColor: string, screenColor: string, bgStyle: string, screenStyle: string }> = {};
              Object.entries(state.playerPreferences).forEach(([name, pref]: [string, any]) => {
                // Handle both new (object) and old (string) formats
                if (typeof pref === 'string') {
                  mappedPrefs[name] = {
                    color: pref,
                    bgColor: '#000000',
                    screenColor: '#000000',
                    bgStyle: 'default',
                    screenStyle: 'default'
                  };
                } else {
                  mappedPrefs[name] = {
                    color: pref.color || '#33FF33',
                    bgColor: pref.bgColor || '#800080',
                    screenColor: pref.screenColor || '#000000',
                    bgStyle: pref.bgStyle || 'balls',
                    screenStyle: pref.screenStyle || 'default'
                  };
                }
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
                  color: state.userPreferences.player1.borderColor || state.userPreferences.player1.color || prev.color,
                  bgColor: state.userPreferences.player1.bgColor || prev.bgColor,
                  screenColor: state.userPreferences.player1.screenColor || prev.screenColor,
                  bgStyle: state.userPreferences.player1.bgStyle || prev.bgStyle,
                  screenStyle: state.userPreferences.player1.screenStyle || prev.screenStyle
                }));
              }
              if (state.userPreferences.player2) {
                setPlayer2(prev => ({ 
                  ...prev, 
                  name: state.userPreferences.player2.name || prev.name,
                  color: state.userPreferences.player2.borderColor || state.userPreferences.player2.color || prev.color,
                  bgColor: state.userPreferences.player2.bgColor || prev.bgColor,
                  screenColor: state.userPreferences.player2.screenColor || prev.screenColor,
                  bgStyle: state.userPreferences.player2.bgStyle || prev.bgStyle,
                  screenStyle: state.userPreferences.player2.screenStyle || prev.screenStyle
                }));
              }
            }
            if (state.rosters) {
              setTeam1Roster(state.rosters.team1 || []);
              setTeam2Roster(state.rosters.team2 || []);
            }
            
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
            let csvT1Roster: string[] = [];
            let csvT2Roster: string[] = [];
            let t1Name = '';
            let t2Name = '';
            let importedHistory: MatchHistoryEntry[] = [];
            let importedPlayerPreferences: Record<string, { color: string, bgColor: string, screenColor: string, bgStyle: string, screenStyle: string }> = { ...playerPreferences } as any;

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
                    const existing = (importedPlayerPreferences[player] as any) || {};
                    importedPlayerPreferences[player] = { 
                      color, 
                      bgColor: existing.bgColor || '#000000', 
                      screenColor: existing.screenColor || '#000000',
                      bgStyle: existing.bgStyle || 'default',
                      screenStyle: existing.screenStyle || 'default'
                    };
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
                if (key === 'Selected Match Index') setSelectedMatchIndex(val === 'NULL' ? null : parseInt(val));
              } else if (currentSection === 'PLAYER PREFERENCES') {
                if (values[0] === 'Player Name') return;
                const name = values[0];
                const color = values[1];
                const bgColor = values[2];
                const screenColor = values[3];
                const bgStyle = values[4] as any;
                const screenStyle = values[5] as any;
                if (name && color) {
                  importedPlayerPreferences[name] = { 
                    color, 
                    bgColor: bgColor || '#000000', 
                    screenColor: screenColor || '#000000',
                    bgStyle: bgStyle || 'default',
                    screenStyle: screenStyle || 'default'
                  };
                }
              } else if (currentSection === 'ROSTERS') {
                if (values[0] === 'Team') return;
                const team = values[0];
                const playerName = values[1];
                if (team === 'SIDE A') {
                  if (!csvT1Roster.includes(playerName)) csvT1Roster.push(playerName);
                } else if (team === 'SIDE B') {
                  if (!csvT2Roster.includes(playerName)) csvT2Roster.push(playerName);
                }
              }
            });

            if (importedHistory.length) setMatchHistory(importedHistory);
            setPlayerPreferences(importedPlayerPreferences);
            if (t1Name || t2Name) {
              updateTeamData(t1Name || team1Name, t1Players, t2Name || team2Name, t2Players);
            }
            if (csvT1Roster.length || csvT2Roster.length) {
              updateRosterData(csvT1Roster, csvT2Roster);
            }
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

  if (deviceInfo.isPortrait) {
    return (
      <div className="fixed inset-0 z-[20000] bg-black flex items-center justify-center overflow-hidden">
        {/* SVG Gradient Definitions for Portrait View */}
        <svg width="0" height="0" className="absolute pointer-events-none">
          <defs>
            <linearGradient id="portrait-cup-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={player1.color} />
              <stop offset="100%" stopColor={player2.color} />
            </linearGradient>
            <linearGradient id="portrait-logo-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={player1.color} />
              <stop offset="100%" stopColor={player2.color} />
            </linearGradient>
          </defs>
        </svg>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-full h-full flex items-center justify-center bg-black"
        >
          <img 
            src={portraitBackdrop} 
            alt="Rotate to Landscape" 
            className="w-full h-full object-cover sm:object-contain"
            style={{ 
              imageRendering: '-webkit-optimize-contrast', 
              backfaceVisibility: 'hidden', 
              transform: 'translateZ(0)',
              willChange: 'transform'
            }}
          />

          {/* Logo & Icon at top center */}
          <div className="absolute top-[8vh] left-1/2 -translate-x-1/2 flex items-center justify-center gap-[0.5vw] z-20 whitespace-nowrap">
            <Trophy 
              className="transition-all duration-500 shrink-0" 
              style={{ 
                stroke: 'url(#portrait-cup-gradient)',
                width: '6vh',
                height: '6vh'
              }}
            />
            <h1 
              className="font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b"
              style={{ 
                fontSize: '6.5vh',
                lineHeight: 1,
                backgroundImage: `linear-gradient(to bottom, ${player1.color}, ${player2.color})`,
                fontFamily: 'Inter, sans-serif'
              }}
            >
              Pool-Pro.uk
            </h1>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/20">
             <div className="bg-black/60 p-8 rounded-[4vh] border border-white/10 backdrop-blur-xl flex flex-col items-center shadow-2xl">
               <RotateCcw className="w-[8vh] h-[8vh] text-emerald-400 animate-spin-reverse mb-[3vh]" />
               <h2 className="text-[4vh] font-black text-white uppercase tracking-[0.2em] mb-[1vh]">Landscape Only</h2>
               <p className="text-[2vh] text-slate-300 font-medium uppercase tracking-[0.1em]">Please rotate your device</p>
             </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen text-slate-100 font-sans selection:bg-emerald-500/30 overflow-x-hidden ${deviceInfo.isPhone ? 'is-phone' : (deviceInfo.isTablet ? 'is-tablet' : 'is-desktop')}`}>
      {/* Base Background Layer */}
      <div className="fixed inset-0 z-[-20] bg-black" />
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
      <motion.div 
        animate={{ 
          top: (view === 'scoreboard' && isNavVisible) 
            ? (deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh')) 
            : 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed inset-0 z-[-10] overflow-hidden pointer-events-none"
      >
        {/* Full Screen Backdrop */}
        {(() => {
          const activeBackItem = FULL_SCREEN_BACKDROPS.find(b => b.value === fullScreenBackdrop);
          return activeBackItem && activeBackItem.image && fullScreenBackdrop !== 'none' ? (
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              <img 
                src={activeBackItem.image} 
                className="w-full h-full object-fill" 
                alt="" 
              />
            </div>
          ) : null;
        })()}

        {/* Split Screen (Scoreboard only) */}
        <motion.div 
          animate={{ 
            top: (view === 'scoreboard' && isNavVisible) 
              ? (deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh'))
              : 0,
            left: (deviceInfo.isDesktop && view === 'scoreboard') ? 'var(--sidebar-width)' : 0,
            right: (deviceInfo.isDesktop && view === 'scoreboard') ? 'var(--sidebar-width)' : 0,
            bottom: 0
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className={`absolute flex transition-opacity duration-700 z-10 ${isLoaded && view === 'scoreboard' && (fullScreenBackdrop === 'none' || !fullScreenBackdrop) ? 'opacity-100' : 'opacity-0'}`}
        >
          {[player1, player2].map((p, idx) => (
            <div 
              key={p.id} 
              className="flex-1 h-full relative overflow-hidden transition-colors duration-700" 
              style={{ backgroundColor: p.screenColor }}
            >
              {/* Removed cloth/speed table simulation as per user request */}
              {p.screenStyle === 'dial' && (
                <div 
                  className="absolute inset-0 opacity-40 z-0" 
                  style={{ 
                    backgroundImage: 'linear-gradient(45deg, #111 25.5%, transparent 25.5%), linear-gradient(-45deg, #111 25.5%, transparent 25.5%), linear-gradient(45deg, transparent 74.5%, #111 74.5%), linear-gradient(-45deg, transparent 74.5%, #111 74.5%)',
                    backgroundSize: '1vh 1vh',
                    backgroundColor: '#1a1a1a'
                  }}
                />
              )}
            </div>
          ))}
        </motion.div>
        
        {/* Plain Background (Teams & Settings) */}
        <div className={`absolute inset-0 bg-black transition-opacity duration-700 z-20 ${view !== 'scoreboard' ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Subtle Gradient Overlay for Plain Background */}
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-from),_transparent_50%)] from-emerald-500/5 transition-opacity duration-700 z-[21] ${view !== 'scoreboard' ? 'opacity-100' : 'opacity-0'}`} />
      </motion.div>

      {/* Navigation Bar */}
      <TopBarNav 
        view={view}
        isNavVisible={isNavVisible}
        deviceInfo={deviceInfo}
        player1={player1}
        player2={player2}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        navigateToScoreboard={navigateToScoreboard}
        navigateToView={navigateToView}
        showDeviceTime={showDeviceTime}
        deviceTimePosition={deviceTimePosition}
        currentTime={currentTime}
        isShotClockEnabled={isShotClockEnabled}
        isMatchClockEnabled={isMatchClockEnabled}
        isLoaded={isLoaded}
      />





      {/* Vertical Team Names - Moved to root for stability */}
      <AnimatePresence>
        {isLoaded && view === 'scoreboard' && (
          <>
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ 
                opacity: 1, 
                x: 0,
                y: (deviceInfo.isPhone && !isNavVisible) ? '-15vh' : (deviceInfo.isTablet && !isNavVisible ? '-8vh' : (deviceInfo.isDesktop && !isNavVisible ? '-10vh' : 0))
              }}
              exit={{ opacity: 0, x: -50 }}
              className="fixed left-0 top-0 bottom-0 w-[var(--sidebar-width)] flex flex-col pointer-events-none z-20"
            >
              <div style={{ height: (deviceInfo.isPhone && !isNavVisible) ? '0vh' : (deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh')) }} />
              <div className="flex-1 flex items-center justify-center overflow-visible">
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
                y: (deviceInfo.isPhone && !isNavVisible) ? '-15vh' : (deviceInfo.isTablet && !isNavVisible ? '-8vh' : (deviceInfo.isDesktop && !isNavVisible ? '-10vh' : 0))
              }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed right-0 top-0 bottom-0 w-[var(--sidebar-width)] flex flex-col pointer-events-none z-20"
            >
              <div style={{ height: (deviceInfo.isPhone && !isNavVisible) ? '0vh' : (deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh')) }} />
              <div className="flex-1 flex items-center justify-center overflow-visible">
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
        {isLoaded && isMatchClockEnabled && view === 'scoreboard' && (
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
        {isLoaded && isShotClockEnabled && view === 'scoreboard' && (
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
          paddingTop: (view === 'teams' || view === 'settings' || view === 'match-details')
            ? `calc(${deviceInfo.isPhone ? '24vh' : (deviceInfo.isTablet ? '8vh' : '10vh')} + ${view === 'match-details' ? '1vh' : '4vh'})`
            : (view === 'scoreboard' && isNavVisible)
              ? (deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh'))
              : 0,
          y: 0,
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
          {isLoaded && view === 'scoreboard' && (
            <motion.div
              key="scoreboard-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="flex flex-col flex-1 sm:flex-none w-full relative min-h-0"
            >
              {/* Fixed Match Navigation Buttons - 1vh below top bar, 1vh from edge */}
              <div 
                className="fixed inset-x-0 flex justify-between px-[1vh] pointer-events-none z-50 transition-all duration-500"
                style={{ 
                  top: isNavVisible 
                    ? (deviceInfo.isPhone ? '17vh' : (deviceInfo.isTablet ? '9vh' : '11vh'))
                    : '1vh',
                }}
              >
                <button
                  onClick={goPrevMatch}
                  className="pointer-events-auto flex items-center justify-center transition-all active:translate-y-0.5 hover:scale-105 hover:bg-slate-800 rounded-full bg-slate-900 border-2 overflow-hidden group cursor-pointer"
                  style={{ 
                    width: deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh'),
                    height: deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh'),
                    borderColor: `${player1.color}44`,
                    position: 'relative'
                  }}
                  title="Previous Match"
                >
                  {/* Mini Reflection */}
                  <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white/10 rounded-[100%] blur-[0.1vh] rotate-[-25deg] pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/50 pointer-events-none" />
                  <ChevronLeft className="w-[4vh] h-[4vh] transition-transform group-active:scale-90" style={{ color: player1.color }} strokeWidth={3} />
                </button>

                <button
                  onClick={goNextMatch}
                  className="pointer-events-auto flex items-center justify-center transition-all active:translate-y-0.5 hover:scale-105 hover:bg-slate-800 rounded-full bg-slate-900 border-2 overflow-hidden group cursor-pointer"
                  style={{ 
                    width: deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh'),
                    height: deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh'),
                    borderColor: `${player2.color}44`,
                    position: 'relative'
                  }}
                  title="Next Match"
                >
                  {/* Mini Reflection */}
                  <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white/10 rounded-[100%] blur-[0.1vh] rotate-[-25deg] pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/50 pointer-events-none" />
                  <ChevronRight className="w-[4vh] h-[4vh] transition-transform group-active:scale-90" style={{ color: player2.color }} strokeWidth={3} />
                </button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative flex flex-col gap-2 min-h-0 flex-1 justify-center"
              >
                {/* Fixed Centered Finish Match Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                  <motion.button
                    initial={{ scale: 1 }}
                    animate={(player1.score >= 1 || player2.score >= 1) ? { 
                      scale: [1, 1.05, 1],
                      boxShadow: [
                        "0 0 0vw rgba(255,255,255,0)",
                        "0 0 2vh rgba(255,255,255,0.3)",
                        "0 0 0vw rgba(255,255,255,0)"
                      ]
                    } : { scale: 1 }}
                    transition={ (player1.score >= 1 || player2.score >= 1) ? { 
                      duration: 2, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {} }
                    onClick={finishMatch}
                    className="pointer-events-auto flex items-center justify-center font-black transition-all active:translate-y-1 hover:scale-105 hover:brightness-110 floating-widget widget-finish-match whitespace-nowrap overflow-hidden group cursor-pointer"
                    style={{ 
                      width: 'auto',
                      padding: deviceInfo.isTablet ? '1.92vh 1.2vw' : '2.4vh 1.5vw',
                      height: 'auto',
                      fontSize: deviceInfo.isTablet ? '3.6vh' : (!deviceInfo.isDesktop ? '4.5vh' : '4vh'),
                      borderRadius: deviceInfo.isTablet ? '2vh' : '2.5vh',
                      border: `${deviceInfo.isTablet ? '0.32vh' : '0.4vh'} solid rgba(255,255,255,0.2)`,
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), linear-gradient(to right, ${player1.color}, ${player2.color})`,
                      backgroundOrigin: 'border-box',
                      backgroundClip: 'padding-box, border-box',
                      color: '#fff',
                      position: 'relative'
                    }}
                  >
                    {/* 3D Reflection Gloss */}
                    <div className="absolute top-[5%] left-[5%] w-[90%] h-[25%] bg-white/10 rounded-full blur-[0.2vh] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                    <span className="leading-none uppercase tracking-widest relative z-10">
                      {getFinishButtonText()}
                    </span>
                  </motion.button>
                </div>

                {/* Score Cards Grid */}
                <div className="relative flex items-center justify-center w-full py-0">

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
                          className={`relative cursor-pointer overflow-hidden shadow-2xl flex flex-col justify-center gameplay-card transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-300 ${
                            p.bgStyle === 'balls'
                            ? 'rounded-full aspect-square border-0' 
                            : 'rounded-3xl border-2'
                          }`}
                          style={{ 
                            padding: p.bgStyle === 'balls' ? '2vh' : '0',
                            borderColor: p.color,
                            backgroundColor: p.bgStyle === 'balls' ? 'transparent' : p.bgColor,
                            backgroundImage: p.bgStyle === 'dial' ? 'linear-gradient(45deg, rgba(0,0,0,0.2) 25%, transparent 25%), linear-gradient(-45deg, rgba(0,0,0,0.2) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(0,0,0,0.2) 75%), linear-gradient(-45deg, transparent 75%, rgba(0,0,0,0.2) 75%)' : undefined,
                            backgroundSize: '0.5vh 0.5vh',
                            boxShadow: p.bgStyle === 'balls'
                              ? '0 1.5vh 3vh rgba(0,0,0,0.4)'
                              : `0 0 4vh -1.5vh ${p.color}66`,
                            width: p.bgStyle === 'balls' ? 'min(38vw, 70vh)' : '38vw',
                            margin: '0 auto',
                            height: p.bgStyle === 'balls' ? 'min(38vw, 70vh)' : '70vh',
                            maxHeight: '70vh',
                            maxWidth: '38vw'
                          }}
                        >
                          {/* Pool Ball Visual Elements - Only if Ball mode */}
                          {p.bgStyle === 'balls' && (() => {
                            const ball = POOL_BALLS.find(b => b.value.toLowerCase() === p.bgColor.toLowerCase());
                            if (!ball || !ball.image) return null;
                            
                            return (
                              <img 
                                src={(deviceInfo.isTablet || deviceInfo.isPhone) && ball.mediumImage ? ball.mediumImage : ball.image} 
                                alt={ball.name} 
                                className="absolute inset-0 w-full h-full object-contain rounded-full"
                              />
                            );
                          })()}

                             {/* Global Unified Score Buttons - Circular and Anchored to Corners */}
                             
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 incrementScore(p.id);
                               }}
                               className="absolute rounded-full text-slate-950 flex items-center justify-center transition-all active:translate-y-1 hover:scale-105 hover:brightness-110 group z-20 overflow-hidden cursor-pointer"
                               style={{ 
                                 width: (p.bgStyle === 'balls' || deviceInfo.isSquarish) ? '12vh' : '15vh',
                                 height: (p.bgStyle === 'balls' || deviceInfo.isSquarish) ? '12vh' : '15vh',
                                 bottom: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '7vh' : '5vh') : '3vh',
                                 background: `radial-gradient(circle at 35% 35%, ${p.color}, ${p.color}dd 40%, ${p.color}aa 100%)`,
                                 right: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '6.5vw' : '7.5vw') : '1.5vh',
                                 border: `0.4vh solid ${p.color}ff`
                               }}
                             >
                               {/* 3D Reflection Gloss */}
                               <div className="absolute top-[5%] left-[15%] w-[40%] h-[20%] bg-white/40 rounded-[100%] blur-[0.1vh] rotate-[-25deg] pointer-events-none" />
                               <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                               <Plus 
                                 className="w-[5.5vh] h-[5.5vh] font-bold transition-transform group-active:scale-90" 
                                 strokeWidth={3}
                               />
                             </button>

                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 decrementScore(p.id);
                               }}
                               className="absolute rounded-full bg-slate-900 flex items-center justify-center transition-all active:translate-y-0.5 hover:scale-105 hover:bg-slate-800 z-20 border-2 overflow-hidden group cursor-pointer"
                               style={{ 
                                 width: (p.bgStyle === 'balls' || deviceInfo.isSquarish) ? '8vh' : '10vh',
                                 height: (p.bgStyle === 'balls' || deviceInfo.isSquarish) ? '8vh' : '10vh',
                                 bottom: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '9.5vh' : '6.5vh') : '3.5vh',
                                 left: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '10vw' : '9vw') : '3vh',
                                 borderColor: `${p.color}44`
                               }}
                             >
                               {/* Mini Reflection */}
                               <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white/10 rounded-[100%] blur-[0.1vh] rotate-[-25deg] pointer-events-none" />
                               <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-black/50 pointer-events-none" />
                               <Minus 
                                 className="w-[3.5vh] h-[3.5vh] transition-transform group-active:scale-90" 
                                 style={{ color: p.color }}
                                 strokeWidth={3}
                               />
                             </button>
                              

                           <div className="flex-1 flex flex-col items-center justify-center w-full m-0 p-0 z-10 relative">
                          {isEditingNames ? (
                            <div className={`absolute left-0 right-0 px-[2vw] z-20 ${p.bgStyle === 'balls' ? 'top-[-0.5vh]' : 'top-[2.5vh]'}`}>
                              <input
                              type="text"
                              value={p.name}
                              placeholder={`PLAYER ${idx + 1} NAME`}
                              onChange={(e) => {
                                const newName = e.target.value.toUpperCase();
                                if (idx === 0) {
                                  const pref = getPlayerPref(newName, 'p1');
                                  setPlayer1(prev => ({ 
                                    ...prev, 
                                    ...SLOT1_DEFAULTS,
                                    name: newName,
                                    ...(pref || {}) 
                                  }));
                                  if (selectedMatchIndex !== null) {
                                    const newPlayers = [...team1Players];
                                    newPlayers[selectedMatchIndex] = newName;
                                    setTeam1Players(newPlayers);
                                  }
                                } else {
                                  const pref = getPlayerPref(newName, 'p2');
                                  setPlayer2(prev => ({ 
                                    ...prev, 
                                    ...SLOT2_DEFAULTS,
                                    name: newName,
                                    ...(pref || {})
                                  }));
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
                            </div>
                          ) : (
                             p.name && (() => {
                               const nameParts = p.name.split(' / ');
                               const displayNames = nameParts.length > 1 
                                 ? [...nameParts].sort((a, b) => b.length - a.length)
                                 : nameParts;
                               
                               return (
                                 <div className={`absolute left-0 right-0 flex justify-center pointer-events-none z-10 ${p.bgStyle === 'balls' ? 'inset-x-0 bottom-0 top-[-0.5vh] pt-0' : 'top-[2.5vh]'}`}>
                                   {p.bgStyle === 'balls' ? (
                                     <div id={`ball-name-container-${p.id}`} className="w-full aspect-square relative overflow-visible">
                                      <svg id={`ball-name-svg-${p.id}`} viewBox="0 0 200 200" className="w-full h-full overflow-visible">
                                        <defs>
                                          <path id={`curve-${p.id}`} d="M 20,100 A 80,80 0 0 1 180,100" />
                                        </defs>
                                        {displayNames.map((name, nIdx) => (
                                          <text 
                                            key={nIdx}
                                            className="font-bold fill-current uppercase tracking-wider" 
                                            style={{ 
                                              color: p.color,
                                              filter: 'drop-shadow(0 0.8vh 1.2vh rgba(0,0,0,0.8))'
                                            }}
                                            fontSize={displayNames.length > 1 ? "14" : "18"}
                                            dy={displayNames.length > 1 ? (nIdx === 0 ? "-6" : "12") : "0"}
                                          >
                                            <textPath href={`#curve-${p.id}`} startOffset="50%" textAnchor="middle">
                                              {name}
                                            </textPath>
                                          </text>
                                        ))}
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center w-full leading-[0.85] gap-0">
                                      {displayNames.map((name, nIdx) => (
                                        <h2 
                                          key={nIdx}
                                          className="font-bold uppercase w-full text-center whitespace-nowrap m-0 p-0" 
                                          style={{ 
                                            color: p.color,
                                            fontSize: displayNames.length > 1 ? `calc(${sharedPlayerNameFontSize} * 0.9)` : sharedPlayerNameFontSize
                                          }}
                                        >
                                          {name}
                                        </h2>
                                      ))}
                                    </div>
                                  )}
                                </div>
                               );
                             })()
                          )}

                          <div className={`flex items-center justify-center w-full min-h-0 ${p.bgStyle === 'balls' ? 'absolute inset-0' : ''}`}>
                            <span 
                              id={`${p.bgStyle === 'balls' ? 'ball' : 'card'}-score-digit-${p.id}`}
                              className="font-black tracking-tighter tabular-nums leading-[0.75] block m-0 p-0" 
                              style={{ 
                                color: p.color,
                                fontSize: deviceInfo.isSquarish 
                                  ? (deviceInfo.isPhone ? '22.5vh' : (deviceInfo.isTablet ? '25.2vh' : '31.5vh'))
                                  : (deviceInfo.isPhone ? '25vh' : (deviceInfo.isTablet ? '28vh' : '35vh')),
                              }}
                            >
                              {p.score}
                            </span>
                          </div>
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
                                const side = p.id as '1' | '2';
                                setCurrentBreakPlayerId(side);

                                // Save to matchup settings
                                if (selectedMatchIndex !== null) {
                                  setMatchupSettings(prev => ({
                                    ...prev,
                                    [selectedMatchIndex]: {
                                      ...prev[selectedMatchIndex],
                                      currentBreakPlayerId: side
                                    }
                                  }));
                                }

                                // In Match Mode, align the session's expected pattern to this choice
                                if (activeSetupTab === 'match') {
                                  const idx = selectedMatchIndex ?? 0;
                                  const side = p.id as '1' | '2';
                                  // If user picks side P for match index I:
                                  // we calculate what the side for index 0 should be to reach P at index I
                                  const sessionFirstSide = (idx % 2 === 0) ? side : (side === '1' ? '2' : '1');
                                  setMatchModeBreakSide(sessionFirstSide);
                                }
                              }
                            }}
                            className={`absolute rounded-full transition-all duration-500 z-50 flex items-center justify-center group pointer-events-auto
                              ${currentBreakPlayerId === p.id 
                                ? 'scale-110 z-50' 
                                : (currentBreakPlayerId === 'none' 
                                    ? `scale-100 opacity-100` 
                                    : 'scale-90 opacity-20')}`}
                            style={{
                              width: '15vh',
                              height: '15vh',
                              top: deviceInfo.isPhone ? '-2.7vh' : '-3.7vh',
                              [idx === 0 ? 'left' : 'right']: deviceInfo.isPhone ? '-2.7vh' : '-3.7vh',
                              background: 'transparent',
                              cursor: 'pointer'
                            } as any}
                            title={currentBreakPlayerId === 'none' ? "Select Starting Breaker" : "Break Indicator"}
                          >
                             <div 
                               className={`rounded-full border-solid transition-all duration-300 flex items-center justify-center
                                 ${currentBreakPlayerId === p.id 
                                   ? 'bg-white border-white shadow-[0_0_1.5rem_rgba(255,255,255,1)]' 
                                   : (currentBreakPlayerId === 'none')
                                     ? `bg-white/20 border-white/40 border-2 shadow-[0_0_1vh_rgba(255,255,255,0.2)] ${shouldFlashBreaker ? 'bg-red-500 border-red-400 border-4 scale-150 shadow-[0_0_5vh_rgba(239,68,68,1)] !opacity-100' : ''}`
                                     : 'bg-white/40 border-white/20'}`}
                               style={{
                                 width: '6vh',
                                 height: '6vh',
                                 borderWidth: '0.4vh',
                               }}
                             >
                               {/* Hint for first selection */}
                               {currentBreakPlayerId === 'none' && (
                                 <PlusCircle className="w-[3vh] h-[3vh] text-white/50" />
                               )}
                             </div>
                          </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Score digit vertical center logic: the button is now moved to root level */}
              </div>
            </motion.div>

            {/* Game Mode Indicator */}
            <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none opacity-80 z-[60]">
              <p className="font-black uppercase tracking-[0.4em] text-black leading-none pb-0" style={{ fontSize: '2vh' }}>
                {activeSetupTab === 'group' ? 'Group' : `Match #${(selectedMatchIndex ?? 0) + 1}`}
              </p>
            </div>
          </motion.div>
        )}

          {isLoaded && view === 'teams' && (
            <SetupView
              player1={player1}
              player2={player2}
              activeSetupTab={activeSetupTab}
              handleTabSwitch={handleTabSwitch}
              setShowExportMenu={setShowExportMenu}
              uploadData={uploadData}
              deviceInfo={deviceInfo}
              isLoaded={isLoaded}
              team1Name={team1Name}
              team2Name={team2Name}
              team1Players={team1Players}
              setTeam1Players={setTeam1Players}
              team2Players={team2Players}
              setTeam2Players={setTeam2Players}
              team1Roster={team1Roster}
              team2Roster={team2Roster}
              updateTeamData={updateTeamData}
              updateRosterData={updateRosterData}
              handleOpenPicker={handleOpenPicker}
              matchupSettings={matchupSettings}
              setMatchupSettings={setMatchupSettings}
              selectedMatchIndex={selectedMatchIndex}
              setSelectedMatchIndex={setSelectedMatchIndex}
              selectTeamMatch={selectTeamMatch}
              getMatchResult={getMatchResult}
              deleteMatchup={deleteMatchup}
              clearMatchResult={clearMatchResult}
              viewMatchDetails={viewMatchDetails}
              setShowDeleteAllConfirm={setShowDeleteAllConfirm}
              selectedHistoryEntryId={selectedHistoryEntryId}
              setSelectedHistoryEntryId={setSelectedHistoryEntryId}
              matchHistory={matchHistory}
              teamTotals={teamTotals}
              formatTime={formatTime}
              setShowRefereePicker={setShowRefereePicker}
              groupSetup={groupSetup}
              setGroupSetup={setGroupSetup}
              focusedField={focusedField}
              setFocusedField={setFocusedField}
              handleInputFocus={handleInputFocus}
              labelFontSize={labelFontSize}
              teamEntryStyle={teamEntryStyle}
              playerEntryStyle={playerEntryStyle}
              currentMatchFrameDetails={currentMatchFrameDetails}
              setCurrentMatchFrameDetails={setCurrentMatchFrameDetails}
              setMatchStartTime={setMatchStartTime}
              setPlayer1={setPlayer1}
              setPlayer2={setPlayer2}
              setView={setView}
              getPlayerPref={getPlayerPref}
              SLOT1_DEFAULTS={SLOT1_DEFAULTS}
              SLOT2_DEFAULTS={SLOT2_DEFAULTS}
              sensors={sensors}
              handleDragEnd={handleDragEnd}
              persistentRefereeRegistry={persistentRefereeRegistry}
              isBreakTrackingEnabled={isBreakTrackingEnabled}
              matchModeBreakSide={matchModeBreakSide}
              setShowClearTeamsConfirm={setShowClearTeamsConfirm}
              setShowTeamTotals={setShowTeamTotals}
            />
          )}

          {isLoaded && view === 'settings' && (
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

                  {/* Full Screen Backdrops Tile */}
                  <div 
                    className={`bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl relative transition-all duration-300 ${activePicker === 'fs-backdrop' ? 'z-[40] ring-4 ring-white/10' : 'z-10'}`} 
                    style={{ borderColor: player1.color }}
                  >
                    <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                      <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Full Screen Backdrops</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between gap-[4vw]">
                        <div className="flex-1">
                          <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Note: Individual background options are disabled when full screen background is enabled</p>
                        </div>
                        <div className="shrink-0">
                            <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextValue = fullScreenBackdrop === 'none' ? 'black' : 'none';
                              setFullScreenBackdrop(nextValue);
                            }}
                            className={`w-[10vw] sm:w-14 h-[5vw] sm:h-7 rounded-full transition-colors relative active:scale-95`}
                            style={{ backgroundColor: fullScreenBackdrop !== 'none' ? player1.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[4vw] sm:w-[1.25rem] h-[4vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${fullScreenBackdrop !== 'none' ? 'left-[5.5vw] sm:left-[2rem]' : 'left-[0.5vw] sm:left-[0.25rem]'}`} />
                          </button>
                        </div>
                      </div>

                      {fullScreenBackdrop !== 'none' && (
                        <div className="flex justify-center pt-4 border-t border-white/5">
                            <div className="w-full max-w-[80vw] landscape:max-w-[90vw] mx-auto">
                               <p className="font-black uppercase tracking-[0.4em] text-slate-500 text-[1.1rem] sm:text-[2.1vh] pb-[2vh] text-center w-full">SELECT BACKDROP</p>
                              <ColorPicker
                                label="Backdrop"
                                value={fullScreenBackdrop}
                                onChange={(val) => setFullScreenBackdrop(val)}
                                colors={FULL_SCREEN_BACKDROPS.filter(b => b.value !== 'none')}
                                icon={<Layout className="w-4 h-4" />}
                                isOpen={activePicker === 'fs-backdrop'}
                                onToggle={(isOpen) => setActivePicker(isOpen ? 'fs-backdrop' : null)}
                                themeColor={player1.color}
                                pickerStyle="backdrop"
                                allowedStyles={['backdrop']}
                              />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 landscape:gap-10 sm:gap-10">
                    {[player1, player2].map((p, idx) => (
                      <div 
                        key={p.id} 
                        className="relative p-4 sm:p-8 rounded-2xl sm:rounded-[2rem] border-2 space-y-6 shadow-xl transition-all duration-500"
                        style={{ 
                          backgroundColor: p.bgColor,
                          borderColor: p.color,
                          boxShadow: `0 1.5vh 3vh -1.5vh ${p.color}33`,
                          '--player-color': p.color,
                          '--card-padding': deviceInfo.isPhone ? '4vw' : '2vw'
                        } as React.CSSProperties}
                      >
                      <div className="flex items-center justify-between">
                        <label 
                          className="font-black uppercase tracking-widest text-slate-500" 
                          style={{ fontSize: deviceInfo.isPhone ? '1.5vh' : playerPrefLabelFontSize }}
                        >
                          Player {idx + 1} Name
                        </label>
                        <Palette className="w-4 h-4" style={{ color: p.color }} />
                      </div>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            const pref = getPlayerPref(val, idx === 0 ? 'p1' : 'p2');
                            if (idx === 0) {
                              setPlayer1(prev => ({...prev, name: val, ...(pref || {})}));
                            } else {
                              setPlayer2(prev => ({...prev, name: val, ...(pref || {})}));
                            }
                          }}
                          onBlur={() => {
                            const pref = getPlayerPref(p.name, idx === 0 ? 'p1' : 'p2');
                            if (pref) {
                              if (idx === 0) setPlayer1(prev => ({...prev, ...pref}));
                              else setPlayer2(prev => ({...prev, ...pref}));
                            }
                          }}
                          placeholder={`PLAYER ${idx + 1} NAME`}
                          className="w-full bg-slate-950/30 border-2 rounded-2xl px-6 py-3 text-2xl font-black focus:outline-none uppercase transition-all shadow-inner"
                          style={{ 
                            borderColor: p.color + '33',
                            color: 'white'
                          }}
                        />
                        <div className="space-y-6">
                            <ColorPicker
                             label="Text & Border"
                             value={p.color}
                             onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, color})) : setPlayer2(prev => ({...prev, color}))}
                             colors={THEME_COLORS}
                             icon={<Palette className="w-4 h-4" />}
                             isOpen={activePicker === `p${idx + 1}-theme`}
                             onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-theme` : null)}
                             themeColor={p.color}
                             pickerStyle="default"
                             allowedStyles={['default']}
                             onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, bgStyle: style})) : setPlayer2(prev => ({...prev, bgStyle: style}))}
                           />

                          <ColorPicker
                            label="Player Ball Options"
                            value={p.bgColor}
                            onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, bgColor: color, bgStyle: 'balls'})) : setPlayer2(prev => ({...prev, bgColor: color, bgStyle: 'balls'}))}
                            colors={POOL_BALLS}
                            icon={<Layout className="w-4 h-4" />}
                            isOpen={activePicker === `p${idx + 1}-bg`}
                            onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-bg` : null)}
                            themeColor={p.color}
                            pickerStyle="balls"
                            allowedStyles={['balls']}
                            onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, bgStyle: style})) : setPlayer2(prev => ({...prev, bgStyle: style}))}
                          />

                          <div className="relative">
                            <ColorPicker
                              label="Screen Background"
                              value={p.screenColor}
                              onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, screenColor: color})) : setPlayer2(prev => ({...prev, screenColor: color}))}
                              colors={BACKGROUND_COLORS}
                              icon={<Maximize className="w-4 h-4" />}
                              isOpen={activePicker === `p${idx + 1}-screen`}
                              onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-screen` : null)}
                              themeColor={p.color}
                              pickerStyle="default"
                              allowedStyles={['default']}
                              onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, screenStyle: style})) : setPlayer2(prev => ({...prev, screenStyle: style}))}
                              disabled={false}
                            />
                            {/* Screen Color Indicator Circle - 3rem (w-12 h-12) - Attached to Card Edge */}
                            <div 
                              className={`absolute w-[4vh] h-[4vh] sm:w-[6vh] sm:h-[6vh] rounded-full shadow-2xl transition-all duration-500 z-20 top-1/2 border-2 ${idx === 0 ? 'left-0' : 'right-0'}`}
                              style={{ 
                                backgroundColor: p.screenColor,
                                borderColor: p.color,
                                transform: `translateY(-50%) ${idx === 0 ? 'translateX(calc(-1 * (var(--card-padding) + 2vh)))' : 'translateX(calc(var(--card-padding) + 2vh))'}`,
                                opacity: 1,
                                filter: `drop-shadow(0 0 1.5vh ${p.color}44)`
                              } as any}
                              title="Screen Background Color"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-8 landscape:gap-12 sm:gap-12 items-start">
                  {/* 2. Break Tracker */}
                  <section className="space-y-6 self-stretch">
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
                      className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl relative h-full flex flex-col" 
                      style={{ borderColor: player1.color }}
                    >
                      {/* Title Box - Top */}
                      <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                        <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Break Tracking</p>
                      </div>

                      {/* Content Box - Description & Toggle */}
                      <div className="flex items-center justify-between gap-[4vw] flex-1">
                        <div className="flex-1">
                          <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Display a "white ball" break indicator that alternates with scores.</p>
                        </div>
                        <div className="shrink-0 flex items-center gap-4">
                          {isBreakTrackingEnabled && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setBreakBalls([]);
                                setCurrentBreakPlayerId('none');
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-xl font-black uppercase text-[2vw] tracking-widest transition-all active:scale-95 flex items-center gap-2"
                            >
                              <RotateCcw className="w-[1.5vh] h-[1.5vh]" />
                              Reset
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextValue = !isBreakTrackingEnabled;
                              setIsBreakTrackingEnabled(nextValue);
                              if (!nextValue) {
                                setBreakBalls([]);
                                setCurrentBreakPlayerId('none');
                              }
                            }}
                            className={`w-[10vw] sm:w-14 h-[5vw] sm:h-7 rounded-full transition-colors relative`}
                            style={{ backgroundColor: isBreakTrackingEnabled ? player1.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[4vw] sm:w-[1.25rem] h-[4vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isBreakTrackingEnabled ? 'left-[5.5vw] sm:left-[2rem]' : 'left-[0.5vw] sm:left-[0.25rem]'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 3. Device Time */}
                  <section className="space-y-6 self-stretch">
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
                      className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl cursor-pointer relative h-full flex flex-col"
                      style={{ borderColor: player1.color }}
                    >
                      {/* Title Box - Top */}
                      <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                        <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Show Device Time</p>
                      </div>

                      {/* Content Box - Description & Toggle */}
                      <div className="flex items-center justify-between gap-[4vw] flex-1">
                        <div className="flex-1">
                          <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Display live device time in the top bar centre</p>
                        </div>
                        <div className="shrink-0">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeviceTime(!showDeviceTime);
                            }}
                            className={`w-[10vw] sm:w-14 h-[5vw] sm:h-7 rounded-full transition-all active:scale-95 relative`}
                            style={{ backgroundColor: showDeviceTime ? player1.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[4vw] sm:w-[1.25rem] h-[4vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${showDeviceTime ? 'left-[5.5vw] sm:left-[2rem]' : 'left-[0.5vw] sm:left-[0.25rem]'}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 4. Shot Clock */}
                  <section className="space-y-6 self-stretch">
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
                      className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl cursor-pointer relative h-full flex flex-col" 
                      style={{ borderColor: player2.color }}
                    >
                      {/* Title Box - Top */}
                      <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                        <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Enable Shot Clock</p>
                      </div>

                      {/* Content Box - Description & Toggle */}
                      <div className="flex items-center justify-between gap-[4vw]">
                        <div className="flex-1 text-left">
                          <p className="text-white font-bold uppercase tracking-widest text-left" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>Display a draggable shot clock on the Gameplay screen</p>
                        </div>
                        <div className="shrink-0">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsShotClockEnabled(!isShotClockEnabled);
                              if (isShotClockEnabled) pauseTimer();
                            }}
                            className={`w-[10vw] sm:w-14 h-[5vw] sm:h-7 rounded-full transition-all active:scale-95 relative`}
                            style={{ backgroundColor: isShotClockEnabled ? player2.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[4vw] sm:w-[1.25rem] h-[4vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isShotClockEnabled ? 'left-[5.5vw] sm:left-[2rem]' : 'left-[0.5vw] sm:left-[0.25rem]'}`} />
                          </button>
                        </div>
                      </div>

                      {isShotClockEnabled && (
                        <div 
                          className="space-y-6 pt-8 border-t-2 mt-auto" 
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
                  <section className="space-y-6 self-stretch">
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
                      className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] sm:pb-[3vw] pt-[1vw] shadow-xl cursor-pointer relative h-full flex flex-col" 
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
                            className={`w-[10vw] sm:w-14 h-[5vw] sm:h-7 rounded-full transition-all active:scale-95 relative`}
                            style={{ backgroundColor: isMatchClockEnabled ? player1.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[4vw] sm:w-[1.25rem] h-[4vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isMatchClockEnabled ? 'left-[5.5vw] sm:left-[2rem]' : 'left-[0.5vw] sm:left-[0.25rem]'}`} />
                          </button>
                        </div>
                      </div>

                      {isMatchClockEnabled && (
                        <div className="space-y-6 pt-8 border-t border-slate-800 mt-auto" onClick={(e) => e.stopPropagation()}>
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
                            className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-slate-700"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Reset Match Clock
                          </button>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 6. Restore Defaults */}
                  <section className="space-y-6 self-stretch">
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
                    <div className="grid grid-cols-1 gap-6 h-full">
                      <div 
                        className="bg-black/80 backdrop-blur-md border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] landscape:pb-[3vw] sm:pb-[6vw] pt-[1vw] shadow-xl relative h-full flex flex-col"
                        style={{ borderColor: player1.color }}
                      >
                        {/* Title Box - Top */}
                        <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw]">
                          <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Restore Defaults</p>
                        </div>

                        {/* Content Box - Description */}
                        <div className="w-full text-left flex-1">
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

                  {/* 7. App Installation */}
                  <section className="space-y-6 self-stretch">
                    <h3 
                      className="font-black uppercase tracking-widest pb-4 border-b-2 text-left w-full"
                      style={{ 
                        borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`, 
                        color: 'white',
                        fontSize: deviceInfo.titleSizes.section
                      }}
                    >
                      App Installation
                    </h3>
                    <div className="grid grid-cols-1 gap-6 h-full">
                      <div 
                        className="bg-black border-2 rounded-2xl sm:rounded-[2rem] px-[3vw] pb-[6vw] landscape:pb-[3vw] sm:pb-[6vw] pt-[1vw] shadow-xl relative h-full flex flex-col"
                        style={{ borderColor: player1.color }}
                      >
                        {/* Title Box - Top */}
                        <div className="w-full text-center border-b border-white/5 pb-[1vw] mb-[3vw] flex items-center justify-center gap-3">
                          <Trophy className="w-[4vw] sm:w-6 h-[4vw] sm:h-6 text-yellow-500" />
                          <p className="font-black text-slate-200 uppercase tracking-tight leading-none" style={{ fontSize: deviceInfo.titleSizes.tile }}>Add to Device</p>
                        </div>

                        {/* Content Box - Description */}
                        <div className="w-full text-left flex-1 space-y-4">
                          <p className="text-white font-bold uppercase tracking-widest leading-relaxed" style={{ fontSize: deviceInfo.titleSizes.tileDesc }}>
                            Install Pool-Pro as a full-screen app for the best match tracking experience Offline.
                          </p>
                          
                          {isInstallable ? (
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                              <p className="text-emerald-400 text-[1.8vh] font-bold uppercase tracking-wider">
                                Click the button below to install directly to your device.
                              </p>
                            </div>
                          ) : (
                            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                              <p className="text-blue-400 text-[1.8vh] font-bold uppercase tracking-wider">
                                To install: Use "Add to Home Screen" in your browser menu (Safari Share button or Chrome's three dots).
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Install Button or Info */}
                        {isInstallable ? (
                          <button 
                            onClick={handleInstallClick}
                            className="absolute bottom-[2vw] right-[2vw] px-[4vw] sm:px-[2vw] py-[2vw] sm:py-[1vh] bg-emerald-600 hover:bg-emerald-500 rounded-xl sm:rounded-2xl text-[2.5vw] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-[1vw] border border-emerald-500 shadow-[0_0_1.5vh_rgba(16,185,129,0.3)]"
                          >
                            <Trophy className="w-[3vw] sm:w-4 h-[3vw] sm:h-4 text-white" />
                            Install Now
                          </button>
                        ) : (
                          <div className="absolute bottom-[2vw] right-[2vw]">
                             <Trophy className="w-[6vw] sm:w-10 h-[6vw] sm:h-10 text-white/10" />
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                </div>

                {/* 8. API Configuration */}
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
                            className="w-full h-10 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-xl text-[0.625rem] font-black uppercase tracking-widest text-slate-300 transition-all active:scale-95 border border-slate-700 flex items-center justify-center gap-2"
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
                      <span className="font-mono" style={{ color: player1.color }}>0.9.6 - ALPHA</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Developer</span>
                      <span className="font-mono" style={{ color: player2.color }}>Duchy Tech Services</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Contact</span>
                      <a href="mailto:pool-pro@duchytechservices.co.uk" className="font-mono hover:underline transition-all lowercase" style={{ color: player1.color }}>pool-pro@duchytechservices.co.uk</a>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {isLoaded && view === 'match-details' && (
            <motion.div
              key="match-details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8 pb-20 w-full max-w-[95vw] mx-auto"
            >
              <div 
                className="relative flex items-center justify-center pb-[4vh] border-b-[0.2vh] min-h-[10vh] sm:min-h-[14vh] w-full"
                style={{ 
                  borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1`
                }}
              >
                <div className="absolute left-0 bottom-[1vh] sm:bottom-[1vh]">
                  <button 
                    onClick={navigateBack}
                    className="group relative h-[calc(3rem+1vh)] sm:h-[calc(4rem+1vh)] active:scale-95 transition-all mt-[1vh] sm:mt-0"
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

               {(matchHistory.find(m => m.id === viewingMatchDetailsId) || viewingMatchDetailsId === 'live' || viewingMatchDetailsId?.startsWith('live-') || viewingMatchDetailsId === 'session') ? (() => {
                const isSession = viewingMatchDetailsId === 'session';
                const isLiveId = viewingMatchDetailsId === 'live' || viewingMatchDetailsId?.startsWith('live-');
                
                const match = isSession ? {
                  id: 'session',
                  date: new Date().toISOString(),
                  player1: activeSetupTab === 'group' ? (player1.name || team1Players[0] || 'Player 1') : (team1Name || 'Team 1'),
                  player2: activeSetupTab === 'group' ? (player2.name || team2Players[0] || 'Player 2') : (team2Name || 'Team 2'),
                  team1: team1Name,
                  team2: team2Name,
                  score1: teamTotals.t1,
                  score2: teamTotals.t2,
                  winner: teamTotals.t1 > teamTotals.t2 ? (team1Name || 'Team 1') : (teamTotals.t2 > teamTotals.t1 ? (team2Name || 'Team 2') : 'TIE'),
                  frameDetails: (() => {
                    const allFrames = [
                      ...matchHistory
                        .filter(m => {
                          if (m.isSession || m.id === 'session') return false; 
                          
                          const t1 = (team1Name || '').trim().toLowerCase();
                          const t2 = (team2Name || '').trim().toLowerCase();
                          const mT1 = (m.team1 || '').trim().toLowerCase();
                          const mT2 = (m.team2 || '').trim().toLowerCase();

                          if (t1 && t2) {
                            return (mT1 === t1 && mT2 === t2) || (mT1 === t2 && mT2 === t1);
                          }
                          
                          return true;
                        })
                        .reverse()
                        .flatMap(m => (m.frameDetails || []).map(f => ({ 
                          ...f, 
                          referee: f.referee || m.referee,
                          player1Name: m.player1,
                          player2Name: m.player2
                        }))),
                      ...(Object.entries(matchupSettings)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .flatMap(([idx, settings]) => {
                          // If this is the currently selected matchup, we'll take it from currentMatchFrameDetails instead
                          // to prevent duplicates during the active frame creation
                          if (parseInt(idx) === selectedMatchIndex) return [];
                          const s = settings as MatchupSettings;
                          return (s.frameDetails || []).map(f => ({ 
                            ...f, 
                            referee: f.referee || s.referee,
                            player1Name: s.player1?.name,
                            player2Name: s.player2?.name
                          }));
                        })),
                      ...currentMatchFrameDetails.map(f => ({ 
                        ...f, 
                        referee: f.referee || (selectedMatchIndex !== null ? matchupSettings[selectedMatchIndex]?.referee : undefined),
                        player1Name: player1.name,
                        player2Name: player2.name
                      }))
                    ];

                    // Deduplicate by timestamp - using a stable key
                    const uniqueFramesMap = new Map<string, any>();
                    allFrames.forEach(f => {
                      if (f.timestamp) {
                        const key = `${f.timestamp}_${f.winnerName || ''}_${f.score1}_${f.score2}`;
                        uniqueFramesMap.set(key, f);
                      }
                    });
                    
                    return Array.from(uniqueFramesMap.values())
                      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map((f, idx) => ({ ...f, frameNumber: idx + 1 }));
                  })(),
                  isLive: true,
                  isSession: true
                } : isLiveId ? (() => {
                  const liveIdx = viewingMatchDetailsId === 'live' ? selectedMatchIndex : parseInt(viewingMatchDetailsId.split('-')[1]);
                  const isCurrentActive = liveIdx !== null && liveIdx === selectedMatchIndex;
                  const settings = liveIdx !== null ? matchupSettings[liveIdx] : null;
                  
                  return {
                    id: viewingMatchDetailsId,
                    date: new Date().toISOString(),
                    startTime: (isCurrentActive ? matchStartTime : null) || undefined,
                    player1: (isCurrentActive ? player1.name : (liveIdx !== null ? team1Players[liveIdx] : 'Player 1')) || 'Player 1',
                    player2: (isCurrentActive ? player2.name : (liveIdx !== null ? team2Players[liveIdx] : 'Player 2')) || 'Player 2',
                    team1: team1Name || undefined,
                    team2: team2Name || undefined,
                    score1: isCurrentActive ? player1.score : (settings?.score1 || 0),
                    score2: isCurrentActive ? player2.score : (settings?.score2 || 0),
                    referee: isCurrentActive ? (matchupSettings[liveIdx!]?.referee) : (settings?.referee),
                    winner: (isCurrentActive ? (player1.score > player2.score ? player1.name : player2.name) : (settings ? ((settings.score1 || 0) > (settings.score2 || 0) ? (liveIdx !== null ? team1Players[liveIdx] : 'Player 1') : (liveIdx !== null ? team2Players[liveIdx] : 'Player 2')) : 'Player 1')) || 'Player 1',
                    shotClockSetting: isCurrentActive ? (isShotClockEnabled ? shotClockDuration : undefined) : (settings?.isShotClockEnabled ? settings.shotClock : undefined),
                    matchClockRemaining: isCurrentActive ? (isMatchClockEnabled ? matchClock : undefined) : undefined,
                    frameDetails: isCurrentActive ? currentMatchFrameDetails : (settings?.frameDetails || []),
                    isLive: true
                  };
                })() : (() => {
                  const histMatch = matchHistory.find(m => m.id === viewingMatchDetailsId);
                  return histMatch ? { ...histMatch, isLive: false } : null;
                })();
                          
                if (!match) return null;

                return (
                  <div className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6">
                       <div className="p-3 sm:p-5 rounded-3xl bg-slate-900/50 border border-slate-800/50 shadow-lg flex flex-col items-center text-center">
                          <p className="text-[0.5625rem] sm:text-xs uppercase font-black text-slate-500 mb-2 tracking-[0.2em]">
                            {match.isLive ? (isSession ? 'Session Progress' : 'Live Match Tracker') : 'Detailed Frame Analysis'}
                          </p>
                          <div className="flex flex-col items-center gap-0.5">
                            {match.player1 && match.player1.includes('/') ? (
                              <div className="flex flex-col">
                                <span className="text-sm sm:text-xl font-black text-white uppercase leading-none">{match.player1.split('/')[0].trim()}</span>
                                <span className="text-[0.625rem] sm:text-xs font-black text-white/60 uppercase leading-none mt-1">{match.player1.split('/')[1].trim()}</span>
                              </div>
                            ) : (
                              <span className="text-sm sm:text-xl font-black text-white uppercase">{match.player1}</span>
                            )}
                            <span className="text-[1vh] sm:text-[1.2vh] text-slate-600 font-black px-1">VS</span>
                            {match.player2 && match.player2.includes('/') ? (
                              <div className="flex flex-col">
                                <span className="text-sm sm:text-xl font-black text-white uppercase leading-none">{match.player2.split('/')[0].trim()}</span>
                                <span className="text-[0.625rem] sm:text-xs font-black text-white/60 uppercase leading-none mt-1">{match.player2.split('/')[1].trim()}</span>
                              </div>
                            ) : (
                              <span className="text-sm sm:text-xl font-black text-white uppercase">{match.player2}</span>
                            )}
                          </div>
                          {match.team1 && !isSession && <p className="text-[1.1vh] sm:text-[1.3vh] text-slate-500 font-bold uppercase mt-1.5">{match.team1} vs {match.team2}</p>}
                          
                          {/* Match Referee Display */}
                          {(match as any).referee && (
                            <div className="mt-3 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                              <Glasses className="w-3 h-3 text-amber-500" />
                              <span className="text-[0.625rem] sm:text-[0.75rem] font-black text-amber-500 uppercase tracking-wider">{(match as any).referee.name}</span>
                            </div>
                          )}
                       </div>
                       <div className="p-3 sm:p-5 rounded-3xl bg-slate-900/50 border border-slate-800/50 text-right shadow-lg">
                          <div className="flex items-center justify-end gap-2 mb-1">
                            {match.isLive && <div className="w-[1vh] h-[1vh] rounded-full bg-blue-500 animate-pulse shadow-[0_0_0.8vh_rgba(59,130,246,0.8)]" />}
                            <p className="text-[1.1vh] sm:text-[1.3vh] uppercase font-black text-slate-500 lg:tracking-widest">{match.isLive ? (isSession ? 'Total Score' : 'Live Score') : 'Outcome / Date'}</p>
                          </div>
                          <p className={`text-base sm:text-2xl font-black tabular-nums ${match.isLive ? 'text-blue-400' : 'text-emerald-400'}`}>{match.score1} - {match.score2}</p>
                          <p className="text-[1.1vh] sm:text-[1.3vh] text-slate-500 font-bold uppercase mt-1.5">{match.isLive ? (isSession ? 'Tournament Active' : 'Currently Playing') : new Date(match.date).toLocaleString('en-GB')}</p>
                       </div>
                    </div>

                    {/* Frame Table Extracted */}
                    {activeSetupTab === 'group' ? (
                      <GroupMatchDetailsTable 
                        match={match} 
                        player1Color={player1.color} 
                        player2Color={player2.color} 
                      />
                    ) : (
                      <MatchMatchDetailsTable 
                        match={match} 
                        player1Color={player1.color} 
                        player2Color={player2.color} 
                      />
                    )}

                    <div className="flex justify-between items-center px-4">
                       <div className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-slate-800" />
                          <p className="text-[1.2vh] font-black text-slate-700 uppercase tracking-widest">End of Record</p>
                       </div>
                       {match.shotClockSetting && (
                         <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-slate-700" />
                            <p className="text-[1.2vh] font-black text-slate-700 uppercase tracking-widest">Shot Clock: {match.shotClockSetting}S Enabled</p>
                         </div>
                       )}
                    </div>

                    <div className="pt-12 flex justify-start">
                       <button 
                         onClick={() => navigateToView('teams')}
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
                               <span className="text-[1.2vh] sm:text-[1.5vh] font-bold text-slate-600 uppercase tracking-widest mt-1">Team Setup</span>
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

        {/* Hidden SEO Content for search engine indexing */}
        <section className="sr-only" aria-hidden="true" style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>
          <h2>Pool-Pro.uk: Premium Pool Scoreboard and Tournament Manager</h2>
          <p>
            The ultimate pool app for serious players. Pool-Pro is a professional digital score board and scoreboard solution. 
            Manage your tournament sessions with ease using our poolpro tools. Track every match at pool-pro.uk and poolpro.uk.
            Includes advanced tracking for pool scores, best pool scor (scores), frame counters, and match clocks.
          </p>
          <ul>
            <li>Professional Pool Scoreboard</li>
            <li>Digital Score Board</li>
            <li>Professional tournament tracking</li>
            <li>Best pool score app</li>
            <li>Pool pro scoreboard UK</li>
          </ul>
        </section>

      </motion.main>

      {/* Global Modals - Moved to root level for proper z-index stacking above TopBarNav */}
      <AnimatePresence>
        {showClearTeamsConfirm && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border-2 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6"
              style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
            >
              <div className="flex items-center gap-4 text-red-500">
                <Trash2 className="w-8 h-8" />
                <h3 className="text-xl font-bold">{activeSetupTab === 'match' ? 'Clear Team Data?' : 'Clear Player Data?'}</h3>
              </div>
              <p className="text-slate-400">This will permanently delete {activeSetupTab === 'match' ? 'team names, player lists' : 'player names'}, current scores, and match history. This action cannot be undone.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowClearTeamsConfirm(false)}
                  className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={clearTeams}
                  className="flex-1 h-12 bg-red-500 hover:bg-red-400 text-slate-950 rounded-xl font-bold transition-all active:scale-95"
                >
                  {activeSetupTab === 'match' ? 'Clear Team Data' : 'Clear Player Data'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showExportMenu && (
          <div 
            className="fixed inset-0 z-[10010] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm h-[100dvh]"
            onClick={() => setShowExportMenu(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black border-2 p-6 sm:p-8 rounded-t-[2.5rem] sm:rounded-3xl max-w-md w-full shadow-2xl space-y-4 sm:space-y-6 h-[100dvh] sm:h-auto sm:max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col"
              style={{ borderImage: `linear-gradient(to right, ${player1.color} 50%, ${player2.color} 50%) 1` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-emerald-500">
                  <Download className="w-8 h-8" />
                  <h3 className="text-xl font-bold uppercase tracking-tight">Export {activeSetupTab === 'group' ? 'Group' : 'Match'} Data</h3>
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
                    ...(activeSetupTab === 'match' ? [{ id: 'server', label: 'Send to Server', icon: Server, desc: 'Upload to tournament server' }] : [])
                  ].map((method: any) => (
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
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${exportMethod === method.id ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
                      style={{ borderImage: exportMethod === method.id ? 'none' : 'initial', borderColor: exportMethod === method.id ? 'inherit' : '' }}
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
          <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
                  className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    // Restore Selected players colour prefs
                    setPlayer1(prev => ({ ...prev, ...SLOT1_DEFAULTS }));
                    setPlayer2(prev => ({ ...prev, ...SLOT2_DEFAULTS }));
                    
                    // Restore Shot clock settings
                    setShotClockDuration(SHOT_CLOCK_DEFAULT);
                    setShotClock(SHOT_CLOCK_DEFAULT);
                    setIsShotClockEnabled(false);
                    
                    // Restore Match clock settings
                    setMatchClockDuration(600);
                    setMatchClock(600);
                    setIsMatchClockEnabled(false);
                    
                    // Restore Device Time and Clock positions
                    setShowDeviceTime(true);
                    setDeviceTimePosition(null);
                    setMatchClockPosition(null);
                    setShotClockPosition(null);
                    
                    // Restore Backdrop
                    setFullScreenBackdrop('green');
                    
                    setShowRestoreDefaultsConfirm(false);
                  }}
                  className="flex-1 h-12 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl font-bold transition-all active:scale-95"
                >
                  Restore
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showClearHistoryConfirm && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
                  className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    clearHistory();
                    setShowClearHistoryConfirm(false);
                  }}
                  className="flex-1 h-12 bg-red-500 hover:bg-red-400 text-slate-950 rounded-xl font-bold transition-all active:scale-95"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showDoublesPicker.isOpen && renderDoublesPicker()}
        {showRefereePicker.isOpen && renderRefereePicker()}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-black border-[0.3vh] border-red-500/50 p-[6vh] sm:p-[10vh] rounded-[2.5rem] max-w-[80vw] w-full space-y-[6vh] sm:space-y-[8vh] text-center shadow-[0_0_5vh_rgba(239,68,68,0.2)]"
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                    <Trash2 className="w-10 h-10 sm:w-16 sm:h-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-4xl font-black uppercase text-white">Reset Session?</h2>
                  <p className="text-slate-400 text-sm sm:text-base font-medium">This will permanently delete all match results, scores, and break tracking data for this entire session. This action cannot be undone.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="h-14 sm:h-16 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={clearAllTableData}
                  className="h-[6vh] sm:h-[8vh] bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_0.4vh_1.5vh_rgba(220,38,38,0.4)]"
                >
                  Reset All
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showTeamTotals && (
          <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
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
                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">Totals</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[0.625rem] sm:text-xs">
                  Current Session Tally
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-8 items-center border-t border-b border-white/10 py-6 sm:py-8">
                <div className="space-y-2 sm:space-y-4">
                  <p className="text-sm sm:text-xl font-black uppercase tracking-tight truncate px-1" style={{ color: player1.color }}>{activeSetupTab === 'group' ? (player1.name || team1Players[0] || 'PLAYER 1') : (team1Name || 'TEAM 1')}</p>
                  <p 
                    className="text-4xl sm:text-8xl font-black text-white tabular-nums"
                    style={{ fontSize: deviceInfo.isSquarish ? (deviceInfo.isPhone ? '2.025rem' : '5.4rem') : undefined }}
                  >
                    {teamTotals.t1}
                  </p>
                </div>
                <div className="space-y-2 sm:space-y-4">
                  <p className="text-sm sm:text-xl font-black uppercase tracking-tight truncate px-1" style={{ color: player2.color }}>{activeSetupTab === 'group' ? (player2.name || team2Players[0] || 'PLAYER 2') : (team2Name || 'TEAM 2')}</p>
                  <p 
                    className="text-4xl sm:text-8xl font-black text-white tabular-nums"
                    style={{ fontSize: deviceInfo.isSquarish ? (deviceInfo.isPhone ? '2.025rem' : '5.4rem') : undefined }}
                  >
                    {teamTotals.t2}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowTeamTotals(false);
                  if (pendingMatchAdvance) {
                    setPendingMatchAdvance(false);
                    completeMatchAndAdvance();
                  }
                  navigateToView('teams');
                }}
                id="totals-continue-button"
                className="w-full h-14 sm:h-20 text-slate-950 rounded-2xl sm:rounded-3xl font-black text-lg sm:text-2xl uppercase tracking-widest transition-all active:scale-95"
                style={{ 
                  backgroundImage: `linear-gradient(to right, ${player1.color}, ${player2.color})`,
                  boxShadow: `0 0.625rem 1.25rem ${player1.color}33`
                }}
              >
                {pendingMatchAdvance ? 'Continue' : 'Close Results'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${view === 'scoreboard' ? 'text-slate-950' : 'text-slate-400'}`}
              style={view === 'scoreboard' ? { backgroundColor: player1.color } : {}}
            >
              Score
            </button>
            <button 
              onClick={() => navigateToView('teams')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${view === 'teams' ? 'text-slate-950' : 'text-slate-400'}`}
              style={view === 'teams' ? { backgroundColor: player1.color } : {}}
            >
              Teams
            </button>
            <button 
              onClick={() => navigateToView('settings')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${view === 'settings' ? 'text-slate-950' : 'text-slate-400'}`}
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
