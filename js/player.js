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

  /** 영상 페이지가 그려질 때마다 호출. iframe에 enablejsapi=1이 있어야 한다. */
  const mount = async (iframe) => {
    current = null;
    if (!iframe) return;
    try {
      const YT = await loadApi();
      if (!document.body.contains(iframe)) return; // 그새 다른 화면으로 이동
      current = new YT.Player(iframe);
    } catch (err) {
      console.warn("[NurTube] 플레이어 제어를 사용할 수 없습니다.", err);
    }
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

  return { mount, time, seek };
})();
