/* 习惯模块:每日打卡、连续天数、月度视图 */
(() => {
  const { toDateKey, addDays, esc, uuid } = U;
  const STORAGE_KEY = "life-habits-v1";

  const makeSamples = () => ([
    { id: uuid(), name: "阅读 30 分钟", icon: "📖", checks: {} },
    { id: uuid(), name: "运动打卡", icon: "🏃", checks: {} },
    { id: uuid(), name: "学习 AI", icon: "🤖", checks: {} },
    { id: uuid(), name: "早睡", icon: "🌙", checks: {} }
  ]);

  function load() {
    const saved = Store.get(STORAGE_KEY, null);
    if (Array.isArray(saved)) return saved;
    const samples = makeSamples();
    Store.set(STORAGE_KEY, samples);
    return samples;
  }

  let habits = load();
  const save = () => Store.set(STORAGE_KEY, habits);

  function streakOf(habit) {
    let count = 0;
    let cursor = new Date();
    if (!habit.checks[toDateKey(cursor)]) cursor = addDays(cursor, -1);
    while (habit.checks[toDateKey(cursor)]) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  function totalOf(habit) {
    return Object.keys(habit.checks).length;
  }

  function render(root) {
    habits = load();
    const todayKey = toDateKey(new Date());
    const doneToday = habits.filter(habit => habit.checks[todayKey]).length;
    const bestStreak = habits.length ? Math.max(...habits.map(streakOf)) : 0;
    const last7 = Array.from({ length: 7 }, (_, index) => addDays(new Date(), index - 6));

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">HABITS</p>
          <h1>微小的坚持，塑造想成为的自己。</h1>
        </div>
        <div class="top-actions">
          <button class="primary-btn" id="addHabitBtn">＋ <span class="btn-text">新建习惯</span></button>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">今日打卡</div>
          <div class="stat-value">${doneToday} / ${habits.length}</div>
          <div class="stat-sub">${doneToday === habits.length && habits.length ? "全部完成，太棒了！" : "点亮今天的方块"}</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">最长连续</div>
          <div class="stat-value">${bestStreak}<small> 天</small></div>
          <div class="stat-sub">当前进行中的最佳纪录</div>
        </article>
        <article class="stat">
          <div class="stat-label">习惯数量</div>
          <div class="stat-value">${habits.length}</div>
          <div class="stat-sub">贵在精不在多</div>
        </article>
      </section>
      <div class="grid-2" style="grid-template-columns:1.6fr 1fr">
        <section>
          <h2 class="block-title">最近 7 天</h2>
          <div class="habit-list" id="habitList">
            ${habits.length ? habits.map(habit => `
              <div class="habit-row">
                <div>
                  <div class="habit-title">
                    <span>${habit.icon || "✅"}</span>
                    <h4>${esc(habit.name)}</h4>
                    <button class="edit-link" data-edit="${habit.id}">编辑</button>
                  </div>
                  <div class="habit-streak">连续 <b>${streakOf(habit)}</b> 天 · 累计 ${totalOf(habit)} 次</div>
                </div>
                <div class="habit-week">
                  ${last7.map(date => {
                    const key = toDateKey(date);
                    const checked = Boolean(habit.checks[key]);
                    return `<button class="habit-day ${checked ? "checked" : ""}" data-habit="${habit.id}" data-date="${key}" title="${key}">
                      <em>${["日","一","二","三","四","五","六"][date.getDay()]}</em>${date.getDate()}
                    </button>`;
                  }).join("")}
                </div>
              </div>`).join("") : `<div class="empty">还没有习惯，点击「新建习惯」开始</div>`}
          </div>
        </section>
        <section class="panel">
          <div class="panel-head"><h3>本月热度</h3><span class="hint">全部习惯合计</span></div>
          <div class="month-grid" id="habitMonth"></div>
        </section>
      </div>
    `;

    renderMonth();

    document.getElementById("addHabitBtn").addEventListener("click", () => openEditor());
    root.querySelectorAll("[data-edit]").forEach(button => button.addEventListener("click", () => {
      openEditor(habits.find(habit => habit.id === button.dataset.edit));
    }));
    root.querySelectorAll(".habit-day").forEach(button => button.addEventListener("click", () => {
      const habit = habits.find(record => record.id === button.dataset.habit);
      const key = button.dataset.date;
      if (habit.checks[key]) delete habit.checks[key];
      else habit.checks[key] = true;
      save();
      App.refresh();
    }));
  }

  function renderMonth() {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const cells = ["一", "二", "三", "四", "五", "六", "日"].map(label => `<div class="cell off" style="background:none;font-weight:700">${label}</div>`);
    for (let i = 0; i < offset; i++) cells.push(`<div class="cell off"></div>`);
    for (let day = 1; day <= daysInMonth; day++) {
      const key = toDateKey(new Date(now.getFullYear(), now.getMonth(), day));
      const count = habits.filter(habit => habit.checks[key]).length;
      const level = count === 0 ? "" : count === 1 ? "l1" : count <= 3 ? "l2" : "l3";
      cells.push(`<div class="cell ${level}" title="${key} · ${count} 次打卡">${day}</div>`);
    }
    document.getElementById("habitMonth").innerHTML = cells.join("");
  }

  function openEditor(habit = null) {
    Modal.open({
      title: habit ? "编辑习惯" : "新建习惯",
      body: `
        <div class="field">
          <label for="hbIcon">图标（emoji）</label>
          <input id="hbIcon" maxlength="4" placeholder="📖" value="${esc(habit?.icon || "")}">
        </div>
        <div class="field">
          <label for="hbName">习惯名称</label>
          <input id="hbName" required maxlength="30" placeholder="例如：阅读 30 分钟" value="${esc(habit?.name || "")}">
        </div>
      `,
      onSubmit() {
        const data = {
          id: habit?.id || uuid(),
          name: Modal.value("hbName"),
          icon: Modal.value("hbIcon") || "✅",
          checks: habit?.checks || {}
        };
        const index = habits.findIndex(record => record.id === data.id);
        if (index >= 0) habits[index] = data;
        else habits.push(data);
        save();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "习惯已更新" : "习惯已创建");
      },
      onDelete: habit ? () => {
        if (!confirm("删除习惯会同时清除打卡记录，确定吗？")) return;
        habits = habits.filter(record => record.id !== habit.id);
        save();
        Modal.close();
        App.refresh();
        toast("习惯已删除");
      } : null
    });
  }

  window.HabitsModule = { STORAGE_KEY, streakOf };
  App.register("habits", { render });
})();
