(function () {
  const config = window.DUKHUBUSTERS_CONFIG || {};
  const authConfig = {
    url: String(config.supabaseUrl || "").replace(/\/$/, ""),
    key: String(config.supabaseAnonKey || ""),
    profileTable: String(config.profileTable || "user_profiles"),
  };
  const nicknameKey = "dukhubusters.authNickname";
  const nicknamePromptKey = "dukhubusters.nicknamePrompted";
  const bannedNicknamePatterns = [
    /섹스|성관계|성기|음란|야동|자위|정액|질싸|오랄|강간/i,
    /보지|자지|좆|꼬추|유두|젖꼭지/i,
    /sex|porn|porno|hentai|nude|nudes|fuck|fucking|dick|pussy|penis|vagina|cum|oral/i,
  ];
  const state = {
    client: null,
    session: null,
    user: null,
    panel: null,
    checkedNickname: "",
  };

  window.DUKHUBUSTERS_AUTH = {
    getUser: () => state.user,
    getDisplayName: () => state.user ? displayName(state.user) : "",
    hasNickname: () => Boolean(state.user && nicknameOf(state.user)),
    openNickname: () => openNicknameModal({ required: false }),
    signIn: signInWithGoogle,
    signOut,
  };

  document.addEventListener("DOMContentLoaded", initGoogleAuth);

  async function initGoogleAuth() {
    const host = document.querySelector(".topbar-inner");
    if (!host) return;

    state.panel = document.createElement("div");
    state.panel.className = "auth-panel topbar-auth";
    state.panel.innerHTML = `<span class="auth-muted">로그인 확인 중</span>`;

    const visitorPanel = host.querySelector(".topbar-visitors");
    if (visitorPanel) host.insertBefore(state.panel, visitorPanel);
    else host.appendChild(state.panel);

    if (!authConfig.url || !authConfig.key || !window.supabase?.createClient) {
      state.panel.innerHTML = `<span class="auth-muted">로그인 준비 중</span>`;
      return;
    }

    state.client = window.supabase.createClient(authConfig.url, authConfig.key, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    renderAuthPanel(null);

    const { data } = await state.client.auth.getSession();
    state.session = data?.session || null;
    await setCurrentUser(data?.session?.user || null, { promptNickname: true });

    state.client.auth.onAuthStateChange(async (_event, session) => {
      state.session = session || null;
      await setCurrentUser(session?.user || null, { promptNickname: true });
    });
  }

  async function setCurrentUser(user, options = {}) {
    state.user = user;
    if (state.user) await hydrateProfileNickname();
    renderAuthPanel(state.user);
    applyUserToAuthorFields(state.user);
    announceAuthChange();
    if (options.promptNickname) maybePromptNickname();
  }

  function renderAuthPanel(user) {
    if (!state.panel) return;
    state.panel.textContent = "";

    if (!user) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "auth-button";
      button.textContent = "Google 로그인";
      button.addEventListener("click", signInWithGoogle);
      state.panel.appendChild(button);
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
    nicknameButton.addEventListener("click", () => openNicknameModal({ required: false }));

    const signOutButton = document.createElement("button");
    signOutButton.type = "button";
    signOutButton.className = "auth-button auth-button-secondary";
    signOutButton.textContent = "로그아웃";
    signOutButton.addEventListener("click", signOut);

    state.panel.append(profile, nicknameButton, signOutButton);
  }

  function openNicknameModal(options = {}) {
    if (!state.user || document.querySelector(".auth-modal-backdrop")) return;
    state.checkedNickname = "";

    const backdrop = document.createElement("div");
    backdrop.className = "auth-modal-backdrop";
    backdrop.innerHTML = `
      <section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authNicknameTitle">
        <div class="auth-modal-head">
          <div>
            <p>ACCOUNT</p>
            <h2 id="authNicknameTitle">닉네임 설정</h2>
          </div>
          ${options.required ? "" : `<button type="button" class="auth-modal-close" aria-label="닫기">×</button>`}
        </div>
        <p class="auth-modal-copy">사이트에서 사용할 닉네임을 등록해주세요. 중복 확인을 통과해야 저장할 수 있습니다.</p>
        <form class="auth-modal-form">
          <label class="field">
            <span>닉네임</span>
            <input id="authNicknameInput" maxlength="20" autocomplete="nickname" placeholder="2~20자 닉네임">
          </label>
          <div class="auth-modal-actions">
            <button type="button" class="auth-button auth-check-button">중복확인</button>
            <button type="submit" class="auth-button auth-save-button" disabled>저장</button>
          </div>
          <p class="auth-modal-status" aria-live="polite"></p>
        </form>
      </section>
    `;

    const input = backdrop.querySelector("#authNicknameInput");
    const status = backdrop.querySelector(".auth-modal-status");
    const saveButton = backdrop.querySelector(".auth-save-button");
    const checkButton = backdrop.querySelector(".auth-check-button");
    input.value = nicknameOf(state.user);

    input.addEventListener("input", () => {
      state.checkedNickname = "";
      saveButton.disabled = true;
      setNicknameStatus(status, "중복 확인을 해주세요.");
    });
    checkButton.addEventListener("click", async () => {
      const result = await checkNicknameAvailability(input.value);
      setNicknameStatus(status, result.message, result.ok ? "ok" : "error");
      state.checkedNickname = result.ok ? result.nickname : "";
      saveButton.disabled = !result.ok;
    });
    backdrop.querySelector(".auth-modal-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!state.checkedNickname || state.checkedNickname !== cleanNickname(input.value)) {
        setNicknameStatus(status, "저장 전에 중복 확인을 완료해주세요.", "error");
        return;
      }
      saveButton.disabled = true;
      setNicknameStatus(status, "닉네임을 저장하는 중입니다.");
      const saved = await saveNickname(state.checkedNickname);
      if (saved.ok) closeNicknameModal(backdrop);
      else {
        setNicknameStatus(status, saved.message, "error");
        saveButton.disabled = false;
      }
    });

    const closeButton = backdrop.querySelector(".auth-modal-close");
    if (closeButton) closeButton.addEventListener("click", () => closeNicknameModal(backdrop));
    backdrop.addEventListener("click", (event) => {
      if (!options.required && event.target === backdrop) closeNicknameModal(backdrop);
    });
    document.addEventListener("keydown", function handleEscape(event) {
      if (event.key !== "Escape" || options.required) return;
      document.removeEventListener("keydown", handleEscape);
      closeNicknameModal(backdrop);
    });

    document.body.appendChild(backdrop);
    input.focus();
    input.select();
    setNicknameStatus(status, "닉네임을 입력한 뒤 중복확인을 눌러주세요.");
  }

  function closeNicknameModal(backdrop) {
    backdrop.remove();
    localStorage.setItem(promptStorageKey(), "1");
  }

  function maybePromptNickname() {
    if (!state.user || nicknameOf(state.user) || localStorage.getItem(promptStorageKey()) === "1") return;
    window.setTimeout(() => openNicknameModal({ required: false }), 250);
  }

  async function hydrateProfileNickname() {
    if (!state.client || !state.user || !authConfig.profileTable) return;
    try {
      const response = await fetch(profileUrl(`?select=nickname&user_id=eq.${encodeURIComponent(state.user.id)}&limit=1`), {
        headers: authHeaders(),
      });
      if (!response.ok) return;
      const rows = await response.json();
      const nickname = cleanNickname(rows?.[0]?.nickname || "");
      if (!nickname) return;
      localStorage.setItem(nicknameKey, nickname);
      state.user = {
        ...state.user,
        user_metadata: {
          ...(state.user.user_metadata || {}),
          nickname,
          display_name: nickname,
        },
      };
    } catch {
      // Nickname storage is optional until the Supabase table is created.
    }
  }

  async function checkNicknameAvailability(value) {
    const nickname = cleanNickname(value);
    const validation = validateNickname(nickname);
    if (!validation.ok) return validation;
    if (!state.client || !state.user) return { ok: false, message: "로그인 후 사용할 수 있습니다.", nickname };

    try {
      const normalized = normalizeNickname(nickname);
      const response = await fetch(profileUrl(`?select=user_id&nickname_normalized=eq.${encodeURIComponent(normalized)}&limit=1`), {
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("profile lookup failed");
      const rows = await response.json();
      const ownerId = rows?.[0]?.user_id || "";
      if (ownerId && ownerId !== state.user.id) {
        return { ok: false, message: "이미 사용 중인 닉네임입니다.", nickname };
      }
      return { ok: true, message: "사용 가능한 닉네임입니다.", nickname };
    } catch {
      return { ok: false, message: "닉네임 저장소 연결을 확인해주세요. Supabase SQL 설정이 필요합니다.", nickname };
    }
  }

  function validateNickname(nickname) {
    if (nickname.length < 2) return { ok: false, message: "닉네임은 2자 이상이어야 합니다.", nickname };
    if (!/^[가-힣a-zA-Z0-9_ -]+$/.test(nickname)) {
      return { ok: false, message: "닉네임에는 한글, 영문, 숫자, 공백, _, -만 사용할 수 있습니다.", nickname };
    }
    if (bannedNicknamePatterns.some((pattern) => pattern.test(nickname))) {
      return { ok: false, message: "사용할 수 없는 단어가 포함되어 있습니다.", nickname };
    }
    return { ok: true, message: "", nickname };
  }

  async function saveNickname(nickname) {
    const available = await checkNicknameAvailability(nickname);
    if (!available.ok) return available;

    try {
      await saveNicknameProfile(available.nickname);
      localStorage.setItem(nicknameKey, available.nickname);
      const { data, error } = await state.client.auth.updateUser({
        data: { nickname: available.nickname, display_name: available.nickname },
      });
      if (!error && data?.user) state.user = data.user;
      renderAuthPanel(state.user);
      applyUserToAuthorFields(state.user, true);
      announceAuthChange();
      localStorage.setItem(promptStorageKey(), "1");
      return { ok: true, message: "닉네임이 저장되었습니다.", nickname: available.nickname };
    } catch {
      return { ok: false, message: "닉네임 저장에 실패했습니다. 잠시 후 다시 시도해주세요.", nickname: available.nickname };
    }
  }

  async function saveNicknameProfile(nickname) {
    const payload = {
      user_id: state.user.id,
      email: state.user.email || "",
      nickname,
      nickname_normalized: normalizeNickname(nickname),
      updated_at: new Date().toISOString(),
    };
    let response = await fetch(profileUrl(`?user_id=eq.${encodeURIComponent(state.user.id)}`), {
      method: "PATCH",
      headers: authHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      const rows = await response.json();
      if (rows.length) return rows[0];
    }
    response = await fetch(profileUrl(), {
      method: "POST",
      headers: authHeaders({ Prefer: "return=representation" }),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("profile save failed");
    const rows = await response.json();
    return rows[0];
  }

  function profileUrl(query = "") {
    return `${authConfig.url}/rest/v1/${authConfig.profileTable}${query}`;
  }

  function authHeaders(extra = {}) {
    return {
      apikey: authConfig.key,
      Authorization: `Bearer ${state.session?.access_token || authConfig.key}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  function setNicknameStatus(element, message, mode = "") {
    element.textContent = message;
    element.className = `auth-modal-status ${mode}`.trim();
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

  function normalizeNickname(value) {
    return cleanNickname(value).replace(/\s+/g, "").toLowerCase();
  }

  function promptStorageKey() {
    return `${nicknamePromptKey}.${state.user?.id || "guest"}`;
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
