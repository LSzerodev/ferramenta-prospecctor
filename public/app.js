const $ = (id) => document.getElementById(id);

const dropArea = $('dropArea');
const fileInput = $('fileInput');
const fileName = $('fileName');
const btnPipeline = $('btnPipeline');
const pipelineError = $('pipelineError');
const pipelineResult = $('pipelineResult');
const btnPipelineLocal = $('btnPipelineLocal');
const pipelineLocalError = $('pipelineLocalError');
const pipelineLocalResult = $('pipelineLocalResult');
const localDatasetName = $('localDatasetName');
const connState = $('connState');
const statPessoas = $('statPessoas');
const statClinicas = $('statClinicas');
const statInvalidos = $('statInvalidos');
const statProgress = $('statProgress');
const pillScrapper = $('pillScrapper');
const pillDbDir = $('pillDbDir');
const btnFixRamo = $('btnFixRamo');
const fixRamoOut = $('fixRamoOut');
const chkDryRun = $('chkDryRun');
const chkResetProgress = $('chkResetProgress');
const btnStartScrapper = $('btnStartScrapper');
const btnStopScrapper = $('btnStopScrapper');
const btnResetProgressOnly = $('btnResetProgressOnly');
const scrapperError = $('scrapperError');
const logBox = $('logBox');
const btnRefreshLogs = $('btnRefreshLogs');

/** @type {File | null} */
let selectedFile = null;
let logTimer = null;

function showError(el, msg) {
  if (!msg) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setFile(file) {
  selectedFile = file;
  fileName.textContent = file ? file.name : '';
  btnPipeline.disabled = !file;
}

dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0];
  setFile(f || null);
});

['dragenter', 'dragover'].forEach((ev) => {
  dropArea.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((ev) => {
  dropArea.addEventListener(ev, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
  });
});
dropArea.addEventListener('drop', (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (f && (f.type === 'application/json' || f.name.toLowerCase().endsWith('.json'))) {
    setFile(f);
    showError(pipelineError, '');
  } else {
    showError(pipelineError, 'Solte um arquivo .json');
  }
});

async function refreshDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    const d = await res.json();
    if (!d.ok) {
      connState.textContent = 'Erro na API';
      return;
    }
    connState.textContent = 'API conectada';
    statPessoas.textContent = d.counts.pessoas;
    statClinicas.textContent = d.counts.clinicas;
    statInvalidos.textContent = d.counts.invalidos;
    statProgress.textContent = d.progress?.lastIndex ?? 0;
    localDatasetName.textContent = d.pipelineLocalFile || '—';
    pillDbDir.textContent = d.dbDir || '';

    if (d.scrapperRunning) {
      pillScrapper.textContent = `Scrapper rodando (pid ${d.scrapperPid ?? '?'})`;
      pillScrapper.classList.remove('warn');
    } else {
      pillScrapper.textContent = 'Scrapper parado';
      pillScrapper.classList.add('warn');
    }
    btnStopScrapper.disabled = !d.scrapperRunning;
  } catch {
    connState.textContent = 'Offline — rode npm run serve';
    pillScrapper.textContent = 'Scrapper: ?';
    pillScrapper.classList.add('warn');
  }
}

btnPipeline.addEventListener('click', async () => {
  showError(pipelineError, '');
  pipelineResult.classList.add('hidden');
  if (!selectedFile) return;

  const fd = new FormData();
  fd.append('file', selectedFile);

  try {
    btnPipeline.disabled = true;
    const res = await fetch('/api/pipeline', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.ok) {
      showError(pipelineError, data.error || 'Falha no pipeline');
      return;
    }
    pipelineResult.textContent = JSON.stringify(
      { counts: data.counts, preview: data.preview },
      null,
      2
    );
    pipelineResult.classList.remove('hidden');
    await refreshDashboard();
  } catch (err) {
    showError(pipelineError, err.message || String(err));
  } finally {
    btnPipeline.disabled = !selectedFile;
  }
});

btnPipelineLocal.addEventListener('click', async () => {
  showError(pipelineLocalError, '');
  pipelineLocalResult.classList.add('hidden');
  try {
    btnPipelineLocal.disabled = true;
    const res = await fetch('/api/pipeline/local', { method: 'POST' });
    const data = await res.json();
    if (!data.ok) {
      showError(pipelineLocalError, data.error || 'Falha');
      return;
    }
    pipelineLocalResult.textContent = JSON.stringify(
      { counts: data.counts, source: data.source },
      null,
      2
    );
    pipelineLocalResult.classList.remove('hidden');
    await refreshDashboard();
  } catch (err) {
    showError(pipelineLocalError, err.message || String(err));
  } finally {
    btnPipelineLocal.disabled = false;
  }
});

btnFixRamo.addEventListener('click', async () => {
  fixRamoOut.classList.add('hidden');
  btnFixRamo.disabled = true;
  try {
    const res = await fetch('/api/fix-ramo', { method: 'POST' });
    const data = await res.json();
    const text =
      data.result != null
        ? JSON.stringify(data.result, null, 2)
        : data.raw || JSON.stringify(data, null, 2);
    fixRamoOut.textContent = text;
    fixRamoOut.classList.remove('hidden');
    await refreshDashboard();
  } catch (err) {
    fixRamoOut.textContent = err.message || String(err);
    fixRamoOut.classList.remove('hidden');
  } finally {
    btnFixRamo.disabled = false;
  }
});

btnResetProgressOnly.addEventListener('click', async () => {
  showError(scrapperError, '');
  try {
    const res = await fetch('/api/progress/reset', { method: 'POST' });
    const data = await res.json();
    if (!data.ok) showError(scrapperError, data.error || 'Erro');
    await refreshDashboard();
  } catch (err) {
    showError(scrapperError, err.message);
  }
});

async function fetchLogTail() {
  try {
    const res = await fetch('/api/scrapper/logs?tail=1200');
    const data = await res.json();
    if (data.ok && Array.isArray(data.lines)) {
      logBox.textContent = data.lines.join('\n');
      logBox.scrollTop = logBox.scrollHeight;
    }
  } catch {
    /* ignore */
  }
}

btnRefreshLogs.addEventListener('click', () => {
  void fetchLogTail();
});

btnStartScrapper.addEventListener('click', async () => {
  showError(scrapperError, '');
  try {
    const res = await fetch('/api/scrapper/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dryRun: chkDryRun.checked,
        reset: chkResetProgress.checked,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      showError(scrapperError, data.error || data.message || 'Erro ao iniciar');
      return;
    }
    await refreshDashboard();
    void fetchLogTail();
    void pollLogsWhileRunning();
  } catch (err) {
    showError(scrapperError, err.message);
  }
});

btnStopScrapper.addEventListener('click', async () => {
  showError(scrapperError, '');
  try {
    await fetch('/api/scrapper/stop', { method: 'POST' });
    await refreshDashboard();
  } catch (err) {
    showError(scrapperError, err.message);
  }
});

async function pollLogsWhileRunning() {
  if (logTimer) clearInterval(logTimer);
  const tick = async () => {
    await fetchLogTail();
    try {
      const st = await fetch('/api/scrapper/status');
      const s = await st.json();
      if (!s.running) {
        clearInterval(logTimer);
        logTimer = null;
        await refreshDashboard();
        await fetchLogTail();
      }
    } catch {
      /* ignore */
    }
  };
  await tick();
  logTimer = setInterval(tick, 1200);
}

refreshDashboard();
setInterval(refreshDashboard, 8000);
