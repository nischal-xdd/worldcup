import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Trophy, 
  MapPin, 
  Flag, 
  Tv, 
  Radio, 
  Settings, 
  Volume2, 
  TrendingUp, 
  Users, 
  Play, 
  StopCircle, 
  ShieldAlert, 
  Activity, 
  ChevronRight, 
  Loader2, 
  Share2, 
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  GroupStanding, 
  Match, 
  Team, 
  Stadium,
  fallbackTeams,
  fallbackGroups,
  fallbackMatches,
  fallbackStadiums
} from './fallbackData';

export default function App() {
  // Navigation & Route states
  const [currentTab, setCurrentTab] = useState<'matches' | 'standings' | 'teams' | 'stadiums' | 'stream'>('matches');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);

  // Core API Datasets
  const [matches, setMatches] = useState<Match[]>(fallbackMatches);
  const [groups, setGroups] = useState<GroupStanding[]>(fallbackGroups);
  const [teams, setTeams] = useState<Team[]>(fallbackTeams);
  const [stadiums, setStadiums] = useState<Stadium[]>(fallbackStadiums);
  const [loading, setLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  // Live Stream Client States
  const [streamActive, setStreamActive] = useState(false);
  const [streamFrame, setStreamFrame] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);
  
  // Real-time filters and search queries
  const [teamSearch, setTeamSearch] = useState('');
  const [stadiumSearch, setStadiumSearch] = useState('');
  const [matchStatusFilter, setMatchStatusFilter] = useState<'All' | 'Live' | 'Scheduled' | 'Completed'>('All');

  // Admin Screen Share Capture Ref & Settings
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [adminStatusText, setAdminStatusText] = useState('Ready to stream');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'Screen' | 'Simulation' | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [compressionQuality, setCompressionQuality] = useState<number>(0.6); // 0.1 to 1.0
  const [fps, setFps] = useState<number>(5); // frames per second to upload
  const [uploadedFramesCount, setUploadedFramesCount] = useState(0);

  // Secure Admin Authentication state variables
  const [isAdminAuthRoute, setIsAdminAuthRoute] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem('admin_login') === 'true');
  const [adminUser, setAdminUser] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Detect Route on Initial Mount & Listen for updates
  useEffect(() => {
    const checkRoute = () => {
      const isAuthRoute = 
        window.location.pathname === '/admin-auth' || 
        window.location.hash === '#admin-auth' || 
        window.location.hash === '#/admin-auth';
      
      setIsAdminAuthRoute(isAuthRoute);
      
      const loggedIn = sessionStorage.getItem('admin_login') === 'true';
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const isPathAdmin = 
          isAuthRoute ||
          window.location.pathname === '/admin' || 
          window.location.hash === '#admin' || 
          window.location.hash === '#/admin' ||
          window.location.search.includes('admin=true');
        setIsAdmin(isPathAdmin);
        if (isPathAdmin) {
          setCurrentTab('stream');
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkRoute();
    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  // Elegantly transition splash screen
  useEffect(() => {
    const timer = setInterval(() => {
      setSplashProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setShowSplash(false), 800);
          return 100;
        }
        return prev + 4;
      });
    }, 80);
    return () => clearInterval(timer);
  }, []);

  // Fetch API Datasets
  async function fetchAllData() {
    setLoading(true);
    setErrorInfo(null);
    try {
      // Parallel HTTP calls to custom proxies
      const [gamesRes, groupsRes, teamsRes, stadiumsRes] = await Promise.all([
        fetch('/api/worldcup/games').then(r => r.ok ? r.json() : Promise.reject('Games failed')),
        fetch('/api/worldcup/groups').then(r => r.ok ? r.json() : Promise.reject('Groups failed')),
        fetch('/api/worldcup/teams').then(r => r.ok ? r.json() : Promise.reject('Teams failed')),
        fetch('/api/worldcup/stadiums').then(r => r.ok ? r.json() : Promise.reject('Stadiums failed'))
      ]);

      setMatches(Array.isArray(gamesRes) ? gamesRes : fallbackMatches);
      setGroups(Array.isArray(groupsRes) ? groupsRes : fallbackGroups);
      setTeams(Array.isArray(teamsRes) ? teamsRes : fallbackTeams);
      setStadiums(Array.isArray(stadiumsRes) ? stadiumsRes : fallbackStadiums);
    } catch (err: any) {
      console.error('Fetch error:', err);
      setErrorInfo('Unable to reach high-speed API servers. Active fallbacks running natively.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  // Establish SSE Realtime Connection for Live Stream frames
  useEffect(() => {
    console.log('[SSE] Connecting to live broadcast channel...');
    const eventSource = new EventSource('/api/stream/events');

    eventSource.onopen = () => {
      setSseConnected(true);
      console.log('[SSE] Connected to World Cup stream.');
    };

    eventSource.addEventListener('state', (e: any) => {
      try {
        const parsed = JSON.parse(e.data);
        setStreamActive(parsed.active);
        if (!parsed.active) {
          setStreamFrame(null);
        }
      } catch (err) {
        console.error('SSE parsed error:', err);
      }
    });

    eventSource.addEventListener('frame', (e: any) => {
      try {
        const parsed = JSON.parse(e.data);
        setStreamFrame(parsed.frame);
        setStreamActive(parsed.active);
      } catch (err) {
        console.error('SSE frame event warning:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.warn('[SSE] Reconnecting or failed connection status.', err);
      setSseConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Fallback Polling if live SSE fluctuates or is interrupted
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      if (!sseConnected) {
        try {
          const res = await fetch('/api/stream/latest');
          if (res.ok) {
            const data = await res.json();
            setStreamActive(data.active);
            if (data.frame) {
              setStreamFrame(data.frame);
            }
          }
        } catch {
          // Silent catch
        }
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [sseConnected]);

  // Handle Screen Broadcast Logic (ADMIN ONLY)
  const startScreenBroadcast = async () => {
    setScreenShareError(null);
    try {
      setAdminStatusText('Requesting Display Capture permissions...');
      
      // Request pure media devices presentation stream API
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1024 },
          height: { ideal: 576 },
          frameRate: { ideal: fps }
        },
        audio: false
      });

      displayStreamRef.current = mediaStream;
      setIsBroadcasting(true);
      setBroadcastType('Screen');

      // Setup invisible video tag playback to render chunks onto Canvas
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      video.play();
      videoRef.current = video;

      // Call API backend to flag that broadcast has started
      await fetch('/api/stream/start', { method: 'POST' });
      setAdminStatusText('Broadcast live. Transmitting device viewport in high definition...');

      // Capturing framework loop
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let isBroadcastingActive = true;
      const captureAndSend = async () => {
        if (!isBroadcastingActive) return;
        const startTime = Date.now();

        if (!video.paused && !video.ended && ctx) {
          // Downscale representation to max-width 850 for high performance fluid streaming & zero lag
          const targetWidth = Math.min(850, video.videoWidth || 640);
          const aspectRatio = (video.videoHeight || 360) / (video.videoWidth || 640);
          const targetHeight = Math.round(targetWidth * aspectRatio);

          if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth;
            canvas.height = targetHeight;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Exporting as compressed image to avoid huge network payload
          const dataUrl = canvas.toDataURL('image/jpeg', compressionQuality);
          
          try {
            await fetch('/api/stream/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame: dataUrl })
            });
            setUploadedFramesCount(prev => prev + 1);
          } catch (e) {
            console.error('Frame upload error:', e);
          }
        }

        // Schedule next upload based on targeted frame-interval minus actual elapsed computation time.
        // This ensures absolutely zero frame pile-up or congestion over HTTP.
        const elapsed = Date.now() - startTime;
        const targetDelay = Math.round(1000 / fps);
        const nextDelay = Math.max(15, targetDelay - elapsed);
        
        if (isBroadcastingActive) {
          intervalRef.current = window.setTimeout(captureAndSend, nextDelay);
        }
      };

      // Listen for manual track cancellation from client-specific overlays (e.g. Chrome's Stop Sharing tooltip)
      mediaStream.getVideoTracks()[0].onended = () => {
        isBroadcastingActive = false;
        stopScreenBroadcast();
      };

      // Trigger the loop
      intervalRef.current = window.setTimeout(captureAndSend, Math.round(1000 / fps));

    } catch (err: any) {
      console.warn('Screen capture blocked or failed.', err);
      const errorMsg = err?.message || String(err);
      setAdminStatusText(`Screen share blocked: ${errorMsg}`);
      setScreenShareError(errorMsg);
      setIsBroadcasting(false);
      setBroadcastType(null);
    }
  };

  // Football Simulation Engine for high-performance visual live-stream fallback
  const startSimulatorBroadcast = async () => {
    setScreenShareError(null);
    try {
      setAdminStatusText('Initializing Soccer Live Gameplay Simulator Engine...');
      setIsBroadcasting(true);
      setBroadcastType('Simulation');

      // Call API backend to flag that broadcast has started
      await fetch('/api/stream/start', { method: 'POST' });
      setAdminStatusText('Broadcast Live! Transmitting simulated high-definition pitch visualizer...');

      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');

      // Simulation engine coordinates & parameters
      let ballX = 400;
      let ballY = 225;
      let ballDX = 5;
      let ballDY = 3.5;
      let p1X = 180;
      let p1Y = 225;
      let p2X = 620;
      let p2Y = 225;
      let simScoreHome = 2;
      let simScoreAway = 1;
      let gameMin = 74;
      let frameNum = 0;
      let logCommentary = "Uplink connected. Match simulation initialized successfully.";

      const commentEvents = [
        "Dangerous cross floated into the penalty area!",
        "Spectacular diving save by the keeper to deny the strike!",
        "Midfield tackle! Play on says the referee.",
        "Yellow card issued for a tactical foul in the center circle.",
        "Corner kick mapped. Swinging ball into the crowded box!",
        "Stunning long-range shot rattles the crossbar!",
        "Goal kick taken quickly, building out from the defense.",
        "Sensational quick passing build-up by Mexico!",
        "VAR Review active... Decision stands - No penalty!",
        "Intense pressing in the final third keeps defenders guessing."
      ];

      let isSimActive = true;
      const captureAndSendSim = async () => {
        if (!isSimActive) return;
        const startTime = Date.now();

        if (!ctx) return;
        frameNum++;

        // 1. Draw detailed turf gradient pitch inside canvas bounds
        const turfGrad = ctx.createLinearGradient(0, 0, 0, 450);
        turfGrad.addColorStop(0, '#115e59'); // dark teal
        turfGrad.addColorStop(1, '#064e3b'); // emerald green
        ctx.fillStyle = turfGrad;
        ctx.fillRect(0, 0, 800, 450);

        // Grid-line turf pattern for high aesthetics
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 18;
        for (let i = 40; i < 800; i += 80) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 450);
          ctx.stroke();
        }

        // Draw Soccer Pitch Layout
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2.5;

        // Pitch borders
        ctx.strokeRect(35, 35, 730, 380);

        // Midfield divider line
        ctx.beginPath();
        ctx.moveTo(400, 35);
        ctx.lineTo(400, 415);
        ctx.stroke();

        // Midfield circle
        ctx.beginPath();
        ctx.arc(400, 225, 50, 0, Math.PI * 2);
        ctx.stroke();

        // Left Penalty area
        ctx.strokeRect(35, 115, 120, 220);
        ctx.strokeRect(35, 170, 40, 110);

        // Right Penalty area
        ctx.strokeRect(645, 115, 120, 220);
        ctx.strokeRect(725, 170, 40, 110);

        // 2. Compute physics for ball & players
        ballX += ballDX;
        ballY += ballDY;

        // Bounce ball on field walls but let it go near goalboxes
        if (ballX <= 45 || ballX >= 755) {
          ballDX = -ballDX;
          // Commentary event update
          logCommentary = commentEvents[Math.floor(Math.random() * commentEvents.length)];
          
          // Goalscoring simulation trigger
          if (Math.random() > 0.88) {
            if (ballY > 170 && ballY < 280) {
              if (ballX > 500) {
                simScoreHome += 1;
                logCommentary = "⚽ GOAL FOR MEXICO!! Absolute thunderbolt into upper corner!";
              } else {
                simScoreAway += 1;
                logCommentary = "⚽ GOAL FOR SOUTH AFRICA!! Cheeky chip over the defense!";
              }
            }
          }
        }
        if (ballY <= 45 || ballY >= 405) {
          ballDY = -ballDY;
        }

        // Keep ball inside coordinates gracefully
        ballX = Math.max(45, Math.min(755, ballX));
        ballY = Math.max(45, Math.min(405, ballY));

        // Let players pursue the ball slowly
        p1X += (ballX - p1X) * 0.05 + (Math.sin(frameNum * 0.12) * 1.5);
        p1Y += (ballY - p1Y) * 0.05 + (Math.cos(frameNum * 0.12) * 1.5);
        p2X += (ballX - p2X) * 0.045 + (Math.cos(frameNum * 0.12 + 0.5) * 1.5);
        p2Y += (ballY - p2Y) * 0.045 + (Math.sin(frameNum * 0.12 + 0.5) * 1.5);

        // Confine player coordinates to half courts
        p1X = Math.max(80, Math.min(385, p1X));
        p1Y = Math.max(50, Math.min(400, p1Y));
        p2X = Math.max(415, Math.min(720, p2X));
        p2Y = Math.max(50, Math.min(400, p2Y));

        // Increment clock simulated minutes
        if (frameNum % 25 === 0) {
          gameMin = Math.min(90, gameMin + 1);
        }

        // Draw goalposts mesh details
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.fillRect(25, 185, 10, 80);
        ctx.fillRect(765, 185, 10, 80);

        // Draw Player MEX (Red Glow)
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(p1X, p1Y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MEX', p1X, p1Y - 16);

        // Draw Player RSA (Blue Glow)
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(p2X, p2Y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RSA', p2X, p2Y - 16);

        // Draw Soccer Ball (White and Black stitches)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Soccer ball pattern details
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(ballX, ballY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw heads up displays overlays
        // Premium transparent glass scoreboard
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(50, 40, 700, 52);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(50, 40, 700, 52);

        // Left Home team text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('MEXICO 🇲🇽', 310, 71);

        // Right Away team text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('🇿🇦 SOUTH AFRICA', 490, 71);

        // Scores and Clock ticker
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${simScoreHome} - ${simScoreAway}`, 400, 73);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${gameMin}:00'`, 400, 53);

        // Sub commentary box
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(50, 355, 700, 36);
        ctx.strokeRect(50, 355, 700, 36);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('FEED TICKER »', 70, 377);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 10.5px sans-serif';
        ctx.fillText(logCommentary, 180, 377);

        // System watermark logo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = 'bold 8.5px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('WORLD CUP LIVE RETRO SIMULATOR', 740, 410);

        const dataUrl = canvas.toDataURL('image/jpeg', compressionQuality);

          try {
            await fetch('/api/stream/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame: dataUrl })
            });
            setUploadedFramesCount(prev => prev + 1);
          } catch (e) {
            console.error('Simulation payload dispatch failure:', e);
          }

          const elapsed = Date.now() - startTime;
          const targetDelay = Math.round(1000 / fps);
          const nextDelay = Math.max(15, targetDelay - elapsed);

          if (isSimActive) {
            intervalRef.current = window.setTimeout(captureAndSendSim, nextDelay);
          }
        };

      // Trigger the loop
      intervalRef.current = window.setTimeout(captureAndSendSim, Math.round(1000 / fps));

    } catch (err: any) {
      console.error('Simulation failed:', err);
      setIsBroadcasting(false);
      setAdminStatusText(`Engine Crash: ${err.message || err}`);
    }
  };

  const stopScreenBroadcast = async () => {
    setAdminStatusText('Teardown stream processes...');
    setIsBroadcasting(false);
    setBroadcastType(null);
    setScreenShareError(null);

    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach(track => track.stop());
      displayStreamRef.current = null;
    }

    try {
      await fetch('/api/stream/stop', { method: 'POST' });
    } catch {
      // Ignored
    }

    setAdminStatusText('Broadcast terminated. System idle.');
  };

  // Safe release on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Filter computation logic
  const filteredMatches = useMemo(() => {
    if (matchStatusFilter === 'All') return matches;
    return matches.filter(m => m.status === matchStatusFilter);
  }, [matches, matchStatusFilter]);

  const filteredTeams = useMemo(() => {
    return teams.filter(t => 
      t.name.toLowerCase().includes(teamSearch.toLowerCase()) || 
      t.code.toLowerCase().includes(teamSearch.toLowerCase()) ||
      t.group.toLowerCase().includes(teamSearch.toLowerCase())
    );
  }, [teams, teamSearch]);

  const filteredStadiums = useMemo(() => {
    return stadiums.filter(s => 
      s.name.toLowerCase().includes(stadiumSearch.toLowerCase()) || 
      s.city.toLowerCase().includes(stadiumSearch.toLowerCase()) || 
      s.country.toLowerCase().includes(stadiumSearch.toLowerCase())
    );
  }, [stadiums, stadiumSearch]);

  // Compute live match metrics or widgets
  const liveCount = useMemo(() => matches.filter(m => m.status === 'Live').length, [matches]);

  // Route Toggle Action
  const navigateToAdmin = (toAdmin: boolean) => {
    if (toAdmin) {
      if (sessionStorage.getItem('admin_login') === 'true') {
        window.location.hash = 'admin';
        setIsAdmin(true);
        setCurrentTab('stream');
      } else {
        // Safe redirect to admin authentication route
        window.location.pathname = '/admin-auth';
      }
    } else {
      window.location.hash = '';
      setIsAdmin(false);
      setCurrentTab('matches');
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans flex flex-col relative overflow-x-hidden antialiased selection:bg-emerald-500 selection:text-slate-900" id="wc-root">
      
      {/* 1. Splash Screen Overlay (Visible state based on showSplash state) */}
      {showSplash && (
        <div 
          className="fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6 transition-all duration-700 ease-out"
          style={{ opacity: 1 }}
          id="wc-splash"
        >
          {/* Decorative glowing backdrops */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full mix-blend-screen animate-pulse pointer-events-none"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-3xl rounded-full mix-blend-screen animate-pulse delay-500 pointer-events-none"></div>

          <div className="relative text-center max-w-3xl px-4 flex flex-col items-center">
            {/* Elegant Trophy SVG icon with glowing effects */}
            <div className="w-24 h-24 mb-10 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-3xl flex items-center justify-center p-5 shadow-2xl relative">
              <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-3xl animate-pulse"></div>
              <Trophy className="w-12 h-12 text-emerald-400 absolute" />
            </div>

            {/* Custom stylized text literal requested by the prompt */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-center leading-none text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-white to-blue-400 drop-shadow-xl font-display">
              FOOTBALL UNITES<br />THE WORLD
            </h1>

            <div className="mt-12 flex flex-col items-center gap-3 w-full max-w-sm">
              <div className="h-1 w-48 bg-slate-800 rounded-full overflow-hidden relative border border-white/5">
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-100"
                  style={{ width: `${splashProgress}%` }}
                ></div>
              </div>
              
              {/* Creator Tag (Mandated by user prompt) */}
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 font-semibold mt-4">
                Created by Nischal Adhikari
              </p>

              <div className="mt-6 flex items-center gap-2">
                <span className="flex h-2, w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-ping"></span>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  Initializing Live World Stream {splashProgress}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outer wrapper framed with polished borders matching Sleek theme */}
      <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto border-x border-white/5 relative z-10 bg-slate-950/80 backdrop-blur-md shadow-2xl">
        
        {/* Header Ribbon */}
        <header className="h-20 border-b border-white/5 px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 bg-slate-950/90 backdrop-blur-lg" id="wc-header">
          <div className="flex items-center gap-8">
            <div 
              className="flex items-center gap-2.5 cursor-pointer select-none" 
              onClick={() => navigateToAdmin(false)}
            >
              <div className="w-9 h-9 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black italic shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                W
              </div>
              <div className="text-lg md:text-xl font-bold tracking-tighter uppercase font-display">
                FIFA <span className="text-emerald-400 font-extrabold text-xs bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded ml-1 tracking-normal font-sans">WC26</span>
              </div>
            </div>
            
            {/* Main Tabs Selection (Includes live badges) */}
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <button 
                onClick={() => { navigateToAdmin(false); setCurrentTab('matches'); }}
                className={`px-4 py-2 rounded-xl transition ${currentTab === 'matches' && !isAdmin ? 'bg-white/10 text-white border border-white/10' : 'hover:bg-white/5 hover:text-slate-300'}`}
              >
                Matches
              </button>
              <button 
                onClick={() => { navigateToAdmin(false); setCurrentTab('standings'); }}
                className={`px-4 py-2 rounded-xl transition ${currentTab === 'standings' && !isAdmin ? 'bg-white/10 text-white border border-white/10' : 'hover:bg-white/5 hover:text-slate-300'}`}
              >
                Groups
              </button>
              <button 
                onClick={() => { navigateToAdmin(false); setCurrentTab('teams'); }}
                className={`px-4 py-2 rounded-xl transition ${currentTab === 'teams' && !isAdmin ? 'bg-white/10 text-white border border-white/10' : 'hover:bg-white/5 hover:text-slate-300'}`}
              >
                Teams
              </button>
              <button 
                onClick={() => { navigateToAdmin(false); setCurrentTab('stadiums'); }}
                className={`px-4 py-2 rounded-xl transition ${currentTab === 'stadiums' && !isAdmin ? 'bg-white/10 text-white border border-white/10' : 'hover:bg-white/5 hover:text-slate-300'}`}
              >
                Stadiums
              </button>
              <button 
                onClick={() => { navigateToAdmin(false); setCurrentTab('stream'); }}
                className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition ${currentTab === 'stream' && !isAdmin ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'hover:bg-white/5 hover:text-emerald-400'}`}
              >
                <Tv className="w-3.5 h-3.5" />
                Live Stream
                {streamActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {/* Fast refresh button */}
            <button 
              onClick={fetchAllData}
              title="Refresh World Cup feeds"
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition border border-white/5 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Quick Status Pill */}
            {liveCount > 0 ? (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                {liveCount} Live Matches
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold rounded uppercase tracking-widest">
                Tournament Mode
              </div>
            )}

            {/* Safe Route path switcher - only visible when authenticated as an administrator */}
            {isLoggedIn && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextIsAdmin = !isAdmin;
                    setIsAdmin(nextIsAdmin);
                    setCurrentTab(nextIsAdmin ? 'stream' : 'matches');
                    if (nextIsAdmin) {
                      window.location.hash = 'admin';
                    } else {
                      window.location.hash = '';
                    }
                  }}
                  className={`text-xs px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition ${
                    isAdmin 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:bg-emerald-400'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{isAdmin ? 'Exit Admin Mode' : 'Admin Console'}</span>
                </button>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('admin_login');
                    setIsLoggedIn(false);
                    setIsAdmin(false);
                    window.location.hash = '';
                    window.location.pathname = '/';
                  }}
                  className="text-xs px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition"
                  title="Logout Administrator Session"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Navigation bar for smaller viewport scopes */}
        <div className="lg:hidden h-12 bg-slate-900/40 border-b border-white/5 flex items-center justify-around px-2 text-slate-400">
          <button 
            onClick={() => { navigateToAdmin(false); setCurrentTab('matches'); }}
            className={`text-xs font-semibold px-2 py-1.5 rounded-lg ${currentTab === 'matches' && !isAdmin ? 'text-white bg-slate-850' : ''}`}
          >
            Matches
          </button>
          <button 
            onClick={() => { navigateToAdmin(false); setCurrentTab('standings'); }}
            className={`text-xs font-semibold px-2 py-1.5 rounded-lg ${currentTab === 'standings' && !isAdmin ? 'text-white bg-slate-850' : ''}`}
            >
            Groups
          </button>
          <button 
            onClick={() => { navigateToAdmin(false); setCurrentTab('teams'); }}
            className={`text-xs font-semibold px-2 py-1.5 rounded-lg ${currentTab === 'teams' && !isAdmin ? 'text-white bg-slate-850' : ''}`}
          >
            Teams
          </button>
          <button 
            onClick={() => { navigateToAdmin(false); setCurrentTab('stadiums'); }}
            className={`text-xs font-semibold px-2 py-1.5 rounded-lg ${currentTab === 'stadiums' && !isAdmin ? 'text-white bg-slate-850' : ''}`}
          >
            Stadiums
          </button>
          <button 
            onClick={() => { navigateToAdmin(false); setCurrentTab('stream'); }}
            className={`text-xs font-semibold px-2 py-1.5 rounded-lg flex items-center gap-1 ${currentTab === 'stream' && !isAdmin ? 'text-emerald-400 bg-emerald-500/10' : ''}`}
          >
            Stream
            {streamActive && <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>}
          </button>
        </div>

        {/* Warning notification banner for transient error display */}
        {errorInfo && (
          <div className="mx-6 mt-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-300 font-bold">API Connection Warning</p>
              <p className="text-xs text-slate-400 mt-1">{errorInfo}</p>
            </div>
          </div>
        )}

        {/* Primary Page Grid Layout with custom responsiveness */}
        <main className="flex-1 p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px]">
          
          {/* Left Panel Sidebar: Quick Standings / Live Stats Widget (Adaptive context) */}
          <section className="col-span-1 md:col-span-3 flex flex-col gap-6">
            
            {/* Group Spotlight View mini widget */}
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-display flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                  Latest Group Stands
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
              </div>
              
              {groups.length > 0 ? (
                <div className="space-y-4">
                  {groups.slice(0, 2).map((g) => (
                    <div key={g.group} className="bg-slate-950/40 p-3 rounded-xl border border-white/5">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">{g.group}</p>
                      <div className="space-y-1.5 text-xs">
                        {g.standings.map((teamRow, idx) => (
                          <div key={teamRow.team} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0 text-slate-300">
                            <span className="flex items-center gap-1.5 overflow-hidden">
                              <span className="text-slate-500 text-[10px] w-3">{idx + 1}</span>
                              <span className="font-mono bg-white/5 px-1 rounded text-slate-400 text-[10px] font-bold">{teamRow.code}</span>
                              <span className="truncate">{teamRow.team}</span>
                            </span>
                            <span className="font-semibold text-slate-200">{teamRow.points} pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Standings loading...
                </div>
              )}
            </div>

            {/* Stadium mini preview carousel column */}
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-display flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Featured Arenas (16)
              </h3>
              {stadiums.length > 0 ? (
                <div className="space-y-2.5">
                  {stadiums.slice(0, 3).map((std) => (
                    <div key={std.id} className="relative h-16 rounded-xl overflow-hidden border border-white/5 group bg-slate-950">
                      <img 
                        src={std.image} 
                        alt={std.name} 
                        className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition duration-500" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                      <div className="absolute inset-0 p-2.5 flex flex-col justify-end">
                        <p className="text-xs font-bold leading-none truncate">{std.name}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-none">{std.city}, {std.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs">No stadiums loaded</div>
              )}
            </div>
          </section>

          {/* Center Main Module Panel container (Matches, Standings, Teams, Arenas, or Admin Live Stream Channel) */}
          <section className="col-span-1 md:col-span-6 flex flex-col gap-6">
            
            {isAdminAuthRoute && !isLoggedIn ? (
              /* --- EXPLICIT SECURE ADMIN LOGIN SCREEN --- */
              <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 flex flex-col gap-6 relative overflow-hidden shadow-2xl" id="admin-login-portal">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full"></div>

                <div className="text-center relative z-10">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center p-3 relative">
                    <span className="absolute inset-0 bg-emerald-400/10 blur-md rounded-2xl"></span>
                    <Settings className="w-8 h-8 text-emerald-400 animate-spin-slow" />
                  </div>
                  <h2 className="text-xl font-bold font-display text-white tracking-tight">SECURE ADMIN PORTAL</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Identity validation required to gain administrative live stream privilege controls.
                  </p>
                </div>

                {/* Incorrect credential warning banner - EXACTLY verbatim error message */}
                {authError && (
                  <div className="bg-red-500/10 border-2 border-red-500/40 p-4 rounded-xl flex items-start gap-3" id="auth-unauthorized-banner">
                    <div className="bg-red-500/20 text-red-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                      <span className="font-extrabold text-xs">⚠️</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-red-400 uppercase tracking-wide">Access Blocked</p>
                      <p className="text-xs text-red-200 mt-0.5 font-semibold leading-relaxed">
                        {authError}
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (adminUser === 'admin69' && adminPassword === 'admin69') {
                    sessionStorage.setItem('admin_login', 'true');
                    setIsLoggedIn(true);
                    setIsAdmin(true);
                    setAuthError('');
                    setCurrentTab('stream');
                    // update query parameters cleaner path state representation
                    window.location.hash = 'admin';
                  } else {
                    setAuthError('kya gunda banega re tu.');
                  }
                }} className="space-y-4 relative z-10">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Username ID
                    </label>
                    <input 
                      type="text"
                      required
                      value={adminUser}
                      onChange={(e) => setAdminUser(e.target.value)}
                      placeholder="Enter administrator ID..."
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Access Pass Key
                    </label>
                    <input 
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition uppercase tracking-wider"
                  >
                    Authenticate Console
                  </button>
                </form>

                <div className="text-center relative z-10 mt-2">
                  <span 
                    onClick={() => {
                      setIsAdminAuthRoute(false);
                      window.location.pathname = '/';
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300 underline cursor-pointer"
                  >
                    Cancel and Return to Matches feeds
                  </span>
                </div>
              </div>
            ) : isAdmin ? (
              <div className="bg-slate-900/40 border-2 border-dashed border-emerald-500/30 rounded-3xl p-6 flex flex-col gap-5 relative overflow-hidden" id="admin-workspace">
                <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-bold text-[9px] px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                  Administrator Console
                </div>

                <div>
                  <h2 className="text-xl font-bold font-display text-emerald-400 flex items-center gap-2">
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    LIVE MATCH STREAMING HUB
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Share your custom gameplay simulator, football broadcasts, or screen with remote spectators. Audience streams will render frame transmissions with sub-second latencies recursively.
                  </p>
                </div>

                {/* Display media permission alert note explaining flow */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-300">System Permission Required</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      This application requests screen capture capability (<code className="bg-slate-950/50 px-1 py-0.5 rounded text-emerald-400">getDisplayMedia</code>) to transmit real-time video frames to users. Rejecting the dialog prevents broadcast capability. Keep audio disabled for faster transmissions.
                    </p>
                  </div>
                </div>

                {/* Control settings row */}
                <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Target Uplink Framerate
                    </label>
                    <select 
                      value={fps}
                      onChange={(e) => setFps(Number(e.target.value))}
                      disabled={isBroadcasting}
                      className="text-xs w-full bg-slate-900 border border-white/10 rounded-lg p-2 font-mono text-slate-200"
                    >
                      <option value="2">2 FPS (Ultra-low Bandwidth)</option>
                      <option value="5">5 FPS (Default Balanced)</option>
                      <option value="10">10 FPS (High Performance)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      JPEG Compressing Quality
                    </label>
                    <select 
                      value={compressionQuality}
                      onChange={(e) => setCompressionQuality(Number(e.target.value))}
                      disabled={isBroadcasting}
                      className="text-xs w-full bg-slate-900 border border-white/10 rounded-lg p-2 font-mono text-slate-200"
                    >
                      <option value="0.3">30% (Best Latency)</option>
                      <option value="0.6">60% (Medium Smooth)</option>
                      <option value="0.9">90% (Ultra Clear Quality)</option>
                    </select>
                  </div>
                </div>

                {screenShareError && (
                  <div className="bg-red-500/10 border-2 border-red-500/30 p-4.5 rounded-2xl text-xs space-y-2 text-red-200" id="iframe-share-alert">
                    <p className="font-extrabold flex items-center gap-1.5 text-red-400 uppercase tracking-wide text-[11px]">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                      ⚠️ Browser Security Limits Screen Share in Iframes
                    </p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Web browsers disable the screen capture API (<code className="bg-slate-950 px-1 py-0.5 rounded text-red-300">getDisplayMedia</code>) when an application runs nested inside a preview-frame container.
                    </p>
                    <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-1.5 mt-2 text-slate-350">
                      <p className="font-bold text-white text-[11.5px]">🚀 How to Share Your Live Screen Instantly:</p>
                      <p className="text-[11px] leading-normal">
                        1. Look at the top-right corner of this live preview interface panel.
                      </p>
                      <p className="text-[11px] leading-normal">
                        2. Click the <span className="text-emerald-400 font-semibold">"Open in a new tab"</span> button (represented by a square with a diagonal arrow).
                      </p>
                      <p className="text-[11px] leading-normal">
                        3. Open the Admin Panel in the new tab and click <span className="text-emerald-400 font-semibold">"Device Screen Share"</span> — it will request your screen flawlessly!
                      </p>
                    </div>
                    <div className="text-[9.5px] text-slate-400 font-mono mt-2 pt-2 border-t border-white/5">
                      Technical Error: {screenShareError}
                    </div>
                  </div>
                )}

                 {/* Action buttons triggers */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {!isBroadcasting ? (
                    <>
                      <button
                        onClick={startScreenBroadcast}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 py-3.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-2 shadow-lg transition uppercase tracking-wider"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Device Screen Share
                      </button>

                      <button
                        onClick={startSimulatorBroadcast}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-2 shadow-lg transition uppercase tracking-wider"
                      >
                        <Activity className="w-4 h-4" />
                        Match Simulator Feed
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={stopScreenBroadcast}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.3)] transition animate-pulse uppercase tracking-wider"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop Active Broadcast
                    </button>
                  )}
                </div>

                {/* Uplink diagnostics HUD */}
                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">System Telemetry State:</span>
                    <span className={`font-bold ${isBroadcasting ? 'text-red-400' : 'text-slate-400'}`}>
                      {isBroadcasting ? `● ACTIVE BROADCAST` : '■ IDLE'}
                    </span>
                  </div>
                  {isBroadcasting && (
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">Uplink Feed Source:</span>
                      <span className="text-blue-400 font-bold uppercase">
                        {broadcastType === 'Screen' ? 'Screen Share Capture' : 'Football Simulator'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Transmitted Frames count:</span>
                    <span className="text-emerald-400 font-bold">{uploadedFramesCount} frames</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Current Status feedback:</span>
                    <span className="text-slate-300 truncate max-w-xs">{adminStatusText}</span>
                  </div>
                </div>

                <div className="mt-2 text-center">
                  <button 
                    onClick={() => navigateToAdmin(false)}
                    className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
                  >
                    Return to User Match Dashboard
                  </button>
                </div>
              </div>
            ) : (
              /* --- STANDARD USER VIEW INTERFACE --- */
              <div className="flex flex-col gap-6">
                
                {/* 1. Interactive Custom Live Stream Player component */}
                <div 
                  className="relative bg-black rounded-3xl aspect-video border border-emerald-500/30 overflow-hidden shadow-2xl group flex flex-col"
                  id="live-player-arena"
                >
                  {streamActive && streamFrame ? (
                    /* Active Stream Frame rendering dynamically as responsive image */
                    <img 
                      src={streamFrame} 
                      alt="Live Administrator Stadium Broadcast Screen" 
                      className="w-full h-full object-contain bg-slate-950" 
                    />
                  ) : (
                    /* Default state before administrator streams screen capture */
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-900 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-md">
                        <Activity className="w-8 h-8 animate-pulse" />
                      </div>
                      <p className="text-sm font-bold font-display text-emerald-400 tracking-wider">
                        WAITING FOR ADMIN SIGNAL LIVE STREAM
                      </p>
                      <p className="text-slate-400 text-[11px] mt-1.5 max-w-sm leading-relaxed">
                        No active game broadcast detected. To broadcast a stream as an authorized administrator, authenticate at <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-400 font-mono">/admin-auth</code>
                      </p>
                    </div>
                  )}

                  {/* High Quality visual controls overlay inside player */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-slate-950/70 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-md text-[9px] font-mono tracking-widest uppercase flex items-center gap-1.5 font-bold">
                      <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 animate-ping'}`}></span>
                      {sseConnected ? 'SSE Real-time' : 'JSON Polling'}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/90 border border-red-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black tracking-widest uppercase">
                      {streamActive ? 'Live Stream Active' : 'Offline'}
                    </span>
                  </div>

                  {/* Mini floating player controls metadata info */}
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 backdrop-blur-md rounded-xl p-3 border border-white/5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition duration-300">
                    <div className="flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold font-display">WC26 Live Transmission Feed</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Feed Latency: &lt; 0.4s</span>
                  </div>
                </div>

                {/* 2. Primary Navigated Section Tab renders */}
                
                {/* --- TAB A: WORLD CUP GAMES & SCORES FEEDS --- */}
                {currentTab === 'matches' && (
                  <div className="space-y-4" id="view-matches">
                    <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                      <div className="flex gap-2">
                        {(['All', 'Live', 'Scheduled', 'Completed'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setMatchStatusFilter(filter)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition ${
                              matchStatusFilter === filter 
                                ? 'bg-emerald-500 text-slate-950 font-bold' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {filter}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Found: {filteredMatches.length} matches</span>
                    </div>

                    {loading ? (
                      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <p className="text-xs text-slate-400">Retrieving FIFA WC 2026 fixtures...</p>
                      </div>
                    ) : filteredMatches.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3.5">
                        {filteredMatches.map((match) => (
                          <div 
                            key={match.id} 
                            className="bg-gradient-to-r from-slate-900 to-slate-950 border border-white/5 rounded-2xl p-5 hover:border-emerald-500/20 transition-all shadow-sm"
                          >
                            {/* Match Card Header Info metadata */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4 font-mono">
                              <span className="bg-slate-950 px-2.5 py-1 rounded border border-white/5 font-bold uppercase tracking-wider">
                                {match.group} • Match #{match.match_number}
                              </span>
                              
                              {match.status === 'Live' ? (
                                <span className="text-red-500 font-bold bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                                  {match.minute || 'LIVE'}
                                </span>
                              ) : match.status === 'Completed' ? (
                                <span className="text-slate-400 bg-slate-800 px-2 py-0.5 rounded">FT</span>
                              ) : (
                                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                                  {match.time} ({match.date})
                                </span>
                              )}
                            </div>

                            {/* Core Display Scores row */}
                            <div className="flex items-center justify-between my-2">
                              {/* Home team box */}
                              <div className="flex items-center gap-3.5 w-5/12">
                                <span className="text-2xl">{match.home_code ? (filteredTeams.find(t => t.code === match.home_code)?.flag || '⚽') : '⚽'}</span>
                                <div className="truncate text-left">
                                  <h4 className="text-sm font-bold truncate text-slate-100">{match.home_team}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono">{match.home_code}</p>
                                </div>
                              </div>

                              {/* Center score display */}
                              <div className="text-center w-2/12">
                                <div className="text-base md:text-lg font-bold font-mono tracking-tight text-emerald-400 px-2 bg-slate-950 rounded-lg py-0.5 border border-white/5">
                                  {match.status === 'Scheduled' ? 'v' : `${match.home_score} - ${match.away_score}`}
                                </div>
                              </div>

                              {/* Away team box */}
                              <div className="flex items-center gap-3.5 justify-end text-right w-5/12">
                                <div className="truncate text-right">
                                  <h4 className="text-sm font-bold truncate text-slate-100">{match.away_team}</h4>
                                  <p className="text-[10px] text-slate-400 font-mono">{match.away_code}</p>
                                </div>
                                <span className="text-2xl">{match.away_code ? (filteredTeams.find(t => t.code === match.away_code)?.flag || '⚽') : '⚽'}</span>
                              </div>
                            </div>

                            <div className="h-px bg-white/5 my-4"></div>

                            {/* Match site footer details */}
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span className="flex items-center gap-1 truncate max-w-[70%]">
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="truncate">{match.stadium} — {match.city}</span>
                              </span>
                              <span className="shrink-0 text-slate-500 font-mono">{match.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center text-slate-500 text-xs">
                        No matches fit the selected search query filter.
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB B: COMPREHENSIVE GROUP STANDINGS VIEW LIST --- */}
                {currentTab === 'standings' && (
                  <div className="space-y-6" id="view-standings">
                    <div className="bg-slate-900/30 p-4 rounded-2xl border border-white/5">
                      <h4 className="text-sm font-semibold font-display mb-1">Group Stage Progression structure</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">Top two nations of each respective category qualify to progress onto the legendary knockouts path. Standings updated after each completed score proxy.</p>
                    </div>

                    {loading ? (
                      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <p className="text-xs text-slate-400">Rendering groups statistics...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groups.map((grp) => (
                          <div key={grp.group} className="bg-slate-950 border border-white/5 rounded-2xl p-4.5">
                            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent p-2.5 rounded-lg border border-emerald-500/10 mb-3.5 flex items-center justify-between">
                              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase font-display">{grp.group}</span>
                              <span className="text-[9px] text-slate-500 uppercase font-mono">Standings</span>
                            </div>

                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-white/5 text-slate-400 font-medium">
                                  <th className="py-2 font-mono">#</th>
                                  <th className="py-2">NATION</th>
                                  <th className="py-2 text-center" title="Played">PL</th>
                                  <th className="py-2 text-center" title="Goal Difference">GD</th>
                                  <th className="py-2 text-right">PTS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grp.standings.map((standingRow, sIdx) => {
                                  const linkedTeam = teams.find(t => t.code === standingRow.code);
                                  return (
                                    <tr key={standingRow.team} className="border-b border-white/5 last:border-0 hover:bg-white/5 text-slate-300">
                                      <td className="py-2.5 font-mono text-[10px] text-slate-500 font-bold">{sIdx + 1}</td>
                                      <td className="py-2.5 font-semibold flex items-center gap-2">
                                        <span className="text-base">{linkedTeam?.flag || '⚽'}</span>
                                        <span className="truncate max-w-[120px]">{standingRow.team}</span>
                                      </td>
                                      <td className="py-2.5 text-center font-mono">{standingRow.played}</td>
                                      <td className={`py-2.5 text-center font-mono font-semibold ${standingRow.gd > 0 ? 'text-emerald-400' : standingRow.gd < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                        {standingRow.gd > 0 ? `+${standingRow.gd}` : standingRow.gd}
                                      </td>
                                      <td className="py-2.5 text-right font-black text-white font-mono">{standingRow.points}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB C: NATIONS & TEAMS PARTICIPATION GRID --- */}
                {currentTab === 'teams' && (
                  <div className="space-y-4" id="view-teams">
                    <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/30 p-4 rounded-2xl border border-white/5 items-center">
                      <div className="relative w-full">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Type country name, code, or group stage..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="w-full bg-slate-950 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/30"
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <p className="text-xs text-slate-400">Loading participating squads...</p>
                      </div>
                    ) : filteredTeams.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filteredTeams.map((team) => (
                          <div 
                            key={team.id} 
                            className="bg-slate-950 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-emerald-500/20 transition group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-3xl filter drop-shadow bg-white/5 p-1.5 rounded-lg group-hover:scale-110 transition duration-300">
                                {team.flag || '⚽'}
                              </span>
                              <span className="text-[9px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-white/5">
                                RANK {team.rank}
                              </span>
                            </div>
                            
                            <div>
                              <p className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">{team.code}</p>
                              <h5 className="text-sm font-bold text-slate-200 truncate mt-0.5 font-display">{team.name}</h5>
                            </div>

                            <p className="text-[10px] text-emerald-400 font-semibold mt-3 bg-emerald-500/10 px-2 py-1 rounded inline-block self-start font-mono uppercase tracking-wider">
                              {team.group}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-slate-500 text-xs">
                        No nations matching the searched keyword.
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB D: 16 STADIUMS SPECIFICATIONS FEEDS --- */}
                {currentTab === 'stadiums' && (
                  <div className="space-y-4" id="view-stadiums">
                    <div className="relative w-full mb-4">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        placeholder="Search arena names, cities or host countries..."
                        value={stadiumSearch}
                        onChange={(e) => setStadiumSearch(e.target.value)}
                        className="w-full bg-slate-900/30 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 outline-none focus:border-emerald-500/30"
                      />
                    </div>

                    {loading ? (
                      <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <p className="text-xs text-slate-400">Loading tournament stadiums data...</p>
                      </div>
                    ) : filteredStadiums.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {filteredStadiums.map((std) => (
                          <div 
                            key={std.id} 
                            className="bg-slate-950 border border-white/5 rounded-3xl overflow-hidden group hover:border-emerald-500/20 transition flex flex-col"
                          >
                            <div className="h-44 relative overflow-hidden bg-slate-900">
                              <img 
                                src={std.image} 
                                alt={std.name} 
                                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-700" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                              <span className="absolute bottom-3 left-3 bg-slate-950/80 border border-white/5 px-2.5 py-1 rounded-lg text-[9px] text-emerald-400 font-mono tracking-widest uppercase font-bold">
                                {std.capacity} Capacity 🏟️
                              </span>
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <h5 className="text-base font-black text-slate-100 font-display leading-snug group-hover:text-emerald-300 transition">
                                  {std.name}
                                </h5>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-semibold">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                                  {std.city}, {std.country}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-16 text-center text-slate-500 text-xs">
                        No arenas found matching the search criteria.
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB E: EXPLICIT LIVE STREAM HUB ACCESS INSTRUCTION --- */}
                {currentTab === 'stream' && (
                  <div className="bg-slate-900/10 p-6 rounded-3xl border border-white/5 text-center flex flex-col items-center py-10" id="view-stream-hub">
                    <Tv className="w-12 h-12 text-emerald-400 mb-4 animate-pulse" />
                    <h4 className="text-lg font-bold font-display text-emerald-400">Real-Time Presentation Monitor</h4>
                    
                    <p className="text-xs text-slate-350 max-w-md mt-2 leading-relaxed">
                      This channel streams screenshot arrays uploaded directly by the system administrator's shared desktop viewport.
                    </p>

                    <div className="mt-8 p-4 bg-slate-950/60 rounded-2xl border border-white/5 text-left w-full text-xs space-y-3">
                      <p className="font-bold text-slate-300">How to broadcast as an Administrator:</p>
                      <ol className="list-decimal pl-5 space-y-2 text-slate-400 text-[11px] leading-snug">
                        <li>Access the administrative broadcast portal by entering the secure URL pathname <code className="bg-slate-950 px-1 py-0.5 rounded text-emerald-400">/admin-auth</code> in your address bar.</li>
                        <li>Give standard display-capture privileges allowed in standard browser modals.</li>
                        <li>Once active, your screenshot frames will deliver live to all spectator screens instantly!</li>
                      </ol>
                    </div>
                  </div>
                )}

              </div>
            )}
          </section>

          {/* Right Panel Sidebar: Upcoming Matches Spotlight List */}
          <section className="col-span-1 md:col-span-3 flex flex-col gap-6">
            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-display flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Featured Spotlights
              </h3>

              {matches.filter(m => m.status === 'Scheduled').length > 0 ? (
                <div className="space-y-3">
                  {matches.filter(m => m.status === 'Scheduled').slice(0, 4).map((sch) => {
                    const homeTeamLogo = teams.find(t => t.name === sch.home_team)?.flag || '⚽';
                    const awayTeamLogo = teams.find(t => t.name === sch.away_team)?.flag || '⚽';
                    return (
                      <div 
                        key={sch.id} 
                        className="bg-slate-950/50 p-3 rounded-xl border border-white/5 flex flex-col gap-2 hover:border-emerald-500/10 transition"
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                          <span>{sch.group}</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">{sch.time}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold font-display text-slate-200">
                            <span>{homeTeamLogo}</span>
                            <span className="truncate max-w-[80px]">{sch.home_code}</span>
                          </span>
                          <span className="text-[10px] text-slate-600 font-mono">VS</span>
                          <span className="flex items-center gap-1.5 text-xs font-bold font-display text-slate-200 justify-end">
                            <span className="truncate max-w-[80px]">{sch.away_code}</span>
                            <span>{awayTeamLogo}</span>
                          </span>
                        </div>

                        <div className="text-[9px] text-slate-400 truncate text-center border-t border-white/5 pt-1.5">
                          {sch.stadium}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">No upcoming highlight fixtures.</div>
              )}
            </div>

            {/* Quick stats widget card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                <span>NATIONS</span>
                <span className="text-emerald-400 font-bold">48 Teams</span>
              </div>
              <p className="text-xs text-slate-300 leading-snug">
                FIFA World Cup 2026 forms the grandest historical iteration bringing together the Americas, with 48 squads competing over 104 matches.
              </p>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-500"></div>
              </div>
            </div>
          </section>

        </main>

        {/* 12. Bottom Scrolling Ticker of Live Results and Highlights */}
        <footer className="h-12 bg-emerald-500 text-emerald-950 flex items-center overflow-hidden border-t border-emerald-400/20 select-none relative" id="wc-footer">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-emerald-500 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-emerald-500 to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex gap-16 text-[10px] md:text-xs font-black uppercase tracking-wider animate-[marquee_22s_linear_infinite] whitespace-nowrap">
            <span>⚽ LIVE TRANSMISSION LINK CONNECTED • DIRECT FRAME UPLANKS STABLE</span>
            <span>•</span>
            <span>ARGENTINA 1 - 2 MEXICO (FT)</span>
            <span>•</span>
            <span>UNITED STATES 1 - 1 CANADA (LIVE 48')</span>
            <span>•</span>
            <span>FRANCE VS ENGLAND (KICKOFF TOMORROW 12:00)</span>
            <span>•</span>
            <span>BRAZIL 3 - 2 GERMANY (FT)</span>
            <span>•</span>
            <span>SPAIN 1 - 1 PORTUGAL (FT)</span>
            <span>•</span>
            <span>BELGIUM VS NETHERLANDS (UPCOMING)</span>
            <span>•</span>
            <span>FOOTBALL UNITES THE WORLD BY NISCHAL ADHIKARI</span>
          </div>

          {/* Inject style directly for standard fluid marquee animation */}
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </footer>

      </div>
    </div>
  );
}
