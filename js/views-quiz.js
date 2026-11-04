// 주차별 확인 퀴즈: 문제 풀기 · 채점 · 해설 · 진도 요약
window.NT = window.NT || {};

NT.quizView = (() => {
  const { esc } = NT.views;
  const PASS_RATE = 0.8;
  let graded = null; // 방금 채점한 결과 { week, answers } — 화면 표시용

  // 보기 순서를 문제마다 고정된 규칙으로 섞는다(정답 위치가 한쪽에 몰리지 않게)
  const fnv1a = (str) => [...str].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const order = (week, qi, n) => {
    const rank = (i) => fnv1a(`nurtube:${week}:${qi}:${i}`);
    return [...Array(n).keys()].sort((a, b) => rank(a) - rank(b));
  };

  const weekInfo = (week) => NT.ROADMAP.find((w) => w.week === week);

  const progress = (state) => {
    const seen = new Set(state.history.map((h) => h.id));
    const ids = NT.ROADMAP.flatMap((w) => w.ids);
    const weeks = NT.ROADMAP.map((w) => {
      const r = state.quiz[w.week];
      return { week: w.week, title: w.title, quiz: r ? { best: r.best, total: r.total, tries: r.tries } : null };
    });
    const done = weeks.filter((w) => w.quiz);
    const avg = done.length ? Math.round(done.reduce((s, w) => s + w.quiz.best / w.quiz.total, 0) / done.length * 100) : 0;
    // 숨겨진 영상의 노트는 학습노트 화면·Word 파일에 나오지 않으므로 개수에서도 뺀다
    const notes = Object.keys(state.notes).filter((id) => NT.catalog.get(id)).length;
    return { watched: ids.filter((id) => seen.has(id)).length, total: ids.length, notes,
      quizDone: done.length, quizTotal: NT.ROADMAP.length, quizAvg: avg, weeks };
  };

  const resultView = (week, items, answers, prev) => {
    const score = items.filter((it, i) => answers[i] === it.a).length;
    const pass = score / items.length >= PASS_RATE;
    return `
      <section class="quiz-result ${pass ? "pass" : ""}">
        <h2>${score} / ${items.length}점 ${pass ? "🎉 통과" : "· 해설을 읽고 다시 도전해 보세요"}</h2>
        <p class="muted">최고 점수 ${prev?.best ?? score}/${items.length} · 응시 ${prev?.tries ?? 1}회 · 통과 기준 ${Math.round(PASS_RATE * 100)}%</p>
        <div class="hero-links"><button class="btn primary" data-act="quiz-retry">다시 풀기</button>
          ${weekInfo(week + 1) ? `<a class="btn" href="#/quiz/${week + 1}">${week + 1}주차 퀴즈 →</a>` : ""}
          <a class="btn" href="#/roadmap">로드맵으로</a></div>
      </section>
      <ol class="quiz-review">${items.map((it, i) => {
        const ok = answers[i] === it.a;
        return `<li class="${ok ? "ok" : "ng"}"><p class="qq"><span class="mark">${ok ? "정답" : "오답"}</span> ${esc(it.q)}</p>
          ${ok ? "" : `<p class="mine">✗ 내 답: ${esc(it.o[answers[i]])}</p>`}<p class="right">✓ 정답: ${esc(it.o[it.a])}</p>
          <p class="explain">💡 ${esc(it.e)}</p></li>`;
      }).join("")}</ol>`;
  };

  const page = (week, state) => {
    const info = weekInfo(week);
    const items = NT.QUIZZES[week];
    if (!info || !items) return `<p class="empty">퀴즈를 찾을 수 없습니다. <a href="#/roadmap">로드맵으로</a></p>`;
    const videos = NT.catalog.resolve(info.ids);
    const head = `
      <header class="page-head"><h1>${week}주차 확인 퀴즈</h1>
        <p><b>${esc(info.title)}</b> · ${items.length}문항. 이번 주 영상을 본 뒤 풀어 보세요. 결과는 이 브라우저에 저장되고 LMS 제출용 Word 파일에 함께 담깁니다.</p>
        <div class="chips">${videos.map((v) => `<a class="chip plain" href="#/watch/${v.id}?list=roadmap">▶ ${esc(v.t.slice(0, 34))}${v.t.length > 34 ? "…" : ""}</a>`).join("")}</div>
      </header>`;
    if (graded?.week === week) return head + resultView(week, items, graded.answers, state.quiz[week]);
    return `${head}
      <form class="quiz">${items.map((it, qi) => `
        <fieldset><legend>${qi + 1}. ${esc(it.q)}</legend>
          ${order(week, qi, it.o.length).map((oi) => `<label><input type="radio" name="q${qi}" value="${oi}" /> ${esc(it.o[oi])}</label>`).join("")}
        </fieldset>`).join("")}
        <button class="btn primary" data-act="quiz-submit">채점하기</button>
      </form>`;
  };

  /** @returns {{score:number,total:number,answers:number[]}|null} */
  const grade = (week, form) => {
    const items = NT.QUIZZES[week];
    const answers = items.map((_, qi) => {
      const checked = form?.querySelector(`input[name="q${qi}"]:checked`);
      return checked ? Number(checked.value) : null;
    });
    const missing = answers.findIndex((a) => a === null);
    if (missing >= 0) {
      alert(`${missing + 1}번 문제에 답을 고르지 않았습니다.`);
      form.querySelectorAll("fieldset")[missing]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return null;
    }
    graded = { week, answers };
    return { score: items.filter((it, i) => answers[i] === it.a).length, total: items.length, answers };
  };

  const reset = (week) => { if (graded?.week === week) graded = null; };

  return { page, grade, reset, progress };
})();
