// Mantem um fallback local para funcionamento offline.
// Keeps a local fallback for offline operation.
(function () {
  'use strict';

  // Cada chave representa uma responsabilidade diferente do aplicativo.
  // Each key represents a different application responsibility.
  const CONFIG_KEY = 'gerenciaPonto.config';
  const SESSION_KEY = 'gerenciaPonto.session';
  const THEME_KEY = 'gerenciaPonto.theme';
  const TOUR_KEY = 'gerenciaPonto.tourSeen';
  let userKey = 'anonymous';
  const defaultConfig = {
    name: '',
    workdayMinutes: 528,
    lunchMinutes: 60,
    lunchPaid: false
  };

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // O modo local continua disponivel mesmo sem armazenamento.
      // Local mode remains available when storage is unavailable.
    }
  }

  function scopedKey(key) {
    return `${key}.${userKey}`;
  }

  // Usa a data local para evitar troca de jornada na virada UTC.
  // Uses local date to avoid changing workdays at the UTC boundary.
  function localDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  window.PontoStorage = {
    setUser: function (userId) {
      userKey = userId || 'anonymous';
    },

    getConfig: function () {
      return Object.assign({}, defaultConfig, read(scopedKey(CONFIG_KEY), {}));
    },

    saveConfig: function (config) {
      write(scopedKey(CONFIG_KEY), config);
    },

    getSession: function () {
      const session = read(scopedKey(SESSION_KEY), null);
      const today = localDateKey(new Date());
      return session && session.date === today
        ? session
        : { date: today, entry: null, lunchStart: null, lunchEnd: null, exit: null };
    },

    saveSession: function (session) {
      write(scopedKey(SESSION_KEY), session);
    },

    consumeDailyGreeting: function () {
      const today = localDateKey(new Date());
      const key = scopedKey('gerenciaPonto.greeting');
      if (localStorage.getItem(key) === today) return false;
      try { localStorage.setItem(key, today); } catch (error) { return true; }
      return true;
    },

    getTheme: function () {
      return localStorage.getItem(THEME_KEY) || 'light';
    },

    saveTheme: function (theme) {
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (error) {
        // A preferencia visual nao deve impedir o uso do sistema.
        // A visual preference must not prevent system usage.
      }
    },

    hasSeenTour: function () {
      return localStorage.getItem(scopedKey(TOUR_KEY)) === 'true';
    },

    markTourSeen: function () {
      try {
        localStorage.setItem(scopedKey(TOUR_KEY), 'true');
      } catch (error) {
        // O tutorial continua podendo ser exibido novamente.
        // The tutorial can still be displayed again.
      }
    }
  };
}());
