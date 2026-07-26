/* Supabase 邮箱认证与跨设备云同步。同步整份本地数据快照，服务端由 RLS 隔离用户。 */
(() => {
  const SUPABASE_URL = "https://ioovufcayedkuntyfija.supabase.co";
  const SUPABASE_KEY = "sb_publishable_gExNFObPWnyM0rk9-kyA0w_4UXgnjl0";
  const SESSION_KEY = "life-sync-session-v1";
  const SYNC_META_KEY = "life-sync-meta-v1";
  const DATA_KEYS = [
    "my-schedule-events-v1",
    "life-goals-v1",
    "life-workouts-v1",
    "life-habits-v1",
    "life-fragments-v1",
    "life-books-v1",
    "life-trips-v1",
    "life-birth-v1",
    "life-mystic-events-v1"
  ];

  let session = readJSON(SESSION_KEY, null);
  let user = session?.user || null;
  let state = user ? "idle" : "signed-out";
  let debounceTimer = null;
  let pendingUpload = false;
  let syncing = false;
  let initialized = false;

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function setState(next, message = "") {
    state = next;
    const config = {
      "signed-out": ["登录同步", ""],
      idle: [user?.email || "已连接", "online"],
      syncing: ["同步中…", "busy"],
      synced: ["已同步", "online"],
      error: [message || "同步失败", "error"]
    }[next] || ["云同步", ""];
    document.querySelectorAll("[data-sync-label]").forEach(node => {
      node.textContent = config[0];
    });
    document.querySelectorAll("[data-sync-dot]").forEach(node => {
      node.className = `sync-dot ${config[1]}`;
    });
    document.querySelectorAll("[data-sync-button]").forEach(node => {
      node.title = message || (user ? `账号：${user.email}` : "登录后在手机和电脑之间同步");
    });
  }

  async function authRequest(path, body, token = null) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body === null ? undefined : JSON.stringify(body)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.msg || data.message || data.error_description || "请求失败");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function saveSession(data) {
    if (!data?.access_token) return;
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      user: data.user
    };
    user = data.user;
    writeJSON(SESSION_KEY, session);
  }

  async function validToken() {
    if (!session?.access_token) throw new Error("请先登录");
    if ((session.expires_at || 0) > Math.floor(Date.now() / 1000) + 60) {
      return session.access_token;
    }
    if (!session.refresh_token) {
      signOutLocal();
      throw new Error("登录已过期，请重新登录");
    }
    const refreshed = await authRequest("token?grant_type=refresh_token", {
      refresh_token: session.refresh_token
    });
    saveSession(refreshed);
    return session.access_token;
  }

  async function restRequest(path, options = {}) {
    const token = await validToken();
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(
        data?.code === "PGRST205"
          ? "云同步数据表尚未创建"
          : data?.message || `云端请求失败 (${response.status})`
      );
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }
    return data;
  }

  function snapshot() {
    const data = {};
    DATA_KEYS.forEach(key => {
      const value = readJSON(key, null);
      if (value !== null) data[key] = value;
    });
    return data;
  }

  function applySnapshot(data) {
    if (!data || typeof data !== "object") return;
    DATA_KEYS.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        writeJSON(key, data[key]);
      }
    });
  }

  async function fetchCloud() {
    const rows = await restRequest(
      `life_data?user_id=eq.${encodeURIComponent(user.id)}&select=payload,updated_at&limit=1`
    );
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function upload() {
    if (!user || syncing) return;
    syncing = true;
    pendingUpload = false;
    setState("syncing");
    try {
      const rows = await restRequest("life_data?on_conflict=user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          user_id: user.id,
          payload: snapshot(),
          updated_at: new Date().toISOString()
        })
      });
      const updatedAt = rows?.[0]?.updated_at || new Date().toISOString();
      writeJSON(SYNC_META_KEY, { updatedAt });
      setState("synced");
      setTimeout(() => { if (state === "synced") setState("idle"); }, 1800);
    } catch (error) {
      pendingUpload = true;
      setState("error", error.message);
      toast(error.message);
    } finally {
      syncing = false;
      if (pendingUpload && state !== "error") schedule();
    }
  }

  async function pull({ initial = false, force = false } = {}) {
    if (!user || syncing) return;
    syncing = true;
    setState("syncing");
    try {
      const cloud = await fetchCloud();
      if (!cloud) {
        syncing = false;
        await upload();
        return;
      }
      const localMeta = readJSON(SYNC_META_KEY, {});
      const cloudTime = new Date(cloud.updated_at).getTime();
      const localTime = new Date(localMeta.updatedAt || 0).getTime();
      if (initial || force || cloudTime > localTime) {
        applySnapshot(cloud.payload);
        writeJSON(SYNC_META_KEY, { updatedAt: cloud.updated_at });
        App.refresh();
      }
      pendingUpload = false;
      setState("synced");
      setTimeout(() => { if (state === "synced") setState("idle"); }, 1800);
    } catch (error) {
      setState("error", error.message);
      toast(error.message);
    } finally {
      syncing = false;
    }
  }

  function schedule(changedKey) {
    if (!user || (changedKey && !DATA_KEYS.includes(changedKey))) return;
    pendingUpload = true;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(upload, 900);
  }

  async function signIn(email, password) {
    setState("syncing");
    const data = await authRequest("token?grant_type=password", { email, password });
    saveSession(data);
    setState("idle");
    await pull({ initial: true });
  }

  async function signUp(email, password) {
    setState("syncing");
    const data = await authRequest("signup", { email, password });
    if (data.access_token) {
      saveSession(data);
      setState("idle");
      await pull({ initial: true });
      return { signedIn: true };
    }
    setState("signed-out");
    return { signedIn: false };
  }

  function signOutLocal() {
    session = null;
    user = null;
    pendingUpload = false;
    clearTimeout(debounceTimer);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SYNC_META_KEY);
    setState("signed-out");
  }

  async function signOut() {
    try {
      if (session?.access_token) await authRequest("logout", null, session.access_token);
    } catch {
      /* 本地仍退出，避免失效 token 卡住用户。 */
    }
    signOutLocal();
    Modal.close();
    toast("已退出云同步账号");
  }

  function authModal() {
    Modal.open({
      title: "登录云同步",
      submitText: "登录",
      body: `
        <div class="sync-intro field full">
          <span class="sync-cloud-icon">☁</span>
          <div><b>手机和电脑共享同一份人生数据</b><p>首次登录会上传本机数据，之后每次修改都会自动同步。</p></div>
        </div>
        <div class="field full">
          <label for="syncEmail">邮箱</label>
          <input id="syncEmail" type="email" autocomplete="email" required placeholder="你的邮箱">
        </div>
        <div class="field full">
          <label for="syncPassword">密码（至少 6 位）</label>
          <input id="syncPassword" type="password" autocomplete="current-password" required minlength="6" placeholder="输入密码">
        </div>
        <div class="field full">
          <button type="button" class="ghost-btn" id="syncSignup">第一次使用？注册账号</button>
        </div>
        <p class="sync-help field full">数据按账号隔离。密码由 Supabase Auth 加密管理，网页不会保存密码。</p>
      `,
      async onSubmit() {
        const email = Modal.value("syncEmail");
        const password = Modal.value("syncPassword");
        if (!email || password.length < 6) {
          toast("请输入有效邮箱和至少 6 位密码");
          return;
        }
        const submit = document.getElementById("modalSubmit");
        submit.disabled = true;
        submit.textContent = "登录中…";
        try {
          await signIn(email, password);
          Modal.close();
          toast("登录成功，数据已同步");
        } catch (error) {
          setState("signed-out");
          toast(error.message === "Invalid login credentials" ? "邮箱或密码不正确；新用户请先注册" : error.message);
          submit.disabled = false;
          submit.textContent = "登录";
        }
      }
    });

    document.getElementById("syncSignup").addEventListener("click", async () => {
      const email = Modal.value("syncEmail");
      const password = Modal.value("syncPassword");
      if (!email || password.length < 6) {
        toast("请输入有效邮箱和至少 6 位密码");
        return;
      }
      const button = document.getElementById("syncSignup");
      button.disabled = true;
      button.textContent = "注册中…";
      try {
        const result = await signUp(email, password);
        Modal.close();
        toast(result.signedIn ? "注册成功，数据已同步" : "注册成功，请到邮箱确认后再登录");
      } catch (error) {
        setState("signed-out");
        toast(error.message);
        button.disabled = false;
        button.textContent = "第一次使用？注册账号";
      }
    });
  }

  function accountModal() {
    const meta = readJSON(SYNC_META_KEY, {});
    Modal.open({
      title: "云同步",
      submitText: "立即同步",
      body: `
        <div class="sync-account-card field full">
          <span class="sync-avatar">${U.esc((user.email || "我").slice(0, 1).toUpperCase())}</span>
          <div><b>${U.esc(user.email || "")}</b><p>已连接 Supabase 云端</p></div>
          <span class="sync-connected">已登录</span>
        </div>
        <div class="field full">
          <div class="sync-detail"><span>同步内容</span><b>日程、目标、训练、习惯、碎片、学习档案、人生清单、命盘记录</b></div>
          <div class="sync-detail"><span>上次同步</span><b>${meta.updatedAt ? new Date(meta.updatedAt).toLocaleString("zh-CN") : "准备同步"}</b></div>
        </div>
        <div class="field full">
          <button type="button" class="ghost-btn sync-signout" id="syncSignout">退出账号</button>
        </div>
        <p class="sync-help field full">在另一台设备用相同邮箱登录，即可读取同一份数据。</p>
      `,
      async onSubmit() {
        const button = document.getElementById("modalSubmit");
        button.disabled = true;
        button.textContent = "同步中…";
        await pull({ force: true });
        Modal.close();
        toast("已同步最新云端数据");
      }
    });
    document.getElementById("syncSignout").addEventListener("click", signOut);
  }

  function open() {
    if (user) accountModal();
    else authModal();
  }

  async function restore() {
    if (!session) {
      setState("signed-out");
      return;
    }
    setState("syncing");
    try {
      await validToken();
      user = session.user;
      setState("idle");
      await pull({ initial: true });
    } catch {
      signOutLocal();
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;
    document.querySelectorAll("[data-sync-button]").forEach(button => {
      button.addEventListener("click", open);
    });
    window.addEventListener("focus", () => {
      if (user && !pendingUpload) pull();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && user && !pendingUpload) pull();
    });
    restore();
  }

  window.CloudSync = {
    init,
    open,
    schedule,
    pull,
    getUser: () => user,
    getState: () => state
  };
})();
