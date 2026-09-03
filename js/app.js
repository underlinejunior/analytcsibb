const state = {
  period: "30d",
  rankingMetric: "views",
  evolutionMetric: "views",
  data: null,
  requestId: 0,
  peaksLoading: false
};

const metricConfig = [
  { key: "views", label: "Visualizações", icon: "▶", format: formatNumber },
  { key: "watchHours", label: "Horas assistidas", icon: "◷", format: value => `${formatNumber(Math.round(value))} h` },
  { key: "avgDurationSec", label: "Tempo médio", icon: "◴", format: formatDuration },
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

  document.querySelectorAll(".chart-toggle-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".chart-toggle-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      state.evolutionMetric = button.dataset.metric;
      renderEvolution();
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
    text.textContent = state.data?.channel?.title || "YouTube conectado";
    dataSourceLabel.textContent = "Dados reais do YouTube via Firebase";
    dataSourceHelp.textContent = state.data?.channel?.title || "Firebase · YouTube Analytics";
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
    await testarConexaoFirebase();

    const dados = await buscarDashboard(periodoSolicitado);
    if (requestId !== state.requestId) return;

    // Nunca aceita um snapshot de outro período. Isso evita que um cache
    // antigo de 30d seja desenhado quando o usuário pediu 6m ou 12m.
    if (dados?.period && dados.period !== periodoSolicitado) {
      throw new Error(`O Firebase devolveu ${dados.period}, mas o período solicitado foi ${periodoSolicitado}. Atualize o banco.`);
    }

    state.data = dados;
    document.getElementById("comparisonLabel").textContent = state.data.comparison || "";

    renderConnection("connected");
    renderMetrics();
    renderEvolution();
    renderInsights();
    renderRanking();
    renderAudience();
    renderDiscovery();
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
  document.getElementById("insightsList").innerHTML = `<div class="empty-state">Dados indisponíveis.</div>`;
  document.getElementById("rankingBody").innerHTML = `<tr><td colspan="7"><div class="empty-state">Dados indisponíveis.</div></td></tr>`;
  renderAudienceError("Dados indisponíveis.");
  document.getElementById("subscriberHighlights").innerHTML = `<div class="empty-state">Dados indisponíveis.</div>`;
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

function renderEvolution() {
  criarGraficoEvolucao(
    document.getElementById("evolutionChart"),
    state.data.evolution || { labels: [], views: [], hours: [] },
    state.evolutionMetric
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
      title: "Maior audiência",
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

function renderAudience() {
  const audience = state.data.audience || {};
  criarGraficoSexo(document.getElementById("genderChart"), audience.gender || []);
  criarGraficoIdade(document.getElementById("ageChart"), audience.age || []);
  criarGraficoInscritos(document.getElementById("subscribersChart"), audience.subscribed || []);

  const cities = audience.cities || [];
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
    ["Horas assistidas", `${formatNumber(Math.round(culto.watchHours || 0))} h`],
    ["Tempo médio", formatDuration(culto.avgDurationSec)],
    ["Retenção", formatPercentage(culto.retention)],
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
