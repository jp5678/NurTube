"""YouTube 검색 결과(상위 N개)를 출력한다. 새 후보 영상을 찾을 때 사용.

사용:  python3 tools/search.py "원격의료 간호" "telehealth nursing" --top 8
"""
import argparse
import json
import re
import urllib.parse

from collect import UA, find_all, get


def search(query: str, top: int) -> list[dict]:
    html = get("https://www.youtube.com/results?hl=ko&search_query=" + urllib.parse.quote(query))
    m = re.search(r"var ytInitialData = (\{.*?\});</script>", html, re.S)
    data = json.loads(m.group(1)) if m else {}
    rows = []
    for o in find_all(data, lambda o: "videoRenderer" in o)[:top]:
        v = o["videoRenderer"]
        rows.append({
            "id": v["videoId"],
            "title": "".join(r.get("text", "") for r in v.get("title", {}).get("runs", [])),
            "channel": (v.get("ownerText", {}).get("runs") or [{}])[0].get("text", ""),
            "length": v.get("lengthText", {}).get("simpleText", ""),
            "views": v.get("viewCountText", {}).get("simpleText", ""),
            "age": v.get("publishedTimeText", {}).get("simpleText", ""),
        })
    return rows


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("queries", nargs="+")
    ap.add_argument("--top", type=int, default=8)
    args = ap.parse_args()
    _ = UA  # collect.py의 요청 헤더를 그대로 사용
    for q in args.queries:
        print(f"## {q}")
        for r in search(q, args.top):
            print(f"{r['id']} | {r['title'][:80]} | {r['channel']} | {r['length']} | {r['views']} | {r['age']}")
