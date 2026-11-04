"""Collect YouTube metadata + top comments for video ids. Usage: collect.py ids.txt out.json"""
import json
import re
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}


WORKERS = 3  # 동시 요청 수(너무 높이면 YouTube가 429로 막음)
RETRIES = 4
BACKOFF_SECONDS = 15  # 429(요청 과다)이면 15·30·45·60초 쉬고 다시 시도


def get(url, data=None):
    headers = dict(UA)
    if data is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(data).encode()
    for attempt in range(RETRIES + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == RETRIES:
                raise
            time.sleep(BACKOFF_SECONDS * (attempt + 1))


def find_all(o, pred, out=None):
    out = [] if out is None else out
    if isinstance(o, dict):
        if pred(o):
            out.append(o)
        for v in o.values():
            find_all(v, pred, out)
    elif isinstance(o, list):
        for v in o:
            find_all(v, pred, out)
    return out


def blob(html, var):
    m = re.search(r"var " + var + r" = (\{.*?\});(?:var |</script>)", html, re.S)
    return json.loads(m.group(1)) if m else {}


def captions_info(pr: dict) -> dict:
    """한국어 시청 가능 여부: 수동 한국어 자막(ko) / 자동 생성 한국어(ko-asr) / 자동 번역 가능(translate)."""
    tl = pr.get("captions", {}).get("playerCaptionsTracklistRenderer", {})
    tracks = tl.get("captionTracks", [])
    ko = [t for t in tracks if t.get("languageCode", "").startswith("ko")]
    translatable = any(t.get("isTranslatable") for t in tracks) and any(
        x.get("languageCode", "").startswith("ko") for x in tl.get("translationLanguages", []))
    return {"koManual": any(t.get("kind") != "asr" for t in ko), "koAuto": any(t.get("kind") == "asr" for t in ko),
            "translate": translatable, "tracks": sorted({t.get("languageCode", "") for t in tracks})}


def one(vid):
    html = get(f"https://www.youtube.com/watch?v={vid}&hl=en&gl=US")
    pr = blob(html, "ytInitialPlayerResponse")
    d = blob(html, "ytInitialData")
    mf = pr.get("microformat", {}).get("playerMicroformatRenderer", {})
    vd = pr.get("videoDetails", {})
    key = re.search(r'"INNERTUBE_API_KEY":"([^"]+)"', html).group(1)
    ver = re.search(r'"INNERTUBE_CLIENT_VERSION":"([^"]+)"', html).group(1)
    sec = find_all(d, lambda o: o.get("sectionIdentifier") == "comment-item-section")
    token = None
    if sec:
        cmds = find_all(sec[0], lambda o: "continuationCommand" in o)
        token = cmds[0]["continuationCommand"]["token"] if cmds else None
    comments, count = [], None
    if token:
        r = json.loads(get(f"https://www.youtube.com/youtubei/v1/next?key={key}&prettyPrint=false",
                           {"context": {"client": {"clientName": "WEB", "clientVersion": ver, "hl": "en", "gl": "US"}},
                            "continuation": token}))
        hdr = find_all(r, lambda o: "commentsHeaderRenderer" in o)
        if hdr:
            count = "".join(x.get("text", "") for x in hdr[0]["commentsHeaderRenderer"].get("countText", {}).get("runs", []))
        for o in find_all(r, lambda o: "commentEntityPayload" in o):
            p = o["commentEntityPayload"]
            comments.append({"t": p["properties"]["content"]["content"], "l": p["toolbar"].get("likeCountNotliked", "0")})
    return {"id": vid, "title": vd.get("title"), "ch": vd.get("author"), "secs": int(vd.get("lengthSeconds", 0)),
            "views": int(vd.get("viewCount", 0)), "likes": int(mf.get("likeCount", 0) or 0),
            "date": mf.get("uploadDate") or mf.get("publishDate"), "desc": vd.get("shortDescription", "")[:600],
            "count": count, "comments": comments,
            "embed": pr.get("playabilityStatus", {}).get("playableInEmbed"),
            "status": pr.get("playabilityStatus", {}).get("status", "UNKNOWN"),
            "reason": pr.get("playabilityStatus", {}).get("reason", ""),
            "captions": captions_info(pr)}


def safe(vid):
    try:
        return one(vid)
    except Exception as e:  # keep going; report failures
        return {"id": vid, "error": str(e)}


if __name__ == "__main__":
    ids = open(sys.argv[1]).read().split()
    with ThreadPoolExecutor(WORKERS) as ex:
        res = list(ex.map(safe, ids))
    json.dump(res, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
    print(len(res), "collected;", sum(1 for r in res if "error" in r), "errors")
