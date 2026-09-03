const state = {
  period: "30d",
  rankingMetric: "views",
  evolutionMetric: "views",
  data: null,
  auth: null
};

const metricConfig = [
  { key: "views", label: "Visualizações", icon: "▶", format: formatNumber },
  { key: "watchHours", label: "Horas assistidas", icon: "◷", format: value => `${formatNumber(Math.round(value))} h` },
  { key: "avgDurationSec", label: "Tempo médio", icon: "◴", format: formatDuration },
  { key: "peak", label: "Pico ao vivo", icon: "●", format: formatNumber },
  { key: "subscribers", label: "Novos inscritos", icon: "+", format: value => `+${formatNumber(value)}` },
  { key: "services", label: "Cultos analisados", icon: "▦", format: formatNumber }
];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  state.auth = await buscarStatusAutenticacao();
  renderConnection();
  await loadDashboard();
  updateLastRefresh();
}

function bindEvents() {
  document.querySelectorAll(".period-btn").forEach(button => {
    button.addEventListener("click", async () => {
      document.querySelectorAll(".period-btn").forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
      state.period = button.dataset.period;
      await loadDashboard();
      updateLastRefresh();
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

  document.getElementById("rankingMetric").addEventListener("change", event => {
    state.rankingMetric = event.target.value;
    renderRanking();
  });

  document.getElementById("refreshButton").addEventListener("click", async event => {
    event.currentTarget.classList.add("refreshing");
    state.auth = await buscarStatusAutenticacao();
    renderConnection();
    await loadDashboard();
    updateLastRefresh();
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

function renderConnection() {
  const wrapper = document.getElementById("youtubeConnection");
  const text = wrapper.querySelector(".connection-text");
  const banner = document.getElementById("connectionBanner");
  const dataSourceLabel = document.getElementById("dataSourceLabel");
  const dataSourceHelp = document.getElementById("dataSourceHelp");

  wrapper.classList.remove("connected", "disconnected");

  if (state.auth?.connected) {
    wrapper.classList.add("connected");
    text.textContent = state.auth.channel?.title || "YouTube conectado";
    banner.hidden = true;
    dataSourceLabel.textContent = "Dados reais do YouTube";
    dataSourceHelp.textContent = state.auth.channel?.title || "Google Apps Script";
    return;
  }

  wrapper.classList.add("disconnected");
  text.textContent = "Modo demonstração";
  dataSourceLabel.textContent = "Dados demonstrativos";
  banner.hidden = false;

  if (!state.auth?.configured) {
    banner.innerHTML = `<strong>Falta só uma configuração.</strong> Cole a URL <code>/exec</code> do Google Apps Script em <code>js/config.js</code>.`;
    dataSourceHelp.textContent = "Apps Script ainda não configurado";
  } else {
    banner.innerHTML = `<strong>Apps Script configurado, mas sem acesso aos dados.</strong> ${escapeHtml(state.auth?.error || "Confira a implantação e as permissões do canal.")}`;
    dataSourceHelp.textContent = "Confira a implantação do Apps Script";
  }
}

async function loadDashboard() {
  setLoading(true);
  try {
    state.data = await buscarDashboard(state.period);
    document.getElementById("comparisonLabel").textContent = state.data.comparison;

    renderMetrics();
    renderEvolution();
    renderInsights();
    renderRanking();
    renderAudience();
    renderDiscovery();
    renderWarnings();

    if (state.data.source === "youtube" && state.data.channel) {
      document.getElementById("dataSourceLabel").textContent = "Dados reais do YouTube";
      document.getElementById("dataSourceHelp").textContent = state.data.channel.title;
    }
  } finally {
    setLoading(false);
  }
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
  warning.innerHTML = `<strong>Atenção:</strong> ${warnings[0]}${warnings.length > 1 ? ` (+${warnings.length - 1} aviso${warnings.length > 2 ? "s" : ""})` : ""}`;
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
  const culto = await buscarCulto(state.period, id);
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

function updateLastRefresh() {
  document.getElementById("lastUpdate").textContent =
    `Atualizado em ${new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
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
