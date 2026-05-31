(function () {
  const config = window.DUKHUBUSTERS_CONFIG || {};
  const authConfig = {
    url: String(config.supabaseUrl || "").replace(/\/$/, ""),
    key: String(config.supabaseAnonKey || ""),
  };
  const state = {
    client: null,
    user: null,
  };

  document.addEventListener("DOMContentLoaded", initGoogleAuth);

  async function initGoogleAuth() {
    const host = document.querySelector(".topbar-inner");
    if (!host) return;

    const panel = document.createElement("div");
    panel.className = "auth-panel topbar-auth";
    panel.innerHTML = `<span class="auth-muted">로그인 확인 중</span>`;

    const visitorPanel = host.querySelector(".topbar-visitors");
    if (visitorPanel) host.insertBefore(panel, visitorPanel);
    else host.appendChild(panel);

    if (!authConfig.url || !authConfig.key || !window.supabase?.createClient) {
      panel.innerHTML = `<span class="auth-muted">로그인 준비 중</span>`;
      return;
    }

    state.client = window.supabase.createClient(authConfig.url, authConfig.key, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    renderAuthPanel(panel, null);

    const { data } = await state.client.auth.getSession();
    state.user = data?.session?.user || null;
    renderAuthPanel(panel, state.user);
    applyUserToAuthorFields(state.user);

    state.client.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      renderAuthPanel(panel, state.user);
      applyUserToAuthorFields(state.user);
    });
  }

  function renderAuthPanel(panel, user) {
    panel.textContent = "";

    if (!user) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "auth-button";
      button.textContent = "Google 로그인";
      button.addEventListener("click", signInWithGoogle);
      panel.appendChild(button);
      return;
    }

    const profile = document.createElement("span");
    profile.className = "auth-profile";
    profile.textContent = displayName(user);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "auth-button auth-button-secondary";
    button.textContent = "로그아웃";
    button.addEventListener("click", signOut);

    panel.append(profile, button);
  }

  async function signInWithGoogle() {
    if (!state.client) return;
    await state.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}`,
      },
    });
  }

  async function signOut() {
    if (!state.client) return;
    await state.client.auth.signOut();
  }

  function displayName(user) {
    const meta = user?.user_metadata || {};
    return String(meta.full_name || meta.name || user?.email || "로그인됨").trim();
  }

  function applyUserToAuthorFields(user) {
    if (!user) return;
    const name = displayName(user);
    ["#buildAuthor", "#guideAuthor", "#reportNickname", "#quickEditNickname"].forEach((selector) => {
      const field = document.querySelector(selector);
      if (field && !String(field.value || "").trim()) field.value = name;
    });
  }
})();
