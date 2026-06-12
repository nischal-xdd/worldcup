import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  fallbackTeams,
  fallbackStadiums,
  fallbackMatches,
  fallbackGroups,
  Team,
  Stadium,
  Match,
  GroupStanding
} from './src/fallbackData';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure JSON limit for base64 streaming frame uploads
  app.use(express.json({ limit: '15mb' }));

  // In-memory states for Live Screen Stream
  let isStreaming = false;
  let latestFrame: string | null = null;
  let sseClients: any[] = [];

  // Helper for fetching external APIs with timeout & fallback
  async function fetchWithTimeout(url: string, fallback: any, msg: string, timeoutMs = 4000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      console.log(`[API PROXY] Fetching: ${url}`);
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        if (data) {
          if (Array.isArray(data)) {
            console.log(`[API PROXY] Received array successfully for ${msg}`);
            return data;
          }
          if (typeof data === 'object') {
            // Check if there is an array property inside (e.g. data.teams, data.games, etc)
            const arrayProp = Object.values(data).find(val => Array.isArray(val));
            if (arrayProp) {
              console.log(`[API PROXY] Extracted array property for ${msg}`);
              return arrayProp;
            }
          }
        }
      }
      throw new Error(`Response status code: ${response.status}`);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn(`[API PROXY] Fetching ${url} failed (${err.message || err}). Falling back to local high-fidelity dataset.`);
      return fallback;
    }
  }

  // In-memory cache for teams dynamically populated from API to avoid ID mismatch discrepancies
  let parsedTeamsCache: Team[] = [...fallbackTeams];

  function getFlagEmoji(iso2: string) {
    if (!iso2 || iso2.length !== 2) return '⚽';
    try {
      return [...iso2.toUpperCase()]
        .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join('');
    } catch {
      return '⚽';
    }
  }

  // Mappers to translate raw APIs to premium fallbacks schemas dynamically
  const mapTeams = (apiTeams: any[]): Team[] => {
    const mapped = apiTeams.map(t => {
      const fallback = fallbackTeams.find(f => f.code === t.fifa_code || f.name.toLowerCase() === t.name_en?.toLowerCase());
      return {
        id: String(t.id || t._id),
        name: t.name_en || fallback?.name || 'Unknown',
        code: t.fifa_code || fallback?.code || 'UNK',
        group: t.groups ? `Group ${t.groups}` : (fallback?.group || 'Group Stage'),
        rank: fallback?.rank || 99,
        flag: t.iso2 ? getFlagEmoji(t.iso2) : (fallback?.flag || '⚽')
      };
    });
    parsedTeamsCache = mapped; // hot swap the in-memory cache
    return mapped;
  };

  const mapMatches = (apiMatches: any[]): Match[] => {
    return apiMatches.map(m => {
      let homeTeam = parsedTeamsCache.find(t => t.name.toLowerCase() === m.home_team_name_en?.toLowerCase());
      if (!homeTeam) {
        homeTeam = parsedTeamsCache.find(t => String(t.id) === String(m.home_team_id));
      }

      let awayTeam = parsedTeamsCache.find(t => t.name.toLowerCase() === m.away_team_name_en?.toLowerCase());
      if (!awayTeam) {
        awayTeam = parsedTeamsCache.find(t => String(t.id) === String(m.away_team_id));
      }

      const stadiumObj = fallbackStadiums.find(s => String(s.id) === String(m.stadium_id));

      let dateStr = m.local_date || '';
      let timeStr = '';
      if (dateStr.includes(' ')) {
        const parts = dateStr.split(' ');
        dateStr = parts[0];
        timeStr = parts[1];
      }

      let statusVal: 'Scheduled' | 'Live' | 'Completed' = 'Scheduled';
      if (String(m.finished).toUpperCase() === 'TRUE') {
        statusVal = 'Completed';
      } else if (m.time_elapsed && m.time_elapsed !== '0' && m.time_elapsed.toLowerCase() !== 'notstarted') {
        statusVal = 'Live';
      }

      return {
        id: String(m.id || m._id),
        match_number: Number(m.matchday || m.id || 1),
        home_team: m.home_team_name_en || 'Home Team',
        home_code: homeTeam?.code || 'TBD',
        away_team: m.away_team_name_en || 'Away Team',
        away_code: awayTeam?.code || 'TBD',
        home_score: isNaN(Number(m.home_score)) ? 0 : Number(m.home_score),
        away_score: isNaN(Number(m.away_score)) ? 0 : Number(m.away_score),
        status: statusVal,
        minute: statusVal === 'Live' ? `${m.time_elapsed}'` : undefined,
        date: dateStr,
        time: timeStr || '13:00',
        group: m.group ? `Group ${m.group}` : 'Group Stage',
        stadium: stadiumObj?.name || 'Seattle Stadium',
        city: stadiumObj?.city || 'Seattle'
      };
    });
  };

  const mapGroups = (apiGroups: any[]): GroupStanding[] => {
    return apiGroups.map(g => {
      const sortedStandings = (g.teams || []).map((t: any) => {
        const matchedTeam = parsedTeamsCache.find(teamObj => String(teamObj.id) === String(t.team_id));
        return {
          team: matchedTeam?.name || 'Unknown',
          code: matchedTeam?.code || 'UNK',
          played: Number(t.mp || 0),
          won: Number(t.w || 0),
          drawn: Number(t.d || 0),
          lost: Number(t.l || 0),
          gf: Number(t.gf || 0),
          ga: Number(t.ga || 0),
          gd: Number(t.gd || 0),
          points: Number(t.pts || 0)
        };
      }).sort((a: any, b: any) => b.points - a.points || b.gd - a.gd);

      return {
        group: g.name ? `Group ${g.name}` : 'Group Stage',
        standings: sortedStandings
      };
    });
  };

  const mapStadiums = (apiStadiums: any[]): Stadium[] => {
    return apiStadiums.map(s => {
      const fallback = fallbackStadiums.find(f => String(f.id) === String(s.id) || f.name.toLowerCase().includes(s.name_en?.toLowerCase()));
      return {
        id: String(s.id || s._id),
        name: s.name_en || s.fifa_name || fallback?.name || 'Seattle Stadium',
        city: s.city_en || fallback?.city || 'Seattle',
        country: s.country_en || fallback?.country || 'United States',
        capacity: s.capacity ? Number(s.capacity).toLocaleString() : (fallback?.capacity || '68,000'),
        image: fallback?.image || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200'
      };
    });
  };

  // Bootstrap cache with proactive API fetch immediately on server start
  fetchWithTimeout('https://worldcup26.ir/get/teams', [], 'Bootstrap Team Cache').then(data => {
    if (data && Array.isArray(data)) {
      mapTeams(data);
    }
  }).catch(() => {});

  // --- API Routes ---

  // Get World Cup 2026 matches
  app.get('/api/worldcup/games', async (req, res) => {
    const data = await fetchWithTimeout(
      'https://worldcup26.ir/get/games',
      null,
      'Games/Matches'
    );
    if (!data) {
      return res.json(fallbackMatches);
    }
    try {
      res.json(mapMatches(data));
    } catch (e) {
      console.error('Error mapping games:', e);
      res.json(fallbackMatches);
    }
  });

  // Get group standings
  app.get('/api/worldcup/groups', async (req, res) => {
    const data = await fetchWithTimeout(
      'https://worldcup26.ir/get/groups',
      null,
      'Group Standings'
    );
    if (!data) {
      return res.json(fallbackGroups);
    }
    try {
      res.json(mapGroups(data));
    } catch (e) {
      console.error('Error mapping groups:', e);
      res.json(fallbackGroups);
    }
  });

  // Get all 48 teams
  app.get('/api/worldcup/teams', async (req, res) => {
    const data = await fetchWithTimeout(
      'https://worldcup26.ir/get/teams',
      null,
      'Teams'
    );
    if (!data) {
      return res.json(fallbackTeams);
    }
    try {
      res.json(mapTeams(data));
    } catch (e) {
      console.error('Error mapping teams:', e);
      res.json(fallbackTeams);
    }
  });

  // Get all 16 stadiums
  app.get('/api/worldcup/stadiums', async (req, res) => {
    const data = await fetchWithTimeout(
      'https://worldcup26.ir/get/stadiums',
      null,
      'Stadiums'
    );
    if (!data) {
      return res.json(fallbackStadiums);
    }
    try {
      res.json(mapStadiums(data));
    } catch (e) {
      console.error('Error mapping stadiums:', e);
      res.json(fallbackStadiums);
    }
  });

  // --- Live Stream Signaling Endpoints ---

  // Admin initiates screen share streaming
  app.post('/api/stream/start', (req, res) => {
    isStreaming = true;
    latestFrame = null;
    console.log('[STREAM] Live stream started by administrator');
    
    // Broadcast state update to SSE clients
    sseClients.forEach(client => {
      client.write(`event: state\ndata: ${JSON.stringify({ active: true })}\n\n`);
    });
    res.json({ success: true, active: true });
  });

  // Admin stops screen share streaming
  app.post('/api/stream/stop', (req, res) => {
    isStreaming = false;
    latestFrame = null;
    console.log('[STREAM] Live stream stopped by administrator');

    // Broadcast state update to SSE clients
    sseClients.forEach(client => {
      client.write(`event: state\ndata: ${JSON.stringify({ active: false })}\n\n`);
    });
    res.json({ success: true, active: false });
  });

  // Admin uploads latest screenshot frame (compressed base64 data url)
  app.post('/api/stream/upload', (req, res) => {
    const { frame } = req.body;
    if (!frame) {
      return res.status(400).json({ error: 'Missing frame parameter' });
    }
    
    latestFrame = frame;
    isStreaming = true;

    // Broadcast frame to all SSE clients in real-time
    sseClients.forEach(client => {
      client.write(`event: frame\ndata: ${JSON.stringify({ frame, active: true })}\n\n`);
    });

    res.json({ success: true });
  });

  // Client subscribes to real-time server-sent events (SSE) for instant stream delivery
  app.get('/api/stream/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Send immediate initial connection packet
    res.write(`event: state\ndata: ${JSON.stringify({ active: isStreaming, hasFrame: !!latestFrame })}\n\n`);
    if (latestFrame) {
      res.write(`event: frame\ndata: ${JSON.stringify({ frame: latestFrame, active: isStreaming })}\n\n`);
    }

    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(client => client !== res);
    });
  });

  // Regular JSON polling fallback endpoint for compatibility
  app.get('/api/stream/latest', (req, res) => {
    res.json({
      active: isStreaming,
      frame: latestFrame
    });
  });

  // --- Front-end Integration (Vite or Static build) ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[FULL-STACK] FIFA World Cup Server successfully launched on port ${PORT}`);
  });
}

startServer();
