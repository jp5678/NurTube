"""새 영상 찾기: 주제별 검색 → 반응 점수 → 기존 영상과 비교 → (선택) Claude AI 초안 → 추천 후보 목록.

사용:  python3 tools/discover.py [--no-ai]
결과:  js/data/candidates.js (사이트 '영상 관리 → 추천 후보'에 표시), tools/candidates.json
"""
import datetime
import json
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor

import ai_draft
from analyze import score
from build_data import months_ago, duration, korean_view
from collect import WORKERS, safe
from search import search

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
SEARCH_TOP = 8
RECENCY_BONUS_MAX = 6  # 최근 영상일수록 순위에 더하는 점수(반응 점수에는 반영하지 않음)


def load(name: str, default):
    try:
        return json.load(open(os.path.join(TOOLS, name), encoding="utf-8"))
    except FileNotFoundError:
        return default


def site_structure() -> tuple[list[dict], list[dict]]:
    text = open(os.path.join(ROOT, "js", "data", "taxonomy.js"), encoding="utf-8").read()
    topics = [{"id": i, "name": n} for i, n in re.findall(r'\{ id: "(\w+)", area: "\w+", name: "([^"]+)"', text)]
    roadmap = [{"week": int(w), "title": t, "ids": re.findall(r'"([\w-]{11})"', ids)}
               for w, t, ids in re.findall(r'\{ week: (\d+), title: "([^"]+)", ids: \[([^\]]*)\]', text)]
    return topics, roadmap


def current_videos() -> list[dict]:
    lines = open(os.path.join(ROOT, "js", "data", "videos.js"), encoding="utf-8").read().splitlines()
    return [json.loads(l.strip().rstrip(",")) for l in lines if l.strip().startswith('{"id"')]


def recency_bonus(mo: int) -> float:
    return max(0.0, min(RECENCY_BONUS_MAX, (12 - mo) / 2))


def acceptable(raw: dict, cfg: dict) -> bool:
    minutes = raw.get("secs", 0) / 60
    return (raw.get("status") == "OK" and raw.get("embed") is not False
            and cfg["min_minutes"] <= minutes <= cfg["max_minutes"]
            and raw.get("views", 0) >= cfg["min_views"]
            and months_ago(raw.get("date") or "") <= cfg["max_age_months"])


def weakest(topic: str, videos: list[dict], roadmap: list[dict], reviewed: set[str]) -> dict | None:
    """같은 주제에서 교체를 검토할 만한 기존 영상(교수 검수 영상 제외, 점수 최하위)."""
    pool = [v for v in videos if v["topic"] == topic and v["id"] not in reviewed and not v.get("pending")]
    if not pool:
        return None
    v = min(pool, key=lambda x: x["score"])
    week = next((w["week"] for w in roadmap if v["id"] in w["ids"]), 0)
    return {"id": v["id"], "t": v["t"], "score": v["score"], "week": week}


FIT_ORDER = {"high": 0, "medium": 1, "low": 2}


def finalize(items: list[dict]) -> list[dict]:
    """AI가 수업 적합도 '낮음'으로 본 영상은 교체 제안을 빼고, 적합도→반응 점수 순으로 정렬한다."""
    out = []
    for it in items:
        d = it.get("draft") or {}
        fit = d.get("fit") if "error" not in d else None
        out.append({**it, "replace": None if fit == "low" else it.get("replace")})
    return sorted(out, key=lambda it: (FIT_ORDER.get((it.get("draft") or {}).get("fit"), 1), -it["score"]))


