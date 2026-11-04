"""metrics.json(자동 측정) + curated.json(교수자 큐레이션) → js/data/videos.js

사용:  python3 tools/build_data.py tools/metrics.json
- 반응 점수 = 자동 점수(analyze.py) + 교수자 보정(adj, 댓글을 직접 읽고 판단)
- 댓글 원문은 사이트에 싣지 않는다(요약 rx만 사용).
"""
import datetime
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today()  # 수집 기준일(빌드한 날)
HANGUL = re.compile(r"[가-힣]")


def months_ago(date_str):
    try:
        d = datetime.date.fromisoformat(date_str)
    except ValueError:
        return 0
    return max(0, (TODAY.year - d.year) * 12 + TODAY.month - d.month)


def duration(secs):
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def load_details():
    """tools/details/*.json: 영상별 상세 요약(sum)·추천 이유(why)·토론 질문 해설(a)."""
    folder = os.path.join(ROOT, "tools", "details")
    merged = {}
    for name in sorted(os.listdir(folder)):
        if name.endswith(".json"):
            merged.update(json.load(open(os.path.join(folder, name), encoding="utf-8")))
    return merged


def korean_view(m, lang):
    """한국어 시청 방법: audio(한국어 음성) · sub(한글 자막) · auto(자동 번역 자막) · none"""
    cap = m.get("captions") or {}
    if lang == "ko":
        return "audio"
    if cap.get("koManual"):
        return "sub"
    return "auto" if cap.get("translate") else "none"


def caption_lang(m):
    """자막 트랙 언어(한국어 우선, 다음 영어). 플레이어가 한국어 자막·자동 번역을 켤 때 쓴다."""
    tracks = (m.get("captions") or {}).get("tracks") or []
    for prefix in ("ko", "en"):
        hit = next((t for t in tracks if t.startswith(prefix)), None)
        if hit:
            return hit
    return tracks[0] if tracks else None


def is_available(m):
    return m.get("status", "OK") == "OK" and m.get("embed") is not False


def load_reviewed():
    """tools/reviewed.json: 교수자가 검수한 영상 id 목록 (사이트 '교수자 모드'에서 내보낸 파일)."""
    path = os.path.join(ROOT, "tools", "reviewed.json")
    if not os.path.exists(path):
        return set()
    data = json.load(open(path, encoding="utf-8"))
    return set(data.get("reviewed", data) if isinstance(data, dict) else data)


def load_overrides():
    """tools/overrides.json: 숨긴 영상(hidden)과 로드맵 주차 이동(weeks: {id: 주차, 0이면 로드맵에서 뺌})."""
    path = os.path.join(ROOT, "tools", "overrides.json")
    data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    return {"hidden": sorted(set(data.get("hidden", []))), "weeks": {k: int(v) for k, v in data.get("weeks", {}).items()}}


def write_overrides(overrides):
    out = os.path.join(ROOT, "js", "data", "overrides.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// 자동 생성 파일: tools/build_data.py 가 tools/overrides.json 으로 만듭니다. 직접 수정하지 마세요.\n"
                "window.NT = window.NT || {};\n"
                f"NT.OVERRIDES = {json.dumps(overrides, ensure_ascii=False)};\n")


def pending_video(vid, c, d):
    """반응 데이터를 아직 못 모은 영상(새로 추가 직후 수집 실패 등)."""
    title = c.get("t", vid)
    lang = "ko" if HANGUL.search(title) else "en"
    return {"id": vid, "t": title, "ch": c.get("ch", ""), "dur": "", "views": 0, "likes": 0, "cc": 0, "mo": 0,
            "topic": c["topic"], "lv": c["lv"], "lang": lang, "kv": "audio" if lang == "ko" else "none", "rv": False,
            "score": 0, "pending": True, "sig": {"pos": 0, "neg": 0, "aud": 0, "n": 0, "likeRate": None},
            "sum": d["sum"], "why": d["why"], "q": c["q"], "a": d["a"],
            "rx": c.get("rx") or "새로 추가된 영상입니다. 반응 점수는 다음 업데이트 때 계산됩니다."}


def build(metrics_path):
    metrics = {m["id"]: m for m in json.load(open(metrics_path, encoding="utf-8"))}
    curated = json.load(open(os.path.join(ROOT, "tools", "curated.json"), encoding="utf-8"))
    details = load_details()
    missing = [vid for vid in curated if vid not in metrics]
    for vid in missing:
        print(f"… 반응 데이터가 아직 없어 '점수 대기'로 게시: {vid} (다음 업데이트 때 계산)")
    no_detail = [vid for vid in curated if vid not in details]
    if no_detail:
        raise SystemExit(f"details에 없는 영상: {no_detail}")

    reviewed = load_reviewed()
    overrides = load_overrides()
    write_overrides(overrides)
    unavailable = [vid for vid in curated if vid in metrics and not is_available(metrics[vid])]
    for vid in unavailable:
        print(f"⚠ 재생 불가(삭제·비공개·임베드 차단)로 제외: {vid} {metrics[vid].get('title')}")

    videos = []
    for vid, c in curated.items():
        d = details[vid]
        if vid in unavailable:
            continue  # 숨긴 영상은 남겨 둔다: 화면에서 감추고(overlay.js) 교수자가 다시 보이게 할 수 있게
        if vid in missing:
            videos.append(pending_video(vid, c, d))
            continue
        m = metrics[vid]
        title = c.get("t") or m["title"]
        lang = "ko" if HANGUL.search(title) else "en"
        videos.append({
            "id": vid, "t": title, "ch": c.get("ch") or m["ch"], "dur": duration(m["secs"]),
            "views": m["views"], "likes": m["likes"], "cc": m["comments"], "mo": months_ago(m["date"]),
            "topic": c["topic"], "lv": c["lv"], "lang": lang, "kv": korean_view(m, lang), "rv": vid in reviewed,
            "cl": caption_lang(m),
            "score": max(0, min(100, m["score"] + c.get("adj", 0))),
            "sig": {"pos": m["pos"], "neg": m["neg"], "aud": m["aud"], "n": m["sampled"], "likeRate": m["likeRate"]},
            "sum": d["sum"], "why": d["why"], "q": c["q"], "a": d["a"], "rx": c["rx"],
        })
    videos.sort(key=lambda v: -v["score"])

    header = ("// 자동 생성 파일: tools/build_data.py 로 다시 만드세요. 직접 수정하지 마세요.\n"
              f"// 기준일 {TODAY.isoformat()} · 영상 {len(videos)}편 · 반응 점수 높은 순\n"
              "window.NT = window.NT || {};\n")
    body = "NT.VIDEOS = [\n" + ",\n".join("  " + json.dumps(v, ensure_ascii=False) for v in videos) + "\n];\n"
    out = os.path.join(ROOT, "js", "data", "videos.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write(header + body)
    print(f"{len(videos)}편 → {out}")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "tools", "metrics.json"))
