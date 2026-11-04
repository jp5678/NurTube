"""NurTube 교수자 도구 메뉴. 'NurTube 업데이트.command'를 더블클릭하면 실행된다."""
import os
import subprocess
import sys
import webbrowser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import publish  # noqa: E402

ROOT = publish.ROOT
PREVIEW_PORT = 8765

MENU = """
──────────────────────────────────────────
  NurTube 교수자 도구
──────────────────────────────────────────
  1) 영상 관리 변경사항 반영 + GitHub 업로드
     (사이트 '영상 관리'에서 '반영 파일 내보내기'를 먼저 누르세요)
  2) 학기 점검: 반응 재수집·삭제 영상 점검 + GitHub 업로드
  3) 내 컴퓨터에서 사이트 미리보기
  4) GitHub 처음 연결 (최초 1회)
  5) 끝내기
──────────────────────────────────────────"""


def ask(prompt: str, default: bool = True) -> bool:
    hint = "Y/n" if default else "y/N"
    answer = input(f"{prompt} ({hint}) ").strip().lower()
    return default if not answer else answer in ("y", "yes", "예", "네", "ㅇ")


def offer_push(message: str) -> None:
    if not publish.remote_url():
        print("\n(아직 GitHub에 연결되지 않아 이 컴퓨터에만 반영되었습니다. 4번으로 처음 연결을 해 주세요.)")
        return
    if ask("\n학생들이 보는 사이트(GitHub)에 지금 올릴까요?"):
        publish.push(message)


def do_update() -> None:
    import update
    result = update.main()
    if result:
        offer_push(f"update: 영상 추가 {len(result['added'])}·수정 {len(result['edited'])}·숨김 {len(result['hidden'])}")


def do_refresh() -> None:
    import refresh
    try:
        refresh.main()
    except SystemExit as e:  # 요청 제한 등으로 중단: 기존 데이터 유지
        print(f"\n⚠ {e}")
        return
    print(f"점검 보고서: {os.path.join(ROOT, 'tools', 'refresh-report.md')}")
    offer_push("update: 학기 점검 반영")


def do_preview() -> None:
    url = f"http://localhost:{PREVIEW_PORT}/"
    print(f"미리보기: {url}  (창을 닫거나 Ctrl+C로 종료)")
    webbrowser.open(url)
    subprocess.run([sys.executable, "-m", "http.server", str(PREVIEW_PORT)], cwd=ROOT, check=False)


def do_setup() -> None:
    print("GitHub에 공개(public) 저장소를 만들고 GitHub Pages로 사이트를 엽니다.")
    print("학생 노트·퀴즈는 학생 브라우저에만 저장되므로 올라가지 않습니다. 댓글 원문 파일도 제외됩니다.")
    name = input(f"저장소 이름 (Enter = {publish.DEFAULT_REPO}): ").strip() or publish.DEFAULT_REPO
    if ask(f"'{name}' 저장소를 공개로 만들고 업로드할까요?", default=False):
        publish.setup(name)


ACTIONS = {"1": do_update, "2": do_refresh, "3": do_preview, "4": do_setup}


def main() -> None:
    os.chdir(ROOT)
    while True:
        print(MENU)
        choice = input("번호를 입력하세요: ").strip()
        if choice in ("5", "q", ""):
            break
        action = ACTIONS.get(choice)
        if not action:
            print("1~5 중에서 골라 주세요.")
            continue
        try:
            action()
        except KeyboardInterrupt:
            print("\n중단했습니다.")
        except SystemExit as e:
            print(f"\n⚠ {e}")
        except Exception as e:  # 예상 못 한 오류도 창이 바로 닫히지 않게
            print(f"\n⚠ 오류가 발생했습니다: {e}")
        input("\n계속하려면 Enter를 누르세요…")


if __name__ == "__main__":
    main()
