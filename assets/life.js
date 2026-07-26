/* 学习档案 & 人生清单 */
(() => {
  const { toDateKey, esc, uuid, fmtCN } = U;
  const BOOKS_KEY = "life-books-v1";
  const TRIPS_KEY = "life-trips-v1";

  /* ================= 学习档案（兼容原书单） ================= */
  const LEARNING_TYPES = {
    book: { label: "书籍", icon: "📖" },
    course: { label: "课程", icon: "🎓" },
    article: { label: "文章", icon: "📄" },
    video: { label: "视频", icon: "🎬" },
    practice: { label: "实践", icon: "🧪" }
  };
  const LEARNING_CATEGORIES = {
    tarot: "塔罗",
    ziwei: "紫微斗数",
    ai: "AI",
    data: "数据开发",
    expression: "表达",
    sport: "运动",
    general: "通识"
  };
  const LEARNING_STATUS = {
    wish: { label: "想学", color: "#6a82c5", bg: "#eaf0ff" },
    learning: { label: "学习中", color: "#347259", bg: "#e3f0e8" },
    done: { label: "已完成", color: "#a64d28", bg: "#fff0e8" },
    paused: { label: "已暂停", color: "#7d7680", bg: "#efedf0" }
  };

  const requiredLearningItems = () => ([
    {
      id: uuid(), seedKey: "canxue-tarot", type: "course", category: "tarot", title: "残雪老师塔罗课程", mentor: "残雪老师",
      status: "learning", progress: 0, goal: "系统理解牌义、牌阵与解牌逻辑", entries: []
    },
    {
      id: uuid(), seedKey: "ziwei-study", type: "course", category: "ziwei", title: "紫微斗数系统学习", mentor: "",
      status: "wish", progress: 0, goal: "从基础排盘逐步理解宫位、星曜和四化", entries: []
    },
    {
      id: uuid(), seedKey: "ai-practice", type: "practice", category: "ai", title: "AI 应用与实践", mentor: "",
      status: "wish", progress: 0, goal: "将数据开发经验与 AI 应用结合", entries: []
    }
  ]);

  function normalizeLearningItem(item) {
    if (item.type && LEARNING_STATUS[item.status]) {
      return { entries: [], progress: 0, goal: "", mentor: "", category: "general", ...item };
    }
    const status = item.status === "reading" ? "learning" : item.status === "done" ? "done" : "wish";
    const entries = item.note ? [{
      id: uuid(),
      date: item.finishedAt || "",
      chapter: "原书单笔记",
      content: item.note,
      gain: "",
      feeling: "",
      question: "",
      practice: "",
      output: ""
    }] : [];
    return {
      id: item.id || uuid(),
      type: "book",
      category: "general",
      title: item.title || "未命名书籍",
      mentor: item.author || "",
      status,
      progress: Number(item.progress) || 0,
      goal: "",
      entries,
      completedAt: item.finishedAt || ""
    };
  }

  function loadBooks() {
    const saved = Store.get(BOOKS_KEY, null);
    let list = Array.isArray(saved) ? saved.map(normalizeLearningItem) : [];
    let changed = !Array.isArray(saved) || saved.some(item => !item.type || !LEARNING_STATUS[item.status]);
    requiredLearningItems().forEach(required => {
      if (!list.some(item => item.seedKey === required.seedKey || item.title === required.title)) {
        list.push(required);
        changed = true;
      }
    });
    if (changed) Store.set(BOOKS_KEY, list);
    return list;
  }

  let books = loadBooks();
  let bookFilter = "all";
  let selectedLearningId = null;
  const saveBooks = () => Store.set(BOOKS_KEY, books);

  function renderLearningList(root) {
    const visible = bookFilter === "all" ? books : books.filter(item => item.status === bookFilter);
    const noteCount = books.reduce((sum, item) => sum + (item.entries?.length || 0), 0);
    const outputCount = books.reduce((sum, item) =>
      sum + (item.entries || []).filter(entry => entry.output).length, 0
    );
    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">LEARNING ARCHIVE</p>
          <h1>把输入，慢慢变成自己的东西。</h1>
        </div>
        <div class="top-actions">
          <button class="primary-btn" id="addBookBtn">＋ <span class="btn-text">添加学习项目</span></button>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">正在学习</div>
          <div class="stat-value">${books.filter(item => item.status === "learning").length} 项</div>
          <div class="stat-sub">持续输入，也持续输出</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">学习记录</div>
          <div class="stat-value">${noteCount}</div>
          <div class="stat-sub">内容、收获与感受</div>
        </article>
        <article class="stat">
          <div class="stat-label">计划学习</div>
          <div class="stat-value">${books.filter(item => item.status === "wish").length}</div>
          <div class="stat-sub">保持有方向的好奇心</div>
        </article>
        <article class="stat">
          <div class="stat-label">输出记录</div>
          <div class="stat-value">${outputCount}</div>
          <div class="stat-sub">文章、分享与实践成果</div>
        </article>
      </section>
      <div class="calendar-toolbar">
        <h2 class="block-title" style="margin:0">我的学习项目</h2>
        <div class="filters">
          <button class="filter ${bookFilter === "all" ? "active" : ""}" data-bf="all">全部</button>
          ${Object.entries(LEARNING_STATUS).map(([key, status]) =>
            `<button class="filter ${bookFilter === key ? "active" : ""}" data-bf="${key}">${status.label}</button>`
          ).join("")}
        </div>
      </div>
      <div class="learning-grid">
        ${visible.length ? visible.map(item => {
          const status = LEARNING_STATUS[item.status];
          const type = LEARNING_TYPES[item.type] || LEARNING_TYPES.practice;
          return `<button class="learning-card" data-id="${item.id}">
            <span class="learning-card-top">
              <span>${type.icon} ${type.label} · ${LEARNING_CATEGORIES[item.category] || "通识"}</span>
              <span class="badge" style="color:${status.color};background:${status.bg}">${status.label}</span>
            </span>
            <strong>${esc(item.title)}</strong>
            <span class="learning-mentor">${esc(item.mentor || "自主学习")}</span>
            ${item.goal ? `<p>${esc(item.goal)}</p>` : ""}
            <span class="learning-card-bottom">
              <span class="progress"><span style="width:${item.progress || 0}%"></span></span>
              <b>${item.progress || 0}%</b>
              <small>${item.entries?.length || 0} 篇记录</small>
            </span>
          </button>`;
        }).join("") : `<div class="empty" style="grid-column:1/-1">这个状态下还没有学习项目</div>`}
      </div>
    `;

    document.getElementById("addBookBtn").addEventListener("click", () => openLearningEditor());
    root.querySelectorAll("[data-bf]").forEach(button => button.addEventListener("click", () => {
      bookFilter = button.dataset.bf;
      App.refresh();
    }));
    root.querySelectorAll(".learning-card").forEach(button => button.addEventListener("click", () => {
      selectedLearningId = button.dataset.id;
      App.refresh();
    }));
  }

  function renderLearningDetail(root, item) {
    const type = LEARNING_TYPES[item.type] || LEARNING_TYPES.practice;
    const status = LEARNING_STATUS[item.status];
    const entries = (item.entries || []).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const todayKey = toDateKey(new Date());
    const quickEntry = item.entries.find(entry => entry.quick && entry.date === todayKey);
    root.innerHTML = `
      <header class="topbar learning-detail-head">
        <div>
          <button class="learning-back" id="learningBack">← 返回学习档案</button>
          <p class="eyebrow">${type.icon} ${type.label} · ${LEARNING_CATEGORIES[item.category] || "通识"}</p>
          <h1>${esc(item.title)}</h1>
          <p class="learning-detail-sub">${esc(item.mentor || "自主学习")} · ${status.label} · 进度 ${item.progress || 0}%</p>
        </div>
        <div class="top-actions">
          <button class="ghost-btn" id="editLearning">编辑项目</button>
          <button class="primary-btn" id="addLearningEntry">＋ <span class="btn-text">写学习记录</span></button>
        </div>
      </header>
      ${item.goal ? `<section class="learning-goal"><small>学习目标</small><p>${esc(item.goal)}</p></section>` : ""}
      <section class="learning-quick-editor">
        <div class="learning-quick-head">
          <div><strong>直接记录</strong><small>不必先整理，先把当下的学习、收获和感受写下来</small></div>
          <span id="learningQuickStatus">${quickEntry ? "已自动保存" : "输入后自动保存"}</span>
        </div>
        <textarea id="learningQuickText" maxlength="5000" placeholder="直接在这里开始写…">${esc(quickEntry?.content || "")}</textarea>
      </section>
      <section>
        <div class="panel-head"><h3>学习文档</h3><span class="hint">${entries.length} 篇记录</span></div>
        <div class="learning-docs">
          ${entries.length ? entries.map(entry => `
            <button class="learning-doc" data-entry-id="${entry.id}">
              <span class="learning-doc-date">${entry.date ? fmtCN(entry.date) : "日期未记录"}</span>
              <strong>${esc(entry.chapter || "学习记录")}</strong>
              ${entry.content ? `<p>${esc(entry.content)}</p>` : ""}
              <span class="learning-doc-tags">
                ${entry.gain ? "<i>收获</i>" : ""}
                ${entry.feeling ? "<i>感受</i>" : ""}
                ${entry.question ? "<i>疑问</i>" : ""}
                ${entry.practice ? "<i>实践</i>" : ""}
                ${entry.output ? "<i>输出</i>" : ""}
              </span>
            </button>`).join("") : `<div class="empty">还没有学习记录，写下第一篇吧</div>`}
        </div>
      </section>
    `;
    document.getElementById("learningBack").addEventListener("click", () => {
      selectedLearningId = null;
      App.refresh();
    });
    document.getElementById("editLearning").addEventListener("click", () => openLearningEditor(item));
    document.getElementById("addLearningEntry").addEventListener("click", () => openLearningEntryEditor(item));
    const quickText = document.getElementById("learningQuickText");
    const quickStatus = document.getElementById("learningQuickStatus");
    let quickSaveTimer;
    const saveQuickText = () => {
      clearTimeout(quickSaveTimer);
      const content = quickText.value.trim();
      const index = item.entries.findIndex(entry => entry.quick && entry.date === todayKey);
      if (content) {
        const data = {
          id: index >= 0 ? item.entries[index].id : uuid(),
          date: todayKey,
          chapter: "今日学习随记",
          content,
          gain: "",
          feeling: "",
          question: "",
          practice: "",
          output: "",
          quick: true
        };
        if (index >= 0) item.entries[index] = data;
        else item.entries.unshift(data);
      } else if (index >= 0) {
        item.entries.splice(index, 1);
      }
      saveBooks();
      quickStatus.textContent = "已自动保存";
    };
    quickText.addEventListener("input", () => {
      quickStatus.textContent = "保存中…";
      clearTimeout(quickSaveTimer);
      quickSaveTimer = setTimeout(saveQuickText, 650);
    });
    quickText.addEventListener("blur", saveQuickText);
    root.querySelectorAll("[data-entry-id]").forEach(button => button.addEventListener("click", () => {
      openLearningEntryEditor(item, item.entries.find(entry => entry.id === button.dataset.entryId));
    }));
  }

  function renderReading(root) {
    books = loadBooks();
    const selected = selectedLearningId && books.find(item => item.id === selectedLearningId);
    if (selected) renderLearningDetail(root, selected);
    else renderLearningList(root);
  }

  function openLearningEditor(item = null) {
    Modal.open({
      title: item ? "编辑学习项目" : "添加学习项目",
      body: `
        <div class="field full">
          <label for="learnTitle">项目名称</label>
          <input id="learnTitle" required maxlength="80" placeholder="例如：残雪老师塔罗课程" value="${esc(item?.title || "")}">
        </div>
        <div class="field">
          <label for="learnType">学习形式</label>
          <select id="learnType">${Object.entries(LEARNING_TYPES).map(([key, type]) =>
            `<option value="${key}" ${item?.type === key ? "selected" : ""}>${type.icon} ${type.label}</option>`
          ).join("")}</select>
        </div>
        <div class="field">
          <label for="learnCategory">主题</label>
          <select id="learnCategory">${Object.entries(LEARNING_CATEGORIES).map(([key, label]) =>
            `<option value="${key}" ${item?.category === key ? "selected" : ""}>${label}</option>`
          ).join("")}</select>
        </div>
        <div class="field">
          <label for="learnMentor">老师 / 作者</label>
          <input id="learnMentor" maxlength="50" placeholder="老师、作者或来源" value="${esc(item?.mentor || "")}">
        </div>
        <div class="field">
          <label for="learnStatus">状态</label>
          <select id="learnStatus">${Object.entries(LEARNING_STATUS).map(([key, status]) =>
            `<option value="${key}" ${item?.status === key || (!item && key === "wish") ? "selected" : ""}>${status.label}</option>`
          ).join("")}</select>
        </div>
        <div class="field">
          <label for="learnProgress">学习进度 %</label>
          <input id="learnProgress" type="number" min="0" max="100" value="${item?.progress || 0}">
        </div>
        <div class="field full">
          <label for="learnGoal">学习目标</label>
          <textarea id="learnGoal" maxlength="300" placeholder="希望通过这项学习获得什么？">${esc(item?.goal || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const status = Modal.value("learnStatus");
        const data = {
          id: item?.id || uuid(),
          seedKey: item?.seedKey,
          type: Modal.value("learnType"),
          category: Modal.value("learnCategory"),
          title: Modal.value("learnTitle"),
          mentor: Modal.value("learnMentor"),
          status,
          progress: status === "done" ? 100 : Number(Modal.value("learnProgress")) || 0,
          goal: Modal.value("learnGoal"),
          entries: item?.entries || [],
          completedAt: status === "done" ? (item?.completedAt || toDateKey(new Date())) : ""
        };
        const index = books.findIndex(record => record.id === data.id);
        if (index >= 0) books[index] = data;
        else books.unshift(data);
        saveBooks();
        selectedLearningId = data.id;
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "学习项目已更新" : "学习项目已创建");
      },
      onDelete: item ? () => {
        if (!confirm("删除项目会同时删除其学习记录，确定吗？")) return;
        books = books.filter(record => record.id !== item.id);
        saveBooks();
        selectedLearningId = null;
        Modal.close();
        App.refresh();
        toast("学习项目已删除");
      } : null
    });
  }

  function openLearningEntryEditor(item, entry = null) {
    Modal.open({
      title: entry ? "编辑学习记录" : "写学习记录",
      wide: true,
      body: `
        <div class="field">
          <label for="entryDate">学习日期</label>
          <input id="entryDate" type="date" required value="${entry?.date || toDateKey(new Date())}">
        </div>
        <div class="field">
          <label for="entryChapter">章节 / 主题</label>
          <input id="entryChapter" required maxlength="100" placeholder="例如：第 6 课 大阿卡纳故事线" value="${esc(entry?.chapter || "")}">
        </div>
        <div class="field full">
          <label for="entryContent">学习内容与原始笔记</label>
          <textarea id="entryContent" maxlength="2000" placeholder="这次学习了什么？">${esc(entry?.content || "")}</textarea>
        </div>
        <div class="field full">
          <label for="entryGain">最大收获</label>
          <textarea id="entryGain" maxlength="800" placeholder="最重要的新理解是什么？">${esc(entry?.gain || "")}</textarea>
        </div>
        <div class="field full">
          <label for="entryFeeling">自己的感受</label>
          <textarea id="entryFeeling" maxlength="800" placeholder="这次学习带来了什么感受？">${esc(entry?.feeling || "")}</textarea>
        </div>
        <div class="field full">
          <label for="entryQuestion">仍有疑问</label>
          <textarea id="entryQuestion" maxlength="800" placeholder="有哪些地方还不理解？">${esc(entry?.question || "")}</textarea>
        </div>
        <div class="field full">
          <label for="entryPractice">实践练习</label>
          <textarea id="entryPractice" maxlength="800" placeholder="准备如何练习或验证？">${esc(entry?.practice || "")}</textarea>
        </div>
        <div class="field full">
          <label for="entryOutput">输出与成果</label>
          <textarea id="entryOutput" maxlength="800" placeholder="文章、分享、作品或可以应用的事情">${esc(entry?.output || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const data = {
          id: entry?.id || uuid(),
          date: Modal.value("entryDate"),
          chapter: Modal.value("entryChapter"),
          content: Modal.value("entryContent"),
          gain: Modal.value("entryGain"),
          feeling: Modal.value("entryFeeling"),
          question: Modal.value("entryQuestion"),
          practice: Modal.value("entryPractice"),
          output: Modal.value("entryOutput")
        };
        const index = item.entries.findIndex(record => record.id === data.id);
        if (index >= 0) item.entries[index] = data;
        else item.entries.unshift(data);
        saveBooks();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "学习记录已更新" : "学习记录已保存");
      },
      onDelete: entry ? () => {
        if (!confirm("确定删除这篇学习记录吗？")) return;
        item.entries = item.entries.filter(record => record.id !== entry.id);
        saveBooks();
        Modal.close();
        App.refresh();
        toast("学习记录已删除");
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
