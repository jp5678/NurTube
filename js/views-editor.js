// 교수자용 영상 관리: 추가 · 내용 수정 · 로드맵 주차 이동 · 숨기기 · 반영 파일 내보내기
window.NT = window.NT || {};

NT.editor = (() => {
  const { esc } = NT.views;
  const C = NT.catalog;
  const ID_RE = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})|^([\w-]{11})$/;
  const LIMITS = { t: 200, ch: 100, sum: 1200, why: 1200, q: 400, rx: 600, a: 600 };

  const parseId = (text) => {
    const m = String(text).trim().match(ID_RE);
    return m ? (m[1] || m[2]) : null;
  };

  const allVideos = () => [...NT.VIDEOS, ...(NT.HIDDEN_VIDEOS || [])];
  const findVideo = (id) => allVideos().find((v) => v.id === id);
  const weekOf = (id) => NT.ROADMAP.find((w) => w.ids.includes(id))?.week ?? 0;

  const options = (items, selected) => items.map(([v, t]) => `<option value="${v}" ${String(v) === String(selected) ? "selected" : ""}>${esc(t)}</option>`).join("");

  const aiBanner = (v) => (v.ai ? `
      <div class="ai-banner ${v.fit === "low" ? "warn" : ""}">
        <b>🤖 AI 초안입니다.</b> 영상 설명란과 시청자 댓글을 바탕으로 작성되어 영상 내용을 직접 보지 않았습니다.
        <b>영상을 시청하며 확인·수정한 뒤 저장</b>하세요. 수업 적합도: <b>${{ high: "높음", medium: "보통", low: "낮음" }[v.fit] || "-"}</b>
        ${v.caution ? `<p>🔍 확인할 점: ${esc(v.caution)}</p>` : ""}
      </div>` : "");

  const replaceBanner = (v) => (v.replaceOf ? `
      <div class="ai-banner">🔁 저장하면 기존 영상 <b>${esc(v.replaceOf.t)}</b>은 학생 화면에서 숨겨지고, 이 영상이 그 자리(${v.replaceOf.week ? `${v.replaceOf.week}주차` : "로드맵 밖"})를 이어받습니다.
        ${v.replaceOf.week ? `<p>📝 ${v.replaceOf.week}주차 확인 퀴즈가 새 영상 내용과 맞는지 확인하세요 (<code>js/data/quizzes.js</code>).</p>` : ""}</div>` : "");

  const form = (v, isNew) => `
    <form class="edit-form" data-id="${esc(v.id)}" data-new="${isNew ? 1 : 0}" data-replace="${esc(v.replaceOf?.id || "")}">
      ${aiBanner(v)}${replaceBanner(v)}
      <div class="edit-head">
        <img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" />
        <div><span class="badge-inline">${isNew ? "새 영상" : "기존 영상 수정"}</span>
          <p class="muted">YouTube ID: ${esc(v.id)} · <a href="https://www.youtube.com/watch?v=${esc(v.id)}" target="_blank" rel="noopener">YouTube에서 확인 ↗</a></p></div>
      </div>
      <div class="edit-grid">
        <label class="wide">제목<input name="t" value="${esc(v.t)}" maxlength="${LIMITS.t}" required /></label>
        <label>채널<input name="ch" value="${esc(v.ch)}" maxlength="${LIMITS.ch}" /></label>
        <label>주제<select name="topic">${options(NT.TOPICS.map((t) => [t.id, t.name]), v.topic)}</select></label>
        <label>수준<select name="lv">${options(Object.entries(NT.LEVELS), v.lv)}</select></label>
        <label>로드맵 주차<select name="week">${options([[0, "로드맵에 넣지 않음"], ...NT.ROADMAP.map((w) => [w.week, `${w.week}주차 · ${w.title}`])], v.week ?? weekOf(v.id))}</select></label>
        <label class="wide">📌 영상 요약<textarea name="sum" rows="3" maxlength="${LIMITS.sum}" required>${esc(v.sum)}</textarea></label>
        <label class="wide">⭐ 추천 이유<textarea name="why" rows="3" maxlength="${LIMITS.why}" required>${esc(v.why)}</textarea></label>
        <label class="wide">🗣 토론 질문<input name="q" value="${esc(v.q)}" maxlength="${LIMITS.q}" required /></label>
        <label class="wide">💡 답변 가이드 <small>한 줄에 한 항목</small><textarea name="a" rows="5">${esc((v.a || []).join("\n"))}</textarea></label>
        <label class="wide">💬 반응 요약 <small>비워 두면 업데이트 때 기본 문구</small><textarea name="rx" rows="2" maxlength="${LIMITS.rx}">${esc(v.pending ? "" : v.rx || "")}</textarea></label>
      </div>
      <div class="hero-links">
        <button class="btn primary" data-act="edit-save">💾 저장하고 미리보기</button>
        ${isNew ? "" : `<button class="btn" data-act="edit-hide">${NT.HIDDEN_VIDEOS?.some((h) => h.id === v.id) ? "👁 다시 보이기" : "🙈 학생 화면에서 숨기기"}</button>`}
        <a class="btn" href="#/edit">취소</a>
      </div>
    </form>`;

  const changeList = (state) => {
    const e = state.edits;
    const rows = [
      ...Object.values(e.videos).map((v) => ({ id: v.id, label: findVideo(v.id)?.pending ? "추가" : "수정", t: v.t })),
      ...e.hidden.filter((id) => !e.videos[id]).map((id) => ({ id, label: "숨김", t: findVideo(id)?.t || id })),
      ...e.unhidden.filter((id) => !e.videos[id]).map((id) => ({ id, label: "다시 보이기", t: findVideo(id)?.t || id })),
      ...Object.keys(e.weeks).filter((id) => !e.videos[id]).map((id) => ({ id, label: "주차 이동", t: findVideo(id)?.t || id })),
      ...(e.excluded || []).map((id) => ({ id, label: "후보 제외", t: NT.CANDIDATES?.items.find((c) => c.id === id)?.t || id })),
    ];
    const reviews = state.reviews.length;
    return `
      <section class="lms">
        <h2>📦 학생들에게 반영할 변경 (${rows.length}건${reviews ? ` · 검수 표시 ${reviews}편` : ""})</h2>
        ${rows.length ? `<ul class="change-list">${rows.map((r) => `<li><span class="badge-inline">${r.label}</span>
          <a href="#/edit/${esc(r.id)}">${esc(r.t)}</a> <button class="btn small" data-act="edit-discard" data-id="${esc(r.id)}">되돌리기</button></li>`).join("")}</ul>`
          : '<p class="muted">아직 변경이 없습니다. 위에서 영상을 추가하거나 기존 영상을 수정하세요.</p>'}
        <ol class="lms-steps">
          <li><b>반영 파일 내보내기</b>를 누르면 다운로드 폴더에 <code>nurtube-update-날짜.json</code>이 저장됩니다.</li>
          <li>NurTube 폴더의 <b>NurTube 업데이트.command</b>를 더블클릭하고 <b>1번</b>을 고릅니다.</li>
          <li>반응 점수 계산 → 사이트 데이터 갱신 → GitHub 업로드가 자동으로 진행됩니다. 1~2분 뒤 학생 화면에 반영됩니다.</li>
        </ol>
        <div class="hero-links">
          <button class="btn primary" data-act="edit-export" ${rows.length || reviews ? "" : "disabled"}>⬇ 반영 파일 내보내기</button>
          <button class="btn" data-act="edit-clear" ${rows.length || reviews ? "" : "disabled"}>반영 완료 · 변경 목록 비우기</button>
        </div>
      </section>`;
  };

  const candidateSection = (state) => {
    const data = NT.CANDIDATES || { items: [] };
    const skip = new Set([...Object.keys(state.edits.videos), ...(state.edits.excluded || []), ...allVideos().map((v) => v.id)]);
    const items = data.items.filter((c) => !skip.has(c.id));
    const topicName = (id) => C.topic(id)?.name || id;
    return `
      <section class="lms">
        <h2>🔎 추천 후보 ${items.length ? `(${items.length}편)` : ""}</h2>
        <p class="muted">${data.generatedAt
          ? `${data.generatedAt.replace("T", " ")} 기준 · 주제별 최근 영상을 찾아 반응 점수를 매기고 기존 영상과 비교했습니다${data.ai ? " · 🤖 AI 초안 포함" : ""}.`
          : "아직 찾은 후보가 없습니다."}
          새로 찾으려면 <b>NurTube 업데이트.command → 2번 '새 영상 찾기'</b>를 실행하세요.</p>
        ${items.length ? `<div class="cand-list">${items.map((c) => {
          const d = c.draft && !c.draft.error ? c.draft : null;
          const diff = c.compare ? c.score - c.compare.score : null;
          return `<article class="cand">
            <a class="cand-thumb" href="https://www.youtube.com/watch?v=${esc(c.id)}" target="_blank" rel="noopener">
              <img loading="lazy" src="https://i.ytimg.com/vi/${esc(c.id)}/mqdefault.jpg" alt="" /><span class="dur">${esc(c.dur)}</span></a>
            <div class="cand-body">
              <div class="chips"><span class="chip" style="--c:${C.topic(c.topic)?.color || "#888"}">${esc(topicName(c.topic))}</span>
                <span class="badge-inline">반응 ${c.score}</span><span class="badge-inline">${c.mo < 1 ? "이번 달" : `${c.mo}개월 전`}</span>
                <span class="badge-inline">${NT.views.KV_LABEL[c.kv] || "EN"}</span>
                ${d ? `<span class="badge-inline ai ${d.fit === "low" ? "warn" : ""}">🤖 AI 초안 · 적합도 ${{ high: "높음", medium: "보통", low: "낮음" }[d.fit]}</span>` : ""}</div>
              <h3><a href="https://www.youtube.com/watch?v=${esc(c.id)}" target="_blank" rel="noopener">${esc(c.t)}</a></h3>
              <p class="muted">${esc(c.ch)} · 조회 ${NT.views.fmtViews(c.views)} · 좋아요 ${c.likes.toLocaleString("ko-KR")}</p>
              ${d ? `<p>${esc(d.sum)}</p>` : c.draft?.error ? `<p class="muted">AI 초안 실패: ${esc(c.draft.error)}</p>` : ""}
              ${c.compare ? `<p class="cmp">같은 주제 최저점 기존 영상 <b>${esc(c.compare.t.slice(0, 40))}</b>(${c.compare.score}점)보다 <b>${diff >= 0 ? "+" : ""}${diff}점</b></p>` : ""}
              <div class="hero-links">
                <button class="btn primary small" data-act="cand-add" data-id="${esc(c.id)}">➕ 검토 후 추가</button>
                ${c.replace ? `<button class="btn small" data-act="cand-replace" data-id="${esc(c.id)}">🔁 '${esc(c.replace.t.slice(0, 18))}…'과 교체</button>` : ""}
                <button class="btn small" data-act="cand-exclude" data-id="${esc(c.id)}">제외</button>
              </div>
            </div></article>`;
        }).join("")}</div>` : ""}
      </section>`;
  };

  const page = (arg, state) => {
    if (!state.settings.prof) {
      return `<p class="empty">교수자 모드에서만 사용할 수 있습니다. <a href="#/settings">설정에서 교수자 모드 켜기</a></p>`;
    }
    const editing = arg && (findVideo(arg) || (state.edits.videos[arg] && { ...state.edits.videos[arg] }));
    const draftNew = NT.editor.draft?.id === arg ? NT.editor.draft : null;
    const target = editing || draftNew;
    return `
      <header class="page-head"><h1>✏️ 영상 관리</h1>
        <p>영상을 추가하거나 요약·추천 이유·토론 질문·답변 가이드를 고칠 수 있습니다. 저장하면 이 브라우저에서 바로 미리 볼 수 있고,
          <b>반영 파일 내보내기 → NurTube 업데이트.command 더블클릭</b>으로 학생들에게 반영됩니다.</p></header>
      ${target ? form(target, !findVideo(target.id) || findVideo(target.id)?.pending) : `
      <section class="lms">
        <h2>➕ 새 영상 추가</h2>
        <div class="edit-add"><input id="edit-url" placeholder="YouTube 주소를 붙여 넣으세요 (예: https://www.youtube.com/watch?v=...)" />
          <button class="btn primary" data-act="edit-fetch">불러오기</button></div>
        <h2 class="settings-h">✍️ 기존 영상 수정</h2>
        <div class="edit-add"><select id="edit-pick"><option value="">영상을 고르세요 (${allVideos().length}편)</option>
          ${[...allVideos()].sort((a, b) => a.t.localeCompare(b.t, "ko")).map((v) => `<option value="${esc(v.id)}">${esc(v.t.slice(0, 70))}${NT.HIDDEN_VIDEOS?.some((h) => h.id === v.id) ? " (숨김)" : ""}</option>`).join("")}</select>
          <button class="btn" data-act="edit-open">수정하기</button></div>
      </section>
      ${candidateSection(state)}`}
      ${changeList(state)}`;
  };

  // ── 동작
  const readForm = (formEl) => {
    const f = new FormData(formEl);
    const val = (k) => String(f.get(k) || "").trim().slice(0, LIMITS[k] || 2000);
    return {
      id: formEl.dataset.id, t: val("t"), ch: val("ch"), topic: val("topic"), lv: Number(f.get("lv")) || 1,
      sum: val("sum"), why: val("why"), q: val("q"), rx: val("rx"),
      a: String(f.get("a") || "").split(/\r?\n/).map((x) => x.trim().slice(0, LIMITS.a)).filter(Boolean),
      week: Number(f.get("week")) || 0,
    };
  };

  const candidate = (id) => NT.CANDIDATES?.items.find((c) => c.id === id);

  const fromCandidate = (c, replace) => {
    const d = c.draft && !c.draft.error ? c.draft : {};
    return {
      id: c.id, t: c.t, ch: c.ch, topic: d.topic || c.topic, lv: d.lv || 1,
      sum: d.sum || "", why: d.why || "", q: d.q || "", a: d.a || [], rx: d.rx || "",
      week: replace ? c.replace.week : d.week ?? 0, ai: Boolean(d.sum), fit: d.fit, caution: d.caution,
      replaceOf: replace ? c.replace : null,
    };
  };

  const actions = (ctx) => ({
    "cand-add": (el) => { NT.editor.draft = fromCandidate(candidate(el.dataset.id), false); location.hash = `#/edit/${el.dataset.id}`; ctx.render(); },
    "cand-replace": (el) => { NT.editor.draft = fromCandidate(candidate(el.dataset.id), true); location.hash = `#/edit/${el.dataset.id}`; ctx.render(); },
    "cand-exclude": (el) => { NT.store.excludeCandidate(el.dataset.id); ctx.render(); },
    "edit-fetch": async () => {
      const id = parseId(document.getElementById("edit-url")?.value);
      if (!id) { alert("YouTube 주소에서 영상 ID를 찾지 못했습니다. 주소를 다시 확인해 주세요."); return; }
      if (findVideo(id)) { location.hash = `#/edit/${id}`; return; }
      try {
        const res = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const meta = await res.json();
        NT.editor.draft = { id, t: meta.title || "", ch: meta.author_name || "", topic: NT.TOPICS[0].id, lv: 1, sum: "", why: "", q: "", a: [] };
      } catch (err) {
        console.warn("[NurTube] 영상 정보를 불러오지 못했습니다.", err);
        if (!confirm("영상 정보를 자동으로 불러오지 못했습니다(비공개·삭제 영상이거나 네트워크 문제). 제목을 직접 입력할까요?")) return;
        NT.editor.draft = { id, t: "", ch: "", topic: NT.TOPICS[0].id, lv: 1, sum: "", why: "", q: "", a: [] };
      }
      location.hash = `#/edit/${id}`;
      ctx.render();
    },
    "edit-open": () => {
      const id = document.getElementById("edit-pick")?.value;
      if (id) location.hash = `#/edit/${id}`;
    },
    "edit-save": () => {
      const formEl = document.querySelector("form.edit-form");
      if (!formEl.reportValidity()) return;
      const { week, ...video } = readForm(formEl);
      if (!video.a.length) { alert("답변 가이드를 한 줄 이상 적어 주세요."); return; }
      const before = weekOf(video.id);
      NT.store.saveEdit(video, week !== before ? week : undefined);
      if (formEl.dataset.replace) NT.store.setHidden(formEl.dataset.replace, true); // 교체: 기존 영상 숨김
      NT.editor.draft = null;
      location.hash = `#/watch/${video.id}`;
      location.reload(); // 변경을 목록·로드맵에 다시 적용
    },
    "edit-hide": () => {
      const id = document.querySelector("form.edit-form")?.dataset.id;
      const isHidden = NT.HIDDEN_VIDEOS?.some((h) => h.id === id);
      if (!isHidden && !confirm("이 영상을 학생 화면에서 숨길까요? (언제든 다시 보이게 할 수 있습니다)")) return;
      NT.store.setHidden(id, !isHidden);
      location.hash = "#/edit";
      location.reload();
    },
    "edit-discard": (el) => {
      NT.store.discardEdit(el.dataset.id);
      location.reload();
    },
    "edit-export": () => {
      const s = NT.store.get();
      const payload = { app: "NurTube", version: 1, exportedAt: new Date().toISOString(), ...s.edits, reviewed: s.reviews };
      ctx.download(`nurtube-update-${new Date().toISOString().slice(0, 10)}.json`,
        new Blob([JSON.stringify(payload, null, 1)], { type: "application/json" }));
    },
    "edit-clear": () => {
      if (!confirm("업데이트를 실행해 학생 화면에 반영한 뒤 비우세요. 변경 목록과 검수 표시를 모두 비울까요?")) return;
      NT.store.clearEdits();
      location.reload();
    },
  });

  return { page, actions, parseId, draft: null };
})();
