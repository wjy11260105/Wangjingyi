/* 人生总览:年度活跃热力图 + 各模块汇总 */
(() => {
  const { toDateKey, parseDate, addDays, startOfWeek, esc } = U;

  const getEvents = () => Store.get("my-schedule-events-v1", []);
  const getGoals = () => Store.get("life-goals-v1", []);
  const getWorkouts = () => Store.get("life-workouts-v1", []);
  const getHabits = () => Store.get("life-habits-v1", []);
  const getFragments = () => Store.get("life-fragments-v1", []);
  const getBooks = () => Store.get("life-books-v1", []);
  const getLifeItems = () => Store.get("life-trips-v1", []).map(item => ({
    ...item,
    title: item.title || item.place || "未命名事项",
    status: item.status === "wish" ? "idea" : item.status
  }));

  /* 每日活跃度 = 训练次数 + 习惯打卡数 + 已完成日程数 + 碎片记录 */
  function activityMap() {
    const map = {};
    const bump = (key, n = 1) => { map[key] = (map[key] || 0) + n; };
    getWorkouts().forEach(item => bump(item.date));
    getHabits().forEach(habit => Object.keys(habit.checks || {}).forEach(key => bump(key)));
    getEvents().forEach(event => { if (event.done) bump(event.date); });
    getFragments().forEach(item => {
      const key = item.date || (item.createdAt || "").slice(0, 10);
      if (key) bump(key);
    });
    return map;
  }

  function heatmapHTML() {
    const map = activityMap();
    const end = new Date();
    /* 从 52 周前的周一开始 */
    const start = startOfWeek(addDays(end, -364));
    const days = Math.round((end - start) / 86400000) + 1;
    const cells = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(start, i);
      const key = toDateKey(date);
      const count = map[key] || 0;
      const level = count === 0 ? "" : count === 1 ? "l1" : count === 2 ? "l2" : count <= 4 ? "l3" : "l4";
      cells.push(`<i class="${level}" title="${key} · ${count} 项活跃"></i>`);
    }
    return `<div class="heatmap-wrap"><div class="heatmap">${cells.join("")}</div></div>
      <div class="heatmap-legend">少 <i></i><i class="l1" style="background:#cfe3d6"></i><i class="l2" style="background:#8fbfa2"></i><i class="l3" style="background:#4c8465"></i><i class="l4" style="background:#244f3d"></i> 多 · 训练 / 打卡 / 日程 / 碎片</div>`;
  }

  function render(root) {
    const now = new Date();
    const todayKey = toDateKey(now);
    const hour = now.getHours();
    const greeting = hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";

    const events = getEvents();
    const goals = getGoals().filter(goal => goal.status === "active");
    const workouts = getWorkouts();
    const habits = getHabits();
    const fragments = getFragments();
    const books = getBooks();
    const lifeItems = getLifeItems();
    const todayBazi = Lunar.bazi(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
      now.getHours()
    );

    /* 本周训练时长 */
    const weekStart = toDateKey(startOfWeek(now));
    const weekEnd = toDateKey(addDays(startOfWeek(now), 6));
    const weekHours = workouts
      .filter(item => item.date >= weekStart && item.date <= weekEnd)
      .reduce((sum, item) => sum + (Number(item.duration) || 0), 0) / 60;

    const doneToday = habits.filter(habit => (habit.checks || {})[todayKey]).length;
    const avgGoal = goals.length
      ? Math.round(goals.reduce((sum, goal) => sum + GoalsModule.progressOf(goal), 0) / goals.length)
      : 0;

    const upcoming = events
      .filter(event => event.date >= todayKey && event.date <= toDateKey(addDays(now, 7)))
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
      .slice(0, 5);

    const learning = books.filter(item => ["learning", "reading"].includes(item.status));
    const futureItems = lifeItems.filter(item => ["idea", "planned", "active"].includes(item.status));

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">${now.getMonth() + 1}月${now.getDate()}日 · ${["周日","周一","周二","周三","周四","周五","周六"][now.getDay()]}</p>
          <h1>${greeting}，看看你的人生仪表盘。</h1>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary clickable" data-go="habits">
          <div class="stat-label">今日习惯打卡</div>
          <div class="stat-value">${doneToday} / ${habits.length}</div>
          <div class="stat-sub">${habits.length && doneToday === habits.length ? "全部完成，今天很棒" : "点亮今天"}</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat clickable" data-go="training">
          <div class="stat-label">本周训练</div>
          <div class="stat-value">${weekHours.toFixed(1)}<small> 小时</small></div>
          <div class="stat-sub">身体是本钱</div>
        </article>
        <article class="stat clickable" data-go="goals">
          <div class="stat-label">目标平均进度</div>
          <div class="stat-value">${avgGoal}<small>%</small></div>
          <div class="stat-sub">${goals.length} 个进行中</div>
        </article>
        <article class="stat clickable" data-go="schedule">
          <div class="stat-label">未来 7 天日程</div>
          <div class="stat-value">${upcoming.length === 5 ? "5+" : upcoming.length}</div>
          <div class="stat-sub">从容准备</div>
        </article>
      </section>
      <section class="panel">
        <div class="panel-head"><h3>年度活跃热力图</h3><span class="hint">最近 52 周</span></div>
        ${heatmapHTML()}
      </section>
      <div class="dash-cols" style="margin-top:15px">
        <div>
          <section class="panel">
            <div class="panel-head"><h3>目标进度</h3><button class="ghost-btn small" data-go="goals">全部目标</button></div>
            ${goals.length ? `<div class="overview-list">${goals.slice(0, 4).map(goal => {
              const pct = GoalsModule.progressOf(goal);
              return `<div class="overview-item">
                <span class="oi-main">${esc(goal.title)}</span>
                <div class="progress" style="width:90px;flex:none"><span style="width:${pct}%"></span></div>
                <b style="font-family:Georgia,serif;font-weight:500">${pct}%</b>
              </div>`;
            }).join("")}</div>` : `<div class="empty">还没有进行中的目标</div>`}
          </section>
          <section class="panel">
            <div class="panel-head"><h3>接下来</h3><button class="ghost-btn small" data-go="schedule">打开日程</button></div>
            ${upcoming.length ? `<div class="upcoming">${upcoming.map(event => {
              const date = parseDate(event.date);
              return `<article class="upcoming-card">
                <div class="date-box">${date.getMonth() + 1}月<strong>${date.getDate()}</strong></div>
                <div class="upcoming-info">
                  <div class="upcoming-type">${{ competition: "比赛", sport: "运动", work: "工作", study: "学习", life: "生活" }[event.type] || ""}</div>
                  <h4>${esc(event.title)}</h4>
                  <p>${esc(event.start)} · ${esc(event.location || "地点待定")}</p>
                </div>
              </article>`;
            }).join("")}</div>` : `<div class="empty">未来 7 天暂无安排</div>`}
          </section>
        </div>
        <div>
          <section class="panel">
            <div class="panel-head"><h3>今天的八字信息</h3><button class="ghost-btn small" data-go="mystic">查看命盘</button></div>
            <div class="today-bazi">
              <div class="today-bazi-grid">
                ${todayBazi.pillars.map(pillar => `
                  <div class="today-bazi-pillar">
                    <small>${pillar.name}</small>
                    <b>${pillar.gan}${pillar.zhi}</b>
                  </div>`).join("")}
              </div>
              <p class="today-bazi-note">
                今日为 <b>${todayBazi.pillars[2].gan}${todayBazi.pillars[2].zhi}</b> 日，
                日主五行属 <b>${todayBazi.dayMasterElement}</b>；
                当前是 <b>${todayBazi.pillars[3].gan}${todayBazi.pillars[3].zhi}</b> 时。
              </p>
            </div>
          </section>
          <section class="panel">
            <div class="panel-head"><h3>生活切片</h3></div>
            <div class="overview-list">
              <div class="overview-item"><span class="oi-icon">💭</span><span class="oi-main">碎片收件箱 ${fragments.filter(item => !item.organized).length} 条待整理</span></div>
              <div class="overview-item"><span class="oi-icon">🎓</span><span class="oi-main">${learning.length ? `正在学习：${esc(learning[0].title)} ${learning[0].progress || 0}%` : "还没有进行中的学习项目"}</span></div>
              <div class="overview-item"><span class="oi-icon">🏃</span><span class="oi-main">累计训练 ${workouts.length} 次</span></div>
              <div class="overview-item"><span class="oi-icon">✨</span><span class="oi-main">${futureItems.length ? `想做：${esc(futureItems[0].title)}${futureItems.length > 1 ? ` 等 ${futureItems.length} 件` : ""}` : "写下下一件想做的事吧"}</span></div>
              <div class="overview-item"><span class="oi-icon">🏆</span><span class="oi-main">人生清单累计完成 ${lifeItems.filter(item => item.status === "done").length} 件</span></div>
            </div>
          </section>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-go]").forEach(node => node.addEventListener("click", () => App.navigate(node.dataset.go)));
  }

  App.register("dashboard", { render });
})();
