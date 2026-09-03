const DASHBOARD_DATA = {
  "30d": {
    label: "Últimos 30 dias",
    comparison: "Comparado aos 30 dias anteriores",
    metrics: {
      views: { value: 12845, change: 14.2 },
      watchHours: { value: 3286, change: 8.7 },
      avgDurationSec: { value: 1122, change: 3.1 },
      peak: { value: 247, change: 12.8 },
      subscribers: { value: 73, change: 17.7 },
      services: { value: 9, change: 0 }
    },
    evolution: {
      labels: ["04/08", "08/08", "12/08", "16/08", "20/08", "24/08", "28/08", "01/09"],
      views: [1180, 1360, 1480, 1705, 1495, 1880, 1730, 2015],
      hours: [290, 325, 361, 418, 352, 478, 446, 616]
    },
    audience: {
      gender: [
        { label: "Feminino", value: 58 },
        { label: "Masculino", value: 42 }
      ],
      age: [
        { label: "18–24", value: 12 },
        { label: "25–34", value: 21 },
        { label: "35–44", value: 29 },
        { label: "45–54", value: 23 },
        { label: "55+", value: 15 }
      ],
      cities: [
        { name: "Parnaíba", state: "PI", value: 42 },
        { name: "Teresina", state: "PI", value: 11 },
        { name: "Luís Correia", state: "PI", value: 8 },
        { name: "Fortaleza", state: "CE", value: 6 },
        { name: "São Luís", state: "MA", value: 4 }
      ],
      devices: [
        { name: "Celular", icon: "▯", share: 61, avgDurationSec: 937 },
        { name: "Smart TV", icon: "▣", share: 24, avgDurationSec: 1902 },
        { name: "Computador", icon: "▤", share: 11, avgDurationSec: 1458 },
        { name: "Tablet", icon: "▭", share: 4, avgDurationSec: 1092 }
      ],
      subscribed: [
        { label: "Não inscritos", value: 62 },
        { label: "Inscritos", value: 38 }
      ]
    },
    traffic: [
      { label: "Pesquisa do YouTube", value: 28 },
      { label: "Vídeos sugeridos", value: 23 },
      { label: "Página inicial", value: 20 },
      { label: "Links externos", value: 13 },
      { label: "Notificações", value: 8 },
      { label: "Outros", value: 8 }
    ],
    cults: [
      {
        id: 1,
        title: "Culto de Celebração",
        date: "30/08/2026",
        views: 1842,
        avgDurationSec: 1458,
        watchHours: 746,
        retention: 54,
        peak: 247,
        avgConcurrent: 138,
        subscribers: 18,
        retentionSeries: [100, 86, 78, 73, 69, 64, 60, 58, 54, 51, 47],
        concurrentSeries: [74, 98, 131, 167, 194, 223, 247, 236, 218, 187, 142]
      },
      {
        id: 2,
        title: "Culto da Família",
        date: "23/08/2026",
        views: 1514,
        avgDurationSec: 1302,
        watchHours: 548,
        retention: 49,
        peak: 221,
        avgConcurrent: 127,
        subscribers: 13,
        retentionSeries: [100, 84, 76, 70, 65, 61, 56, 53, 49, 46, 42],
        concurrentSeries: [61, 92, 116, 151, 182, 204, 221, 211, 195, 166, 123]
      },
      {
        id: 3,
        title: "Culto de Celebração",
        date: "16/08/2026",
        views: 1327,
        avgDurationSec: 1578,
        watchHours: 581,
        retention: 61,
        peak: 216,
        avgConcurrent: 132,
        subscribers: 15,
        retentionSeries: [100, 89, 83, 79, 75, 71, 68, 65, 61, 59, 55],
        concurrentSeries: [69, 96, 125, 154, 178, 198, 216, 205, 192, 173, 144]
      },
      {
        id: 4,
        title: "Culto de Celebração",
        date: "09/08/2026",
        views: 1205,
        avgDurationSec: 1094,
        watchHours: 366,
        retention: 44,
        peak: 184,
        avgConcurrent: 108,
        subscribers: 9,
        retentionSeries: [100, 81, 71, 65, 59, 54, 50, 47, 44, 41, 38],
        concurrentSeries: [58, 79, 102, 128, 151, 171, 184, 177, 161, 139, 108]
      },
      {
        id: 5,
        title: "Culto de Oração",
        date: "06/08/2026",
        views: 893,
        avgDurationSec: 1266,
        watchHours: 314,
        retention: 57,
        peak: 142,
        avgConcurrent: 91,
        subscribers: 7,
        retentionSeries: [100, 88, 81, 76, 71, 67, 64, 61, 57, 54, 51],
        concurrentSeries: [44, 61, 79, 96, 113, 132, 142, 138, 124, 109, 88]
      }
    ]
  },

  "6m": {
    label: "Últimos 6 meses",
    comparison: "Comparado aos 6 meses anteriores",
    metrics: {
      views: { value: 71420, change: 21.6 },
      watchHours: { value: 18395, change: 16.4 },
      avgDurationSec: { value: 1108, change: 5.9 },
      peak: { value: 281, change: 18.2 },
      subscribers: { value: 394, change: 24.1 },
      services: { value: 51, change: 6.2 }
    },
    evolution: {
      labels: ["Mar", "Abr", "Mai", "Jun", "Jul", "Ago"],
      views: [9120, 10180, 11140, 12040, 13460, 15480],
      hours: [2210, 2540, 2815, 3140, 3510, 4180]
    },
    audience: {
      gender: [
        { label: "Feminino", value: 57 },
        { label: "Masculino", value: 43 }
      ],
      age: [
        { label: "18–24", value: 13 },
        { label: "25–34", value: 22 },
        { label: "35–44", value: 28 },
        { label: "45–54", value: 22 },
        { label: "55+", value: 15 }
      ],
      cities: [
        { name: "Parnaíba", state: "PI", value: 39 },
        { name: "Teresina", state: "PI", value: 12 },
        { name: "Luís Correia", state: "PI", value: 9 },
        { name: "Fortaleza", state: "CE", value: 7 },
        { name: "São Luís", state: "MA", value: 5 }
      ],
      devices: [
        { name: "Celular", icon: "▯", share: 63, avgDurationSec: 914 },
        { name: "Smart TV", icon: "▣", share: 22, avgDurationSec: 1860 },
        { name: "Computador", icon: "▤", share: 11, avgDurationSec: 1398 },
        { name: "Tablet", icon: "▭", share: 4, avgDurationSec: 1060 }
      ],
      subscribed: [
        { label: "Não inscritos", value: 64 },
        { label: "Inscritos", value: 36 }
      ]
    },
    traffic: [
      { label: "Pesquisa do YouTube", value: 27 },
      { label: "Vídeos sugeridos", value: 22 },
      { label: "Página inicial", value: 19 },
      { label: "Links externos", value: 15 },
      { label: "Notificações", value: 9 },
      { label: "Outros", value: 8 }
    ],
    cults: []
  },

  "12m": {
    label: "Últimos 12 meses",
    comparison: "Comparado aos 12 meses anteriores",
    metrics: {
      views: { value: 132680, change: 29.4 },
      watchHours: { value: 33842, change: 23.7 },
      avgDurationSec: { value: 1076, change: 4.2 },
      peak: { value: 312, change: 19.8 },
      subscribers: { value: 711, change: 32.5 },
      services: { value: 102, change: 9.7 }
    },
    evolution: {
      labels: ["Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"],
      views: [7120, 7650, 8210, 8940, 9270, 9530, 10120, 10680, 11240, 12040, 13460, 15480],
      hours: [1710, 1870, 2015, 2240, 2300, 2380, 2510, 2660, 2815, 3140, 3510, 4180]
    },
    audience: {
      gender: [
        { label: "Feminino", value: 56 },
        { label: "Masculino", value: 44 }
      ],
      age: [
        { label: "18–24", value: 14 },
        { label: "25–34", value: 23 },
        { label: "35–44", value: 27 },
        { label: "45–54", value: 22 },
        { label: "55+", value: 14 }
      ],
      cities: [
        { name: "Parnaíba", state: "PI", value: 37 },
        { name: "Teresina", state: "PI", value: 13 },
        { name: "Luís Correia", state: "PI", value: 8 },
        { name: "Fortaleza", state: "CE", value: 7 },
        { name: "São Luís", state: "MA", value: 5 }
      ],
      devices: [
        { name: "Celular", icon: "▯", share: 65, avgDurationSec: 896 },
        { name: "Smart TV", icon: "▣", share: 20, avgDurationSec: 1796 },
        { name: "Computador", icon: "▤", share: 11, avgDurationSec: 1364 },
        { name: "Tablet", icon: "▭", share: 4, avgDurationSec: 1044 }
      ],
      subscribed: [
        { label: "Não inscritos", value: 66 },
        { label: "Inscritos", value: 34 }
      ]
    },
    traffic: [
      { label: "Pesquisa do YouTube", value: 26 },
      { label: "Vídeos sugeridos", value: 21 },
      { label: "Página inicial", value: 18 },
      { label: "Links externos", value: 16 },
      { label: "Notificações", value: 10 },
      { label: "Outros", value: 9 }
    ],
    cults: []
  }
};

// Para os períodos maiores, reutilizamos a amostra de cultos com pequenas variações.
// Quando a API real estiver conectada, esta parte será substituída pelos dados retornados pelo YouTube.
DASHBOARD_DATA["6m"].cults = DASHBOARD_DATA["30d"].cults.map((culto, index) => ({
  ...culto,
  id: 100 + index,
  views: Math.round(culto.views * (1.12 + index * 0.03)),
  watchHours: Math.round(culto.watchHours * (1.10 + index * 0.02))
}));

DASHBOARD_DATA["12m"].cults = DASHBOARD_DATA["30d"].cults.map((culto, index) => ({
  ...culto,
  id: 200 + index,
  views: Math.round(culto.views * (1.26 + index * 0.04)),
  watchHours: Math.round(culto.watchHours * (1.20 + index * 0.03))
}));
