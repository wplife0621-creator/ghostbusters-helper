(function () {
  const config = window.DUKHUBUSTERS_CONFIG || {};
  const authConfig = {
    url: String(config.supabaseUrl || "").replace(/\/$/, ""),
    key: String(config.supabaseAnonKey || ""),
  };
  const nicknameKey = "dukhubusters.authNickname";
  const state = {
    client: null,
    user: null,
  };
  window.DUKHUBUSTERS_AUTH = {
    getUser: () => state.user,
    signIn: signInWithGoogle,
    signOut,
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
    announceAuthChange();

    state.client.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      renderAuthPanel(panel, state.user);
      applyUserToAuthorFields(state.user);
      announceAuthChange();
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
    profile.title = user.email || "";

    const nicknameButton = document.createElement("button");
    nicknameButton.type = "button";
    nicknameButton.className = "auth-button auth-button-secondary";
    nicknameButton.textContent = "닉네임 설정";
    nicknameButton.addEventListener("click", () => editNickname(panel));

    const signOutButton = document.createElement("button");
    signOutButton.type = "button";
    signOutButton.className = "auth-button auth-button-secondary";
    signOutButton.textContent = "로그아웃";
    signOutButton.addEventListener("click", signOut);

    panel.append(profile, nicknameButton, signOutButton);
  }

  function renderNicknameEditor(panel, user) {
    panel.textContent = "";

    const form = document.createElement("form");
    form.className = "auth-nickname-form";
    form.innerHTML = `
      <label class="auth-nickname-label">
        <span>닉네임</span>
        <input class="auth-nickname-input" maxlength="20" autocomplete="nickname">
      </label>
      <button class="auth-button" type="submit">저장</button>
      <button class="auth-button auth-button-secondary" type="button" data-auth-cancel>취소</button>
    `;

    const input = form.querySelector(".auth-nickname-input");
    input.value = nicknameOf(user);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveNickname(panel, input.value);
    });
    form.querySelector("[data-auth-cancel]").addEventListener("click", () => renderAuthPanel(panel, state.user));

    panel.appendChild(form);
    input.focus();
    input.select();
  }

  function editNickname(panel) {
    if (!state.user) return;
    renderNicknameEditor(panel, state.user);
  }

  async function saveNickname(panel, value) {
    if (!state.client || !state.user) return;
    const nickname = cleanNickname(value);
    if (!nickname) {
      renderAuthPanel(panel, state.user);
      return;
    }

    localStorage.setItem(nicknameKey, nickname);
    const { data, error } = await state.client.auth.updateUser({
      data: { nickname, display_name: nickname },
    });
    if (!error && data?.user) state.user = data.user;
    renderAuthPanel(panel, state.user);
    applyUserToAuthorFields(state.user, true);
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
    return nicknameOf(user) || fallbackName(user);
  }

  function nicknameOf(user) {
    const meta = user?.user_metadata || {};
    return cleanNickname(meta.nickname || meta.display_name || localStorage.getItem(nicknameKey) || "");
  }

  function fallbackName(user) {
    const meta = user?.user_metadata || {};
    return String(meta.full_name || meta.name || user?.email || "로그인됨").trim();
  }

  function cleanNickname(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, 20);
  }

  function applyUserToAuthorFields(user, overwrite = false) {
    if (!user) return;
    const name = displayName(user);
    ["#buildAuthor", "#guideAuthor", "#reportNickname", "#quickEditNickname"].forEach((selector) => {
      const field = document.querySelector(selector);
      if (field && (overwrite || !String(field.value || "").trim())) field.value = name;
    });
  }

  function announceAuthChange() {
    window.dispatchEvent(new CustomEvent("dukhubusters:auth", {
      detail: { user: state.user },
    }));
  }
})();
