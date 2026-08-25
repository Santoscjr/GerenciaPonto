(function () {
  'use strict';
  // Sincroniza dados do usuario sem impedir o uso offline.
  // Syncs user data without blocking offline use.
  const client = window.PontoAuth?.client;

  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function toIso(timestamp) { return timestamp ? new Date(timestamp).toISOString() : null; }
  function fromIso(value) { return value ? new Date(value).getTime() : null; }

  // A nuvem complementa o fallback local e nao bloqueia o ponto offline.
  // Cloud sync complements local fallback and never blocks offline clocking.
  async function getUser() {
    if (!client) return null;
    const result = await client.auth.getUser();
    return result.data.user || null;
  }
  async function hydrate() {
    const user = await getUser();
    if (!user) return;
    // Carrega os dados remotos em paralelo para reduzir o tempo de espera.
    // Loads remote data in parallel to reduce waiting time.
    const [profileResult, settingsResult, workdayResult] = await Promise.all([
      client.from('profiles').select('name').eq('id', user.id).maybeSingle(),
      client.from('work_settings').select('workday_minutes,lunch_minutes,lunch_paid,max_overtime_minutes').eq('user_id', user.id).maybeSingle(),
      client.from('workdays').select('entry_at,lunch_start_at,lunch_end_at,exit_at,entry_source').eq('user_id', user.id).eq('work_date', localDateKey(new Date())).maybeSingle()
    ]);
    if (profileResult.data || settingsResult.data) {
      const current = JSON.parse(localStorage.getItem('gerenciaPonto.config') || '{}');
      const remote = settingsResult.data || {};
      localStorage.setItem('gerenciaPonto.config', JSON.stringify(Object.assign({}, current, profileResult.data?.name ? { name: profileResult.data.name } : {}, remote.workday_minutes ? { workdayMinutes: remote.workday_minutes } : {}, remote.lunch_minutes !== undefined ? { lunchMinutes: remote.lunch_minutes } : {}, remote.lunch_paid !== undefined ? { lunchPaid: remote.lunch_paid } : {})));
    }
    if (workdayResult.data) {
      const day = workdayResult.data;
      localStorage.setItem('gerenciaPonto.session', JSON.stringify({ date: localDateKey(new Date()), entry: fromIso(day.entry_at), lunchStart: fromIso(day.lunch_start_at), lunchEnd: fromIso(day.lunch_end_at), exit: fromIso(day.exit_at) }));
    }
    document.dispatchEvent(new CustomEvent('ponto:cloud-hydrated'));
  }
  async function syncWorkday(session) {
    const user = await getUser();
    if (!user) return;
    // Upsert garante uma jornada por usuario e data.
    // Upsert guarantees one workday per user and date.
    await client.from('workdays').upsert({ user_id: user.id, work_date: session.date, entry_at: toIso(session.entry), lunch_start_at: toIso(session.lunchStart), lunch_end_at: toIso(session.lunchEnd), exit_at: toIso(session.exit), entry_source: 'automatic', updated_at: new Date().toISOString() }, { onConflict: 'user_id,work_date' });
  }
  async function syncSettings(config) {
    const user = await getUser();
    if (!user) return;
    await Promise.all([
      client.from('profiles').upsert({ id: user.id, name: config.name, updated_at: new Date().toISOString() }),
      client.from('work_settings').upsert({ user_id: user.id, workday_minutes: config.workdayMinutes, lunch_minutes: config.lunchMinutes, lunch_paid: config.lunchPaid, updated_at: new Date().toISOString() })
    ]);
  }
  window.PontoCloud = { hydrate, syncWorkday, syncSettings };
  hydrate().catch(() => { /* local mode remains available when schema is not ready */ });
}());
