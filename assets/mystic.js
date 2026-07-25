/* 玄学空间:塔罗抽牌 / 八字四柱 / 紫微斗数基础排盘 */
(() => {
  const { toDateKey, esc, uuid, fmtCN } = U;
  const TAROT_KEY = "life-tarot-v1";
  const BIRTH_KEY = "life-birth-v1";
  let activeTab = "tarot";
  let pendingSpread = null; /* 未保存的三牌阵 */

  /* ================= 塔罗 ================= */
  function loadDraws() {
    const saved = Store.get(TAROT_KEY, null);
    return Array.isArray(saved) ? saved : [];
  }
  let draws = loadDraws();
  const saveDraws = () => Store.set(TAROT_KEY, draws);

  const randomCard = exclude => {
    let index;
    do {
      index = Math.floor(Math.random() * TAROT.length);
    } while (exclude.includes(index));
    return { index, reversed: Math.random() < 0.4 };
  };

  const cardHTML = (draw, slot, flipped) => {
    const card = TAROT[draw.index];
    return `<button class="tarot-card ${flipped ? "flipped" : ""}" data-slot="${slot}" aria-label="翻开塔罗牌">
      <div class="tarot-inner">
        <div class="tarot-face tarot-back">✦<span style="font-size:10px;letter-spacing:2px">TAROT</span></div>
        <div class="tarot-face tarot-front ${draw.reversed ? "reversed" : ""}">
          ${slot ? `<span class="t-slot">${slot}</span>` : ""}
          <span class="t-icon" style="${draw.reversed ? "transform:rotate(180deg)" : ""}">${card.icon}</span>
          <h4>${card.name}</h4>
          <span class="t-pos">${draw.reversed ? "逆位" : "正位"}</span>
          <span class="tarot-meaning">${draw.reversed ? card.rev : card.up}</span>
        </div>
      </div>
    </button>`;
  };

  function renderTarot() {
    const todayKey = toDateKey(new Date());
    const daily = draws.find(entry => entry.spread === "daily" && entry.date === todayKey);

    return `
      <div class="grid-2">
        <section class="panel">
          <div class="panel-head"><h3>每日一牌</h3><span class="hint">${todayKey}</span></div>
          ${daily
            ? `<div class="tarot-stage">${cardHTML(daily.cards[0], "", true)}</div>
               <p class="disclaimer">今天已抽过，明天再来。可在下方日志里写下你的解读。</p>`
            : `<div class="tarot-stage"><button class="primary-btn" id="drawDaily">🌙 抽取今日份指引</button></div>`}
        </section>
        <section class="panel">
          <div class="panel-head"><h3>三牌阵</h3><span class="hint">过去 · 现在 · 未来</span></div>
          ${pendingSpread
            ? `<div class="tarot-stage" id="spreadStage">
                 ${pendingSpread.cards.map((draw, index) => cardHTML(draw, ["过去", "现在", "未来"][index], pendingSpread.flipped[index])).join("")}
               </div>
               <div class="field full" style="margin-top:8px">
                 <label for="spreadNote">我的解读（保存到日志）</label>
                 <textarea id="spreadNote" maxlength="400" placeholder="问题是什么？牌面给你的感受…"></textarea>
               </div>
               <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">
                 <button class="ghost-btn small" id="discardSpread">弃掉重抽</button>
                 <button class="primary-btn" style="height:34px;font-size:12px" id="saveSpread">保存到日志</button>
               </div>`
            : `<div class="tarot-stage"><button class="primary-btn" id="drawSpread">🔮 开始三牌阵</button></div>
               <p class="disclaimer">心里默想一个问题，然后抽牌、依次翻开。</p>`}
        </section>
      </div>
      <section class="panel" style="margin-top:15px">
        <div class="panel-head"><h3>抽牌日志</h3><span class="hint">${draws.length} 条记录</span></div>
        <div class="tarot-journal">
          ${draws.length ? draws.slice(0, 30).map(entry => `
            <div class="tarot-entry">
              <div class="te-head">
                <span>${entry.date} · ${entry.spread === "daily" ? "每日一牌" : "三牌阵"}</span>
                <button class="te-del" data-del="${entry.id}">删除</button>
              </div>
              <div class="te-cards">${entry.cards.map(draw => `${TAROT[draw.index].icon} ${TAROT[draw.index].name}(${draw.reversed ? "逆" : "正"})`).join(" · ")}</div>
              ${entry.note ? `<div class="te-note">${esc(entry.note)}</div>` : ""}
            </div>`).join("") : `<div class="empty">抽牌后自动记录在这里</div>`}
        </div>
      </section>
      <p class="disclaimer">塔罗内容仅供自我觉察与娱乐，人生的答案始终在你自己手里。</p>
    `;
  }

  function bindTarot(root) {
    const drawDaily = root.querySelector("#drawDaily");
    if (drawDaily) drawDaily.addEventListener("click", () => {
      draws.unshift({ id: uuid(), spread: "daily", date: toDateKey(new Date()), cards: [randomCard([])], note: "" });
      saveDraws();
      App.refresh();
    });
    /* 每日一牌:渲染为未翻开状态后自动可点击翻面 */
    root.querySelectorAll(".tarot-card").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.slot && pendingSpread) {
          const index = ["过去", "现在", "未来"].indexOf(button.dataset.slot);
          if (index >= 0) pendingSpread.flipped[index] = true;
        }
        button.classList.add("flipped");
      });
    });
    const drawSpread = root.querySelector("#drawSpread");
    if (drawSpread) drawSpread.addEventListener("click", () => {
      const used = [];
      const cards = [0, 1, 2].map(() => {
        const draw = randomCard(used);
        used.push(draw.index);
        return draw;
      });
      pendingSpread = { cards, flipped: [false, false, false] };
      App.refresh();
    });
    const discard = root.querySelector("#discardSpread");
    if (discard) discard.addEventListener("click", () => {
      pendingSpread = null;
      App.refresh();
    });
    const saveBtn = root.querySelector("#saveSpread");
    if (saveBtn) saveBtn.addEventListener("click", () => {
      draws.unshift({
        id: uuid(),
        spread: "three",
        date: toDateKey(new Date()),
        cards: pendingSpread.cards,
        note: (root.querySelector("#spreadNote")?.value || "").trim()
      });
      saveDraws();
      pendingSpread = null;
      toast("已保存到抽牌日志");
      App.refresh();
    });
    root.querySelectorAll("[data-del]").forEach(button => button.addEventListener("click", () => {
      if (!confirm("删除这条抽牌记录吗？")) return;
      draws = draws.filter(entry => entry.id !== button.dataset.del);
      saveDraws();
      App.refresh();
    }));
  }

  /* ================= 出生信息 ================= */
  function birthFormHTML() {
    const birth = Store.get(BIRTH_KEY, null);
    return `
      <section class="panel">
        <div class="panel-head"><h3>出生信息</h3><span class="hint">保存在本机，供八字与紫微使用</span></div>
        <div class="birth-form">
          <div class="field">
            <label for="birthDate">出生日期（公历）</label>
            <input id="birthDate" type="date" value="${birth?.date || ""}">
          </div>
          <div class="field">
            <label for="birthHour">出生时间</label>
            <select id="birthHour">
              ${Array.from({ length: 24 }, (_, hour) => {
                const zhi = Lunar.ZHI[Math.floor(((hour + 1) % 24) / 2)];
                return `<option value="${hour}" ${birth?.hour === hour ? "selected" : ""}>${hour}:00 — ${hour}:59（${zhi}时）</option>`;
              }).join("")}
            </select>
          </div>
          <button class="primary-btn" id="saveBirth" style="height:42px">排盘</button>
        </div>
      </section>
    `;
  }

  function bindBirthForm(root) {
    const button = root.querySelector("#saveBirth");
    if (button) button.addEventListener("click", () => {
      const date = root.querySelector("#birthDate").value;
      if (!date) {
        toast("请先选择出生日期");
        return;
      }
      Store.set(BIRTH_KEY, { date, hour: Number(root.querySelector("#birthHour").value) });
      App.refresh();
    });
  }

  /* ================= 八字 ================= */
  function renderBazi() {
    const birth = Store.get(BIRTH_KEY, null);
    let result = "";
    if (birth?.date) {
      const [y, m, d] = birth.date.split("-").map(Number);
      const chart = Lunar.bazi(y, m, d, birth.hour || 0);
      const lunarDate = Lunar.solarToLunar(y, m, d);
      const maxCount = Math.max(...Object.values(chart.wuxing), 1);
      const missing = Object.entries(chart.wuxing).filter(([, count]) => count === 0).map(([element]) => element);
      const wxClass = { 木: "wx-wood", 火: "wx-fire", 土: "wx-earth", 金: "wx-metal", 水: "wx-water" };
      result = `
        <section class="panel">
          <div class="panel-head">
            <h3>四柱命盘</h3>
            <span class="hint">${fmtCN(birth.date)} ${birth.hour}:00 · 属${chart.zodiac}${lunarDate ? ` · 农历${lunarDate.isLeap ? "闰" : ""}${lunarDate.month}月${lunarDate.day}日` : ""}</span>
          </div>
          <div class="pillar-table">
            ${chart.pillars.map((pillar, index) => `
              <div class="pillar">
                <small>${pillar.name}</small>
                <div class="gz">${pillar.gan}<br>${pillar.zhi}</div>
                <div class="hs">藏干：${chart.hidden[index]}</div>
              </div>`).join("")}
          </div>
        </section>
        <div class="grid-2" style="margin-top:15px">
          <section class="panel">
            <div class="panel-head"><h3>五行分布</h3><span class="hint">天干 + 地支本气</span></div>
            <div class="wuxing-bars">
              ${Object.entries(chart.wuxing).map(([element, count]) => `
                <div class="wuxing-row ${wxClass[element]}">
                  <span>${element}</span>
                  <div class="progress"><span style="width:${count / maxCount * 100}%"></span></div>
                  <b>${count}</b>
                </div>`).join("")}
            </div>
          </section>
          <section class="panel">
            <div class="panel-head"><h3>命盘速览</h3></div>
            <div class="overview-list">
              <div class="overview-item"><span class="oi-icon">☀️</span><span class="oi-main">日主 <b>${chart.dayMaster}${chart.dayMasterElement}</b>，代表你自己的核心气质</span></div>
              <div class="overview-item"><span class="oi-icon">🐾</span><span class="oi-main">生肖 <b>${chart.zodiac}</b>（以立春为界）</span></div>
              <div class="overview-item"><span class="oi-icon">🧭</span><span class="oi-main">${missing.length ? `五行中 <b>${missing.join("、")}</b> 偏弱，可留意相关领域的平衡` : "五行俱全，整体较为均衡"}</span></div>
            </div>
          </section>
        </div>
      `;
    }
    return `
      ${birthFormHTML()}
      ${result ? `<div style="margin-top:15px">${result}</div>` : `<div class="empty">填写出生信息后自动排出四柱</div>`}
      <p class="disclaimer">节气采用通式近似（可能有 ±1 天误差），23 点后按次日子时换日。内容仅供娱乐参考。</p>
    `;
  }

  /* ================= 紫微 ================= */
  const PALACES = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"];
  const BUREAU = { 水: [2, "水二局"], 木: [3, "木三局"], 金: [4, "金四局"], 土: [5, "土五局"], 火: [6, "火六局"] };

  function ziweiChart(birth) {
    const [y, m, d] = birth.date.split("-").map(Number);
    const lunarDate = Lunar.solarToLunar(y, m, d);
    if (!lunarDate) return null;
    const hourBranch = Math.floor((((birth.hour || 0) + 1) % 24) / 2);
    const lMonth = lunarDate.month;
    const lDay = lunarDate.day;

    const mingIdx = (2 + (lMonth - 1) - hourBranch + 24) % 12;
    const shenIdx = (2 + (lMonth - 1) + hourBranch) % 12;

    /* 命宫天干:五虎遁(以八字年柱天干起寅宫) */
    const chart = Lunar.bazi(y, m, d, birth.hour || 0);
    const yearStemIdx = chart.pillars[0].ganIdx;
    const stemOfBranch = branch => (((yearStemIdx % 5) * 2 + 2) + ((branch - 2 + 12) % 12)) % 10;
    const mingStem = stemOfBranch(mingIdx);
    const mingGZ = (6 * mingStem - 5 * mingIdx + 60) % 60;
    const bureauElement = Lunar.nayinElement(mingGZ);
    const [bureauNum, bureauName] = BUREAU[bureauElement];

    /* 紫微星定位 */
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

    /* 十四主星 */
    const stars = Array.from({ length: 12 }, () => []);
    const place = (offsetFrom, offset, name) => stars[(offsetFrom + offset + 24) % 12].push(name);
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

    /* 各地支对应宫名 */
    const palaceOf = Array.from({ length: 12 }, (_, branch) => PALACES[(mingIdx - branch + 24) % 12]);

    return { lunarDate, mingIdx, shenIdx, bureauName, stars, palaceOf, zodiac: chart.zodiac, mingGanzhi: Lunar.ganzhi(mingGZ) };
  }

  function renderZiwei() {
    const birth = Store.get(BIRTH_KEY, null);
    let board = "";
    if (birth?.date) {
      const chart = ziweiChart(birth);
      if (chart) {
        /* 4x4 布局:上排 巳午未申,两侧 辰酉/卯戌,下排 寅丑子亥 */
        const layout = [5, 6, 7, 8, 4, null, null, 9, 3, null, null, 10, 2, 1, 0, 11];
        let centerDone = false;
        board = `
          <section class="panel" style="margin-top:15px">
            <div class="panel-head"><h3>紫微命盘</h3><span class="hint">十四主星 · 基础版</span></div>
            <div class="ziwei-grid">
              ${layout.map(branch => {
                if (branch === null) {
                  if (centerDone) return "";
                  centerDone = true;
                  return `<div class="zw-center">
                    <h4>${chart.mingGanzhi}命 · ${chart.bureauName}</h4>
                    <span>公历 ${fmtCN(birth.date)} ${birth.hour}:00</span>
                    <span>农历${chart.lunarDate.isLeap ? "闰" : ""}${chart.lunarDate.month}月${chart.lunarDate.day}日 · 属${chart.zodiac}</span>
                    <span>命宫在${Lunar.ZHI[chart.mingIdx]} · 身宫在${Lunar.ZHI[chart.shenIdx]}</span>
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
          </section>
        `;
      }
    }
    return `
      ${birthFormHTML()}
      ${board || `<div class="empty">填写出生信息后生成紫微命盘</div>`}
      <p class="disclaimer">基础排盘：仅安十四主星，闰月按当月计。流派差异较多，结果仅供娱乐参考。</p>
    `;
  }

  /* ================= 视图 ================= */
  function render(root) {
    draws = loadDraws();
    root.innerHTML = `
      <header class="topbar">
        <div>
          <p class="eyebrow">MYSTIC</p>
          <h1>在星与牌之间，认识自己。</h1>
        </div>
      </header>
      <div class="filters mystic-tabs">
        <button class="filter ${activeTab === "tarot" ? "active" : ""}" data-tab="tarot">🃏 塔罗</button>
        <button class="filter ${activeTab === "bazi" ? "active" : ""}" data-tab="bazi">☯ 八字</button>
        <button class="filter ${activeTab === "ziwei" ? "active" : ""}" data-tab="ziwei">✨ 紫微</button>
      </div>
      <div id="mysticBody">
        ${activeTab === "tarot" ? renderTarot() : activeTab === "bazi" ? renderBazi() : renderZiwei()}
      </div>
    `;

    root.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      App.refresh();
    }));
    if (activeTab === "tarot") bindTarot(root);
    else bindBirthForm(root);
  }

  window.MysticModule = { TAROT_KEY, BIRTH_KEY };
  App.register("mystic", { render });
})();
