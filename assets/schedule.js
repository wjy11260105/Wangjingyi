/* 日程模块:沿用原有数据 key,周视图 + 未来7天 + 完成标记 */
(() => {
  const { toDateKey, parseDate, addDays, startOfWeek, esc, uuid } = U;
  const STORAGE_KEY = "my-schedule-events-v1";
  const typeNames = { competition: "比赛", sport: "运动", work: "工作", study: "学习", life: "生活" };
  const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  const makeSamples = () => {
    const monday = startOfWeek(new Date());
    return [
      { id: uuid(), title: "晨间跑步", type: "sport", date: toDateKey(addDays(monday, 0)), start: "07:00", end: "08:00", location: "滨河公园", note: "轻松跑 6 公里", done: false },
      { id: uuid(), title: "项目周会", type: "work", date: toDateKey(addDays(monday, 1)), start: "10:00", end: "11:00", location: "第三会议室", note: "同步本周关键进展", done: false },
      { id: uuid(), title: "英语学习", type: "study", date: toDateKey(addDays(monday, 2)), start: "19:30", end: "21:00", location: "家", note: "口语练习与阅读", done: false },
      { id: uuid(), title: "力量训练", type: "sport", date: toDateKey(addDays(monday, 3)), start: "18:30", end: "20:00", location: "健身房", note: "下肢与核心", done: false },
      { id: uuid(), title: "朋友晚餐", type: "life", date: toDateKey(addDays(monday, 4)), start: "19:00", end: "21:00", location: "云里餐厅", note: "", done: false },
      { id: uuid(), title: "城市羽毛球赛", type: "competition", date: toDateKey(addDays(monday, 5)), start: "09:00", end: "12:00", location: "市体育中心", note: "提前 40 分钟签到热身", done: false },
      { id: uuid(), title: "周末复盘", type: "study", date: toDateKey(addDays(monday, 6)), start: "20:00", end: "20:40", location: "家", note: "整理下周目标", done: false }
    ];
  };

  function load() {
    const saved = Store.get(STORAGE_KEY, null);
    if (Array.isArray(saved)) return saved;
    const samples = makeSamples();
    Store.set(STORAGE_KEY, samples);
    return samples;
  }

  let events = load();
  let currentWeek = startOfWeek(new Date());
  let activeFilter = "all";

  const save = () => Store.set(STORAGE_KEY, events);
  const el = id => document.getElementById(id);

  function greeting() {
    const hour = new Date().getHours();
    return hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
  }

  function render(root) {
    events = load();
    const now = new Date();
    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">${now.getMonth() + 1}月${now.getDate()}日 · ${["周日","周一","周二","周三","周四","周五","周六"][now.getDay()]}</p>
          <h1>${greeting()}，今天也从容前进。</h1>
        </div>
        <div class="top-actions">
          <button class="icon-btn" id="todayBtn" title="回到今天" aria-label="回到今天">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v4l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          <button class="primary-btn" id="addEventBtn">＋ <span class="btn-text">添加日程</span></button>
        </div>
      </header>
      <section class="stats" aria-label="本周概览">
        <article class="stat primary">
          <div class="stat-label">本周安排</div>
          <div class="stat-value"><span id="weekCount">0</span> 项</div>
          <div class="stat-sub" id="weekHint">保持自己的节奏</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">比赛与重要事项</div>
          <div class="stat-value" id="importantCount">0</div>
          <div class="stat-sub">提前准备，从容上场</div>
        </article>
        <article class="stat">
          <div class="stat-label">运动训练</div>
          <div class="stat-value"><span id="sportHours">0</span><small> 小时</small></div>
          <div class="stat-sub">本周累计时长</div>
        </article>
        <article class="stat">
          <div class="stat-label">本周已完成</div>
          <div class="stat-value" id="doneCount">0</div>
          <div class="stat-sub">点开日程可标记完成</div>
        </article>
      </section>
      <section>
        <div class="calendar-toolbar">
          <div class="calendar-title">
            <h2 id="weekTitle">本周</h2>
            <div class="week-nav">
              <button class="icon-btn" id="prevWeek" aria-label="上一周">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
              <button class="icon-btn" id="nextWeek" aria-label="下一周">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
          <div class="filters" aria-label="日程筛选">
            ${["all:全部", "competition:比赛", "sport:运动", "work:工作", "study:学习", "life:生活"]
              .map(pair => {
                const [key, label] = pair.split(":");
                return `<button class="filter ${key === activeFilter ? "active" : ""}" data-filter="${key}">${label}</button>`;
              }).join("")}
          </div>
        </div>
        <div class="week" id="weekGrid" aria-live="polite"></div>
      </section>
      <section class="panel" style="margin-top:20px">
        <div class="panel-head"><h3>接下来</h3><span class="hint">未来 7 天</span></div>
        <div class="upcoming" id="upcoming"></div>
      </section>
    `;

    el("addEventBtn").addEventListener("click", () => openEditor());
    el("prevWeek").addEventListener("click", () => { currentWeek = addDays(currentWeek, -7); renderWeek(); });
    el("nextWeek").addEventListener("click", () => { currentWeek = addDays(currentWeek, 7); renderWeek(); });
    el("todayBtn").addEventListener("click", () => { currentWeek = startOfWeek(new Date()); renderWeek(); });
    root.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      root.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b === button));
      renderWeek();
    }));

    renderWeek();
    renderUpcoming();
  }

  function renderWeek() {
    const weekEnd = addDays(currentWeek, 6);
    el("weekTitle").textContent = `${currentWeek.getMonth() + 1}月${currentWeek.getDate()}日 — ${weekEnd.getMonth() + 1}月${weekEnd.getDate()}日`;
    const todayKey = toDateKey(new Date());
    const visible = activeFilter === "all" ? events : events.filter(event => event.type === activeFilter);
    el("weekGrid").innerHTML = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(currentWeek, index);
      const key = toDateKey(date);
      const dayEvents = visible.filter(event => event.date === key).sort((a, b) => a.start.localeCompare(b.start));
      return `<div class="day ${key === todayKey ? "today" : ""}">
        <div class="day-head">
          <div class="day-name">${weekdays[index]}</div>
          <div class="day-number">${date.getDate()}</div>
        </div>
        <div class="day-events">${dayEvents.map(event => `
          <button class="event ${event.type} ${event.done ? "done" : ""}" data-id="${event.id}" title="点击查看或编辑">
            <span class="event-time">${esc(event.start)}–${esc(event.end)}</span>
            <span class="event-title">${esc(event.title)}</span>
            ${event.location ? `<span class="event-location">⌖ ${esc(event.location)}</span>` : ""}
          </button>`).join("")}</div>
      </div>`;
    }).join("");

    el("weekGrid").querySelectorAll(".event").forEach(button => {
      button.addEventListener("click", () => openEditor(events.find(item => item.id === button.dataset.id)));
    });
    renderStats();
  }

  function renderStats() {
    const start = toDateKey(currentWeek);
    const end = toDateKey(addDays(currentWeek, 6));
    const weekEvents = events.filter(event => event.date >= start && event.date <= end);
    const important = weekEvents.filter(event => event.type === "competition").length;
    const sportMinutes = weekEvents.filter(event => event.type === "sport").reduce((sum, event) => {
      const [sh, sm] = event.start.split(":").map(Number);
      const [eh, em] = event.end.split(":").map(Number);
      return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    }, 0);
    el("weekCount").textContent = weekEvents.length;
    el("importantCount").textContent = important;
    el("sportHours").textContent = (sportMinutes / 60).toFixed(sportMinutes % 60 ? 1 : 0);
    el("doneCount").textContent = weekEvents.filter(event => event.done).length;
    el("weekHint").textContent = weekEvents.length > 7 ? "忙碌的一周，记得留出休息时间" : "张弛有度，保持自己的节奏";
    const navCount = document.getElementById("navCountSchedule");
    if (navCount) navCount.textContent = events.length;
  }

  function renderUpcoming() {
    const today = toDateKey(new Date());
    const lastDay = toDateKey(addDays(new Date(), 7));
    const next = events
      .filter(event => event.date >= today && event.date <= lastDay)
      .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
      .slice(0, 6);
    el("upcoming").innerHTML = next.length ? next.map(event => {
      const date = parseDate(event.date);
      return `<article class="upcoming-card">
        <div class="date-box">${date.getMonth() + 1}月<strong>${date.getDate()}</strong></div>
        <div class="upcoming-info">
          <div class="upcoming-type">${typeNames[event.type]}${event.done ? " · 已完成" : ""}</div>
          <h4>${esc(event.title)}</h4>
          <p>${esc(event.start)} · ${esc(event.location || "地点待定")}</p>
        </div>
      </article>`;
    }).join("") : `<div class="empty">未来 7 天暂无安排<br>给自己留一点自由时间吧</div>`;
  }

  function openEditor(event = null, presetDate = null) {
    Modal.open({
      title: event ? "编辑日程" : "添加新日程",
      body: `
        <div class="field full">
          <label for="evTitle">日程名称</label>
          <input id="evTitle" required maxlength="40" placeholder="例如：项目汇报 / HYROX 双人赛" value="${esc(event?.title || "")}">
        </div>
        <div class="field">
          <label for="evType">日程类型</label>
          <select id="evType">
            ${Object.entries({ competition: "比赛赛事", sport: "运动训练", work: "工作", study: "学习", life: "生活" })
              .map(([value, label]) => `<option value="${value}" ${event?.type === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="evDate">日期</label>
          <input id="evDate" type="date" required value="${event?.date || presetDate || toDateKey(new Date())}">
        </div>
        <div class="field">
          <label for="evStart">开始时间</label>
          <input id="evStart" type="time" required value="${event?.start || "09:00"}">
        </div>
        <div class="field">
          <label for="evEnd">结束时间</label>
          <input id="evEnd" type="time" required value="${event?.end || "10:00"}">
        </div>
        <div class="field full">
          <label for="evLocation">地点</label>
          <input id="evLocation" maxlength="40" placeholder="线上或具体地点" value="${esc(event?.location || "")}">
        </div>
        <div class="field full">
          <label for="evNote">备注</label>
          <textarea id="evNote" maxlength="160" placeholder="准备事项、目标或其他提醒">${esc(event?.note || "")}</textarea>
        </div>
        <div class="field full">
          <label><input type="checkbox" id="evDone" style="width:auto;height:auto;margin-right:7px" ${event?.done ? "checked" : ""}>已完成</label>
        </div>
      `,
      onSubmit() {
        const start = Modal.value("evStart");
        const end = Modal.value("evEnd");
        if (end <= start) {
          toast("结束时间需要晚于开始时间");
          return;
        }
        const data = {
          id: event?.id || uuid(),
          title: Modal.value("evTitle"),
          type: Modal.value("evType"),
          date: Modal.value("evDate"),
          start,
          end,
          location: Modal.value("evLocation"),
          note: Modal.value("evNote"),
          done: Modal.field("evDone").checked
        };
        const index = events.findIndex(item => item.id === data.id);
        if (index >= 0) events[index] = data;
        else events.push(data);
        save();
        Modal.close();
        currentWeek = startOfWeek(parseDate(data.date));
        renderWeek();
        renderUpcoming();
        toast(index >= 0 ? "日程已更新" : "日程已添加");
      },
      onDelete: event ? () => {
        if (!confirm("确定删除这项日程吗？")) return;
        events = events.filter(item => item.id !== event.id);
        save();
        Modal.close();
        renderWeek();
        renderUpcoming();
        toast("日程已删除");
      } : null
    });
  }

  App.register("schedule", { render });
})();
