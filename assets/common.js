/* 公共工具与应用壳:路由、存储、弹窗、提示、数据导入导出 */
(() => {
  const pad = n => String(n).padStart(2, "0");
  const toDateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = value => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };
  const startOfWeek = date => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = next.getDay() || 7;
    next.setDate(next.getDate() - day + 1);
    return next;
  };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const fmtCN = key => {
    const d = parseDate(key);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const Store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
      window.CloudSync?.schedule(key);
    }
  };

  let toastTimer;
  function toast(message) {
    const node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  /* 通用弹窗:模块传入表单 HTML 与回调 */
  const Modal = {
    current: null,
    open({ title, body, submitText = "保存", onSubmit, onDelete, deleteText = "删除", wide = false }) {
      const backdrop = document.getElementById("modal");
      document.getElementById("modalTitle").textContent = title;
      document.getElementById("modalBody").innerHTML = body;
      document.getElementById("modalSubmit").textContent = submitText;
      const del = document.getElementById("modalDelete");
      del.textContent = deleteText;
      del.classList.toggle("show", Boolean(onDelete));
      backdrop.querySelector(".modal").classList.toggle("wide", wide);
      Modal.current = { onSubmit, onDelete };
      backdrop.classList.add("open");
      setTimeout(() => {
        const first = document.querySelector("#modalBody input, #modalBody select, #modalBody textarea");
        if (first) first.focus();
      }, 100);
    },
    close() {
      document.getElementById("modal").classList.remove("open");
      Modal.current = null;
    },
    field(id) {
      return document.getElementById(id);
    },
    value(id) {
      const node = document.getElementById(id);
      return node ? node.value.trim() : "";
    }
  };

  const App = {
    views: {},
    order: [],
    current: null,
    register(name, view) {
      App.views[name] = view;
      App.order.push(name);
    },
    navigate(name) {
      location.hash = `#/${name}`;
    },
    show(name) {
      const view = App.views[name] || App.views.dashboard;
      const resolved = App.views[name] ? name : "dashboard";
      App.current = resolved;
      document.querySelectorAll("[data-nav]").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.nav === resolved);
      });
      const root = document.getElementById("viewRoot");
      root.innerHTML = "";
      view.render(root);
      window.scrollTo(0, 0);
    },
    refresh() {
      if (App.current) App.show(App.current);
    },
    renderMiniCalendar() {
      const now = new Date();
      document.getElementById("miniMonth").textContent = `${now.getFullYear()}年 ${now.getMonth() + 1}月`;
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const offset = (first.getDay() + 6) % 7;
      const start = addDays(first, -offset);
      const labels = ["一", "二", "三", "四", "五", "六", "日"].map(d => `<span class="dow">${d}</span>`);
      for (let i = 0; i < 35; i++) {
        const date = addDays(start, i);
        const dateKey = toDateKey(date);
        const classes = [
          date.getMonth() !== now.getMonth() ? "muted-day" : "",
          dateKey === toDateKey(now) ? "today" : ""
        ].filter(Boolean).join(" ");
        labels.push(`<button type="button" class="${classes}" data-flow-date="${dateKey}">${date.getDate()}</button>`);
      }
      document.getElementById("miniGrid").innerHTML = labels.join("");

      const tooltip = document.getElementById("flowMonthTooltip");
      const showFlowMonth = button => {
        if (!window.Lunar || !tooltip) return;
        const date = parseDate(button.dataset.flowDate);
        const chart = Lunar.bazi(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12);
        tooltip.textContent = `${chart.pillars[0].gan}${chart.pillars[0].zhi}年 · ${chart.pillars[1].gan}${chart.pillars[1].zhi}月`;
        const rect = button.getBoundingClientRect();
        tooltip.style.left = `${Math.min(window.innerWidth - tooltip.offsetWidth - 10, Math.max(10, rect.left + rect.width / 2 - tooltip.offsetWidth / 2))}px`;
        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
        tooltip.classList.add("show");
      };
      const hideFlowMonth = () => tooltip?.classList.remove("show");
      document.querySelectorAll("[data-flow-date]").forEach(button => {
        button.addEventListener("mouseenter", () => showFlowMonth(button));
        button.addEventListener("mouseleave", hideFlowMonth);
        button.addEventListener("focus", () => showFlowMonth(button));
        button.addEventListener("blur", hideFlowMonth);
        button.addEventListener("click", () => {
          showFlowMonth(button);
          clearTimeout(App.flowTooltipTimer);
          App.flowTooltipTimer = setTimeout(hideFlowMonth, 2200);
        });
      });
    },
    renderMobileTabs() {
      const labels = {
        dashboard: "总览", goals: "目标", schedule: "日程", training: "训练",
        habits: "习惯", reading: "阅读", travel: "旅行", mystic: "玄学"
      };
      const canonical = ["dashboard", "goals", "schedule", "training", "habits", "reading", "travel", "mystic"];
      const names = canonical.filter(name => App.views[name])
        .concat(App.order.filter(name => !canonical.includes(name)));
      document.getElementById("mobileTabs").innerHTML = names
        .map(name => `<button data-nav="${name}">${labels[name] || name}</button>`)
        .join("");
    },
    init() {
      App.renderMiniCalendar();
      App.renderMobileTabs();
      window.CloudSync?.init();

      document.querySelectorAll("#sidebar [data-nav]").forEach(btn => {
        btn.addEventListener("click", () => App.navigate(btn.dataset.nav));
      });
      /* 移动端 tab 是动态生成的,用事件委托 */
      document.getElementById("mobileTabs").addEventListener("click", event => {
        const btn = event.target.closest("[data-nav]");
        if (btn) App.navigate(btn.dataset.nav);
      });

      const modal = document.getElementById("modal");
      document.getElementById("modalForm").addEventListener("submit", event => {
        event.preventDefault();
        if (Modal.current && Modal.current.onSubmit) Modal.current.onSubmit();
      });
      document.getElementById("modalDelete").addEventListener("click", () => {
        if (Modal.current && Modal.current.onDelete) Modal.current.onDelete();
      });
      document.getElementById("modalCancel").addEventListener("click", Modal.close);
      document.getElementById("closeModal").addEventListener("click", Modal.close);
      modal.addEventListener("click", event => { if (event.target === modal) Modal.close(); });
      document.addEventListener("keydown", event => { if (event.key === "Escape") Modal.close(); });

      const route = () => {
        const name = (location.hash.replace(/^#\//, "") || "dashboard").split("?")[0];
        App.show(name);
      };
      window.addEventListener("hashchange", route);
      route();
    }
  };

  window.App = App;
  window.U = { pad, toDateKey, parseDate, addDays, startOfWeek, esc, uuid, fmtCN };
  window.Store = Store;
  window.Modal = Modal;
  window.toast = toast;
})();
