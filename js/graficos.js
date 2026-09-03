let evolutionChartInstance;
let genderChartInstance;
let ageChartInstance;
let subscribersChartInstance;
let trafficChartInstance;
let retentionChartInstance;
let concurrentChartInstance;

Chart.defaults.font.family = "Inter, Arial, sans-serif";
Chart.defaults.color = "#6d7890";
Chart.defaults.borderColor = "#edf0f4";

function destroyChart(chart) {
  if (chart) chart.destroy();
}

function destruirGraficosDashboard() {
  [
    evolutionChartInstance,
    genderChartInstance,
    ageChartInstance,
    subscribersChartInstance,
    trafficChartInstance
  ].forEach(chart => {
    if (chart) chart.destroy();
  });

  evolutionChartInstance = null;
  genderChartInstance = null;
  ageChartInstance = null;
  subscribersChartInstance = null;
  trafficChartInstance = null;
}

function criarGraficoEvolucao(canvas, dados, metric = "views") {
  destroyChart(evolutionChartInstance);
  evolutionChartInstance = null;

  const isViews = metric === "views";
  const labels = Array.isArray(dados?.labels) ? [...dados.labels] : [];
  const values = Array.isArray(dados?.[metric]) ? [...dados[metric]].map(Number) : [];

  evolutionChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: isViews ? "Visualizações" : "Horas assistidas",
        data: values,
        borderColor: "#b32025",
        backgroundColor: "rgba(179, 32, 37, 0.08)",
        fill: true,
        borderWidth: 2.5,
        tension: 0.36,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: chartOptions({
      yCallback: isViews
        ? value => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(value)
        : value => `${value} h`
    })
  });
}

function criarGraficoSexo(canvas, dados) {
  destroyChart(genderChartInstance);
  genderChartInstance = null;

  genderChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: dados.map(item => item.label),
      datasets: [{
        data: dados.map(item => item.value),
        backgroundColor: ["#b32025", "#e5a4a6"],
        borderWidth: 0,
        hoverOffset: 3
      }]
    },
    options: donutOptions()
  });
}

function criarGraficoIdade(canvas, dados) {
  destroyChart(ageChartInstance);
  ageChartInstance = null;

  ageChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: dados.map(item => item.label),
      datasets: [{
        data: dados.map(item => item.value),
        backgroundColor: "#b32025",
        borderRadius: 7,
        borderSkipped: false
      }]
    },
    options: chartOptions({
      legend: false,
      yMax: 35,
      yCallback: value => `${value}%`
    })
  });
}

function criarGraficoInscritos(canvas, dados) {
  destroyChart(subscribersChartInstance);
  subscribersChartInstance = null;

  subscribersChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: dados.map(item => item.label),
      datasets: [{
        data: dados.map(item => item.value),
        backgroundColor: ["#d7dce6", "#b32025"],
        borderWidth: 0,
        hoverOffset: 3
      }]
    },
    options: donutOptions()
  });
}

function criarGraficoTrafego(canvas, dados) {
  destroyChart(trafficChartInstance);
  trafficChartInstance = null;

  trafficChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: dados.map(item => item.label),
      datasets: [{
        data: dados.map(item => item.value),
        backgroundColor: "#b32025",
        borderRadius: 7,
        borderSkipped: false
      }]
    },
    options: {
      ...chartOptions({
        legend: false,
        yCallback: value => `${value}%`
      }),
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          max: 35,
          grid: { color: "#edf0f4" },
          ticks: {
            callback: value => `${value}%`,
            font: { size: 10 }
          }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}

function criarGraficoRetencao(canvas, serie, labelsCustom = null) {
  destroyChart(retentionChartInstance);

  retentionChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: labelsCustom && labelsCustom.length ? labelsCustom : ["0%", "10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"],
      datasets: [{
        label: "Retenção",
        data: serie,
        borderColor: "#b32025",
        backgroundColor: "rgba(179, 32, 37, 0.07)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2.4
      }]
    },
    options: chartOptions({
      yMax: Math.max(100, Math.ceil(Math.max(0, ...serie) / 10) * 10),
      yCallback: value => `${value}%`
    })
  });
}

function criarGraficoSimultaneos(canvas, serie, labelsCustom = null) {
  destroyChart(concurrentChartInstance);

  concurrentChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels: labelsCustom && labelsCustom.length ? labelsCustom : ["19:00", "19:10", "19:20", "19:30", "19:40", "19:50", "20:00", "20:10", "20:20", "20:30", "20:40"],
      datasets: [{
        label: "Espectadores simultâneos",
        data: serie,
        borderColor: "#b32025",
        backgroundColor: "rgba(179, 32, 37, 0.07)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2.4
      }]
    },
    options: chartOptions({
      yCallback: value => value
    })
  });
}

function donutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          padding: 16,
          font: { size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label: context => ` ${context.label}: ${context.parsed}%`
        }
      }
    }
  };
}

function chartOptions({ legend = true, yMax = undefined, yCallback = value => value } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: {
        display: legend,
        labels: {
          boxWidth: 8,
          usePointStyle: true,
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: "#172033",
        padding: 10,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      y: {
        beginAtZero: true,
        suggestedMax: yMax,
        max: yMax,
        grid: { color: "#edf0f4" },
        ticks: {
          callback: yCallback,
          font: { size: 10 }
        }
      }
    }
  };
}
