"""학기마다 한 번 실행: 반응 재수집 → 점수 재계산 → 삭제·비공개 점검 → 사이트 데이터 재생성 → 보고서 작성.

사용:  python3 tools/refresh.py
결과:  js/data/videos.js 갱신, tools/refresh-report.md (점검 보고서)
"""
import datetime
import json
import os
from concurrent.futures import ThreadPoolExecutor

from analyze import score
from build_data import build, is_available
from collect import WORKERS, safe

TOOLS = os.path.dirname(os.path.abspath(__file__))
SCORE_CHANGE_ALERT = 10  # 이 이상 바뀌면 보고서에 표시
MAX_FAIL_RATE = 0.2  # 수집 실패가 이 비율을 넘으면 아무것도 덮어쓰지 않고 중단


def path(name: str) -> str:
    return os.path.join(TOOLS, name)


def load_json(name: str, default):
    try:
        return json.load(open(path(name), encoding="utf-8"))
    except FileNotFoundError:
        return default


def main() -> None:
    curated = load_json("curated.json", {})
    old = {m["id"]: m for m in load_json("metrics.json", [])}
    ids = list(curated)
    print(f"{len(ids)}편 반응 수집 중…")
    with ThreadPoolExecutor(WORKERS) as ex:
        raw = list(ex.map(safe, ids))
    errors = [r for r in raw if "error" in r]
    if len(errors) > MAX_FAIL_RATE * len(ids):
        raise SystemExit(f"수집 실패 {len(errors)}/{len(ids)}편 (예: {errors[0]['error']}). "
                         "기존 데이터는 그대로 두었습니다. 30분~1시간 뒤 다시 실행하세요.")
    json.dump(raw, open(path("raw.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    rows = [score(r) for r in raw if "error" not in r]
    # 일부 수집 실패 영상은 지난 학기 값을 유지. 사이트용 metrics에는 댓글 원문을 남기지 않는다
    fresh = {r["id"]: {k: v for k, v in r.items() if k not in ("top", "desc")} for r in rows}
    merged = [fresh.get(vid) or old[vid] for vid in ids if vid in fresh or vid in old]
    json.dump(merged, open(path("metrics.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    unavailable = [r for r in rows if not is_available(r)]
    changed = [(r, old[r["id"]]["score"]) for r in rows
               if r["id"] in old and abs(r["score"] - old[r["id"]]["score"]) >= SCORE_CHANGE_ALERT]
    lost_ko = [r for r in rows if r["id"] in old and old[r["id"]].get("captions", {}).get("translate")
               and not r.get("captions", {}).get("translate")]

    build(path("metrics.json"))

    today = datetime.date.today().isoformat()
    lines = [f"# NurTube 학기 점검 보고서 ({today})", "",
             f"- 점검 영상: {len(ids)}편 · 수집 실패: {len(errors)}편 · 재생 불가: {len(unavailable)}편", ""]
    lines += ["## 재생 불가 (사이트에서 자동 제외됨)"] + (
        [f"- `{r['id']}` {r['title'] or ''} — 상태 {r.get('status')} / 임베드 {r.get('embed')}" for r in unavailable] or ["- 없음"])
    lines += ["", "## 수집 실패 (네트워크 문제일 수 있으니 다시 실행해 보세요)"] + (
        [f"- `{r['id']}` {r['error']}" for r in errors] or ["- 없음"])
    lines += ["", f"## 반응 점수가 {SCORE_CHANGE_ALERT}점 이상 바뀐 영상"] + (
        [f"- `{r['id']}` {r['title']}: {before} → {r['score']}" for r, before in changed] or ["- 없음"])
    lines += ["", "## 한국어 자동 번역 자막이 사라진 영상"] + (
        [f"- `{r['id']}` {r['title']}" for r in lost_ko] or ["- 없음"])
    lines += ["", "## 다음 할 일",
              "- 재생 불가 영상은 `tools/curated.json`과 `tools/details/`에서 지우거나 대체 영상을 찾으세요(`python3 tools/search.py \"검색어\"`).",
              "- 점수가 크게 바뀐 영상은 `tools/digest.txt` 대신 `tools/raw.json`의 댓글을 확인하고 `rx`(반응 요약)를 고쳐 주세요.",
              "- 로드맵·재생목록에서 빠진 영상이 있으면 `js/data/taxonomy.js`를 고치세요."]
    open(path("refresh-report.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"보고서 → {path('refresh-report.md')}")


if __name__ == "__main__":
    main()
