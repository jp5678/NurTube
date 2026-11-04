#!/bin/bash
# 더블클릭하면 NurTube 교수자 도구 메뉴가 열립니다.
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3이 필요합니다. https://www.python.org/downloads/ 에서 설치한 뒤 다시 실행하세요."
  read -r -p "Enter를 누르면 닫힙니다…"
  exit 1
fi
python3 tools/nurtube.py
