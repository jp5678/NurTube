"""GitHub Pages 배포: 처음 연결(setup)과 변경 업로드(push).

처음 한 번:  python3 tools/publish.py setup   → GitHub 저장소 만들기 + Pages 켜기 + 첫 업로드
매번:       python3 tools/publish.py push "메시지"
캐시 번호만: python3 tools/publish.py stamp       → index.html의 ?v= 번호만 갱신(업로드 안 함)
필요: GitHub CLI(gh) 로그인 (터미널에서 `gh auth login`)
"""
import datetime
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_REPO = "NurTube"
BRANCH = "main"

# 배포하면 안 되는 파일: 댓글 원문, 작업 기록, 개인 설정
GITIGNORE = """# NurTube — 배포 제외
tools/raw.json
tools/digest.txt
tools/applied/
tools/inbox/
tools/__pycache__/
.claude/
docs/
.DS_Store

# 사용 설명서 PDF(사이트에서 언제든 다시 만들 수 있음)
NurTube_사용설명서.pdf
"""


def run(*cmd: str, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, check=check, text=True, capture_output=capture)


def out(*cmd: str) -> str:
    r = run(*cmd, check=False, capture=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def require_gh() -> None:
    if not shutil.which("gh"):
        raise SystemExit("GitHub CLI(gh)가 없습니다. https://cli.github.com 에서 설치한 뒤 다시 실행하세요.")
    if run("gh", "auth", "status", check=False, capture=True).returncode != 0:
        raise SystemExit("GitHub 로그인이 필요합니다. 터미널에서 `gh auth login`을 실행한 뒤 다시 시도하세요.")


def is_repo() -> bool:
    return os.path.isdir(os.path.join(ROOT, ".git"))


def remote_url() -> str:
    return out("git", "remote", "get-url", "origin")


def pages_url() -> str:
    repo = out("gh", "repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner")
    if not repo:
        return ""
    info = out("gh", "api", f"repos/{repo}/pages")
    if info:
        return json.loads(info).get("html_url", "")
    owner, name = repo.split("/")
    return f"https://{owner.lower()}.github.io/{name}/"


def ensure_identity() -> None:
    """커밋 작성자 정보가 없으면 이 저장소에만 GitHub no-reply 주소로 설정(개인 이메일 공개 방지)."""
    if out("git", "config", "user.email"):
        return
    user = json.loads(out("gh", "api", "user") or "{}")
    login, uid = user.get("login"), user.get("id")
    if not login:
        raise SystemExit("GitHub 사용자 정보를 읽지 못했습니다. `gh auth login` 상태를 확인하세요.")
    run("git", "config", "user.name", user.get("name") or login)
    run("git", "config", "user.email", f"{uid}+{login}@users.noreply.github.com")


ASSET_RE = re.compile(r'((?:src|href)="(?:js|css)/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"')


def stamp_assets() -> None:
    """index.html의 스크립트·스타일 주소에 ?v=업로드시각을 붙여, 업로드 뒤 브라우저가 옛 파일을 쓰지 않게 한다."""
    path = os.path.join(ROOT, "index.html")
    version = datetime.datetime.now().strftime("%Y%m%d%H%M")
    text = open(path, encoding="utf-8").read()
    open(path, "w", encoding="utf-8").write(ASSET_RE.sub(lambda m: f'{m.group(1)}?v={version}"', text))


def ensure_gitignore() -> None:
    path = os.path.join(ROOT, ".gitignore")
    if not os.path.exists(path):
        open(path, "w", encoding="utf-8").write(GITIGNORE)


def setup(repo_name: str = DEFAULT_REPO) -> None:
    require_gh()
    if remote_url():
        print(f"이미 GitHub에 연결되어 있습니다: {remote_url()}")
        print(f"사이트 주소: {pages_url()}")
        return
    ensure_gitignore()
    if not is_repo():
        run("git", "init", "-b", BRANCH)
    ensure_identity()
    stamp_assets()
    run("git", "add", "-A")
    if out("git", "status", "--porcelain"):
        run("git", "commit", "-m", "feat: NurTube 첫 배포")
    owner = out("gh", "api", "user", "-q", ".login")
    print(f"GitHub 저장소 {owner}/{repo_name} 를 공개(public)로 만들고 업로드합니다…")
    run("gh", "repo", "create", repo_name, "--public", "--source", ".", "--remote", "origin", "--push",
        "--description", "간호대학생을 위한 [AI융합 간호정보학] 영상 큐레이션")
    print("GitHub Pages를 켭니다…")
    run("gh", "api", "-X", "POST", f"repos/{owner}/{repo_name}/pages",
        "-f", f"source[branch]={BRANCH}", "-f", "source[path]=/", check=False, capture=True)
    print(f"\n✅ 연결 완료. 1~2분 뒤 사이트가 열립니다: https://{owner.lower()}.github.io/{repo_name}/")


def push(message: str = "update: 영상 데이터 갱신") -> bool:
    if not is_repo() or not remote_url():
        print("아직 GitHub에 연결되지 않았습니다. 메뉴에서 'GitHub 처음 연결'을 먼저 실행하세요. (이번 변경은 이 컴퓨터에만 반영되었습니다)")
        return False
    require_gh()
    ensure_gitignore()
    ensure_identity()
    run("git", "add", "-A")
    if not out("git", "status", "--porcelain"):
        print("올릴 변경이 없습니다.")
        return True
    stamp_assets()
    run("git", "add", "index.html")
    run("git", "commit", "-m", message)
    result = run("git", "push", "origin", BRANCH, check=False, capture=True)
    if result.returncode != 0:
        print("⚠ 업로드에 실패했습니다. 인터넷 연결과 GitHub 로그인을 확인한 뒤 다시 실행하세요.")
        print(result.stderr.strip()[-500:])
        return False
    print(f"⬆ GitHub 업로드 완료. 1~2분 뒤 반영됩니다: {pages_url()}")
    return True


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "push"
    arg = sys.argv[2] if len(sys.argv) > 2 else None
    if cmd == "setup":
        setup(arg or DEFAULT_REPO)
    elif cmd == "push":
        sys.exit(0 if push(arg or "update: 영상 데이터 갱신") else 1)
    elif cmd == "stamp":
        stamp_assets()
        print("index.html의 캐시 번호를 갱신했습니다(업로드는 하지 않았습니다).")
    else:
        # 모르는 명령으로 실수 업로드가 일어나지 않게 멈춘다
        raise SystemExit(f"알 수 없는 명령: {cmd}\n사용: publish.py setup | push \"메시지\" | stamp")
