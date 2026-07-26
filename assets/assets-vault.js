/* 物品管理与客户端加密账户保管箱。主密码与明文密码不会写入存储。 */
(() => {
  const { esc, uuid, toDateKey, fmtCN } = U;
  const ITEMS_KEY = "life-items-v1";
  const ACCOUNTS_KEY = "life-accounts-v1";
  const VAULT_KEY = "life-vault-settings-v1";
  const VERIFIER_TEXT = "life-vault-verifier-v1";
  const LOCK_AFTER_MS = 10 * 60 * 1000;

  const ITEM_CATEGORIES = {
    electronics: { label: "数码电器", icon: "💻" },
    home: { label: "家居生活", icon: "🏡" },
    sport: { label: "运动装备", icon: "🏃" },
    photo: { label: "摄影器材", icon: "📷" },
    coffee: { label: "咖啡器具", icon: "☕" },
    other: { label: "其他", icon: "📦" }
  };

  let activeTab = "items";
  let items = [];
  let accounts = [];
  let vaultCryptoKey = null;
  let lockTimer = null;

  const loadItems = () => {
    const saved = Store.get(ITEMS_KEY, null);
    if (Array.isArray(saved)) return saved;
    const initial = [{
      id: uuid(),
      name: "德龙咖啡机",
      category: "coffee",
      purchaseDate: "",
      price: null,
      merchant: "",
      warrantyUntil: "",
      serial: "",
      link: "",
      note: "记录咖啡参数和日常使用体验"
    }];
    Store.set(ITEMS_KEY, initial);
    return initial;
  };
  const loadAccounts = () => {
    const saved = Store.get(ACCOUNTS_KEY, []);
    return Array.isArray(saved) ? saved : [];
  };
  const saveItems = () => Store.set(ITEMS_KEY, items);
  const saveAccounts = () => Store.set(ACCOUNTS_KEY, accounts);

  function bytesToBase64(bytes) {
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  async function deriveVaultKey(password, saltBase64) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey({
      name: "PBKDF2",
      salt: base64ToBytes(saltBase64),
      iterations: 310000,
      hash: "SHA-256"
    }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  async function encryptSecret(value, key = vaultCryptoKey) {
    if (!key) throw new Error("保管箱尚未解锁");
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(value)
    );
    return {
      iv: bytesToBase64(iv),
      data: bytesToBase64(new Uint8Array(encrypted))
    };
  }

  async function decryptSecret(payload, key = vaultCryptoKey) {
    if (!payload?.iv || !payload?.data) return "";
    if (!key) throw new Error("保管箱尚未解锁");
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
      key,
      base64ToBytes(payload.data)
    );
    return new TextDecoder().decode(decrypted);
  }

  function resetLockTimer() {
    clearTimeout(lockTimer);
    if (vaultCryptoKey) lockTimer = setTimeout(lockVault, LOCK_AFTER_MS);
  }

  function lockVault() {
    vaultCryptoKey = null;
    clearTimeout(lockTimer);
    if (App.current === "assets" && activeTab === "accounts") App.refresh();
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function render(root) {
    items = loadItems();
    accounts = loadAccounts();
    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">ASSETS & ACCOUNTS</p>
          <h1>管理拥有的物品，也管理数字生活。</h1>
        </div>
      </header>
      <div class="filters asset-tabs">
        <button class="filter ${activeTab === "items" ? "active" : ""}" data-asset-tab="items">📦 我的物品</button>
        <button class="filter ${activeTab === "accounts" ? "active" : ""}" data-asset-tab="accounts">🔐 账户保管箱</button>
      </div>
      <div id="assetBody">${activeTab === "items" ? renderItems() : renderAccounts()}</div>
    `;

    root.querySelectorAll("[data-asset-tab]").forEach(button => button.addEventListener("click", () => {
      activeTab = button.dataset.assetTab;
      App.refresh();
    }));
    if (activeTab === "items") bindItems(root);
    else bindAccounts(root);
  }

  /* ================= 物品 ================= */
  function renderItems() {
    const totalValue = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    const today = toDateKey(new Date());
    const next90 = toDateKey(U.addDays(new Date(), 90));
    const warrantyDue = items.filter(item => item.warrantyUntil && item.warrantyUntil >= today && item.warrantyUntil <= next90).length;
    return `
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">已记录物品</div>
          <div class="stat-value">${items.length} 件</div>
          <div class="stat-sub">了解自己拥有什么</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">购买投入</div>
          <div class="stat-value">¥${totalValue.toLocaleString()}</div>
          <div class="stat-sub">有价格记录的物品合计</div>
        </article>
        <article class="stat">
          <div class="stat-label">即将过保</div>
          <div class="stat-value">${warrantyDue}</div>
          <div class="stat-sub">未来 90 天</div>
        </article>
      </section>
      <div class="calendar-toolbar">
        <h2 class="block-title" style="margin:0">物品档案</h2>
        <button class="primary-btn" id="addItem">＋ <span class="btn-text">添加物品</span></button>
      </div>
      <div class="inventory-grid">
        ${items.length ? items.map(item => {
          const category = ITEM_CATEGORIES[item.category] || ITEM_CATEGORIES.other;
          return `<button class="inventory-card" data-item-id="${item.id}">
            <span class="inventory-icon">${category.icon}</span>
            <span class="inventory-main">
              <strong>${esc(item.name)}</strong>
              <small>${category.label}${item.merchant ? ` · ${esc(item.merchant)}` : ""}</small>
              <span>
                ${item.purchaseDate ? `购买 ${fmtCN(item.purchaseDate)}` : "购买日期未记录"}
                ${item.warrantyUntil ? ` · 保修至 ${fmtCN(item.warrantyUntil)}` : ""}
              </span>
            </span>
            <span class="inventory-price">${item.price ? `¥${Number(item.price).toLocaleString()}` : "—"}</span>
          </button>`;
        }).join("") : `<div class="empty" style="grid-column:1/-1">还没有物品记录</div>`}
      </div>
    `;
  }

  function bindItems(root) {
    document.getElementById("addItem").addEventListener("click", () => openItemEditor());
    root.querySelectorAll("[data-item-id]").forEach(button => button.addEventListener("click", () => {
      openItemEditor(items.find(item => item.id === button.dataset.itemId));
    }));
  }

  function openItemEditor(item = null) {
    Modal.open({
      title: item ? "编辑物品" : "添加物品",
      body: `
        <div class="field full">
          <label for="assetName">物品名称</label>
          <input id="assetName" required maxlength="80" placeholder="例如：德龙咖啡机" value="${esc(item?.name || "")}">
        </div>
        <div class="field">
          <label for="assetCategory">分类</label>
          <select id="assetCategory">${Object.entries(ITEM_CATEGORIES).map(([key, category]) =>
            `<option value="${key}" ${item?.category === key ? "selected" : ""}>${category.icon} ${category.label}</option>`
          ).join("")}</select>
        </div>
        <div class="field">
          <label for="assetPrice">购买价格（元）</label>
          <input id="assetPrice" type="number" min="0" step="0.01" value="${item?.price ?? ""}">
        </div>
        <div class="field">
          <label for="assetPurchaseDate">购买日期</label>
          <input id="assetPurchaseDate" type="date" value="${item?.purchaseDate || ""}">
        </div>
        <div class="field">
          <label for="assetWarranty">保修到期日</label>
          <input id="assetWarranty" type="date" value="${item?.warrantyUntil || ""}">
        </div>
        <div class="field">
          <label for="assetMerchant">购买商家</label>
          <input id="assetMerchant" maxlength="60" value="${esc(item?.merchant || "")}">
        </div>
        <div class="field">
          <label for="assetSerial">序列号</label>
          <input id="assetSerial" maxlength="100" value="${esc(item?.serial || "")}">
        </div>
        <div class="field full">
          <label for="assetLink">说明书或商品链接</label>
          <input id="assetLink" maxlength="300" value="${esc(item?.link || "")}">
        </div>
        <div class="field full">
          <label for="assetNote">使用心得与备注</label>
          <textarea id="assetNote" maxlength="1000">${esc(item?.note || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const data = {
          id: item?.id || uuid(),
          name: Modal.value("assetName"),
          category: Modal.value("assetCategory"),
          price: Modal.value("assetPrice") === "" ? null : Number(Modal.value("assetPrice")),
          purchaseDate: Modal.value("assetPurchaseDate"),
          warrantyUntil: Modal.value("assetWarranty"),
          merchant: Modal.value("assetMerchant"),
          serial: Modal.value("assetSerial"),
          link: Modal.value("assetLink"),
          note: Modal.value("assetNote")
        };
        const index = items.findIndex(record => record.id === data.id);
        if (index >= 0) items[index] = data;
        else items.unshift(data);
        saveItems();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "物品已更新" : "物品已添加");
      },
      onDelete: item ? () => {
        if (!confirm("确定删除这件物品吗？")) return;
        items = items.filter(record => record.id !== item.id);
        saveItems();
        Modal.close();
        App.refresh();
        toast("物品已删除");
      } : null
    });
  }

  /* ================= 加密账户 ================= */
  function renderAccounts() {
    const settings = Store.get(VAULT_KEY, null);
    if (!settings) return renderVaultSetup();
    if (!vaultCryptoKey) return renderVaultLocked();
    resetLockTimer();
    return `
      <section class="vault-banner">
        <span class="vault-lock-icon">🔓</span>
        <div><strong>保管箱已解锁</strong><p>密码只在当前浏览器内存中解密，10 分钟无操作后自动锁定。</p></div>
        <button class="ghost-btn small" id="lockVault">立即锁定</button>
      </section>
      <div class="calendar-toolbar">
        <div><h2 class="block-title" style="margin:0">账户索引</h2><span class="hint">${accounts.length} 个账户</span></div>
        <button class="primary-btn" id="addAccount">＋ <span class="btn-text">添加账户</span></button>
      </div>
      <div class="account-grid">
        ${accounts.length ? accounts.map(account => `
          <article class="account-card">
            <div class="account-card-head">
              <span class="account-platform-icon">${esc((account.platform || "?").slice(0, 1).toUpperCase())}</span>
              <div><strong>${esc(account.platform)}</strong><small>${esc(account.username || account.email || "未填写账户名")}</small></div>
              ${account.twoFactor ? `<span class="account-2fa">2FA</span>` : ""}
            </div>
            <div class="account-password-row">
              <code data-password-id="${account.id}">••••••••••••</code>
              <button type="button" data-account-action="reveal" data-id="${account.id}">显示</button>
              <button type="button" data-account-action="copy" data-id="${account.id}">复制</button>
            </div>
            <div class="account-card-actions">
              ${safeHttpUrl(account.url) ? `<a href="${esc(safeHttpUrl(account.url))}" target="_blank" rel="noopener">打开网站</a>` : "<span></span>"}
              <button type="button" data-account-action="edit" data-id="${account.id}">编辑</button>
            </div>
          </article>`).join("") : `<div class="empty" style="grid-column:1/-1">保管箱中还没有账户</div>`}
      </div>
      <p class="vault-warning">忘记主密码后无法恢复已加密的密码。请勿将主密码与任何网站密码设为相同。</p>
    `;
  }

  function renderVaultSetup() {
    return `
      <section class="vault-gate">
        <span class="vault-gate-icon">🔐</span>
        <h2>创建加密保管箱</h2>
        <p>设置一个独立主密码。主密码不会保存或上传，账户密码会经 PBKDF2 派生密钥后使用 AES-GCM 加密。</p>
        <div class="vault-fields">
          <div class="field"><label for="vaultNewPassword">主密码（至少 8 位）</label><input id="vaultNewPassword" type="password" autocomplete="new-password"></div>
          <div class="field"><label for="vaultConfirmPassword">再次输入</label><input id="vaultConfirmPassword" type="password" autocomplete="new-password"></div>
          <button class="primary-btn" id="setupVault">创建并解锁</button>
        </div>
        <small>重要：忘记主密码将无法恢复账户密码。建议仍优先使用 Bitwarden 或 1Password。</small>
      </section>
    `;
  }

  function renderVaultLocked() {
    return `
      <section class="vault-gate">
        <span class="vault-gate-icon">🔒</span>
        <h2>账户保管箱已锁定</h2>
        <p>输入主密码后仅在本次页面会话中解锁。</p>
        <div class="vault-fields single">
          <div class="field"><label for="vaultPassword">主密码</label><input id="vaultPassword" type="password" autocomplete="current-password"></div>
          <button class="primary-btn" id="unlockVault">解锁</button>
        </div>
        <small>主密码不会发送到 Supabase。</small>
      </section>
    `;
  }

  function bindAccounts(root) {
    if (document.getElementById("setupVault")) {
      document.getElementById("setupVault").addEventListener("click", setupVault);
      return;
    }
    if (document.getElementById("unlockVault")) {
      document.getElementById("unlockVault").addEventListener("click", unlockVault);
      document.getElementById("vaultPassword").addEventListener("keydown", event => {
        if (event.key === "Enter") unlockVault();
      });
      return;
    }
    document.getElementById("lockVault").addEventListener("click", lockVault);
    document.getElementById("addAccount").addEventListener("click", () => openAccountEditor());
    root.querySelectorAll("[data-account-action]").forEach(button => {
      button.addEventListener("click", () => handleAccountAction(button));
    });
  }

  async function setupVault() {
    const password = document.getElementById("vaultNewPassword").value;
    const confirm = document.getElementById("vaultConfirmPassword").value;
    if (password.length < 8) {
      toast("主密码至少需要 8 位");
      return;
    }
    if (password !== confirm) {
      toast("两次输入的主密码不一致");
      return;
    }
    const button = document.getElementById("setupVault");
    button.disabled = true;
    button.textContent = "正在创建…";
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltBase64 = bytesToBase64(salt);
      const key = await deriveVaultKey(password, saltBase64);
      const verifier = await encryptSecret(VERIFIER_TEXT, key);
      Store.set(VAULT_KEY, { version: 1, salt: saltBase64, verifier, iterations: 310000 });
      vaultCryptoKey = key;
      resetLockTimer();
      App.refresh();
      toast("加密保管箱已创建");
    } catch {
      button.disabled = false;
      button.textContent = "创建并解锁";
      toast("当前浏览器不支持加密保管箱");
    }
  }

  async function unlockVault() {
    const password = document.getElementById("vaultPassword").value;
    if (!password) {
      toast("请输入主密码");
      return;
    }
    const button = document.getElementById("unlockVault");
    button.disabled = true;
    button.textContent = "解锁中…";
    try {
      const settings = Store.get(VAULT_KEY, null);
      const key = await deriveVaultKey(password, settings.salt);
      const verified = await decryptSecret(settings.verifier, key);
      if (verified !== VERIFIER_TEXT) throw new Error("invalid");
      vaultCryptoKey = key;
      resetLockTimer();
      App.refresh();
      toast("保管箱已解锁");
    } catch {
      button.disabled = false;
      button.textContent = "解锁";
      toast("主密码不正确");
    }
  }

  async function handleAccountAction(button) {
    const account = accounts.find(record => record.id === button.dataset.id);
    if (!account) return;
    resetLockTimer();
    if (button.dataset.accountAction === "edit") {
      await openAccountEditor(account);
      return;
    }
    if (button.dataset.accountAction === "reveal") {
      const code = document.querySelector(`[data-password-id="${account.id}"]`);
      if (code && code.textContent !== "••••••••••••") {
        code.textContent = "••••••••••••";
        button.textContent = "显示";
        return;
      }
    }
    try {
      const password = await decryptSecret(account.password);
      if (button.dataset.accountAction === "copy") {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(password);
        else {
          const input = document.createElement("textarea");
          input.value = password;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          input.remove();
        }
        toast("密码已复制，请注意剪贴板安全");
      } else {
        const code = document.querySelector(`[data-password-id="${account.id}"]`);
        code.textContent = password || "未设置密码";
        button.textContent = "隐藏";
        setTimeout(() => {
          if (code) code.textContent = "••••••••••••";
          if (button) button.textContent = "显示";
        }, 15000);
      }
    } catch {
      toast("解密失败，请重新锁定后解锁");
    }
  }

  async function openAccountEditor(account = null) {
    resetLockTimer();
    let currentPassword = "";
    if (account?.password) {
      try { currentPassword = await decryptSecret(account.password); }
      catch {
        toast("无法解密该账户");
        return;
      }
    }
    Modal.open({
      title: account ? "编辑账户" : "添加账户",
      body: `
        <div class="field full">
          <label for="accountPlatform">平台名称</label>
          <input id="accountPlatform" maxlength="80" placeholder="必填，例如：某学习平台" value="${esc(account?.platform || "")}">
        </div>
        <div class="field">
          <label for="accountUsername">账户名</label>
          <input id="accountUsername" maxlength="100" autocomplete="off" value="${esc(account?.username || "")}">
        </div>
        <div class="field">
          <label for="accountEmail">绑定邮箱</label>
          <input id="accountEmail" type="text" inputmode="email" maxlength="120" autocomplete="off" placeholder="可选，不限制格式" value="${esc(account?.email || "")}">
        </div>
        <div class="field full">
          <label for="accountPassword">密码（加密保存）</label>
          <input id="accountPassword" type="password" maxlength="300" autocomplete="new-password" value="${esc(currentPassword)}">
        </div>
        <div class="field full">
          <label for="accountUrl">登录网址</label>
          <input id="accountUrl" maxlength="300" placeholder="https://" value="${esc(account?.url || "")}">
        </div>
        <div class="field">
          <label><input id="account2fa" type="checkbox" style="width:auto;height:auto;margin-right:7px" ${account?.twoFactor ? "checked" : ""}>已开启双重验证</label>
        </div>
        <div class="field full">
          <label for="accountRecovery">恢复方式</label>
          <input id="accountRecovery" maxlength="200" placeholder="备用邮箱、恢复码保存位置等" value="${esc(account?.recovery || "")}">
        </div>
        <div class="field full">
          <label for="accountNote">备注（此字段不加密，请勿写入敏感信息）</label>
          <textarea id="accountNote" maxlength="500">${esc(account?.note || "")}</textarea>
        </div>
      `,
      async onSubmit() {
        const platform = Modal.value("accountPlatform");
        if (!platform) {
          toast("请填写平台名称");
          Modal.field("accountPlatform")?.focus();
          return;
        }
        if (!vaultCryptoKey) {
          toast("保管箱已锁定，请先解锁再保存");
          return;
        }
        if (!window.crypto?.subtle) {
          toast("当前页面环境不支持加密，请用 HTTPS 打开");
          return;
        }
        const submit = document.getElementById("modalSubmit");
        const previousText = submit.textContent;
        submit.disabled = true;
        submit.textContent = "加密保存中…";
        try {
          const encryptedPassword = await encryptSecret(Modal.field("accountPassword").value);
          const data = {
            id: account?.id || uuid(),
            platform,
            username: Modal.value("accountUsername"),
            email: Modal.value("accountEmail"),
            password: encryptedPassword,
            url: Modal.value("accountUrl"),
            twoFactor: Boolean(Modal.field("account2fa")?.checked),
            recovery: Modal.value("accountRecovery"),
            note: Modal.value("accountNote"),
            updatedAt: new Date().toISOString()
          };
          /* 保存前重新读取，避免同步刷新后内存列表过期导致覆盖丢失。 */
          accounts = loadAccounts();
          const index = accounts.findIndex(record => record.id === data.id);
          if (index >= 0) accounts[index] = data;
          else accounts.unshift(data);
          saveAccounts();
          resetLockTimer();
          Modal.close();
          App.refresh();
          toast(index >= 0 ? "账户已更新并加密" : "账户已加密保存");
        } catch (error) {
          submit.disabled = false;
          submit.textContent = previousText || "保存";
          toast(error?.message ? `保存失败：${error.message}` : "密码加密失败，请重试");
        }
      },
      onDelete: account ? () => {
        if (!confirm("确定删除这个账户吗？加密密码也会一并删除。")) return;
        accounts = accounts.filter(record => record.id !== account.id);
        saveAccounts();
        Modal.close();
        App.refresh();
        toast("账户已删除");
      } : null
    });
  }

  window.AssetsVaultModule = { ITEMS_KEY, ACCOUNTS_KEY, VAULT_KEY };
  App.register("assets", { render });
})();
