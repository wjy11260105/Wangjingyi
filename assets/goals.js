/* 目标模块:人生领域 + 年度目标 + 关键结果(KR)进度 */
(() => {
  const { esc, uuid } = U;
  const STORAGE_KEY = "life-goals-v1";
  const AREAS = {
    health: { label: "健康运动", color: "#4b8b6d", bg: "#e6f2eb" },
    career: { label: "事业工作", color: "#6a82c5", bg: "#eaf0ff" },
    growth: { label: "学习成长", color: "#9d73b9", bg: "#f4ecfa" },
    experience: { label: "体验探索", color: "#e9793f", bg: "#fff0e8" },
    wealth: { label: "财务理财", color: "#c5a64d", bg: "#faf4da" },
    relation: { label: "关系家庭", color: "#c76b7e", bg: "#fdeef1" }
  };

  const makeSamples = () => {
    const year = new Date().getFullYear();
    return [
      {
        id: uuid(), title: "完成一场 HYROX 比赛", area: "health", year, status: "active", note: "目标完赛，控制在 90 分钟内",
        krs: [
          { id: uuid(), text: "报名一场 HYROX 赛事", done: false },
          { id: uuid(), text: "每周 2 次功能性体能训练", done: false },
          { id: uuid(), text: "完成一次全流程模拟", done: false }
        ]
      },
      {
        id: uuid(), title: "考取 AOW 进阶潜水证", area: "experience", year, status: "active", note: "",
        krs: [
          { id: uuid(), text: "选定潜店与出行时间", done: false },
          { id: uuid(), text: "完成理论学习", done: false },
          { id: uuid(), text: "完成 5 次开放水域潜水", done: false }
        ]
      },
      {
        id: uuid(), title: `${year} 年读完 24 本书`, area: "growth", year, status: "active", note: "平均每月 2 本，读完写简短笔记",
        krs: [
          { id: uuid(), text: "上半年读完 12 本", done: false },
          { id: uuid(), text: "全年读完 24 本", done: false }
        ]
      },
      {
        id: uuid(), title: "系统学习 AI 应用开发", area: "career", year, status: "active", note: "把数据开发经验与 AI 结合",
        krs: [
          { id: uuid(), text: "完成一门 LLM 应用课程", done: false },
          { id: uuid(), text: "做出 1 个可用的个人 AI 小项目", done: false },
          { id: uuid(), text: "输出 4 篇学习笔记", done: false }
        ]
      }
    ];
  };

  function load() {
    const saved = Store.get(STORAGE_KEY, null);
    if (Array.isArray(saved)) return saved;
    const samples = makeSamples();
    Store.set(STORAGE_KEY, samples);
    return samples;
  }

  let goals = load();
  let areaFilter = "all";
  const save = () => Store.set(STORAGE_KEY, goals);

  function progressOf(goal) {
    if (goal.status === "done") return 100;
    if (goal.krs && goal.krs.length) {
      return Math.round(goal.krs.filter(kr => kr.done).length / goal.krs.length * 100);
    }
    return Math.min(100, Number(goal.progress) || 0);
  }

  function render(root) {
    goals = load();
    const active = goals.filter(goal => goal.status === "active");
    const done = goals.filter(goal => goal.status === "done");
    const avg = active.length ? Math.round(active.reduce((sum, goal) => sum + progressOf(goal), 0) / active.length) : 0;

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">GOALS</p>
          <h1>目标，是人生的方向盘。</h1>
        </div>
        <div class="top-actions">
          <button class="primary-btn" id="addGoalBtn">＋ <span class="btn-text">新建目标</span></button>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">进行中的目标</div>
          <div class="stat-value">${active.length} 个</div>
          <div class="stat-sub">保持专注，逐个击破</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">平均完成度</div>
          <div class="stat-value">${avg}<small>%</small></div>
          <div class="stat-sub">进行中目标的整体进度</div>
        </article>
        <article class="stat">
          <div class="stat-label">已达成</div>
          <div class="stat-value">${done.length}</div>
          <div class="stat-sub">每一个都值得庆祝</div>
        </article>
      </section>
      <div class="calendar-toolbar">
        <h2 class="block-title" style="margin:0">全部目标</h2>
        <div class="filters">
          <button class="filter ${areaFilter === "all" ? "active" : ""}" data-area="all">全部</button>
          ${Object.entries(AREAS).map(([key, area]) =>
            `<button class="filter ${areaFilter === key ? "active" : ""}" data-area="${key}">${area.label}</button>`).join("")}
        </div>
      </div>
      <div class="goal-grid" id="goalGrid"></div>
    `;

    document.getElementById("addGoalBtn").addEventListener("click", () => openEditor());
    root.querySelectorAll("[data-area]").forEach(button => button.addEventListener("click", () => {
      areaFilter = button.dataset.area;
      App.refresh();
    }));
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById("goalGrid");
    const visible = goals
      .filter(goal => areaFilter === "all" || goal.area === areaFilter)
      .sort((a, b) => (a.status === "done") - (b.status === "done"));
    if (!visible.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">还没有目标，点击右上角「新建目标」开始规划</div>`;
      return;
    }
    grid.innerHTML = visible.map(goal => {
      const area = AREAS[goal.area] || AREAS.growth;
      const pct = progressOf(goal);
      const statusLabel = goal.status === "done" ? "已达成" : goal.status === "paused" ? "已搁置" : "进行中";
      return `<article class="goal-card ${goal.status === "done" ? "finished" : ""}">
        <div class="goal-top">
          <h4>${esc(goal.title)}</h4>
          <span class="badge" style="color:${area.color};background:${area.bg}">${area.label}</span>
        </div>
        <div class="goal-meta">${goal.year} 年 · ${statusLabel}${goal.note ? ` · ${esc(goal.note)}` : ""}</div>
        <div class="goal-progress-row">
          <div class="progress"><span style="width:${pct}%"></span></div>
          <b>${pct}%</b>
        </div>
        ${goal.krs && goal.krs.length ? `<div class="kr-list">${goal.krs.map(kr => `
          <button class="kr ${kr.done ? "done" : ""}" data-goal="${goal.id}" data-kr="${kr.id}">
            <span class="kr-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></span>
            <span>${esc(kr.text)}</span>
          </button>`).join("")}</div>` : ""}
        <div class="goal-actions">
          <button class="ghost-btn small" data-edit="${goal.id}">编辑</button>
          ${goal.status !== "done" ? `<button class="ghost-btn small" data-done="${goal.id}">标记达成</button>` : `<button class="ghost-btn small" data-reopen="${goal.id}">重新开启</button>`}
        </div>
      </article>`;
    }).join("");

    grid.querySelectorAll(".kr").forEach(button => button.addEventListener("click", () => {
      const goal = goals.find(item => item.id === button.dataset.goal);
      const kr = goal.krs.find(item => item.id === button.dataset.kr);
      kr.done = !kr.done;
      save();
      App.refresh();
    }));
    grid.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
      openEditor(goals.find(item => item.id === button.dataset.edit));
    }));
    grid.querySelectorAll("[data-done]").forEach(button => button.addEventListener("click", () => {
      const goal = goals.find(item => item.id === button.dataset.done);
      goal.status = "done";
      save();
      App.refresh();
      toast("恭喜达成目标！");
    }));
    grid.querySelectorAll("[data-reopen]").forEach(button => button.addEventListener("click", () => {
      const goal = goals.find(item => item.id === button.dataset.reopen);
      goal.status = "active";
      save();
      App.refresh();
    }));
  }

  function openEditor(goal = null) {
    const krText = (goal?.krs || []).map(kr => kr.text).join("\n");
    Modal.open({
      title: goal ? "编辑目标" : "新建目标",
      body: `
        <div class="field full">
          <label for="goalTitle">目标名称</label>
          <input id="goalTitle" required maxlength="50" placeholder="例如：全马跑进 4 小时" value="${esc(goal?.title || "")}">
        </div>
        <div class="field">
          <label for="goalArea">人生领域</label>
          <select id="goalArea">
            ${Object.entries(AREAS).map(([key, area]) =>
              `<option value="${key}" ${goal?.area === key ? "selected" : ""}>${area.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="goalYear">年份</label>
          <input id="goalYear" type="number" min="2000" max="2100" required value="${goal?.year || new Date().getFullYear()}">
        </div>
        <div class="field">
          <label for="goalStatus">状态</label>
          <select id="goalStatus">
            <option value="active" ${(!goal || goal.status === "active") ? "selected" : ""}>进行中</option>
            <option value="done" ${goal?.status === "done" ? "selected" : ""}>已达成</option>
            <option value="paused" ${goal?.status === "paused" ? "selected" : ""}>已搁置</option>
          </select>
        </div>
        <div class="field">
          <label for="goalProgress">手动进度 %（无 KR 时生效）</label>
          <input id="goalProgress" type="number" min="0" max="100" value="${goal?.progress || 0}">
        </div>
        <div class="field full">
          <label for="goalKrs">关键结果 KR（每行一条，勾选进度自动计算）</label>
          <textarea id="goalKrs" placeholder="报名一场比赛\n每周训练 3 次\n完成一次模拟">${esc(krText)}</textarea>
        </div>
        <div class="field full">
          <label for="goalNote">备注</label>
          <input id="goalNote" maxlength="80" placeholder="为什么想实现它？" value="${esc(goal?.note || "")}">
        </div>
      `,
      onSubmit() {
        const lines = Modal.value("goalKrs").split("\n").map(line => line.trim()).filter(Boolean);
        const oldKrs = goal?.krs || [];
        const krs = lines.map(text => {
          const existing = oldKrs.find(kr => kr.text === text);
          return existing || { id: uuid(), text, done: false };
        });
        const data = {
          id: goal?.id || uuid(),
          title: Modal.value("goalTitle"),
          area: Modal.value("goalArea"),
          year: Number(Modal.value("goalYear")),
          status: Modal.value("goalStatus"),
          progress: Number(Modal.value("goalProgress")) || 0,
          krs,
          note: Modal.value("goalNote")
        };
        const index = goals.findIndex(item => item.id === data.id);
        if (index >= 0) goals[index] = data;
        else goals.unshift(data);
        save();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "目标已更新" : "目标已创建");
      },
      onDelete: goal ? () => {
        if (!confirm("确定删除这个目标吗？")) return;
        goals = goals.filter(item => item.id !== goal.id);
        save();
        Modal.close();
        App.refresh();
        toast("目标已删除");
      } : null
    });
  }

  window.GoalsModule = { progressOf, AREAS, STORAGE_KEY };
  App.register("goals", { render });
})();
