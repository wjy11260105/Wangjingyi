/* 个人命盘空间：固定展示用户八字、紫微基础盘与人生事件记录。 */
(() => {
  const { esc, uuid, addDays } = U;
  const EVENTS_KEY = "life-mystic-events-v1";

  const PROFILE = {
    date: "1997-01-05",
    time: "08:40",
    hour: 8,
    minute: 40,
    gender: "女",
    city: "安徽省宣城市",
    solarTime: "约 08:30",
    lunar: { year: 1996, month: 11, day: 26, isLeap: false }
  };

  /*
   * 1997-01-05 小寒交节为 15:24，北京时间 08:40 尚未交节，
   * 因此月柱是庚子而非辛丑。真太阳时校正后仍属辰时。
   */
  const BAZI = {
    pillars: [
      { name: "年柱", gan: "丙", zhi: "子", hidden: "癸" },
      { name: "月柱", gan: "庚", zhi: "子", hidden: "癸" },
      { name: "日柱", gan: "丁", zhi: "未", hidden: "己 丁 乙" },
      { name: "时柱", gan: "甲", zhi: "辰", hidden: "戊 乙 癸" }
    ],
    wuxing: { 木: 1, 火: 2, 土: 2, 金: 1, 水: 2 },
    dayMaster: "丁",
    dayMasterElement: "火",
    zodiac: "鼠"
  };

  const PALACES = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"];
  const BUREAU = { 水: [2, "水二局"], 木: [3, "木三局"], 金: [4, "金四局"], 土: [5, "土五局"], 火: [6, "火六局"] };
  const EVENT_TYPES = {
    career: "事业",
    study: "学习",
    relation: "关系",
    health: "健康",
    travel: "旅行",
    home: "生活",
    other: "其他"
  };

  function flowMonthsForYear(year) {
    return Array.from({ length: 12 }, (_, index) => {
      // 寅月从当年 2 月立春开始，丑月从次年 1 月小寒开始。
      const startYear = index === 11 ? year + 1 : year;
      const startMonth = index === 11 ? 1 : index + 2;
      const nextYear = index >= 10 ? year + 1 : year;
      const nextMonth = index === 10 ? 1 : index === 11 ? 2 : index + 3;
      const start = new Date(startYear, startMonth - 1, Lunar.jieDay(startYear, startMonth));
      const next = new Date(nextYear, nextMonth - 1, Lunar.jieDay(nextYear, nextMonth));
      const sample = addDays(start, 8);
      const chart = Lunar.bazi(sample.getFullYear(), sample.getMonth() + 1, sample.getDate(), 12);
      return {
        index,
        yearName: `${chart.pillars[0].gan}${chart.pillars[0].zhi}`,
        name: `${chart.pillars[1].gan}${chart.pillars[1].zhi}`,
        range: `${start.getMonth() + 1}月${start.getDate()}日—${addDays(next, -1).getMonth() + 1}月${addDays(next, -1).getDate()}日`
      };
    });
  }

  function eventFlowIndex(event) {
    if (Number.isInteger(event.flowMonthIndex)) return event.flowMonthIndex;
    // 兼容旧记录：原公历月份映射为该月主要流月。
    return event.month ? (Number(event.month) - 2 + 12) % 12 : -1;
  }

  function loadEvents() {
    const saved = Store.get(EVENTS_KEY, []);
    return Array.isArray(saved) ? saved : [];
  }

  let events = loadEvents();
  const saveEvents = () => Store.set(EVENTS_KEY, events);

  function ziweiChart() {
    const lMonth = PROFILE.lunar.month;
    const lDay = PROFILE.lunar.day;
    const hourBranch = 4; // 辰时
    const mingIdx = (2 + (lMonth - 1) - hourBranch + 24) % 12;
    const shenIdx = (2 + (lMonth - 1) + hourBranch) % 12;

    const yearStemIdx = 2; // 丙
    const stemOfBranch = branch => (((yearStemIdx % 5) * 2 + 2) + ((branch - 2 + 12) % 12)) % 10;
    const mingStem = stemOfBranch(mingIdx);
    const mingGZ = (6 * mingStem - 5 * mingIdx + 60) % 60;
    const bureauElement = Lunar.nayinElement(mingGZ);
    const [bureauNum, bureauName] = BUREAU[bureauElement];

    let ziweiIdx;
    if (lDay % bureauNum === 0) {
      ziweiIdx = (2 + lDay / bureauNum - 1) % 12;
    } else {
      const borrow = bureauNum - (lDay % bureauNum);
      const quotient = (lDay + borrow) / bureauNum;
      ziweiIdx = borrow % 2 === 1
        ? (2 + quotient - 1 - borrow + 24) % 12
        : (2 + quotient - 1 + borrow) % 12;
    }

    const stars = Array.from({ length: 12 }, () => []);
    const place = (origin, offset, name) => stars[(origin + offset + 24) % 12].push(name);
    place(ziweiIdx, 0, "紫微");
    place(ziweiIdx, -1, "天机");
    place(ziweiIdx, -3, "太阳");
    place(ziweiIdx, -4, "武曲");
    place(ziweiIdx, -5, "天同");
    place(ziweiIdx, -8, "廉贞");
    const tianfuIdx = (4 - ziweiIdx + 24) % 12;
    place(tianfuIdx, 0, "天府");
    place(tianfuIdx, 1, "太阴");
    place(tianfuIdx, 2, "贪狼");
    place(tianfuIdx, 3, "巨门");
    place(tianfuIdx, 4, "天相");
    place(tianfuIdx, 5, "天梁");
    place(tianfuIdx, 6, "七杀");
    place(tianfuIdx, 10, "破军");

    const palaceOf = Array.from({ length: 12 }, (_, branch) => PALACES[(mingIdx - branch + 24) % 12]);
    return {
      mingIdx,
      shenIdx,
      bureauName,
      stars,
      palaceOf,
      mingGanzhi: Lunar.ganzhi(mingGZ)
    };
  }

  function renderProfile() {
    return `
      <section class="mystic-profile">
        <div class="mystic-profile-mark">命</div>
        <div class="mystic-profile-main">
          <small>我的出生资料</small>
          <h2>1997 年 1 月 5 日 · 辰时</h2>
          <p>公历 ${PROFILE.date} ${PROFILE.time} · ${PROFILE.gender} · ${PROFILE.city}</p>
        </div>
        <div class="mystic-profile-meta">
          <span>真太阳时 ${PROFILE.solarTime}</span>
          <span>农历丙子年 十一月廿六</span>
        </div>
      </section>
    `;
  }

  function renderBazi() {
    const maxCount = Math.max(...Object.values(BAZI.wuxing));
    const wxClass = { 木: "wx-wood", 火: "wx-fire", 土: "wx-earth", 金: "wx-metal", 水: "wx-water" };
    return `
      <section class="panel">
        <div class="panel-head">
          <h3>八字四柱</h3>
          <span class="hint">丙子 · 庚子 · 丁未 · 甲辰</span>
        </div>
        <div class="pillar-table">
          ${BAZI.pillars.map(pillar => `
            <div class="pillar">
              <small>${pillar.name}</small>
              <div class="gz">${pillar.gan}<br>${pillar.zhi}</div>
              <div class="hs">藏干：${pillar.hidden}</div>
            </div>`).join("")}
        </div>
        <div class="bazi-summary">
          <div>
            <span>日主</span>
            <b>${BAZI.dayMaster}${BAZI.dayMasterElement}</b>
          </div>
          <div>
            <span>生肖</span>
            <b>${BAZI.zodiac}</b>
          </div>
          <div class="bazi-wuxing">
            ${Object.entries(BAZI.wuxing).map(([element, count]) => `
              <div class="wuxing-row ${wxClass[element]}">
                <span>${element}</span>
                <div class="progress"><span style="width:${count / maxCount * 100}%"></span></div>
                <b>${count}</b>
              </div>`).join("")}
          </div>
        </div>
        <p class="mystic-calc-note">1997 年小寒在 1 月 5 日 15:24，你出生时尚未交节，因此取庚子月；宣城真太阳时校正后仍为辰时。</p>
      </section>
    `;
  }

  function renderZiwei() {
    const chart = ziweiChart();
    const layout = [5, 6, 7, 8, 4, null, null, 9, 3, null, null, 10, 2, 1, 0, 11];
    let centerDone = false;
    return `
      <section class="panel">
        <div class="panel-head">
          <h3>紫微命盘</h3>
          <span class="hint">十二宫 · 十四主星基础盘</span>
        </div>
        <div class="ziwei-grid">
          ${layout.map(branch => {
            if (branch === null) {
              if (centerDone) return "";
              centerDone = true;
              return `<div class="zw-center">
                <h4>${chart.mingGanzhi}命 · ${chart.bureauName}</h4>
                <span>丙子年 · 冬月廿六 · 辰时</span>
                <span>命宫在${Lunar.ZHI[chart.mingIdx]} · 身宫在${Lunar.ZHI[chart.shenIdx]}</span>
                <span>阳女 · 大限逆行</span>
              </div>`;
            }
            const starList = chart.stars[branch];
            return `<div class="zw-palace ${branch === chart.mingIdx ? "zw-ming" : ""}">
              <div class="zw-branch">${Lunar.ZHI[branch]}</div>
              <div class="zw-name">${chart.palaceOf[branch]}${branch === chart.shenIdx ? " · 身" : ""}</div>
              <div class="zw-stars">${starList.length ? starList.map(star => `<b>${star}</b>`).join(" ") : "—"}</div>
            </div>`;
          }).join("")}
        </div>
        <p class="disclaimer">当前为十四主星基础盘。紫微斗数流派与起盘规则存在差异，内容用于个人记录与自我观察。</p>
      </section>
    `;
  }

  function renderTimeline() {
    const sorted = events.slice().sort((a, b) =>
      Number(b.year) - Number(a.year) || eventFlowIndex(b) - eventFlowIndex(a)
    );
    const eventHTML = event => {
      const flow = flowMonthsForYear(Number(event.year))[eventFlowIndex(event)];
      return `
        <button class="life-event" data-event-id="${event.id}">
          <span class="life-event-date">
            <b>${event.year}</b>
            <small>${flow ? `${flow.name}月` : "全年"}</small>
            ${flow ? `<em>${flow.range}</em>` : ""}
          </span>
          <span class="life-event-body">
            <span class="badge">${EVENT_TYPES[event.type] || EVENT_TYPES.other}</span>
            <strong>${esc(event.title)}</strong>
            ${event.detail ? `<p>${esc(event.detail)}</p>` : ""}
          </span>
          <span class="life-event-edit">编辑</span>
        </button>`;
    };
    return `
      <section class="panel mystic-timeline-panel">
        <div class="panel-head">
          <div>
            <h3>人生事件记录</h3>
            <span class="hint">按流年与流月记录真实发生的事情，供后续复盘</span>
          </div>
          <button class="primary-btn" id="addMysticEvent">＋ <span class="btn-text">记录事件</span></button>
        </div>
        <div class="life-timeline">
          ${sorted.length ? sorted.map(eventHTML).join("") : `
            <div class="empty">
              还没有人生事件记录<br>
              可以从毕业、工作变化、旅行、关系、健康或重要学习经历开始
            </div>`}
        </div>
      </section>
    `;
  }

  function openEventEditor(item = null) {
    const currentYear = new Date().getFullYear();
    const selectedYear = Number(item?.year) || currentYear;
    const selectedFlowIndex = eventFlowIndex(item || {});
    const flowOptions = year => `
      <option value="-1" ${selectedFlowIndex < 0 ? "selected" : ""}>不确定 / 全年</option>
      ${flowMonthsForYear(year).map(flow =>
        `<option value="${flow.index}" ${selectedFlowIndex === flow.index ? "selected" : ""}>${flow.name}月（${flow.range}）</option>`
      ).join("")}
    `;
    Modal.open({
      title: item ? "编辑人生事件" : "记录人生事件",
      body: `
        <div class="field">
          <label for="lifeEventYear">年份</label>
          <input id="lifeEventYear" type="number" min="1900" max="2100" required value="${selectedYear}">
        </div>
        <div class="field">
          <label for="lifeEventFlowMonth">流月</label>
          <select id="lifeEventFlowMonth">${flowOptions(selectedYear)}</select>
        </div>
        <div class="field">
          <label for="lifeEventType">类型</label>
          <select id="lifeEventType">
            ${Object.entries(EVENT_TYPES).map(([value, label]) =>
              `<option value="${value}" ${item?.type === value ? "selected" : ""}>${label}</option>`
            ).join("")}
          </select>
        </div>
        <div class="field full">
          <label for="lifeEventTitle">发生了什么</label>
          <input id="lifeEventTitle" required maxlength="80" placeholder="例如：第一次去仙本那潜水" value="${esc(item?.title || "")}">
        </div>
        <div class="field full">
          <label for="lifeEventDetail">详细记录</label>
          <textarea id="lifeEventDetail" maxlength="1000" placeholder="当时的背景、变化、感受和结果…">${esc(item?.detail || "")}</textarea>
        </div>
      `,
      onSubmit() {
        const data = {
          id: item?.id || uuid(),
          year: Number(Modal.value("lifeEventYear")),
          flowMonthIndex: Number(Modal.value("lifeEventFlowMonth")),
          type: Modal.value("lifeEventType"),
          title: Modal.value("lifeEventTitle"),
          detail: Modal.value("lifeEventDetail")
        };
        const index = events.findIndex(event => event.id === data.id);
        if (index >= 0) events[index] = data;
        else events.push(data);
        saveEvents();
        Modal.close();
        App.refresh();
        toast(index >= 0 ? "人生事件已更新" : "人生事件已记录");
      },
      onDelete: item ? () => {
        if (!confirm("确定删除这条人生事件吗？")) return;
        events = events.filter(event => event.id !== item.id);
        saveEvents();
        Modal.close();
        App.refresh();
        toast("人生事件已删除");
      } : null
    });

    Modal.field("lifeEventYear").addEventListener("change", () => {
      const year = Number(Modal.value("lifeEventYear")) || currentYear;
      const select = Modal.field("lifeEventFlowMonth");
      const previous = Number(select.value);
      select.innerHTML = `<option value="-1">不确定 / 全年</option>${flowMonthsForYear(year).map(flow =>
        `<option value="${flow.index}">${flow.name}月（${flow.range}）</option>`
      ).join("")}`;
      select.value = String(previous);
    });
  }

  function render(root) {
    events = loadEvents();
    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">MYSTIC PROFILE</p>
          <h1>我的命盘与人生记录。</h1>
        </div>
      </header>
      ${renderProfile()}
      <div class="grid-2 mystic-charts">
        ${renderBazi()}
        ${renderZiwei()}
      </div>
      ${renderTimeline()}
    `;

    document.getElementById("addMysticEvent").addEventListener("click", () => openEventEditor());
    root.querySelectorAll("[data-event-id]").forEach(button => {
      button.addEventListener("click", () => {
        openEventEditor(events.find(event => event.id === button.dataset.eventId));
      });
    });
  }

  window.MysticModule = { EVENTS_KEY, PROFILE, BAZI };
  App.register("mystic", { render });
})();
