let AUTH_STATUS = {
  configured: false,
  connected: false,
  channel: null,
  source: "demo"
};

function appsScriptConfigurado() {
  const url = String(CONFIG_APP?.APPS_SCRIPT_URL || "").trim();
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/i.test(url);
}

function jsonpAppsScript(params = {}) {
  return new Promise((resolve, reject) => {
    if (!appsScriptConfigurado()) {
      reject(new Error("URL do Google Apps Script ainda não configurada."));
      return;
    }

    const callbackName = `__ibb_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("O Google Apps Script demorou demais para responder."));
    }, CONFIG_APP.TEMPO_LIMITE_MS || 30000);

    function cleanup() {
      window.clearTimeout(timeout);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      script.remove();
    }

    window[callbackName] = payload => {
      cleanup();
      if (payload && payload.ok === false) {
        reject(new Error(payload.error || "Falha ao consultar o Apps Script."));
        return;
      }
      resolve(payload);
    };

    const query = new URLSearchParams({
      ...params,
      callback: callbackName,
      _: Date.now().toString()
    });

    script.src = `${CONFIG_APP.APPS_SCRIPT_URL}?${query.toString()}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("Não foi possível acessar o Google Apps Script."));
    };

    document.head.appendChild(script);
  });
}

async function buscarStatusAutenticacao() {
  if (!appsScriptConfigurado()) {
    AUTH_STATUS = {
      configured: false,
      connected: false,
      channel: null,
      source: "demo"
    };
    return AUTH_STATUS;
  }

  try {
    const resposta = await jsonpAppsScript({ action: "status" });
    AUTH_STATUS = {
      configured: true,
      connected: Boolean(resposta?.connected),
      channel: resposta?.channel || null,
      source: "apps-script"
    };
  } catch (error) {
    AUTH_STATUS = {
      configured: true,
      connected: false,
      channel: null,
      source: "error",
      error: error.message
    };
  }

  return AUTH_STATUS;
}

async function buscarDashboard(periodo = "30d") {
  if (!appsScriptConfigurado() || !AUTH_STATUS.connected) {
    return {
      ...DASHBOARD_DATA[periodo],
      source: "demo",
      warnings: AUTH_STATUS.error ? [AUTH_STATUS.error] : []
    };
  }

  try {
    const dados = await jsonpAppsScript({
      action: "dashboard",
      period: periodo
    });
    return dados;
  } catch (error) {
    return {
      ...DASHBOARD_DATA[periodo],
      source: "demo",
      warnings: [`Falha ao consultar o YouTube pelo Apps Script: ${error.message}`]
    };
  }
}

async function buscarCulto(periodo, id) {
  if (appsScriptConfigurado() && AUTH_STATUS.connected) {
    try {
      return await jsonpAppsScript({
        action: "cult",
        period: periodo,
        id: id
      });
    } catch (error) {
      console.warn(error);
    }
  }

  const dados = DASHBOARD_DATA[periodo] || DASHBOARD_DATA["30d"];
  return dados.cults.find(culto => String(culto.id) === String(id)) || null;
}
