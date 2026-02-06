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
});
