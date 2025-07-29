#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Advanced test coverage analysis script
 * Generates detailed coverage reports and analysis
 */

const COVERAGE_DIR = path.join(__dirname, '../coverage');
const REPORTS_DIR = path.join(__dirname, '../reports');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function runCoverageTests() {
  log('🧪 Running tests with coverage...', 'blue');
  
  try {
    const output = execSync('npm run coverage', { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    log('✅ Tests completed successfully', 'green');
    return output;
  } catch (error) {
    log('❌ Tests failed', 'red');
    console.log(error.stdout);
    console.error(error.stderr);
    return null;
  }
}

function analyzeCoverage() {
  const coverageJsonPath = path.join(COVERAGE_DIR, 'coverage-final.json');
  
  if (!fs.existsSync(coverageJsonPath)) {
    log('❌ Coverage data not found', 'red');
    return null;
  }

  const coverageData = JSON.parse(fs.readFileSync(coverageJsonPath, 'utf8'));
  const analysis = {
    totalFiles: 0,
    coveredFiles: 0,
    totalStatements: 0,
    coveredStatements: 0,
    totalBranches: 0,
    coveredBranches: 0,
    totalFunctions: 0,
    coveredFunctions: 0,
    totalLines: 0,
    coveredLines: 0,
    fileDetails: [],
  };

  Object.entries(coverageData).forEach(([filePath, fileData]) => {
    if (filePath.includes('node_modules') || filePath.includes('test')) return;
    
    analysis.totalFiles++;
    
    const statements = fileData.s || {};
    const branches = fileData.b || {};
    const functions = fileData.f || {};
    
    const stmtTotal = Object.keys(statements).length;
    const stmtCovered = Object.values(statements).filter(count => count > 0).length;
    
    const branchTotal = Object.keys(branches).length;
    const branchCovered = Object.values(branches).filter(branch => 
      Array.isArray(branch) ? branch.some(count => count > 0) : branch > 0
    ).length;
    
    const funcTotal = Object.keys(functions).length;
    const funcCovered = Object.values(functions).filter(count => count > 0).length;
    
    const lineTotal = Object.keys(fileData.statementMap || {}).length;
    const lineCovered = Object.values(statements).filter(count => count > 0).length;
    
    analysis.totalStatements += stmtTotal;
    analysis.coveredStatements += stmtCovered;
    analysis.totalBranches += branchTotal;
    analysis.coveredBranches += branchCovered;
    analysis.totalFunctions += funcTotal;
    analysis.coveredFunctions += funcCovered;
    analysis.totalLines += lineTotal;
    analysis.coveredLines += lineCovered;
    
    const fileAnalysis = {
      path: filePath.replace(process.cwd(), ''),
      statements: stmtTotal > 0 ? (stmtCovered / stmtTotal * 100).toFixed(2) : 100,
      branches: branchTotal > 0 ? (branchCovered / branchTotal * 100).toFixed(2) : 100,
      functions: funcTotal > 0 ? (funcCovered / funcTotal * 100).toFixed(2) : 100,
      lines: lineTotal > 0 ? (lineCovered / lineTotal * 100).toFixed(2) : 100,
    };
    
    analysis.fileDetails.push(fileAnalysis);
    
    if (stmtCovered > 0 || branchCovered > 0 || funcCovered > 0) {
      analysis.coveredFiles++;
    }
  });

  return analysis;
}

function generateReport(analysis) {
  if (!analysis) return;
  
  ensureDir(REPORTS_DIR);
  
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary: {
      totalFiles: analysis.totalFiles,
      coveredFiles: analysis.coveredFiles,
      coveragePercentage: (analysis.coveredFiles / analysis.totalFiles * 100).toFixed(2),
      statements: analysis.totalStatements > 0 ? (analysis.coveredStatements / analysis.totalStatements * 100).toFixed(2) : 100,
      branches: analysis.totalBranches > 0 ? (analysis.coveredBranches / analysis.totalBranches * 100).toFixed(2) : 100,
      functions: analysis.totalFunctions > 0 ? (analysis.coveredFunctions / analysis.totalFunctions * 100).toFixed(2) : 100,
      lines: analysis.totalLines > 0 ? (analysis.coveredLines / analysis.totalLines * 100).toFixed(2) : 100,
    },
    thresholds: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75,
    },
    files: analysis.fileDetails.sort((a, b) => parseFloat(a.statements) - parseFloat(b.statements)),
  };
  
  // Generate JSON report
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'coverage-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Generate HTML summary
  const htmlReport = generateHtmlReport(report);
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'coverage-summary.html'),
    htmlReport
  );
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  fs.writeFileSync(
    path.join(REPORTS_DIR, 'coverage-summary.md'),
    markdownReport
  );
  
  return report;
}

