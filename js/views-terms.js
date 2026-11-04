// '표준 간호용어' 페이지: ANA 인정 12종 비교표 · 체계별 설명 · NNN 연결 예시 · 관련 영상
window.NT = window.NT || {};

NT.termsView = (() => {
  const { esc } = NT.views;
  const COVERS = [["d", "진단"], ["i", "중재"], ["o", "결과"], ["m", "관리·기타"]];
  // 페이지 아래에 보여 줄 간호 용어 영상(있는 것만 표시)
  const VIDEO_IDS = ["nOTIIYVlYjM", "60E7ESDiGco", "meBtk8IcmuY", "RK_8mzzYKwM", "Lsm9iOhUKvw", "hZ6OM2bEiIE", "oIAfQptjYJ4", "4RkIGNLvQZI", "0Mz5Xa1cUvI"];

  const table = () => `
    <div class="term-table-wrap"><table class="term-table">
      <thead><tr><th>체계</th><th>유형</th>${COVERS.map(([, n]) => `<th>${n}</th>`).join("")}<th>개발</th></tr></thead>
      <tbody>${NT.TERMINOLOGIES.map((t) => `<tr>
        <td><a href="#t-${t.id}"><b>${esc(t.name)}</b><small>${esc(t.ko)}</small></a></td>
        <td><span class="term-type ${t.type}">${NT.TERM_TYPES[t.type].name}</span></td>
        ${COVERS.map(([k]) => `<td class="dot">${t.covers.includes(k) ? "●" : ""}</td>`).join("")}
        <td class="muted">${esc(t.by)}</td></tr>`).join("")}</tbody>
    </table></div>`;

  const card = (t) => `
    <article class="term-card" id="t-${t.id}">
      <div class="term-head"><h3>${esc(t.name)} <small>${esc(t.ko)}</small></h3>
        <span class="term-type ${t.type}">${NT.TERM_TYPES[t.type].name}</span></div>
      <p>${esc(t.what)}</p>
      <dl><dt>구성</dt><dd>${esc(t.structure)}</dd><dt>예시</dt><dd>${esc(t.example)}</dd><dt>활용</dt><dd>${esc(t.use)}</dd></dl>
      <p class="term-foot"><span class="muted">${esc(t.by)}</span> · <a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.urlLabel || "공식 사이트")} ↗</a></p>
    </article>`;

  const nnn = () => `
    <section class="lms term-nnn">
      <h2>🔗 NNN 연결 예시: 수술 후 1일차, 혼자 화장실에 가려다 비틀거린 70대 환자</h2>
      <ol class="nnn-flow">
        <li><b>NANDA-I 간호진단</b><span>낙상 위험성 (관련 요인: 수술 후 활동 감소, 진통제 사용)</span></li>
        <li><b>NIC 간호중재</b><span>낙상 예방: 위험 사정, 침대 높이 낮추기, 호출벨 위치 교육, 보행 시 동행</span></li>
        <li><b>NOC 간호결과</b><span>낙상 예방 행위: 호출벨 사용 등 지표를 1~5점으로 평가 (2점 → 4점)</span></li>
      </ol>
      <p class="muted">같은 상황을 ICNP·CCC로도 기록할 수 있고, SNOMED CT는 이런 서로 다른 용어를 같은 개념 코드로 이어 줍니다.
        표준 용어로 남긴 기록은 다른 병원과 비교되고, AI가 낙상 위험을 학습하는 데이터가 됩니다.</p>
    </section>`;

  const videos = (state) => {
    const list = NT.catalog.resolve(VIDEO_IDS);
    return list.length ? `<section class="shelf"><h2>관련 영상 <small>4주차 '표준용어' 로드맵과 연결</small></h2>
      ${NT.views.grid(list, { frames: state.settings.frames })}</section>` : "";
  };

  const page = (state) => `
    <header class="page-head"><h1>📖 표준 간호용어 분류체계</h1>
      <p>미국간호사협회(ANA)가 간호 실무를 지원하는 표준으로 인정한 12종입니다. 간호 기록을 표준 용어로 남기면 병원·나라가 달라도 같은 의미로 읽히고,
        간호의 효과를 비교·연구하거나 AI가 학습하는 데이터가 됩니다.</p>
      <div class="hero-links"><a class="btn primary" href="#/quiz/4">📝 4주차 확인 퀴즈</a><a class="btn" href="#/roadmap">4주차 로드맵</a>
        <a class="btn" href="#/resources">학습 자원</a></div></header>
    <div class="term-types">${Object.values(NT.TERM_TYPES).map((x) => `<div><b>${esc(x.name)}</b><span>${esc(x.desc)}</span></div>`).join("")}</div>
    <h2 class="settings-h">한눈에 비교</h2>
    ${table()}
    ${nnn()}
    ${Object.entries(NT.TERM_TYPES).map(([type, info]) => `
      <h2 class="settings-h">${esc(info.name)}</h2>
      <div class="term-grid">${NT.TERMINOLOGIES.filter((t) => t.type === type).map(card).join("")}</div>`).join("")}
    ${videos(state)}
    <p class="muted">개발 기관과 판(edition)에 따라 영역·분류 수가 바뀌므로, 최신 판은 각 공식 사이트에서 확인하세요.</p>`;

  return { page };
})();
