// 라우터 · 이벤트 · 단축키
(() => {
  const { store, catalog: C, views: V, pages: P } = NT;
  const main = document.getElementById("main");
  const searchInput = document.getElementById("q");
  const SEARCH_DEBOUNCE_MS = 250;

  let filters = Object.freeze({ lang: "all", level: "all", length: "all", sort: "keep" });
  let cursor = -1;

  const parseHash = () => {
    const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
    const parts = path.split("/").filter(Boolean);
    return { name: parts[0] || "home", arg: decodeURIComponent(parts[1] || ""), params: new URLSearchParams(query) };
  };

  const notFound = () => `<p class="empty">페이지를 찾을 수 없습니다. <a href="#/">홈으로</a></p>`;

  const ROUTES = {
    home: (s) => V.home(s, filters),
    topics: () => V.topics(),
    topic: (s, { arg }) => {
      const t = C.topic(arg);
      return t ? V.listPage(t.name, NT.AREAS.find((a) => a.id === t.area).desc, C.byTopic(arg), s, filters) : notFound();
    },
    playlists: () => V.playlists(),
    playlist: (s, { arg }) => {
      const p = NT.PLAYLISTS.find((x) => x.id === arg);
      return p ? V.listPage(p.title, p.desc, C.resolve(C.playlistIds(p)), s, null, p.id) : notFound();
    },
    roadmap: (s) => V.roadmap(s),
    watch: (s, { arg, params }) => {
      const v = C.get(arg);
      if (!v) return notFound();
      store.addHistory(v.id);
      document.title = `${v.t} - NurTube`;
      return P.watch(v, store.get(), params.get("list"));
    },
    search: (s, { params }) => {
      const q = params.get("q") || "";
      const results = C.search(q);
      return V.listPage(`'${q}' 검색 결과 ${results.length}건`, results.length ? "" : "다른 단어나 주제어(예: 표준, 기록, ChatGPT, 윤리)로 검색해 보세요.", results, s, filters);
    },
    liked: (s) => V.listPage("좋아요", "좋아요한 영상은 홈 추천에 반영됩니다.", C.resolve(s.liked), s),
    later: (s) => V.listPage("나중에 보기", "", C.resolve(s.later), s),
    history: (s) => V.listPage("시청 기록", "", C.resolve(s.history.map((h) => h.id)), s),
    trends: () => P.trends(),
    resources: () => P.resources(),
    notes: (s) => P.notes(s),
    quiz: (s, { arg }) => NT.quizView.page(Number(arg), s),
    edit: (s, { arg }) => NT.editor.page(arg, s),
    settings: (s) => P.settings(s),
    about: () => P.about(),
  };

  const render = () => {
    const route = parseHash();
    const view = ROUTES[route.name] || notFound;
    document.title = "NurTube - 간호학생 AI·정보학 영상 큐레이션";
    try {
      main.innerHTML = view(store.get(), route);
    } catch (err) {
      console.error("[NurTube] 화면을 그리는 중 오류", err);
      main.innerHTML = `<p class="empty">화면을 불러오지 못했습니다. 새로고침해 주세요.</p>`;
    }
    main.classList.toggle("watch-layout", route.name === "watch");
    if (route.name === "watch") NT.player.mount(document.getElementById("yt-player"));
    document.getElementById("nav-edit").hidden = !store.get().settings.prof;
    document.querySelectorAll(".nav a").forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === `#/${route.name === "home" ? "" : route.name}`));
    if (route.name !== "search") searchInput.value = "";
    cursor = -1;
    document.body.classList.remove("nav-open");
    if (route.name !== "search") window.scrollTo(0, 0);
  };

  const applyTheme = () => {
    const { theme } = store.get().settings;
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  };

  const download = (filename, content) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  };

  const rerenderWatchActions = () => {
    const { name, arg } = parseHash();
    if (name !== "watch") return render();
    const actions = main.querySelector(".actions");
    const liked = store.isLiked(arg);
    const later = store.isLater(arg);
    const [likeBtn, laterBtn] = actions.querySelectorAll("button");
    likeBtn.classList.toggle("on", liked);
    likeBtn.textContent = liked ? "♥ 좋아요함" : "♡ 좋아요";
    likeBtn.setAttribute("aria-pressed", liked);
    laterBtn.classList.toggle("on", later);
    laterBtn.textContent = later ? "✓ 나중에 볼 목록" : "⏱ 나중에 보기";
    laterBtn.setAttribute("aria-pressed", later);
  };

  const ACTIONS = {
    like: () => { store.toggleLike(parseHash().arg); rerenderWatchActions(); },
    later: () => { store.toggleLater(parseHash().arg); rerenderWatchActions(); },
    export: () => download(`nurtube-notes-${today()}.md`, P.exportNotes(store.get())),
    "export-docx": async () => {
      const s = store.get();
      if (!s.student.name.trim() || !s.student.id.trim()) {
        alert("LMS 제출용 파일에는 이름과 학번이 필요합니다. 위의 '제출자 정보'를 먼저 입력해 주세요.");
        document.querySelector('[data-student="name"]')?.focus();
        return;
      }
      try {
        const blob = await NT.docx.build(P.noteEntries(s), { student: s.student, progress: NT.quizView.progress(s) });
        const safe = (x) => x.trim().replace(/[\\/:*?"<>|\s]+/g, "_");
        download(`NurTube_학습노트_${safe(s.student.id)}_${safe(s.student.name)}_${today()}.docx`, blob);
      } catch (err) {
        console.error("[NurTube] docx 내보내기 실패", err);
        alert("Word 파일을 만들지 못했습니다. 새로고침 후 다시 시도하거나 Markdown으로 내보내 주세요.");
      }
    },
    stamp: () => insertStamp(),
    "export-reviews": () => {
      const s = store.get();
      const ids = [...new Set([...NT.VIDEOS.filter((v) => v.rv).map((v) => v.id), ...s.reviews])];
      download("reviewed.json", new Blob([JSON.stringify({ reviewed: ids, exportedAt: new Date().toISOString() }, null, 1)], { type: "application/json" }));
    },
    "quiz-submit": () => {
      const week = Number(parseHash().arg);
      const result = NT.quizView.grade(week, main.querySelector("form.quiz"));
      if (!result) return;
      store.saveQuiz(week, result);
      render();
      main.querySelector(".quiz-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    "quiz-retry": () => { NT.quizView.reset(Number(parseHash().arg)); render(); },
    "clear-history": () => { if (confirm("시청 기록을 모두 삭제할까요?")) { store.clearHistory(); render(); } },
    help: () => { closeModal(); document.body.insertAdjacentHTML("beforeend", P.help()); },
    "close-modal": () => closeModal(),
    menu: () => document.body.classList.toggle("nav-open"),
  };

  Object.assign(ACTIONS, NT.editor.actions({ render, download }));

  const closeModal = () => document.querySelector(".modal")?.remove();

  const openProfLogin = () => {
    closeModal();
    document.body.insertAdjacentHTML("beforeend", P.profLogin());
    document.getElementById("prof-pw").focus();
  };

  document.addEventListener("submit", async (e) => {
    if (!e.target.matches(".prof-form")) return;
    e.preventDefault();
    const input = document.getElementById("prof-pw");
    const msg = document.getElementById("prof-msg");
    msg.textContent = "확인 중…";
    const result = await NT.profAuth.verify(input.value);
    if (result === "ok") {
      store.setSetting("prof", true);
      store.setSetting("profAuth", NT.profAuth.stamp());
      location.reload();
      return;
    }
    input.value = "";
    input.focus();
    msg.textContent = {
      wrong: "비밀번호가 맞지 않습니다.",
      locked: "여러 번 틀려 30초 동안 잠겼습니다. 잠시 뒤 다시 시도하세요.",
      unsupported: "이 화면에서는 확인할 수 없습니다. https 주소나 미리보기(localhost)로 열어 주세요.",
    }[result];
  });

  // 학습노트에 현재 재생 위치를 [m:ss] 형식으로 넣는다
  const insertStamp = () => {
    const box = document.getElementById("note");
    if (!box) return;
    const sec = NT.player.time();
    if (sec == null) { alert("영상이 아직 준비되지 않았습니다. 영상을 재생한 뒤 다시 눌러 주세요."); return; }
    const tag = `[${NT.stamps.fmt(sec)}] `;
    const at = box.selectionStart ?? box.value.length;
    const before = box.value.slice(0, at);
    const lead = before && !before.endsWith("\n") ? "\n" : "";
    box.value = before + lead + tag + box.value.slice(at);
    box.focus();
    box.selectionStart = box.selectionEnd = at + lead.length + tag.length;
    saveNote(box);
  };

  const refreshStamps = (box) => {
    const list = document.getElementById("stamp-list");
    if (list) list.innerHTML = P.stampList(C.get(box.dataset.note), box.value);
  };

  let noteTimer;
  const saveNote = (box) => {
    clearTimeout(noteTimer);
    refreshStamps(box);
    const { note } = box.dataset;
    const text = box.value;
    noteTimer = setTimeout(() => store.setNote(note, text), 400);
  };
  const today = () => new Date().toISOString().slice(0, 10);

  document.addEventListener("click", (e) => {
    const seekEl = e.target.closest("[data-seek]");
    if (seekEl && parseHash().name === "watch" && NT.player.seek(Number(seekEl.dataset.seek))) {
      e.preventDefault();
      document.querySelector(".player")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const el = e.target.closest("[data-act]");
    if (el?.matches("input")) return; // 체크박스 동작은 change 이벤트에서 처리
    if (el && ACTIONS[el.dataset.act]) { e.preventDefault(); ACTIONS[el.dataset.act](el); return; }
    if (e.target.classList.contains("modal")) closeModal();
  });

  document.addEventListener("change", (e) => {
    const { filter, setting } = e.target.dataset;
    if (filter) { filters = Object.freeze({ ...filters, [filter]: e.target.value }); render(); }
    if (setting === "prof") {
      if (e.target.checked && NT.profAuth.required) {
        e.target.checked = false; // 비밀번호 확인 후에 켠다
        openProfLogin();
        return;
      }
      store.setSetting("prof", e.target.checked);
      store.setSetting("profAuth", e.target.checked ? NT.profAuth.stamp() : "");
      location.reload();
      return;
    }
    if (setting) {
      store.setSetting(setting, e.target.type === "checkbox" ? e.target.checked : e.target.value);
      applyTheme();
      if (setting === "koSubs") render();
      if (setting === "prof") location.reload(); // 교수자 편집 미리보기를 켜고 끄기
    }
    if (e.target.dataset.act === "review") store.toggleReview(parseHash().arg);
  });

  document.addEventListener("input", (e) => {
    if (e.target.dataset.note) saveNote(e.target);
    if (e.target.dataset.student) store.setStudent(e.target.dataset.student, e.target.value);
  });

  let searchTimer;
  const goSearch = (q, replace) => {
    const target = q.trim() ? `#/search?q=${encodeURIComponent(q.trim())}` : "#/";
    if (replace && location.hash.startsWith("#/search")) history.replaceState(null, "", target), render();
    else location.hash = target;
  };
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      // 다른 화면으로 이동한 뒤에는 지연된 검색이 화면을 되돌리지 않도록 한다
      if (document.activeElement === searchInput) goSearch(searchInput.value, true);
    }, SEARCH_DEBOUNCE_MS);
  });
  window.addEventListener("hashchange", () => {
    if (!location.hash.startsWith("#/search")) clearTimeout(searchTimer);
  });
  document.getElementById("search").addEventListener("submit", (e) => { e.preventDefault(); goSearch(searchInput.value, false); });

  const moveCursor = (delta) => {
    const cards = [...main.querySelectorAll(".card")];
    if (!cards.length) return;
    cursor = Math.max(0, Math.min(cards.length - 1, cursor + delta));
    cards.forEach((c, i) => c.classList.toggle("focused", i === cursor));
    cards[cursor].scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  let pendingG = false;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeModal(); searchInput.blur(); return; }
    if (e.target.matches("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
    const onWatch = parseHash().name === "watch";
    const key = e.key;
    if (pendingG) { pendingG = false; if (key === "h") { location.hash = "#/"; return; } }
    const handlers = {
      "/": () => searchInput.focus(),
      "?": () => ACTIONS.help(),
      j: () => moveCursor(1),
      k: () => moveCursor(-1),
      Enter: cursor >= 0 ? () => main.querySelectorAll(".card")[cursor]?.querySelector("a").click() : null,
      l: () => onWatch && ACTIONS.like(),
      w: () => onWatch && ACTIONS.later(),
      t: () => onWatch && insertStamp(),
      n: () => main.querySelector(".pl-nav .btn.primary")?.click(),
      g: () => { pendingG = true; },
    };
    if (handlers[key]) { e.preventDefault(); handlers[key](); }
  });

  window.addEventListener("hashchange", render);
  applyTheme();
  render();
})();
