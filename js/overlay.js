// 영상 목록·로드맵에 변경사항을 덧씌운다 (catalog.js보다 먼저 실행)
// 1) 반영된 변경: js/data/overrides.js (NT.OVERRIDES)  2) 교수자 모드의 미반영 편집: 이 브라우저의 store.edits
window.NT = window.NT || {};

(() => {
  const EMPTY = { videos: {}, hidden: [], unhidden: [], weeks: {} };
  const published = { hidden: [], weeks: {}, ...(NT.OVERRIDES || {}) };
  const state = NT.store.get();
  const local = state.settings.prof ? { ...EMPTY, ...state.edits } : EMPTY;
  const HANGUL = /[가-힣]/;

  const hidden = new Set([...published.hidden, ...local.hidden].filter((id) => !local.unhidden.includes(id)));
  const weeks = { ...published.weeks, ...local.weeks };

  // 새로 추가한 영상: 반응 점수는 업데이트 실행 때 계산되므로 '점수 대기'로 표시
  const fresh = (e) => {
    const lang = HANGUL.test(e.t) ? "ko" : "en";
    return { id: e.id, t: e.t, ch: e.ch, dur: "", views: 0, likes: 0, cc: 0, mo: 0, topic: e.topic, lv: e.lv, lang,
      kv: lang === "ko" ? "audio" : "none", rv: false, score: 0, pending: true,
      sig: { pos: 0, neg: 0, aud: 0, n: 0, likeRate: null },
      sum: e.sum, why: e.why, q: e.q, a: e.a, rx: e.rx || "새로 추가된 영상입니다. 반응 점수와 댓글 요약은 'NurTube 업데이트'를 실행하면 계산됩니다." };
  };

  const EDITABLE = ["t", "ch", "topic", "lv", "sum", "why", "q", "a", "rx"];
  const byId = new Map(NT.VIDEOS.map((v) => [v.id, v]));
  Object.values(local.videos).forEach((e) => {
    const base = byId.get(e.id);
    const patch = Object.fromEntries(EDITABLE.filter((k) => e[k] !== undefined && e[k] !== "").map((k) => [k, e[k]]));
    byId.set(e.id, base ? { ...base, ...patch, draft: true } : { ...fresh(e), draft: true });
  });

  const validTopic = new Set(NT.TOPICS.map((t) => t.id));
  NT.VIDEOS = [...byId.values()]
    .filter((v) => !hidden.has(v.id) && validTopic.has(v.topic))
    .sort((a, b) => b.score - a.score);
  NT.HIDDEN_VIDEOS = [...byId.values()].filter((v) => hidden.has(v.id));

  const exists = new Set(NT.VIDEOS.map((v) => v.id));
  NT.ROADMAP = NT.ROADMAP.map((w) => {
    const kept = w.ids.filter((id) => exists.has(id) && (weeks[id] === undefined || weeks[id] === w.week));
    const moved = Object.entries(weeks).filter(([id, wk]) => wk === w.week && exists.has(id) && !kept.includes(id)).map(([id]) => id);
    return { ...w, ids: [...kept, ...moved] };
  });
  NT.PLAYLISTS = NT.PLAYLISTS.map((p) => (p.id === "roadmap"
    ? { ...p, ids: NT.ROADMAP.flatMap((w) => w.ids) }
    : p.ids ? { ...p, ids: p.ids.filter((id) => exists.has(id)) } : p));
})();
