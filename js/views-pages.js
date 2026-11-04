// 상세 화면: 영상 시청 · 최신 동향 · 학습 자원 · 학습노트 · 설정 · 소개
window.NT = window.NT || {};

NT.pages = (() => {
  const C = NT.catalog;
  const V = NT.views;
  const { esc } = V;

  const playlistNav = (video, listId) => {
    const list = NT.PLAYLISTS.find((p) => p.id === listId);
    if (!list) return "";
    const ids = C.playlistIds(list);
    const idx = ids.indexOf(video.id);
    const next = C.get(ids[idx + 1]);
    const prev = C.get(ids[idx - 1]);
    return `<div class="pl-nav">
      <a href="#/playlist/${list.id}">▤ ${esc(list.title)}</a> <span>${idx + 1} / ${ids.length}</span>
      <div>${prev ? `<a class="btn" href="#/watch/${prev.id}?list=${list.id}">← 이전</a>` : ""}
      ${next ? `<a class="btn primary" href="#/watch/${next.id}?list=${list.id}">다음 영상 →</a>` : ""}</div>
    </div>`;
  };

  const reaction = (v) => {
    if (v.pending) {
      return `<section class="reaction"><p><b>💬 시청자 반응</b> 새로 추가한 영상입니다. 교수자가 'NurTube 업데이트'를 실행하면 좋아요·댓글을 분석해 반응 점수가 계산됩니다.</p></section>`;
    }
    const s = v.sig;
    const stat = (label, value) => `<div><b>${value}</b><span>${label}</span></div>`;
    return `<section class="reaction">
      <div class="r-head"><span class="r-score ${V.tier(v.score)}">${v.score}</span>
        <div><b>시청자 반응 점수</b><small>전체 ${NT.VIDEOS.length}편 중 상위 ${C.percentile(v.id)}% · <a href="#/about">산출 방법</a></small></div></div>
      <div class="r-stats">
        ${stat("좋아요", v.likes ? V.fmtViews(v.likes).replace("회", "") : "비공개")}
        ${stat("좋아요율", s.likeRate != null ? `${s.likeRate}%` : "–")}
        ${stat("댓글", v.cc ? v.cc.toLocaleString("ko-KR") : "없음")}
        ${stat(`상위 댓글 ${s.n}개 중 긍정·부정`, s.n ? `${s.pos} · ${s.neg}` : "–")}
        ${stat("학습자·의료인 댓글", s.n ? `${s.aud}개` : "–")}
      </div>
      <p><b>💬 댓글 분석 요약</b> ${esc(v.rx)}</p>
    </section>`;
  };

  // 한국어 자막 설정이 켜져 있으면 자막을 켜고 한국어를 우선 선택하도록 요청한다
  const embedSrc = (video, settings) => {
    const params = new URLSearchParams({ rel: "0", enablejsapi: "1", hl: "ko" });
    if (location.protocol.startsWith("http")) params.set("origin", location.origin);
    if (settings.koSubs && video.kv !== "audio") {
      params.set("cc_load_policy", "1");
      params.set("cc_lang_pref", "ko");
    }
    return `https://www.youtube-nocookie.com/embed/${video.id}?${params}`;
  };

  const KV_HELP = {
    audio: "한국어 음성 영상입니다.",
    sub: "한국어 자막이 있습니다. 자막이 안 보이면 플레이어의 <b>CC</b> 버튼을 누르세요.",
    auto: "영어 영상이지만 <b>자동 번역 한국어 자막</b>으로 볼 수 있어요. 플레이어 <b>⚙ 설정 → 자막 → 자동 번역 → 한국어</b>를 선택하세요. 기계 번역이라 전문 용어가 어색할 수 있습니다.",
    none: "한국어 자막이 없는 영상입니다.",
  };

  const koreanView = (video, settings) => `
    <div class="kv-box kv-${video.kv}">
      <span class="badge-inline">${V.KV_LABEL[video.kv]}</span>
      <p>${KV_HELP[video.kv]}</p>
      ${video.kv === "audio" ? "" : `<label class="kv-toggle"><input type="checkbox" data-setting="koSubs" ${settings.koSubs ? "checked" : ""} /> 영상 열 때 한국어 자막 자동으로 켜기</label>`}
    </div>`;

  const stampList = (video, note) => {
    const stamps = NT.stamps.parse(note);
    return stamps.length
      ? `<div class="stamps"><span>노트 속 시간:</span>${stamps.map((x) => `<button class="stamp" data-seek="${x.sec}">▶ ${esc(x.label)}</button>`).join("")}</div>`
      : "";
  };

  const reviewToggle = (video, state) => (state.settings.prof ? `
    <label class="review-toggle"><input type="checkbox" data-act="review" ${state.reviews.includes(video.id) || video.rv ? "checked" : ""} ${video.rv ? "disabled" : ""} />
      ${video.rv ? "교수 검수가 반영된 영상입니다." : "교수자 모드: 이 영상의 요약·추천 이유·답변 가이드를 검수했습니다"}</label>` : "");

  const watch = (video, state, listId) => {
    const week = C.week(video.id);
    const note = state.notes[video.id]?.text || "";
    const liked = state.liked.includes(video.id);
    const later = state.later.includes(video.id);
    return `
      <div class="watch">
        <div class="player">
          <iframe id="yt-player" src="${embedSrc(video, state.settings)}" title="${esc(video.t)}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        ${playlistNav(video, listId)}
        <h1 class="w-title">${esc(video.t)} ${V.reviewBadge(video).replace("badge reviewed", "badge-inline reviewed")}</h1>
        <div class="w-sub">${esc(video.ch)}${video.pending ? "" : ` · ${V.fmtViews(video.views)} · ${V.fmtAge(video.mo)} · ${video.dur}`} · ${NT.LEVELS[video.lv]}</div>
        <div class="actions">
          <button class="btn ${liked ? "on" : ""}" data-act="like" aria-pressed="${liked}">${liked ? "♥ 좋아요함" : "♡ 좋아요"}</button>
          <button class="btn ${later ? "on" : ""}" data-act="later" aria-pressed="${later}">${later ? "✓ 나중에 볼 목록" : "⏱ 나중에 보기"}</button>
          <a class="btn" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener">YouTube에서 보기 ↗</a>
          ${state.settings.prof ? `<a class="btn" href="#/edit/${video.id}">✏️ 이 영상 수정</a>` : ""}
        </div>
        ${koreanView(video, state.settings)}
        ${reviewToggle(video, state)}
        <section class="curation">
          <div class="chips">${V.chip(video.topic)}${week ? `<a class="chip plain" href="#/roadmap">로드맵 ${week.week}주차 · ${esc(week.title)}</a>` : ""}</div>
          <div class="desc-block"><h3>📌 영상 요약</h3><p>${esc(video.sum)}</p></div>
          <div class="desc-block"><h3>⭐ 추천 이유</h3><p>${esc(video.why)}</p></div>
          <div class="question"><b>🗣 토론 질문</b><p>${esc(video.q)}</p>
            <details class="answer">
              <summary>💡 답변 가이드 펼쳐보기 <small>먼저 내 생각을 학습노트에 적어본 뒤 열어보세요</small></summary>
              <ul>${video.a.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
              <p class="muted">정답이 하나인 질문이 아닙니다. 위 내용은 생각을 넓히기 위한 예시 답변이니 내 답과 비교해 보고, 빠진 관점을 노트에 보태 보세요.</p>
            </details>
          </div>
        </section>
        ${reaction(video)}
        <section class="note-box">
          <div class="note-head"><label for="note"><b>📝 내 학습노트</b> <small>이 브라우저에 자동 저장 · 학습노트 메뉴에서 Word로 내보내기</small></label>
            <button class="btn" data-act="stamp" title="단축키 t">⏱ 현재 시간 넣기</button></div>
          <textarea id="note" data-note="${video.id}" rows="5" placeholder="핵심 개념, 질문에 대한 내 생각, 실습과 연결되는 점을 적어보세요.&#10;'현재 시간 넣기'를 누르면 [12:34]처럼 영상 위치가 기록되고, 누르면 그 장면으로 이동합니다.">${esc(note)}</textarea>
          <div id="stamp-list">${stampList(video, note)}</div>
        </section>
      </div>
      <aside class="related"><h2>관련 영상</h2>${C.related(video).map((v) => V.card(v, { frames: state.settings.frames })).join("")}</aside>`;
  };

  const trends = () => `
    <header class="page-head"><h1>2026 국내외 최신 동향</h1>
      <p>간호 AI·간호정보학 분야의 최근 소식과 수업 연결 포인트. 2026년 11월 기준 조사이며, 2차 보도는 원문 확인을 권장합니다.</p></header>
    <div class="trends">${NT.TRENDS.map((t) => `
      <article class="trend">
        <div class="t-top"><span class="tag ${t.region === "국내" ? "kr" : "global"}">${t.region}</span>
          <time>${esc(t.date)}</time> <span class="src">${esc(t.source)}</span>${t.secondary ? '<span class="tag warn">2차 보도</span>' : ""}</div>
        <h3><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.title)} ↗</a></h3>
        <p>${esc(t.sum)}</p>
        <p class="point">🎯 수업 연결: ${esc(t.point)}</p>
      </article>`).join("")}</div>`;

  const resources = () => `
    <header class="page-head"><h1>학습 자원</h1><p>과제·토론·실습에 바로 쓰는 국내외 기관과 도구.</p></header>
    <div class="res-grid">${NT.RESOURCES.map((g) => `
      <section class="res"><h2>${esc(g.group)}</h2><ul>${g.items.map((i) => `
        <li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)} ↗</a><small>${esc(i.note)}</small></li>`).join("")}</ul></section>`).join("")}
    </div>
    <section class="res prompt-guide"><h2>🧪 간호학생 AI 사용 5원칙 (수업 가이드)</h2><ol>
      <li><b>환자 식별정보는 절대 입력하지 않는다.</b> 이름·등록번호·생년월일·사진은 가명화해도 조합으로 식별될 수 있다.</li>
      <li><b>AI 답변은 초안이다.</b> 약물·용량·수치는 반드시 교재·가이드라인·PubMed로 교차 확인한다.</li>
      <li><b>출처를 요구하고 직접 열어본다.</b> AI가 제시한 논문은 실제로 존재하는지 확인한다.</li>
      <li><b>사용 사실을 밝힌다.</b> 과제에 AI를 썼다면 도구·용도·프롬프트를 함께 제출한다.</li>
      <li><b>최종 판단과 책임은 간호사에게 있다.</b> AI는 간호 판단을 보강할 뿐 대신하지 않는다.</li>
    </ol></section>`;

  // 최신 노트 순, 삭제된 영상의 노트는 제외
  const noteEntries = (state) => Object.entries(state.notes)
    .sort((a, b) => b[1].at - a[1].at)
    .map(([id, note]) => ({ video: C.get(id), note }))
    .filter((e) => e.video);

  const studentForm = (st) => `
    <section class="lms">
      <h2>📤 LMS 과제 제출</h2>
      <div class="student-form">
        <label>이름<input data-student="name" value="${esc(st.name)}" placeholder="홍길동" maxlength="40" /></label>
        <label>학번<input data-student="id" value="${esc(st.id)}" placeholder="20261234" maxlength="40" inputmode="numeric" /></label>
        <label>분반<input data-student="section" value="${esc(st.section)}" placeholder="예: 3학년 A반" maxlength="40" /></label>
      </div>
      <ol class="lms-steps">
        <li>영상 페이지에서 학습노트를 적고 주차별 퀴즈를 풉니다.</li>
        <li><b>Word(.docx) 내보내기</b>를 누르면 <code>NurTube_학습노트_학번_이름_날짜.docx</code> 파일이 저장됩니다. 제출자 정보, 학습 현황(영상 시청·퀴즈 점수), 노트, 시간 링크가 들어 있습니다.</li>
        <li>(선택) 구글 문서에서 다듬기: 구글 드라이브에 업로드 → 파일을 열고 <b>Google 문서로 열기</b> → 편집 후 <b>파일 → 다운로드 → Microsoft Word(.docx)</b>.</li>
        <li>학교 LMS의 해당 과제 제출란에 .docx 파일을 업로드합니다.</li>
      </ol>
      <p class="muted">이 사이트는 노트를 서버로 보내지 않습니다. 제출은 반드시 LMS에서 직접 해 주세요. 다른 기기에서는 노트가 보이지 않으니 같은 브라우저를 사용하세요.</p>
    </section>`;

  const notes = (state) => {
    const entries = noteEntries(state);
    return `
      <header class="page-head"><h1>내 학습노트</h1><p>영상별로 적은 노트 ${entries.length}개. 과제·성찰일지로 LMS에 제출하세요.</p></header>
      ${studentForm(state.student)}
      <div class="export-row">
        <button class="btn primary" data-act="export-docx">⬇ Word(.docx) 내보내기 · LMS 제출용</button>
        ${entries.length ? '<button class="btn" data-act="export">⬇ Markdown(.md)</button>' : ""}
      </div>
      ${entries.length ? `<div class="notes">${entries.map(({ video: v, note: n }) => `<article class="note"><a href="#/watch/${v.id}">${esc(v.t)}</a>
          <time>${new Date(n.at).toLocaleString("ko-KR")}</time><p>${NT.stamps.linkify(esc(n.text), v.id)}</p></article>`).join("")}</div>`
        : '<p class="empty">아직 노트가 없습니다. 영상 페이지 아래에서 바로 적을 수 있어요. 노트가 없어도 퀴즈 결과만 담아 제출할 수 있습니다.</p>'}`;
  };

  const exportNotes = (state) => {
    const lines = ["# NurTube 학습노트", `내보낸 날짜: ${new Date().toLocaleString("ko-KR")}`, ""];
    noteEntries(state).forEach(({ video: v, note: n }) => {
      lines.push(`## ${v.t}`, `- 채널: ${v.ch}`, `- 링크: https://www.youtube.com/watch?v=${v.id}`, "",
        "### 영상 요약", v.sum, "", "### 토론 질문", v.q, "", "### 내 학습노트",
        n.text.replace(/\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]/g, (all, label) => {
          const [first] = NT.stamps.parse(all);
          return `[${label}](${NT.stamps.url(v.id, first.sec)})`;
        }), "",
        "### 답변 가이드 (참고)", ...v.a.map((p) => `- ${p}`), "");
    });
    return lines.join("\n");
  };

  const settings = (state) => {
    const check = (key) => (state.settings[key] ? "checked" : "");
    const localReviews = state.reviews.length;
    return `
    <header class="page-head"><h1>설정</h1></header>
    <div class="settings">
      <label class="setting"><div><b>테마</b><p>시스템 설정을 따르거나 직접 선택합니다.</p></div>
        <select data-setting="theme">${[["auto", "시스템"], ["light", "라이트"], ["dark", "다크"]].map(([v, t]) =>
          `<option value="${v}" ${state.settings.theme === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      <label class="setting"><div><b>영상 열 때 한국어 자막 자동으로 켜기</b>
        <p>한글 자막이 있는 영상은 자막을 켜고, 영어 영상은 한국어를 우선 요청합니다. 자동 번역 자막은 플레이어 ⚙ → 자막 → 자동 번역에서 고를 수 있어요.</p></div>
        <input type="checkbox" data-setting="koSubs" ${check("koSubs")} /></label>
      <label class="setting"><div><b>썸네일 대신 영상 중간 장면 보기</b>
        <p>유튜브 썸네일은 클릭을 유도하도록 만들어집니다. 켜면 영상 중간 프레임을 보여줘 실제 내용을 가늠할 수 있습니다.</p></div>
        <input type="checkbox" data-setting="frames" ${check("frames")} /></label>
      <div class="setting"><div><b>시청 기록 삭제</b><p>로드맵 진도 표시도 함께 초기화됩니다.</p></div>
        <button class="btn" data-act="clear-history">기록 삭제</button></div>
    </div>
    <h2 class="settings-h">교수자</h2>
    <div class="settings">
      <label class="setting"><div><b>교수자 모드</b>
        <p>켜면 영상 페이지에 '검수 완료' 체크가 나타납니다. 요약·추천 이유·답변 가이드를 직접 확인한 영상에 표시하세요.</p></div>
        <input type="checkbox" data-setting="prof" ${check("prof")} /></label>
      ${state.settings.prof ? `<div class="setting"><div><b>검수 목록 내보내기 (${localReviews}편 표시함)</b>
        <p>받은 <code>reviewed.json</code>을 <code>tools/</code> 폴더에 넣고 <code>python3 tools/build_data.py</code>를 실행하면
          모든 학생 화면에 '✔ 교수 검수' 배지가 표시됩니다.</p></div>
        <button class="btn" data-act="export-reviews">⬇ reviewed.json</button></div>` : ""}
    </div>`;
  };

  const about = () => `
    <article class="about">
      <h1>NurTube</h1>
      <p class="lead">간호학과 학생이 '다음에 클릭할 영상'이 아니라 '다음 학기에도 기억할 영상'을 만나도록.</p>
      <div class="stats"><div><b>${NT.VIDEOS.length}</b>큐레이션 영상</div><div><b>${NT.TOPICS.length}</b>주제</div>
        <div><b>${NT.ROADMAP.length}</b>주 로드맵</div><div><b>${NT.TRENDS.length}</b>최신 동향</div></div>
      <h2>왜 만들었나</h2>
      <p>NurTube는 <b>AI융합 간호정보학 수업 목표</b>로 후보를 고르고, <b>국내외 시청자 반응</b>으로 우선순위를 정했습니다.</p>
      <h2>어떻게 골랐나</h2>
      <ol><li><b>후보 수집</b> — 수업 주제(간호정보학·표준·AI 원리·LLM·AI 간호 실무·윤리·규제)별로 한국어·영어 YouTube를 검색해 약 220편을 모았습니다.</li>
        <li><b>반응 수집</b> — 영상마다 좋아요·조회수·댓글 수와 상위 댓글 최대 20개를 수집했습니다(2026.11.4 기준).</li>
        <li><b>자동 점수(100점)</b> — 좋아요율 25 · 좋아요 규모 20 · 댓글의 학습·추천 반응(긍정−부정) 30 · 학습자·의료인 댓글 비율 15 · 댓글 규모 10.
          댓글이 적은 영상은 소표본 보정을 적용해 댓글 1개로 만점이 나오지 않게 했고, 좋아요가 비공개면 중립값을 썼습니다.</li>
        <li><b>댓글 정독과 보정</b> — 점수만으로는 농담·봇 댓글·정치 논쟁을 걸러내지 못합니다. 댓글을 직접 읽고 영상마다 <b>반응 요약</b>을 쓰고,
          내용과 무관한 반응이 주를 이루면 점수를 낮췄습니다(최대 ±4점). 봇으로 의심되는 칭찬이 많은 영상은 제외했습니다.</li>
        <li><b>최종 선정</b> — 주제별 균형을 맞춰 ${NT.VIDEOS.length}편을 남기고, 영상마다 추천 이유와 토론 질문을 붙였습니다.
          반응 데이터가 없는 공식 기관 자료(식약처·SNOMED 등)는 출처 신뢰도로 포함하고 그 사실을 표시했습니다.</li></ol>
      <p class="muted">반응 점수는 '얼마나 좋은 영상인가'의 참고 지표이지 정확성 보증이 아닙니다. 영어권 영상은 댓글이 많아 유리할 수 있습니다. 댓글 원문은 싣지 않고 요약만 보여줍니다.</p>
      <h2>이렇게 쓰세요</h2>
      <ul><li><b>홈</b> — 반응 최상위, 반응 좋은 국내 자료, 숨은 명작, 최근 영상. 좋아요를 누르면 비슷한 영상이 추천됩니다.</li>
        <li><b>정렬·한국어 시청</b> — 목록마다 반응 점수·최신·조회수·길이 순으로 바꾸고, '한국어로 볼 수 있는 영상'만 골라 볼 수 있습니다.</li>
        <li><b>로드맵 퀴즈</b> — 주차마다 5~7문항 확인 퀴즈와 해설이 있고, 점수는 진도와 함께 저장됩니다.</li>
        <li><b>시간 표시 노트</b> — 영상 페이지에서 '⏱ 현재 시간 넣기'(단축키 <kbd>t</kbd>)를 누르면 [12:34]가 기록되고, 누르면 그 장면으로 이동합니다.</li>
        <li><b>LMS 제출</b> — 학습노트 메뉴에서 이름·학번을 적고 Word(.docx)로 내보내 LMS에 업로드합니다.</li>
        <li><b>검색</b> — 'ChatGPT', '표준', '환각', '조기경보'처럼 주제어로도 찾아집니다.</li>
        <li><b>로드맵</b> — 15주 수업 순서대로 보고 진도를 확인합니다.</li>
        <li><b>학습노트</b> — 영상별 노트를 적고 .md로 내보내 성찰일지에 활용합니다.</li>
        <li><b>단축키</b> — <kbd>?</kbd>를 눌러 확인하세요.</li></ul>
      <h2>영상 추가·수정하기 (교수자용)</h2>
      <ol><li><a href="#/settings">설정</a>에서 <b>교수자 모드</b>를 켜면 왼쪽 메뉴에 <b>✏️ 영상 관리</b>가 나타납니다.</li>
        <li>YouTube 주소를 붙여 넣고 <b>불러오기</b> → 주제·주차·요약·추천 이유·토론 질문·답변 가이드를 적고 <b>저장</b>합니다.
          기존 영상의 글 수정, 주차 이동, 숨기기도 같은 화면에서 합니다. 저장하면 이 브라우저에서 바로 미리 볼 수 있습니다.</li>
        <li><b>반영 파일 내보내기</b>를 누른 뒤, NurTube 폴더의 <b>NurTube 업데이트.command</b>를 더블클릭하고 <b>1번</b>을 고릅니다.
          반응 점수 계산과 GitHub 업로드까지 자동으로 진행됩니다.</li>
        <li><b>새 영상 자동 추천:</b> 같은 파일의 <b>2번 '새 영상 찾기'</b>를 실행하면 주제별 최신 영상을 찾아 점수를 매기고,
          Claude가 요약·추천 이유·토론 질문·답변 가이드 초안을 씁니다. 영상 관리의 <b>🔎 추천 후보</b>에서 추가·교체·제외를 고르세요.</li></ol>
      <p class="muted">저장되는 정보(좋아요·기록·노트)는 학생 각자의 브라우저에만 남으며 서버로 전송되지 않습니다.</p>
    </article>`;

  const help = () => `
    <div class="modal" role="dialog" aria-modal="true" aria-label="단축키"><div class="modal-box">
      <h2>키보드 단축키</h2>
      <dl><dt><kbd>/</kbd></dt><dd>검색</dd><dt><kbd>j</kbd> <kbd>k</kbd></dt><dd>다음·이전 영상 선택</dd>
        <dt><kbd>Enter</kbd></dt><dd>선택한 영상 열기</dd><dt><kbd>l</kbd></dt><dd>좋아요 (영상 페이지)</dd>
        <dt><kbd>w</kbd></dt><dd>나중에 보기 (영상 페이지)</dd>
        <dt><kbd>t</kbd></dt><dd>노트에 현재 시간 넣기 (영상 페이지)</dd><dt><kbd>n</kbd></dt><dd>재생목록 다음 영상</dd>
        <dt><kbd>g</kbd> <kbd>h</kbd></dt><dd>홈으로</dd><dt><kbd>?</kbd></dt><dd>이 도움말</dd><dt><kbd>Esc</kbd></dt><dd>닫기</dd></dl>
      <button class="btn" data-act="close-modal">닫기</button></div></div>`;

  return { watch, stampList, trends, resources, notes, noteEntries, exportNotes, settings, about, help };
})();
