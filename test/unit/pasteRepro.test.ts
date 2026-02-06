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
});
