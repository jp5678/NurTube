"""Claude API로 후보 영상의 요약·추천 이유·토론 질문·답변 가이드 초안을 만든다.

API 키: 환경변수 ANTHROPIC_API_KEY 또는 macOS 키체인('NurTube Anthropic API'). 파일에는 저장하지 않는다.
키 등록:  python3 tools/ai_draft.py set-key
"""
import getpass
import json
import os
import shutil
import subprocess
import sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
KEYCHAIN_SERVICE = "NurTube Anthropic API"
KEYCHAIN_ACCOUNT = "NurTube"
DEFAULT_MODEL = "claude-opus-5-5"
MAX_TOKENS = 4000
MAX_COMMENTS = 15
COMMENT_CHARS = 220


def config() -> dict:
    path = os.path.join(TOOLS, "ai_config.json")
    data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    return {"model": data.get("model", DEFAULT_MODEL)}


# ── API 키 (키체인)
def get_key() -> str | None:
    if os.environ.get("ANTHROPIC_API_KEY"):
        return os.environ["ANTHROPIC_API_KEY"]
    if not shutil.which("security"):
        return None
    r = subprocess.run(["security", "find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"],
                       capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 and r.stdout.strip() else None


def set_key() -> None:
    if not shutil.which("security"):
        raise SystemExit("이 컴퓨터는 macOS 키체인을 쓸 수 없습니다. 환경변수 ANTHROPIC_API_KEY로 설정하세요.")
    print("Anthropic 콘솔(https://console.anthropic.com)의 API Keys에서 만든 키를 붙여 넣으세요.")
    print("입력한 글자는 화면에 보이지 않으며, macOS 키체인에만 저장됩니다(파일·GitHub에 저장되지 않음).")
    key = getpass.getpass("API 키: ").strip()
    if not key.startswith("sk-ant-"):
        raise SystemExit("Anthropic API 키 형식(sk-ant-…)이 아닙니다. 다시 확인해 주세요.")
    subprocess.run(["security", "add-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w", key, "-U"],
                   check=True, capture_output=True)
    print("✅ 키를 저장했습니다. 연결을 확인합니다…")
    check()


def client():
    try:
        import anthropic
    except ImportError:
        raise SystemExit("anthropic 패키지가 필요합니다. 메뉴의 'AI 설정'을 실행하거나 터미널에서 "
                         "`python3 -m pip install --user anthropic`을 실행하세요.")
    key = get_key()
    if not key:
        raise SystemExit("Claude API 키가 없습니다. 메뉴의 'AI 설정'에서 키를 먼저 등록하세요.")
    return anthropic, anthropic.Anthropic(api_key=key, max_retries=4)


def check() -> bool:
    anthropic, c = client()
    try:
        c.messages.create(model=config()["model"], max_tokens=16, messages=[{"role": "user", "content": "ping"}])
        print(f"✅ Claude API 연결 정상 (모델: {config()['model']})")
        return True
    except anthropic.AuthenticationError:
        print("⚠ API 키가 올바르지 않습니다. 'AI 설정'에서 다시 등록하세요.")
    except anthropic.APIStatusError as e:
        print(f"⚠ Claude API 오류 ({e.status_code}): {e.message}")
    except anthropic.APIConnectionError:
        print("⚠ 인터넷 연결을 확인하세요.")
    return False


# ── 초안 생성
SYSTEM = """당신은 한국 간호대학의 'AI융합 간호정보학' 교수를 돕는 교육 콘텐츠 큐레이터입니다.
간호학과 학생에게 보여 줄 YouTube 영상의 소개 글 초안을 한국어로 씁니다.

반드시 지킬 것:
- 영상 자체를 볼 수 없습니다. 제공된 제목·채널·설명란·시청자 댓글·수치만 근거로 씁니다.
- 설명란에 없는 구체적 내용(연구 결과, 수치, 사례, 발표자 주장)을 지어내지 않습니다. 근거가 약하면 '설명란에 따르면', '~을 다루는 것으로 보인다'처럼 쓰고, caution에 교수자가 시청하며 확인할 점을 적습니다.
- 추천 이유(why)에는 제공된 반응 수치(좋아요율·댓글 반응)와 수업(로드맵 주차) 연결을 근거로 씁니다.
- 토론 질문(q)은 간호 실무·윤리와 연결된 열린 질문 하나로 씁니다. 답변 가이드(a)는 3~5개 항목으로, 일반적인 간호·간호정보학 지식에 근거해 학생의 생각을 넓혀 주는 예시 답변입니다. 약물 용량 등 임상 수치를 단정하지 않습니다.
- 반응 요약(rx)은 제공된 댓글에서 보이는 경향만 1~2문장으로 씁니다. 댓글 원문을 그대로 옮기지 않습니다.
- 문체: 간결한 '~다'체. 영상 제목은 원문 그대로 둡니다.
- 영상이 수업에 맞지 않거나(광고·판매·무관·의학적으로 의심스러운 내용) 근거가 부족하면 fit을 low로 하고 caution에 이유를 씁니다."""


def schema(topics: list[str], weeks: int) -> dict:
    return {
        "type": "object",
        "properties": {
            "topic": {"type": "string", "enum": topics},
            "lv": {"type": "integer", "enum": [1, 2, 3]},
            "week": {"type": "integer", "description": f"0이면 로드맵에 넣지 않음, 1~{weeks}"},
            "sum": {"type": "string", "description": "영상 요약 2~3문장"},
            "why": {"type": "string", "description": "추천 이유 2~3문장"},
            "q": {"type": "string", "description": "토론 질문 1문장"},
            "a": {"type": "array", "items": {"type": "string"}, "description": "답변 가이드 3~5개"},
            "rx": {"type": "string", "description": "시청자 반응 요약 1~2문장"},
            "fit": {"type": "string", "enum": ["high", "medium", "low"]},
            "caution": {"type": "string", "description": "교수자가 시청하며 확인할 점"},
        },
        "required": ["topic", "lv", "week", "sum", "why", "q", "a", "rx", "fit", "caution"],
        "additionalProperties": False,
    }


def build_prompt(video: dict, raw: dict, context: dict) -> str:
    comments = [c["t"].replace("\n", " ")[:COMMENT_CHARS] for c in raw.get("comments", []) if len(c.get("t", "")) > 15][:MAX_COMMENTS]
    lines = [
        "## 수업 구조",
        "주제(topic id: 이름): " + ", ".join(f"{t['id']}: {t['name']}" for t in context["topics"]),
        "로드맵 주차: " + " / ".join(f"{w['week']}주 {w['title']}" for w in context["roadmap"]),
        f"이 영상을 찾은 주제: {context['topic_id']}",
    ]
    if context.get("compare"):
        cmp_ = context["compare"]
        lines.append(f"같은 주제에서 교체 후보로 비교되는 기존 영상: '{cmp_['t']}' (반응 점수 {cmp_['score']}, {cmp_['week'] or '로드맵 밖'}주차)")
    lines += [
        "", "## 영상 정보",
        f"제목: {raw.get('title')}", f"채널: {raw.get('ch')}", f"길이: {round(raw.get('secs', 0) / 60)}분",
        f"게시일: {raw.get('date', '')[:10]}", f"조회수: {raw.get('views')}", f"좋아요: {raw.get('likes')}",
        f"반응 점수(100점): {video['score']} · 좋아요율 {video.get('likeRate')}% · 댓글 {video.get('comments')}개 "
        f"(상위 {video.get('sampled')}개 중 긍정 {video.get('pos')}, 부정 {video.get('neg')}, 학습자·의료인 {video.get('aud')})",
        "", "## 설명란", raw.get("desc") or "(없음)",
        "", "## 상위 댓글 (참고용, 원문 인용 금지)", *(f"- {c}" for c in comments or ["(없음)"]),
        "", "위 정보만으로 소개 글 초안을 작성하세요.",
    ]
    return "\n".join(lines)


def draft(video: dict, raw: dict, context: dict) -> dict:
    """후보 영상 1편의 초안. 실패하면 {'error': ...}"""
    anthropic, c = client()
    topics = [t["id"] for t in context["topics"]]
    try:
        with c.messages.stream(
            model=config()["model"],
            max_tokens=MAX_TOKENS,
            system=SYSTEM,
            thinking={"type": "adaptive"},
            output_config={"format": {"type": "json_schema", "schema": schema(topics, len(context["roadmap"]))}},
            messages=[{"role": "user", "content": build_prompt(video, raw, context)}],
        ) as stream:
            msg = stream.get_final_message()
        text = next(b.text for b in msg.content if b.type == "text")
        out = json.loads(text)
        out["a"] = [x.strip() for x in out["a"] if x.strip()][:5]
        out["week"] = out["week"] if 0 <= out["week"] <= len(context["roadmap"]) else 0
        out["model"] = config()["model"]
        return out
    except anthropic.APIStatusError as e:
        return {"error": f"Claude API 오류 {e.status_code}: {e.message}"}
    except (anthropic.APIConnectionError, StopIteration, json.JSONDecodeError, KeyError) as e:
        return {"error": f"초안 생성 실패: {e}"}


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    set_key() if cmd == "set-key" else check()
