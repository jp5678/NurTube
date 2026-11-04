"""Score videos from raw.json by audience reaction. Writes metrics.json; prints a reading digest."""
import json
import math
import re
import sys

POS = re.compile(r"(helpful|thank|great (explanation|video|talk|lecture|presentation|content|job)|well explained|clear(ly)?|"
                 r"informative|excellent|amazing|learn(ed|t)|understand|useful|insightful|brilliant|easy to understand|"
                 r"best (video|explanation)|love (this|it)|very good|so good|perfect|감사|고맙|도움|이해|최고|유익|쉽게|"
                 r"좋은 (강의|영상|정보|내용)|명강|정리|잘 ?봤|배웠|덕분|좋네|유용|예술|강추)", re.I)
NEG = re.compile(r"(wrong|incorrect|misleading|clickbait|advert|boring|inaccurate|hype|scam|not true|terrible|useless|"
                 r"disagree|dangerous|doesn't tell|disappoint|틀린|틀렸|광고|별로|오류|과장|잘못|선동|거짓|위험|두렵)", re.I)
AUD = re.compile(r"(nurs|\bRN\b|student|class|course|professor|lecture|informatic|간호|학생|수업|교수|강의|임상|병원|의료인|의사)", re.I)
SPAM = re.compile(r"(https?://|utm_|전액환급|program -)", re.I)


def num(s):
    s = str(s or "0").replace(",", "")
    m = re.match(r"[\d.]+", s)
    v = float(m.group()) if m else 0.0
    return v * 1e3 if "K" in s.upper() else v * 1e6 if "M" in s.upper() else v


def score(v):
    cs = [c for c in v["comments"] if c["t"] and len(c["t"]) > 3 and not SPAM.search(c["t"])]
    n = len(cs)
    pos = sum(bool(POS.search(c["t"])) for c in cs)
    neg = sum(bool(NEG.search(c["t"])) for c in cs)
    aud = sum(bool(AUD.search(c["t"])) for c in cs)
    cc = num(re.sub(r"[^\d,.KM]", "", v.get("count") or ""))
    ratio = v["likes"] / v["views"] if v["likes"] and v["views"] else 0.01  # 좋아요 비공개 → 중립값
    sent = (pos - 0.7 * neg + 0.6) / (n + 3)   # 소표본 보정(베이지안 평활)
    audr = (aud + 0.3) / (n + 3)
    total = (25 * min(ratio / 0.04, 1) + 20 * min(math.log10(v["likes"] + 1) / 4, 1) +
             30 * min(max(sent, 0) / 0.6, 1) + 15 * min(audr / 0.5, 1) + 10 * min(math.log10(cc + 1) / 3, 1))
    top = sorted(cs, key=lambda c: -num(c["l"]))
    return {"id": v["id"], "score": round(total), "likes": v["likes"], "views": v["views"],
            "likeRate": round(ratio * 100, 2) if v["likes"] else None, "comments": int(cc),
            "sampled": n, "pos": pos, "neg": neg, "aud": aud, "date": (v.get("date") or "")[:10],
            "secs": v["secs"], "title": v["title"], "ch": v["ch"], "embed": v.get("embed"),
            "status": v.get("status", "UNKNOWN"), "captions": v.get("captions", {}),
            "top": [c["t"].replace("\n", " ")[:130] for c in top if len(c["t"]) > 20][:3],
            "desc": re.sub(r"https?://\S+", "", v["desc"]).replace("\n", " ")[:170]}


if __name__ == "__main__":
    raw = [v for v in json.load(open(sys.argv[1])) if "error" not in v]
    rows = sorted((score(v) for v in raw), key=lambda r: -r["score"])
    json.dump(rows, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
    for r in rows:
        print(f"[{r['score']}] {r['id']} {r['title'][:70]} ({r['ch']}) L{r['likes']} {r['likeRate']}% C{r['comments']} "
              f"+{r['pos']}/-{r['neg']}/a{r['aud']}/{r['sampled']} emb={r['embed']}")
        print("   D:", r["desc"])
        for t in r["top"]:
            print("   -", t)
