// 브라우저 저장소 (좋아요·나중에 보기·시청 기록·학습노트·퀴즈·제출자 정보·교수자 검수·설정)
// 모든 값은 이 브라우저에만 저장된다. 접근 불가 환경(사생활 보호 모드 등)에서는 메모리로 동작.
window.NT = window.NT || {};

NT.store = (() => {
  const KEY = "nursingtube:v1";
  const HISTORY_MAX = 200;
  const DEFAULTS = Object.freeze({
    liked: [], later: [], history: [], notes: {}, quiz: {}, reviews: [],
    // 교수자 편집(아직 학생에게 반영 전): 추가·수정 영상, 숨김, 로드맵 주차 이동
    edits: { videos: {}, hidden: [], unhidden: [], weeks: {}, excluded: [] },
    student: { name: "", id: "", section: "" },
    settings: { theme: "auto", frames: false, lang: "all", koSubs: true, prof: false },
  });

  // 저장된 값의 형식이 어긋나도(옛 버전·직접 수정) 화면이 멈추지 않게 기본값으로 바로잡는다
  const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
  const arr = (x) => (Array.isArray(x) ? x : []);
  const obj = (x) => (isObj(x) ? x : {});
  const sanitize = (p) => {
    const edits = obj(p.edits);
    return {
      ...DEFAULTS,
      liked: arr(p.liked).filter((x) => typeof x === "string"),
      later: arr(p.later).filter((x) => typeof x === "string"),
      history: arr(p.history).filter((h) => isObj(h) && typeof h.id === "string"),
      notes: Object.fromEntries(Object.entries(obj(p.notes)).filter(([, n]) => isObj(n) && typeof n.text === "string")),
      quiz: obj(p.quiz),
      reviews: arr(p.reviews).filter((x) => typeof x === "string"),
      edits: { videos: obj(edits.videos), hidden: arr(edits.hidden), unhidden: arr(edits.unhidden),
        weeks: obj(edits.weeks), excluded: arr(edits.excluded) },
      student: Object.fromEntries(Object.entries(DEFAULTS.student).map(([k, d]) =>
        [k, typeof obj(p.student)[k] === "string" ? p.student[k] : d])),
      settings: { ...DEFAULTS.settings, ...obj(p.settings) },
    };
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return DEFAULTS;
      return sanitize(obj(JSON.parse(raw)));
    } catch (err) {
      console.warn("[NurTube] 저장소를 읽지 못해 기본값을 사용합니다.", err);
      return DEFAULTS;
    }
  };

  let state = load();
  const listeners = new Set();

  const persist = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("[NurTube] 저장에 실패했습니다. 이번 세션에서만 유지됩니다.", err);
    }
  };

  const update = (fn) => {
    state = fn(state);
    persist();
    listeners.forEach((cb) => cb(state));
  };

  const toggleIn = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [id, ...list]);

  return {
    get: () => state,
    subscribe: (cb) => listeners.add(cb),
    isLiked: (id) => state.liked.includes(id),
    isLater: (id) => state.later.includes(id),
    toggleLike: (id) => update((s) => ({ ...s, liked: toggleIn(s.liked, id) })),
    toggleLater: (id) => update((s) => ({ ...s, later: toggleIn(s.later, id) })),
    addHistory: (id) => update((s) => ({
      ...s,
      history: [{ id, at: Date.now() }, ...s.history.filter((h) => h.id !== id)].slice(0, HISTORY_MAX),
    })),
    clearHistory: () => update((s) => ({ ...s, history: [] })),
    setNote: (id, text) => update((s) => {
      const { [id]: _removed, ...rest } = s.notes;
      return { ...s, notes: text.trim() ? { ...rest, [id]: { text, at: Date.now() } } : rest };
    }),
    clearNotes: () => update((s) => ({ ...s, notes: {} })),
    setSetting: (key, value) => update((s) => ({ ...s, settings: { ...s.settings, [key]: value } })),
    setStudent: (key, value) => update((s) => ({ ...s, student: { ...s.student, [key]: value.slice(0, 40) } })),
    // 주차별 퀴즈: 가장 최근 결과와 최고 점수를 함께 보관
    saveQuiz: (week, result) => update((s) => {
      const prev = s.quiz[week];
      const best = Math.max(prev?.best ?? 0, result.score);
      return { ...s, quiz: { ...s.quiz, [week]: { ...result, best, tries: (prev?.tries ?? 0) + 1, at: Date.now() } } };
    }),
    toggleReview: (id) => update((s) => ({ ...s, reviews: toggleIn(s.reviews, id) })),
    saveEdit: (video, week) => update((s) => ({
      ...s,
      edits: { ...s.edits, videos: { ...s.edits.videos, [video.id]: video },
        weeks: week === undefined ? s.edits.weeks : { ...s.edits.weeks, [video.id]: week } },
    })),
    setHidden: (id, hidden) => update((s) => ({
      ...s,
      edits: { ...s.edits,
        hidden: hidden ? [...new Set([...s.edits.hidden, id])] : s.edits.hidden.filter((x) => x !== id),
        unhidden: hidden ? s.edits.unhidden.filter((x) => x !== id) : [...new Set([...s.edits.unhidden, id])] },
    })),
    excludeCandidate: (id) => update((s) => ({
      ...s, edits: { ...s.edits, excluded: [...new Set([...(s.edits.excluded || []), id])] },
    })),
    discardEdit: (id) => update((s) => {
      const { [id]: _v, ...videos } = s.edits.videos;
      const { [id]: _w, ...weeks } = s.edits.weeks;
      return { ...s, edits: { videos, weeks, hidden: s.edits.hidden.filter((x) => x !== id),
        unhidden: s.edits.unhidden.filter((x) => x !== id), excluded: (s.edits.excluded || []).filter((x) => x !== id) } };
    }),
    clearEdits: () => update((s) => ({ ...s, edits: DEFAULTS.edits, reviews: [] })),
  };
})();

// 교수 검수 여부: 빌드에 반영된 검수(rv) + 교수자 모드에서 이 브라우저에 표시한 검수
NT.isReviewed = (v) => {
  const s = NT.store.get();
  return Boolean(v.rv || (s.settings.prof && s.reviews.includes(v.id)));
};
