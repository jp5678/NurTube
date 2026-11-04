// 영상 조회·검색·필터·정렬·홈 추천 로직 (순수 함수)
window.NT = window.NT || {};

NT.catalog = (() => {
  const byId = new Map(NT.VIDEOS.map((v) => [v.id, v]));
  const topicById = new Map(NT.TOPICS.map((t) => [t.id, t]));
  const weekById = new Map(NT.ROADMAP.flatMap((w) => w.ids.map((id) => [id, w])));
  const TOP_N = 20;
  const HIDDEN_GEM_MAX_VIEWS = 5000;

  // 반응 점수 순위 → 상위 백분위 (1 = 최상위)
  const ranked = [...NT.VIDEOS].sort((a, b) => b.score - a.score);
  const percentile = new Map(ranked.map((v, i) => [v.id, Math.ceil(((i + 1) / ranked.length) * 100)]));

  // 검색어 → 주제 확장 (키워드가 없어도 주제로 찾기)
  const SYNONYMS = {
    genai: ["챗gpt", "chatgpt", "gpt", "llm", "생성형", "언어모델", "트랜스포머", "환각", "hallucinat"],
    study: ["프롬프트", "prompt", "공부", "시험", "학습법", "study"],
    aibasic: ["머신러닝", "machine learning", "딥러닝", "빅데이터", "nlp", "자연어", "인공지능 기초"],
    ainurse: ["음성", "voice", "앰비언트", "ambient", "간호기록 ai", "병원 사례"],
    cds: ["cdss", "의사결정", "알람", "alarm", "조기경보", "패혈증", "sepsis", "예측", "악화"],
    smart: ["스마트병원", "가상간호", "virtual", "원격", "웨어러블", "wearable", "시뮬레이션"],
    ethics: ["윤리", "편향", "bias", "설명가능", "xai", "공정"],
    reg: ["규제", "법", "식약처", "fda", "eu ai act", "개인정보", "hipaa", "책임", "가이드라인"],
    std: ["표준", "fhir", "hl7", "snomed", "icd", "omop", "cdm", "상호운용", "용어"],
    ehr: ["emr", "ehr", "전자", "간호기록", "차팅", "charting", "soap", "sbar", "기록"],
    ni: ["간호정보", "informatics", "dikw", "정보학"],
    career: ["진로", "커리어", "career", "취업", "informaticist"],
  };

  const minutes = (dur) => dur.split(":").map(Number).reduce((acc, n) => acc * 60 + n, 0) / 60;
  const haystack = (v) => [v.t, v.ch, v.sum, v.why, v.q, v.rx, topicById.get(v.topic)?.name].join(" ").toLowerCase();

  const search = (query) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/);
    const topicHits = Object.entries(SYNONYMS)
      .filter(([, words]) => words.some((w) => q.includes(w) || w.includes(q)))
      .map(([topic]) => topic);
    return NT.VIDEOS
      .map((v) => {
        const text = haystack(v);
        const termScore = terms.filter((t) => text.includes(t)).length * 3;
        const topicScore = topicHits.includes(v.topic) ? 2 : 0;
        return { v, score: termScore + topicScore + v.score / 100 };
      })
      .filter((r) => r.score >= 2)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.v);
  };

  const DURATION_FILTERS = {
    all: () => true,
    short: (m) => m <= 5,
    mid: (m) => m > 5 && m <= 20,
    long: (m) => m > 20,
  };

  const SORTS = {
    score: (a, b) => b.score - a.score,
    recent: (a, b) => a.mo - b.mo,
    views: (a, b) => b.views - a.views,
    short: (a, b) => minutes(a.dur) - minutes(b.dur),
  };

  const LANG_FILTERS = {
    all: () => true,
    kview: (v) => v.kv !== "none",
    kclear: (v) => v.kv === "audio" || v.kv === "sub",
    ko: (v) => v.lang === "ko",
    en: (v) => v.lang === "en",
  };

  const applyFilters = (videos, { lang = "all", level = "all", length = "all", sort = "keep" } = {}) => {
    const filtered = videos.filter((v) =>
      (LANG_FILTERS[lang] || LANG_FILTERS.all)(v) &&
      (level === "all" || String(v.lv) === level) &&
      DURATION_FILTERS[length](minutes(v.dur)));
    return SORTS[sort] ? [...filtered].sort(SORTS[sort]) : filtered;
  };

  const top = (n = TOP_N) => ranked.slice(0, n);

  const homeSections = ({ liked, history }) => {
    const seen = new Set(history.map((h) => h.id));
    const likedTopics = new Set(liked.map((id) => byId.get(id)?.topic).filter(Boolean));
    const seenTopics = new Set([...seen].map((id) => byId.get(id)?.topic));
    const sections = [];

    if (likedTopics.size) {
      sections.push({ key: "similar", title: "좋아요와 비슷한 영상", hint: "좋아요한 영상과 같은 주제 · 반응 점수 순",
        videos: ranked.filter((v) => likedTopics.has(v.topic) && !liked.includes(v.id)).slice(0, 8) });
    }
    sections.push({ key: "top", title: "시청자 반응 최상위", hint: "국내외 댓글·좋아요 분석 점수 순",
      videos: top(8) });
    sections.push({ key: "korean", title: "반응 좋은 국내 자료", hint: "한국어 영상 중 점수 순",
      videos: ranked.filter((v) => v.lang === "ko").slice(0, 8) });
    sections.push({ key: "gems", title: "숨은 명작", hint: `조회수 ${HIDDEN_GEM_MAX_VIEWS.toLocaleString()} 미만이지만 반응이 좋은 영상`,
      videos: ranked.filter((v) => v.views < HIDDEN_GEM_MAX_VIEWS && v.score >= 40).slice(0, 8) });
    sections.push({ key: "recent", title: "최근 1년의 새 영상", hint: "2025.11 이후 게시",
      videos: NT.VIDEOS.filter((v) => v.mo <= 12).sort((a, b) => a.mo - b.mo).slice(0, 8) });
    const fresh = NT.TOPICS.filter((t) => !seenTopics.has(t.id))
      .map((t) => ranked.find((v) => v.topic === t.id))
      .filter(Boolean);
    if (fresh.length) {
      sections.push({ key: "explore", title: "아직 탐색하지 않은 주제", hint: "주제별 반응 1위 영상", videos: fresh.slice(0, 8) });
    }
    return sections;
  };

  const related = (video, limit = 8) => {
    const area = topicById.get(video.topic).area;
    const same = ranked.filter((v) => v.id !== video.id && v.topic === video.topic);
    const near = ranked.filter((v) => v.id !== video.id && v.topic !== video.topic && topicById.get(v.topic).area === area);
    return [...same, ...near].slice(0, limit);
  };

  const playlistIds = (p) => (p.dynamic === "top" ? top().map((v) => v.id) : p.ids);

  return {
    get: (id) => byId.get(id),
    topic: (id) => topicById.get(id),
    week: (id) => weekById.get(id),
    percentile: (id) => percentile.get(id),
    byTopic: (topicId) => ranked.filter((v) => v.topic === topicId),
    resolve: (ids) => ids.map((id) => byId.get(id)).filter(Boolean),
    search, applyFilters, homeSections, related, minutes, top, playlistIds,
  };
})();
