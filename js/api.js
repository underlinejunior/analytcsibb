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
    }, CONFIG_APP.TEMPO_LIMITE_MS || 15000);

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

// O dashboard inteiro vem de um único snapshot REAL já preparado em segundo plano.
async function buscarDashboard(periodo = "30d") {
  return jsonpAppsScript({
    action: "dashboard",
    period: periodo
  });
}

// Estas consultas só acontecem quando o usuário pede uma informação detalhada.
async function buscarPicos(periodo = "30d", ids = []) {
  const cleanIds = ids.filter(Boolean).slice(0, 10);
  if (!cleanIds.length) return { ok: true, peaks: [] };

  return jsonpAppsScript({
    action: "peaks",
    period: periodo,
    ids: cleanIds.join(",")
  });
}

async function buscarCulto(periodo, id) {
  return jsonpAppsScript({
    action: "cult",
    period: periodo,
    id: id
  });
}
