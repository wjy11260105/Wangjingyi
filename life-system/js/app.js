(function () {
  const store = window.LifeStore;
  const config = window.LIFE_CONFIG;
  const { dateKey, addDays, pad } = window.LifeDate;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const today = () => dateKey(new Date());
  const parseDate = value => {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const startOfWeek = date => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() - ((next.getDay() || 7) - 1));
    return next;
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
  const formatDate = value => {
    if (!value) return "未设日期";
    const date = parseDate(value);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };
  const formatShortDate = value => {
    if (!value) return "待定";
    const date = parseDate(value);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };
  const active = key => store.list(key);
  const areaById = id => active("areas").find(area => area.id === id);
  const areaName = id => areaById(id)?.name || "未分类";
  const goalById = id => active("goals").find(goal => goal.id === id);
  const projectById = id => active("projects").find(project => project.id === id);
  const statusNames = {
    planning: "规划中", active: "进行中", paused: "暂停", completed: "已完成", archived: "已归档",
    idea: "想法", booked: "已预订", wishlist: "想读", reading: "阅读中", finished: "已读完",
    daily: "每日", weekly: "每周", monthly: "每月", quarterly: "每季度", yearly: "每年"
  };
  const sportNames = { run: "跑步", swim: "游泳", hyrox: "HYROX", dive: "潜水", strength: "力量", other: "其他" };
  const reflectionNames = { tarot: "塔罗", ziwei: "紫微", bazi: "八字", general: "一般感悟" };
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  let currentRoute = "dashboard";
  let scheduleWeek = startOfWeek(new Date());
  let trackingTab = "sport";
  let reflectionTab = "all";
  let toastTimer;

  function options(items, selected = "") {
    return items.map(item => `<option value="${esc(item.value)}" ${String(item.value) === String(selected) ? "selected" : ""}>${esc(item.label)}</option>`).join("");
  }

  function areaOptions(selected, includeEmpty = true) {
    const items = active("areas").map(area => ({ value: area.id, label: `${area.icon || "○"} ${area.name}` }));
    if (includeEmpty) items.unshift({ value: "", label: "暂不分类" });
    return options(items, selected);
  }

  function goalOptions(selected, includeEmpty = true) {
    const items = active("goals").filter(goal => goal.status !== "archived").map(goal => ({ value: goal.id, label: goal.title }));
    if (includeEmpty) items.unshift({ value: "", label: "不关联目标" });
    return options(items, selected);
  }

  function projectOptions(selected, includeEmpty = true) {
    const items = active("projects").filter(project => project.status !== "archived").map(project => ({ value: project.id, label: project.title }));
    if (includeEmpty) items.unshift({ value: "", label: "不关联项目" });
    return options(items, selected);
  }

  function showToast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2400);
  }

  function openLayer(selector) {
    $(selector).classList.add("open");
  }

  function closeLayer(selector) {
    $(selector).classList.remove("open");
  }

  function emptyState(icon, title, copy) {
    return `<div class="empty-state"><span>${icon}</span><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`;
  }

  function metric(icon, label, value, foot) {
    return `<article class="metric-card"><div class="metric-icon">${icon}</div><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></article>`;
  }

  function weekRange() {
    const start = startOfWeek(new Date());
    return [dateKey(start), dateKey(addDays(start, 6))];
  }

  function isInRange(value, range) {
    return value >= range[0] && value <= range[1];
  }

  function habitDone(habitId, day = today()) {
    return active("habitLogs").some(log => log.habit_id === habitId && log.log_date === day && Number(log.count) > 0);
  }

  function habitStreak(habitId) {
    let streak = 0;
    let cursor = new Date();
    if (!habitDone(habitId, dateKey(cursor))) cursor = addDays(cursor, -1);
    while (habitDone(habitId, dateKey(cursor))) {
      streak += 1;
      cursor = addDays(cursor, -1);
      if (streak > 3650) break;
    }
    return streak;
  }

  function dashboardView() {
    const goals = active("goals").filter(goal => ["active", "planning"].includes(goal.status));
    const habits = active("habits").filter(habit => habit.active);
    const completedHabits = habits.filter(habit => habitDone(habit.id)).length;
    const range = weekRange();
    const weekSports = active("sports").filter(row => isInRange(row.session_date, range));
    const weekReading = active("readings").filter(row => isInRange(row.log_date, range));
    const sportMinutes = weekSports.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
    const readingMinutes = weekReading.reduce((sum, row) => sum + Number(row.minutes || 0), 0);
    const averageProgress = goals.length ? Math.round(goals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) / goals.length) : 0;
    const nextGoal = [...goals].sort((a, b) => String(a.target_date).localeCompare(String(b.target_date)))[0];

    const areaRows = active("areas").map(area => {
      const areaGoals = goals.filter(goal => goal.life_area_id === area.id);
      const progress = areaGoals.length
        ? Math.round(areaGoals.reduce((sum, goal) => sum + Number(goal.progress || 0), 0) / areaGoals.length)
        : 0;
      return `<div>
        <div class="area-row-head"><span>${esc(area.icon)} ${esc(area.name)}</span><span>${progress}%</span></div>
        <div class="bar"><span style="width:${progress}%;background:${esc(area.color)}"></span></div>
      </div>`;
    }).join("");

    return `
      <section class="hero">
        <p>YOUR CURRENT CHAPTER</p>
        <h2>${nextGoal ? `正在靠近「${esc(nextGoal.title)}」` : "先定义方向，再安排时间。"}</h2>
        <div class="hero-meta">
          <span><strong>${goals.length}</strong> 个进行中目标</span>
          <span><strong>${averageProgress}%</strong> 平均进度</span>
          <span><strong>${completedHabits}/${habits.length}</strong> 今日习惯</span>
        </div>
      </section>
      <section class="metric-grid">
        ${metric("◎", "目标平均进度", `${averageProgress}%`, `${goals.length} 个目标正在推进`)}
        ${metric("✓", "今日习惯", habits.length ? `${Math.round(completedHabits / habits.length * 100)}%` : "0%", `${completedHabits} / ${habits.length} 已完成`)}
        ${metric("△", "本周运动", `${(sportMinutes / 60).toFixed(sportMinutes % 60 ? 1 : 0)}h`, `${weekSports.length} 次训练`)}
        ${metric("▤", "本周阅读", `${readingMinutes}m`, `${weekReading.reduce((sum, row) => sum + Number(row.pages_read || 0), 0)} 页输入`)}
      </section>
      <section class="content-grid">
        <div>
          <article class="card">
            <div class="card-head"><h3>正在推进的目标</h3><a href="#/goals">管理目标 →</a></div>
            <div class="goal-list">
              ${goals.length ? goals.slice(0, 4).map(renderGoalCard).join("") : emptyState("◎", "还没有目标", "从一个真正重要的方向开始")}
            </div>
          </article>
          <article class="card">
            <div class="card-head"><h3>今日习惯</h3><a href="#/habits">查看习惯 →</a></div>
            <div class="habit-list">
              ${habits.length ? habits.map(habit => renderHabitCard(habit, true)).join("") : emptyState("✓", "还没有习惯", "创建一个小而稳定的行动")}
            </div>
          </article>
        </div>
        <div>
          <article class="card">
            <div class="card-head"><h3>人生领域观测</h3><span class="tag">目标进度</span></div>
            <div class="area-bars">${areaRows}</div>
          </article>
          <article class="card">
            <div class="card-head"><h3>本周提醒</h3><a href="#/reviews">开始复盘 →</a></div>
            <p style="margin:0;color:var(--muted);font-size:10px;line-height:1.8">
              不只观察完成了多少，也观察哪些事情让你更有能量。每周留出二十分钟，把经历转化为经验。
            </p>
          </article>
        </div>
      </section>`;
  }

  function renderGoalCard(goal) {
    const area = areaById(goal.life_area_id);
    return `<article class="goal-card" data-edit-type="goal" data-id="${goal.id}">
      <div class="goal-top">
        <div><span class="tag" style="${area ? `color:${area.color};background:${area.color}18` : ""}">${esc(area?.name || "未分类")}</span>
          <h4 style="margin-top:9px">${esc(goal.title)}</h4></div>
        <span class="tag">${esc(statusNames[goal.status] || goal.status)}</span>
      </div>
      <p>${esc(goal.description || "尚未添加目标说明")}</p>
      <div class="progress-track"><span style="width:${Number(goal.progress || 0)}%"></span></div>
      <div class="goal-foot"><span>${Number(goal.progress || 0)}% 已完成</span><span>${formatDate(goal.target_date)}</span></div>
    </article>`;
  }

  function goalsView() {
    const goals = active("goals");
    const projects = active("projects");
    return `
      <div class="view-toolbar">
        <div><h2 class="view-title">目标与项目</h2><p>让长期方向落到阶段成果，再进入每周行动。</p></div>
        <div class="toolbar-actions">
          <button class="secondary-button" data-add="project">＋ 项目</button>
          <button class="primary-button" data-add="goal">＋ 新目标</button>
        </div>
      </div>
      <div class="content-grid">
        <section class="card">
          <div class="card-head"><h3>人生目标</h3><span class="tag">${goals.length} 个</span></div>
          <div class="goal-list">
            ${goals.length ? goals.map(goal => {
              const childProjects = projects.filter(project => project.goal_id === goal.id);
              return `${renderGoalCard(goal)}
                ${childProjects.length ? `<div class="projects">${childProjects.map(project => `
                  <div class="project-row" data-edit-type="project" data-id="${project.id}">
                    <strong>${esc(project.title)}</strong><span>${Number(project.progress || 0)}%</span>
                  </div>`).join("")}</div>` : ""}`;
            }).join("") : emptyState("◎", "写下第一个人生目标", "明确方向，项目和日程才有意义")}
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3>独立项目</h3><span>${projects.filter(item => !item.goal_id).length} 个</span></div>
          <div class="goal-list">
            ${projects.filter(item => !item.goal_id).map(project => `
              <article class="goal-card" data-edit-type="project" data-id="${project.id}">
                <span class="tag">${esc(statusNames[project.status] || project.status)}</span>
                <h4 style="margin-top:9px">${esc(project.title)}</h4>
                <p>${esc(project.description || "")}</p>
                <div class="progress-track"><span style="width:${Number(project.progress || 0)}%"></span></div>
              </article>`).join("") || emptyState("◇", "暂无独立项目", "项目也可以关联到长期目标")}
          </div>
        </section>
      </div>`;
  }

  function renderHabitCard(habit, compact = false) {
    const done = habitDone(habit.id);
    const weekStart = startOfWeek(new Date());
    return `<article class="habit-card">
      <div class="habit-today">
        <div data-edit-type="habit" data-id="${habit.id}">
          <div style="display:flex;align-items:center;gap:8px"><h4>${esc(habit.title)}</h4><span class="streak">连续 ${habitStreak(habit.id)} 天</span></div>
          <p>${esc(areaName(habit.life_area_id))} · ${esc(statusNames[habit.frequency] || habit.frequency)} ${habit.target_count}${esc(habit.unit || "次")}</p>
        </div>
        <button class="check-button ${done ? "checked" : ""}" data-habit-check="${habit.id}" aria-label="${done ? "取消完成" : "标记完成"}">✓</button>
      </div>
      ${compact ? "" : `<div class="habit-week">${Array.from({ length: 7 }, (_, index) => {
        const day = addDays(weekStart, index);
        return `<div class="habit-day ${habitDone(habit.id, dateKey(day)) ? "done" : ""}">${weekdays[index]}<i></i></div>`;
      }).join("")}</div>`}
    </article>`;
  }

  function habitsView() {
    const habits = active("habits").filter(habit => habit.active);
    const completed = habits.filter(habit => habitDone(habit.id)).length;
    return `
      <div class="view-toolbar">
        <div><h2 class="view-title">习惯追踪</h2><p>用可持续的小行动，建立想成为的自己。</p></div>
        <button class="primary-button" data-add="habit">＋ 新习惯</button>
      </div>
      <section class="metric-grid">
        ${metric("✓", "今日完成", `${completed}/${habits.length}`, "每一次勾选都在积累身份")}
        ${metric("↗", "今日完成率", habits.length ? `${Math.round(completed / habits.length * 100)}%` : "0%", "不追求完美，追求持续")}
        ${metric("♨", "最长连续", `${Math.max(0, ...habits.map(habit => habitStreak(habit.id)))}天`, "来自当前活跃习惯")}
        ${metric("○", "活跃习惯", `${habits.length}`, "保持少而重要")}
      </section>
      <section class="card">
        <div class="card-head"><h3>本周习惯</h3><span class="tag">点击右侧完成今日打卡</span></div>
        <div class="habit-list">${habits.length ? habits.map(habit => renderHabitCard(habit)).join("") : emptyState("✓", "创建第一个习惯", "建议从每天十分钟开始")}</div>
      </section>`;
  }

  function scheduleView() {
    const end = addDays(scheduleWeek, 6);
    const events = active("events");
    const todayKey = today();
    return `
      <div class="view-toolbar">
        <div><h2 class="view-title">日程安排</h2><p>${scheduleWeek.getMonth() + 1}月${scheduleWeek.getDate()}日 — ${end.getMonth() + 1}月${end.getDate()}日</p></div>
        <div class="toolbar-actions">
          <button class="icon-button" data-week="-1">‹</button>
          <button class="secondary-button" data-week="0">今天</button>
          <button class="icon-button" data-week="1">›</button>
          <button class="primary-button" data-add="event">＋ 日程</button>
        </div>
      </div>
      <section class="week-strip">
        ${Array.from({ length: 7 }, (_, index) => {
          const day = addDays(scheduleWeek, index);
          const key = dateKey(day);
          const dayEvents = events.filter(event => event.event_date === key).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
          return `<div class="week-day ${key === todayKey ? "today" : ""}">
            <div class="week-date">周${weekdays[index]}<strong>${day.getDate()}</strong></div>
            ${dayEvents.map(event => `<button class="event-block" data-edit-type="event" data-id="${event.id}">
              <small>${String(event.start_time).slice(0, 5)}–${String(event.end_time).slice(0, 5)}</small>
              <strong>${esc(event.title)}</strong>
            </button>`).join("")}
          </div>`;
        }).join("")}
      </section>`;
  }

  function reviewsView() {
    const reviews = active("reviews").sort((a, b) => String(b.period_start).localeCompare(String(a.period_start)));
    return `
      <div class="view-toolbar">
        <div><h2 class="view-title">周期复盘</h2><p>把经历转化为经验，让下一段行动更有方向。</p></div>
        <button class="primary-button" data-add="review">＋ 开始复盘</button>
      </div>
      <section class="content-grid">
        <div class="card">
          <div class="card-head"><h3>复盘记录</h3><span class="tag">${reviews.length} 篇</span></div>
          <div class="review-list">
            ${reviews.length ? reviews.map(review => `<article class="review-card" data-edit-type="review" data-id="${review.id}">
              <div class="record-top"><span class="tag">${esc(statusNames[review.period_type] || review.period_type)}复盘</span><small>${formatShortDate(review.period_start)}—${formatShortDate(review.period_end)}</small></div>
              <h4 style="margin-top:10px">${esc(review.highlights || "这一阶段的复盘")}</h4>
              <p>${esc(review.next_focus || review.improvements || "尚未填写下一阶段重点")}</p>
            </article>`).join("") : emptyState("↻", "还没有复盘", "完成第一次周复盘，建立成长反馈")}
          </div>
        </div>
        <div>
          <article class="card">
            <div class="card-head"><h3>推荐结构</h3><span class="tag">20 分钟</span></div>
            <div class="area-bars">
              <div><div class="area-row-head"><span>01 · 哪些事值得肯定？</span></div><div class="bar"><span style="width:100%;background:var(--green)"></span></div></div>
              <div><div class="area-row-head"><span>02 · 哪些地方可以调整？</span></div><div class="bar"><span style="width:72%;background:var(--orange)"></span></div></div>
              <div><div class="area-row-head"><span>03 · 下一阶段最重要的事？</span></div><div class="bar"><span style="width:45%;background:var(--purple)"></span></div></div>
            </div>
          </article>
        </div>
      </section>`;
  }

  function trackingView() {
    const tabButtons = [
      ["sport", "运动训练"], ["reading", "阅读输入"], ["trip", "旅行探索"]
    ].map(([value, label]) => `<button class="tab ${trackingTab === value ? "active" : ""}" data-tracking-tab="${value}">${label}</button>`).join("");
    let content;
    if (trackingTab === "sport") content = sportsPanel();
    else if (trackingTab === "reading") content = readingPanel();
    else content = tripsPanel();
    return `
      <div class="view-toolbar">
        <div><h2 class="view-title">成长记录</h2><p>记录身体、知识与世界带给你的变化。</p></div>
      </div>
      <div class="tabs">${tabButtons}</div>
      ${content}`;
  }

  function sportsPanel() {
    const rows = active("sports").sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)));
    const minutes = rows.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
    const distance = rows.reduce((sum, row) => sum + Number(row.distance_km || 0), 0);
    return `<section class="card">
      <div class="card-head"><h3>运动训练</h3><button class="primary-button" data-add="sport">＋ 记录训练</button></div>
      <div class="record-metrics">
        <div class="mini-stat"><span>累计训练</span><strong>${rows.length} 次</strong></div>
        <div class="mini-stat"><span>累计时长</span><strong>${(minutes / 60).toFixed(1)} h</strong></div>
        <div class="mini-stat"><span>累计距离</span><strong>${distance.toFixed(1)} km</strong></div>
      </div>
      <div class="record-list">${rows.length ? rows.map(row => `<article class="record-card" data-edit-type="sport" data-id="${row.id}">
        <div class="record-top"><span class="tag">${esc(sportNames[row.sport_type] || row.sport_type)}</span><small>${formatDate(row.session_date)}</small></div>
        <h4 style="margin-top:9px">${Number(row.duration_minutes || 0)} 分钟 ${row.distance_km ? `· ${Number(row.distance_km)} km` : ""}</h4>
        <p>${esc(row.feeling || row.note || "完成一次训练")}</p>
      </article>`).join("") : emptyState("△", "还没有训练记录", "跑步、游泳、HYROX 和潜水都可以记录")}</div>
    </section>`;
  }

  function readingPanel() {
    const rows = active("readings").sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)));
    return `<section class="card">
      <div class="card-head"><h3>阅读输入</h3><button class="primary-button" data-add="reading">＋ 记录阅读</button></div>
      <div class="record-metrics">
        <div class="mini-stat"><span>阅读记录</span><strong>${rows.length} 次</strong></div>
        <div class="mini-stat"><span>累计页数</span><strong>${rows.reduce((sum, row) => sum + Number(row.pages_read || 0), 0)} 页</strong></div>
        <div class="mini-stat"><span>累计时间</span><strong>${rows.reduce((sum, row) => sum + Number(row.minutes || 0), 0)} min</strong></div>
      </div>
      <div class="record-list">${rows.length ? rows.map(row => `<article class="record-card" data-edit-type="reading" data-id="${row.id}">
        <div class="record-top"><span class="tag">${esc(statusNames[row.status] || row.status)}</span><small>${formatDate(row.log_date)}</small></div>
        <h4 style="margin-top:9px">《${esc(row.book_title)}》${row.author ? ` · ${esc(row.author)}` : ""}</h4>
        <p>${esc(row.note || `阅读 ${row.pages_read || 0} 页，${row.minutes || 0} 分钟`)}</p>
      </article>`).join("") : emptyState("▤", "还没有阅读记录", "记录书籍、页数和真正触动你的观点")}</div>
    </section>`;
  }

  function tripsPanel() {
    const rows = active("trips").sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
    return `<section class="card">
      <div class="card-head"><h3>旅行探索</h3><button class="primary-button" data-add="trip">＋ 旅行计划</button></div>
      <div class="record-list">${rows.length ? rows.map(row => `<article class="record-card" data-edit-type="trip" data-id="${row.id}">
        <div class="record-top"><span class="tag">${esc(statusNames[row.status] || row.status)}</span><small>${formatShortDate(row.start_date)}—${formatShortDate(row.end_date)}</small></div>
        <h4 style="margin-top:9px">${esc(row.title)}</h4>
        <p>${esc(row.destination || "目的地待定")} · ${esc(row.note || "等待出发")}</p>
      </article>`).join("") : emptyState("✦", "还没有旅行计划", "从一个想去的地方开始规划")}</div>
    </section>`;
  }

  function reflectionsView() {
    const tabs = [["all", "全部"], ["tarot", "塔罗"], ["ziwei", "紫微"], ["bazi", "八字"], ["general", "一般感悟"]];
    const rows = active("reflections")
      .filter(row => reflectionTab === "all" || row.modality === reflectionTab)
      .sort((a, b) => String(b.reflection_date).localeCompare(String(a.reflection_date)));
    return `
      <div class="view-toolbar">
        <div><h2 class="view-title">内在感悟</h2><p>记录象征、直觉和验证；它们用于自我观察，而不是替代现实决策。</p></div>
        <button class="primary-button" data-add="reflection">＋ 新感悟</button>
      </div>
      <div class="tabs">${tabs.map(([value, label]) => `<button class="tab ${reflectionTab === value ? "active" : ""}" data-reflection-tab="${value}">${label}</button>`).join("")}</div>
      <section class="card">
        <div class="record-list">${rows.length ? rows.map(row => `<article class="record-card reflection-card" data-edit-type="reflection" data-id="${row.id}">
          <div class="record-top"><span class="tag">${esc(reflectionNames[row.modality] || row.modality)}</span><small>${formatDate(row.reflection_date)}</small></div>
          <h4 style="margin-top:9px">${esc(row.title)}</h4>
          <p>${esc(row.content)}</p>
          ${row.verification ? `<p><strong>后续验证：</strong>${esc(row.verification)}</p>` : ""}
        </article>`).join("") : emptyState("✦", "还没有内在记录", "保留当下的感受，也允许未来重新理解")}</div>
      </section>`;
  }

  function renderSidebars() {
    const areaCounts = new Map();
    active("goals").forEach(goal => areaCounts.set(goal.life_area_id, (areaCounts.get(goal.life_area_id) || 0) + 1));
    $("#sidebarAreas").innerHTML = active("areas").map(area => `
      <div class="area-mini"><i class="area-dot" style="background:${esc(area.color)}"></i><span>${esc(area.name)}</span><span>${areaCounts.get(area.id) || 0}</span></div>
    `).join("");

    const dayEvents = active("events").filter(event => event.event_date === today()).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    const habits = active("habits").filter(habit => habit.active && !habitDone(habit.id));
    $("#todayActionCount").textContent = `${dayEvents.length + habits.length} 项`;
    $("#todayActions").innerHTML = [
      ...dayEvents.map(event => `<div class="side-item"><div class="side-item-time">${String(event.start_time).slice(0, 5)}</div><div><strong>${esc(event.title)}</strong><small>${esc(event.location || "日程")}</small></div></div>`),
      ...habits.slice(0, 3).map(habit => `<div class="side-item"><div class="side-item-time">习惯</div><div><strong>${esc(habit.title)}</strong><small>今日待完成</small></div></div>`)
    ].join("") || emptyState("○", "今天暂无安排", "给自己留一点空间");

    const goals = active("goals").filter(goal => goal.status === "active").slice(0, 3);
    $("#sideGoals").innerHTML = goals.map(goal => `<div class="side-item"><div class="side-item-time">${Number(goal.progress || 0)}%</div><div><strong>${esc(goal.title)}</strong><small>${formatShortDate(goal.target_date)} 截止</small></div></div>`).join("")
      || emptyState("◎", "暂无近期目标", "先定义一个方向");
  }

  function render() {
    const route = location.hash.replace("#/", "").split("?")[0] || "dashboard";
    currentRoute = config.routes[route] ? route : "dashboard";
    $("#pageTitle").textContent = config.routes[currentRoute];
    $$("[data-route]").forEach(link => link.classList.toggle("active", link.dataset.route === currentRoute));
    const renderers = {
      dashboard: dashboardView,
      schedule: scheduleView,
      goals: goalsView,
      habits: habitsView,
      reviews: reviewsView,
      tracking: trackingView,
      reflections: reflectionsView
    };
    $("#view").innerHTML = renderers[currentRoute]();
    renderSidebars();
  }

  const formSchemas = {
    goal: {
      key: "goals", title: "人生目标", kicker: "DIRECTION",
      fields: [
        ["title", "目标名称", "text", true, "例如：建立 AI 工程能力体系"],
        ["life_area_id", "人生领域", "area"],
        ["description", "为什么重要", "textarea", false, "写下这个目标与你的关系"],
        ["status", "状态", "select", true, [["planning", "规划中"], ["active", "进行中"], ["paused", "暂停"], ["completed", "已完成"]]],
        ["progress", "当前进度（%）", "number", true, "0"],
        ["target_date", "目标日期", "date"]
      ]
    },
    project: {
      key: "projects", title: "阶段项目", kicker: "PROJECT",
      fields: [
        ["title", "项目名称", "text", true],
        ["goal_id", "关联目标", "goal"],
        ["life_area_id", "人生领域", "area"],
        ["description", "项目说明", "textarea"],
        ["status", "状态", "select", true, [["planning", "规划中"], ["active", "进行中"], ["paused", "暂停"], ["completed", "已完成"]]],
        ["progress", "当前进度（%）", "number", true, "0"],
        ["start_date", "开始日期", "date"],
        ["due_date", "截止日期", "date"]
      ]
    },
    habit: {
      key: "habits", title: "成长习惯", kicker: "CONSISTENCY",
      fields: [
        ["title", "习惯名称", "text", true, "例如：每天学习 AI 30 分钟"],
        ["life_area_id", "人生领域", "area"],
        ["frequency", "频率", "select", true, [["daily", "每日"], ["weekly", "每周"], ["custom", "自定义"]]],
        ["target_count", "目标次数", "number", true, "1"],
        ["unit", "单位", "text", false, "次"],
        ["color", "标记颜色", "color"]
      ]
    },
    event: {
      key: "events", title: "日程安排", kicker: "ACTION",
      fields: [
        ["title", "日程名称", "text", true],
        ["type", "日程类型", "select", true, [["competition", "比赛"], ["sport", "运动"], ["work", "工作"], ["study", "学习"], ["life", "生活"]]],
        ["event_date", "日期", "date", true],
        ["start_time", "开始时间", "time", true],
        ["end_time", "结束时间", "time", true],
        ["life_area_id", "人生领域", "area"],
        ["goal_id", "关联目标", "goal"],
        ["project_id", "关联项目", "project"],
        ["location", "地点", "text"],
        ["note", "备注", "textarea"]
      ]
    },
    review: {
      key: "reviews", title: "周期复盘", kicker: "REVIEW",
      fields: [
        ["period_type", "复盘周期", "select", true, [["weekly", "周复盘"], ["monthly", "月复盘"], ["quarterly", "季度复盘"], ["yearly", "年度复盘"]]],
        ["period_start", "开始日期", "date", true],
        ["period_end", "结束日期", "date", true],
        ["highlights", "值得肯定的事", "textarea", false, "完成了什么？什么让你感到有能量？"],
        ["improvements", "可以调整的事", "textarea", false, "哪些阻力反复出现？"],
        ["next_focus", "下一阶段重点", "textarea", false, "只选择一到三件最重要的事"],
        ["mood", "整体心情（1–5）", "number"],
        ["energy_score", "能量状态（1–5）", "number"]
      ]
    },
    sport: {
      key: "sports", title: "运动训练", kicker: "MOVEMENT",
      fields: [
        ["sport_type", "运动项目", "select", true, [["run", "跑步"], ["swim", "游泳"], ["hyrox", "HYROX"], ["dive", "潜水"], ["strength", "力量"], ["other", "其他"]]],
        ["session_date", "训练日期", "date", true],
        ["duration_minutes", "时长（分钟）", "number", true, "60"],
        ["distance_km", "距离（公里）", "number"],
        ["intensity", "强度（1–5）", "number"],
        ["feeling", "训练感受", "text"],
        ["note", "训练备注", "textarea"]
      ]
    },
    reading: {
      key: "readings", title: "阅读记录", kicker: "INPUT",
      fields: [
        ["book_title", "书名", "text", true],
        ["author", "作者", "text"],
        ["log_date", "阅读日期", "date", true],
        ["pages_read", "阅读页数", "number"],
        ["minutes", "阅读分钟", "number"],
        ["status", "阅读状态", "select", true, [["wishlist", "想读"], ["reading", "阅读中"], ["finished", "已读完"], ["paused", "暂停"]]],
        ["note", "读书笔记", "textarea", false, "记录真正触动你的观点"]
      ]
    },
    trip: {
      key: "trips", title: "旅行计划", kicker: "EXPLORE",
      fields: [
        ["title", "旅行主题", "text", true],
        ["destination", "目的地", "text"],
        ["start_date", "开始日期", "date"],
        ["end_date", "结束日期", "date"],
        ["status", "状态", "select", true, [["idea", "想法"], ["planning", "规划中"], ["booked", "已预订"], ["completed", "已完成"]]],
        ["budget", "预算", "number"],
        ["note", "计划与复盘", "textarea"]
      ]
    },
    reflection: {
      key: "reflections", title: "内在感悟", kicker: "REFLECTION",
      fields: [
        ["modality", "记录类型", "select", true, [["tarot", "塔罗"], ["ziwei", "紫微"], ["bazi", "八字"], ["general", "一般感悟"]]],
        ["reflection_date", "记录日期", "date", true],
        ["title", "主题", "text", true],
        ["content", "当下的理解", "textarea", true, "记录象征、感受和你的理解"],
        ["question", "问题或背景", "text"],
        ["symbols", "牌面 / 星曜 / 四柱等", "text"],
        ["verification", "后续验证", "textarea", false, "过一段时间后再回来记录"]
      ]
    }
  };

  function fieldMarkup(field, record) {
    const [name, label, type, required, extra] = field;
    let value = record?.[name] ?? "";
    if (name === "question") value = record?.metadata?.question || "";
    if (name === "symbols") value = record?.metadata?.symbols || "";
    const requiredAttr = required ? "required" : "";
    const full = type === "textarea" || ["description", "highlights", "improvements", "next_focus", "note", "content", "verification"].includes(name);
    if (type === "area") return `<label class="field"><span>${label}</span><select name="${name}">${areaOptions(value)}</select></label>`;
    if (type === "goal") return `<label class="field"><span>${label}</span><select name="${name}">${goalOptions(value)}</select></label>`;
    if (type === "project") return `<label class="field"><span>${label}</span><select name="${name}">${projectOptions(value)}</select></label>`;
    if (type === "select") {
      return `<label class="field"><span>${label}</span><select name="${name}" ${requiredAttr}>${options(extra.map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel })), value)}</select></label>`;
    }
    if (type === "textarea") return `<label class="field ${full ? "full" : ""}"><span>${label}</span><textarea name="${name}" ${requiredAttr} placeholder="${esc(extra || "")}">${esc(value)}</textarea></label>`;
    const step = ["distance_km", "budget"].includes(name) ? 'step="0.01"' : "";
    const minmax = ["progress"].includes(name) ? 'min="0" max="100"' : ["mood", "energy_score", "intensity"].includes(name) ? 'min="1" max="5"' : type === "number" ? 'min="0"' : "";
    return `<label class="field ${full ? "full" : ""}"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${requiredAttr} ${step} ${minmax} placeholder="${esc(extra || "")}"></label>`;
  }

  function defaultRecord(type) {
    const base = {};
    if (type === "event") Object.assign(base, { event_date: today(), start_time: "09:00", end_time: "10:00", type: "life" });
    if (type === "goal") Object.assign(base, { status: "active", progress: 0 });
    if (type === "project") Object.assign(base, { status: "active", progress: 0, start_date: today() });
    if (type === "habit") Object.assign(base, { frequency: "daily", target_count: 1, unit: "次", color: "#4f8468", active: true });
    if (type === "review") {
      const start = startOfWeek(new Date());
      Object.assign(base, { period_type: "weekly", period_start: dateKey(start), period_end: dateKey(addDays(start, 6)), mood: 3, energy_score: 3 });
    }
    if (type === "sport") Object.assign(base, { sport_type: "run", session_date: today(), duration_minutes: 60, intensity: 3 });
    if (type === "reading") Object.assign(base, { log_date: today(), status: "reading", pages_read: 0, minutes: 30 });
    if (type === "trip") Object.assign(base, { status: "idea" });
    if (type === "reflection") Object.assign(base, { modality: "general", reflection_date: today() });
    return base;
  }

  function openEntity(type, id = null) {
    const schema = formSchemas[type];
    if (!schema) return;
    const record = id ? store.get(schema.key, id) : defaultRecord(type);
    $("#entityType").value = type;
    $("#entityId").value = id || "";
    $("#modalKicker").textContent = schema.kicker;
    $("#modalTitle").textContent = id ? `编辑${schema.title}` : `新增${schema.title}`;
    $("#formFields").innerHTML = schema.fields.map(field => fieldMarkup(field, record)).join("");
    $("#deleteEntity").classList.toggle("hidden", !id);
    openLayer("#entityModal");
    setTimeout(() => $("#formFields input:not([type=date]):not([type=time])")?.focus(), 80);
  }

  function formRecord(type) {
    const schema = formSchemas[type];
    const data = Object.fromEntries(new FormData($("#entityForm")).entries());
    schema.fields.forEach(([name, _label, fieldType]) => {
      if (fieldType === "number" && data[name] !== "") data[name] = Number(data[name]);
      if (data[name] === "") data[name] = null;
    });
    if (type === "habit") data.active = true;
    if (type === "sport") data.life_area_id = active("areas").find(area => area.slug === "health")?.id || null;
    if (type === "reading") data.life_area_id = active("areas").find(area => area.slug === "learning")?.id || null;
    if (type === "trip") data.life_area_id = active("areas").find(area => area.slug === "explore")?.id || null;
    if (type === "reflection") {
      data.life_area_id = active("areas").find(area => area.slug === "inner")?.id || null;
      data.metadata = { question: data.question || "", symbols: data.symbols || "" };
      delete data.question;
      delete data.symbols;
    }
    return data;
  }

  function toggleHabit(id) {
    const allLogs = store.list("habitLogs", { includeDeleted: true });
    const existing = allLogs.find(log => log.habit_id === id && log.log_date === today());
    if (existing && !existing.deleted_at) {
      store.remove("habitLogs", existing.id);
      showToast("已取消今日打卡");
    } else {
      store.upsert("habitLogs", { ...(existing || {}), habit_id: id, log_date: today(), count: 1, note: "" });
      showToast("今日习惯已完成");
    }
  }

  function updateAccount(type) {
    const signedIn = Boolean(store.user);
    $("#accountName").textContent = signedIn ? (store.user.email?.split("@")[0] || "云端账号") : "本地模式";
    $("#signedInEmail").textContent = store.user?.email || "";
    $("#authForm").classList.toggle("hidden", signedIn);
    $("#signedInPanel").classList.toggle("hidden", !signedIn);
    const labels = {
      syncing: "正在同步…", synced: "云端已同步", "sync-error": "部分数据待同步",
      "schema-missing": "需要升级数据库", auth: signedIn ? "云端已连接" : "数据保存在此设备"
    };
    $("#syncState").textContent = labels[type] || (signedIn ? "云端已连接" : "数据保存在此设备");
    $("#syncButton").classList.toggle("syncing", type === "syncing");
    if (type === "schema-missing") showToast("请先在 Supabase 执行人生管理系统升级 SQL");
    if (type === "sync-error") showToast("部分云端数据同步失败，本地记录已保留");
  }

  function bindEvents() {
    window.addEventListener("hashchange", render);
    $("#view").addEventListener("click", event => {
      const addButton = event.target.closest("[data-add]");
      if (addButton) return openEntity(addButton.dataset.add);
      const edit = event.target.closest("[data-edit-type]");
      if (edit && !event.target.closest("[data-habit-check]")) return openEntity(edit.dataset.editType, edit.dataset.id);
      const habit = event.target.closest("[data-habit-check]");
      if (habit) return toggleHabit(habit.dataset.habitCheck);
      const weekButton = event.target.closest("[data-week]");
      if (weekButton) {
        const direction = Number(weekButton.dataset.week);
        scheduleWeek = direction === 0 ? startOfWeek(new Date()) : addDays(scheduleWeek, direction * 7);
        render();
        return;
      }
      const tracking = event.target.closest("[data-tracking-tab]");
      if (tracking) {
        trackingTab = tracking.dataset.trackingTab;
        render();
        return;
      }
      const reflection = event.target.closest("[data-reflection-tab]");
      if (reflection) {
        reflectionTab = reflection.dataset.reflectionTab;
        render();
      }
    });

    $("#quickAddButton").addEventListener("click", () => openLayer("#quickModal"));
    $("#mobileAdd").addEventListener("click", () => openLayer("#quickModal"));
    $$("[data-quick]").forEach(button => button.addEventListener("click", () => {
      closeLayer("#quickModal");
      openEntity(button.dataset.quick);
    }));
    $$("[data-close-modal]").forEach(button => button.addEventListener("click", () => closeLayer("#entityModal")));
    $$("[data-close-quick]").forEach(button => button.addEventListener("click", () => closeLayer("#quickModal")));
    $$("[data-close-auth]").forEach(button => button.addEventListener("click", () => closeLayer("#authModal")));
    $$(".modal-backdrop").forEach(layer => layer.addEventListener("click", event => {
      if (event.target === layer) layer.classList.remove("open");
    }));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") $$(".modal-backdrop").forEach(layer => layer.classList.remove("open"));
    });

    $("#entityForm").addEventListener("submit", event => {
      event.preventDefault();
      const type = $("#entityType").value;
      const schema = formSchemas[type];
      const id = $("#entityId").value;
      const data = formRecord(type);
      if (type === "event" && data.end_time <= data.start_time) {
        showToast("结束时间需要晚于开始时间");
        return;
      }
      store.upsert(schema.key, { ...(id ? store.get(schema.key, id) : {}), ...data, id: id || undefined });
      closeLayer("#entityModal");
      showToast(id ? "记录已更新" : "记录已保存");
    });
    $("#deleteEntity").addEventListener("click", () => {
      const type = $("#entityType").value;
      const id = $("#entityId").value;
      if (!id || !confirm("确定删除这条记录吗？")) return;
      store.remove(formSchemas[type].key, id);
      closeLayer("#entityModal");
      showToast("记录已删除");
    });

    $("#accountButton").addEventListener("click", () => openLayer("#authModal"));
    $("#syncButton").addEventListener("click", () => store.user ? store.sync() : openLayer("#authModal"));
    $("#authForm").addEventListener("submit", async event => {
      event.preventDefault();
      const result = await store.signIn($("#authEmail").value.trim(), $("#authPassword").value);
      if (result.error) return showToast(`登录失败：${result.error.message}`);
      closeLayer("#authModal");
      showToast("登录成功，正在同步人生记录");
    });
    $("#signUpButton").addEventListener("click", async () => {
      if (!$("#authForm").reportValidity()) return;
      const result = await store.signUp($("#authEmail").value.trim(), $("#authPassword").value);
      if (result.error) return showToast(`注册失败：${result.error.message}`);
      showToast(result.data.session ? "注册成功，正在同步" : "注册成功，请前往邮箱完成验证");
    });
    $("#signOutButton").addEventListener("click", async () => {
      await store.signOut();
      closeLayer("#authModal");
      showToast("已退出账号，本地记录仍然保留");
    });
    $("#manualSyncButton").addEventListener("click", () => store.sync());
  }

  function initializeDate() {
    const now = new Date();
    const dayNames = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    $("#dateLine").textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${dayNames[now.getDay()]}`;
    $("#todayNumber").textContent = now.getDate();
    $("#todayMonth").textContent = `${now.getMonth() + 1}月 · ${dayNames[now.getDay()]}`;
  }

  store.subscribe(type => {
    updateAccount(type);
    if (!["syncing"].includes(type)) render();
  });
  bindEvents();
  initializeDate();
  updateAccount("auth");
  render();
  store.initializeAuth();
  window.addEventListener("focus", () => { if (store.user) store.sync(); });
})();
