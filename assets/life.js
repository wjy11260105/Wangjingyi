/* 阅读书单 & 旅行足迹 */
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

  /* ================= 旅行 ================= */
  const tripSamples = () => ([
    { id: uuid(), place: "泰国 · 涛岛", status: "done", start: "", end: "", cost: null, note: "考了 OW 潜水证，遇见杰克鱼风暴" },
    { id: uuid(), place: "日本 · 冲绳", status: "wish", start: "", end: "", cost: null, note: "青洞潜水 + 环岛自驾" }
  ]);

  function loadTrips() {
    const saved = Store.get(TRIPS_KEY, null);
    if (Array.isArray(saved)) return saved;
    const samples = tripSamples();
    Store.set(TRIPS_KEY, samples);
    return samples;
  }

  let trips = loadTrips();
  const saveTrips = () => Store.set(TRIPS_KEY, trips);

  function renderTravel(root) {
    trips = loadTrips();
    const done = trips.filter(trip => trip.status === "done");
    const wish = trips.filter(trip => trip.status === "wish");
    const totalCost = done.reduce((sum, trip) => sum + (Number(trip.cost) || 0), 0);

    const tripCard = trip => `
      <button class="trip-card" data-id="${trip.id}">
        <span>
          <h4>${trip.status === "done" ? "📍" : "✈️"} ${esc(trip.place)}</h4>
          <span class="trip-sub">
            ${trip.start ? `${fmtCN(trip.start)}${trip.end ? ` — ${fmtCN(trip.end)}` : ""}` : (trip.status === "done" ? "日期未记录" : "计划中")}
            ${trip.cost ? ` · 花费 ¥${Number(trip.cost).toLocaleString()}` : ""}
          </span>
          ${trip.note ? `<span class="trip-note">${esc(trip.note)}</span>` : ""}
        </span>
        <span class="badge" style="align-self:start;${trip.status === "done" ? "color:#285743;background:#e6f2eb" : "color:#6a82c5;background:#eaf0ff"}">
          ${trip.status === "done" ? "已完成" : "心愿"}
        </span>
      </button>`;

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">TRAVEL</p>
          <h1>世界很大，慢慢去看。</h1>
        </div>
        <div class="top-actions">
          <button class="primary-btn" id="addTripBtn">＋ <span class="btn-text">添加旅程</span></button>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">去过的地方</div>
          <div class="stat-value">${done.length} 处</div>
          <div class="stat-sub">每一段旅程都是养分</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">心愿清单</div>
          <div class="stat-value">${wish.length}</div>
          <div class="stat-sub">下一站去哪里？</div>
        </article>
        <article class="stat">
          <div class="stat-label">旅行投入</div>
          <div class="stat-value">¥${totalCost.toLocaleString()}</div>
          <div class="stat-sub">已完成旅程合计</div>
        </article>
      </section>
      <div class="grid-2">
        <section>
          <h2 class="block-title">✈️ 心愿清单</h2>
          <div class="trip-list">${wish.length ? wish.map(tripCard).join("") : `<div class="empty">写下想去的地方</div>`}</div>
        </section>
        <section>
          <h2 class="block-title">📍 已完成旅程</h2>
          <div class="trip-list">${done.length ? done.slice().sort((a, b) => (b.start || "").localeCompare(a.start || "")).map(tripCard).join("") : `<div class="empty">完成第一段旅程后记录在这里</div>`}</div>
        </section>
      </div>
    `;

    document.getElementById("addTripBtn").addEventListener("click", () => openTripEditor());
    root.querySelectorAll(".trip-card").forEach(button => button.addEventListener("click", () => {
      openTripEditor(trips.find(trip => trip.id === button.dataset.id));
    }));
  }

  function openTripEditor(trip = null) {
    Modal.open({
      title: trip ? "编辑旅程" : "添加旅程",
      body: `
        <div class="field full">
          <label for="tpPlace">目的地</label>
          <input id="tpPlace" required maxlength="50" placeholder="例如：印尼 · 科莫多" value="${esc(trip?.place || "")}">
        </div>
        <div class="field">
          <label for="tpStatus">状态</label>
          <select id="tpStatus">
            <option value="wish" ${(!trip || trip.status === "wish") ? "selected" : ""}>心愿</option>
            <option value="done" ${trip?.status === "done" ? "selected" : ""}>已完成</option>
          </select>
        </div>
        <div class="field">
          <label for="tpCost">花费（元，可空）</label>
          <input id="tpCost" type="number" min="0" value="${trip?.cost ?? ""}">
        </div>
        <div class="field">
          <label for="tpStart">开始日期（可空）</label>
          <input id="tpStart" type="date" value="${trip?.start || ""}">
        </div>
        <div class="field">
          <label for="tpEnd">结束日期（可空）</label>
          <input id="tpEnd" type="date" value="${trip?.end || ""}">
        </div>
        <div class="field full">
          <label for="tpNote">游记 / 期待</label>
          <textarea id="tpNote" maxlength="500" placeholder="见闻、攻略、想做的事…">${esc(trip?.note || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const data = {
          id: trip?.id || uuid(),
          place: Modal.value("tpPlace"),
          status: Modal.value("tpStatus"),
          start: Modal.value("tpStart"),
          end: Modal.value("tpEnd"),
          cost: Modal.value("tpCost") === "" ? null : Number(Modal.value("tpCost")),
          note: Modal.value("tpNote")
        };
        const index = trips.findIndex(record => record.id === data.id);
        if (index >= 0) trips[index] = data;
        else trips.unshift(data);
        saveTrips();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "旅程已更新" : "旅程已添加");
      },
      onDelete: trip ? () => {
        if (!confirm("确定删除这段旅程吗？")) return;
        trips = trips.filter(record => record.id !== trip.id);
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
