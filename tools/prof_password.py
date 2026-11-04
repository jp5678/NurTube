"""교수자 모드 비밀번호 설정. 원문은 저장하지 않고 PBKDF2-SHA256 해시만 js/data/prof.js에 쓴다.

사용:  python3 tools/prof_password.py
주의: 사이트는 서버 없이 동작하므로 이 비밀번호는 학생이 교수자 화면에 실수로 들어가지 않게 하는 '잠금 표지판'이다.
      사이트 변경 자체는 교수자 Mac과 GitHub 권한으로만 가능하다.
"""
import getpass
import hashlib
import json
import os
import secrets

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "js", "data", "prof.js")
ITERATIONS = 310000
MIN_LENGTH = 8


def hash_password(password: str, salt_hex: str, iterations: int = ITERATIONS) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), iterations).hex()


def write(config: dict | None) -> None:
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// 자동 생성 파일: tools/prof_password.py 가 만듭니다. 교수자 모드 비밀번호의 해시(원문 아님).\n"
                "window.NT = window.NT || {};\n"
                f"NT.PROF = {json.dumps(config)};\n")


def main() -> bool:
    print(f"교수자 모드 비밀번호를 정합니다. {MIN_LENGTH}자 이상, 문장형(예: 간호정보학2026가을학기)을 권합니다.")
    print("입력한 글자는 화면에 보이지 않습니다. 사이트에는 되돌릴 수 없게 변환한 값(해시)만 올라갑니다.")
    first = getpass.getpass("새 비밀번호: ")
    if len(first) < MIN_LENGTH:
        print(f"⚠ {MIN_LENGTH}자 이상으로 정해 주세요.")
        return False
    if getpass.getpass("한 번 더 입력: ") != first:
        print("⚠ 두 비밀번호가 다릅니다. 다시 시도해 주세요.")
        return False
    salt = secrets.token_hex(16)
    write({"salt": salt, "iterations": ITERATIONS, "hash": hash_password(first, salt)})
    print("✅ 비밀번호를 설정했습니다. 사이트에 올리면 교수자 모드를 켤 때 이 비밀번호를 묻습니다.")
    print("   (이미 교수자 모드를 켜 둔 브라우저도 다시 입력해야 합니다)")
    return True


if __name__ == "__main__":
    main()
