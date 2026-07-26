/* 训练模块:跑步/游泳/HYROX/潜水/力量,趋势图与个人最佳 */
(() => {
  const { toDateKey, parseDate, addDays, startOfWeek, esc, uuid, fmtCN } = U;
  const STORAGE_KEY = "life-workouts-v1";
  const SPORTS = {
    run: { label: "跑步", icon: "🏃", color: "#4b8b6d", bg: "#e6f2eb", distUnit: "km", distLabel: "距离 (km)" },
    swim: { label: "游泳", icon: "🏊", color: "#3f6d9e", bg: "#e8f0fa", distUnit: "m", distLabel: "距离 (m)" },
    hyrox: { label: "HYROX", icon: "🏋️", color: "#a64d28", bg: "#fff0e8", distUnit: "", distLabel: "" },
    dive: { label: "潜水", icon: "🤿", color: "#2e7d86", bg: "#e5f4f5", distUnit: "", distLabel: "" },
    strength: { label: "力量", icon: "💪", color: "#72538a", bg: "#f4ecfa", distUnit: "", distLabel: "" },
    other: { label: "其他", icon: "✨", color: "#756226", bg: "#faf4da", distUnit: "km", distLabel: "距离 (km)" }
  };

  const makeSamples = () => {
    const today = new Date();
    const d = offset => toDateKey(addDays(today, offset));
    return [
      { id: uuid(), sport: "run", date: d(-1), duration: 55, distance: 10, depth: null, location: "滨河公园", note: "轻松有氧" },
      { id: uuid(), sport: "swim", date: d(-3), duration: 45, distance: 1500, depth: null, location: "市游泳馆", note: "自由泳技术练习" },
      { id: uuid(), sport: "hyrox", date: d(-5), duration: 75, distance: null, depth: null, location: "健身房", note: "模拟：SkiErg + 推雪橇 + 波比跳" },
      { id: uuid(), sport: "run", date: d(-8), duration: 32, distance: 6.2, depth: null, location: "小区", note: "节奏跑" },
      { id: uuid(), sport: "dive", date: d(-30), duration: 42, distance: null, depth: 18, location: "涛岛 · 白岩", note: "能见度很好，看到杰克鱼风暴" }
    ];
  };

  function load() {
    const saved = Store.get(STORAGE_KEY, null);
    if (Array.isArray(saved)) return saved;
    const samples = makeSamples();
    Store.set(STORAGE_KEY, samples);
    return samples;
  }

  let workouts = load();
  let sportFilter = "all";
  const save = () => Store.set(STORAGE_KEY, workouts);

  const fmtDuration = min => {
    if (!min) return "-";
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m} 分钟`;
  };
  const fmtPace = (min, km) => {
    if (!min || !km) return null;
    const paceSec = Math.round(min * 60 / km);
    return `${Math.floor(paceSec / 60)}'${String(paceSec % 60).padStart(2, "0")}"`;
  };

  function metricsOf(item) {
    const list = [];
    if (item.duration) list.push({ label: "时长", value: fmtDuration(item.duration) });
    if (item.sport === "run" && item.distance) {
      list.push({ label: "距离", value: `${item.distance} km` });
      const pace = fmtPace(item.duration, item.distance);
      if (pace) list.push({ label: "配速", value: `${pace}/km` });
    }
    if (item.sport === "swim" && item.distance) {
      list.push({ label: "距离", value: `${item.distance} m` });
      const pace = fmtPace(item.duration, item.distance / 100);
      if (pace) list.push({ label: "配速", value: `${pace}/100m` });
    }
    if (item.sport === "dive" && item.depth) list.push({ label: "最大深度", value: `${item.depth} m` });
    if (item.sport === "other" && item.distance) list.push({ label: "距离", value: `${item.distance} km` });
    return list;
  }

  /* 最近 12 周,每周训练时长(小时)柱状图 */
  function chartSVG(list) {
    const weeks = [];
    let cursor = startOfWeek(new Date());
    for (let i = 11; i >= 0; i--) weeks.push(toDateKey(addDays(cursor, -7 * i)));
    const totals = weeks.map(weekStart => {
      const weekEnd = toDateKey(addDays(parseDate(weekStart), 6));
      return list
        .filter(item => item.date >= weekStart && item.date <= weekEnd)
        .reduce((sum, item) => sum + (Number(item.duration) || 0), 0) / 60;
    });
    const max = Math.max(1, ...totals);
    const W = 560, H = 150, pad = 6, barGap = 8;
    const barW = (W - pad * 2 - barGap * 11) / 12;
    const bars = totals.map((value, index) => {
      const barH = Math.max(2, value / max * (H - 38));
      const x = pad + index * (barW + barGap);
      const y = H - 22 - barH;
      const monthDay = weeks[index].slice(5).replace("-", "/");
      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="5" fill="${value ? "#4c8465" : "#e4e6df"}"></rect>
        ${value ? `<text x="${x + barW / 2}" y="${y - 6}" text-anchor="middle" font-size="9" fill="#69736c">${value.toFixed(1)}</text>` : ""}
        <text x="${x + barW / 2}" y="${H - 8}" text-anchor="middle" font-size="8" fill="#a2a8a3">${monthDay}</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="近12周训练时长">${bars}</svg>`;
  }

  function personalBests(list) {
    const cards = [];
    const runs = list.filter(item => item.sport === "run" && item.distance > 0);
    if (runs.length) {
      const longest = runs.reduce((a, b) => (a.distance > b.distance ? a : b));
      cards.push({ label: "最长跑步", value: `${longest.distance} km`, sub: fmtCN(longest.date) });
      const paced = runs.filter(item => item.distance >= 3 && item.duration > 0);
      if (paced.length) {
        const best = paced.reduce((a, b) => (a.duration / a.distance < b.duration / b.distance ? a : b));
        cards.push({ label: "最佳配速 (≥3km)", value: `${fmtPace(best.duration, best.distance)}/km`, sub: `${best.distance} km · ${fmtCN(best.date)}` });
      }
    }
    const swims = list.filter(item => item.sport === "swim" && item.distance > 0);
    if (swims.length) {
      const longest = swims.reduce((a, b) => (a.distance > b.distance ? a : b));
      cards.push({ label: "最长游泳", value: `${longest.distance} m`, sub: fmtCN(longest.date) });
    }
    const hyrox = list.filter(item => item.sport === "hyrox" && item.duration > 0);
    if (hyrox.length) {
      const best = hyrox.reduce((a, b) => (a.duration < b.duration ? a : b));
      cards.push({ label: "HYROX 最佳用时", value: fmtDuration(best.duration), sub: fmtCN(best.date) });
    }
    const dives = list.filter(item => item.sport === "dive" && item.depth > 0);
    if (dives.length) {
      const deepest = dives.reduce((a, b) => (a.depth > b.depth ? a : b));
      cards.push({ label: "最大潜水深度", value: `${deepest.depth} m`, sub: `${esc(deepest.location || "")} · ${fmtCN(deepest.date)}` });
      cards.push({ label: "潜水次数", value: `${dives.length} 潜`, sub: "累计记录" });
    }
    return cards;
  }

  function render(root) {
    workouts = load();
    const monthKey = toDateKey(new Date()).slice(0, 7);
    const monthList = workouts.filter(item => item.date.startsWith(monthKey));
    const monthHours = monthList.reduce((sum, item) => sum + (Number(item.duration) || 0), 0) / 60;
    const monthRunKm = monthList.filter(item => item.sport === "run").reduce((sum, item) => sum + (Number(item.distance) || 0), 0);
    const visible = (sportFilter === "all" ? workouts : workouts.filter(item => item.sport === sportFilter))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
    const pbs = personalBests(workouts);

    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">TRAINING</p>
          <h1>身体，是所有目标的本钱。</h1>
        </div>
        <div class="top-actions">
          <button class="primary-btn" id="addWorkoutBtn">＋ <span class="btn-text">记录训练</span></button>
        </div>
      </header>
      <section class="stats">
        <article class="stat primary">
          <div class="stat-label">本月训练</div>
          <div class="stat-value">${monthList.length} 次</div>
          <div class="stat-sub">保持节奏，持续积累</div>
          <span class="stat-decoration"></span>
        </article>
        <article class="stat">
          <div class="stat-label">本月时长</div>
          <div class="stat-value">${monthHours.toFixed(1)}<small> 小时</small></div>
          <div class="stat-sub">全部运动类型合计</div>
        </article>
        <article class="stat">
          <div class="stat-label">本月跑量</div>
          <div class="stat-value">${monthRunKm.toFixed(1)}<small> km</small></div>
          <div class="stat-sub">跑步累计距离</div>
        </article>
        <article class="stat">
          <div class="stat-label">总记录</div>
          <div class="stat-value">${workouts.length}</div>
          <div class="stat-sub">每一次都算数</div>
        </article>
      </section>
      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h3>近 12 周训练时长</h3><span class="hint">单位：小时 / 周</span></div>
          <div class="chart-box">${chartSVG(workouts)}</div>
        </section>
        <section class="panel">
          <div class="panel-head"><h3>个人最佳</h3><span class="hint">自动统计</span></div>
          ${pbs.length ? `<div class="pb-grid">${pbs.map(pb => `
            <div class="pb-card"><small>${pb.label}</small><b>${pb.value}</b><span>${pb.sub}</span></div>`).join("")}</div>`
            : `<div class="empty">记录训练后自动生成个人最佳</div>`}
        </section>
      </div>
      <section style="margin-top:20px">
        <div class="calendar-toolbar">
          <h2 class="block-title" style="margin:0">训练日志</h2>
          <div class="filters">
            <button class="filter ${sportFilter === "all" ? "active" : ""}" data-sport="all">全部</button>
            ${Object.entries(SPORTS).map(([key, sport]) =>
              `<button class="filter ${sportFilter === key ? "active" : ""}" data-sport="${key}">${sport.label}</button>`).join("")}
          </div>
        </div>
        <div class="workout-list">
          ${visible.length ? visible.map(item => {
            const sport = SPORTS[item.sport] || SPORTS.other;
            const metrics = metricsOf(item);
            return `<button class="workout-row" data-id="${item.id}">
              <span class="workout-icon" style="background:${sport.bg}">${sport.icon}</span>
              <span class="workout-main">
                <h4>${sport.label}${item.location ? ` · ${esc(item.location)}` : ""}</h4>
                <p>${fmtCN(item.date)}${item.note ? ` · ${esc(item.note)}` : ""}</p>
              </span>
              <span class="workout-metrics">${metrics.map(metric => `<div><small>${metric.label}</small><b>${metric.value}</b></div>`).join("")}</span>
            </button>`;
          }).join("") : `<div class="empty">还没有训练记录，点击「记录训练」开始</div>`}
        </div>
      </section>
    `;

    document.getElementById("addWorkoutBtn").addEventListener("click", () => openEditor());
    root.querySelectorAll("[data-sport]").forEach(button => button.addEventListener("click", () => {
      sportFilter = button.dataset.sport;
      App.refresh();
    }));
    root.querySelectorAll(".workout-row").forEach(button => button.addEventListener("click", () => {
      openEditor(workouts.find(item => item.id === button.dataset.id));
    }));
  }

  function openEditor(item = null) {
    Modal.open({
      title: item ? "编辑训练" : "记录训练",
      body: `
        <div class="field">
          <label for="wkSport">运动类型</label>
          <select id="wkSport">
            ${Object.entries(SPORTS).map(([key, sport]) =>
              `<option value="${key}" ${item?.sport === key ? "selected" : ""}>${sport.icon} ${sport.label}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="wkDate">日期</label>
          <input id="wkDate" type="date" required value="${item?.date || toDateKey(new Date())}">
        </div>
        <div class="field">
          <label for="wkDuration">时长（分钟）</label>
          <input id="wkDuration" type="number" min="0" step="1" required value="${item?.duration ?? 60}">
        </div>
        <div class="field" id="wkDistanceField">
          <label for="wkDistance" id="wkDistanceLabel">距离</label>
          <input id="wkDistance" type="number" min="0" step="0.01" value="${item?.distance ?? ""}">
        </div>
        <div class="field" id="wkDepthField">
          <label for="wkDepth">最大深度（米）</label>
          <input id="wkDepth" type="number" min="0" step="0.1" value="${item?.depth ?? ""}">
        </div>
        <div class="field">
          <label for="wkLocation">地点 / 潜点</label>
          <input id="wkLocation" maxlength="40" placeholder="健身房 / 泳池 / 潜点" value="${esc(item?.location || "")}">
        </div>
        <div class="field full">
          <label for="wkNote">心得备注（HYROX 可记录分段）</label>
          <textarea id="wkNote" maxlength="300" placeholder="感受、分段成绩、看到的鱼…">${esc(item?.note || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const data = {
          id: item?.id || uuid(),
          sport: Modal.value("wkSport"),
          date: Modal.value("wkDate"),
          duration: Number(Modal.value("wkDuration")) || 0,
          distance: Modal.value("wkDistance") === "" ? null : Number(Modal.value("wkDistance")),
          depth: Modal.value("wkDepth") === "" ? null : Number(Modal.value("wkDepth")),
          location: Modal.value("wkLocation"),
          note: Modal.value("wkNote")
        };
        const index = workouts.findIndex(record => record.id === data.id);
        if (index >= 0) workouts[index] = data;
        else workouts.unshift(data);
        save();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "训练已更新" : "训练已记录");
      },
      onDelete: item ? () => {
        if (!confirm("确定删除这条训练记录吗？")) return;
        workouts = workouts.filter(record => record.id !== item.id);
        save();
        Modal.close();
        App.refresh();
        toast("记录已删除");
      } : null
    });

    /* 按运动类型显示相关字段 */
    const sync = () => {
      const sport = Modal.value("wkSport");
      const meta = SPORTS[sport];
      const distField = Modal.field("wkDistanceField");
      const depthField = Modal.field("wkDepthField");
      distField.style.display = meta.distLabel ? "" : "none";
      Modal.field("wkDistanceLabel").textContent = meta.distLabel || "距离";
      depthField.style.display = sport === "dive" ? "" : "none";
    };
    Modal.field("wkSport").addEventListener("change", sync);
    sync();
  }

  window.TrainingModule = { SPORTS, STORAGE_KEY };
  App.register("training", { render });
})();
