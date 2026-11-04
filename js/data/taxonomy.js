// 주제 분류 · 재생목록 · 15주 로드맵 (AI융합 간호정보학)
window.NT = window.NT || {};

NT.AREAS = [
  { id: "informatics", name: "간호정보학 기반", icon: "🩺",
    desc: "간호정보학의 정의·역할, EHR과 간호기록, 표준용어와 상호운용성." },
  { id: "ai", name: "AI 원리", icon: "🧠",
    desc: "머신러닝·딥러닝, LLM과 생성형 AI의 작동 원리와 한계(환각)." },
  { id: "practice", name: "AI 간호 실무", icon: "🏥",
    desc: "AI 간호기록, 예측·조기경보·CDSS, 스마트병원·가상간호, 디지털 헬스케어·원격의료, AI 활용 학습." },
  { id: "governance", name: "윤리·규제·커리어", icon: "⚖️",
    desc: "편향·설명가능성·책임, 국내외 의료 AI 규제, 간호정보 진로." },
];

NT.TOPICS = [
  { id: "ni", area: "informatics", name: "간호정보학 개론", color: "#10b981" },
  { id: "ehr", area: "informatics", name: "EHR·간호기록", color: "#22c55e" },
  { id: "std", area: "informatics", name: "표준·상호운용성·데이터모델", color: "#84cc16" },
  { id: "aibasic", area: "ai", name: "AI·머신러닝·NLP 기초", color: "#f97316" },
  { id: "genai", area: "ai", name: "LLM·생성형 AI·환각", color: "#ef4444" },
  { id: "ainurse", area: "practice", name: "AI 간호 현장 사례", color: "#f43f5e" },
  { id: "cds", area: "practice", name: "예측·조기경보·CDSS", color: "#eab308" },
  { id: "smart", area: "practice", name: "스마트병원·가상간호·원격모니터링", color: "#06b6d4" },
  { id: "study", area: "practice", name: "간호학생의 AI 활용·프롬프트", color: "#0ea5e9" },
  { id: "telehealth", area: "practice", name: "디지털 헬스케어·원격의료", color: "#14b8a6" },
  { id: "ethics", area: "governance", name: "AI 윤리·편향·설명가능성", color: "#a855f7" },
  { id: "reg", area: "governance", name: "규제·개인정보·책임", color: "#6366f1" },
  { id: "career", area: "governance", name: "간호정보 커리어", color: "#64748b" },
];

NT.LEVELS = { 1: "입문", 2: "중급", 3: "심화" };

NT.ROADMAP = [
  { week: 1, title: "오리엔테이션: 간호정보학과 AI 융합", ids: ["ub1ScYHH3GE", "W9Gb6RSYaJk", "ulue5yFfZM0"] },
  { week: 2, title: "간호정보학의 이론과 역할", ids: ["yRbZkUlETp4", "MB_yyDerwGs", "psPsRnXmJY4"] },
  { week: 3, title: "EHR과 간호기록: AI의 원료가 되는 데이터", ids: ["dgVaB2olgA4", "2Q9-bDifI-Q", "6ew2bxgJ0bE", "SlQ60KaLeHg"] },
  { week: 4, title: "표준용어: 간호용어(NANDA-I·NIC·NOC·ICNP·Omaha)와 SNOMED CT", ids: ["0Mz5Xa1cUvI", "nOTIIYVlYjM", "60E7ESDiGco", "meBtk8IcmuY", "4RkIGNLvQZI", "ELgXwo324pk"],
    extra: { href: "#/terms", label: "📖 표준 간호용어 12종 정리" } },
  { week: 5, title: "상호운용성과 HL7 FHIR", ids: ["AkqNuxVBQKY", "NOojX8LvleM", "yQSY957s_GY", "CtpkvtbgXE8"] },
  { week: 6, title: "의료 데이터와 공통데이터모델", ids: ["qQoChZfrtY0", "vof7x8r_ZUA", "oyhpIWa9w1Y"] },
  { week: 7, title: "AI·머신러닝 기초", ids: ["OIY2tWT3HHI", "jPs3n9Vou9c", "PeMlggyqz0Y", "VKnoyiNxflk"] },
  { week: 8, title: "의료 AI 개발과 평가의 현실", ids: ["UZEstizNxkg", "zpcOjNtd-70", "7rs79MUDId0"] },
  { week: 9, title: "LLM은 어떻게 답을 만드는가", ids: ["HnvitMTkXro", "3dEzMRL5VMk", "g38aoGttLhI"] },
  { week: 10, title: "환각과 의료 LLM의 한계", ids: ["cfqtFvWOfg0", "005JLRt3gXI", "k_-Z_TkHMqA", "q60XS_uMirY"] },
  { week: 11, title: "간호학생의 AI 활용과 프롬프트", ids: ["7BXSUZNRqd4", "szaLcEsqGyA", "SsBq-hmPYeU", "zriuIpOSL2g"] },
  { week: 12, title: "AI 간호기록과 앰비언트 AI", ids: ["KMSAVX08r9o", "5mdsh1jE_nU", "T4os0n5HvFY", "i4C-8Gnb-ec"] },
  { week: 13, title: "예측 AI·조기경보·알람 피로", ids: ["-5juHZcXfVQ", "A1NJdP_0gxE", "ddOU_jaPmqU", "ll5LY7wI_Xc"] },
  { week: 14, title: "AI 윤리·규제·거버넌스", ids: ["oaNodDadWyg", "jFHPEQi55Ko", "1O7Ov1nxMc0", "5fzN_YzAy2I", "s_rxOnCt3HQ", "13PRP6FDRh8"] },
  { week: 15, title: "디지털 헬스케어·원격의료와 미래 간호", ids: ["9mZ61Ya-RVY", "ml0W0DJZYzk", "SqVaXDFFSzw", "eEyLLKRJTok", "Rqy7vsh5bpg", "YCLZT4iZ62A", "JGkR497gqqk"] },
];

