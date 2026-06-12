export interface Team {
  id: string;
  name: string;
  code: string;
  group: string;
  rank: number;
  flag: string;
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: string;
  image: string;
}

export interface Match {
  id: string;
  match_number: number;
  home_team: string;
  home_code: string;
  away_team: string;
  away_code: string;
  home_score: number;
  away_score: number;
  status: 'Scheduled' | 'Live' | 'Completed';
  minute?: string;
  date: string;
  time: string;
  group: string;
  stadium: string;
  city: string;
}

export interface GroupStanding {
  group: string;
  standings: {
    team: string;
    code: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    gf: number;
    ga: number;
    gd: number;
    points: number;
  }[];
}

export const fallbackTeams: Team[] = [
  // Group A
  { id: "1", name: "United States", code: "USA", group: "Group A", rank: 11, flag: "🇺🇸" },
  { id: "2", name: "Mexico", code: "MEX", group: "Group A", rank: 15, flag: "🇲🇽" },
  { id: "3", name: "Canada", code: "CAN", group: "Group A", rank: 40, flag: "🇨🇦" },
  { id: "4", name: "Argentina", code: "ARG", group: "Group A", rank: 1, flag: "🇦🇷" },

  // Group B
  { id: "5", name: "France", code: "FRA", group: "Group B", rank: 2, flag: "🇫🇷" },
  { id: "6", name: "England", code: "ENG", group: "Group B", rank: 4, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "7", name: "Belgium", code: "BEL", group: "Group B", rank: 8, flag: "🇧🇪" },
  { id: "8", name: "Netherlands", code: "NED", group: "Group B", rank: 7, flag: "🇳🇱" },

  // Group C
  { id: "9", name: "Brazil", code: "BRA", group: "Group C", rank: 5, flag: "🇧🇷" },
  { id: "10", name: "Spain", code: "ESP", group: "Group C", rank: 3, flag: "🇪🇸" },
  { id: "11", name: "Portugal", code: "POR", group: "Group C", rank: 6, flag: "🇵🇹" },
  { id: "12", name: "Germany", code: "GER", group: "Group C", rank: 16, flag: "🇩🇪" },

  // Group D
  { id: "13", name: "Italy", code: "ITA", group: "Group D", rank: 9, flag: "🇮🇹" },
  { id: "14", name: "Croatia", code: "CRO", group: "Group D", rank: 10, flag: "🇭🇷" },
  { id: "15", name: "Uruguay", code: "URU", group: "Group D", rank: 14, flag: "🇺🇾" },
  { id: "16", name: "Colombia", code: "COL", group: "Group D", rank: 12, flag: "🇨🇴" },

  // Group E
  { id: "17", name: "Morocco", code: "MAR", group: "Group E", rank: 13, flag: "🇲🇦" },
  { id: "18", name: "Senegal", code: "SEN", group: "Group E", rank: 19, flag: "🇸🇳" },
  { id: "19", name: "Japan", code: "JPN", group: "Group E", rank: 18, flag: "🇯🇵" },
  { id: "20", name: "South Korea", code: "KOR", group: "Group E", rank: 22, flag: "🇰🇷" },

  // Group F
  { id: "21", name: "Australia", code: "AUS", group: "Group F", rank: 24, flag: "🇦🇺" },
  { id: "22", name: "Ecuador", code: "ECU", group: "Group F", rank: 30, flag: "🇪🇨" },
  { id: "23", name: "Switzerland", code: "SUI", group: "Group F", rank: 17, flag: "🇨🇭" },
  { id: "24", name: "Denmark", code: "DEN", group: "Group F", rank: 21, flag: "🇩🇰" },

  // Group G
  { id: "25", name: "Ukraine", code: "UKR", group: "Group G", rank: 25, flag: "🇺🇦" },
  { id: "26", name: "Austria", code: "AUT", group: "Group G", rank: 23, flag: "🇦🇹" },
  { id: "27", name: "Sweden", code: "SWE", group: "Group G", rank: 28, flag: "🇸🇪" },
  { id: "28", name: "Turkey", code: "TUR", group: "Group G", rank: 26, flag: "🇹🇷" },

  // Group H
  { id: "29", name: "Nigeria", code: "NGA", group: "Group H", rank: 36, flag: "🇳🇬" },
  { id: "30", name: "Egypt", code: "EGY", group: "Group H", rank: 37, flag: "🇪🇬" },
  { id: "31", name: "Tunisia", code: "TUN", group: "Group H", rank: 41, flag: "🇹🇳" },
  { id: "32", name: "Algeria", code: "ALG", group: "Group H", rank: 43, flag: "🇩🇿" },

  // Group I
  { id: "33", name: "Iran", code: "IRN", group: "Group I", rank: 20, flag: "🇮🇷" },
  { id: "34", name: "Saudi Arabia", code: "KSA", group: "Group I", rank: 56, flag: "🇸🇦" },
  { id: "35", name: "Qatar", code: "QAT", group: "Group I", rank: 38, flag: "🇶🇦" },
  { id: "36", name: "Iraq", code: "IRQ", group: "Group I", rank: 55, flag: "🇮🇶" },

  // Group J
  { id: "37", name: "Peru", code: "PER", group: "Group J", rank: 31, flag: "🇵🇪" },
  { id: "38", name: "Chile", code: "CHI", group: "Group J", rank: 42, flag: "🇨🇱" },
  { id: "39", name: "Paraguay", code: "PAR", group: "Group J", rank: 54, flag: "🇵🇾" },
  { id: "40", name: "Venezuela", code: "VEN", group: "Group J", rank: 44, flag: "🇻🇪" },

  // Group K
  { id: "41", name: "Poland", code: "POL", group: "Group K", rank: 30, flag: "🇵🇱" },
  { id: "42", name: "Wales", code: "WAL", group: "Group K", rank: 29, flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { id: "43", name: "Scotland", code: "SCO", group: "Group K", rank: 39, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "44", name: "Czech Republic", code: "CZE", group: "Group K", rank: 35, flag: "🇨🇿" },

  // Group L
  { id: "45", name: "New Zealand", code: "NZL", group: "Group L", rank: 94, flag: "🇳🇿" },
  { id: "46", name: "Cameroon", code: "CMR", group: "Group L", rank: 49, flag: "🇨🇲" },
  { id: "47", name: "Ghana", code: "GHA", group: "Group L", rank: 64, flag: "🇬🇭" },
  { id: "48", name: "Costa Rica", code: "CRC", group: "Group L", rank: 50, flag: "🇨🇷" }
];

export const fallbackStadiums: Stadium[] = [
  { id: "1", name: "MetLife Stadium", city: "New York/New Jersey", country: "USA", capacity: "82,500", image: "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=600&auto=format&fit=crop&q=60" },
  { id: "2", name: "SoFi Stadium", city: "Los Angeles", country: "USA", capacity: "70,240", image: "https://images.unsplash.com/photo-1513568693573-730306e56778?w=600&auto=format&fit=crop&q=60" },
  { id: "3", name: "Mercedes-Benz Stadium", city: "Atlanta", country: "USA", capacity: "71,000", image: "https://images.unsplash.com/photo-1540747737956-37872e7e9dd1?w=600&auto=format&fit=crop&q=60" },
  { id: "4", name: "AT&T Stadium", city: "Dallas", country: "USA", capacity: "80,000", image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=60" },
  { id: "5", name: "Hard Rock Stadium", city: "Miami", country: "USA", capacity: "64,767", image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=60" },
  { id: "6", name: "Arrowhead Stadium", city: "Kansas City", country: "USA", capacity: "76,416", image: "https://images.unsplash.com/photo-1504156806580-c1355bba921e?w=600&auto=format&fit=crop&q=60" },
  { id: "7", name: "Estadio Azteca", city: "Mexico City", country: "Mexico", capacity: "87,523", image: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?w=600&auto=format&fit=crop&q=60" },
  { id: "8", name: "BC Place", city: "Vancouver", country: "Canada", capacity: "54,500", image: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=600&auto=format&fit=crop&q=60" },
  { id: "9", name: "BMO Field", city: "Toronto", country: "Canada", capacity: "30,000", image: "https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=600&auto=format&fit=crop&q=60" },
  { id: "10", name: "Estadio Akron", city: "Guadalajara", country: "Mexico", capacity: "48,071", image: "https://images.unsplash.com/photo-1516515429572-1f9f38878502?w=600&auto=format&fit=crop&q=60" },
  { id: "11", name: "Estadio BBVA", city: "Monterrey", country: "Mexico", capacity: "53,500", image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=600&auto=format&fit=crop&q=60" },
  { id: "12", name: "Lumen Field", city: "Seattle", country: "USA", capacity: "69,000", image: "https://images.unsplash.com/photo-1606244864456-8bea63fcd25e?w=600&auto=format&fit=crop&q=60" },
  { id: "13", name: "Levi's Stadium", city: "San Francisco", country: "USA", capacity: "68,500", image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&auto=format&fit=crop&q=60" },
  { id: "14", name: "Gillette Stadium", city: "Boston", country: "USA", capacity: "65,878", image: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=600&auto=format&fit=crop&q=60" },
  { id: "15", name: "Lincoln Financial Field", city: "Philadelphia", country: "USA", capacity: "69,796", image: "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=600&auto=format&fit=crop&q=60" },
  { id: "16", name: "NRG Stadium", city: "Houston", country: "USA", capacity: "72,220", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=60" }
];

export const fallbackMatches: Match[] = [
  {
    id: "g1",
    match_number: 1,
    home_team: "Mexico",
    home_code: "MEX",
    away_team: "Argentina",
    away_code: "ARG",
    home_score: 2,
    away_score: 1,
    status: "Live",
    minute: "76'",
    date: "June 12, 2026",
    time: "15:00",
    group: "Group A",
    stadium: "Estadio Azteca",
    city: "Mexico City"
  },
  {
    id: "g2",
    match_number: 2,
    home_team: "United States",
    home_code: "USA",
    away_team: "Canada",
    away_code: "CAN",
    home_score: 1,
    away_score: 1,
    status: "Live",
    minute: "48'",
    date: "June 12, 2026",
    time: "18:00",
    group: "Group A",
    stadium: "SoFi Stadium",
    city: "Los Angeles"
  },
  {
    id: "g3",
    match_number: 3,
    home_team: "France",
    home_code: "FRA",
    away_team: "England",
    away_code: "ENG",
    away_score: 0,
    home_score: 0,
    status: "Scheduled",
    date: "June 13, 2026",
    time: "12:00",
    group: "Group B",
    stadium: "MetLife Stadium",
    city: "New York/New Jersey"
  },
  {
    id: "g4",
    match_number: 4,
    home_team: "Brazil",
    home_code: "BRA",
    away_team: "Germany",
    away_code: "GER",
    home_score: 3,
    away_score: 2,
    status: "Completed",
    minute: "FT",
    date: "June 11, 2026",
    time: "17:00",
    group: "Group C",
    stadium: "Mercedes-Benz Stadium",
    city: "Atlanta"
  },
  {
    id: "g5",
    match_number: 5,
    home_team: "Spain",
    home_code: "ESP",
    away_team: "Portugal",
    away_code: "POR",
    home_score: 1,
    away_score: 1,
    status: "Completed",
    minute: "FT",
    date: "June 11, 2026",
    time: "20:00",
    group: "Group C",
    stadium: "AT&T Stadium",
    city: "Dallas"
  },
  {
    id: "g6",
    match_number: 6,
    home_team: "Belgium",
    home_code: "BEL",
    away_team: "Netherlands",
    away_code: "NED",
    home_score: 0,
    away_score: 0,
    status: "Scheduled",
    date: "June 13, 2026",
    time: "20:00",
    group: "Group B",
    stadium: "BC Place",
    city: "Vancouver"
  },
  {
    id: "g7",
    match_number: 7,
    home_team: "Italy",
    home_code: "ITA",
    away_team: "Croatia",
    away_code: "CRO",
    home_score: 0,
    away_score: 0,
    status: "Scheduled",
    date: "June 14, 2026",
    time: "14:00",
    group: "Group D",
    stadium: "Hard Rock Stadium",
    city: "Miami"
  },
  {
    id: "g8",
    match_number: 8,
    home_team: "Uruguay",
    home_code: "URU",
    away_team: "Colombia",
    away_code: "COL",
    home_score: 0,
    away_score: 0,
    status: "Scheduled",
    date: "June 14, 2026",
    time: "17:00",
    group: "Group D",
    stadium: "Arrowhead Stadium",
    city: "Kansas City"
  }
];

export const fallbackGroups: GroupStanding[] = [
  {
    group: "Group A",
    standings: [
      { team: "Mexico", code: "MEX", played: 1, won: 1, drawn: 0, lost: 0, gf: 2, ga: 1, gd: 1, points: 3 },
      { team: "United States", code: "USA", played: 1, won: 0, drawn: 1, lost: 0, gf: 1, ga: 1, gd: 0, points: 1 },
      { team: "Canada", code: "CAN", played: 1, won: 0, drawn: 1, lost: 0, gf: 1, ga: 1, gd: 0, points: 1 },
      { team: "Argentina", code: "ARG", played: 1, won: 0, lost: 1, drawn: 0, gf: 1, ga: 2, gd: -1, points: 0 }
    ]
  },
  {
    group: "Group B",
    standings: [
      { team: "France", code: "FRA", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "England", code: "ENG", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Belgium", code: "BEL", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Netherlands", code: "NED", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  {
    group: "Group C",
    standings: [
      { team: "Brazil", code: "BRA", played: 1, won: 1, drawn: 0, lost: 0, gf: 3, ga: 2, gd: 1, points: 3 },
      { team: "Spain", code: "ESP", played: 1, won: 0, drawn: 1, lost: 0, gf: 1, ga: 1, gd: 0, points: 1 },
      { team: "Portugal", code: "POR", played: 1, won: 0, drawn: 1, lost: 0, gf: 1, ga: 1, gd: 0, points: 1 },
      { team: "Germany", code: "GER", played: 1, won: 0, drawn: 0, lost: 1, gf: 2, ga: 3, gd: -1, points: 0 }
    ]
  },
  {
    group: "Group D",
    standings: [
      { team: "Italy", code: "ITA", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Croatia", code: "CRO", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Uruguay", code: "URU", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Colombia", code: "COL", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  {
    group: "Group E",
    standings: [
      { team: "Morocco", code: "MAR", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Senegal", code: "SEN", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Japan", code: "JPN", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "South Korea", code: "KOR", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  },
  {
    group: "Group F",
    standings: [
      { team: "Australia", code: "AUS", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Ecuador", code: "ECU", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Switzerland", code: "SUI", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 },
      { team: "Denmark", code: "DEN", played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 }
    ]
  }
];