def main(use_ai: bool = True) -> dict:
    cfg = load("discovery.json", {})
    topics, roadmap = site_structure()
    videos = current_videos()
    known = set(load("curated.json", {})) | set(load("excluded.json", {"excluded": []})["excluded"])
    reviewed = set(load("reviewed.json", {"reviewed": []})["reviewed"])
    ai_ok = use_ai and ai_draft.get_key() is not None
    if use_ai and not ai_ok:
        print("⚠ Claude API 키가 없어 AI 초안 없이 후보만 찾습니다. (메뉴의 'AI 설정'에서 키를 등록할 수 있습니다)")

    # 1) 주제별 검색
    pools: dict[str, list[str]] = {}
    seen: set[str] = set(known)
    for t in topics:
        ids = []
        for q in cfg["queries"].get(t["id"], []):
            try:
                rows = search(q, SEARCH_TOP)
            except Exception as e:  # 검색 하나가 실패해도 계속
                print(f"  검색 실패({q}): {e}")
                continue
            for r in rows:
                if r["id"] not in seen and len(ids) < cfg["pool_per_topic"]:
                    ids.append(r["id"])
                    seen.add(r["id"])
        pools[t["id"]] = ids
        print(f"· {t['name']}: 새 후보 {len(ids)}편 검색")

    # 2) 반응 수집 · 점수
    all_ids = [i for ids in pools.values() for i in ids]
    with ThreadPoolExecutor(WORKERS) as ex:
        raws = {r["id"]: r for r in ex.map(safe, all_ids)}

    items = []
    for t in topics:
        scored = []
        for vid in pools[t["id"]]:
            raw = raws.get(vid, {})
            if "error" in raw or not acceptable(raw, cfg):
                continue
            row = score(raw)
            mo = months_ago(raw.get("date") or "")
            scored.append((row["score"] + recency_bonus(mo), row, raw, mo))
        scored.sort(key=lambda x: -x[0])
        cmp_ = weakest(t["id"], videos, roadmap, reviewed)
        for _, row, raw, mo in scored[: cfg["per_topic"]]:
            replace = cmp_ if cmp_ and row["score"] >= cmp_["score"] + cfg["replace_margin"] else None
            lang = "ko" if re.search(r"[가-힣]", raw["title"] or "") else "en"
            items.append({
                "id": row["id"], "t": raw["title"], "ch": raw["ch"], "dur": duration(raw["secs"]), "views": raw["views"],
                "likes": raw["likes"], "mo": mo, "lang": lang, "kv": korean_view(row, lang), "topic": t["id"],
                "score": row["score"], "sig": {"pos": row["pos"], "neg": row["neg"], "aud": row["aud"], "n": row["sampled"],
                                               "likeRate": row["likeRate"]},
                "compare": cmp_, "replace": replace,
                "_metrics": {k: v for k, v in row.items() if k not in ("top", "desc")}, "_raw": raw,
            })

    # 3) AI 초안
    if ai_ok:
        print(f"\nClaude로 초안 작성 중… ({len(items)}편, 모델 {ai_draft.config()['model']})")
        for i, it in enumerate(items, 1):
            ctx = {"topics": topics, "roadmap": roadmap, "topic_id": it["topic"], "compare": it["compare"]}
            it["draft"] = ai_draft.draft(it["_metrics"], it["_raw"], ctx)
            status = it["draft"].get("error") or f"적합도 {it['draft'].get('fit')}"
            print(f"  {i}/{len(items)} {it['t'][:40]} — {status}")

    items = finalize(items)

    # 4) 저장: 사이트용(댓글 원문 제외)과 업데이트용(반응 수치 포함)
    generated = datetime.datetime.now().isoformat(timespec="minutes")
    public = [{k: v for k, v in it.items() if not k.startswith("_")} for it in items]
    with open(os.path.join(ROOT, "js", "data", "candidates.js"), "w", encoding="utf-8") as f:
        f.write("// 자동 생성 파일: tools/discover.py ('새 영상 찾기')가 만듭니다. 교수자 모드에서만 보입니다.\n"
                "window.NT = window.NT || {};\n"
                f"NT.CANDIDATES = {json.dumps({'generatedAt': generated, 'ai': ai_ok, 'items': public}, ensure_ascii=False)};\n")
    json.dump({"generatedAt": generated, "items": [{"id": it["id"], "metrics": it["_metrics"]} for it in items]},
              open(os.path.join(TOOLS, "candidates.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    drafted = sum(1 for it in items if it.get("draft") and "error" not in it["draft"])
    replaces = sum(1 for it in items if it["replace"])
    print(f"\n✅ 추천 후보 {len(items)}편 (AI 초안 {drafted}편, 교체 제안 {replaces}편)")
    print("   사이트 → 설정에서 교수자 모드 → ✏️ 영상 관리 → '🔎 추천 후보'에서 추가·교체·제외를 고르세요.")
    return {"items": len(items), "drafted": drafted, "replaces": replaces}


if __name__ == "__main__":
    main(use_ai="--no-ai" not in sys.argv)