NT.PLAYLISTS = [
  { id: "roadmap", title: "15주 AI융합 간호정보학 로드맵", desc: "한 학기 수업 순서대로 정리한 주차별 시청 목록.",
    ids: NT.ROADMAP.flatMap((w) => w.ids) },
  { id: "top", title: "반응 점수 TOP 20", desc: "국내외 시청자 댓글·좋아요 분석에서 가장 높은 평가를 받은 영상.", dynamic: "top" },
  { id: "nursing-terms", title: "표준 간호용어: NANDA-I · NIC · NOC · ICNP · CCC · Omaha", desc: "ANA 인정 간호 용어체계를 설명하는 국내외 영상.",
    ids: ["nOTIIYVlYjM", "60E7ESDiGco", "meBtk8IcmuY", "RK_8mzzYKwM", "Lsm9iOhUKvw", "hZ6OM2bEiIE", "oIAfQptjYJ4"] },
  { id: "llm", title: "LLM 제대로 이해하기: 원리 → 환각 → 의료 적용", desc: "생성형 AI를 쓰기 전에 알아야 할 원리와 한계.",
    ids: ["HnvitMTkXro", "3dEzMRL5VMk", "g38aoGttLhI", "cfqtFvWOfg0", "005JLRt3gXI", "k_-Z_TkHMqA", "5mdsh1jE_nU", "q60XS_uMirY"] },
  { id: "standards", title: "표준 마스터: SNOMED CT · HL7 FHIR · OMOP", desc: "AI가 쓸 수 있는 데이터를 만드는 표준화의 핵심.",
    ids: ["0Mz5Xa1cUvI", "4RkIGNLvQZI", "ELgXwo324pk", "AkqNuxVBQKY", "NOojX8LvleM", "FuNjisHlKoE", "CtpkvtbgXE8", "wxXe1g2YjHo", "qQoChZfrtY0"] },
  { id: "telehealth", title: "디지털 헬스케어·원격의료", desc: "디지털 헬스의 개념, 2026 비대면 진료 제도, 통합돌봄·재택의료, 원격 모니터링, 디지털 치료제.",
    ids: ["9mZ61Ya-RVY", "3YVjvDTFqiI", "ml0W0DJZYzk", "N1LlAwhyWRk", "SqVaXDFFSzw", "WM8TNXyANVo", "eEyLLKRJTok", "diDL4CNOEsM", "Rqy7vsh5bpg", "N2dTFq3BDdw", "5GZ2Y6wLFpU", "YCLZT4iZ62A", "FAvGj46rth8", "JGkR497gqqk"] },
  { id: "field", title: "병동 속 AI: 국내외 현장 사례", desc: "음성 간호기록, 앰비언트 AI, 실시간 모니터링, 가상간호.",
    ids: ["KMSAVX08r9o", "5mdsh1jE_nU", "5wFddEeVnqU", "f3g5pi55620", "T4os0n5HvFY", "i4C-8Gnb-ec", "xl0bUi9yvG8", "21sjQ1OPLs8", "HhTGrGcVl-s"] },
  { id: "career", title: "간호정보 전문가로 가는 길", desc: "국내외 간호정보 전문가·AI 개발 간호사의 이야기.",
    ids: ["ulue5yFfZM0", "ll2OgP_hEsA", "JGkR497gqqk", "6iT-DdRZC44", "yRbZkUlETp4", "WBAyqTQn28w", "f5w3Ev2M_O0", "GObjZ7W0I7M", "T4os0n5HvFY"] },
  { id: "deep", title: "심화 강의 모음 (대학원·자기주도)", desc: "30분 이상 강의·세미나. 보고서·발표 준비용.",
    ids: ["vof7x8r_ZUA", "UZEstizNxkg", "leDBwoaWQ6E", "7rs79MUDId0", "oaNodDadWyg", "WUPjI4WM8-M", "-5juHZcXfVQ", "2Pb7HuZlm2Y", "wxXe1g2YjHo"] },
];
