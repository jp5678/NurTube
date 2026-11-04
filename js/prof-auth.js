// 교수자 모드 비밀번호 확인 (store.js 다음, overlay.js 전에 실행)
// 서버가 없는 정적 사이트라 실제 보안 장치가 아니라 학생이 교수자 화면에 실수로 들어가지 않게 하는 잠금이다.
window.NT = window.NT || {};

NT.profAuth = (() => {
  const conf = NT.PROF && NT.PROF.hash ? NT.PROF : null;
  const MAX_TRIES = 5;
  const LOCK_MS = 30000;
  let fails = 0;
  let lockedUntil = 0;

  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const bytes = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));

  const derive = async (password) => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: bytes(conf.salt), iterations: conf.iterations, hash: "SHA-256" }, key, 256);
    return hex(bits);
  };

  /** @returns {Promise<"ok"|"wrong"|"locked"|"unsupported">} */
  const verify = async (password) => {
    if (!conf) return "ok";
    if (Date.now() < lockedUntil) return "locked";
    if (!window.crypto?.subtle) return "unsupported"; // file:// 등 보안 컨텍스트가 아닌 경우
    const ok = (await derive(password)) === conf.hash;
    if (ok) { fails = 0; return "ok"; }
    fails += 1;
    if (fails >= MAX_TRIES) { fails = 0; lockedUntil = Date.now() + LOCK_MS; }
    return "wrong";
  };

  // 비밀번호가 바뀌었거나 확인 없이 켜진 교수자 모드는 끈다
  const s = NT.store.get();
  if (conf && s.settings.prof && s.settings.profAuth !== conf.hash) NT.store.setSetting("prof", false);

  return { required: Boolean(conf), verify, stamp: () => conf?.hash || "" };
})();
