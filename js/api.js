function firebaseConfigurado() {
  const url = String(CONFIG_APP?.FIREBASE_DATABASE_URL || "").trim();
  return /^https:\/\/.+\.(firebaseio\.com|firebasedatabase\.app)$/i.test(url);
}

// Compatibilidade com o app.js das versões anteriores.
function appsScriptConfigurado() {
  return firebaseConfigurado();
}

function firebaseBaseUrl() {
  return String(CONFIG_APP.FIREBASE_DATABASE_URL || "").trim().replace(/\/$/, "");
}

function firebaseRoot() {
  return String(CONFIG_APP.FIREBASE_ROOT || "youtubeDashboard")
    .replace(/^\/+|\/+$/g, "");
}

async function firebaseGet(path) {
  if (!firebaseConfigurado()) {
    throw new Error("A URL do Firebase Realtime Database ainda não foi configurada em js/config.js.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    Number(CONFIG_APP.TEMPO_LIMITE_MS || 8000)
  );

  const cleanPath = String(path || "").replace(/^\/+|\/+$/g, "");
  const url = `${firebaseBaseUrl()}/${cleanPath}.json?_=${Date.now()}`;

  try {
    const resposta = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      credentials: "omit",
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });

    if (!resposta.ok) {
      let detalhe = "";
      try {
        const body = await resposta.json();
        detalhe = body?.error ? `: ${body.error}` : "";
      } catch (_) {}
      throw new Error(`Firebase respondeu HTTP ${resposta.status}${detalhe}`);
    }

    return await resposta.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("O Firebase demorou demais para responder.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function buscarDashboard(periodo = "30d") {
  const dados = await firebaseGet(`${firebaseRoot()}/periods/${periodo}`);
  if (!dados) {
    throw new Error(`Ainda não há dados reais gravados no Firebase para ${periodo}.`);
  }
  return dados;
}

// Os picos ficam salvos junto dos cultos no snapshot. Esta função existe para
// manter compatibilidade com o seletor de ranking sem acessar o Apps Script.
async function buscarPicos(periodo = "30d", ids = []) {
  const dados = await buscarDashboard(periodo);
  const wanted = new Set((ids || []).map(String));
  const peaks = (dados.cults || [])
    .filter(item => wanted.has(String(item.id)))
    .map(item => ({
      id: item.id,
      peak: Number(item.peak || 0),
      average: Number(item.avgConcurrent || 0)
    }));
  return { ok: true, peaks, warnings: [] };
}

async function buscarCulto(periodo, id) {
  const [dados, detalhe] = await Promise.all([
    buscarDashboard(periodo),
    firebaseGet(`${firebaseRoot()}/details/${encodeURIComponent(id)}`).catch(() => null)
  ]);

  const basico = (dados.cults || []).find(item => String(item.id) === String(id));
  if (!basico) return null;

  // Métricas numéricas do período vêm sempre do snapshot selecionado.
  // Curvas de retenção/simultâneos vêm do detalhe persistido no Firebase.
  return {
    ...(detalhe || {}),
    ...basico,
    retentionSeries: detalhe?.retentionSeries || [],
    retentionLabels: detalhe?.retentionLabels || null,
    concurrentSeries: detalhe?.concurrentSeries || [],
    concurrentLabels: detalhe?.concurrentLabels || null,
    peak: Number(basico.peak || detalhe?.peak || 0),
    avgConcurrent: Number(basico.avgConcurrent || detalhe?.avgConcurrent || 0)
  };
}
