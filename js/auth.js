// Gerencia login, cadastro, recuperacao de senha e encerramento de sessao.
// Handles login, signup, password recovery, and session sign-out.
(function () {
  'use strict';
  // Usa somente a chave publica anon no navegador.
  // Uses only the public anon key in the browser.
  const config = window.SUPABASE_CONFIG;
  const supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  const authGate = document.getElementById('auth-gate');
  const appShell = document.querySelector('.app-shell');
  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const nameInput = document.getElementById('auth-name');
  const authTitle = document.getElementById('auth-title');
  const authDescription = document.getElementById('auth-description');
  const authSubmit = document.getElementById('auth-submit');
  const authSwitch = document.getElementById('auth-switch');
  const authMessage = document.getElementById('auth-message');
  const forgotPassword = document.getElementById('forgot-password');
  const signOut = document.getElementById('sign-out');
  let mode = 'login';

  function setMessage(message, error) {
    authMessage.textContent = message;
    authMessage.className = error ? 'auth-message error' : 'auth-message';
  }
  // Alterna entre login e cadastro sem recarregar a pagina.
  // Switches between login and signup without reloading the page.
  function setMode(nextMode) {
    mode = nextMode;
    const signup = mode === 'signup';
    nameInput.closest('label').hidden = !signup;
    nameInput.required = signup;
    authTitle.textContent = signup ? 'Crie seu acesso' : 'Acesse sua jornada';
    authDescription.textContent = signup ? 'Seu controle de jornada, sempre com você.' : 'Entre para acessar seu controle de jornada.';
    authSubmit.textContent = signup ? 'Criar minha conta' : 'Entrar no sistema';
    authSwitch.textContent = signup ? 'Já tenho uma conta' : 'Ainda não tenho uma conta';
    forgotPassword.hidden = signup;
    setMessage('');
  }
  function showApp(user) {
    // Esconde o login antes de exibir o painel autenticado.
    // Hides login before showing the authenticated dashboard.
    authGate.hidden = true;
    appShell.hidden = false;
    document.body.classList.remove('auth-loading');
    window.PontoStorage?.setUser(user.id);
    const displayName = user.user_metadata?.name;
    if (displayName && !window.PontoStorage.getConfig().name) window.PontoStorage.saveConfig({ name: displayName, workdayMinutes: 528, lunchMinutes: 60, lunchPaid: false });
    if (displayName && document.getElementById('user-name')) document.getElementById('user-name').textContent = displayName;
    document.dispatchEvent(new CustomEvent('ponto:authenticated'));
  }
  async function loadSession() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) { authGate.hidden = false; appShell.hidden = true; document.body.classList.remove('auth-loading'); return; }
    showApp(data.session.user);
  }
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    authSubmit.disabled = true;
    setMessage('Só um instante...');
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    let result;
    if (mode === 'signup') result = await supabaseClient.auth.signUp({ email, password, options: { data: { name: nameInput.value.trim() } } });
    else result = await supabaseClient.auth.signInWithPassword({ email, password });
    authSubmit.disabled = false;
    if (result.error) { setMessage(result.error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : result.error.message, true); return; }
    if (mode === 'signup' && !result.data.session) { setMessage('Conta criada. Confirme seu e-mail para entrar.'); return; }
    showApp(result.data.user);
  });
  authSwitch.addEventListener('click', function () { setMode(mode === 'login' ? 'signup' : 'login'); });
  forgotPassword.addEventListener('click', async function () {
    if (!emailInput.value.trim()) { setMessage('Informe seu e-mail primeiro.', true); return; }
    const result = await supabaseClient.auth.resetPasswordForEmail(emailInput.value.trim(), { redirectTo: window.location.href });
    setMessage(result.error ? result.error.message : 'Link de recuperação enviado para seu e-mail.', Boolean(result.error));
  });
  signOut.addEventListener('click', async function () { await supabaseClient.auth.signOut(); appShell.hidden = true; authGate.hidden = false; setMode('login'); });
  window.PontoAuth = { client: supabaseClient };
  setMode('login');
  loadSession();
}());
