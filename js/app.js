(function () {
  'use strict';
  const storage = window.PontoStorage;
  let config = storage.getConfig();
  let session = storage.getSession();
  let toastTimer;
  let tourIndex = 0;
  const tourSteps = [
    { target: '.hero-grid', title: 'Seu painel, de primeira', description: 'Aqui você encontra sua saudação, a data e o relógio que acompanha cada segundo da jornada.' },
    { target: '#clock-in', title: 'Comece sua jornada aqui', description: 'Toque neste botão ao iniciar o trabalho. O horário atual será salvo automaticamente e a jornada começa a ser acompanhada.' },
    { target: '.progress-card', title: 'Veja o dia ganhando forma', description: 'A barra mostra seu avanço, o tempo trabalhado e quanto falta para cumprir a jornada.' },
    { target: '.settings-panel', title: 'Personalize sua jornada', description: 'Informe seu nome e os horários da empresa. Marque o almoço como trabalhado quando ele não for descontado.' }
  ];
  const el = id => document.getElementById(id);

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const toggle = el('theme-toggle');
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro');
  }

  function pad(value) { return String(value).padStart(2, '0'); }
  function minutesToText(minutes) { const safe = Math.max(0, Math.round(minutes)); return `${pad(Math.floor(safe / 60))}h ${pad(safe % 60)}m`; }
  function timeText(timestamp) { return timestamp ? new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'; }
  function timeInputTimestamp(value) { const match = String(value).match(/^(\d{2}):(\d{2})$/); if (!match) return null; const date = new Date(); date.setHours(Number(match[1]), Number(match[2]), 0, 0); return date.getTime(); }
  function parseDuration(value) { const match = String(value).trim().match(/^(\d{1,2})(?::|h)?\s*(\d{1,2})?m?$/i); if (!match) return null; const hours = Number(match[1]); const mins = match[2] ? Number(match[2]) : 0; return hours * 60 + mins; }
  function dateKey(date) { const current = new Date(date); return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`; }
  function showToast(message) { const toast = el('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3000); }
  function closeTour() { const target = document.querySelector('.tour-highlight'); target?.classList.remove('tour-highlight'); el('tour-dialog').hidden = true; el('tour-backdrop').hidden = true; document.body.classList.remove('tour-open'); delete document.body.dataset.tourTarget; storage.markTourSeen(); }
  function renderTour() { const step = tourSteps[tourIndex]; const target = document.querySelector('.tour-highlight'); target?.classList.remove('tour-highlight'); const nextTarget = document.querySelector(step.target); nextTarget?.classList.add('tour-highlight'); nextTarget?.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.body.dataset.tourTarget = step.target.replace('#', '').replace('.', ''); el('tour-step-count').textContent = `GUIA ${tourIndex + 1} DE ${tourSteps.length}`; el('tour-title').textContent = step.title; el('tour-description').textContent = step.description; el('tour-progress-fill').style.width = `${((tourIndex + 1) / tourSteps.length) * 100}%`; el('tour-prev').disabled = tourIndex === 0; el('tour-next').textContent = tourIndex === tourSteps.length - 1 ? 'Concluir' : tourIndex === 0 ? 'Começar' : 'Próximo'; }
  function openTour() { tourIndex = 0; el('tour-dialog').hidden = false; el('tour-backdrop').hidden = false; document.body.classList.add('tour-open'); renderTour(); el('tour-next').focus(); }
  function setButtonState() {
    el('clock-in').disabled = Boolean(session.entry);
    el('lunch-start').disabled = !session.entry || Boolean(session.lunchStart) || Boolean(session.exit);
    el('lunch-end').disabled = !session.lunchStart || Boolean(session.lunchEnd) || Boolean(session.exit);
    el('clock-out').disabled = !session.entry || Boolean(session.exit) || (Boolean(session.lunchStart) && !session.lunchEnd);
  }
  function expectedExit() {
    if (!session.entry) return null;
    let breakMinutes = config.lunchPaid ? 0 : config.lunchMinutes;
    if (session.lunchStart && session.lunchEnd) breakMinutes = Math.max(0, Math.round((session.lunchEnd - session.lunchStart) / 60000));
    if (config.lunchPaid) breakMinutes = 0;
    return session.entry + (config.workdayMinutes + breakMinutes) * 60000;
  }
  function updateDashboard() {
    const now = Date.now();
    const end = expectedExit();
    let worked = 0;
    if (session.entry) {
      const finish = session.exit || now;
      worked = Math.max(0, (finish - session.entry) / 60000);
      if (session.lunchStart && !config.lunchPaid) worked -= ((session.lunchEnd || now) - session.lunchStart) / 60000;
      worked = Math.max(0, worked);
    }
    const remaining = session.entry ? Math.max(0, config.workdayMinutes - worked) : config.workdayMinutes;
    const progress = session.entry ? Math.min(100, (worked / config.workdayMinutes) * 100) : 0;
    document.body.dataset.journeyState = session.exit ? (worked > config.workdayMinutes ? 'overtime' : 'complete') : session.lunchStart && !session.lunchEnd ? 'lunch' : progress >= 85 ? 'ending' : session.entry ? 'active' : 'idle';
    el('worked-time').textContent = minutesToText(worked); el('stat-worked').textContent = minutesToText(worked);
    el('remaining-time').textContent = minutesToText(remaining); el('stat-remaining').textContent = minutesToText(remaining);
    el('entry-time').textContent = timeText(session.entry); el('expected-exit').textContent = timeText(end);
    el('progress-percent').textContent = `${Math.round(progress)}%`; el('progress-fill').style.width = `${progress}%`;
    el('progress-track')?.setAttribute('aria-valuenow', String(Math.round(progress)));
    el('progress-message').textContent = session.exit ? 'Jornada encerrada' : session.entry ? (session.lunchStart && !session.lunchEnd ? 'Almoço em andamento' : 'Jornada em andamento') : 'Registre sua entrada para começar';
    const records = [['Entrada', session.entry], ['Início do almoço', session.lunchStart], ['Volta do almoço', session.lunchEnd], ['Saída', session.exit]].filter(record => record[1]);
    el('last-record').textContent = records.length ? `Último registro: ${records[records.length - 1][0]} às ${timeText(records[records.length - 1][1])}` : 'Nenhum registro realizado hoje.';
    setButtonState();
  }
  function updateClock() { const now = new Date(); el('live-clock').textContent = now.toLocaleTimeString('pt-BR'); el('current-date').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }); if (dateKey(now) !== session.date) { session = storage.getSession(); updateDashboard(); } else updateDashboard(); }
  function record(type) { if (type === 'entry') session.entry = Date.now(); if (type === 'lunchStart') session.lunchStart = Date.now(); if (type === 'lunchEnd') session.lunchEnd = Date.now(); if (type === 'exit') session.exit = Date.now(); storage.saveSession(session); updateDashboard(); showToast('Registro salvo com sucesso.'); }
  function initSettings() { el('name-input').value = config.name; el('workday-input').value = `${pad(Math.floor(config.workdayMinutes / 60))}:${pad(config.workdayMinutes % 60)}`; el('lunch-input').value = `${pad(Math.floor(config.lunchMinutes / 60))}:${pad(config.lunchMinutes % 60)}`; el('lunch-paid-input').checked = Boolean(config.lunchPaid); el('user-name').textContent = config.name || 'Visitante'; }
  el('settings-form').addEventListener('submit', function (event) { event.preventDefault(); const workday = parseDuration(el('workday-input').value); const lunch = parseDuration(el('lunch-input').value); if (!workday || workday < 1 || lunch === null || lunch < 0) { showToast('Confira os tempos informados.'); return; } config = { name: el('name-input').value.trim(), workdayMinutes: workday, lunchMinutes: lunch, lunchPaid: el('lunch-paid-input').checked }; storage.saveConfig(config); initSettings(); updateDashboard(); showToast('Configurações atualizadas.'); });
  el('entry-adjust-form').addEventListener('submit', function (event) { event.preventDefault(); const timestamp = timeInputTimestamp(el('entry-adjust-input').value); const now = Date.now(); if (!timestamp || timestamp > now || (session.lunchStart && timestamp > session.lunchStart) || (session.exit && timestamp > session.exit)) { showToast('Informe um horário válido para a sequência do dia.'); return; } session.entry = timestamp; storage.saveSession(session); updateDashboard(); el('entry-adjust-form').closest('details').open = false; showToast('Horário de entrada ajustado.'); });
  el('clock-in').addEventListener('click', () => record('entry')); el('lunch-start').addEventListener('click', () => record('lunchStart')); el('lunch-end').addEventListener('click', () => record('lunchEnd')); el('clock-out').addEventListener('click', () => record('exit'));
  applyTheme(storage.getTheme());
  el('theme-toggle').addEventListener('click', function () { const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; storage.saveTheme(nextTheme); applyTheme(nextTheme); });
  el('tour-help').addEventListener('click', openTour);
  el('tour-next').addEventListener('click', function () { if (tourIndex === tourSteps.length - 1) { closeTour(); return; } tourIndex += 1; renderTour(); });
  el('tour-prev').addEventListener('click', function () { if (tourIndex > 0) { tourIndex -= 1; renderTour(); } });
  el('tour-skip').addEventListener('click', closeTour);
  el('tour-backdrop').addEventListener('click', closeTour);
  initSettings(); updateClock(); setInterval(updateClock, 1000);
  function maybeOpenTour() { if (!storage.hasSeenTour()) setTimeout(openTour, 450); }
  if (!document.querySelector('.app-shell').hidden) maybeOpenTour();
  document.addEventListener('ponto:authenticated', maybeOpenTour);
}());
