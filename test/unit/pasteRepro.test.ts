/**
 * Reproduction test: Teams/Loop paste producing empty markdown
 */
import { htmlToMarkdown } from '../../src/conversion/htmlToMarkdown';

describe('Teams paste reproduction', () => {
  test('simple Teams-like HTML with divs and spans produces output', () => {
    const html = `<html>
<head><meta charset="utf-8"><style>.container { padding: 10px; }</style></head>
<body>
<div class="container">
  <h2>📅 sync – SDD for SRE</h2>
  <p>Feb 3, 2026, 2:35–3:00 PM – Teams Video Call</p>
  <p>Follow-up on SRE's Spec-Driven Development adoption initiative.</p>
  <h3>🧭 Meeting Overview</h3>
  <ul>
    <li>🚀 SDD adoption is underway</li>
    <li>💡 Spec Kit gaining traction</li>
  </ul>
  <table>
    <tr><td>Task</td><td>Status</td><td>ETA</td></tr>
    <tr><td>Populate SpecKit inventory</td><td>⏳ In Progress</td><td>This week</td></tr>
    <tr><td>Review wiki draft</td><td>⏳ In Progress</td><td>2–3 days</td></tr>
  </table>
</div>
</body>
</html>`;
    const result = htmlToMarkdown(html);
    console.log('=== RESULT LENGTH:', result.length, '===');
    console.log('=== RESULT ===\n', result, '\n=== END ===');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('SDD for SRE');
    expect(result).toContain('Meeting Overview');
    expect(result).toContain('Populate SpecKit');
  });

  test('Teams HTML with NO body tag', () => {
    const html = `<div class="teams-content">
  <h2>Meeting Title</h2>
  <p>Discussion about SDD adoption.</p>
  <ul><li>Item one</li><li>Item two</li></ul>
</div>`;
    const result = htmlToMarkdown(html);
    console.log('=== NO-BODY RESULT LENGTH:', result.length, '===');
    console.log('=== NO-BODY RESULT ===\n', result, '\n=== END ===');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('Meeting Title');
  });

  test('Teams HTML with rich content and encoded entities', () => {
    // Loop/Teams sometimes sends HTML where internal content is entity-encoded
    const html = `<html><head><style>body{font-family:Segoe UI;}</style></head><body>
<div data-type="loop-content">
  <h1>📅 sync – SDD for SRE</h1>
  <p>Feb 3, 2026</p>
  <p>Follow-up on SRE&apos;s <strong>Spec-Driven Development</strong> (SDD) adoption initiative.</p>
  <h2>🧭 Meeting Overview</h2>
  <p>🚀 SDD adoption is underway – Initial Spec Kit onboarding in progress</p>
  <p>Progress: Three key repositories have Spec Kit onboarding pull requests issued.</p>
  <table>
    <tr><th>Task</th><th>Owner(s)</th><th>Status</th><th>ETA</th><th>Source</th></tr>
    <tr><td>Compile list of all other SRE repos</td><td>William Chen</td><td>❗ Pending</td><td>End of week</td><td>Action item from last sync</td></tr>
    <tr><td>Create SDD adoption tracking tables</td><td>Joo Hyeon Ryu</td><td>✅ Completed</td><td>Done</td><td>Joo delivered draft</td></tr>
  </table>
</div>
</body></html>`;
    const result = htmlToMarkdown(html);
    console.log('=== RICH RESULT LENGTH:', result.length, '===');
    console.log('=== RICH RESULT ===\n', result, '\n=== END ===');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('SDD for SRE');
    expect(result).toContain('Meeting Overview');
    expect(result).toContain('William Chen');
  });

  test('Loop/Teams HTML with iframe srcdoc', () => {
    const html = `<div>
<p>Pre-iframe text</p>
<iframe srcdoc="&lt;html&gt;&lt;body&gt;&lt;div class=&quot;insights-container&quot;&gt;&lt;p&gt;SRE adoption update&lt;/p&gt;&lt;/div&gt;&lt;/body&gt;&lt;/html&gt;"></iframe>
<p>Post-iframe text</p>
</div>`;
    const result = htmlToMarkdown(html);
    console.log('=== IFRAME RESULT LENGTH:', result.length, '===');
    console.log('=== IFRAME RESULT ===\n', result, '\n=== END ===');
    expect(result.length).toBeGreaterThan(0);
  });

  test('Teams/Loop nested <html> inside clipboard body does NOT produce empty output', () => {
    // Exact structure captured from real Teams/Loop paste:
    // The clipboard wrapper has <html><body><!--StartFragment-->...<!--EndFragment--></body></html>
    // BUT inside that is ANOTHER <html contenteditable="false"> wrapping the content.
    // The content itself lives inside <tbody><tr><td><div>...</div></td></tr></tbody> with NO <table>.
    const html = `<html>
<body>
<!--StartFragment--><html contenteditable="false"><head><style>
.loop-css-class { font-family: Segoe UI; }
</style></head><tbody contenteditable="false"><tr><td style="vertical-align: top;">
<div style="font-family:'Segoe UI';font-size:14px;">
<h2>📅 sync – SDD for SRE</h2>
<p>Feb 3, 2026, 2:35–3:00 PM – Teams Video Call</p>
<h3>🧭 Meeting Overview</h3>
<ul>
<li>🚀 SDD adoption is underway</li>
<li>💡 Spec Kit gaining traction</li>
</ul>
<table>
<tr><td>Task</td><td>Status</td></tr>
<tr><td>Populate SpecKit inventory</td><td>⏳ In Progress</td></tr>
</table>
<details>
<summary>📎 Appendix</summary>
<p>Additional notes here.</p>
</details>
</div>
</td></tr><tr></tr></tbody></html><!--EndFragment-->
</body>
</html>`;
    const result = htmlToMarkdown(html);
    console.log('=== NESTED HTML RESULT LENGTH:', result.length, '===');
    console.log('=== NESTED HTML RESULT ===\n', result, '\n=== END ===');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('SDD for SRE');
    expect(result).toContain('Meeting Overview');
    expect(result).toContain('Populate SpecKit');
  });

  test('Minimal nested <html> pattern: content must survive discardWrapperTags', () => {
    // Minimal reproduction: nested <html>..content..</html> inside <body>
    const html = `<html><body><!--StartFragment--><html contenteditable="false"><head></head><div><p>Hello World</p></div></html><!--EndFragment--></body></html>`;
    const result = htmlToMarkdown(html);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('Hello World');
  });

  test('Loop encoded HTML triggers entity decoding correctly', () => {
    // This simulates what happens when Loop's fluid content is entity-encoded
    const html = `&lt;div class=&quot;fluid-content&quot;&gt;
&lt;h2&gt;Meeting Notes&lt;/h2&gt;
&lt;p&gt;Important discussion about SDD&lt;/p&gt;
&lt;/div&gt;`;
    const result = htmlToMarkdown(html);
    console.log('=== ENCODED RESULT LENGTH:', result.length, '===');
    console.log('=== ENCODED RESULT ===\n', result, '\n=== END ===');
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain('Meeting Notes');
  });

  test('Loop fai-Citation links become proper markdown links', () => {
    // Real Loop citation: <a role="button" class="fai-Citation" data-grouped-citations="[{...}]">
    // with spans inside for the icon + document name. No href attribute.
    const html = `<html><body>
<p>See the onboarding guide
<a role="button" class="fai-Citation" data-grouped-citations="[{&quot;index&quot;:&quot;1&quot;,&quot;url&quot;:&quot;https://microsoft.sharepoint.com/teams/project/Shared%20Documents/Onboarding%20Guide.docx&quot;,&quot;name&quot;:&quot;Onboarding Guide&quot;,&quot;type&quot;:&quot;Word&quot;}]">
<span class="___uomype0"><svg viewBox="0 0 20 20"><path d="M0 0h20v20H0z"/></svg></span>
<span class="___a76bdi0">Onboarding Guide</span>
</a> for details.</p>
</body></html>`;
    const result = htmlToMarkdown(html);
    console.log('=== CITATION RESULT ===\n', result, '\n=== END ===');
    // Should contain a proper markdown link with the document name and URL
    expect(result).toContain('[Onboarding Guide');
    expect(result).toContain('https://microsoft.sharepoint.com/teams/project/Shared%20Documents/Onboarding%20Guide.docx');
    // Should NOT contain the raw SVG icon text
    expect(result).not.toContain('svg');
    expect(result).not.toContain('viewBox');
  });

  test('Loop fai-Citation with multiple grouped citations', () => {
    // Some citations group multiple documents with a "+N" badge
    const html = `<html><body>
<p>Related documents:
<a role="button" class="fai-Citation" data-grouped-citations="[{&quot;index&quot;:&quot;1&quot;,&quot;url&quot;:&quot;https://sharepoint.com/doc1.docx&quot;,&quot;name&quot;:&quot;Architecture Overview&quot;,&quot;type&quot;:&quot;Word&quot;},{&quot;index&quot;:&quot;2&quot;,&quot;url&quot;:&quot;https://sharepoint.com/doc2.pptx&quot;,&quot;name&quot;:&quot;Modernization Ideas&quot;,&quot;type&quot;:&quot;PowerPoint&quot;}]">
<span class="___uomype0"><svg viewBox="0 0 20 20"><path d="M0 0h20v20H0z"/></svg></span>
<span class="___a76bdi0">Architecture Overview</span>
<span class="___1vi0vkd">+1</span>
</a> for context.</p>
</body></html>`;
    const result = htmlToMarkdown(html);
    console.log('=== MULTI-CITATION RESULT ===\n', result, '\n=== END ===');
    // Should produce links for both documents
    expect(result).toContain('[Architecture Overview');
    expect(result).toContain('https://sharepoint.com/doc1.docx');
    expect(result).toContain('[Modernization Ideas');
    expect(result).toContain('https://sharepoint.com/doc2.pptx');
    // Should NOT contain the +1 badge
    expect(result).not.toContain('+1');
  });

  test('Loop code-preview blocks: toolbar chrome is stripped, content preserved', () => {
    // Real Loop code-preview: scriptor-component-code-block div with toolbar buttons
    // and an iframe srcdoc containing a TL;DR card
    const html = `<html><body>
<p>Here is the summary:</p>
<div class="___1ta0mgc">
  <div role="group" aria-label="Code Preview">
    <div class="fui-FluentProvider">
      <div class="scriptor-component-code-block">
        <div class="___1f87bw6">
          <button class="fui-Button" aria-label="Copy preview">Copy</button>
          <button class="fui-MenuButton" aria-label="Display options">Display</button>
          <button class="fui-MenuButton" aria-label="Export options">Export</button>
        </div>
        <iframe srcdoc="&lt;html&gt;&lt;body&gt;&lt;h2&gt;TL;DR Summary&lt;/h2&gt;&lt;p&gt;The project is on track with three key milestones completed.&lt;/p&gt;&lt;/body&gt;&lt;/html&gt;"></iframe>
      </div>
    </div>
  </div>
</div>
<p>End of summary.</p>
</body></html>`;
    const result = htmlToMarkdown(html);
    console.log('=== CODE-PREVIEW RESULT ===\n', result, '\n=== END ===');
    // The TL;DR content from the iframe should be preserved
    expect(result).toContain('TL;DR Summary');
    expect(result).toContain('three key milestones');
    // Toolbar chrome should NOT appear
    expect(result).not.toContain('Copy preview');
    expect(result).not.toContain('Display options');
    expect(result).not.toContain('Export options');
    expect(result).not.toContain('fui-Button');
    // The surrounding text should still be there
    expect(result).toContain('Here is the summary');
    expect(result).toContain('End of summary');
  });

  test('Loop code-preview with insight cards in iframe', () => {
    // TL;DR card with insight-card in srcdoc
    const html = `<div>
<div class="scriptor-component-code-block">
  <div class="___1f87bw6">
    <button class="fui-Button">Copy</button>
  </div>
  <iframe srcdoc="&lt;html&gt;&lt;body&gt;&lt;div class=&quot;insights-container&quot;&gt;&lt;div class=&quot;insight-card&quot;&gt;&lt;span class=&quot;icon&quot;&gt;🚀&lt;/span&gt;&lt;h4&gt;Key Insight&lt;/h4&gt;&lt;p&gt;Adoption rate increased by 40%&lt;/p&gt;&lt;/div&gt;&lt;/div&gt;&lt;/body&gt;&lt;/html&gt;"></iframe>
</div>
</div>`;
    const result = htmlToMarkdown(html);
    console.log('=== INSIGHT-CARD RESULT ===\n', result, '\n=== END ===');
    // Insight card content should be converted (existing insight-card handling)
    expect(result).toContain('Key Insight');
    expect(result).toContain('40%');
    // Toolbar should NOT appear
    expect(result).not.toContain('Copy');
    expect(result).not.toContain('fui-Button');
  });

  test('REAL Loop citation with &amp; in URLs and many CSS classes', () => {
    // Exact structure from real Loop/Teams paste - note the &amp; in the URL within &quot; JSON
    const html = `<html><body>
<p>Some text before.<a role="button" aria-expanded="false" class="fai-Citation r1jm3di4 ___rgb2pp0 ftuwxu6 f122n59 f4d9j23 fi64zpg fmrv4ls" contenteditable="false" data-citation-group-id="citation-group-0" data-grouped-citations="[{&quot;index&quot;:&quot;1&quot;,&quot;url&quot;:&quot;https://microsoft.sharepoint.com/teams/SQLOneBox/_layouts/15/Doc.aspx?sourcedoc=%7B9CE80B23-98E5-4813-B1EA-E25D15CE0637%7D&amp;file=Onebox%20and%20Livesite%20Tools%20for%20developer%20inner%20loop.docx&amp;action=default&amp;mobileredirect=true&amp;DefaultItemOpen=1&quot;,&quot;name&quot;:&quot;Onebox and Livesite Tools for developer inner loop&quot;,&quot;type&quot;:&quot;Word&quot;}]" data-hovered="false" tabindex="-1" aria-label="Citation: Onebox and Livesite Tools for developer inner loop"><span class="___uomype0 f22iagw f122n59 f4d9j23 fd9q35j"><svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true"><path d="M11.25 2c.97 0 1.75.78 1.75 1.75v8.5c0 .97-.78 1.75-1.75 1.75H5.5z"></path></svg></span><span class="___a76bdi0 f1hu3pq6">Onebox and Livesite Tools for developer inner loop</span></a></p>
</body></html>`;
    const result = htmlToMarkdown(html);
    console.log('=== REAL CITATION RESULT ===\n', result, '\n=== END ===');
    expect(result).toContain('[Onebox and Livesite Tools for developer inner loop]');
    expect(result).toContain('https://microsoft.sharepoint.com');
    // Should NOT have raw SVG or broken brackets
    expect(result).not.toContain('svg');
    expect(result).not.toContain('viewBox');
  });

  test('REAL Loop citation with square brackets in doc name: SQL SRE [Kr]', () => {
    const html = `<html><body>
<p>See the plan.<a role="button" class="fai-Citation r1jm3di4 ___rgb2pp0" contenteditable="false" data-citation-group-id="citation-group-1" data-grouped-citations="[{&quot;index&quot;:&quot;2&quot;,&quot;url&quot;:&quot;https://microsoft.sharepoint.com/teams/sqlsre/_layouts/15/Doc.aspx?sourcedoc=%7B3C2A1BB0-D8EF-4564-B6C3-240A0E5819FB%7D&amp;file=SQL%20SRE%20[Kr]%20Tooling%20Semester%20Plan.docx&amp;action=default&amp;mobileredirect=true&amp;DefaultItemOpen=1&quot;,&quot;name&quot;:&quot;SQL SRE [Kr] Tooling Semester Plan&quot;,&quot;type&quot;:&quot;Word&quot;}]" data-hovered="false" tabindex="-1" aria-label="Citation: SQL SRE [Kr] Tooling Semester Plan"><span class="___uomype0"><svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true"><path d="M11.25 2z"></path></svg></span><span class="___a76bdi0">SQL SRE [Kr] Tooling Semester Plan</span></a></p>
</body></html>`;
    const result = htmlToMarkdown(html);
    console.log('=== BRACKET-NAME CITATION RESULT ===\n', result, '\n=== END ===');
    // Should produce a clean link, with brackets escaped in the link text
    expect(result).toContain('SQL SRE');
    expect(result).toContain('Tooling Semester Plan');
    expect(result).toContain('https://microsoft.sharepoint.com');
    // Should NOT have double brackets like ]]
    expect(result).not.toMatch(/\]\]/);
  });

  test('REAL table with markdown attribute and inline fai-Citation', () => {
    // The real table has a "markdown" attribute containing pre-rendered markdown with [N](url) citation refs
    // PLUS the rendered <tbody> has fai-Citation elements inside <td> cells
    // Both need to work: markdown attr stripped, citations in cells converted
    const html = `<html><body>
<table class="sometable" markdown="| Phase | Activities |
|---|---|
| Phase 1 | Deploy extension[1](https://sharepoint.com/doc1.docx). |" tabindex="-1">
<thead><tr><th>Phase</th><th>Activities</th></tr></thead>
<tbody><tr>
<td>Phase 1: OneBox</td>
<td>Deploy extension for testing.<a role="button" class="fai-Citation r1jm3di4 ___rgb2pp0" contenteditable="false" data-grouped-citations="[{&quot;index&quot;:&quot;1&quot;,&quot;url&quot;:&quot;https://microsoft.sharepoint.com/teams/SQLOneBox/_layouts/15/Doc.aspx?sourcedoc=%7B9CE80B23-98E5-4813-B1EA-E25D15CE0637%7D&amp;file=Onebox%20and%20Livesite%20Tools.docx&amp;action=default&quot;,&quot;name&quot;:&quot;Onebox and Livesite Tools&quot;,&quot;type&quot;:&quot;Word&quot;}]" data-hovered="false" tabindex="-1" aria-label="Citation: Onebox and Livesite Tools"><span class="___uomype0"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M11z"></path></svg></span><span class="___a76bdi0">Onebox and Livesite Tools</span></a>. Fix bugs.</td>
</tr></tbody></table>
</body></html>`;
    const result = htmlToMarkdown(html);
    console.log('=== TABLE+CITATION RESULT ===\n', result, '\n=== END ===');
    // The citation inside the <td> should be a proper link
    expect(result).toContain('Onebox and Livesite Tools');
    expect(result).toContain('Phase 1');
    // Should NOT contain the raw markdown attribute content (with [1](url))
    expect(result).not.toContain('[1](https://sharepoint');
    // Should NOT have SVG remnants
    expect(result).not.toContain('svg');
  });
});