function generateHtmlReport(report) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { font-size: 0.9em; color: #666; }
        .green { color: #28a745; }
        .yellow { color: #ffc107; }
        .red { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .file-path { font-family: monospace; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Test Coverage Report</h1>
    <p>Generated: ${report.timestamp}</p>
    
    <div class="summary">
        <h2>Coverage Summary</h2>
        <div class="metric">
            <div class="metric-value ${getCoverageColor(report.summary.statements)}">${report.summary.statements}%</div>
            <div class="metric-label">Statements</div>
        </div>
        <div class="metric">
            <div class="metric-value ${getCoverageColor(report.summary.branches)}">${report.summary.branches}%</div>
            <div class="metric-label">Branches</div>
        </div>
        <div class="metric">
            <div class="metric-value ${getCoverageColor(report.summary.functions)}">${report.summary.functions}%</div>
            <div class="metric-label">Functions</div>
        </div>
        <div class="metric">
            <div class="metric-value ${getCoverageColor(report.summary.lines)}">${report.summary.lines}%</div>
            <div class="metric-label">Lines</div>
        </div>
    </div>
    
    <h2>File Coverage Details</h2>
    <table>
        <thead>
            <tr>
                <th>File</th>
                <th>Statements</th>
                <th>Branches</th>
                <th>Functions</th>
                <th>Lines</th>
            </tr>
        </thead>
        <tbody>
            ${report.files.map(file => `
                <tr>
                    <td class="file-path">${file.path}</td>
                    <td class="${getCoverageColor(file.statements)}">${file.statements}%</td>
                    <td class="${getCoverageColor(file.branches)}">${file.branches}%</td>
                    <td class="${getCoverageColor(file.functions)}">${file.functions}%</td>
                    <td class="${getCoverageColor(file.lines)}">${file.lines}%</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>
  `;
}

function generateMarkdownReport(report) {
  return `# Test Coverage Report

Generated: ${report.timestamp}

## Coverage Summary

| Metric | Coverage | Threshold | Status |
|--------|----------|-----------|--------|
| Statements | ${report.summary.statements}% | ${report.thresholds.statements}% | ${getStatusEmoji(report.summary.statements, report.thresholds.statements)} |
| Branches | ${report.summary.branches}% | ${report.thresholds.branches}% | ${getStatusEmoji(report.summary.branches, report.thresholds.branches)} |
| Functions | ${report.summary.functions}% | ${report.thresholds.functions}% | ${getStatusEmoji(report.summary.functions, report.thresholds.functions)} |
| Lines | ${report.summary.lines}% | ${report.thresholds.lines}% | ${getStatusEmoji(report.summary.lines, report.thresholds.lines)} |

## File Coverage Details

| File | Statements | Branches | Functions | Lines |
|------|------------|----------|-----------|-------|
${report.files.map(file => 
  `| \`${file.path}\` | ${file.statements}% | ${file.branches}% | ${file.functions}% | ${file.lines}% |`
).join('\n')}

## Coverage Thresholds

- **Statements:** ${report.thresholds.statements}%
- **Branches:** ${report.thresholds.branches}%
- **Functions:** ${report.thresholds.functions}%
- **Lines:** ${report.thresholds.lines}%
`;
}

function getCoverageColor(percentage) {
  const num = parseFloat(percentage);
  if (num >= 80) return 'green';
  if (num >= 60) return 'yellow';
  return 'red';
}

function getStatusEmoji(actual, threshold) {
  return parseFloat(actual) >= threshold ? '✅' : '❌';
}

function displaySummary(report) {
  if (!report) return;
  
  log('\n📊 Coverage Summary:', 'cyan');
  log(`Files: ${report.summary.coveredFiles}/${analysis.totalFiles} (${report.summary.coveragePercentage}%)`, 'white');
  log(`Statements: ${report.summary.statements}%`, getCoverageColorConsole(report.summary.statements));
  log(`Branches: ${report.summary.branches}%`, getCoverageColorConsole(report.summary.branches));
  log(`Functions: ${report.summary.functions}%`, getCoverageColorConsole(report.summary.functions));
  log(`Lines: ${report.summary.lines}%`, getCoverageColorConsole(report.summary.lines));
  
  log('\n📁 Reports generated:', 'cyan');
  log(`- JSON: ${path.join(REPORTS_DIR, 'coverage-report.json')}`, 'white');
  log(`- HTML: ${path.join(REPORTS_DIR, 'coverage-summary.html')}`, 'white');
  log(`- Markdown: ${path.join(REPORTS_DIR, 'coverage-summary.md')}`, 'white');
  log(`- Detailed HTML: ${path.join(COVERAGE_DIR, 'lcov-report/index.html')}`, 'white');
}

function getCoverageColorConsole(percentage) {
  const num = parseFloat(percentage);
  if (num >= 80) return 'green';
  if (num >= 60) return 'yellow';
  return 'red';
}

// Main execution
function main() {
  log('🚀 Starting coverage analysis...', 'blue');
  
  // Run tests with coverage
  const testOutput = runCoverageTests();
  if (!testOutput) {
    process.exit(1);
  }
  
  // Analyze coverage data
  log('📈 Analyzing coverage data...', 'blue');
  const analysis = analyzeCoverage();
  
  // Generate reports
  log('📝 Generating reports...', 'blue');
  const report = generateReport(analysis);
  
  // Display summary
  displaySummary(report);
  
  log('\n✨ Coverage analysis complete!', 'green');
}

if (require.main === module) {
  main();
}

module.exports = {
  runCoverageTests,
  analyzeCoverage,
  generateReport,
};