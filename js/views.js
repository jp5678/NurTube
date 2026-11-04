// 화면 렌더링: 데이터를 받아 HTML 문자열을 돌려준다
window.NT = window.NT || {};

NT.views = (() => {
  const C = NT.catalog;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const fmtViews = (n) => (n >= 10000 ? `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만회` : `${n.toLocaleString("ko-KR")}회`);
  const fmtAge = (mo) => (mo < 1 ? "이번 달" : mo < 12 ? `${mo}개월 전` : `${Math.round(mo / 12)}년 전`);
  const thumb = (id, frames) => `https://i.ytimg.com/vi/${id}/${frames ? "hq2.jpg" : "mqdefault.jpg"}`;

  const chip = (topicId) => {
    const t = C.topic(topicId);
    return `<a class="chip" href="#/topic/${t.id}" style="--c:${t.color}">${esc(t.name)}</a>`;
  };

  const tier = (score) => (score >= 60 ? "hi" : score >= 40 ? "mid" : "lo");
  const scoreBadge = (v) => (v.pending
    ? '<span class="badge score lo" title="업데이트를 실행하면 반응 점수가 계산됩니다">점수 대기</span>'
    : `<span class="badge score ${tier(v.score)}" title="시청자 반응 점수 (상위 ${C.percentile(v.id)}%)">반응 ${v.score}</span>`);

  // 한국어 시청 방법 배지: 한국어 음성 · 한글 자막 · 자동 번역 자막
  const KV_LABEL = { audio: "한국어", sub: "한글 자막", auto: "자동번역 자막", none: "EN" };
  const kvBadge = (v) => `<span class="badge lang kv-${v.kv}" title="${v.kv === "auto" ? "YouTube 자동 번역으로 한국어 자막을 볼 수 있어요" : ""}">${KV_LABEL[v.kv] || "EN"}</span>`;
  const reviewBadge = (v) => (NT.isReviewed(v) ? '<span class="badge reviewed" title="교수자가 내용을 검수한 영상">✔ 교수 검수</span>' : "");

  const card = (v, { frames, list } = {}) => `
    <article class="card" data-id="${v.id}" tabindex="-1">
      <a class="thumb" href="#/watch/${v.id}${list ? `?list=${list}` : ""}" title="${esc(v.rx)}">
        <img loading="lazy" src="${thumb(v.id, frames)}" alt="" />
        ${v.dur ? `<span class="dur">${v.dur}</span>` : ""}${v.draft ? '<span class="badge draft">미반영 편집</span>' : ""}
        ${scoreBadge(v)}${reviewBadge(v)}
        ${kvBadge(v)}
      </a>
      <div class="meta">
        <a class="title" href="#/watch/${v.id}${list ? `?list=${list}` : ""}">${esc(v.t)}</a>
        <div class="sub">${esc(v.ch)}</div>
        <div class="sub">${v.pending ? "새로 추가" : `${fmtViews(v.views)} · ${fmtAge(v.mo)}`} · ${NT.LEVELS[v.lv]}</div>
      </div>
    </article>`;

  const grid = (videos, opts) => videos.length
    ? `<div class="grid">${videos.map((v) => card(v, opts)).join("")}</div>`
    : `<p class="empty">표시할 영상이 없습니다.</p>`;

  const filterBar = (f) => {
    const sel = (name, options) => `
      <label class="filter${f[name] && f[name] !== options.items[0][0] ? " on" : ""}"><span>${options.label}</span>
        <select data-filter="${name}">${options.items.map(([val, text]) =>
          `<option value="${val}" ${f[name] === val ? "selected" : ""}>${text}</option>`).join("")}</select>
      </label>`;
    return `<div class="filters">
      ${sel("lang", { label: "한국어 시청", items: [["all", "전체"], ["kview", "한국어로 볼 수 있는 영상"], ["kclear", "한국어 음성·한글 자막만"], ["ko", "한국어 음성만"], ["en", "영어 원어 영상"]] })}
      ${sel("level", { label: "수준", items: [["all", "전체"], ["1", "입문"], ["2", "중급"], ["3", "심화"]] })}
      ${sel("length", { label: "길이", items: [["all", "전체"], ["short", "5분 이하"], ["mid", "5–20분"], ["long", "20분 이상"]] })}
      ${sel("sort", { label: "정렬", items: [["keep", "기본"], ["score", "반응 점수"], ["recent", "최신"], ["views", "조회수"], ["short", "짧은 순"]] })}
    </div>`;
  };

  const home = (state, f) => {
    const sections = C.homeSections(state).map((s) => ({ ...s, videos: C.applyFilters(s.videos, f) }));
    const opts = { frames: state.settings.frames };
    return `
      <section class="hero">
        ${NT.heroArt || ""}
        <h1>간호대학생을 위한 <em>[AI융합 간호정보학]</em> 영상 큐레이션</h1>
        <p><span class="line">수업 목표에 맞춰 고른 국내외 영상 ${NT.VIDEOS.length}편을 <b>시청자 댓글·좋아요 분석</b>으로 순위를 매겼습니다.</span>
          <span class="line">영상마다 <b>추천 이유</b>, <b>시청자 반응 요약</b>, <b>토론 질문</b>이 있습니다.</span></p>
      </section>
      ${filterBar(f)}
      ${sections.filter((s) => s.videos.length).map((s) => `
        <section class="shelf">
          <h2>${esc(s.title)} <small>${esc(s.hint)}</small></h2>
          ${grid(s.videos, opts)}
        </section>`).join("")}`;
  };

  const topics = () => NT.AREAS.map((a) => `
    <section class="area">
      <h2>${a.icon} ${esc(a.name)} <small>${esc(a.desc)}</small></h2>
      <div class="topic-list">${NT.TOPICS.filter((t) => t.area === a.id).map((t) => `
        <a class="topic" href="#/topic/${t.id}" style="--c:${t.color}">
          <span>${esc(t.name)}</span><b>${C.byTopic(t.id).length}</b>
        </a>`).join("")}</div>
    </section>`).join("");

  const listPage = (title, desc, videos, state, f, list) => `
    <header class="page-head"><h1>${esc(title)}</h1>${desc ? `<p>${esc(desc)}</p>` : ""}</header>
    ${f ? filterBar(f) : ""}
    ${grid(f ? C.applyFilters(videos, f) : videos, { frames: state.settings.frames, list })}`;

  const playlists = () => `
    <header class="page-head"><h1>재생목록</h1><p>목적별로 묶은 시청 순서. 영상 페이지에서 '다음 영상'으로 이어집니다.</p></header>
    <div class="playlist-grid">${NT.PLAYLISTS.map((p) => ({ p, ids: C.playlistIds(p) })).filter(({ ids }) => ids.length).map(({ p, ids }) => {
      return `<a class="playlist" href="#/playlist/${p.id}">
        <img loading="lazy" src="${thumb(ids[0])}" alt="" />
        <div><h3>${esc(p.title)}</h3><p>${esc(p.desc)}</p><span>${ids.length}편</span></div>
      </a>`;
    }).join("")}</div>`;

  const quizChip = (w, state) => {
    const n = NT.QUIZZES?.[w.week]?.length;
    if (!n) return "";
    const r = state.quiz[w.week];
    return `<a class="quiz-chip ${r ? (r.best / r.total >= 0.8 ? "pass" : "tried") : ""}" href="#/quiz/${w.week}">
      📝 확인 퀴즈 ${r ? `최고 ${r.best}/${r.total}` : `${n}문항`}</a>`;
  };

  const roadmap = (state) => {
    const seen = new Set(state.history.map((h) => h.id));
    const p = NT.quizView.progress(state);
    return `
      <header class="page-head"><h1>15주 AI융합 간호정보학 로드맵</h1>
        <p>간호정보학 기반(1–6주) → AI 원리(7–10주) → AI 간호 실무(11–13주) → 윤리·규제·디지털 헬스케어(14–15주).
          본 영상은 체크 표시되고, 주차마다 확인 퀴즈가 있습니다.</p>
        <div class="stats mini"><div><b>${p.watched}/${p.total}</b>로드맵 영상 시청</div><div><b>${p.quizDone}/${p.quizTotal}</b>퀴즈 응시 주차</div>
          <div><b>${p.quizAvg}%</b>퀴즈 평균(최고 점수)</div><div><b>${p.notes}</b>학습노트</div></div></header>
      <ol class="roadmap">${NT.ROADMAP.map((w) => {
        const done = w.ids.filter((id) => seen.has(id)).length;
        return `<li class="${done === w.ids.length ? "done" : ""}">
          <div class="wk"><b>${w.week}주</b><span>${done}/${w.ids.length}</span></div>
          <div class="wk-body"><div class="wk-head"><h3>${esc(w.title)}</h3><div class="wk-chips">${w.extra ? `<a class="quiz-chip" href="${w.extra.href}">${esc(w.extra.label)}</a>` : ""}${quizChip(w, state)}</div></div>
            <ul>${C.resolve(w.ids).map((v) => `<li class="${seen.has(v.id) ? "seen" : ""}">
              <a href="#/watch/${v.id}?list=roadmap">${esc(v.t)}</a> <small>${v.pending ? "새로 추가 · 점수 대기" : `${v.dur} · ${KV_LABEL[v.kv]} · 반응 ${v.score}`}</small></li>`).join("")}</ul>
          </div></li>`;
      }).join("")}</ol>`;
  };

  return { esc, fmtViews, fmtAge, thumb, tier, KV_LABEL, reviewBadge, chip, card, grid, filterBar, home, topics, listPage, playlists, roadmap };
})();
