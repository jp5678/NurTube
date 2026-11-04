// 사용 설명서: 학생용 · 교수자용 (인쇄하면 PDF로 저장 가능)
window.NT = window.NT || {};

NT.manualView = (() => {
  const SITE = "https://jp5678.github.io/NurTube/";

  const toc = (items) => `<nav class="man-toc" aria-label="목차"><ol>${items.map(([id, t]) => `<li><a href="#/manual" data-jump="${id}">${t}</a></li>`).join("")}</ol></nav>`;

  const STUDENT = [
    ["m-start", "시작하기"], ["m-find", "영상 찾기"], ["m-watch", "영상 보기"], ["m-notes", "학습노트와 시간 표시"],
    ["m-quiz", "주차별 확인 퀴즈"], ["m-lms", "LMS 과제 제출"], ["m-more", "표준 간호용어 · 학습 자원 · 최신 동향"],
    ["m-keys", "키보드 단축키"], ["m-faq", "자주 묻는 질문"],
  ];
  const PROF = [
    ["p-mode", "교수자 모드 켜기"], ["p-edit", "영상 추가·수정·숨기기"], ["p-cand", "새 영상 찾기와 AI 초안"],
    ["p-tool", "NurTube 업데이트.command 메뉴"], ["p-term", "학기 점검과 관리 팁"],
  ];

  const page = () => `
    <article class="manual">
      <header class="page-head"><h1>📘 NurTube 사용 설명서</h1>
        <p>간호대학생을 위한 [AI융합 간호정보학] 영상 큐레이션 사이트 · <a href="${SITE}">${SITE}</a></p>
        <div class="hero-links no-print"><button class="btn primary" data-act="print-manual">🖨 PDF로 저장 · 인쇄</button>
          <a class="btn" href="#/manual" data-jump="part-student">학생용</a><a class="btn" href="#/manual" data-jump="part-prof">교수자용</a></div>
        <p class="muted no-print">PDF로 저장하려면 인쇄 창에서 대상(프린터)을 <b>'PDF로 저장'</b>으로 고르세요.</p></header>

      <section class="man-part" id="part-student">
        <h2 class="man-h2">1부 · 학생용</h2>
        ${toc(STUDENT)}

        <h3 id="m-start">1. 시작하기</h3>
        <ul>
          <li>주소 <b>${SITE}</b> 에 접속합니다. 로그인이나 설치가 필요 없고, 컴퓨터·태블릿·휴대폰에서 모두 쓸 수 있습니다.</li>
          <li>왼쪽 메뉴: 홈, 15주 로드맵, 주제별, 재생목록, 최신 동향, 학습 자원, 표준 간호용어, 좋아요, 나중에 보기, 시청 기록, 학습노트, 설정, 소개, 사용 설명서.</li>
          <li>왼쪽 위 <b>☰ 버튼</b>을 누르면 메뉴를 접어 화면을 넓게 쓸 수 있습니다(휴대폰에서는 메뉴가 옆에서 열립니다).</li>
          <li><b>홈</b>에는 반응 최상위, 반응 좋은 국내 자료, 숨은 명작, 최근 1년 영상, 아직 보지 않은 주제가 나옵니다. 좋아요를 누르면 비슷한 영상이 추천됩니다.</li>
        </ul>

        <h3 id="m-find">2. 영상 찾기</h3>
        <ul>
          <li><b>검색:</b> 위쪽 검색창에 'LLM', '환각', 'FHIR', '간호기록', '조기경보'처럼 주제어를 넣으면 관련 영상이 나옵니다.</li>
          <li><b>필터:</b> 목록 위에서 <b>한국어 시청</b>(한국어 음성·한글 자막·자동번역 자막), <b>수준</b>(입문·중급·심화), <b>길이</b>, <b>정렬</b>(반응 점수·최신·조회수·짧은 순)을 고릅니다.</li>
          <li><b>15주 로드맵:</b> 수업 주차 순서대로 볼 영상과 퀴즈가 있습니다. 본 영상은 ✓ 표시되고 진도가 위에 나타납니다.</li>
          <li><b>카드 배지:</b> <span class="badge-inline">반응 78</span> 시청자 반응 점수(100점), <span class="badge-inline">한국어</span>·<span class="badge-inline">한글 자막</span>·<span class="badge-inline">자동번역 자막</span> 한국어로 보는 방법, <span class="badge-inline reviewed">✔ 교수 검수</span> 교수님이 내용을 확인한 영상.</li>
        </ul>

        <h3 id="m-watch">3. 영상 보기</h3>
        <ul>
          <li>영상 아래에 <b>📌 영상 요약</b>, <b>⭐ 추천 이유</b>, <b>🗣 토론 질문</b>이 있습니다.</li>
          <li><b>💡 답변 가이드 펼쳐보기:</b> 먼저 자기 생각을 학습노트에 적은 뒤 열어 비교하세요. 정답이 하나인 질문이 아닙니다.</li>
          <li><b>시청자 반응 점수:</b> 좋아요율, 좋아요 수, 댓글의 학습·추천 반응, 학습자·의료인 댓글 비율을 합친 점수입니다. 좋은 영상을 고르는 참고 지표일 뿐 내용의 정확성을 보증하지는 않습니다.</li>
          <li><b>한국어 자막:</b> 영어 영상은 자동으로 한국어(자동 번역) 자막이 켜집니다. 영어로 나오면 <b>🇰🇷 한국어 자막으로 바꾸기</b>를 누르세요. 기계 번역이라 전문 용어가 어색할 수 있습니다.</li>
          <li><b>♡ 좋아요 · ⏱ 나중에 보기</b>로 영상을 모아 둘 수 있습니다.</li>
        </ul>

        <h3 id="m-notes">4. 학습노트와 시간 표시</h3>
        <ul>
          <li>영상 페이지 아래 <b>📝 내 학습노트</b>에 적으면 자동 저장됩니다.</li>
          <li><b>⏱ 현재 시간 넣기</b>(단축키 <kbd>t</kbd>)를 누르면 <code>[12:34]</code>처럼 지금 재생 위치가 기록됩니다. 노트 아래의 <b>▶ 12:34</b>를 누르면 그 장면으로 이동합니다.</li>
          <li>왼쪽 메뉴 <b>학습노트</b>에서 모든 노트를 한 번에 보고 내보낼 수 있습니다.</li>
        </ul>

        <h3 id="m-quiz">5. 주차별 확인 퀴즈</h3>
        <ul>
          <li>로드맵의 <b>📝 확인 퀴즈</b>를 누릅니다. 주차마다 5~7문항입니다.</li>
          <li>모두 고른 뒤 <b>채점하기</b>를 누르면 맞힌 문제는 <span class="ok-text">초록</span>, 틀린 문제는 <span class="ng-text">빨강</span>으로 표시되고 해설이 나옵니다. 80% 이상이면 통과입니다.</li>
          <li><b>다시 풀기</b>로 여러 번 풀 수 있고, 최고 점수가 저장되어 로드맵과 제출 파일에 반영됩니다.</li>
        </ul>

        <h3 id="m-lms">6. LMS 과제 제출</h3>
        <ol>
          <li>왼쪽 메뉴 <b>학습노트</b>에서 <b>분반 · 학번 · 이름</b>을 입력합니다.</li>
          <li><b>⬇ Word(.docx) 내보내기 · LMS 제출용</b>을 누르면 <code>NurTube_학습노트_학번_이름_날짜.docx</code>가 저장됩니다.
            제출자 정보, 학습 현황(로드맵 시청·퀴즈 점수), 영상별 요약·토론 질문·내 노트·시간 링크·답변 가이드가 들어 있습니다.</li>
          <li>(선택) 구글 드라이브에 올려 <b>Google 문서로 열기</b> → 편집 → <b>파일 → 다운로드 → Microsoft Word(.docx)</b>.</li>
          <li>학교 LMS의 과제 제출란에 .docx 파일을 올립니다. NurTube는 파일을 대신 제출하지 않습니다.</li>
        </ol>

        <h3 id="m-more">7. 표준 간호용어 · 학습 자원 · 최신 동향</h3>
        <ul>
          <li><b>표준 간호용어:</b> ANA 인정 12종(NANDA-I·NIC·NOC·ICNP·CCC·Omaha·PNDS·NMDS·NMMDS·ABC·LOINC·SNOMED CT)의 비교표, 구성·예시, NNN 연결 예시, 관련 영상.</li>
          <li><b>학습 자원:</b> 국내외 기관·가이드라인, 표준 용어, 문헌 검색(PubMed·CINAHL·KoreaMed·RISS 등), 참고문헌 도구(Zotero·Mendeley·EndNote·APA), 간호학생 AI 사용 5원칙.</li>
          <li><b>최신 동향:</b> 2026 국내외 간호 AI·간호정보학 소식과 수업 연결 포인트.</li>
        </ul>

        <h3 id="m-keys">8. 키보드 단축키</h3>
        <table class="man-table"><tbody>
          <tr><td><kbd>/</kbd></td><td>검색</td><td><kbd>j</kbd> <kbd>k</kbd></td><td>다음·이전 영상 선택</td></tr>
          <tr><td><kbd>Enter</kbd></td><td>선택한 영상 열기</td><td><kbd>l</kbd></td><td>좋아요</td></tr>
          <tr><td><kbd>w</kbd></td><td>나중에 보기</td><td><kbd>t</kbd></td><td>노트에 현재 시간 넣기</td></tr>
          <tr><td><kbd>n</kbd></td><td>재생목록 다음 영상</td><td><kbd>?</kbd></td><td>단축키 도움말</td></tr>
        </tbody></table>

        <h3 id="m-faq">9. 자주 묻는 질문</h3>
        <dl class="man-faq">
          <dt>노트·퀴즈 기록이 사라졌어요.</dt><dd>기록은 <b>지금 쓰는 기기의 지금 쓰는 브라우저</b>에만 저장됩니다. 다른 기기·브라우저·시크릿 창에서는 보이지 않고, 브라우저 방문 기록(쿠키·사이트 데이터)을 지우면 사라집니다. 같은 브라우저로 접속하고, 중요한 노트는 Word로 자주 내보내 두세요.</dd>
          <dt>화면이 예전 모습이에요.</dt><dd>브라우저가 예전 파일을 쓰는 경우입니다. <b>Cmd + Shift + R</b>(Windows: Ctrl + Shift + R)로 새로고침하세요.</dd>
          <dt>영상이 재생되지 않아요.</dt><dd>학교·기관 인터넷에서 YouTube가 막혀 있을 수 있습니다. <b>YouTube에서 보기 ↗</b>를 누르거나 다른 네트워크에서 시도하세요.</dd>
          <dt>내 정보가 서버로 가나요?</dt><dd>아니요. NurTube에는 로그인과 서버 저장이 없습니다. 노트·퀴즈·좋아요는 내 브라우저에만 남습니다.</dd>
        </dl>
      </section>

      <section class="man-part" id="part-prof">
        <h2 class="man-h2">2부 · 교수자용</h2>
        ${toc(PROF)}

        <h3 id="p-mode">1. 교수자 모드 켜기</h3>
        <ul>
          <li><b>설정 → 교수자 모드</b>를 켜고 교수자 비밀번호를 입력합니다. 왼쪽 메뉴에 <b>✏️ 영상 관리</b>가 나타납니다.</li>
          <li>비밀번호는 <b>NurTube 업데이트.command → 7번</b>에서 정하고 바꿉니다. 바꾸면 다른 브라우저의 교수자 모드도 다시 잠깁니다.</li>
          <li>이 비밀번호는 학생이 교수자 화면에 실수로 들어가지 않게 하는 잠금입니다. 실제 사이트 변경은 교수님 Mac과 GitHub 계정으로만 할 수 있습니다.</li>
        </ul>

        <h3 id="p-edit">2. 영상 추가·수정·숨기기</h3>
        <ol>
          <li><b>영상 관리 → 새 영상 추가</b>에 YouTube 주소를 붙여 넣고 <b>불러오기</b>(제목·채널 자동 입력).</li>
          <li>주제·수준·로드맵 주차·요약·추천 이유·토론 질문·답변 가이드(한 줄에 하나)를 적고 <b>저장하고 미리보기</b>.</li>
          <li>기존 영상은 <b>기존 영상 수정</b>이나 영상 페이지의 <b>✏️ 이 영상 수정</b>으로 고칩니다. <b>학생 화면에서 숨기기</b>, 주차 이동, <b>검수 완료</b> 표시도 할 수 있습니다.</li>
          <li>저장한 내용은 교수님 브라우저에서만 먼저 보입니다(<span class="badge-inline">미반영 편집</span>). 학생에게 반영하려면 <b>⬇ 반영 파일 내보내기</b> → <b>NurTube 업데이트.command → 1번</b>.</li>
          <li>반영이 끝나면 영상 관리에서 <b>반영 완료 · 변경 목록 비우기</b>를 누릅니다.</li>
        </ol>

        <h3 id="p-cand">3. 새 영상 찾기와 AI 초안</h3>
        <ol>
          <li>(최초 1회) <b>NurTube 업데이트.command → 5번 AI 설정</b>에서 Claude API 키를 등록합니다. 키는 macOS 키체인에만 저장됩니다.</li>
          <li><b>2번 새 영상 찾기</b>: 주제별 최근 영상을 찾아 반응 점수를 매기고, Claude가 요약·추천 이유·토론 질문·답변 가이드 초안과 '확인할 점'을 씁니다(5~15분, API 사용료 발생).</li>
          <li><b>영상 관리 → 🔎 추천 후보</b>에서 <b>검토 후 추가 / 교체 / 제외</b>를 고릅니다. 후보는 수업 적합도 높은 순이며, 적합도 '낮음'은 빨간 표시입니다.</li>
          <li>AI는 영상을 직접 보지 못하고 설명란·댓글만 보고 씁니다. <b>반드시 영상을 보며 확인·수정한 뒤 저장</b>하세요. 교체하면 기존 영상의 주차를 이어받으니 그 주차 퀴즈도 확인하세요.</li>
          <li>검색어와 후보 수는 <code>tools/discovery.json</code>에서 바꿀 수 있습니다.</li>
        </ol>

        <h3 id="p-tool">4. NurTube 업데이트.command 메뉴</h3>
        <table class="man-table"><thead><tr><th>번호</th><th>하는 일</th></tr></thead><tbody>
          <tr><td>1</td><td>영상 관리 변경사항 반영 + GitHub 업로드</td></tr>
          <tr><td>2</td><td>새 영상 찾기 + AI 초안 → 추천 후보</td></tr>
          <tr><td>3</td><td>학기 점검: 반응 재수집, 삭제·비공개 영상 점검 + 업로드</td></tr>
          <tr><td>4</td><td>내 컴퓨터에서 사이트 미리보기</td></tr>
          <tr><td>5</td><td>AI 설정 (Claude API 키 등록·연결 확인)</td></tr>
          <tr><td>6</td><td>GitHub 처음 연결 (이미 완료)</td></tr>
          <tr><td>7</td><td>교수자 모드 비밀번호 설정·변경</td></tr>
          <tr><td>8</td><td>끝내기</td></tr>
        </tbody></table>
        <p class="muted">업로드할 때마다 "GitHub에 올릴까요?"라고 물으며, Y를 누르면 1~2분 뒤 학생 화면에 반영됩니다.</p>

        <h3 id="p-term">5. 학기 점검과 관리 팁</h3>
        <ul>
          <li>학기 초에 <b>3번 학기 점검</b>을 실행하면 반응 점수를 다시 계산하고 삭제·비공개 영상을 자동으로 빼며, <code>tools/refresh-report.md</code>에 결과를 정리합니다.</li>
          <li>YouTube가 요청을 제한하면 자동으로 쉬었다 다시 시도하고, 실패가 많으면 기존 데이터를 그대로 두고 멈춥니다. 30분~1시간 뒤 다시 실행하세요.</li>
          <li>요약·답변 가이드·퀴즈는 영상 설명란과 댓글을 바탕으로 작성했습니다. 수업 전에 검수하고 <b>검수 완료</b>를 표시하면 학생 화면에 '✔ 교수 검수' 배지가 붙습니다.</li>
          <li>저장소가 공개(public)이므로 사이트 파일은 누구나 볼 수 있습니다. 학생 개인정보는 사이트에 저장되지 않습니다.</li>
        </ul>
      </section>
    </article>`;

  return { page };
})();
