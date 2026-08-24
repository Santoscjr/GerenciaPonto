(function () {
  'use strict';
  const CONFIG_KEY = 'gerenciaPonto.config';
  const SESSION_KEY = 'gerenciaPonto.session';
  const THEME_KEY = 'gerenciaPonto.theme';
  const TOUR_KEY = 'gerenciaPonto.tourSeen';
  const defaultConfig = { name: '', workdayMinutes: 528, lunchMinutes: 60, lunchPaid: false };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (error) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* storage may be unavailable */ }
  }
  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  window.PontoStorage = {
    getConfig: function () { return Object.assign({}, defaultConfig, read(CONFIG_KEY, {})); },
    saveConfig: function (config) { write(CONFIG_KEY, config); },
    getSession: function () {
      const session = read(SESSION_KEY, null);
      const today = localDateKey(new Date());
      return session && session.date === today ? session : { date: today, entry: null, lunchStart: null, lunchEnd: null, exit: null };
    },
    saveSession: function (session) { write(SESSION_KEY, session); }
    ,getTheme: function () { return localStorage.getItem(THEME_KEY) || 'light'; }
    ,saveTheme: function (theme) { try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* storage may be unavailable */ } }
    ,hasSeenTour: function () { return localStorage.getItem(TOUR_KEY) === 'true'; }
    ,markTourSeen: function () { try { localStorage.setItem(TOUR_KEY, 'true'); } catch (error) { /* storage may be unavailable */ } }
  };
}());
