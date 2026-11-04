"""교수자 '영상 관리' 화면에서 내보낸 nurtube-update-*.json을 사이트에 반영한다.

사용:  python3 tools/update.py [파일 경로]
       경로를 생략하면 다운로드 폴더에서 가장 최근의 nurtube-update-*.json을 찾는다.
하는 일: 검증 → curated.json·details·overrides.json·reviewed.json 병합 → 새 영상 반응 수집 → 사이트 데이터 재생성
"""
import datetime
import glob
import json
import os
import re
import shutil
import sys

from analyze import score
from build_data import build
from collect import safe

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
DOWNLOADS = os.path.expanduser("~/Downloads")
ID_RE = re.compile(r"^[\w-]{11}$")
LIMITS = {"t": 200, "ch": 100, "sum": 1200, "why": 1200, "q": 400, "rx": 600, "a": 600}
MAX_ANSWERS = 10


def path(*parts: str) -> str:
    return os.path.join(TOOLS, *parts)


def load(name: str, default):
    try:
        return json.load(open(path(name), encoding="utf-8"))
    except FileNotFoundError:
        return default


def save(name: str, data) -> None:
    with open(path(name), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)


def find_update_file(arg: str | None) -> str | None:
    if arg:
        return arg if os.path.exists(arg) else None
    files = glob.glob(os.path.join(DOWNLOADS, "nurtube-update*.json")) + glob.glob(path("inbox", "*.json"))
    return max(files, key=os.path.getmtime) if files else None


def taxonomy_ids() -> tuple[set[str], int]:
    """js/data/taxonomy.js에서 주제 id와 로드맵 주차 수를 읽는다."""
    text = open(os.path.join(ROOT, "js", "data", "taxonomy.js"), encoding="utf-8").read()
    topics = set(re.findall(r'\{ id: "(\w+)", area:', text))
    weeks = len(re.findall(r"\{ week: \d+,", text))
    return topics, weeks


def clean_text(value, key: str) -> str:
    return str(value or "").strip()[: LIMITS[key]]


def safe_level(value) -> int:
    """수준은 1(입문)~3(심화). 숫자가 아니면 입문으로 본다."""
    try:
        return min(3, max(1, int(value)))
    except (TypeError, ValueError):
        return 1


