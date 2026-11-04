// YouTube 플레이어 제어(현재 시간·이동)와 노트 속 [12:34] 시간 표시 처리
window.NT = window.NT || {};

NT.stamps = (() => {
  const STAMP = /\[(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\]/g;

  const fmt = (sec) => {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const pad = (n) => String(n).padStart(2, "0");
    return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
  };

  const toSec = (h, m, s) => (Number(h || 0) * 3600) + Number(m) * 60 + Number(s);

  /** @returns {{label: string, sec: number}[]} */
  const parse = (text) => [...String(text).matchAll(STAMP)].map((x) => ({ label: x[0].slice(1, -1), sec: toSec(x[1], x[2], x[3]) }));

  const url = (videoId, sec) => `https://www.youtube.com/watch?v=${videoId}&t=${sec}s`;

  // 이미 이스케이프된 HTML에서 [mm:ss]를 링크로 바꾼다
  const linkify = (escapedHtml, videoId) => escapedHtml.replace(STAMP, (all, h, m, s) => {
    const sec = toSec(h, m, s);
    return `<a class="ts" href="${url(videoId, sec)}" data-seek="${sec}" target="_blank" rel="noopener">${all}</a>`;
  });

  return { fmt, parse, url, linkify };
})();

NT.player = (() => {
  const API_SRC = "https://www.youtube.com/iframe_api";
  let apiReady = null;
  let current = null;
  let lastBase = null; // 마지막으로 연 영상의 자막 언어('한국어 자막으로 바꾸기' 버튼용)

  const loadApi = () => {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!apiReady) {
      apiReady = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
        const s = Object.assign(document.createElement("script"), { src: API_SRC, async: true });
        s.onerror = () => { apiReady = null; reject(new Error("YouTube 플레이어 API를 불러오지 못했습니다.")); };
        document.head.appendChild(s);
      });
    }
    return apiReady;
  };

  // 한국어 자막: 한국어 트랙이 있으면 그것을, 없으면 있는 자막(주로 영어)을 한국어 자동 번역으로 바꾼다.
  // 자막 모듈은 재생이 시작돼야 불러와지므로 onApiChange에서 처리한다.
  const applyKorean = (player, baseLang) => {
    const tracks = player.getOption?.("captions", "tracklist") || [];
    if (!tracks.length) {
      // 임베드 플레이어는 자막을 켜기 전까지 목록을 비워 두는 경우가 많다 → 수집 때 기록한 자막 언어로 바로 지정
      if (!baseLang) return false;
      player.setOption("captions", "track", baseLang.startsWith("ko")
        ? { languageCode: baseLang }
        : { languageCode: baseLang, translationLanguage: { languageCode: "ko", languageName: "한국어" } });
      return true;
    }
    const ko = tracks.find((t) => t.languageCode?.startsWith("ko") && t.kind !== "asr") || tracks.find((t) => t.languageCode?.startsWith("ko"));
    if (ko) {
      player.setOption("captions", "track", { languageCode: ko.languageCode });
      return true;
    }
    const base = tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr")
      || tracks.find((t) => t.languageCode?.startsWith("en")) || tracks[0];
    player.setOption("captions", "track", { languageCode: base.languageCode, translationLanguage: { languageCode: "ko", languageName: "한국어" } });
    return true;
  };

  /** 영상 페이지가 그려질 때마다 호출. iframe에 enablejsapi=1이 있어야 한다. */
  const mount = async (iframe, { koreanSubs = false, baseLang = null } = {}) => {
    current = null;
    if (!iframe) return;
    try {
      const YT = await loadApi();
      if (!document.body.contains(iframe)) return; // 그새 다른 화면으로 이동
      let applied = false;
      const tryKorean = (player) => {
        if (!koreanSubs || applied) return;
        try { applied = applyKorean(player, baseLang); } catch (err) { console.warn("[NurTube] 한국어 자막 전환 실패", err); }
      };
      lastBase = baseLang;
      current = new YT.Player(iframe, {
        events: {
          onApiChange: (e) => tryKorean(e.target),
          // 자막 모듈이 늦게 준비되는 경우: 재생이 시작되면 잠시 뒤 한 번 더 시도
          onStateChange: (e) => {
            if (e.data !== 1 || applied) return; // 1 = 재생 중
            [800, 2500].forEach((ms) => setTimeout(() => { applied = false; tryKorean(e.target); }, ms));
          },
        },
      });
    } catch (err) {
      console.warn("[NurTube] 플레이어 제어를 사용할 수 없습니다.", err);
    }
  };

  /** '한국어 자막으로 바꾸기' 버튼: 자막을 켜고 한국어(또는 한국어 자동 번역)로 바꾼다 */
  const koreanNow = () => {
    if (!current?.setOption) return false;
    try {
      current.loadModule?.("captions");
      return applyKorean(current, lastBase);
    } catch (err) {
      console.warn("[NurTube] 한국어 자막 전환 실패", err);
      return false;
    }
  };

  const captionTrack = () => {
    try { return current?.getOption?.("captions", "track") || null; } catch { return null; }
  };

  const time = () => {
    try { return typeof current?.getCurrentTime === "function" ? current.getCurrentTime() : null; } catch { return null; }
  };

  const seek = (sec) => {
    if (typeof current?.seekTo !== "function") return false;
    current.seekTo(sec, true);
    current.playVideo?.();
    return true;
  };

  return { mount, time, seek, koreanNow, captionTrack };
})();
