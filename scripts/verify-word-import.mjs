import JSZip from "jszip";
import mammoth from "mammoth/mammoth.browser.js";

const imageBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAIklEQVR42mP8z8AARLJgwiA+YBQjRgYGBgYGBgYAl4cCFSHEXYQAAAAASUVORK5CYII=";

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function paragraph(text, style) {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`;
}

async function createFixtureDocx() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rLink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/blog-source" TargetMode="External"/>
  <Relationship Id="rImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/diagram.png"/>
</Relationships>`,
  );
  zip.file("word/media/diagram.png", imageBase64, { base64: true });
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    ${paragraph("Fixture Blog Title", "Title")}
    ${paragraph("This is the actual first paragraph of the blog post body.")}
    ${paragraph("This is the second paragraph with details that must appear in the content field.")}
    <w:p><w:r><w:t>Reference link: </w:t></w:r><w:hyperlink r:id="rLink1"><w:r><w:t>portfolio source</w:t></w:r></w:hyperlink></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>First imported bullet item</w:t></w:r></w:p>
    <w:tbl>
      <w:tr><w:tc>${paragraph("Metric")}</w:tc><w:tc>${paragraph("Value")}</w:tc></w:tr>
      <w:tr><w:tc>${paragraph("Automation")}</w:tc><w:tc>${paragraph("Working")}</w:tc></w:tr>
    </w:tbl>
    <w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="rImage1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
  </w:body>
</w:document>`,
  );

  return zip.generateAsync({ type: "nodebuffer" });
}

const docx = await createFixtureDocx();
const result = await mammoth.convertToHtml(
  { arrayBuffer: docx.buffer.slice(docx.byteOffset, docx.byteOffset + docx.byteLength) },
  {
    convertImage: mammoth.images.imgElement(async (image) => ({
      src: `data:${image.contentType};base64,${await image.read("base64")}`,
      alt: image.altText || "Imported Word diagram",
    })),
    includeDefaultStyleMap: true,
    styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
    ],
  },
);

const required = [
  "Fixture Blog Title",
  "actual first paragraph",
  "second paragraph with details",
  "portfolio source",
  "First imported bullet item",
  "Automation",
  "data:image/png;base64,",
];

const missing = required.filter((item) => !result.value.includes(item));
if (missing.length) {
  console.error(result.value);
  throw new Error(`Word import fixture conversion missed: ${missing.join(", ")}`);
}

console.log("Word import fixture conversion includes title, body, link text, table text, and image data URL.");
