(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RecommendationEngine = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function hasValue(value) {
    return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
  }

  function pct(value) {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(number(value))}%`;
  }

  function decimal(value, digits = 1) {
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(number(value));
  }

  function findNonSubscriberShare(data) {
    const rows = data?.audience?.subscribed || [];
    const row = rows.find(item => String(item?.label || "").toLocaleLowerCase("pt-BR").includes("não inscr"));
    return row && hasValue(row.value) ? number(row.value) : null;
  }

  function weightedRetention(cults) {
    const valid = (cults || []).filter(cult => hasValue(cult?.retention));
    if (!valid.length) return null;

    const weight = valid.reduce((sum, cult) => sum + Math.max(0, number(cult.views)), 0);
    if (weight > 0) {
      return valid.reduce((sum, cult) => sum + number(cult.retention) * Math.max(0, number(cult.views)), 0) / weight;
    }
    return valid.reduce((sum, cult) => sum + number(cult.retention), 0) / valid.length;
  }

  function bestBy(cults, key) {
    return (cults || [])
      .filter(item => hasValue(item?.[key]))
      .sort((a, b) => number(b[key]) - number(a[key]))[0] || null;
  }

  function retentionRecommendation(data) {
    const cults = data?.cults || [];
    const average = weightedRetention(cults);
    const best = bestBy(cults, "retention");

    if (average === null || !best) {
      return {
        key: "retention",
        title: "Retenção",
        badge: "Em processamento",
        level: "neutral",
        observation: "Os dados de retenção ainda são insuficientes ou estão em processamento para este período.",
        action: "Use os detalhes dos cultos recentes assim que o YouTube Analytics consolidar a retenção. Compare principalmente os primeiros 15 minutos e os pontos de queda da curva."
      };
    }

    const gap = number(best.retention) - average;
    const bestName = best.title || "O culto de melhor retenção";
    const observation = gap >= 1
      ? `A retenção média ponderada dos cultos foi de ${pct(average)}. ${bestName} teve o melhor resultado, com ${pct(best.retention)}, ${decimal(gap)} p.p. acima da média.`
      : `A retenção média ponderada dos cultos foi de ${pct(average)} e os melhores resultados ficaram próximos dessa média.`;

    return {
      key: "retention",
      title: "Retenção",
      badge: gap >= 5 ? "Oportunidade" : "Acompanhar",
      level: gap >= 5 ? "opportunity" : "positive",
      observation,
      action: gap >= 5
        ? "Compare abertura, duração da introdução, ritmo, transições e o momento de início da mensagem do culto com melhor retenção. Replique os elementos que também funcionarem nos próximos cultos."
        : "Mantenha o padrão dos cultos com melhor permanência e acompanhe a curva de retenção dos próximos cultos para detectar quedas recorrentes no mesmo trecho."
    };
  }

  function subscriberRecommendation(data) {
    const views = number(data?.metrics?.views?.value);
    const subscribers = number(data?.metrics?.subscribers?.value);
    const change = hasValue(data?.metrics?.subscribers?.change) ? number(data.metrics.subscribers.change) : null;
    const nonSubscribers = findNonSubscriberShare(data);
    const best = bestBy(data?.cults || [], "subscribers");
    const perThousand = views > 0 ? subscribers * 1000 / views : null;

    const pieces = [];
    if (nonSubscribers !== null) pieces.push(`${pct(nonSubscribers)} das visualizações vieram de pessoas não inscritas.`);
    if (views > 0) pieces.push(`O período gerou ${decimal(subscribers, 0)} novos inscritos, equivalente a ${decimal(perThousand)} inscritos a cada 1.000 visualizações.`);
    if (change !== null && Math.abs(change) >= 0.1) pieces.push(`Isso representa ${change > 0 ? "alta" : "queda"} de ${pct(Math.abs(change))} em relação ao período anterior.`);
    if (best && number(best.subscribers) > 0) pieces.push(`${best.title || "O melhor culto"} foi o que mais gerou inscrições (+${decimal(best.subscribers, 0)}).`);

    if (!pieces.length) {
      return {
        key: "subscribers",
        title: "Inscritos",
        badge: "Sem base suficiente",
        level: "neutral",
        observation: "Ainda não há dados suficientes para avaliar a conversão em inscritos neste período.",
        action: "Continue acompanhando inscritos ganhos por culto e a participação de visualizações de não inscritos para formar uma base comparável."
      };
    }

    const strongOpportunity = nonSubscribers !== null && nonSubscribers >= 60;
    const declining = change !== null && change < -5;
    return {
      key: "subscribers",
      title: "Inscritos",
      badge: declining ? "Atenção" : (strongOpportunity ? "Oportunidade" : "Acompanhar"),
      level: declining ? "attention" : (strongOpportunity ? "opportunity" : "positive"),
      observation: pieces.join(" "),
      action: strongOpportunity
        ? "Inclua uma chamada curta e natural para inscrição depois que o culto já entregou valor — por exemplo, após o início da mensagem — e repita perto do encerramento. Observe quais cultos convertem melhor e replique o momento e a abordagem."
        : "Mantenha chamadas discretas para inscrição e compare quais cultos geram mais inscritos por 1.000 visualizações. Use os melhores como referência de abordagem e momento do convite."
    };
  }

  function trafficAction(topTraffic) {
    const label = String(topTraffic?.label || "").toLocaleLowerCase("pt-BR");
    if (label.includes("pesquisa")) {
      return "Como a Pesquisa do YouTube é uma fonte relevante, use títulos descritivos com tema, passagem bíblica e assunto principal e mantenha a descrição coerente com o conteúdo do culto.";
    }
    if (label.includes("suger")) {
      return "Como vídeos sugeridos têm peso no alcance, conecte cultos relacionados com playlists, telas finais e uma identidade consistente de títulos e miniaturas.";
    }
    if (label.includes("extern")) {
      return "Como fontes externas têm peso no alcance, padronize a divulgação dos cultos em WhatsApp, site e redes sociais e compare quais transmissões respondem melhor a esse impulso.";
    }
    if (label.includes("navega") || label.includes("browse")) {
      return "Como os recursos de navegação têm peso no alcance, teste títulos e miniaturas de forma controlada e mantenha consistência visual para facilitar o reconhecimento dos cultos na página inicial.";
    }
    return "Teste títulos e miniaturas de forma controlada nos próximos cultos, fortaleça playlists e telas finais e compare os resultados com o período anterior, sem alterar várias coisas ao mesmo tempo.";
  }

  function viewsRecommendation(data) {
    const cults = data?.cults || [];
    const views = number(data?.metrics?.views?.value);
    const change = hasValue(data?.metrics?.views?.change) ? number(data.metrics.views.change) : null;
    const mostViewed = bestBy(cults, "views");
    const cultViews = cults.reduce((sum, cult) => sum + Math.max(0, number(cult.views)), 0);
    const concentration = mostViewed && cultViews > 0 ? number(mostViewed.views) * 100 / cultViews : null;
    const topTraffic = [...(data?.traffic || [])].sort((a, b) => number(b.value) - number(a.value))[0] || null;

    const pieces = [];
    if (change !== null) {
      if (Math.abs(change) < 0.1) pieces.push("As visualizações ficaram praticamente estáveis em relação ao período anterior.");
      else pieces.push(`As visualizações tiveram ${change > 0 ? "alta" : "queda"} de ${pct(Math.abs(change))} em relação ao período anterior.`);
    } else if (views > 0) {
      pieces.push(`O período registrou ${new Intl.NumberFormat("pt-BR").format(Math.round(views))} visualizações nos cultos analisados.`);
    }
    if (mostViewed) {
      pieces.push(`${mostViewed.title || "O culto mais visto"} liderou o alcance com ${new Intl.NumberFormat("pt-BR").format(Math.round(number(mostViewed.views)))} visualizações${concentration !== null ? ` (${pct(concentration)} do total dos cultos)` : ""}.`);
    }
    if (topTraffic) pieces.push(`${topTraffic.label} foi a principal fonte de tráfego, com ${pct(topTraffic.value)}.`);

    if (!pieces.length) {
      return {
        key: "views",
        title: "Visualizações",
        badge: "Sem base suficiente",
        level: "neutral",
        observation: "Ainda não há dados suficientes para avaliar a evolução das visualizações neste período.",
        action: "Aguarde uma base maior e acompanhe quais temas, horários e fontes de tráfego aparecem associados aos cultos de maior alcance."
      };
    }

    const declining = change !== null && change < -5;
    const growing = change !== null && change > 5;
    let action = trafficAction(topTraffic);
    if (concentration !== null && concentration >= 35 && mostViewed) {
      action += ` O alcance está concentrado em ${mostViewed.title || "um culto"}; compare tema, horário, título e formato desse culto com os demais antes de decidir o que replicar.`;
    }

    return {
      key: "views",
      title: "Visualizações",
      badge: declining ? "Atenção" : (growing ? "Bom sinal" : "Acompanhar"),
      level: declining ? "attention" : (growing ? "positive" : "opportunity"),
      observation: pieces.join(" "),
      action
    };
  }

  function buildChannelRecommendations(data) {
    return [
      retentionRecommendation(data || {}),
      subscriberRecommendation(data || {}),
      viewsRecommendation(data || {})
    ];
  }

  return { buildChannelRecommendations };
});
