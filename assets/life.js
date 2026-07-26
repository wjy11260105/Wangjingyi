/* 阅读书单 & 人生清单 */
(() => {
  const { toDateKey, esc, uuid, fmtCN } = U;
  const BOOKS_KEY = "life-books-v1";
  const TRIPS_KEY = "life-trips-v1";

  /* ================= 阅读 ================= */
  const BOOK_STATUS = {
    reading: { label: "在读", color: "#4b8b6d", bg: "#e6f2eb" },
    wish: { label: "想读", color: "#6a82c5", bg: "#eaf0ff" },
    done: { label: "读完", color: "#a64d28", bg: "#fff0e8" }
  };

  const bookSamples = () => ([
    { id: uuid(), title: "纳瓦尔宝典", author: "埃里克·乔根森", status: "reading", progress: 40, rating: 0, note: "" },
    { id: uuid(), title: "当我谈跑步时我谈些什么", author: "村上春树", status: "wish", progress: 0, rating: 0, note: "" }
  ]);

  function loadBooks() {
    const saved = Store.get(BOOKS_KEY, null);
    if (Array.isArray(saved)) return saved;
    const samples = bookSamples();
    Store.set(BOOKS_KEY, samples);
    return samples;
  }

  let books = loadBooks();
  let bookFilter = "all";
  const saveBooks = () => Store.set(BOOKS_KEY, books);
  const stars = n => n ? "★".repeat(n) + "☆".repeat(5 - n) : "";

  function renderReading(root) {
    books = loadBooks();
    const year = String(new Date().getFullYear());
    const doneThisYear = books.filter(book => book.status === "done" && (book.finishedAt || "").startsWith(year)).length;
    const visible = bookFilter === "all" ? books : books.filter(book => book.status === bookFilter);

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">READING</p>
          <h1>读过的书，都会长在身上。</h1>
        </div>
        <div class="top-actions">
          <button class="primary-btn" id="addBookBtn">＋ <span class="btn-text">添加书籍</span></button>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">今年读完</div>
          <div class="stat-value">${doneThisYear} 本</div>
          <div class="stat-sub">按读完日期统计</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">在读</div>
          <div class="stat-value">${books.filter(book => book.status === "reading").length}</div>
          <div class="stat-sub">正在进行的阅读</div>
        </article>
        <article class="stat">
          <div class="stat-label">想读清单</div>
          <div class="stat-value">${books.filter(book => book.status === "wish").length}</div>
          <div class="stat-sub">保持好奇心</div>
        </article>
      </section>
      <div class="calendar-toolbar">
        <h2 class="block-title" style="margin:0">我的书架</h2>
        <div class="filters">
          <button class="filter ${bookFilter === "all" ? "active" : ""}" data-bf="all">全部</button>
          ${Object.entries(BOOK_STATUS).map(([key, status]) =>
            `<button class="filter ${bookFilter === key ? "active" : ""}" data-bf="${key}">${status.label}</button>`).join("")}
        </div>
      </div>
      <div class="book-grid">
        ${visible.length ? visible.map(book => {
          const status = BOOK_STATUS[book.status];
          return `<button class="book-card" data-id="${book.id}">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
              <h4>${esc(book.title)}</h4>
              <span class="badge" style="color:${status.color};background:${status.bg}">${status.label}</span>
            </div>
            <span class="author">${esc(book.author || "佚名")}</span>
            ${book.status === "reading" ? `<div class="goal-progress-row"><div class="progress"><span style="width:${book.progress || 0}%"></span></div><b>${book.progress || 0}%</b></div>` : ""}
            ${book.status === "done" && book.rating ? `<span class="stars">${stars(book.rating)}</span>` : ""}
            ${book.note ? `<span class="book-note">${esc(book.note)}</span>` : ""}
          </button>`;
        }).join("") : `<div class="empty" style="grid-column:1/-1">书架空空，添加第一本书吧</div>`}
      </div>
    `;

    document.getElementById("addBookBtn").addEventListener("click", () => openBookEditor());
    root.querySelectorAll("[data-bf]").forEach(button => button.addEventListener("click", () => {
      bookFilter = button.dataset.bf;
      App.refresh();
    }));
    root.querySelectorAll(".book-card").forEach(button => button.addEventListener("click", () => {
      openBookEditor(books.find(book => book.id === button.dataset.id));
    }));
  }

  function openBookEditor(book = null) {
    Modal.open({
      title: book ? "编辑书籍" : "添加书籍",
      body: `
        <div class="field full">
          <label for="bkTitle">书名</label>
          <input id="bkTitle" required maxlength="60" placeholder="书名" value="${esc(book?.title || "")}">
        </div>
        <div class="field">
          <label for="bkAuthor">作者</label>
          <input id="bkAuthor" maxlength="40" placeholder="作者" value="${esc(book?.author || "")}">
        </div>
        <div class="field">
          <label for="bkStatus">状态</label>
          <select id="bkStatus">
            ${Object.entries(BOOK_STATUS).map(([key, status]) =>
              `<option value="${key}" ${book?.status === key ? "selected" : ""}>${status.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="bkProgress">阅读进度 %</label>
          <input id="bkProgress" type="number" min="0" max="100" value="${book?.progress || 0}">
        </div>
        <div class="field">
          <label for="bkRating">评分（读完后 1-5）</label>
          <select id="bkRating">
            ${[0, 1, 2, 3, 4, 5].map(n =>
              `<option value="${n}" ${book?.rating === n ? "selected" : ""}>${n === 0 ? "暂不评分" : "★".repeat(n)}</option>`).join("")}
          </select>
        </div>
        <div class="field full">
          <label for="bkNote">摘录与笔记</label>
          <textarea id="bkNote" maxlength="500" placeholder="喜欢的句子、自己的思考…">${esc(book?.note || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const status = Modal.value("bkStatus");
        const data = {
          id: book?.id || uuid(),
          title: Modal.value("bkTitle"),
          author: Modal.value("bkAuthor"),
          status,
          progress: status === "done" ? 100 : Number(Modal.value("bkProgress")) || 0,
          rating: Number(Modal.value("bkRating")) || 0,
          note: Modal.value("bkNote"),
          finishedAt: status === "done" ? (book?.finishedAt || toDateKey(new Date())) : null
        };
        const index = books.findIndex(record => record.id === data.id);
        if (index >= 0) books[index] = data;
        else books.unshift(data);
        saveBooks();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "书籍已更新" : "书籍已添加");
      },
      onDelete: book ? () => {
        if (!confirm("确定从书架删除这本书吗？")) return;
        books = books.filter(record => record.id !== book.id);
        saveBooks();
        Modal.close();
        App.refresh();
        toast("已删除");
      } : null
    });
  }

  /* ================= 人生清单（兼容原旅行数据） ================= */
  const LIFE_CATEGORIES = {
    travel: { label: "旅行", icon: "✈️" },
    experience: { label: "体验", icon: "✨" },
    skill: { label: "技能", icon: "🧩" },
    creation: { label: "创作", icon: "🎨" },
    life: { label: "生活", icon: "🏡" },
    career: { label: "事业学习", icon: "🌱" },
    relation: { label: "关系家庭", icon: "🤝" },
    other: { label: "其他", icon: "💫" }
  };
  const LIFE_STATUSES = {
    idea: { label: "有想法", color: "#6a82c5", bg: "#eaf0ff" },
    planned: { label: "已计划", color: "#9b6c27", bg: "#faf0d9" },
    active: { label: "进行中", color: "#347259", bg: "#e3f0e8" },
    done: { label: "已完成", color: "#a64d28", bg: "#fff0e8" },
    paused: { label: "已搁置", color: "#7d7680", bg: "#efedf0" }
  };

  const lifeSamples = () => ([
    {
      id: uuid(), title: "去苏州拍一组旗袍写真", category: "experience", status: "idea",
      reason: "留下具有东方审美的一次人生体验", nextAction: "筛选三家摄影工作室",
      targetDate: "", location: "苏州", budget: null, checklist: ["找摄影工作室", "选择旗袍和妆造"], reflection: ""
    },
    {
      id: uuid(), title: "学会使用德龙咖啡机", category: "skill", status: "active",
      reason: "建立稳定的日常咖啡体验", nextAction: "固定粉量，测试三档研磨度",
      targetDate: "", location: "家", budget: null, checklist: ["了解研磨度", "记录粉量与萃取时间"], reflection: ""
    }
  ]);

  function normalizeLifeItem(item) {
    if (!item.place) {
      return {
        checklist: [],
        ...item,
        category: LIFE_CATEGORIES[item.category] ? item.category : "other",
        status: LIFE_STATUSES[item.status] ? item.status : "idea"
      };
    }
    const done = item.status === "done";
    return {
      id: item.id || uuid(),
      title: item.place,
      category: "travel",
      status: done ? "done" : "idea",
      reason: done ? "" : (item.note || ""),
      nextAction: "",
      targetDate: item.start || "",
      endDate: item.end || "",
      location: item.place,
      budget: item.cost ?? null,
      checklist: [],
      reflection: done ? (item.note || "") : "",
      completedAt: done ? (item.end || item.start || "") : ""
    };
  }

  function loadTrips() {
    const saved = Store.get(TRIPS_KEY, null);
    if (!Array.isArray(saved)) {
      const samples = lifeSamples();
      Store.set(TRIPS_KEY, samples);
      return samples;
    }
    const normalized = saved.map(normalizeLifeItem);
    if (saved.some(item => item.place || !LIFE_STATUSES[item.status])) {
      Store.set(TRIPS_KEY, normalized);
    }
    return normalized;
  }

  let trips = loadTrips();
  let lifeStatusFilter = "all";
  const saveTrips = () => Store.set(TRIPS_KEY, trips);

  function checklistProgress(item) {
    const list = Array.isArray(item.checklist) ? item.checklist : [];
    if (!list.length) return null;
    const done = list.filter(entry => entry.done).length;
    return { done, total: list.length, percent: Math.round(done / list.length * 100) };
  }

  function renderTravel(root) {
    trips = loadTrips();
    const visible = trips
      .filter(item => lifeStatusFilter === "all" || item.status === lifeStatusFilter)
      .sort((a, b) => {
        const order = { active: 0, planned: 1, idea: 2, paused: 3, done: 4 };
        return order[a.status] - order[b.status] || (b.targetDate || "").localeCompare(a.targetDate || "");
      });
    const count = status => trips.filter(item => item.status === status).length;
    const thisYear = String(new Date().getFullYear());
    const doneThisYear = trips.filter(item => item.status === "done" && (item.completedAt || "").startsWith(thisYear)).length;

    const lifeCard = item => {
      const category = LIFE_CATEGORIES[item.category] || LIFE_CATEGORIES.other;
      const status = LIFE_STATUSES[item.status] || LIFE_STATUSES.idea;
      const progress = checklistProgress(item);
      return `
        <button class="life-list-card" data-id="${item.id}">
          <span class="life-list-top">
            <span class="life-list-category">${category.icon} ${category.label}</span>
            <span class="badge" style="color:${status.color};background:${status.bg}">${status.label}</span>
          </span>
          <strong>${esc(item.title)}</strong>
          ${item.reason ? `<p>${esc(item.reason)}</p>` : ""}
          <span class="life-list-meta">
            ${item.targetDate ? `📅 ${fmtCN(item.targetDate)}` : ""}
            ${item.location ? `📍 ${esc(item.location)}` : ""}
            ${item.budget ? `¥ ${Number(item.budget).toLocaleString()}` : ""}
          </span>
          ${item.nextAction && item.status !== "done" ? `<span class="life-next-action"><small>下一步</small>${esc(item.nextAction)}</span>` : ""}
          ${progress ? `<span class="life-check-progress"><span class="progress"><span style="width:${progress.percent}%"></span></span><small>${progress.done}/${progress.total}</small></span>` : ""}
          ${item.status === "done" && item.reflection ? `<span class="life-result">${esc(item.reflection)}</span>` : ""}
        </button>`;
    };

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">LIFE LIST</p>
          <h1>想做的事，慢慢变成经历。</h1>
        </div>
        <div class="top-actions">
          <button class="primary-btn" id="addTripBtn">＋ <span class="btn-text">添加一件事</span></button>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">想做与已计划</div>
          <div class="stat-value">${count("idea") + count("planned")} 件</div>
          <div class="stat-sub">把愿望变成下一步行动</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">进行中</div>
          <div class="stat-value">${count("active")}</div>
          <div class="stat-sub">正在发生的人生</div>
        </article>
        <article class="stat">
          <div class="stat-label">今年完成</div>
          <div class="stat-value">${doneThisYear}</div>
          <div class="stat-sub">值得留存的成果与经历</div>
        </article>
        <article class="stat">
          <div class="stat-label">累计完成</div>
          <div class="stat-value">${count("done")}</div>
          <div class="stat-sub">每一件都算数</div>
        </article>
      </section>
      <div class="calendar-toolbar">
        <h2 class="block-title" style="margin:0">我的人生清单</h2>
        <div class="filters">
          <button class="filter ${lifeStatusFilter === "all" ? "active" : ""}" data-life-status="all">全部</button>
          ${Object.entries(LIFE_STATUSES).map(([key, status]) =>
            `<button class="filter ${lifeStatusFilter === key ? "active" : ""}" data-life-status="${key}">${status.label}</button>`
          ).join("")}
        </div>
      </div>
      <div class="life-list-grid">
        ${visible.length ? visible.map(lifeCard).join("") : `<div class="empty" style="grid-column:1/-1">这个状态下还没有记录</div>`}
      </div>
    `;

    document.getElementById("addTripBtn").addEventListener("click", () => openTripEditor());
    root.querySelectorAll("[data-life-status]").forEach(button => button.addEventListener("click", () => {
      lifeStatusFilter = button.dataset.lifeStatus;
      App.refresh();
    }));
    root.querySelectorAll(".life-list-card").forEach(button => button.addEventListener("click", () => {
      openTripEditor(trips.find(item => item.id === button.dataset.id));
    }));
  }

  function openTripEditor(item = null) {
    const checklistText = (item?.checklist || []).map(entry =>
      typeof entry === "string" ? entry : `${entry.done ? "[x] " : ""}${entry.text}`
    ).join("\n");
    Modal.open({
      title: item ? "编辑人生清单" : "添加人生清单",
      wide: true,
      body: `
        <div class="field full">
          <label for="lifeTitle">想做或完成的事情</label>
          <input id="lifeTitle" required maxlength="80" placeholder="例如：去苏州拍一组旗袍写真" value="${esc(item?.title || "")}">
        </div>
        <div class="field">
          <label for="lifeCategory">分类</label>
          <select id="lifeCategory">
            ${Object.entries(LIFE_CATEGORIES).map(([key, category]) =>
              `<option value="${key}" ${item?.category === key ? "selected" : ""}>${category.icon} ${category.label}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label for="lifeStatus">状态</label>
          <select id="lifeStatus">
            ${Object.entries(LIFE_STATUSES).map(([key, status]) =>
              `<option value="${key}" ${item?.status === key || (!item && key === "idea") ? "selected" : ""}>${status.label}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field">
          <label for="lifeTargetDate">目标日期（可空）</label>
          <input id="lifeTargetDate" type="date" value="${item?.targetDate || ""}">
        </div>
        <div class="field">
          <label for="lifeLocation">地点（可空）</label>
          <input id="lifeLocation" maxlength="50" placeholder="苏州 / 家 / 线上" value="${esc(item?.location || "")}">
        </div>
        <div class="field">
          <label for="lifeBudget">预算（元，可空）</label>
          <input id="lifeBudget" type="number" min="0" value="${item?.budget ?? ""}">
        </div>
        <div class="field full">
          <label for="lifeReason">为什么想做</label>
          <textarea id="lifeReason" maxlength="300" placeholder="它对你有什么意义？">${esc(item?.reason || "")}</textarea>
        </div>
        <div class="field full">
          <label for="lifeNextAction">下一步行动</label>
          <input id="lifeNextAction" maxlength="100" placeholder="一个明确、可以立即执行的动作" value="${esc(item?.nextAction || "")}">
        </div>
        <div class="field full">
          <label for="lifeChecklist">准备清单（每行一项，完成项前写 [x]）</label>
          <textarea id="lifeChecklist" maxlength="600" placeholder="筛选摄影工作室\n[x] 确定预算\n预约时间">${esc(checklistText)}</textarea>
        </div>
        <div class="field full">
          <label for="lifeReflection">成果与复盘</label>
          <textarea id="lifeReflection" maxlength="800" placeholder="完成后留下成果、照片说明和自己的感受…">${esc(item?.reflection || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const status = Modal.value("lifeStatus");
        const previousChecks = item?.checklist || [];
        const lines = Modal.value("lifeChecklist").split("\n").map(line => line.trim()).filter(Boolean);
        const checklist = lines.map(line => {
          const done = /^\[x\]\s*/i.test(line);
          const text = line.replace(/^\[x\]\s*/i, "");
          const existing = previousChecks.find(entry => (typeof entry === "string" ? entry : entry.text) === text);
          return { text, done: done || (typeof existing === "object" && existing.done) };
        });
        const data = {
          id: item?.id || uuid(),
          title: Modal.value("lifeTitle"),
          category: Modal.value("lifeCategory"),
          status,
          reason: Modal.value("lifeReason"),
          nextAction: Modal.value("lifeNextAction"),
          targetDate: Modal.value("lifeTargetDate"),
          location: Modal.value("lifeLocation"),
          budget: Modal.value("lifeBudget") === "" ? null : Number(Modal.value("lifeBudget")),
          checklist,
          reflection: Modal.value("lifeReflection"),
          completedAt: status === "done" ? (item?.completedAt || toDateKey(new Date())) : ""
        };
        const index = trips.findIndex(record => record.id === data.id);
        if (index >= 0) trips[index] = data;
        else trips.unshift(data);
        saveTrips();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "人生清单已更新" : "已加入人生清单");
      },
      onDelete: item ? () => {
        if (!confirm("确定删除这条人生清单吗？")) return;
        trips = trips.filter(record => record.id !== item.id);
        saveTrips();
        Modal.close();
        App.refresh();
        toast("已删除");
      } : null
    });
  }

  window.LifeModule = { BOOKS_KEY, TRIPS_KEY };
  App.register("reading", { render: renderReading });
  App.register("travel", { render: renderTravel });
})();
