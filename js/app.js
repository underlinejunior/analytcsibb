const state = {
  period: "30d",
  rankingMetric: "views",
  data: null,
  requestId: 0,
  peaksLoading: false
};

const metricConfig = [
  { key: "views", label: "Visualizações", icon: "▶", format: formatNumber },
  { key: "watchHours", label: "Horas assistidas (total)", icon: "◷", format: value => `${formatNumber(Math.round(value))} h` },
  { key: "avgDurationSec", label: "Tempo médio por visualização", icon: "◴", format: formatDuration },
  { key: "avgViewsPerCult", label: "Média por culto", icon: "●", format: formatNumber },
  { key: "subscribers", label: "Novos inscritos", icon: "+", format: value => `+${formatNumber(value)}` },
  { key: "services", label: "Cultos analisados", icon: "▦", format: formatNumber }
];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  renderConnection("loading");
  await loadDashboard();
}

function bindEvents() {
  document.querySelectorAll(".period-btn").forEach(button => {
    button.addEventListener("click", async () => {
      document.querySelectorAll(".period-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      state.period = button.dataset.period;
      // Remove imediatamente os gráficos do período anterior para não
      // deixar 30d visível enquanto 6m/12m está sendo carregado.
      destruirGraficosDashboard();
      await loadDashboard();
    });
  });


  document.getElementById("rankingMetric").addEventListener("change", async event => {
    state.rankingMetric = event.target.value;
    if (state.rankingMetric === "peak") {
      await carregarPicosSobDemanda();
    }
    renderRanking();
  });

  document.getElementById("refreshButton").addEventListener("click", async event => {
    event.currentTarget.classList.add("refreshing");
    await loadDashboard();
    setTimeout(() => event.currentTarget.classList.remove("refreshing"), 350);
  });

  document.getElementById("mobileMenu").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
      link.classList.add("active");
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("cultModal").addEventListener("click", event => {
    if (event.target.id === "cultModal") closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });
}

function renderConnection(status = "connected", message = "") {
  const wrapper = document.getElementById("youtubeConnection");
  const text = wrapper.querySelector(".connection-text");
  const banner = document.getElementById("connectionBanner");
  const dataSourceLabel = document.getElementById("dataSourceLabel");
  const dataSourceHelp = document.getElementById("dataSourceHelp");

  wrapper.classList.remove("connected", "disconnected");

  if (status === "loading") {
    text.textContent = "Carregando dados...";
    dataSourceLabel.textContent = "Carregando dados reais...";
    dataSourceHelp.textContent = "Firebase · YouTube Analytics";
    banner.hidden = true;
    return;
  }

  if (status === "connected") {
    wrapper.classList.add("connected");
    const analyticsPending = (state.data?.recentCults || []).some(culto => culto.analyticsReady === false);
    text.textContent = state.data?.channel?.title || "YouTube conectado";
    dataSourceLabel.textContent = analyticsPending
      ? "Dados reais · Analytics em processamento"
      : "Dados reais do YouTube via Firebase";
    dataSourceHelp.textContent = analyticsPending
      ? "Retenção e tempo médio dos cultos recentes podem levar mais tempo para aparecer"
      : (state.data?.channel?.title || "Firebase · YouTube Analytics");
    banner.hidden = true;
    return;
  }

  wrapper.classList.add("disconnected");
  text.textContent = "Dados indisponíveis";
  dataSourceLabel.textContent = "Sem dados carregados";
  dataSourceHelp.textContent = "Nenhum dado fictício será exibido";
  banner.hidden = false;
  banner.innerHTML = `<strong>Não foi possível carregar os dados reais.</strong> ${escapeHtml(message || "Confira a URL do Firebase e se o coletor do Apps Script já gravou os dados.")}`;
}

async function loadDashboard() {
  const requestId = ++state.requestId;
  setLoading(true);
  renderConnection("loading");
  clearWarnings();

  if (!appsScriptConfigurado()) {
    state.data = null;
    renderConnection("error", "A URL do Firebase Realtime Database não está configurada em js/config.js.");
    renderEmptyDashboard();
    setLoading(false);
    return;
  }

  try {
    const periodoSolicitado = state.period;

    // Teste mínimo: confirma que o GitHub/qualquer navegador consegue ler
    // publicamente o mesmo Realtime Database alimentado pelo coletor.
    if (typeof testarConexaoFirebase === "function") {
      await testarConexaoFirebase();
    }

    const [dados, recentesIndependentes] = await Promise.all([
      buscarDashboard(periodoSolicitado),
      periodoSolicitado === "30d"
        ? Promise.resolve(null)
        : buscarCultosRecentes().catch(() => null)
    ]);
    if (requestId !== state.requestId) return;

    if (Array.isArray(recentesIndependentes) && recentesIndependentes.length) {
      dados.recentCults = recentesIndependentes;
    }

    // Nunca aceita um snapshot de outro período. Isso evita que um cache
    // antigo de 30d seja desenhado quando o usuário pediu 6m ou 12m.
    if (dados?.period && dados.period !== periodoSolicitado) {
      throw new Error(`O Firebase devolveu ${dados.period}, mas o período solicitado foi ${periodoSolicitado}. Atualize o banco.`);
    }

    state.data = dados;
    document.getElementById("comparisonLabel").textContent = state.data.comparison || "";

    renderConnection("connected");
    renderMetrics();
    renderRecentCults();
    renderEvolution();
    renderInsights();
    renderRanking();
    renderAudience();
    renderDiscovery();
    renderRecommendations();
    renderWarnings();
    updateLastRefresh(state.data.snapshotAt || state.data.generatedAt);
  } catch (error) {
    if (requestId !== state.requestId) return;

    state.data = null;
    renderConnection("error", error.message);
    renderEmptyDashboard();
  } finally {
    if (requestId === state.requestId) setLoading(false);
  }
}

async function carregarPicosSobDemanda() {
  if (!state.data?.cults?.length || state.peaksLoading) return;
  const candidatos = [...state.data.cults]
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .slice(0, 10);

  if (candidatos.every(item => item.peakLoaded)) return;

  state.peaksLoading = true;
  const select = document.getElementById("rankingMetric");
  select.disabled = true;
  try {
    const resposta = await buscarPicos(state.period, candidatos.map(item => item.id));
    const byId = Object.fromEntries((resposta.peaks || []).map(item => [String(item.id), item]));
    state.data.cults.forEach(culto => {
      const peak = byId[String(culto.id)];
      if (peak) {
        culto.peak = Number(peak.peak || 0);
        culto.avgConcurrent = Number(peak.average || 0);
        culto.peakLoaded = true;
      }
    });
    mergeWarnings(resposta.warnings);
  } catch (error) {
    pushWarning(`Picos simultâneos: ${error.message}`);
  } finally {
    state.peaksLoading = false;
    select.disabled = false;
    renderWarnings();
  }
}

function clearWarnings() {
  const warning = document.getElementById("apiWarning");
  warning.hidden = true;
  warning.textContent = "";
}

function mergeWarnings(items) {
  if (!state.data || !Array.isArray(items)) return;
  state.data.warnings = [...new Set([...(state.data.warnings || []), ...items.filter(Boolean)])];
}

function pushWarning(message) {
  if (!message) return;
  if (!state.data) state.data = { warnings: [] };
  mergeWarnings([message]);
  renderWarnings();
}

function renderWarnings() {
  const warning = document.getElementById("apiWarning");
  const warnings = state.data?.warnings || [];
  if (!warnings.length) {
    warning.hidden = true;
    warning.textContent = "";
    return;
  }

  warning.hidden = false;
  warning.innerHTML = `<strong>Atenção:</strong> ${escapeHtml(warnings[0])}${warnings.length > 1 ? ` (+${warnings.length - 1} aviso${warnings.length > 2 ? "s" : ""})` : ""}`;
}

function renderEmptyDashboard() {
  // Garante que um erro em 6m/12m não deixe na tela os gráficos do período anterior.
  destruirGraficosDashboard();
  document.getElementById("metricGrid").innerHTML = `<div class="empty-state" style="grid-column:1/-1">Nenhum dado real disponível no momento.</div>`;
  document.getElementById("recentCultsGrid").innerHTML = `<div class="empty-state recent-cults-empty">Dados indisponíveis.</div>`;
  document.getElementById("insightsList").innerHTML = `<div class="empty-state">Dados indisponíveis.</div>`;
  document.getElementById("rankingBody").innerHTML = `<tr><td colspan="7"><div class="empty-state">Dados indisponíveis.</div></td></tr>`;
  renderAudienceError("Dados indisponíveis.");
  document.getElementById("subscriberHighlights").innerHTML = `<div class="empty-state">Dados indisponíveis.</div>`;
  const recommendations = document.getElementById("recommendationsGrid");
  if (recommendations) recommendations.innerHTML = `<div class="empty-state recommendations-empty">Dados indisponíveis.</div>`;
}

function renderAudienceLoading() {
  criarGraficoSexo(document.getElementById("genderChart"), []);
  criarGraficoIdade(document.getElementById("ageChart"), []);
  criarGraficoInscritos(document.getElementById("subscribersChart"), []);
  document.getElementById("cityList").innerHTML = `<div class="empty-state">Carregando audiência real...</div>`;
  document.getElementById("deviceList").innerHTML = `<div class="empty-state">Carregando dispositivos...</div>`;
}

function renderAudienceError(message) {
  criarGraficoSexo(document.getElementById("genderChart"), []);
  criarGraficoIdade(document.getElementById("ageChart"), []);
  criarGraficoInscritos(document.getElementById("subscribersChart"), []);
  document.getElementById("cityList").innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  document.getElementById("deviceList").innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderMetrics() {
  const grid = document.getElementById("metricGrid");
  grid.innerHTML = metricConfig.map(item => {
    const metric = state.data.metrics?.[item.key] || { value: 0, change: null };
    return `
      <article class="metric-card">
        <div class="metric-icon">${item.icon}</div>
        <div class="metric-label">${item.label}</div>
        <strong class="metric-value">${item.format(metric.value || 0)}</strong>
        <span class="metric-change ${changeClass(metric.change)}">${formatChange(metric.change)}</span>
      </article>
    `;
  }).join("");
}


function selectRecentCults(cults, limit = 3) {
  return [...(cults || [])]
    .sort((a, b) => {
      const bTime = Date.parse(b?.startedAt || b?.dateKey || "") || 0;
      const aTime = Date.parse(a?.startedAt || a?.dateKey || "") || 0;
      if (bTime !== aTime) return bTime - aTime;
      return Number(b?.views || 0) - Number(a?.views || 0);
    })
    .slice(0, Math.max(0, Number(limit || 0)));
}

function renderRecentCults() {
  const grid = document.getElementById("recentCultsGrid");
  if (!grid) return;

  const recentSource = state.data?.recentCults?.length ? state.data.recentCults : (state.data?.cults || []);
  const recent = selectRecentCults(recentSource, 3);
  if (!recent.length) {
    grid.innerHTML = `<div class="empty-state recent-cults-empty">Nenhum culto concluído recente foi encontrado.</div>`;
    return;
  }

  grid.innerHTML = recent.map((culto, index) => {
    const peakValue = culto.peakLoaded ? formatNumber(culto.peak || 0) : "—";
    return `
      <article class="recent-cult-card" data-id="${escapeHtmlAttribute(culto.id)}" tabindex="0" role="button" aria-label="Abrir detalhes de ${escapeHtmlAttribute(culto.title)}">
        <div class="recent-cult-media">
          ${culto.thumbnail
            ? `<img src="${escapeHtmlAttribute(culto.thumbnail)}" alt="">`
            : `<div class="recent-cult-placeholder">LIVE</div>`}
          ${index === 0 ? `<span class="recent-cult-badge">Mais recente</span>` : ""}
        </div>
        <div class="recent-cult-content">
          <div class="recent-cult-heading">
            <strong>${escapeHtml(culto.title)}</strong>
            <span>${escapeHtml(culto.date || "")}</span>
          </div>
          <div class="recent-cult-stats">
            <div><span>Visualizações</span><strong>${formatNumber(culto.views)}</strong></div>
            <div><span>Tempo médio</span><strong>${formatOptionalDuration(culto.avgDurationSec)}</strong></div>
            <div><span>Retenção</span><strong>${formatOptionalPercentage(culto.retention)}</strong></div>
            <div><span>Pico ao vivo</span><strong>${peakValue}</strong></div>
          </div>
          ${culto.analyticsReady === false ? `<p class="panel-description">Retenção e tempo médio ainda estão sendo processados pelo YouTube Analytics.</p>` : ""}
          <button class="recent-cult-details" type="button" data-id="${escapeHtmlAttribute(culto.id)}">Ver detalhes</button>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".recent-cult-card").forEach(card => {
    const open = () => openCultModal(card.dataset.id);
    card.addEventListener("click", event => {
      if (event.target.closest("button")) return;
      open();
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
  grid.querySelectorAll(".recent-cult-details").forEach(button => {
    button.addEventListener("click", () => openCultModal(button.dataset.id));
  });
}

function renderEvolution() {
  const isDaily = state.period === "30d";
  const granularity = document.getElementById("evolutionGranularity");
  const title = document.getElementById("evolutionTitle");
  const description = document.getElementById("evolutionDescription");

  if (granularity) granularity.textContent = isDaily ? "Por dia" : "Por mês";
  if (title) title.textContent = isDaily
    ? "Visualizações por data da transmissão"
    : "Visualizações por mês da transmissão";
  if (description) {
    description.textContent = isDaily
      ? "Soma das visualizações atuais dos cultos transmitidos em cada dia."
      : "Soma das visualizações atuais dos cultos transmitidos em cada mês.";
  }

  criarGraficoEvolucao(
    document.getElementById("evolutionChart"),
    state.data.evolution || { labels: [], views: [] }
  );
}

function renderInsights() {
  const cults = [...(state.data.cults || [])];
  const devices = state.data.audience?.devices || [];
  const container = document.getElementById("insightsList");

  if (!cults.length) {
    container.innerHTML = `<div class="empty-state">Nenhuma transmissão ao vivo concluída foi encontrada neste período.</div>`;
    return;
  }

  const mostViewed = [...cults].sort((a, b) => b.views - a.views)[0];
  const bestRetention = [...cults].sort((a, b) => b.retention - a.retention)[0];
  const bestDuration = [...cults].sort((a, b) => b.avgDurationSec - a.avgDurationSec)[0];
  const tv = devices.find(device => device.name === "Smart TV");
  const phone = devices.find(device => device.name === "Celular");

  const insights = [
    {
      title: "Culto mais assistido",
      text: `${mostViewed.title} de ${mostViewed.date} lidera o período com ${formatNumber(mostViewed.views)} visualizações.`
    },
    {
      title: "Melhor retenção",
      text: `${bestRetention.title} de ${bestRetention.date} teve ${formatPercentage(bestRetention.retention)} de retenção média.`
    },
    {
      title: "Maior permanência",
      text: `O maior tempo médio foi ${formatDuration(bestDuration.avgDurationSec)} por visualização.`
    }
  ];

  if (tv && phone) {
    insights.push({
      title: "Comportamento por aparelho",
      text: `Na Smart TV, o tempo médio é ${formatDuration(tv.avgDurationSec)}, contra ${formatDuration(phone.avgDurationSec)} no celular.`
    });
  }

  container.innerHTML = insights.map(item => `
    <div class="insight-item">
      <strong>${item.title}</strong>
      <p>${item.text}</p>
    </div>
  `).join("");
}

function renderRanking() {
  const metric = state.rankingMetric;
  const cults = [...(state.data.cults || [])]
    .sort((a, b) => Number(b[metric] || 0) - Number(a[metric] || 0))
    .slice(0, 10);
  const body = document.getElementById("rankingBody");

  if (!cults.length) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state">Nenhum culto encontrado neste período.</div></td></tr>`;
    return;
  }

  body.innerHTML = cults.map((culto, index) => `
    <tr>
      <td><span class="rank-badge ${index < 3 ? "top" : ""}">${index + 1}</span></td>
      <td>
        <div class="cult-title">
          ${culto.thumbnail
            ? `<div class="cult-thumb"><img src="${escapeHtmlAttribute(culto.thumbnail)}" alt=""></div>`
            : `<div class="cult-thumb">LIVE</div>`}
          <div>
            <strong>${escapeHtml(culto.title)}</strong>
            <span>${culto.date}</span>
          </div>
        </div>
      </td>
      <td>${formatNumber(culto.views)}</td>
      <td>${formatDuration(culto.avgDurationSec)}</td>
      <td>${formatNumber(Math.round(culto.watchHours))} h</td>
      <td>${formatPercentage(culto.retention)}</td>
      <td><button class="details-btn" data-id="${escapeHtmlAttribute(culto.id)}">Ver detalhes</button></td>
    </tr>
  `).join("");

  document.querySelectorAll(".details-btn").forEach(button => {
    button.addEventListener("click", () => openCultModal(button.dataset.id));
  });
}


function buildCityRows(cities) {
  const rows = Array.isArray(cities) ? cities.map(city => ({ ...city })) : [];
  const informed = rows.reduce((sum, city) => sum + Number(city.value || 0), 0);
  const remainder = Math.max(0, Math.round((100 - informed) * 10) / 10);

  if (remainder >= 0.1) {
    rows.push({
      name: "Não informado ou outros",
      state: "",
      views: null,
      value: remainder
    });
  }

  return rows;
}

function renderAudience() {
  const audience = state.data.audience || {};
  criarGraficoSexo(document.getElementById("genderChart"), audience.gender || []);
  criarGraficoIdade(document.getElementById("ageChart"), audience.age || []);
  criarGraficoInscritos(document.getElementById("subscribersChart"), audience.subscribed || []);

  const cities = buildCityRows(audience.cities || []);
  document.getElementById("cityList").innerHTML = cities.length ? cities.map(city => `
    <div class="city-row">
      <div class="city-info">
        <strong>${escapeHtml(city.name)}</strong>
        <span>${escapeHtml(city.state || "")}${city.views ? ` · ${formatNumber(city.views)} visualizações` : ""}</span>
        <div class="progress-track">
          <div class="progress-bar" style="width:${Math.min(100, Number(city.value || 0))}%"></div>
        </div>
      </div>
      <span class="city-percentage">${formatPercentage(city.value)}</span>
    </div>
  `).join("") : `<div class="empty-state">Dados de cidade indisponíveis para este período.</div>`;

  const devices = audience.devices || [];
  document.getElementById("deviceList").innerHTML = devices.length ? devices.map(device => `
    <div class="device-row">
      <div class="device-name">
        <div class="device-icon">${device.icon || "•"}</div>
        <div>
          <strong>${escapeHtml(device.name)}</strong>
          <span>${device.views ? `${formatNumber(device.views)} visualizações` : "Tipo de aparelho"}</span>
        </div>
      </div>
      <div class="device-stat">
        <strong>${formatPercentage(device.share)}</strong>
        <span>das visualizações</span>
      </div>
      <div class="device-stat">
        <strong>${formatDuration(device.avgDurationSec)}</strong>
        <span>tempo médio</span>
      </div>
    </div>
  `).join("") : `<div class="empty-state">Dados de dispositivos indisponíveis para este período.</div>`;
}

function renderDiscovery() {
  criarGraficoTrafego(document.getElementById("trafficChart"), state.data.traffic || []);

  const cults = state.data.cults || [];
  const bestCult = cults.length ? [...cults].sort((a, b) => b.subscribers - a.subscribers)[0] : null;
  const nonSubscribers = (state.data.audience?.subscribed || []).find(item => item.label === "Não inscritos");

  const cards = [
    `<div class="subscriber-card">
      <span class="big">+${formatNumber(state.data.metrics?.subscribers?.value || 0)}</span>
      <span>novos inscritos no período</span>
    </div>`
  ];

  if (bestCult) {
    cards.push(`<div class="subscriber-card">
      <span class="big">+${formatNumber(bestCult.subscribers || 0)}</span>
      <span>${escapeHtml(bestCult.title)} de ${bestCult.date} foi o culto que mais gerou inscritos.</span>
    </div>`);
  }

  if (nonSubscribers) {
    cards.push(`<div class="subscriber-card">
      <span class="big">${formatPercentage(nonSubscribers.value)}</span>
      <span>da audiência ainda não é inscrita no canal.</span>
    </div>`);
  }

  document.getElementById("subscriberHighlights").innerHTML = cards.join("");
}

function renderRecommendations() {
  const container = document.getElementById("recommendationsGrid");
  if (!container) return;

  if (!window.RecommendationEngine || typeof window.RecommendationEngine.buildChannelRecommendations !== "function") {
    container.innerHTML = `<div class="empty-state recommendations-empty">Não foi possível gerar o parecer deste período.</div>`;
    return;
  }

  const items = window.RecommendationEngine.buildChannelRecommendations(state.data || {});
  const icons = { retention: "◷", subscribers: "+", views: "▶" };

  container.innerHTML = items.map(item => `
    <article class="recommendation-card ${escapeHtmlAttribute(item.level || "neutral")}">
      <div class="recommendation-header">
        <div class="recommendation-title">
          <span class="recommendation-icon">${icons[item.key] || "•"}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </div>
        <span class="recommendation-badge">${escapeHtml(item.badge || "Acompanhar")}</span>
      </div>
      <div class="recommendation-body">
        <div>
          <span class="recommendation-label">O que os dados mostram</span>
          <p>${escapeHtml(item.observation)}</p>
        </div>
        <div class="recommendation-action">
          <span class="recommendation-label">Ação recomendada</span>
          <p>${escapeHtml(item.action)}</p>
        </div>
      </div>
    </article>
  `).join("");
}

async function openCultModal(id) {
  let culto;
  try {
    culto = await buscarCulto(state.period, id);
  } catch (error) {
    pushWarning(`Detalhes do culto: ${error.message}`);
    return;
  }
  if (!culto) return;

  document.getElementById("modalTitle").textContent = culto.title;
  document.getElementById("modalDate").textContent = culto.date;

  const modalMetrics = [
    ["Visualizações", formatNumber(culto.views)],
    ["Horas assistidas", formatAnalyticsMetric(culto.watchHours, value => `${formatNumber(Math.round(value))} h`)],
    ["Tempo médio", formatAnalyticsMetric(culto.avgDurationSec, formatDuration)],
    ["Retenção", formatAnalyticsMetric(culto.retention, formatPercentage)],
    ["Pico ao vivo", formatNumber(culto.peak || 0)],
    ["Média ao vivo", formatNumber(culto.avgConcurrent || 0)]
  ];

  document.getElementById("modalMetrics").innerHTML = modalMetrics.map(([label, value]) => `
    <div class="modal-metric">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `).join("");

  const modal = document.getElementById("cultModal");
  modal.hidden = false;
  document.body.classList.add("modal-open");

  requestAnimationFrame(() => {
    criarGraficoRetencao(
      document.getElementById("retentionChart"),
      culto.retentionSeries || [],
      culto.retentionLabels || null
    );
    criarGraficoSimultaneos(
      document.getElementById("concurrentChart"),
      culto.concurrentSeries || [],
      culto.concurrentLabels || null
    );
  });
}

function closeModal() {
  document.getElementById("cultModal").hidden = true;
  document.body.classList.remove("modal-open");
}

function setLoading(loading) {
  document.body.classList.toggle("dashboard-loading", Boolean(loading));
}

function updateLastRefresh(generatedAt) {
  const date = generatedAt ? new Date(generatedAt) : new Date();
  document.getElementById("lastUpdate").textContent =
    `Dados gerados em ${date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDuration(totalSeconds) {
  const secondsValue = Math.max(0, Number(totalSeconds || 0));
  const hours = Math.floor(secondsValue / 3600);
  const minutes = Math.floor((secondsValue % 3600) / 60);
  const seconds = Math.round(secondsValue % 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatPercentage(value) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Number(value || 0))}%`;
}

function formatAnalyticsMetric(value, formatter) {
  if (value === null || value === undefined || value === "") return "Em processamento";
  return formatter(value);
}

function formatOptionalDuration(value) {
  if (value === null || value === undefined || value === "") return "—";
  return formatDuration(value);
}

function formatApiDateForDisplay(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}` : "";
}

function formatOptionalPercentage(value) {
  if (value === null || value === undefined || value === "") return "—";
  return formatPercentage(value);
}

function changeClass(change) {
  if (change === null || change === undefined || Number.isNaN(Number(change))) return "neutral";
  if (change > 0) return "positive";
  if (change < 0) return "negative";
  return "neutral";
}

function formatChange(change) {
  if (change === null || change === undefined || Number.isNaN(Number(change))) return "Sem base anterior para comparar";
  if (change > 0) return `↑ ${change.toFixed(1).replace(".", ",")}% vs. período anterior`;
  if (change < 0) return `↓ ${Math.abs(change).toFixed(1).replace(".", ",")}% vs. período anterior`;
  return "Sem variação relevante";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value);
}
