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
  GripVertical,
  Glasses
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Player, MatchHistoryEntry, MatchupSettings, FrameDetail } from './types';
import { 
  THEME_COLORS, 
  BACKGROUND_COLORS, 
  POOL_BALLS, 
  CLOTH_COLORS, 
  SPEED_CLOTH_COLORS,
  FULL_SCREEN_BACKDROPS
} from './constants';
import { ColorPicker } from './components/ColorPicker';
import portraitBackdrop from './assets/portrait_mode_backdrop.png';

const SHOT_CLOCK_DEFAULT = 30;

type SetupTab = 'singles' | 'group' | 'match';

interface SortableRowProps {
  id: string | number;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  key?: React.Key;
}

function SortableRow({ id, children, onClick, className }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'shadow-2xl ring-2 ring-emerald-500/50 bg-slate-900/90 z-50' : ''}`}
      onClick={!isDragging ? onClick : undefined}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="flex px-[1vw] py-[2vh] text-slate-700 hover:text-emerald-500 cursor-grab active:cursor-grabbing w-[6%] items-center justify-center shrink-0 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
}

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
  const [activeSetupTab, setActiveSetupTab] = useState<SetupTab>('singles');
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
    breakBalls: [] as number[]
  });
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>([]);
  const [currentMatchFrameDetails, setCurrentMatchFrameDetails] = useState<FrameDetail[]>([]);
  const [viewingMatchDetailsId, setViewingMatchDetailsId] = useState<string | null>(null);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [view, setView] = useState<'scoreboard' | 'history' | 'settings' | 'teams' | 'match-details'>('scoreboard');
  const [navigationHistory, setNavigationHistory] = useState<('scoreboard' | 'history' | 'settings' | 'teams' | 'match-details')[]>(['scoreboard']);
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
    POOL_BALLS.forEach(ball => {
      // Preload high-res
      if (ball.image) {
        const img = new Image();
        img.src = ball.image;
      }
      // Preload thumbnails
      if (ball.thumbnail) {
        const thumbImg = new Image();
        thumbImg.src = ball.thumbnail;
      }
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
      isPhone, isTablet, isDesktop, isLandscape, isPortrait, isShort, 
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
        !(activeSetupTab === 'singles' && (!player1.name || !player2.name)) &&
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

  const getMatchResult = (p1: string, p2: string) => {
    if (!p1 || !p2) return null;
    const p1Clean = p1.trim().toLowerCase();
    const p2Clean = p2.trim().toLowerCase();
    return matchHistory.find(m => {
      const mhP1 = m.player1.trim().toLowerCase();
      const mhP2 = m.player2.trim().toLowerCase();
      return (mhP1 === p1Clean && mhP2 === p2Clean) || (mhP1 === p2Clean && mhP2 === p1Clean);
    });
  };

  const teamTotals = useMemo(() => {
    let t1 = 0;
    let t2 = 0;
    
    // In Singles mode, we want the sum of ALL relevant matches in history
    if (activeSetupTab === 'singles') {
      const p1 = (player1.name || singlesSetup.p1Name || '').trim().toLowerCase();
      const p2 = (player2.name || singlesSetup.p2Name || '').trim().toLowerCase();

      matchHistory.forEach(m => {
        // Filter for matches in this mode OR matches with no mode that look like singles
        const isSinglesEntry = m.mode === 'singles' || (!m.mode && !m.isDoubles && !m.team1);

        if (isSinglesEntry) {
          const mScore1 = Number(m.score1) || 0;
          const mScore2 = Number(m.score2) || 0;
          const mP1 = (m.player1 || '').trim().toLowerCase();
          const mP2 = (m.player2 || '').trim().toLowerCase();

          // If names are specified, attempt to match them (handling swaps)
          const p1Valid = p1 && !p1.includes('player 1') && !p1.includes('name');
          const p2Valid = p2 && !p2.includes('player 2') && !p2.includes('name');

          if (p1Valid && p2Valid) {
            if (mP1 === p1 && mP2 === p2) {
              t1 += mScore1;
              t2 += mScore2;
            } else if (mP1 === p2 && mP2 === p1) {
              t1 += mScore2;
              t2 += mScore1;
            }
          } else {
            // Fallback: sum all singles matches since names are placeholders or missing
            t1 += mScore1;
            t2 += mScore2;
          }
        }
      });

      // Also add live score if we have any progress in the current matchup
      const live1 = Number(player1.score) || (matchupSettings[0]?.score1) || 0;
      const live2 = Number(player2.score) || (matchupSettings[0]?.score2) || 0;
      const hasLiveScore = (live1 > 0 || live2 > 0);
      
      if (hasLiveScore) {
        // Double check against history to avoid duplicating a match that was JUST added
        const mostRecentMatch = matchHistory.length > 0 ? matchHistory[0] : null;
        const wasJustFinished = mostRecentMatch && 
                               (Date.now() - Number(mostRecentMatch.id) < 5000) &&
                               mostRecentMatch.score1 === live1 &&
                               mostRecentMatch.score2 === live2;

        if (!wasJustFinished) {
          t1 += live1;
          t2 += live2;
        }
      }
      return { t1, t2 };
    }

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
        const match = getMatchResult(p1Name, p2Name);
        
        // 2. Use matchupSettings if available (which carries progress from the session)
        m1 = Number(settings?.score1 ?? 0) || 0;
        m2 = Number(settings?.score2 ?? 0) || 0;
        
        // 3. If no matchupSettings scores, use history (for completed matches)
        if (m1 === 0 && m2 === 0 && match) {
          const s1 = Number(match.score1) || 0;
          const s2 = Number(match.score2) || 0;
          if (match.player1 === p1Name) {
            m1 = s1;
            m2 = s2;
          } else {
            m1 = s2;
            m2 = s1;
          }
        }
      }
      
      t1 += m1;
      t2 += m2;
    }
    return { t1, t2 };
  }, [team1Players, team2Players, matchHistory, selectedMatchIndex, player1.name, player2.name, player1.score, player2.score, matchupSettings, singlesSetup, activeSetupTab]);

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
      const loadedTab = (state.activeSetupTab as SetupTab | undefined) || 'singles';
      const t1Name = getVal('team1Name', state.teamData?.team1Name, 'pool_team1_name');
      const t2Name = getVal('team2Name', state.teamData?.team2Name, 'pool_team2_name');
      const t1PlayersLoaded = (state.teamData?.team1Players || JSON.parse(localStorage.getItem('pool_team1_players') || 'null') || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER '));
      const t2PlayersLoaded = (state.teamData?.team2Players || JSON.parse(localStorage.getItem('pool_team2_players') || 'null') || []).filter((p: string) => p && !p.toUpperCase().includes('PLAYER '));

      setActiveSetupTab(loadedTab);

      // Load isolated setup buffers
      if (state.singlesSetup) {
        setSinglesSetup({
          ...state.singlesSetup,
          p1Name: (state.singlesSetup.p1Name || '').toUpperCase().includes('PLAYER ') ? '' : (state.singlesSetup.p1Name || ''),
          p2Name: (state.singlesSetup.p2Name || '').toUpperCase().includes('PLAYER ') ? '' : (state.singlesSetup.p2Name || ''),
        });
      }
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
      } else if (loadedTab === 'group' && state.groupSetup) {
        currentT1Name = '';
        currentT2Name = '';
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
      } else if (loadedTab === 'singles') {
        currentT1Name = '';
        currentT2Name = '';
        const rawP1 = (state.singlesSetup?.p1Name || '');
        const rawP2 = (state.singlesSetup?.p2Name || '');
        
        // Only clear if it's EXACTLY the placeholder string, not just containing "PLAYER"
        const singlesP1 = (rawP1 === 'PLAYER 1' || rawP1 === 'PLAYER') ? '' : rawP1;
        const singlesP2 = (rawP2 === 'PLAYER 2' || rawP2 === 'PLAYER') ? '' : rawP2;

        if (singlesP1 && singlesP2) {
          currentT1Players = [singlesP1];
          currentT2Players = [singlesP2];
          selIndex = 0;
        } else {
          currentT1Players = [];
          currentT2Players = [];
          selIndex = null;
        }
        if (state.singlesSetup?.history?.length > 0) history = state.singlesSetup.history;
        if (state.singlesSetup?.frameDetails?.length > 0) frameDetails = state.singlesSetup.frameDetails;
        p1Name = singlesP1;
        p2Name = singlesP2;
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

      // Load Other Data (Load preferences early so they can be applied to player objects)
      const loadedPrefs = state.playerPreferences || {};
      if (state.playerPreferences) setPlayerPreferences(state.playerPreferences);
      
      // Load matchup settings: priority to the global settings if tab-specific ones are missing or empty
      const tabPrefix = loadedTab === 'match' ? 'match' : (loadedTab === 'group' ? 'group' : 'singles');
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

      if (loadedTab === 'singles' && state.singlesSetup) {
        s1 = state.singlesSetup.score1 !== undefined ? state.singlesSetup.score1 : (state.gameData?.player1Score || 0);
        s2 = state.singlesSetup.score2 !== undefined ? state.singlesSetup.score2 : (state.gameData?.player2Score || 0);
      } else if (selIndex !== null) {
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
      setTimeout(() => setIsLoaded(true), 100);
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
      : (style === 'cloth' ? CLOTH_COLORS : (style === 'speed' ? SPEED_CLOTH_COLORS : BACKGROUND_COLORS));
    return list.find(c => c.value.toLowerCase() === value.toLowerCase())?.name || value;
  };

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
      apiConfig,
      matchModeBreakSide,
      
      // Mode-Specific Buffers
      singlesSetup: (activeSetupTab === 'singles') 
        ? { ...singlesSetup, ...currentActiveData, p1Name: player1.name, p2Name: player2.name } 
        : singlesSetup,
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
    singlesSetup, matchSetup, groupSetup,
    matchHistory, currentMatchFrameDetails, matchStartTime,
    player1.score, player2.score, player1.name, player2.name,
    currentBreakPlayerId, breakBalls, matchupSettings, selectedMatchIndex,
    shotClockDuration, isShotClockEnabled, matchClockDuration, isMatchClockEnabled,
    isBreakTrackingEnabled, view, isNavVisible, matchModeBreakSide, fullScreenBackdrop,
    showDeviceTime, deviceTimePosition, matchClockPosition, shotClockPosition,
    playerPreferences, pairTrackerSettings, apiConfig
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
      breakBalls: [...breakBalls]
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

  const finishMatch = () => {
    if (activeSetupTab === 'match' || activeSetupTab === 'group') {
      completeMatchAndAdvance();
    } else {
      navigateToView('teams');
    }
  };

  const clearAllTableData = () => {
    if (activeSetupTab === 'singles') {
      clearSinglesData(false);
    } else if (activeSetupTab === 'match') {
      clearMatchData(false);
    } else if (activeSetupTab === 'group') {
      clearGroupData(false);
    }
    
    // Close confirm
    setShowDeleteAllConfirm(false);
  };

  const completeMatchAndAdvance = () => {
    const isMatchMode = activeSetupTab === 'match' || activeSetupTab === 'singles';
    const isGroupMode = activeSetupTab === 'group';

    setCurrentMatchFrameDetails([]);
    setMatchStartTime(null);
    frameStartTimeRef.current = Date.now();
    
    // Logic for Match, Group, or Singles
    if (isMatchMode || isGroupMode) {
      if (selectedMatchIndex !== null) {
        const maxMatches = Math.max(team1Players.length, team2Players.length);
        const nextIndex = selectedMatchIndex + 1;
        
        // Advance only in multi-match modes
        if (nextIndex < maxMatches && activeSetupTab !== 'singles') {
          selectTeamMatch(nextIndex);
        } else {
          // Finish session / match
          setCurrentBreakPlayerId('none');
          setBreakBalls([]);
          setSelectedMatchIndex(null);
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
          frameDetails: []
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

  const selectTeamMatch = (index: number) => {
    const p1Name = team1Players[index] || '';
    const p2Name = team2Players[index] || '';
    
    // Load individual player preferences if they exist
    const p1Pref = getPlayerPref(p1Name, 'p1');
    const p2Pref = getPlayerPref(p2Name, 'p2');
    
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
    
    setSelectedMatchIndex(index);
    
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

    setView('scoreboard');
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
    setNavigationHistory(prev => [...prev.slice(-10), newView]);
    setView(newView);
    if (deviceInfo.isPhone && newView !== 'scoreboard') setIsNavVisible(false);
  };

  const navigateBack = () => {
    if (navigationHistory.length > 1) {
      const history = [...navigationHistory];
      history.pop(); // Remove current view
      const prevView = history[history.length - 1];
      setNavigationHistory(history);
      setView(prevView);
    } else {
      setView('scoreboard');
    }
  };

  const navigateToScoreboard = () => {
    navigateToView('scoreboard');
    if (deviceInfo.isPhone) setIsNavVisible(true);
  };

  const clearSinglesData = (clearNames = false) => {
    // 1. Clear Singles Specific State
    setPlayer1(prev => ({ 
      ...prev,
      name: clearNames ? '' : prev.name,
      score: 0, 
      isTurn: true, 
      ...SLOT1_DEFAULTS 
    }));
    setPlayer2(prev => ({ 
      ...prev,
      name: clearNames ? '' : prev.name,
      score: 0, 
      isTurn: false, 
      ...SLOT2_DEFAULTS 
    }));
    
    setSinglesSetup(prev => ({ 
      ...prev,
      p1Name: clearNames ? '' : prev.p1Name,
      p2Name: clearNames ? '' : prev.p2Name,
      history: [], 
      frameDetails: [], 
      matchStartTime: null, 
      score1: 0, 
      score2: 0, 
      currentBreakPlayerId: 'none', 
      breakBalls: [] 
    }));
    
    if (clearNames) {
      setTeam1Players([]);
      setTeam2Players([]);
      setSelectedMatchIndex(null);
    } else {
      setSelectedMatchIndex(0);
    }
    
    // Clear persistent pair tracker for current match if any
    if (player1.name && player2.name) {
      const p1p2Key = `${player1.name}|${player2.name}`;
      setPairTrackerSettings(prev => {
        const next = { ...prev };
        delete next[p1p2Key];
        return next;
      });
    }

    // 2. Clear history entries specifically for singles mode
    setMatchHistory(prev => prev.filter(m => m.mode !== 'singles'));
    
    // 3. Clear transient frame info
    setCurrentMatchFrameDetails([]);
    setMatchStartTime(null);
    setMatchClock(matchClockDuration);
  };

  const clearMatchData = (clearNames = false) => {
    // 1. Clear Match Mode Specific State
    if (clearNames) {
      setTeam1Name('');
      setTeam2Name('');
      setTeam1Players([]);
      setTeam2Players([]);
    }
    
    setMatchSetup(prev => ({ 
      ...prev,
      t1Name: clearNames ? '' : prev.t1Name, 
      t2Name: clearNames ? '' : prev.t2Name, 
      t1Players: clearNames ? [] : prev.t1Players, 
      t2Players: clearNames ? [] : prev.t2Players, 
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
    
    setMatchupSettings({});
    setSelectedMatchIndex(null);
    setMatchModeBreakSide('none');
    
    // Reset scores and names in current view if active
    if (activeSetupTab === 'match') {
      setPlayer1(prev => ({ ...prev, name: clearNames ? '' : prev.name, score: 0 }));
      setPlayer2(prev => ({ ...prev, name: clearNames ? '' : prev.name, score: 0 }));
      setCurrentMatchFrameDetails([]);
      setMatchStartTime(null);
    }

    // 2. Clear history entries specifically for match mode
    setMatchHistory(prev => prev.filter(m => m.mode !== 'match'));
  };

  const clearGroupData = (clearNames = false) => {
    // 1. Clear Group Specific State
    if (clearNames) {
      setTeam1Players([]);
      setTeam2Players([]);
    }

    setGroupSetup(prev => ({ 
      ...prev,
      t1Players: clearNames ? [] : prev.t1Players, 
      t2Players: clearNames ? [] : prev.t2Players, 
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
    }

    // 2. Clear history entries specifically for group mode
    setMatchHistory(prev => prev.filter(m => m.mode !== 'group'));
  };

  const clearTeams = () => {
    if (activeSetupTab === 'singles') {
      clearSinglesData(true);
    } else if (activeSetupTab === 'match') {
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
    } else if (activeSetupTab === 'singles' && !isSwitchingTab) {
      setSinglesSetup(prev => ({
        ...prev,
        p1Name: t1Players[0] || '',
        p2Name: t2Players[0] || '',
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
    } else if (activeSetupTab === 'singles') {
      setSinglesSetup(prev => ({ 
        ...prev,
        p1Name: player1.name,
        p2Name: player2.name,
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

    if (newTab === 'singles') {
      if (activeSetupTab === 'singles') {
        nextT1Players = [player1.name];
        nextT2Players = [player2.name];
        nextP1Name = player1.name;
        nextP2Name = player2.name;
      } else {
        nextHistory = singlesSetup.history;
        nextFrameDetails = singlesSetup.frameDetails;
        nextStartTime = singlesSetup.matchStartTime;
        nextScore1 = singlesSetup.score1;
        nextScore2 = singlesSetup.score2;
        nextBreakPlayer = singlesSetup.currentBreakPlayerId;
        nextBreakBalls = singlesSetup.breakBalls;
        const sanitP1 = (singlesSetup.p1Name || '').toUpperCase().includes('PLAYER ') ? '' : (singlesSetup.p1Name || '');
        const sanitP2 = (singlesSetup.p2Name || '').toUpperCase().includes('PLAYER ') ? '' : (singlesSetup.p2Name || '');
        
        if (sanitP1 && sanitP2) {
          nextT1Players = [sanitP1];
          nextT2Players = [sanitP2];
          nextIdx = 0;
        } else {
          nextT1Players = [];
          nextT2Players = [];
          nextIdx = null;
        }
        nextP1Name = sanitP1;
        nextP2Name = sanitP2;
      }
      nextT1Name = '';
      nextT2Name = '';
    } else if (newTab === 'match') {
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
    const requiredCount = isDoubles ? 2 : 1;
    if (selection1.length !== requiredCount || selection2.length !== requiredCount) return;
    
    const name1 = isDoubles ? `${selection1[0]} / ${selection1[1]}` : selection1[0];
    const name2 = isDoubles ? `${selection2[0]} / ${selection2[1]}` : selection2[0];

    const newPlayers1 = [...team1Players, name1];
    const newPlayers2 = [...team2Players, name2];
    const newIndex = newPlayers1.length - 1;

    setMatchupSettings(prev => ({
      ...prev,
      [newIndex]: {
        ...prev[newIndex],
        isDoubles: isDoubles,
        player1: { ...SLOT1_DEFAULTS },
        player2: { ...SLOT2_DEFAULTS }
      }
    }));
    
    updateTeamData(team1Name, newPlayers1, team2Name, newPlayers2);
    setShowDoublesPicker({ ...showDoublesPicker, isOpen: false });
  };

  const updateReferee = (idx: number, player: string, team: '1' | '2') => {
    setMatchupSettings(prev => {
      return {
        ...prev,
        [idx]: {
          ...(prev[idx] || {
            player1: { ...SLOT1_DEFAULTS },
            player2: { ...SLOT2_DEFAULTS }
          }),
          referee: { name: player, team }
        }
      };
    });
    setShowRefereePicker({ isOpen: false, matchIndex: null, side: '1' });
  };

  // --- Rendering Helpers ---
  const renderSetupTabs = () => (
    <div className="flex items-center justify-center w-[95vw] mx-auto gap-3 mb-10">
      {(['singles', 'group', 'match'] as SetupTab[]).map(tab => (
        <button
          key={tab}
          onClick={() => handleTabSwitch(tab)}
          className={`flex-1 py-3 sm:py-4 rounded-xl font-black uppercase tracking-[0.2em] transition-all text-[0.75rem] sm:text-sm border-2 relative overflow-hidden group shadow-lg ${
            activeSetupTab === tab 
              ? 'text-slate-950 scale-105 z-10 border-transparent shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
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

    // Combine roster and current players for each side to ensure we have a full pool
    // Side 1 Pool
    const side1Pool = [...team1Roster, ...team1Players]
      .filter(p => p && p.trim() !== "")
      .filter((v, i, a) => a.indexOf(v) === i);
    
    // Side 2 Pool
    const side2Pool = [...team2Roster, ...team2Players]
      .filter(p => p && p.trim() !== "")
      .filter((v, i, a) => a.indexOf(v) === i);

    // Determine which pool to show based on the side button clicked
    const primaryPool = side === '1' ? side1Pool : side2Pool;
    
    const players = primaryPool
      .flatMap(p => p.includes(' / ') ? p.split(' / ') : [p])
      .filter((v, i, a) => a.indexOf(v) === i)
      .filter(Boolean)
      .filter(p => !participantNames.includes(p));

    const teamColor = side === '1' ? player1.color : player2.color;
    
    return (
      <div key="referee-picker-overlay" className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="w-full h-[100dvh] sm:max-w-md sm:h-[100dvh] bg-slate-900 border-x-0 sm:border-x-2 border-white/10 shadow-2xl relative flex flex-col pt-12 sm:pt-8"
          style={{ borderTop: `4px solid ${teamColor}` }}
        >
          <div className="px-6 sm:px-8 flex items-center justify-between shrink-0 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10">
                <Glasses className="w-6 h-6" style={{ color: teamColor }} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-none">Select Referee</h3>
                <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 mt-1" style={{ color: teamColor }}>
                  {side === '1' ? (team1Name || 'HOME TEAM') : (team2Name || 'AWAY TEAM')}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setShowRefereePicker({ ...showRefereePicker, isOpen: false })} 
              className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-white/40 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 sm:px-8 space-y-3 min-h-0">
            {players.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto opacity-20">
                  <Glasses className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-slate-500 italic font-bold uppercase tracking-widest text-xs">No available players found</p>
                  <p className="text-slate-700 text-[10px] font-bold uppercase tracking-tighter max-w-[200px] mx-auto">Add names to the {side === '1' ? 'Home' : 'Away'} roster first</p>
                </div>
              </div>
            ) : (
              players.map((name) => {
                const isSelected = matchupSettings[matchIndex!]?.referee?.name === name && 
                                  matchupSettings[matchIndex!]?.referee?.team === side;
                
                return (
                  <button
                    key={`ref-${name}`}
                    onClick={() => updateReferee(matchIndex!, name, side)}
                    className={`w-full p-5 rounded-2xl flex items-center justify-between text-left transition-all border-2 group ${
                      isSelected 
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                        : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate font-black uppercase tracking-[0.1em] text-sm">{name}</span>
                    <div className={`p-2 rounded-lg transition-colors ${isSelected ? 'bg-emerald-500 text-slate-900' : 'bg-white/5 group-hover:bg-white/10 text-transparent group-hover:text-white/20'}`}>
                      <Check className="w-4 h-4 shrink-0" strokeWidth={3} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="px-6 sm:px-8 py-8 border-t border-white/5 shrink-0 bg-slate-900 shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
             <button
               onClick={() => {
                 setMatchupSettings(prev => {
                   const next = { ...prev };
                   if (next[matchIndex!]) {
                     const { referee, ...rest } = next[matchIndex!];
                     next[matchIndex!] = rest;
                   }
                   return next;
                 });
                 setShowRefereePicker({ ...showRefereePicker, isOpen: false });
               }}
               className="w-full py-4 text-xs font-black uppercase tracking-[0.4em] text-slate-600 hover:text-red-500 transition-colors"
             >
               Clear Selection
             </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const renderDoublesPicker = () => {
    const { mode } = showDoublesPicker;
    const players1 = team1Roster.filter(p => p && !p.includes('/')).filter((v, i, a) => a.indexOf(v) === i);
    const players2 = team2Roster.filter(p => p && !p.includes('/')).filter((v, i, a) => a.indexOf(v) === i);
    const requiredCount = mode === 'doubles' ? 2 : 1;
    const canConfirm = selection1.length === requiredCount && selection2.length === requiredCount;

    return (
      <div key="doubles-picker-overlay" className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 bg-black/90 backdrop-blur-md">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-4xl bg-slate-900 border-t-2 lg:border-2 border-slate-800 rounded-t-[2.5rem] lg:rounded-[3rem] px-5 pt-6 pb-0 lg:p-10 space-y-4 lg:space-y-8 shadow-2xl h-[100dvh] lg:h-[92vh] flex flex-col relative z-[9999]"
        >
          <div className="flex items-center justify-between shrink-0">
            <div className="flex flex-col">
              <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
                {mode === 'doubles' ? 'Doubles Matchup' : 'Singles Matchup'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Select both sides to create matchup</p>
            </div>
            <button onClick={() => setShowDoublesPicker({ ...showDoublesPicker, isOpen: false, mode: 'doubles' })} className="p-2 text-slate-400 hover:text-white transition-colors">
              <X className="w-8 h-8 sm:w-10 sm:h-10" />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden min-h-0 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-6 sm:gap-10 h-full min-h-0">
              {/* Team 1 Side */}
              <div className="flex flex-col gap-3 min-h-0">
                <div className="flex items-center justify-between px-3">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest truncate" style={{ color: player1.color }}>{team1Name || 'TEAM 1'}</span>
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{selection1.length}/{requiredCount}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {players1.length === 0 && <p className="text-center text-slate-600 italic text-xs py-10">Empty Roster</p>}
                  {players1.map((name) => (
                    <button
                      key={`sel1-${name}`}
                      onClick={() => {
                        if (mode === 'singles') {
                          setSelection1([name]);
                        } else {
                          if (selection1.includes(name)) {
                            setSelection1(selection1.filter(n => n !== name));
                          } else if (selection1.length < 2) {
                            setSelection1([...selection1, name]);
                          }
                        }
                      }}
                      className={`w-full p-3 sm:p-4 rounded-2xl font-bold uppercase transition-all flex items-center justify-between gap-2 border-2 text-left ${
                        selection1.includes(name) 
                          ? 'bg-white/10' 
                          : 'bg-white/5 border-transparent'
                      }`}
                      style={{ borderColor: selection1.includes(name) ? player1.color : 'transparent' }}
                    >
                      <span className={`truncate text-xs sm:text-base tracking-tight ${selection1.includes(name) ? 'text-white' : 'text-slate-400'}`}>{name}</span>
                      {selection1.includes(name) && <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: player1.color }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team 2 Side */}
              <div className="flex flex-col gap-3 min-h-0 border-l border-white/5 pl-6 sm:pl-10">
                <div className="flex items-center justify-between px-3">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest truncate" style={{ color: player2.color }}>{team2Name || 'TEAM 2'}</span>
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{selection2.length}/{requiredCount}</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {players2.length === 0 && <p className="text-center text-slate-600 italic text-xs py-10">Empty Roster</p>}
                  {players2.map((name) => (
                    <button
                      key={`sel2-${name}`}
                      onClick={() => {
                        if (mode === 'singles') {
                          setSelection2([name]);
                        } else {
                          if (selection2.includes(name)) {
                            setSelection2(selection2.filter(n => n !== name));
                          } else if (selection2.length < 2) {
                            setSelection2([...selection2, name]);
                          }
                        }
                      }}
                      className={`w-full p-3 sm:p-4 rounded-2xl font-bold uppercase transition-all flex items-center justify-between gap-2 border-2 text-left ${
                        selection2.includes(name) 
                          ? 'bg-white/10' 
                          : 'bg-white/5 border-transparent'
                      }`}
                      style={{ borderColor: selection2.includes(name) ? player2.color : 'transparent' }}
                    >
                      <span className={`truncate text-xs sm:text-base tracking-tight ${selection2.includes(name) ? 'text-white' : 'text-slate-400'}`}>{name}</span>
                      {selection2.includes(name) && <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: player2.color }} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4 pb-8 lg:pb-0 border-t border-white/5 shrink-0">
            <button 
              disabled={!canConfirm}
              onClick={() => confirmMatchup()}
              className={`w-full py-4 sm:py-5 rounded-2xl font-black uppercase tracking-widest transition-all text-sm sm:text-lg ${
                canConfirm 
                  ? 'opacity-100 scale-102 shadow-2xl active:scale-95' 
                  : 'opacity-50 cursor-not-allowed grayscale'
              }`}
              style={{ 
                backgroundColor: canConfirm ? 'white' : '#334155', 
                color: '#000' 
              }}
            >
              Create Matchup
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

  const generateCSV = () => {
    let csvContent = "SECTION: TEAM SETUP\n";
    csvContent += "Team,Player Name,Highlight Color,BG Color,Screen Color,BG Style,Screen Style\n";
    
    team1Players.forEach(p => {
      const pref = getPlayerPref(p, 'p1');
      csvContent += `"${team1Name}","${p}","${pref?.color || '#33FF33'}","${pref?.bgColor || '#800080'}","${pref?.screenColor || '#000000'}","${pref?.bgStyle || 'balls'}","${pref?.screenStyle || 'default'}"\n`;
    });
    team2Players.forEach(p => {
      const pref = getPlayerPref(p, 'p2');
      csvContent += `"${team2Name}","${p}","${pref?.color || '#001CFF'}","${pref?.bgColor || '#111111'}","${pref?.screenColor || '#000000'}","${pref?.bgStyle || 'balls'}","${pref?.screenStyle || 'default'}"\n`;
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
    csvContent += `Player 1 BG Color,"${player1.bgColor}"\n`;
    csvContent += `Player 1 Screen Color,"${player1.screenColor}"\n`;
    csvContent += `Player 1 BG Style,"${player1.bgStyle}"\n`;
    csvContent += `Player 1 Screen Style,"${player1.screenStyle}"\n`;
    csvContent += `Player 2 Highlight Color,"${player2.color}"\n`;
    csvContent += `Player 2 BG Color,"${player2.bgColor}"\n`;
    csvContent += `Player 2 Screen Color,"${player2.screenColor}"\n`;
    csvContent += `Player 2 BG Style,"${player2.bgStyle}"\n`;
    csvContent += `Player 2 Screen Style,"${player2.screenStyle}"\n`;
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
    csvContent += "Player Name,Highlight Color,BG Color,Screen Color,BG Style,Screen Style\n";
    // Include current active player names if they have colors
    csvContent += `"Player 1","${player1.color}","${player1.bgColor}","${player1.screenColor}","${player1.bgStyle}","${player1.screenStyle}"\n`;
    csvContent += `"Player 2","${player2.color}","${player2.bgColor}","${player2.screenColor}","${player2.bgStyle}","${player2.screenStyle}"\n`;
    
    Object.entries(playerPreferences).forEach(([name, pref]: [string, any]) => {
      csvContent += `"${name}","${pref.color}","${pref.bgColor || '#000000'}","${pref.screenColor || '#000000'}","${pref.bgStyle || 'default'}","${pref.screenStyle || 'default'}"\n`;
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
        acc[name] = pref;
        return acc;
      }, {} as Record<string, any>),
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
                    // Keep existing pref properties if they exist
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

  if (deviceInfo.isPortrait) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden">
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
            referrerPolicy="no-referrer"
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
              className="font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r"
              style={{ 
                fontSize: '6.5vh',
                lineHeight: 1,
                backgroundImage: `linear-gradient(to right, ${player1.color}, ${player2.color})`,
                fontFamily: 'Inter, sans-serif'
              }}
            >
              Pool-Pro.uk
            </h1>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/20 backdrop-blur-[2px]">
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
                referrerPolicy="no-referrer"
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
              {(p.screenStyle === 'cloth' || p.screenStyle === 'speed') && (CLOTH_COLORS.some(c => c.value.toLowerCase() === p.screenColor.toLowerCase()) || SPEED_CLOTH_COLORS.some(c => c.value.toLowerCase() === p.screenColor.toLowerCase())) && (
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                  <div 
                    className={`border-[1.5vw] border-[#3d2b1f] shadow-[inset_0_0_6vh_rgba(0,0,0,0.25)] ${idx === 0 ? 'border-r-0 ml-auto' : 'border-l-0 mr-auto'}`} 
                    style={{ 
                      backgroundColor: p.screenColor,
                      width: '100%',
                      height: '100%',
                      aspectRatio: '1/1',
                      maxHeight: '100%',
                      maxWidth: '100%'
                    }}
                  >
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: p.screenStyle === 'speed' ? 'radial-gradient(#000 0.03rem, transparent 0.03rem)' : 'radial-gradient(#000 0.06rem, transparent 0.06rem)', backgroundSize: p.screenStyle === 'speed' ? '0.8vw 0.8vw' : '1.5vw 1.5vw' }} />
                    {/* Corner Pockets */}
                    <div className={`absolute top-0 left-0 w-[8vw] h-[8vw] bg-black rounded-br-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    <div className={`absolute top-0 right-0 w-[8vw] h-[8vw] bg-black rounded-bl-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    <div className={`absolute bottom-0 left-0 w-[8vw] h-[8vw] bg-black rounded-tr-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    <div className={`absolute bottom-0 right-0 w-[8vw] h-[8vw] bg-black rounded-tl-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    {/* Side Pockets - Only on outside edges */}
                    {idx === 1 && (
                      <div className={`absolute top-1/2 right-0 -translate-y-1/2 w-[5vw] h-[8vw] bg-black rounded-l-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    )}
                    {idx === 0 && (
                      <div className={`absolute top-1/2 left-0 -translate-y-1/2 w-[5vw] h-[8vw] bg-black rounded-r-2xl shadow-inner ${p.screenStyle === 'speed' ? 'border-2 border-white/10' : ''}`} />
                    )}
                  </div>
                </div>
              )}
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
        <motion.nav 
          initial={false}
          animate={{ 
            y: (view === 'scoreboard' && !isNavVisible && !deviceInfo.isDesktop) 
              ? (deviceInfo.isPhone ? '-15vh' : (deviceInfo.isTablet ? '-8vh' : '-10vh')) 
              : 0,
            opacity: 1
          }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed top-0 left-0 right-0 bg-slate-950/90 backdrop-blur-2xl z-50 flex items-center justify-between pl-[0.5vw] pr-[0.5vw] shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-white/5"
          style={{ 
            height: deviceInfo.isPhone ? '15vh' : (deviceInfo.isTablet ? '8vh' : '10vh')
          }}
        >
          <div className="flex items-center gap-[0.5vw] shrink-0">
          <Trophy 
            className="transition-all duration-500" 
            style={{ 
              stroke: 'url(#cup-gradient)',
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
            <svg 
              height="100%" 
              viewBox="0 0 210 40" 
              preserveAspectRatio="xMinYMid meet"
              className="w-auto overflow-visible"
            >
              <defs>
                <linearGradient id="selected-player-grad-svg" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={isLoaded ? player1.color : '#334155'} />
                  <stop offset="100%" stopColor={isLoaded ? player2.color : '#475569'} />
                </linearGradient>
              </defs>
                <text 
                  x="0" 
                  y="32" 
                  fill="url(#selected-player-grad-svg)" 
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
              className="flex items-center justify-center px-4 bg-black/40 border border-white/10 backdrop-blur-md pointer-events-auto shadow-2xl"
              style={{ 
                height: deviceInfo.isPhone ? '11.05vh' : (deviceInfo.isTablet ? '6.8vh' : '8.5vh'),
                borderRadius: deviceInfo.isPhone ? '2.25vh' : '1.5vh'
              }}
            >
              <span 
                className="font-mono font-black text-white tracking-wider tabular-nums leading-none"
                style={{
                  fontSize: deviceInfo.isPhone ? '7.15vh' : (deviceInfo.isTablet ? '4.4vh' : '5.5vh')
                }}
              >
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-[1vw] shrink-0 ml-auto mr-[0.5vw]">
          <button 
            onClick={toggleFullscreen}
            className="group flex items-center justify-center transition-all duration-300 border border-white/10 bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative"
            style={{
              width: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              height: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              borderRadius: deviceInfo.isPhone ? '2.25vh' : '1.5vh'
            }}
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isFullscreen ? 
              <Minimize 
                className="relative z-10 transition-transform group-hover:scale-110"
                style={{ 
                  stroke: 'url(#cup-gradient)',
                  width: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
                  height: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
                }} 
              /> : 
              <Maximize 
                className="relative z-10 transition-transform group-hover:scale-110"
                style={{ 
                  stroke: 'url(#cup-gradient)',
                  width: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
                  height: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
                }} 
              />
            }
          </button>
          <button 
            onClick={navigateToScoreboard}
            className={`group flex items-center justify-center transition-all duration-300 border ${view === 'scoreboard' ? 'border-white/30' : 'border-white/10'} bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative`}
            style={{
              backgroundColor: view === 'scoreboard' ? `${player1.color}22` : undefined,
              width: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              height: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              borderRadius: deviceInfo.isPhone ? '2.25vh' : '1.5vh'
            }}
          >
            <div className={`absolute inset-0 transition-opacity ${view === 'scoreboard' ? 'opacity-20' : 'opacity-0'} group-hover:opacity-10`} style={{ backgroundColor: player1.color }} />
            <Trophy 
              className="relative z-10 transition-transform group-hover:scale-110"
              style={{ 
                stroke: 'url(#cup-gradient)',
                width: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
                height: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
              }} 
            />
          </button>
          <button 
            onClick={() => navigateToView('teams')}
            className={`group flex items-center justify-center transition-all duration-300 border ${view === 'teams' ? 'border-white/30' : 'border-white/10'} bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative`}
            style={{
              backgroundColor: view === 'teams' ? `${player1.color}22` : undefined,
              width: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              height: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              borderRadius: deviceInfo.isPhone ? '2.25vh' : '1.5vh'
            }}
          >
            <div className={`absolute inset-0 transition-opacity ${view === 'teams' ? 'opacity-20' : 'opacity-0'} group-hover:opacity-10`} style={{ backgroundColor: player1.color }} />
            <Users 
              className="relative z-10 transition-transform group-hover:scale-110"
              style={{ 
                stroke: 'url(#cup-gradient)',
                width: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
                height: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
              }} 
            />
          </button>
          <button 
            onClick={() => navigateToView('settings')}
            className={`group flex items-center justify-center transition-all duration-300 border ${view === 'settings' ? 'border-white/30' : 'border-white/10'} bg-slate-900/50 hover:bg-slate-800 active:scale-95 shadow-lg overflow-hidden relative`}
            style={{
              backgroundColor: view === 'settings' ? `${player2.color}22` : undefined,
              width: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              height: deviceInfo.isPhone ? '12vh' : (deviceInfo.isTablet ? '6.4vh' : '8vh'),
              borderRadius: deviceInfo.isPhone ? '2.25vh' : '1.5vh'
            }}
          >
            <div className={`absolute inset-0 transition-opacity ${view === 'settings' ? 'opacity-20' : 'opacity-0'} group-hover:opacity-10`} style={{ backgroundColor: player2.color }} />
            <Settings 
              className="relative z-10 transition-transform group-hover:scale-110"
              style={{ 
                stroke: 'url(#cup-gradient)',
                width: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh'),
                height: deviceInfo.isPhone ? '7.2vh' : (deviceInfo.isTablet ? '4.8vh' : '6vh')
              }} 
            />
          </button>
        </div>
      </motion.nav>

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
            : (view === 'scoreboard' 
                ? (isNavVisible ? (deviceInfo.isPhone ? '24vh' : (deviceInfo.isTablet ? '8vh' : '10vh')) : 0)
                : 0),
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
                  <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white/10 rounded-[100%] blur-[1px] rotate-[-25deg] pointer-events-none" />
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
                  <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white/10 rounded-[100%] blur-[1px] rotate-[-25deg] pointer-events-none" />
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
                        "0 0 0px rgba(255,255,255,0)",
                        "0 0 20px rgba(255,255,255,0.3)",
                        "0 0 0px rgba(255,255,255,0)"
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
                    <div className="absolute top-[5%] left-[5%] w-[90%] h-[25%] bg-white/10 rounded-full blur-[2px] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                    <span className="leading-none uppercase tracking-widest relative z-10">
                      Finish Match
                    </span>
                  </motion.button>
                </div>

                {/* Score Cards Grid */}
                <div className="relative flex items-center justify-center w-full py-0" style={{ transform: 'translateY(-1vh)' }}>

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
                                src={ball.image} 
                                alt={ball.name} 
                                className="absolute inset-0 w-full h-full object-contain rounded-full"
                                referrerPolicy="no-referrer"
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
                                 width: p.bgStyle === 'balls' ? '12vh' : '15vh',
                                 height: p.bgStyle === 'balls' ? '12vh' : '15vh',
                                 bottom: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '7vh' : '5vh') : '3vh',
                                 background: `radial-gradient(circle at 35% 35%, ${p.color}, ${p.color}dd 40%, ${p.color}aa 100%)`,
                                 right: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '6.5vw' : '7.5vw') : '1.5vh',
                                 border: `0.4vh solid ${p.color}ff`
                               }}
                             >
                               {/* 3D Reflection Gloss */}
                               <div className="absolute top-[5%] left-[15%] w-[40%] h-[20%] bg-white/40 rounded-[100%] blur-[1px] rotate-[-25deg] pointer-events-none" />
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
                                 width: p.bgStyle === 'balls' ? '8vh' : '10vh',
                                 height: p.bgStyle === 'balls' ? '8vh' : '10vh',
                                 bottom: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '9.5vh' : '6.5vh') : '3.5vh',
                                 left: p.bgStyle === 'balls' ? (deviceInfo.isTablet ? '10vw' : '9vw') : '3vh',
                                 borderColor: `${p.color}44`
                               }}
                             >
                               {/* Mini Reflection */}
                               <div className="absolute top-[10%] left-[20%] w-[30%] h-[15%] bg-white/10 rounded-[100%] blur-[1px] rotate-[-25deg] pointer-events-none" />
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
                                fontSize: deviceInfo.isPhone ? '25vh' : (deviceInfo.isTablet ? '28vh' : '35vh'),
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
                                     ? `bg-white/10 border-white/60 border-2 shadow-[0_0_2.5vh_rgba(255,255,255,0.4)] ${shouldFlashBreaker ? 'bg-red-500 border-red-400 border-4 scale-150 shadow-[0_0_5vh_rgba(239,68,68,1)] !opacity-100' : 'animate-pulse'}`
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
                {activeSetupTab === 'singles' ? 'Singles' : activeSetupTab === 'group' ? 'Group' : `Match #${(selectedMatchIndex ?? 0) + 1}`}
              </p>
            </div>
          </motion.div>
        )}

          {isLoaded && view === 'teams' && (
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
                  <h2 className="font-black uppercase tracking-tight text-white" style={{ fontSize: deviceInfo.titleSizes.page }}>Setup</h2>
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

              {activeSetupTab === 'singles' ? (
                <div className="space-y-12">
                  <div className="grid grid-cols-2 gap-4 sm:gap-10">
                    <div className="space-y-4">
                      <label className="font-black uppercase tracking-widest text-center block" style={{ fontSize: labelFontSize, color: player1.color }}>Player 1</label>
                      <div className="relative group">
                        <input 
                          value={singlesSetup.p1Name} 
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setSinglesSetup(prev => {
                              const next = { ...prev, p1Name: val };
                              if (activeSetupTab === 'singles') {
                                if (val && next.p2Name) {
                                  setTeam1Players([val]);
                                  setTeam2Players([next.p2Name]);
                                  setSelectedMatchIndex(0);
                                } else {
                                  setTeam1Players([]);
                                  setTeam2Players([]);
                                  setSelectedMatchIndex(null);
                                }
                                setPlayer1(prevP => ({ ...prevP, name: val }));
                              }
                              return next;
                            });
                          }}
                          onFocus={(e) => handleInputFocus(e, 'p1-singles')}
                          onBlur={() => {
                            setFocusedField(null);
                            const pref = getPlayerPref(singlesSetup.p1Name, 'p1');
                            setPlayer1(prev => ({ ...prev, ...SLOT1_DEFAULTS, ...(pref || {}) }));
                          }}
                          className="w-full bg-black border-2 rounded-[2rem] font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl text-center pr-12 sm:pr-24" 
                          style={{ 
                            ...teamEntryStyle, 
                            borderColor: focusedField === 'p1-singles' ? player1.color : player1.color + '66',
                            fontSize: '8vh'
                          }}
                          placeholder="NAME"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pr-2">
                          <button 
                            onClick={() => {
                              setSinglesSetup(prev => ({ ...prev, p1Name: '' }));
                              setTeam1Players([]);
                              setPlayer1(prev => ({ ...prev, name: '', score: 0 }));
                            }}
                            className="p-1 sm:p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-lg"
                            title="Clear Player"
                          >
                            <Trash2 className="w-5 h-5 sm:w-8 sm:h-8" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="font-black uppercase tracking-widest text-center block" style={{ fontSize: labelFontSize, color: player2.color }}>Player 2</label>
                      <div className="relative group">
                        <input 
                          value={singlesSetup.p2Name} 
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setSinglesSetup(prev => {
                              const next = { ...prev, p2Name: val };
                              if (activeSetupTab === 'singles') {
                                if (next.p1Name && val) {
                                  setTeam1Players([next.p1Name]);
                                  setTeam2Players([val]);
                                  setSelectedMatchIndex(0);
                                } else {
                                  setTeam1Players([]);
                                  setTeam2Players([]);
                                  setSelectedMatchIndex(null);
                                }
                                setPlayer2(prevP => ({ ...prevP, name: val }));
                              }
                              return next;
                            });
                          }}
                          onFocus={(e) => handleInputFocus(e, 'p2-singles')}
                          onBlur={() => {
                            setFocusedField(null);
                            const pref = getPlayerPref(singlesSetup.p2Name, 'p2');
                            setPlayer2(prev => ({ ...prev, ...SLOT2_DEFAULTS, ...(pref || {}) }));
                          }}
                          className="w-full bg-black border-2 rounded-[2rem] font-black text-slate-100 focus:outline-none uppercase transition-all shadow-xl text-center pr-12 sm:pr-24" 
                          style={{ 
                            ...teamEntryStyle, 
                            borderColor: focusedField === 'p2-singles' ? player2.color : player2.color + '66',
                            fontSize: '8vh'
                          }}
                          placeholder="NAME"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pr-2">
                          <button 
                            onClick={() => {
                              setSinglesSetup(prev => ({ ...prev, p2Name: '' }));
                              setTeam2Players([]);
                              setPlayer2(prev => ({ ...prev, name: '', score: 0 }));
                            }}
                            className="p-1 sm:p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-lg"
                            title="Clear Player"
                          >
                            <Trash2 className="w-5 h-5 sm:w-8 sm:h-8" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button 
                      onClick={() => {
                        const p1Name = singlesSetup.p1Name;
                        const p2Name = singlesSetup.p2Name;
                        if (!p1Name || !p2Name) return;
                        
                        const p1Prefs = getPlayerPref(p1Name, 'p1') || SLOT1_DEFAULTS;
                        const p2Prefs = getPlayerPref(p2Name, 'p2') || SLOT2_DEFAULTS;
                        const p1Update = { name: p1Name, score: 0, ...p1Prefs };
                        const p2Update = { name: p2Name, score: 0, ...p2Prefs };
                        setPlayer1(prev => ({ ...prev, ...p1Update }));
                        setPlayer2(prev => ({ ...prev, ...p2Update }));
                        setTeam1Players([p1Name]);
                        setTeam2Players([p2Name]);
                        setSelectedMatchIndex(0);
                        // Initialize matchup settings for singles slot 0
                        setMatchupSettings(prev => ({
                          ...prev,
                          [0]: {
                            score1: 0,
                            score2: 0,
                            player1: p1Update,
                            player2: p2Update,
                            currentBreakPlayerId: 'none'
                          }
                        }));
                        setView('scoreboard');
                      }}
                      className="px-5 py-3 sm:px-12 sm:py-6 rounded-2xl sm:rounded-3xl font-black uppercase tracking-[0.3em] text-xs sm:text-2xl transition-all hover:scale-105 active:scale-95 shadow-2xl"
                      style={{ backgroundColor: player1.color, color: '#000' }}
                    >
                      Start Game
                    </button>
                  </div>
                </div>
              ) : (
                    <div className="grid grid-cols-2 gap-4 sm:gap-10">
                      {/* Team 1 Setup */}
                      <div className="space-y-4 sm:space-y-8">
                        {activeSetupTab !== 'group' && (
                          <div className="space-y-2 sm:space-y-4">
                            <div className="flex items-center justify-between">
                              <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player1.color }}>Home Team Name</label>
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
                        )}
                        <div className="space-y-3 sm:space-y-4">
                          <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player1.color }}>Players</label>
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
                                onBlur={() => {
                                  setFocusedField(null);
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
                        
                        {activeSetupTab === 'match' || activeSetupTab === 'group' ? (
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
                                className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
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
                                className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
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
                        ) : (
                            <button 
                               onClick={() => updateRosterData([...team1Roster, ''], team2Roster)}
                               className="w-full py-4 sm:py-6 border-2 border-dashed rounded-xl sm:rounded-2xl text-slate-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[0.875rem] sm:text-lg font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                              style={{ 
                                borderColor: player1.color + '44', 
                                color: player1.color,
                                backgroundColor: 'rgba(0,0,0,0.2)'
                              }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
                              <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
                              Add
                            </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Team 2 Setup */}
                  <div className="space-y-4 sm:space-y-8">
                    {activeSetupTab !== 'group' && (
                      <div className="space-y-2 sm:space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player2.color }}>Away Team Name</label>
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
                    )}
                    <div className="space-y-3 sm:space-y-4">
                      <label className="font-black uppercase tracking-widest" style={{ fontSize: labelFontSize, color: player2.color }}>Players</label>
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
                                onBlur={() => {
                                  setFocusedField(null);
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

                        {activeSetupTab === 'match' || activeSetupTab === 'group' ? (
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
                                className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                                style={{ 
                                  borderColor: player2.color + '44', 
                                  color: player2.color,
                                  backgroundColor: 'rgba(0,0,0,0.2)'
                                }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none group-hover:animate-shimmer" />
                                Create Singles
                              </button>
                              <button 
                                onClick={() => handleOpenPicker(2, 'doubles')}
                                className="flex-1 py-3 border-2 border-dashed rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
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
                        ) : (
                          <button 
                            onClick={() => updateRosterData(team1Roster, [...team2Roster, ''])}
                            className="w-full py-4 sm:py-6 border-2 border-dashed rounded-xl sm:rounded-2xl text-slate-500 transition-all flex items-center justify-center gap-2 text-[0.875rem] sm:text-lg font-black uppercase tracking-widest relative overflow-hidden group shadow-lg"
                            style={{ 
                              borderColor: player2.color + '44', 
                              color: player2.color,
                              backgroundColor: 'rgba(0,0,0,0.2)'
                            }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none group-hover:animate-shimmer" />
                            <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
                  <div 
                    className="bg-black border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
                  >
                    <div className="w-full flex flex-col scrollbar-hide overflow-x-auto min-w-[300px]">
                      {/* Header Row */}
                      <div className="flex items-center bg-slate-900/80 border-b-2 border-slate-800 font-black">
                        <div className="flex px-[1vw] py-[2vh] text-slate-400 w-[5%] shrink-0 items-center justify-center">
                          <GripVertical className="w-3 h-3 opacity-20" />
                        </div>
                        <div className="hidden sm:flex px-[1vw] py-[2vh] text-[2vw] sm:text-xs lg:text-[0.85rem] uppercase tracking-[0.2em] text-slate-400 w-[6%] shrink-0 items-center">No.</div>
                        {activeSetupTab !== 'singles' && (
                          <div className="flex px-[0.5vw] py-[2vh] text-[2vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-400 justify-center w-[12%] sm:w-[10%] shrink-0 items-center" title="Referee">Ref</div>
                        )}
                        <div 
                          className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-[0.85rem] uppercase tracking-widest flex-1 min-w-0 items-center truncate text-white"
                        >
                          <span>{activeSetupTab === 'group' ? 'SIDE A' : (team1Name || 'TEAM A')}</span>
                        </div>
                        <div className="flex px-[0.5vw] py-[2vh] text-[2.5vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-600 justify-center w-[8%] sm:w-[6%] shrink-0 items-center">VS</div>
                        {activeSetupTab !== 'singles' && (
                          <div className="flex px-[0.5vw] py-[2vh] text-[2vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-400 justify-center w-[12%] sm:w-[10%] shrink-0 items-center" title="Referee">Ref</div>
                        )}
                        <div 
                          className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-[0.85rem] uppercase tracking-widest flex-1 min-w-0 items-center truncate text-white"
                        >
                          <span>{activeSetupTab === 'group' ? 'SIDE B' : (team2Name || 'TEAM B')}</span>
                        </div>
                        <div className="flex px-[1.5vw] py-[2vh] text-[2.5vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-400 w-[18%] sm:w-[12%] shrink-0 items-center">Result</div>
                        <div className="flex px-[1vw] py-[2vh] text-[2.2vw] sm:text-[0.85rem] uppercase tracking-widest text-slate-400 justify-end w-[10%] sm:w-[7%] shrink-0 items-center">Clear</div>
                        <div className="hidden sm:flex px-[1.5vw] py-[2vh] text-[2vw] sm:text-xs lg:text-[0.85rem] uppercase tracking-widest text-slate-400 w-[12%] shrink-0 items-center">TIMERS</div>
                      </div>

                      {/* Body */}
                      <div className="flex flex-col">
                        {Math.max(team1Players.length, team2Players.length) === 0 ? (
                          <div className="px-6 py-12 text-center text-slate-500 italic uppercase tracking-widest font-bold text-[3vw] sm:text-sm">Add players to generate matchups.</div>
                        ) : (
                          <>
                            <DndContext 
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext 
                                items={Array.from({ length: Math.max(team1Players.length, team2Players.length) }).map((_, i) => i)} 
                                strategy={verticalListSortingStrategy}
                              >
                                {Array.from({ length: Math.max(team1Players.length, team2Players.length) }).map((_, idx) => {
                              // In singles mode, only show the active selection
                              if (activeSetupTab === 'singles' && selectedMatchIndex !== null && selectedMatchIndex !== idx) return null;
                              
                              const p1 = team1Players[idx];
                              const p2 = team2Players[idx];
                              
                              const p1Name = p1 || '';
                              const p2Name = p2 || '';
                              const matchup = matchupSettings[idx];
                              const lastMatch = getMatchResult(p1Name, p2Name);
                              
                              let displayScore: { score1: number, score2: number, isLive: boolean, date?: string, winner?: string } | null = null;
                              
                              // Priority 1: Current active match row (uses card scores)
                              if (selectedMatchIndex === idx) {
                                displayScore = { 
                                  score1: player1.score, 
                                  score2: player2.score, 
                                  isLive: true 
                                };
                              } 
                              // Priority 2: Session progress in matchups (includes live sync)
                              else if (matchup && (
                                (matchup.score1 !== undefined && matchup.score1 > 0) || 
                                (matchup.score2 !== undefined && matchup.score2 > 0) || 
                                (matchup.frameDetails && matchup.frameDetails.length > 0) ||
                                (matchup.isLive === false)
                              )) {
                                displayScore = { 
                                  score1: matchup.score1 || 0, 
                                  score2: matchup.score2 || 0, 
                                  isLive: matchup.isLive || false 
                                };
                              } 
                              // Priority 3: Historical data for this pair
                              else if (lastMatch) {
                                if (lastMatch.player1 === p1Name) {
                                  displayScore = { 
                                    score1: lastMatch.score1,
                                    score2: lastMatch.score2,
                                    isLive: false,
                                    date: lastMatch.date,
                                    winner: lastMatch.winner
                                  };
                                } else {
                                  displayScore = { 
                                    score1: lastMatch.score2,
                                    score2: lastMatch.score1,
                                    isLive: false,
                                    date: lastMatch.date,
                                    winner: lastMatch.winner
                                  };
                                }
                              }
                              
                              const matchSessionStart = matchModeBreakSide === 'none' ? '1' : matchModeBreakSide;
                              const rowBreaker = (idx % 2 === 0) ? matchSessionStart : (matchSessionStart === '1' ? '2' : '1');
                              
                                return (
                                  <SortableRow 
                                    key={idx} 
                                    id={idx}
                                    onClick={() => selectTeamMatch(idx)}
                                    className={`group flex items-center cursor-pointer transition-all border-b border-slate-800/30 last:border-0 hover:bg-emerald-500/5 ${selectedMatchIndex === idx ? 'bg-emerald-500/10' : ''}`}
                                  >
                                    <div className="hidden sm:flex px-[1vw] py-[2vh] text-[2vw] sm:text-xs font-black text-slate-600 w-[6%] shrink-0 items-center whitespace-nowrap">#{idx + 1}</div>
                                    {activeSetupTab !== 'singles' && (
                                      <div 
                                        className="flex px-[0.5vw] py-[2vh] justify-center w-[12%] sm:w-[10%] shrink-0 items-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowRefereePicker({ isOpen: true, matchIndex: idx, side: '1' });
                                        }}
                                      >
                                        {matchup?.referee?.team === '1' ? (
                                          <span className="text-[3vw] sm:text-sm font-black text-amber-500 uppercase truncate text-center leading-tight">
                                            {matchup.referee.name}
                                          </span>
                                        ) : (
                                          <div className={`p-1 sm:p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${!matchup?.referee ? 'text-amber-500/30' : 'text-slate-800 hover:text-slate-500'}`}>
                                            <Glasses className={`w-[2.5vw] sm:w-4 h-[2.5vw] sm:h-4 ${!matchup?.referee ? 'animate-pulse' : ''}`} />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors flex-1 min-w-0 items-center overflow-hidden">
                                      {activeSetupTab === 'match' && matchModeBreakSide !== 'none' && rowBreaker === '1' && (
                                        <div className="mr-2 shrink-0">
                                          <div className="w-[1.5vw] sm:w-2 h-[1.5vw] sm:h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" title="Breaker" />
                                        </div>
                                      )}
                                      <div className="flex flex-col">
                                        {p1 && p1.includes('/') ? (
                                          <>
                                            <span className="truncate leading-none text-[2.5vw] sm:text-xs">{p1.split('/')[0].trim()}</span>
                                            <span className="truncate leading-none text-[2.5vw] sm:text-xs mt-1 opacity-80">{p1.split('/')[1].trim()}</span>
                                          </>
                                        ) : (
                                          <span className={`truncate ${selectedMatchIndex === idx ? 'text-emerald-400' : ''}`}>{p1 || <span className="text-slate-700 italic">EMPTY</span>}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex px-[0.5vw] py-[2vh] text-center text-slate-700 font-black text-[2vw] sm:text-[0.625rem] justify-center w-[8%] sm:w-[6%] shrink-0 items-center">VS</div>
                                    {activeSetupTab !== 'singles' && (
                                      <div 
                                        className="flex px-[0.5vw] py-[2vh] justify-center w-[12%] sm:w-[10%] shrink-0 items-center"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowRefereePicker({ isOpen: true, matchIndex: idx, side: '2' });
                                        }}
                                      >
                                        {matchup?.referee?.team === '2' ? (
                                          <span className="text-[3vw] sm:text-sm font-black text-amber-500 uppercase truncate text-center leading-tight">
                                            {matchup.referee.name}
                                          </span>
                                        ) : (
                                          <div className={`p-1 sm:p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${!matchup?.referee ? 'text-amber-500/30' : 'text-slate-800 hover:text-slate-500'}`}>
                                            <Glasses className={`w-[2.5vw] sm:w-4 h-[2.5vw] sm:h-4 ${!matchup?.referee ? 'animate-pulse' : ''}`} />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex px-[1.5vw] py-[2vh] text-[3vw] sm:text-sm text-slate-100 uppercase font-bold group-hover:text-emerald-400 transition-colors flex-1 min-w-0 items-center overflow-hidden">
                                      <div className="flex flex-col">
                                        {p2 && p2.includes('/') ? (
                                          <>
                                            <span className="truncate leading-none text-[2.5vw] sm:text-xs">{p2.split('/')[0].trim()}</span>
                                            <span className="truncate leading-none text-[2.5vw] sm:text-xs mt-1 opacity-80">{p2.split('/')[1].trim()}</span>
                                          </>
                                        ) : (
                                          <span className={`truncate ${selectedMatchIndex === idx ? 'text-emerald-400' : ''}`}>{p2 || <span className="text-slate-700 italic">EMPTY</span>}</span>
                                        )}
                                      </div>
                                      {activeSetupTab === 'match' && matchModeBreakSide !== 'none' && rowBreaker === '2' && (
                                        <div className="ml-2 shrink-0">
                                          <div className="w-[1.5vw] sm:w-2 h-[1.5vw] sm:h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" title="Breaker" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex px-[1.5vw] py-[2vh] w-[18%] sm:w-[12%] shrink-0 items-center">
                                      {displayScore ? (
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 overflow-hidden">
                                          <span className={`text-[2.5vw] sm:text-xs font-bold px-1.5 py-0.5 rounded w-fit whitespace-nowrap transition-all ${
                                            displayScore.isLive 
                                              ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.3)]' 
                                              : displayScore.winner === p1Name 
                                                ? 'bg-emerald-500/20 text-emerald-400' 
                                                : displayScore.winner === p2Name
                                                  ? 'bg-rose-500/20 text-rose-400'
                                                  : 'bg-slate-800 text-slate-400'
                                          }`}>
                                            {displayScore.score1}-{displayScore.score2}
                                            {displayScore.isLive && selectedMatchIndex === idx && (
                                              <span className="ml-1 text-[0.4rem] bg-blue-500/30 text-blue-300 px-1 rounded animate-pulse align-middle">LIVE</span>
                                            )}
                                          </span>
                                          <span className="text-[2vw] sm:text-[0.625rem] text-slate-600 font-bold uppercase whitespace-nowrap truncate">{displayScore.isLive ? 'ACTIVE' : (displayScore.date ? new Date(displayScore.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) : '')}</span>
                                        </div>
                                      ) : (
                                        <span className="text-[2.5vw] sm:text-[0.625rem] text-slate-700 font-bold uppercase tracking-widest whitespace-nowrap">READY</span>
                                      )}
                                    </div>
                                    <div className="flex px-[1vw] py-[2vh] justify-end w-[13%] sm:w-[8%] items-center">
                                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                                          {/* Only show row button in non-match modes */}
                                          {activeSetupTab !== 'match' && (lastMatch || (matchupSettings[idx] && ((matchupSettings[idx].score1 || 0) > 0 || (matchupSettings[idx].score2 || 0) > 0 || (matchupSettings[idx].frameDetails && matchupSettings[idx].frameDetails.length > 0))) || selectedMatchIndex === idx) && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                viewMatchDetails(lastMatch ? lastMatch.id : `live-${idx}`);
                                              }}
                                              className="p-3 sm:p-5 2xl:p-1 flex items-center justify-center text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all active:scale-95 shadow-lg bg-blue-500/5 sm:bg-transparent"
                                              title="View Details"
                                            >
                                              <FileText className="w-5 h-5 sm:w-8 sm:h-8 2xl:w-3 2xl:h-3" />
                                            </button>
                                          )}
                                          
                                          {/* Clear match button */}
                                          {(lastMatch || (matchupSettings[idx] && ((matchupSettings[idx].score1 || 0) > 0 || (matchupSettings[idx].score2 || 0) > 0 || (matchupSettings[idx].frameDetails && matchupSettings[idx].frameDetails.length > 0))) || (selectedMatchIndex === idx)) && (
                                            <button 
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                clearMatchResult(p1Name, p2Name, idx);
                                              }}
                                              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center bg-amber-600 hover:bg-amber-500 text-white rounded-lg border border-white/20 shadow-lg transition-all active:scale-90"
                                              title="Clear Match"
                                            >
                                              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 lg:w-3.5 lg:h-3.5" />
                                            </button>
                                          )}

                                          {/* Delete Matchup Button */}
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteMatchup(idx);
                                            }}
                                            className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center bg-red-700 hover:bg-red-600 text-white rounded-lg border border-white/20 shadow-lg transition-all active:scale-90"
                                            title="Delete Matchup"
                                          >
                                            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-3.5 lg:h-3.5" />
                                          </button>
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex px-[1.5vw] py-[2vh] w-[12%] items-center overflow-hidden">
                                      {lastMatch && (lastMatch.shotClockSetting || lastMatch.matchClockRemaining !== undefined) ? (
                                        <div className="flex flex-col gap-0.5">
                                          {lastMatch.shotClockSetting && <span className="text-[0.625rem] font-bold text-slate-500 whitespace-nowrap">SHOT: {lastMatch.shotClockSetting}S</span>}
                                          {lastMatch.matchClockRemaining !== undefined && <span className="text-[0.625rem] font-bold text-slate-500 whitespace-nowrap">MATCH: {formatTime(lastMatch.matchClockRemaining)}</span>}
                                        </div>
                                      ) : (
                                        <span className="text-[0.625rem] text-slate-600 font-bold uppercase">-</span>
                                      )}
                                    </div>
                                  </SortableRow>
                                );
                            })}
                          </SortableContext>
                        </DndContext>
                            
                            {/* Match Session Details Button - For Match & Singles Mode */}
                            {(activeSetupTab === 'match' || activeSetupTab === 'singles') && (team1Players.length > 0 || team2Players.length > 0) && (
                              <div className="p-4 bg-slate-900/40 border-t border-slate-800 flex flex-wrap justify-center gap-4">
                                <button 
                                  onClick={() => viewMatchDetails('session')}
                                  className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-4 lg:py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-all font-black uppercase tracking-widest text-xs sm:text-sm lg:text-[10px]"
                                >
                                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-3 lg:h-3 transition-transform group-hover:scale-110" />
                                  View Detailed Match Progress
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteAllConfirm(true);
                                  }}
                                  className="flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 lg:px-4 lg:py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white border-2 border-white/30 shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all font-black uppercase tracking-widest text-xs sm:text-sm lg:text-[10px] active:scale-95"
                                >
                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-3 lg:h-3 transition-transform group-hover:scale-110" />
                                  Delete Match Data
                                </button>
                              </div>
                            )}

                            {/* History rows for Singles/Group mode (only show for selected pair) */}
                            {activeSetupTab !== 'match' && selectedMatchIndex !== null && (() => {
                              const p1 = team1Players[selectedMatchIndex];
                              const p2 = team2Players[selectedMatchIndex];
                              if (!p1 && !p2) return null;
                              
                              const p1Name = p1 || '';
                              const p2Name = p2 || '';
                              
                              // Filter history for this pair, excluding the latest one which is already shown above in the slot row
                              const historyForPair = matchHistory.filter(m => (
                                (m.player1 === p1Name && m.player2 === p2Name) || 
                                (m.player1 === p2Name && m.player2 === p1Name)
                              )).slice(1); // Skip the first one as it's the "lastMatch" above
                              
                              if (historyForPair.length === 0) return null;
                              
                              return (
                                <div className="flex flex-col border-t-2 border-slate-800/50">
                                  <div className="px-6 py-2 bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Previous Results for this Pair</div>
                                  {historyForPair.map((m, hidx) => (
                                    <div 
                                      key={m.id} 
                                      className="flex items-center border-b border-slate-800/30 last:border-0 hover:bg-slate-800/50"
                                    >
                                      <div className="hidden sm:flex px-[1vw] py-3 text-xs font-black text-slate-700 w-[8%] items-center opacity-50">HIST</div>
                                      <div className="flex px-[1.5vw] py-3 text-sm text-slate-400 uppercase font-bold w-[27%] sm:w-[22%] items-center overflow-hidden">
                                        <div className="flex flex-col">
                                          {m.player1 && m.player1.includes('/') ? (
                                            <>
                                              <span className="truncate leading-none text-[2.2vw] sm:text-xs">{m.player1.split('/')[0].trim()}</span>
                                              <span className="truncate leading-none text-[2.2vw] sm:text-xs mt-1 opacity-70">{m.player1.split('/')[1].trim()}</span>
                                            </>
                                          ) : (
                                            <span className="truncate">{m.player1}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex px-[0.5vw] py-3 text-center text-slate-800 font-black text-[1.6vw] sm:text-[0.625rem] justify-center w-[12%] sm:w-[8%] items-center">VS</div>
                                      <div className="flex px-[1.5vw] py-3 text-sm text-slate-400 uppercase font-bold w-[27%] sm:w-[22%] items-center overflow-hidden">
                                        <div className="flex flex-col">
                                          {m.player2 && m.player2.includes('/') ? (
                                            <>
                                              <span className="truncate leading-none text-[2.2vw] sm:text-xs">{m.player2.split('/')[0].trim()}</span>
                                              <span className="truncate leading-none text-[2.2vw] sm:text-xs mt-1 opacity-70">{m.player2.split('/')[1].trim()}</span>
                                            </>
                                          ) : (
                                            <span className="truncate">{m.player2}</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex px-[1.5vw] py-3 w-[24%] sm:w-[17%] items-center">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 whitespace-nowrap">
                                            {m.score1}-{m.score2}
                                          </span>
                                          <span className="text-[0.625rem] text-slate-600 font-bold uppercase">{new Date(m.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                                        </div>
                                      </div>
                                      <div className="flex px-[1vw] py-3 justify-end w-[10%] sm:w-[8%] items-center">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            viewMatchDetails(m.id);
                                          }}
                                          className="p-2 sm:p-4 2xl:p-1 flex items-center justify-center text-slate-500 hover:bg-slate-700 rounded-xl transition-all active:scale-95 bg-slate-800/20 sm:bg-transparent"
                                          title="View Details"
                                        >
                                          <FileText className="w-4 h-4 sm:w-7 sm:h-7 2xl:w-2.5 2xl:h-2.5 px-0.5" />
                                        </button>
                                      </div>
                                      <div className="hidden sm:flex px-[1.5vw] py-3 w-[15%] items-center" />
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            {/* Totals Row */}
                            <div className="flex items-center bg-slate-900/80 border-t-2 border-slate-800 font-black">
                              <div className="hidden sm:flex px-[1vw] py-[2vh] text-[1.4vw] sm:text-xs uppercase tracking-[0.2em] text-emerald-500 w-[8%] items-center">Total Score</div>
                              <div className="flex px-[1.5vw] py-[2vh] w-[27%] sm:w-[22%] items-center">
                                <div className="flex flex-col">
                                  <span className="text-xl sm:text-3xl text-emerald-400 tabular-nums leading-none" style={{ 
                                    textShadow: `
                                      0 0.1vh 0 rgba(16,185,129,0.8),
                                      0 0.2vh 0 rgba(0,0,0,0.9),
                                      0 0.4vh 1vh rgba(0,0,0,0.8)
                                    ` 
                                  }}>{teamTotals.t1}</span>
                                  <span className="text-[1.4vw] sm:text-[0.625rem] text-slate-500 uppercase tracking-tighter truncate max-w-full mt-1.5">
                                    {activeSetupTab === 'group' ? 'SIDE A' : (activeSetupTab === 'singles' ? (player1.name || singlesSetup.p1Name || team1Players[0] || 'PLAYER 1') : (team1Name || 'TEAM A'))}
                                  </span>
                                </div>
                              </div>
                              <div className="flex px-[0.5vw] py-[2vh] text-center text-slate-700 font-black text-[1.6vw] sm:text-[0.625rem] justify-center w-[12%] sm:w-[8%] items-center">SUM</div>
                              <div className="flex px-[1.5vw] py-[2vh] w-[27%] sm:w-[22%] items-center">
                                <div className="flex flex-col">
                                  <span className="text-xl sm:text-3xl text-emerald-400 tabular-nums leading-none" style={{ 
                                    textShadow: `
                                      0 0.1vh 0 rgba(16,185,129,0.8),
                                      0 0.2vh 0 rgba(0,0,0,0.9),
                                      0 0.4vh 1vh rgba(0,0,0,0.8)
                                    ` 
                                  }}>{teamTotals.t2}</span>
                                  <span className="text-[1.4vw] sm:text-[0.625rem] text-slate-500 uppercase tracking-tighter truncate max-w-full mt-1.5">
                                    {activeSetupTab === 'group' ? 'SIDE B' : (activeSetupTab === 'singles' ? (player2.name || singlesSetup.p2Name || team2Players[0] || 'PLAYER 2') : (team2Name || 'TEAM B'))}
                                  </span>
                                </div>
                              </div>
                              <div className="flex px-[1.5vw] py-[2vh] w-[24%] sm:w-[17%] items-center justify-end">
                                <div className="flex flex-col items-end">
                                  <span className="text-[1.6vw] sm:text-[0.75rem] text-slate-600 uppercase font-bold whitespace-nowrap">Overall Lead</span>
                                  <span className="text-[1.8vw] sm:text-sm font-black text-slate-100 truncate max-w-full block text-right">
                                    {teamTotals.t1 === teamTotals.t2 ? 'TIED' : 
                                     teamTotals.t1 > teamTotals.t2 ? 
                                       `${activeSetupTab === 'singles' ? (player1.name || singlesSetup.p1Name || team1Players[0] || 'PLAYER 1') : (team1Name || 'TEAM A')} (+${teamTotals.t1 - teamTotals.t2})` : 
                                       `${activeSetupTab === 'singles' ? (player2.name || singlesSetup.p2Name || team2Players[0] || 'PLAYER 2') : (team2Name || 'TEAM B')} (+${teamTotals.t2 - teamTotals.t1})`}
                                  </span>
                                </div>
                              </div>
                              <div className="hidden sm:flex px-[1.5vw] py-[2vh] w-[8%] items-center" />
                              <div className="flex px-[1.5vw] py-[2vh] justify-end w-[10%] sm:w-[15%] items-center">
                                <button 
                                  onClick={() => setShowTeamTotals(true)}
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
                  backdropFilter: 'blur(1vh)'
                }}
              >
                <Trash2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                {activeSetupTab === 'match' ? 'Clear Team Data' : 'Clear Player Data'}
              </button>
            </div>
          </motion.div>
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
                            className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-colors relative active:scale-95`}
                            style={{ backgroundColor: fullScreenBackdrop !== 'none' ? player1.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${fullScreenBackdrop !== 'none' ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
                          </button>
                        </div>
                      </div>

                      {fullScreenBackdrop !== 'none' && (
                        <div className="flex justify-center pt-4 border-t border-white/5">
                            <div className="w-full max-w-[500px] landscape:max-w-[700px] mx-auto">
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
                          style={{ fontSize: deviceInfo.isPhone ? '12px' : playerPrefLabelFontSize }}
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
                              setSinglesSetup(prev => ({...prev, p1Name: val}));
                            } else {
                              setPlayer2(prev => ({...prev, name: val, ...(pref || {})}));
                              setSinglesSetup(prev => ({...prev, p2Name: val}));
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
                            label="Card Style / Border"
                            value={p.bgColor}
                            onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, bgColor: color})) : setPlayer2(prev => ({...prev, bgColor: color}))}
                            colors={p.bgStyle === 'balls' ? POOL_BALLS : BACKGROUND_COLORS}
                            icon={<Layout className="w-4 h-4" />}
                            isOpen={activePicker === `p${idx + 1}-bg`}
                            onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-bg` : null)}
                            themeColor={p.color}
                            pickerStyle={p.bgStyle || 'default'}
                            allowedStyles={['default', 'balls']}
                            onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, bgStyle: style})) : setPlayer2(prev => ({...prev, bgStyle: style}))}
                          />

                          <div className="relative">
                            <ColorPicker
                              label="Screen Background"
                              value={p.screenColor}
                              onChange={(color) => idx === 0 ? setPlayer1(prev => ({...prev, screenColor: color})) : setPlayer2(prev => ({...prev, screenColor: color}))}
                              colors={p.screenStyle === 'cloth' ? CLOTH_COLORS : p.screenStyle === 'speed' ? SPEED_CLOTH_COLORS : BACKGROUND_COLORS}
                              icon={<Maximize className="w-4 h-4" />}
                              isOpen={activePicker === `p${idx + 1}-screen`}
                              onToggle={(isOpen) => setActivePicker(isOpen ? `p${idx + 1}-screen` : null)}
                              themeColor={p.color}
                              pickerStyle={p.screenStyle || 'default'}
                              allowedStyles={['default', 'cloth', 'speed']}
                              onStyleChange={(style) => idx === 0 ? setPlayer1(prev => ({...prev, screenStyle: style})) : setPlayer2(prev => ({...prev, screenStyle: style}))}
                              disabled={false}
                            />
                            {/* Screen Color Indicator Circle - 3rem (w-12 h-12) - Attached to Card Edge */}
                            <div 
                              className={`absolute w-[6vh] h-[6vh] rounded-full shadow-2xl transition-all duration-500 z-20 top-1/2 border-2 ${idx === 0 ? 'left-0' : 'right-0'}`}
                              style={{ 
                                backgroundColor: p.screenColor,
                                borderColor: p.color,
                                transform: `translateY(-50%) ${idx === 0 ? 'translateX(calc(-1 * (var(--card-padding) + 3vh)))' : 'translateX(calc(var(--card-padding) + 3vh))'}`,
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
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 flex items-center gap-2"
                            >
                              <RotateCcw className="w-3 h-3" />
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
                            className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-all active:scale-95 relative`}
                            style={{ backgroundColor: showDeviceTime ? player1.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${showDeviceTime ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
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
                            className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-all active:scale-95 relative`}
                            style={{ backgroundColor: isShotClockEnabled ? player2.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isShotClockEnabled ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
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
                            className={`w-[14vw] sm:w-14 h-[7vw] sm:h-7 rounded-full transition-all active:scale-95 relative`}
                            style={{ backgroundColor: isMatchClockEnabled ? player1.color : '#334155' }}
                          >
                            <div className={`absolute top-[0.5vw] sm:top-[0.25rem] w-[2vw] sm:w-[1.25rem] h-[2vw] sm:h-[1.25rem] bg-white rounded-full transition-all ${isMatchClockEnabled ? 'left-[10vw] sm:left-[2rem]' : 'left-[1vw] sm:left-[0.25rem]'}`} />
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
                            className="absolute bottom-[2vw] right-[2vw] px-[4vw] sm:px-8 py-[2vw] sm:py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl sm:rounded-2xl text-[2.5vw] sm:text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
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
                  player1: activeSetupTab === 'singles' ? (player1.name || singlesSetup.p1Name || team1Players[0] || 'Player 1') : (team1Name || 'Team 1'),
                  player2: activeSetupTab === 'singles' ? (player2.name || singlesSetup.p2Name || team2Players[0] || 'Player 2') : (team2Name || 'Team 2'),
                  team1: team1Name,
                  team2: team2Name,
                  score1: teamTotals.t1,
                  score2: teamTotals.t2,
                  winner: teamTotals.t1 > teamTotals.t2 ? (activeSetupTab === 'singles' ? (player1.name || team1Players[0] || 'Player 1') : (team1Name || 'Team 1')) : (teamTotals.t2 > teamTotals.t1 ? (activeSetupTab === 'singles' ? (player2.name || team2Players[0] || 'Player 2') : (team2Name || 'Team 2')) : 'TIE'),
                  frameDetails: [
                    ...matchHistory
                      .filter(m => {
                        if (m.isSession || m.id === 'session') return false; // Prevent recursion
                        
                        if (activeSetupTab === 'singles') {
                          // In singles, current names determine the session
                          const p1 = (player1.name || singlesSetup.p1Name || '').trim().toLowerCase();
                          const p2 = (player2.name || singlesSetup.p2Name || '').trim().toLowerCase();
                          const mP1 = (m.player1 || '').trim().toLowerCase();
                          const mP2 = (m.player2 || '').trim().toLowerCase();
                          
                          const isSinglesEntry = m.mode === 'singles' || (!m.mode && !m.isDoubles && !m.team1);
                          if (!isSinglesEntry) return false;

                          if (p1 && p2 && !p1.includes('player') && !p2.includes('player')) {
                            return (mP1 === p1 && mP2 === p2) || (mP1 === p2 && mP2 === p1);
                          }
                          return true; // Sum all if no names specified
                        }
                        
                        // For Match/Group, filter by team names if set, otherwise try to match any team-based entry
                        const t1 = (team1Name || '').trim().toLowerCase();
                        const t2 = (team2Name || '').trim().toLowerCase();
                        const mT1 = (m.team1 || '').trim().toLowerCase();
                        const mT2 = (m.team2 || '').trim().toLowerCase();

                        if (t1 && t2) {
                          return (mT1 === t1 && mT2 === t2) || (mT1 === t2 && mT2 === t1);
                        }
                        
                        // Fallback: exclude singles matches
                        return m.mode !== 'singles';
                      })
                      .reverse()
                      .flatMap(m => m.frameDetails || []),
                    // Include any frames stored in non-active matchups (Match/Group Mode)
                    ...(Object.entries(matchupSettings)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .flatMap(([_, settings]) => (settings as MatchupSettings).frameDetails || [])
                      .filter(f => !currentMatchFrameDetails.some(cf => cf.timestamp === f.timestamp))), // Prevent duplicates if already in current
                    ...currentMatchFrameDetails
                  ].map((f, idx) => ({ ...f, frameNumber: idx + 1 })),
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
                    winner: (isCurrentActive ? (player1.score > player2.score ? player1.name : player2.name) : (settings ? ((settings.score1 || 0) > (settings.score2 || 0) ? (liveIdx !== null ? team1Players[liveIdx] : 'Player 1') : (liveIdx !== null ? team2Players[liveIdx] : 'Player 2')) : 'Player 1')) || 'Player 1',
                    shotClockSetting: isCurrentActive ? (isShotClockEnabled ? shotClockDuration : undefined) : (settings?.isShotClockEnabled ? settings.shotClock : undefined),
                    matchClockRemaining: isCurrentActive ? (isMatchClockEnabled ? matchClock : undefined) : undefined,
                    frameDetails: isCurrentActive ? currentMatchFrameDetails : (settings?.frameDetails || []),
                    isLive: true
                  };
                })() : { ...matchHistory.find(m => m.id === viewingMatchDetailsId)!, isLive: false };
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
                       </div>
                       <div className="p-3 sm:p-5 rounded-3xl bg-slate-900/50 border border-slate-800/50 text-right shadow-lg">
                          <div className="flex items-center justify-end gap-2 mb-1">
                            {match.isLive && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                            <p className="text-[1.1vh] sm:text-[1.3vh] uppercase font-black text-slate-500 lg:tracking-widest">{match.isLive ? (isSession ? 'Total Score' : 'Live Score') : 'Outcome / Date'}</p>
                          </div>
                          <p className={`text-base sm:text-2xl font-black tabular-nums ${match.isLive ? 'text-blue-400' : 'text-emerald-400'}`}>{match.score1} - {match.score2}</p>
                          <p className="text-[1.1vh] sm:text-[1.3vh] text-slate-500 font-bold uppercase mt-1.5">{match.isLive ? (isSession ? 'Tournament Active' : 'Currently Playing') : new Date(match.date).toLocaleString('en-GB')}</p>
                       </div>
                    </div>

                    {/* Frame Table */}
                    <div className="overflow-hidden rounded-3xl border border-slate-800/50 shadow-2xl bg-black/40 backdrop-blur-3xl">
                      <div className="w-full flex flex-col scrollbar-hide overflow-x-auto min-w-[400px]">
                        {/* Header Row */}
                        <div className="flex items-center bg-slate-900/80 border-b-2 border-slate-800/50">
                          <div className="flex pl-[2vw] pr-0 sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.2vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[8%] whitespace-nowrap items-center">#</div>
                          <div className="flex px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[22%] items-center">Breaker</div>
                          <div className="flex px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[22%] items-center">Winner</div>
                          <div className="flex px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[12%] justify-center items-center">Score</div>
                          <div className="flex px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[14%] justify-center items-center">Start</div>
                          <div className="flex px-[0.5vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[14%] justify-center items-center whitespace-nowrap">Finish</div>
                          <div className="flex px-[1vw] sm:px-[1.5vw] py-[1.5vh] sm:py-5 text-[2.5vw] sm:text-xs uppercase tracking-widest font-black text-slate-500 w-[8%] justify-end pr-[2vw] items-center">Dur.</div>
                        </div>

                        {/* Body */}
                        <div className="flex flex-col divide-y divide-slate-800/30">
                          {match.frameDetails && match.frameDetails.length > 0 ? match.frameDetails.map((frame, fidx) => (
                            <div key={fidx} className="flex items-center hover:bg-emerald-500/5 transition-colors group">
                              <div className="flex pl-[2vw] pr-0 sm:px-5 py-[2vh] text-[2.2vw] sm:text-sm font-black text-slate-600 group-hover:text-emerald-500 transition-colors whitespace-nowrap w-[8%] items-center">#{frame.frameNumber}</div>
                              <div className="flex px-[1vw] sm:px-5 py-[2vh] w-[22%] items-center overflow-hidden">
                                {frame.breakerName && frame.breakerName.includes('/') ? (
                                  <div className="flex flex-col">
                                    <span className="text-[2vw] sm:text-xs font-bold text-slate-300 uppercase tracking-tight truncate block leading-none">{frame.breakerName.split('/')[0].trim()}</span>
                                    <span className="text-[2vw] sm:text-xs font-bold text-slate-500 uppercase tracking-tight truncate block leading-none mt-1">{frame.breakerName.split('/')[1].trim()}</span>
                                  </div>
                                ) : (
                                  <span className="text-[2.2vw] sm:text-sm font-bold text-slate-300 uppercase tracking-tight truncate block">{frame.breakerName}</span>
                                )}
                              </div>
                              <div className="flex px-[1vw] sm:px-5 py-[2vh] w-[22%] items-center overflow-hidden">
                                <div className="flex items-center gap-[0.5vw] sm:gap-2 truncate">
                                  <div className="w-[0.8vw] sm:w-1.5 h-[0.8vw] sm:h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                  {frame.winnerName && frame.winnerName.includes('/') ? (
                                    <div className="flex flex-col">
                                      <span className="text-[2vw] sm:text-xs font-black text-emerald-400 uppercase tracking-tight truncate leading-none">{frame.winnerName.split('/')[0].trim()}</span>
                                      <span className="text-[2vw] sm:text-xs font-black text-emerald-600 uppercase tracking-tight truncate leading-none mt-1">{frame.winnerName.split('/')[1].trim()}</span>
                                    </div>
                                  ) : (
                                    <span className="text-[2.2vw] sm:text-sm font-black text-emerald-400 uppercase tracking-tight truncate">{frame.winnerName}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex px-[0.5vw] sm:px-5 py-[2vh] font-mono text-[2.2vw] sm:text-base text-slate-500 font-bold tabular-nums whitespace-nowrap justify-center w-[12%] items-center">
                                {frame.score1}<span className="text-slate-700 mx-[0.2vw] sm:mx-1">-</span>{frame.score2}
                              </div>
                              <div className="flex px-[0.5vw] sm:px-5 py-[2vh] justify-center w-[14%] items-center">
                                <span className="text-[1.8vw] sm:text-xs font-black text-slate-500 tabular-nums whitespace-nowrap">
                                  {frame.startTime ? new Date(frame.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : (frame.duration ? new Date(new Date(frame.timestamp).getTime() - (frame.duration * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-')}
                                </span>
                              </div>
                              <div className="flex px-[0.5vw] sm:px-5 py-[2vh] justify-center w-[14%] items-center">
                                <span className="text-[1.8vw] sm:text-xs font-black text-slate-400 tabular-nums whitespace-nowrap">
                                  {new Date(frame.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex px-[1vw] sm:px-5 py-[2vh] justify-end w-[8%] pr-[2vw] items-center">
                                {frame.duration !== undefined && (
                                  <div className="flex items-center justify-end gap-[0.5vw] sm:gap-1 mt-0.5">
                                    <Clock className="w-[2vw] sm:w-2.5 h-[2vw] sm:h-2.5 text-slate-700 font-bold" />
                                    <span className="text-[2vw] sm:text-xs font-black text-slate-500 uppercase tabular-nums whitespace-nowrap">
                                      {Math.floor(frame.duration / 60)}m {frame.duration % 60}s
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
                              <span style={{ color: player1.color }}>{match.score1}</span>
                              <span className="text-slate-700 mx-[1vw] sm:mx-3">-</span>
                              <span style={{ color: player2.color }}>{match.score2}</span>
                            </div>

                            <div className="flex flex-col items-end ml-auto">
                              <span className="text-[1.8vw] sm:text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Total Duration</span>
                              <span className="text-[2.5vw] sm:text-lg font-black text-white tabular-nums">
                                {(() => {
                                  const totalSec = match.frameDetails.reduce((acc, f) => acc + (f.duration || 0), 0);
                                  return `${Math.floor(totalSec / 60)}m ${totalSec % 60}s`;
                                })()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

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
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.98] ${exportMethod === method.id ? 'bg-emerald-500/10 border-emerald-500' : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'}`}
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
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-black border-2 border-red-500/50 p-6 sm:p-10 rounded-[2.5rem] max-w-lg w-full space-y-6 sm:space-y-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.2)]"
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
                    className="h-14 sm:h-16 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_4px_15px_rgba(220,38,38,0.4)]"
                  >
                    Reset All
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
                  <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter text-white">Totals</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[0.625rem] sm:text-xs">
                    Current Session Tally
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-8 items-center border-t border-b border-white/10 py-6 sm:py-8">
                  <div className="space-y-2 sm:space-y-4">
                    <p className="text-sm sm:text-xl font-black uppercase tracking-tight truncate px-1" style={{ color: player1.color }}>{activeSetupTab === 'group' ? 'SIDE A' : (activeSetupTab === 'singles' ? (player1.name || singlesSetup.p1Name || team1Players[0] || 'PLAYER 1') : (team1Name || 'TEAM 1'))}</p>
                    <p className="text-4xl sm:text-8xl font-black text-white tabular-nums">
                      {teamTotals.t1}
                    </p>
                  </div>
                  <div className="space-y-2 sm:space-y-4">
                    <p className="text-sm sm:text-xl font-black uppercase tracking-tight truncate px-1" style={{ color: player2.color }}>{activeSetupTab === 'group' ? 'SIDE B' : (activeSetupTab === 'singles' ? (player2.name || singlesSetup.p2Name || team2Players[0] || 'PLAYER 2') : (team2Name || 'TEAM 2'))}</p>
                    <p className="text-4xl sm:text-8xl font-black text-white tabular-nums">
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
