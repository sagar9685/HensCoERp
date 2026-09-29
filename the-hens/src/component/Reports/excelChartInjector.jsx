// excelChartInjector.js
// Adds real, native Excel bar charts to an .xlsx buffer produced by SheetJS (xlsx).
// Works by injecting the underlying chart/drawing XML parts directly into the
// workbook zip (SheetJS's free "xlsx" package cannot write charts itself).
//
// npm install jszip
//
// Tested: opens cleanly in LibreOffice/Excel, charts render with correct
// categories, series colors, and legend.

import JSZip from "jszip";

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function numPts(values) {
  return values
    .map((v, i) => `<c:pt idx="${i}"><c:v>${Number(v) || 0}</c:v></c:pt>`)
    .join("");
}

function strPts(values) {
  return values
    .map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`)
    .join("");
}

function buildBarChartXml({ title, sheetName, catRef, categories, series }) {
  const seriesXml = series
    .map(
      (s, idx) => `
    <c:ser>
      <c:idx val="${idx}"/>
      <c:order val="${idx}"/>
      <c:tx>
        <c:strRef>
          <c:f>'${sheetName}'!${s.nameRef}</c:f>
          <c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${esc(s.name)}</c:v></c:pt></c:strCache>
        </c:strRef>
      </c:tx>
      <c:invertIfNegative val="0"/>
      <c:cat>
        <c:strRef>
          <c:f>'${sheetName}'!${catRef}</c:f>
          <c:strCache><c:ptCount val="${categories.length}"/>${strPts(categories)}</c:strCache>
        </c:strRef>
      </c:cat>
      <c:val>
        <c:numRef>
          <c:f>'${sheetName}'!${s.valRef}</c:f>
          <c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${s.values.length}"/>${numPts(s.values)}</c:numCache>
        </c:numRef>
      </c:val>
    </c:ser>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title>
      <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US"/><a:t>${esc(title)}</a:t></a:r></a:p></c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:barChart>
        <c:barDir val="col"/>
        <c:grouping val="clustered"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:axId val="111111111"/>
        <c:axId val="222222222"/>
      </c:barChart>
      <c:catAx>
        <c:axId val="111111111"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="b"/>
        <c:crossAx val="222222222"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="222222222"/>
        <c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/>
        <c:axPos val="l"/>
        <c:crossAx val="111111111"/>
      </c:valAx>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="b"/>
      <c:overlay val="0"/>
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function buildDrawingXml(anchors) {
  const frames = anchors
    .map(
      (a, i) => `
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>${a.fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${a.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${i + 2}" name="${esc(a.name)}"/>
        <xdr:cNvGraphicFramePr/>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${a.chartRelId}"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
${frames}
</xdr:wsDr>`;
}

/**
 * Injects one or more native bar charts into an xlsx buffer produced by SheetJS.
 *
 * @param {ArrayBuffer|Uint8Array} xlsxBuffer - output of XLSX.write(wb, {type:"array"})
 * @param {Object} options
 * @param {string} options.sheetName - exact tab name the charts should attach to
 * @param {Array}  options.charts - [{
 *     title: string,
 *     catRef: "$A$5:$A$8"              // range of category labels (e.g. week names)
 *     categories: ["Week 1", ...],      // cached values (same order as catRef)
 *     series: [{
 *        name: "Tray",
 *        nameRef: "$B$4",               // cell holding the series/column header
 *        valRef: "$B$5:$B$8",           // range of that series' values
 *        values: [2567, 3496, 3313, 3280],
 *     }, ...],
 *     anchor: { fromCol, fromRow, toCol, toRow } // 0-indexed grid position for the chart
 *   }]
 * @returns {Promise<ArrayBuffer>} final xlsx file bytes, ready to wrap in a Blob
 */
export async function addChartsToWorkbook(xlsxBuffer, { sheetName, charts }) {
  const zip = await JSZip.loadAsync(xlsxBuffer);

  const workbookXml = await zip.file("xl/workbook.xml").async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels").async("string");

  const sheetMatch =
    new RegExp(`<sheet[^>]*name="${sheetName}"[^>]*r:id="(rId\\d+)"`).exec(
      workbookXml,
    ) ||
    new RegExp(`<sheet[^>]*r:id="(rId\\d+)"[^>]*name="${sheetName}"`).exec(
      workbookXml,
    );
  if (!sheetMatch)
    throw new Error(`Sheet "${sheetName}" not found in workbook.xml`);
  const sheetRid = sheetMatch[1];

  const targetMatch = new RegExp(
    `<Relationship[^>]*Id="${sheetRid}"[^>]*Target="([^"]+)"`,
  ).exec(relsXml);
  if (!targetMatch) throw new Error("Could not resolve sheet target path");
  const sheetPath = "xl/" + targetMatch[1].replace(/^\/?(xl\/)?/, "");
  const sheetFileName = sheetPath.split("/").pop();

  const drawingAnchors = [];
  charts.forEach((chart, idx) => {
    const chartIndex = idx + 1;
    const chartXml = buildBarChartXml({ ...chart, sheetName });
    zip.file(`xl/charts/chart${chartIndex}.xml`, chartXml);
    drawingAnchors.push({
      chartRelId: `rId${chartIndex}`,
      fromCol: chart.anchor.fromCol,
      fromRow: chart.anchor.fromRow,
      toCol: chart.anchor.toCol,
      toRow: chart.anchor.toRow,
      name: chart.title,
    });
  });

  const drawingRels = charts
    .map(
      (_, idx) =>
        `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${idx + 1}.xml"/>`,
    )
    .join("");

  zip.file(
    "xl/drawings/_rels/drawing1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drawingRels}</Relationships>`,
  );
  zip.file("xl/drawings/drawing1.xml", buildDrawingXml(drawingAnchors));

  let sheetXml = await zip.file(sheetPath).async("string");
  const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`;

  let sheetRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;
  const existingRelsFile = zip.file(sheetRelsPath);
  if (existingRelsFile) sheetRelsXml = await existingRelsFile.async("string");

  const existingIds = (sheetRelsXml.match(/Id="rId(\d+)"/g) || []).map((m) =>
    parseInt(m.match(/\d+/)[0], 10),
  );
  const newRid =
    "rId" + (existingIds.length ? Math.max(...existingIds) + 1 : 1);

  sheetRelsXml = sheetRelsXml.replace(
    "</Relationships>",
    `<Relationship Id="${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`,
  );
  zip.file(sheetRelsPath, sheetRelsXml);

  if (!/<drawing /.test(sheetXml)) {
    sheetXml = sheetXml.replace(
      "</worksheet>",
      `<drawing r:id="${newRid}"/></worksheet>`,
    );
  }
  zip.file(sheetPath, sheetXml);

  let contentTypes = await zip.file("[Content_Types].xml").async("string");
  let additions = "";
  if (!contentTypes.includes("/xl/drawings/drawing1.xml")) {
    additions += `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;
  }
  charts.forEach((_, idx) => {
    additions += `<Override PartName="/xl/charts/chart${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`;
  });
  contentTypes = contentTypes.replace("</Types>", `${additions}</Types>`);
  zip.file("[Content_Types].xml", contentTypes);

  return zip.generateAsync({ type: "arraybuffer" });
}
