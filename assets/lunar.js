/* 历法工具:干支、节气(通式近似)、农历转换、纳音。供八字与紫微排盘使用。 */
(() => {
  const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
  const GAN_ELEMENT = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
  const ZHI_ELEMENT = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
  /* 地支藏干(本气在前) */
  const ZHI_HIDDEN = [
    ["癸"], ["己", "癸", "辛"], ["甲", "丙", "戊"], ["乙"], ["戊", "乙", "癸"], ["丙", "庚", "戊"],
    ["丁", "己"], ["己", "丁", "乙"], ["庚", "壬", "戊"], ["辛"], ["戊", "辛", "丁"], ["壬", "甲"]
  ];

  const ganzhi = index => GAN[index % 10] + ZHI[index % 12];

  /* ---------- 节气(每月的「节」),寿星通式近似,误差 ±1 天 ---------- */
  /* 顺序:小寒 立春 惊蛰 清明 立夏 芒种 小暑 立秋 白露 寒露 立冬 大雪 */
  const JIE_C_20 = [6.11, 4.6295, 6.318, 5.59, 6.318, 6.5, 7.928, 8.35, 8.44, 9.098, 8.218, 7.9];
  const JIE_C_21 = [5.4055, 3.87, 5.63, 4.81, 5.52, 5.678, 7.108, 7.5, 7.646, 8.318, 7.438, 7.18];

  function jieDay(year, month) {
    /* month: 1-12(公历),返回该月「节」所在日 */
    const C = year <= 2000 ? JIE_C_20 : JIE_C_21;
    const Y = year % 100;
    const leapTerm = month <= 2 ? Math.trunc((Y - 1) / 4) : Math.trunc(Y / 4);
    return Math.trunc(Y * 0.2422 + C[month - 1]) - leapTerm;
  }

  /* ---------- 日柱:以 2000-01-01 = 戊午(第 55 位,索引 54)为锚点 ---------- */
  function dayGanzhiIndex(year, month, day) {
    const diff = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(2000, 0, 1)) / 86400000);
    return ((diff % 60) + 60 + 54) % 60;
  }

  /* ---------- 八字四柱 ---------- */
  function bazi(year, month, day, hour) {
    /* 23 点后按次日子时换日 */
    let y = year, m = month, d = day;
    if (hour >= 23) {
      const next = new Date(Date.UTC(year, month - 1, day) + 86400000);
      y = next.getUTCFullYear();
      m = next.getUTCMonth() + 1;
      d = next.getUTCDate();
    }

    /* 年柱:以立春为界 */
    const lichun = jieDay(y, 2);
    const baziYear = (m > 2 || (m === 2 && d >= lichun)) ? y : y - 1;
    const yearGZ = ((baziYear - 4) % 60 + 60) % 60;
    const yearStem = yearGZ % 10;

    /* 月柱:以每月「节」为界 */
    const branch = d >= jieDay(y, m) ? m % 12 : (m - 1 + 12) % 12; /* 地支索引,子=0 */
    const monthNum = (branch - 2 + 12) % 12; /* 寅月=0 */
    const monthStem = ((yearStem % 5) * 2 + 2 + monthNum) % 10;

    /* 日柱 */
    const dayGZ = dayGanzhiIndex(y, m, d);
    const dayStem = dayGZ % 10;

    /* 时柱 */
    const hourBranch = Math.floor(((hour + 1) % 24) / 2);
    const hourStem = ((dayStem % 5) * 2 + hourBranch) % 10;

    const pillars = [
      { name: "年柱", gan: GAN[yearStem], zhi: ZHI[yearGZ % 12], ganIdx: yearStem, zhiIdx: yearGZ % 12 },
      { name: "月柱", gan: GAN[monthStem], zhi: ZHI[branch], ganIdx: monthStem, zhiIdx: branch },
      { name: "日柱", gan: GAN[dayStem], zhi: ZHI[dayGZ % 12], ganIdx: dayStem, zhiIdx: dayGZ % 12 },
      { name: "时柱", gan: GAN[hourStem], zhi: ZHI[hourBranch], ganIdx: hourStem, zhiIdx: hourBranch }
    ];

    /* 五行统计:天干 + 地支本气 */
    const wuxing = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach(pillar => {
      wuxing[GAN_ELEMENT[pillar.ganIdx]] += 1;
      wuxing[ZHI_ELEMENT[pillar.zhiIdx]] += 1;
    });

    return {
      pillars,
      wuxing,
      zodiac: ZODIAC[yearGZ % 12],
      dayMaster: GAN[dayStem],
      dayMasterElement: GAN_ELEMENT[dayStem],
      hidden: pillars.map(pillar => ZHI_HIDDEN[pillar.zhiIdx].join(" "))
    };
  }

  /* ---------- 农历转换(1900-2100),经典压缩表 ---------- */
  const LUNAR_INFO = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
    0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
    0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
    0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
    0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
    0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
    0x0d520
  ];

  const lunarLeapMonth = year => LUNAR_INFO[year - 1900] & 0xf;
  const lunarLeapDays = year => (lunarLeapMonth(year) ? ((LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29) : 0);
  const lunarMonthDays = (year, month) => ((LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29);
  function lunarYearDays(year) {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[year - 1900] & i) ? 1 : 0;
    return sum + lunarLeapDays(year);
  }

  function solarToLunar(year, month, day) {
    if (year < 1901 || year > 2099) return null;
    let offset = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(1900, 0, 31)) / 86400000);
    let i;
    let temp = 0;
    for (i = 1900; i < 2101 && offset > 0; i++) {
      temp = lunarYearDays(i);
      offset -= temp;
    }
    if (offset < 0) {
      offset += temp;
      i--;
    }
    const lYear = i;
    const leap = lunarLeapMonth(lYear);
    let isLeap = false;
    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i === leap + 1 && !isLeap) {
        --i;
        isLeap = true;
        temp = lunarLeapDays(lYear);
      } else {
        temp = lunarMonthDays(lYear, i);
      }
      if (isLeap && i === leap + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) {
        isLeap = false;
      } else {
        isLeap = true;
        --i;
      }
    }
    if (offset < 0) {
      offset += temp;
      --i;
    }
    return { year: lYear, month: i, day: offset + 1, isLeap };
  }

  /* ---------- 纳音五行(按六十甲子两两一组) ---------- */
  const NAYIN_ELEMENTS = [
    "金", "火", "木", "土", "金", "火", "水", "土", "金", "木",
    "水", "土", "火", "木", "水", "金", "火", "木", "土", "金",
    "火", "水", "土", "金", "木", "水", "土", "火", "木", "水"
  ];
  const nayinElement = gzIndex => NAYIN_ELEMENTS[Math.floor((gzIndex % 60) / 2)];

  window.Lunar = { GAN, ZHI, ZODIAC, GAN_ELEMENT, ZHI_ELEMENT, ganzhi, jieDay, bazi, solarToLunar, nayinElement, dayGanzhiIndex };
})();