def read_update(src: str) -> dict:
    try:
        with open(src, encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as err:
        raise SystemExit(f"반영 파일을 읽지 못했습니다({err}). '영상 관리 → 반영 파일 내보내기'로 다시 만들어 주세요.")
    if not isinstance(data, dict):
        raise SystemExit("반영 파일 형식이 올바르지 않습니다. '영상 관리 → 반영 파일 내보내기'로 다시 만들어 주세요.")
    return data


def validate(update: dict) -> tuple[dict, list[str]]:
    """잘못된 항목은 건너뛰고 이유를 모은다. 반환: (정리된 업데이트, 경고 목록)"""
    topics, weeks = taxonomy_ids()
    warnings, videos = [], {}
    if update.get("app") != "NurTube":
        raise SystemExit("NurTube 반영 파일이 아닙니다. '영상 관리' 화면의 '반영 파일 내보내기'로 만든 파일을 사용하세요.")
    for vid, v in (update.get("videos") or {}).items():
        if not ID_RE.match(vid):
            warnings.append(f"영상 ID 형식 오류로 건너뜀: {vid}")
            continue
        if v.get("topic") not in topics:
            warnings.append(f"알 수 없는 주제라 건너뜀: {vid} ({v.get('topic')})")
            continue
        answers = [clean_text(a, "a") for a in (v.get("a") or []) if str(a).strip()][:MAX_ANSWERS]
        if not (clean_text(v.get("sum"), "sum") and clean_text(v.get("why"), "why") and clean_text(v.get("q"), "q") and answers):
            warnings.append(f"요약·추천 이유·토론 질문·답변 가이드 중 빈 칸이 있어 건너뜀: {vid}")
            continue
        videos[vid] = {"t": clean_text(v.get("t"), "t"), "ch": clean_text(v.get("ch"), "ch"), "topic": v["topic"],
                       "lv": safe_level(v.get("lv")), "sum": clean_text(v.get("sum"), "sum"),
                       "why": clean_text(v.get("why"), "why"), "q": clean_text(v.get("q"), "q"),
                       "rx": clean_text(v.get("rx"), "rx"), "a": answers}
    week_map = {}
    for vid, wk in (update.get("weeks") or {}).items():
        if ID_RE.match(vid) and str(wk).isdigit() and 0 <= int(wk) <= weeks:
            week_map[vid] = int(wk)
        else:
            warnings.append(f"주차 값 오류로 건너뜀: {vid} → {wk}")
    ids = lambda key: [x for x in (update.get(key) or []) if ID_RE.match(str(x))]
    return {"videos": videos, "weeks": week_map, "hidden": ids("hidden"), "unhidden": ids("unhidden"),
            "reviewed": ids("reviewed"), "excluded": ids("excluded")}, warnings


def details_file_of(vid: str) -> str:
    for f in sorted(glob.glob(path("details", "*.json"))):
        if vid in json.load(open(f, encoding="utf-8")):
            return f
    return path("details", "added.json")


def apply(update: dict) -> dict:
    curated = load("curated.json", {})
    metrics = {m["id"]: m for m in load("metrics.json", [])}
    added, edited = [], []

    for vid, v in update["videos"].items():
        is_new = vid not in curated
        entry = {**curated.get(vid, {}), "topic": v["topic"], "lv": v["lv"], "q": v["q"]}
        if v["rx"]:
            entry["rx"] = v["rx"]
        entry.setdefault("rx", "새로 추가된 영상입니다. 반응 요약은 학기 점검 때 보완하세요.")
        # 제목·채널은 교수자가 YouTube 원래 값과 다르게 고친 경우에만 덮어쓴다
        yt = metrics.get(vid, {})
        for key, yt_key in (("t", "title"), ("ch", "ch")):
            if v[key] and v[key] != yt.get(yt_key):
                entry[key] = v[key]
        curated[vid] = entry
        target = details_file_of(vid)
        details = json.load(open(target, encoding="utf-8")) if os.path.exists(target) else {}
        details[vid] = {"sum": v["sum"], "why": v["why"], "a": v["a"]}
        with open(target, "w", encoding="utf-8") as f:
            json.dump(details, f, ensure_ascii=False, indent=2)
        (added if is_new else edited).append(vid)
    save("curated.json", curated)

    overrides = load("overrides.json", {"hidden": [], "weeks": {}})
    hidden = (set(overrides.get("hidden", [])) | set(update["hidden"])) - set(update["unhidden"])
    overrides = {"hidden": sorted(hidden), "weeks": {**overrides.get("weeks", {}), **update["weeks"]}}
    save("overrides.json", overrides)

    excluded = load("excluded.json", {"excluded": []})
    save("excluded.json", {"excluded": sorted(set(excluded.get("excluded", [])) | set(update["excluded"]))})

    reviewed = load("reviewed.json", {"reviewed": []})
    reviewed_ids = sorted(set(reviewed.get("reviewed", [])) | set(update["reviewed"]))
    save("reviewed.json", {"reviewed": reviewed_ids})

    # 반응 데이터가 없는 영상만 수집(새 영상 + 지난번 수집 실패). 기존 영상은 학기 점검 때 일괄 재수집
    new_ids = [vid for vid in curated if vid not in metrics]
    # '새 영상 찾기'에서 이미 모은 반응 수치가 있으면 다시 요청하지 않는다
    from_candidates = {c["id"]: c["metrics"] for c in load("candidates.json", {"items": []}).get("items", [])}
    for vid in [v for v in new_ids if v in from_candidates]:
        metrics[vid] = from_candidates[vid]
    new_ids = [vid for vid in new_ids if vid not in metrics]
    failed = []
    for vid in new_ids:
        raw = safe(vid)
        if "error" in raw:
            failed.append(vid)
            continue
        row = score(raw)
        metrics[vid] = {k: val for k, val in row.items() if k not in ("top", "desc")}
    save("metrics.json", list(metrics.values()))
    return {"added": added, "edited": edited, "hidden": update["hidden"], "unhidden": update["unhidden"],
            "moved": list(update["weeks"]), "reviewed": update["reviewed"], "excluded": update["excluded"], "failed": failed}


def main(arg: str | None = None) -> dict | None:
    src = find_update_file(arg)
    if not src:
        print("반영할 파일을 찾지 못했습니다. 사이트의 '영상 관리 → 반영 파일 내보내기'를 먼저 눌러 주세요.")
        return None
    print(f"반영 파일: {src}")
    update, warnings = validate(read_update(src))
    result = apply(update)
    build(path("metrics.json"))

    os.makedirs(path("applied"), exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    shutil.move(src, path("applied", f"{stamp}-{os.path.basename(src)}"))

    print("\n✅ 반영 완료")
    print(f"  추가 {len(result['added'])}편 · 수정 {len(result['edited'])}편 · 숨김 {len(result['hidden'])}편 · "
          f"다시 보이기 {len(result['unhidden'])}편 · 주차 이동 {len(result['moved'])}편 · 검수 {len(result['reviewed'])}편 · "
          f"후보 제외 {len(result['excluded'])}편")
    if result["failed"]:
        print(f"  ⚠ 반응 점수를 아직 못 가져온 영상 {len(result['failed'])}편은 '점수 대기'로 게시했습니다. 다음 업데이트 때 다시 시도합니다.")
    for w in warnings:
        print(f"  ⚠ {w}")
    return result


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
