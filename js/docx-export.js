// 학습노트 → Word(.docx). 구글 드라이브에 올려 'Google 문서로 열기'로 편집할 수 있다.
// 최소 WordprocessingML(문서·스타일·하이퍼링크)만 만들고 압축은 JSZip(js/vendor)이 맡는다.
window.NT = window.NT || {};

NT.docx = (() => {
  const JSZIP_SRC = "js/vendor/jszip.min.js";
  const FONT = "Malgun Gothic";
  const MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const xmlEsc = (s) => String(s ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const run = (text, { bold = false, color } = {}) =>
    `<w:r>${bold || color ? `<w:rPr>${bold ? "<w:b/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}</w:rPr>` : ""}` +
    `<w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;

  const para = (content, style) =>
    `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}${content}</w:p>`;

  const text = (s, style) => para(run(s), style);
  const lines = (s) => String(s).split(/\r?\n/).map((l) => text(l)).join("");
  const bullet = (s) => para(run(`• ${s}`), "ListBullet");

  const link = (rid, label) =>
    `<w:hyperlink r:id="${rid}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t xml:space="preserve">${xmlEsc(label)}</w:t></w:r></w:hyperlink>`;

  // 노트 속 [m:ss]마다 하이퍼링크 관계 id를 붙인다
  const stampLinks = (entries) => entries.flatMap(({ video, note }, i) =>
    NT.stamps.parse(note.text).map((st, j) => ({ rid: `rStamp${i}_${j}`, label: st.label, url: NT.stamps.url(video.id, st.sec), entry: i })));

  const submitter = (student, exportedAt) => [
    text("제출자 정보", "Heading2"),
    para(run("분반: ", { bold: true }) + run(student.section || "-")),
    para(run("학번: ", { bold: true }) + run(student.id || "(미입력)")),
    para(run("이름: ", { bold: true }) + run(student.name || "(미입력)")),
    para(run("제출 파일 생성: ", { bold: true }) + run(exportedAt)),
  ].join("");

  const progressBlock = (progress) => (progress ? [
    text("학습 현황", "Heading2"),
    para(run(`로드맵 영상 시청: ${progress.watched} / ${progress.total}편 · 학습노트 ${progress.notes}개`)),
    para(run(`주차별 퀴즈: ${progress.quizDone} / ${progress.quizTotal}주 응시 · 평균 최고 점수 ${progress.quizAvg}%`)),
    ...progress.weeks.filter((w) => w.quiz).map((w) => bullet(`${w.week}주차 ${w.title} — 최고 ${w.quiz.best}/${w.quiz.total}점 (${w.quiz.tries}회 응시)`)),
  ].join("") : "");

  /** @param {{video: object, note: {text: string, at: number}}[]} entries */
  const documentXml = (entries, exportedAt, { student, progress } = {}) => {
    const links = stampLinks(entries);
    const body = [
      text("NurTube 학습노트", "Title"),
      text(`AI융합 간호정보학 · 내보낸 날짜: ${exportedAt}`, "Subtitle"),
      student ? submitter(student, exportedAt) : "",
      progressBlock(progress),
      ...entries.map(({ video: v, note }, i) => [
        text(v.t, "Heading1"),
        para(run(`${v.ch} · ${v.dur} · `) + link(`rLink${i}`, `https://www.youtube.com/watch?v=${v.id}`)),
        para(run(`노트 작성: ${new Date(note.at).toLocaleString("ko-KR")}`, { color: "96637A" })),
        text("영상 요약", "Heading2"), text(v.sum),
        text("토론 질문", "Heading2"), text(v.q),
        text("내 학습노트", "Heading2"), lines(note.text),
        ...(() => {
          const mine = links.filter((l) => l.entry === i);
          return mine.length ? [para(run("영상 속 시간 링크: ", { bold: true }) + mine.map((l) => link(l.rid, `[${l.label}]`)).join(run("  ")))] : [];
        })(),
        text("답변 가이드 (참고)", "Heading2"), ...(v.a || []).map(bullet),
      ].join("")),
    ].join("");
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      `<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
      '<w:pgMar w:top="1440" w:right="1304" w:bottom="1440" w:left="1304" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
      "</w:body></w:document>";
  };

  const style = (id, name, { size, bold, color, before = 0, after = 120, basedOn = "Normal" }) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="${basedOn}"/>` +
    `<w:pPr><w:spacing w:before="${before}" w:after="${after}"/>${id.startsWith("Heading") ? `<w:outlineLvl w:val="${id.slice(-1) - 1}"/>` : ""}</w:pPr>` +
    `<w:rPr>${bold ? "<w:b/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}<w:sz w:val="${size}"/></w:rPr></w:style>`;

  const stylesXml = () =>
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/>` +
    '<w:sz w:val="22"/><w:lang w:val="ko-KR" w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
    style("Title", "Title", { size: 40, bold: true, color: "A61E4D", after: 80 }) +
    style("Subtitle", "Subtitle", { size: 20, color: "96637A", after: 240 }) +
    style("Heading1", "heading 1", { size: 30, bold: true, color: "43182B", before: 360, after: 120 }) +
    style("Heading2", "heading 2", { size: 24, bold: true, color: "D6336C", before: 200, after: 80 }) +
    style("ListBullet", "List Bullet", { size: 22, after: 60 }) +
    '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/>' +
    '<w:rPr><w:color w:val="D6336C"/><w:u w:val="single"/></w:rPr></w:style>' +
    "</w:styles>";

  const docRelsXml = (entries, links) =>
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    entries.map(({ video }, i) =>
      `<Relationship Id="rLink${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" ` +
      `Target="https://www.youtube.com/watch?v=${xmlEsc(video.id)}" TargetMode="External"/>`).join("") +
    links.map((l) => `<Relationship Id="${l.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" ` +
      `Target="${xmlEsc(l.url)}" TargetMode="External"/>`).join("") +
    "</Relationships>";

  const CONTENT_TYPES =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    "</Types>";

  const ROOT_RELS =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    "</Relationships>";

  const loadJSZip = () => (window.JSZip ? Promise.resolve(window.JSZip) : new Promise((resolve, reject) => {
    const s = Object.assign(document.createElement("script"), { src: JSZIP_SRC });
    s.onload = () => (window.JSZip ? resolve(window.JSZip) : reject(new Error("JSZip을 불러오지 못했습니다.")));
    s.onerror = () => reject(new Error(`${JSZIP_SRC} 파일을 불러오지 못했습니다.`));
    document.head.appendChild(s);
  }));

  /** @returns {Promise<Blob>} */
  const build = async (entries, meta = {}) => {
    const JSZip = await loadJSZip();
    const zip = new JSZip();
    const add = (path, xml) => zip.file(path, xml, { createFolders: false });
    add("[Content_Types].xml", CONTENT_TYPES);
    add("_rels/.rels", ROOT_RELS);
    add("word/document.xml", documentXml(entries, new Date().toLocaleString("ko-KR"), meta));
    add("word/styles.xml", stylesXml());
    add("word/_rels/document.xml.rels", docRelsXml(entries, stampLinks(entries)));
    return zip.generateAsync({ type: "blob", mimeType: MIME, compression: "DEFLATE" });
  };

  return { build, documentXml };
})();
