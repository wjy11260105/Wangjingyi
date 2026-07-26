/* 碎片记录：快速收集想法、灵感、疑问、摘录与参考资料。 */
(() => {
  const { esc, uuid, toDateKey } = U;
  const STORAGE_KEY = "life-fragments-v1";
  const TYPES = {
    thought: { label: "想法", icon: "💭", color: "#4b745e", bg: "#e5f0e9" },
    inspiration: { label: "灵感", icon: "✨", color: "#a26329", bg: "#fff0df" },
    question: { label: "疑问", icon: "❓", color: "#72538a", bg: "#f4ecfa" },
    quote: { label: "摘录", icon: "✒️", color: "#496a93", bg: "#eaf0f8" },
    reference: { label: "资料", icon: "🔗", color: "#786d37", bg: "#f6f1d9" }
  };

  let fragments = [];
  let activeType = "all";
  let searchText = "";

  function load() {
    const saved = Store.get(STORAGE_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  const save = () => Store.set(STORAGE_KEY, fragments);
  const formatTime = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    });
  };

  function visibleFragments() {
    const query = searchText.trim().toLowerCase();
    return fragments
      .filter(item => activeType === "all" || item.type === activeType)
      .filter(item => !query || [item.content, item.tags?.join(" "), item.source]
        .some(value => String(value || "").toLowerCase().includes(query)))
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
        || (b.createdAt || "").localeCompare(a.createdAt || ""));
  }

  function renderList() {
    const root = document.getElementById("fragmentList");
    if (!root) return;
    const visible = visibleFragments();
    root.innerHTML = visible.length ? visible.map(item => {
      const type = TYPES[item.type] || TYPES.thought;
      return `
        <article class="fragment-card ${item.organized ? "organized" : ""}">
          <div class="fragment-card-head">
            <span class="badge" style="color:${type.color};background:${type.bg}">${type.icon} ${type.label}</span>
            <span class="fragment-time">${formatTime(item.createdAt)}</span>
            ${item.pinned ? `<span class="fragment-pin">置顶</span>` : ""}
          </div>
          <div class="fragment-content">${esc(item.content)}</div>
          ${item.source ? `<div class="fragment-source">来源：${esc(item.source)}</div>` : ""}
          ${item.tags?.length ? `<div class="fragment-tags">${item.tags.map(tag => `<span>#${esc(tag)}</span>`).join("")}</div>` : ""}
          <div class="fragment-actions">
            <button type="button" data-fragment-action="pin" data-id="${item.id}">${item.pinned ? "取消置顶" : "置顶"}</button>
            <button type="button" data-fragment-action="organize" data-id="${item.id}">${item.organized ? "移回收件箱" : "标记已整理"}</button>
            <button type="button" data-fragment-action="edit" data-id="${item.id}">编辑</button>
          </div>
        </article>`;
    }).join("") : `<div class="empty">还没有匹配的碎片记录</div>`;

    root.querySelectorAll("[data-fragment-action]").forEach(button => {
      button.addEventListener("click", () => {
        const item = fragments.find(record => record.id === button.dataset.id);
        if (!item) return;
        if (button.dataset.fragmentAction === "pin") {
          item.pinned = !item.pinned;
          save();
          App.refresh();
        } else if (button.dataset.fragmentAction === "organize") {
          item.organized = !item.organized;
          save();
          App.refresh();
        } else {
          openEditor(item);
        }
      });
    });
  }

  function addQuickFragment() {
    const content = document.getElementById("fragmentQuickText").value.trim();
    if (!content) {
      toast("先写下一点内容");
      return;
    }
    const tags = document.getElementById("fragmentQuickTags").value
      .split(/[,，\s]+/).map(tag => tag.replace(/^#/, "").trim()).filter(Boolean);
    fragments.unshift({
      id: uuid(),
      content,
      type: document.getElementById("fragmentQuickType").value,
      tags: [...new Set(tags)],
      source: document.getElementById("fragmentQuickSource").value.trim(),
      date: toDateKey(new Date()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      organized: false
    });
    save();
    App.refresh();
    toast("碎片已收进来");
  }

  function render(root) {
    fragments = load();
    const today = toDateKey(new Date());
    const todayCount = fragments.filter(item => (item.date || (item.createdAt || "").slice(0, 10)) === today).length;
    const inboxCount = fragments.filter(item => !item.organized).length;
    const organizedCount = fragments.filter(item => item.organized).length;

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">FRAGMENTS</p>
          <h1>先捕捉，再慢慢整理。</h1>
        </div>
      </header>
      <section class="fragment-composer">
        <textarea id="fragmentQuickText" maxlength="3000" placeholder="此刻有什么想法、灵感、疑问或值得留下的信息？"></textarea>
        <div class="fragment-composer-tools">
          <select id="fragmentQuickType">
            ${Object.entries(TYPES).map(([key, type]) => `<option value="${key}">${type.icon} ${type.label}</option>`).join("")}
          </select>
          <input id="fragmentQuickTags" maxlength="100" placeholder="标签，用空格分隔">
          <input id="fragmentQuickSource" maxlength="200" placeholder="来源或链接（可空）">
          <span>Ctrl / ⌘ + Enter 保存</span>
          <button class="primary-btn" id="saveFragment">保存碎片</button>
        </div>
      </section>
      <section class="stats fragment-stats">
        <article class="stat primary">
          <div class="stat-label">碎片收件箱</div>
          <div class="stat-value">${inboxCount}</div>
          <div class="stat-sub">先记录，不急着分类完美</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">今天记录</div>
          <div class="stat-value">${todayCount}</div>
          <div class="stat-sub">保留下今天的思考</div>
        </article>
        <article class="stat">
          <div class="stat-label">已整理</div>
          <div class="stat-value">${organizedCount}</div>
          <div class="stat-sub">可以继续转化为学习或输出</div>
        </article>
      </section>
      <div class="fragment-toolbar">
        <div class="filters">
          <button class="filter ${activeType === "all" ? "active" : ""}" data-fragment-type="all">全部</button>
          ${Object.entries(TYPES).map(([key, type]) =>
            `<button class="filter ${activeType === key ? "active" : ""}" data-fragment-type="${key}">${type.label}</button>`
          ).join("")}
        </div>
        <input id="fragmentSearch" type="search" placeholder="搜索内容、标签或来源" value="${esc(searchText)}">
      </div>
      <div class="fragment-list" id="fragmentList"></div>
    `;

    document.getElementById("saveFragment").addEventListener("click", addQuickFragment);
    document.getElementById("fragmentQuickText").addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") addQuickFragment();
    });
    root.querySelectorAll("[data-fragment-type]").forEach(button => {
      button.addEventListener("click", () => {
        activeType = button.dataset.fragmentType;
        App.refresh();
      });
    });
    document.getElementById("fragmentSearch").addEventListener("input", event => {
      searchText = event.target.value;
      renderList();
    });
    renderList();
  }

  function openEditor(item) {
    Modal.open({
      title: "编辑碎片",
      body: `
        <div class="field full">
          <label for="fragmentEditContent">内容</label>
          <textarea id="fragmentEditContent" maxlength="3000">${esc(item.content)}</textarea>
        </div>
        <div class="field">
          <label for="fragmentEditType">类型</label>
          <select id="fragmentEditType">
            ${Object.entries(TYPES).map(([key, type]) =>
              `<option value="${key}" ${item.type === key ? "selected" : ""}>${type.icon} ${type.label}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label for="fragmentEditTags">标签</label>
          <input id="fragmentEditTags" maxlength="100" value="${esc((item.tags || []).join(" "))}">
        </div>
        <div class="field full">
          <label for="fragmentEditSource">来源或链接</label>
          <input id="fragmentEditSource" maxlength="200" value="${esc(item.source || "")}">
        </div>
      `,
      onSubmit() {
        const content = Modal.value("fragmentEditContent");
        if (!content) {
          toast("内容不能为空");
          return;
        }
        item.content = content;
        item.type = Modal.value("fragmentEditType");
        item.tags = [...new Set(Modal.value("fragmentEditTags").split(/[,，\s]+/)
          .map(tag => tag.replace(/^#/, "").trim()).filter(Boolean))];
        item.source = Modal.value("fragmentEditSource");
        item.updatedAt = new Date().toISOString();
        save();
        Modal.close();
        App.refresh();
        toast("碎片已更新");
      },
      onDelete() {
        if (!confirm("确定删除这条碎片吗？")) return;
        fragments = fragments.filter(record => record.id !== item.id);
        save();
        Modal.close();
        App.refresh();
        toast("碎片已删除");
      }
    });
  }

  window.FragmentsModule = { STORAGE_KEY };
  App.register("fragments", { render });
})();
