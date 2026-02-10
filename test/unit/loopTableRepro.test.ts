/**
 * Reproduction test for Loop table paste issue.
 * When copying a table from Microsoft Loop, the clipboard HTML has:
 * 1. Layout wrappers (<tbody><tr><td>...) around the actual data table
 * 2. Block-level elements (<div>, <p>) inside table cells
 * 3. Lists (<ul><li>) inside table cells for multi-item notes
 * 4. <br> tags inside cells
 *
 * All of these break GFM table row formatting because Turndown
 * treats them as block-level elements, inserting newlines.
 */
import { htmlToMarkdown, resetTurndownService } from '../../src/conversion/htmlToMarkdown';

afterEach(() => {
  resetTurndownService();
});

describe('Loop table paste (reproduction)', () => {
  const LOOP_TABLE_HTML = `<html>
<body>
<!--StartFragment--><html contenteditable="false"><head><style>
html, body { margin: 0; padding: 0; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #e1e1e1; padding: 6px 8px; }
th { background-color: #f5f5f5; font-weight: 600; }
</style></head><tbody contenteditable="false"><tr><td style="vertical-align: top;">
<div style="font-family:'Segoe UI';font-size:14px;">
<table markdown="| Phase | Milestone | Status |
|---|---|---|
| Ideation/POC | One Tool | ✅ DONE |" tabindex="-1">
<thead><tr><th>Phase</th><th>Milestone</th><th>Status</th><th>ETA</th><th>Notes</th></tr></thead>
<tbody>
<tr>
<td>Ideation/POC</td>
<td>One Tool - DRIWorkbench ASC porting POC</td>
<td>✅ DONE</td>
<td>Fri, May 30, 2025</td>
<td></td>
</tr>
<tr>
<td>Perf Diagnostics</td>
<td>DRIWorkbench with ASC - perf diagnostics</td>
<td>✅ DONE</td>
<td>Tue, Jul 15, 2025</td>
<td></td>
</tr>
<tr>
<td>PrPr</td>
<td>PrPr of "One Tool" DRIWorkbench for ASC</td>
<td>🔄 In Progress</td>
<td>Fri, Jan 30</td>
<td>User testing
Telemetry
Performance benchmarking</td>
</tr>
<tr>
<td>PuPr</td>
<td>Auto-execute ASC and enrich ICM for Perf incidents (similar to old ASC)</td>
<td>✖️ Not Started</td>
<td></td>
<td>Product Backlog Item 5005399: ICM enrichment with DRIWorkbench report
Pending ETA of ETA: 02/18</td>
</tr>
</tbody>
</table>
</div>
</td></tr><tr></tr></tbody></html><!--EndFragment-->
</body>
</html>`;

  it('should produce a valid GFM table', () => {
    const result = htmlToMarkdown(LOOP_TABLE_HTML);
    console.log('=== LOOP TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');
    
    // The result should contain proper GFM table with pipe-delimited rows
    expect(result).toContain('| Phase | Milestone | Status | ETA | Notes |');
    expect(result).toContain('| --- | --- | --- | --- | --- |');
    expect(result).toContain('| Ideation/POC |');
  });

  // A simpler version without the Loop wrapper to test that tables work fine normally
  it('should handle a plain table correctly', () => {
    const plainTable = `<table>
<thead><tr><th>Phase</th><th>Milestone</th><th>Status</th></tr></thead>
<tbody>
<tr><td>Ideation/POC</td><td>One Tool</td><td>✅ DONE</td></tr>
<tr><td>PrPr</td><td>Support DBs</td><td>🔄 In Progress</td></tr>
</tbody>
</table>`;
    const result = htmlToMarkdown(plainTable);
    console.log('=== PLAIN TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');
    
    expect(result).toContain('| Phase | Milestone | Status |');
    expect(result).toContain('| --- | --- | --- |');
  });

  // Test with block-level elements inside td (Loop's actual pattern)
  it('should handle td cells containing div/p wrappers', () => {
    const blockCellTable = `<table>
<thead><tr><th><div><p>Phase</p></div></th><th><div><p>Milestone</p></div></th><th><div><p>Status</p></div></th><th><div><p>ETA</p></div></th><th><div><p>Notes</p></div></th></tr></thead>
<tbody>
<tr>
<td><div><p>Ideation/POC</p></div></td>
<td><div><p>One Tool - DRIWorkbench ASC porting POC</p></div></td>
<td><div><p>✅ DONE</p></div></td>
<td><div><p>Fri, May 30, 2025</p></div></td>
<td><div><p></p></div></td>
</tr>
<tr>
<td><div><p>PrPr</p></div></td>
<td><div><p>PrPr of "One Tool" DRIWorkbench for ASC</p></div></td>
<td><div><p>🔄 In Progress</p></div></td>
<td><div><p>Fri, Jan 30</p></div></td>
<td><div><p>User testing</p><p>Telemetry</p><p>Performance benchmarking</p></div></td>
</tr>
</tbody>
</table>`;
    const result = htmlToMarkdown(blockCellTable);
    console.log('=== BLOCK CELL TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');
    
    // Should produce valid GFM table
    expect(result).toContain('| Phase | Milestone | Status | ETA | Notes |');
    expect(result).toContain('| --- |');
  });

  // Test with div-wrapped cells (another common Loop pattern)
  it('should handle td cells containing only div wrappers', () => {
    const divCellTable = `<table>
<thead><tr><th><div>Phase</div></th><th><div>Milestone</div></th><th><div>Status</div></th></tr></thead>
<tbody>
<tr>
<td><div>Ideation/POC</div></td>
<td><div>One Tool</div></td>
<td><div>✅ DONE</div></td>
</tr>
</tbody>
</table>`;
    const result = htmlToMarkdown(divCellTable);
    console.log('=== DIV CELL TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');
    
    expect(result).toContain('| Phase | Milestone | Status |');
    expect(result).toContain('| --- |');
  });

  // Test with spans and contenteditable wrappers (Loop might use these)
  it('should handle td cells with contenteditable spans', () => {
    const spanCellTable = `<table>
<tr><td><span contenteditable="false">Phase</span></td><td><span contenteditable="false">Milestone</span></td><td><span contenteditable="false">Status</span></td></tr>
<tr><td><span contenteditable="false">Ideation/POC</span></td><td><span contenteditable="false">One Tool</span></td><td><span contenteditable="false">✅ DONE</span></td></tr>
</table>`;
    const result = htmlToMarkdown(spanCellTable);
    console.log('=== SPAN CELL TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');
    
    expect(result).toContain('| Phase | Milestone | Status |');
  });

  // CRITICAL: Test with <ul><li> lists inside table cells (the actual Loop bug)
  it('should handle td cells containing bullet lists', () => {
    const listCellTable = `<table>
<thead><tr><th>Phase</th><th>Milestone</th><th>Status</th><th>ETA</th><th>Notes</th></tr></thead>
<tbody>
<tr>
<td>Ideation/POC</td>
<td>One Tool - DRIWorkbench ASC porting POC</td>
<td>✅ DONE</td>
<td>Fri, May 30, 2025</td>
<td></td>
</tr>
<tr>
<td>Reporting</td>
<td>Reporting feature and User testing</td>
<td>✅ DONE</td>
<td>Mon, Dec 15, 2025</td>
<td><ul><li>Decided to add reporting</li><li>Lead change due to change in focus on MPD</li><li>Reporting feature code complete</li><li>Bugs found, pending deployment</li></ul></td>
</tr>
<tr>
<td>PrPr</td>
<td>PrPr of "One Tool" DRIWorkbench for ASC</td>
<td>🔄 In Progress</td>
<td>Fri, Jan 30</td>
<td><ul><li>User testing</li><li>Telemetry</li><li>Performance benchmarking</li></ul></td>
</tr>
<tr>
<td>PuPr</td>
<td>Auto-execute ASC and enrich ICM for Perf incidents</td>
<td>✖️ Not Started</td>
<td></td>
<td>Product Backlog Item 5005399: ICM enrichment with DRIWorkbench report<br>Pending ETA of ETA: 02/18</td>
</tr>
<tr>
<td>PuPr</td>
<td>PuPr of "One Tool" DRIWorkbench for ASC</td>
<td>✖️ Not Started</td>
<td>Tue, Mar 31</td>
<td><ul><li>Deployment pipelines</li><li>Security review</li><li>Security improvements</li></ul></td>
</tr>
</tbody>
</table>`;
    const result = htmlToMarkdown(listCellTable);
    console.log('=== LIST CELL TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');
    
    // ALL rows should be part of the table — no rows should break out
    const lines = result.split('\n').filter(l => l.trim());
    const pipeRows = lines.filter(l => l.startsWith('|'));
    
    // Expect: 1 header + 1 separator + 5 data rows = 7 pipe rows
    expect(pipeRows.length).toBe(7);
    expect(result).toContain('| Phase | Milestone | Status | ETA | Notes |');
    expect(result).toContain('| --- |');
    
    // Verify bullet content stays inside the cell, not outside
    expect(result).not.toContain('- User testing');
    expect(result).not.toContain('* User testing');
    // Content should be inline
    expect(result).toContain('User testing');
    expect(result).toContain('Telemetry');
  });

  // Test with <br> tags inside cells
  it('should handle td cells with br tags', () => {
    const brCellTable = `<table>
<thead><tr><th>Task</th><th>Notes</th></tr></thead>
<tbody>
<tr><td>Task 1</td><td>Line one<br>Line two<br>Line three</td></tr>
<tr><td>Task 2</td><td>Simple note</td></tr>
</tbody>
</table>`;
    const result = htmlToMarkdown(brCellTable);
    console.log('=== BR CELL TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');
    
    const pipeRows = result.split('\n').filter(l => l.trim() && l.startsWith('|'));
    // 1 header + 1 separator + 2 data rows = 4 pipe rows
    expect(pipeRows.length).toBe(4);
  });

  // Full Loop envelope test with all the real patterns combined
  it('should handle full Loop table with wrappers, divs, and lists', () => {
    const fullLoopTable = `<html>
<body>
<!--StartFragment--><html contenteditable="false"><head><style>
table { border-collapse: collapse; }
th, td { border: 1px solid #e1e1e1; padding: 6px 8px; }
</style></head><tbody contenteditable="false"><tr><td style="vertical-align: top;">
<div style="font-family:'Segoe UI';font-size:14px;">
<table markdown="| Phase | Milestone |
|---|---|
| PrPr | One Tool |" tabindex="-1">
<thead><tr><th><div><p>Phase</p></div></th><th><div><p>Milestone</p></div></th><th><div><p>Status</p></div></th><th><div><p>ETA</p></div></th><th><div><p>Notes</p></div></th></tr></thead>
<tbody>
<tr>
<td><div><p>Ideation/POC</p></div></td>
<td><div><p>One Tool - DRIWorkbench ASC porting POC</p></div></td>
<td><div><p>✅ DONE</p></div></td>
<td><div><p>Fri, May 30, 2025</p></div></td>
<td><div><p></p></div></td>
</tr>
<tr>
<td><div><p>Reporting</p></div></td>
<td><div><p>Reporting feature and User testing</p></div></td>
<td><div><p>✅ DONE</p></div></td>
<td><div><p>Mon, Dec 15, 2025</p></div></td>
<td><div><ul><li>Decided to add reporting</li><li>Lead change</li><li>Code complete</li><li>Bugs found</li></ul></div></td>
</tr>
<tr>
<td><div><p>PrPr</p></div></td>
<td><div><p>PrPr of "One Tool" DRIWorkbench for ASC</p></div></td>
<td><div><p>🔄 In Progress</p></div></td>
<td><div><p>Fri, Jan 30</p></div></td>
<td><div><ul><li>User testing</li><li>Telemetry</li><li>Performance benchmarking</li></ul></div></td>
</tr>
<tr>
<td><div><p>PuPr</p></div></td>
<td><div><p>PuPr of "One Tool" DRIWorkbench for ASC</p></div></td>
<td><div><p>✖️ Not Started</p></div></td>
<td><div><p>Tue, Mar 31</p></div></td>
<td><div><ul><li>Deployment pipelines</li><li>Security review</li><li>Security improvements</li></ul></div></td>
</tr>
</tbody>
</table>
</div>
</td></tr><tr></tr></tbody></html><!--EndFragment-->
</body>
</html>`;
    const result = htmlToMarkdown(fullLoopTable);
    console.log('=== FULL LOOP TABLE RESULT ===');
    console.log(result);
    console.log('=== END ===');

    // Should be a proper GFM table
    expect(result).toContain('| Phase | Milestone | Status | ETA | Notes |');
    expect(result).toContain('| --- |');
    
    // All 4 data rows should be pipe-delimited
    const pipeRows = result.split('\n').filter(l => l.trim() && l.startsWith('|'));
    expect(pipeRows.length).toBe(6); // header + separator + 4 data rows
    
    // No markdown list items outside the table
    expect(result).not.toMatch(/^- /m);
    expect(result).not.toMatch(/^\* /m);
  });
});
