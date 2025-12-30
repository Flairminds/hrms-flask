#!/usr/bin/env python3
"""
Test Execution and Report Generator

Runs the entire test suite and generates a comprehensive test report
in the docs/reviews/ directory.

Usage:
    python scripts/run_tests_with_report.py
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path


def run_tests():
    """Run pytest with coverage and capture output."""
    print("=" * 80)
    print("Running Test Suite...")
    print("=" * 80)
    
    # Run pytest with coverage
    cmd = [
        "pytest",
        "tests/",
        "-v",
        "--tb=short",
        "--cov=app",
        "--cov-report=html",
        "--cov-report=term",
        "--cov-report=json"
    ]
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent.parent
        )
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr, file=sys.stderr)
        
        return result.returncode, result.stdout, result.stderr
        
    except FileNotFoundError:
        print("ERROR: pytest not found. Install with: pip install pytest pytest-cov")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR running tests: {e}")
        sys.exit(1)


def parse_test_results(output):
    """Parse pytest output to extract test statistics."""
    stats = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "errors": 0,
        "coverage": "N/A"
    }
    
    lines = output.split('\n')
    
    for line in lines:
        # Look for summary line: "= 123 passed, 4 failed, 1 skipped in 12.34s ="
        if " passed" in line or " failed" in line:
            parts = line.split()
            for i, part in enumerate(parts):
                if part == "passed":
                    stats["passed"] = int(parts[i-1])
                elif part == "failed":
                    stats["failed"] = int(parts[i-1])
                elif part == "skipped":
                    stats["skipped"] = int(parts[i-1])
                elif part == "error" or part == "errors":
                    stats["errors"] = int(parts[i-1])
        
        # Look for coverage line: "TOTAL    1234    567    54%"
        if "TOTAL" in line and "%" in line:
            parts = line.split()
            # Coverage % is usually the last column
            for part in parts:
                if "%" in part:
                    stats["coverage"] = part
                    break
    
    stats["total"] = stats["passed"] + stats["failed"] + stats["skipped"] + stats["errors"]
    
    return stats


def get_coverage_by_module():
    """Read coverage data from JSON report."""
    import json
    
    coverage_file = Path(__file__).parent.parent / "coverage.json"
    
    if not coverage_file.exists():
        return {}
    
    try:
        with open(coverage_file, 'r') as f:
            data = json.load(f)
        
        modules = {}
        for filename, file_data in data.get('files', {}).items():
            if '/app/' in filename:
                # Extract module path
                module = filename.split('/app/')[-1]
                summary = file_data.get('summary', {})
                
                covered = summary.get('covered_lines', 0)
                total = summary.get('num_statements', 0)
                percent = round((covered / total * 100) if total > 0 else 0, 1)
                
                modules[module] = {
                    'covered': covered,
                    'total': total,
                    'percent': percent
                }
        
        return modules
        
    except Exception as e:
        print(f"Warning: Could not parse coverage JSON: {e}")
        return {}


def extract_failures(output):
    """Extract failed test details from pytest output."""
    failures = []
    in_failure = False
    current_failure = []
    
    lines = output.split('\n')
    
    for line in lines:
        if line.startswith("FAILED "):
            in_failure = True
            current_failure = [line]
        elif in_failure:
            if line.startswith("=") or line.startswith("FAILED ") or line.startswith("ERROR "):
                if current_failure:
                    failures.append('\n'.join(current_failure))
                    current_failure = []
                if line.startswith("FAILED "):
                    current_failure = [line]
                else:
                    in_failure = False
            else:
                current_failure.append(line)
    
    if current_failure:
        failures.append('\n'.join(current_failure))
    
    return failures


def generate_report(stats, coverage_by_module, failures, output):
    """Generate markdown test report."""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    date_str = datetime.now().strftime("%Y_%m_%d")
    
    # Ensure reviews directory exists
    reviews_dir = Path(__file__).parent.parent / "docs" / "reviews"
    reviews_dir.mkdir(parents=True, exist_ok=True)
    
    report_file = reviews_dir / f"TEST_REPORT_{date_str}.md"
    
    # Calculate pass rate
    pass_rate = round((stats['passed'] / stats['total'] * 100) if stats['total'] > 0 else 0, 1)
    
    report = f"""# Test Execution Report

**Generated:** {timestamp}

---

## 📊 Executive Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | {stats['total']} |
| **✅ Passed** | {stats['passed']} ({pass_rate}%) |
| **❌ Failed** | {stats['failed']} |
| **⏭️ Skipped** | {stats['skipped']} |
| **💥 Errors** | {stats['errors']} |
| **📈 Coverage** | {stats['coverage']} |

### Status: {'🟢 PASS' if stats['failed'] == 0 and stats['errors'] == 0 else '🔴 FAIL'}

---

## 📦 Coverage by Module

"""
    
    if coverage_by_module:
        # Sort modules by coverage percentage
        sorted_modules = sorted(coverage_by_module.items(), key=lambda x: x[1]['percent'])
        
        report += "| Module | Covered Lines | Total Lines | Coverage |\n"
        report += "|--------|---------------|-------------|----------|\n"
        
        for module, data in sorted_modules:
            icon = "🟢" if data['percent'] >= 80 else "🟡" if data['percent'] >= 60 else "🔴"
            report += f"| {icon} `{module}` | {data['covered']} | {data['total']} | {data['percent']}% |\n"
        
        # Coverage gaps
        low_coverage = [(m, d) for m, d in sorted_modules if d['percent'] < 80]
        if low_coverage:
            report += "\n### ⚠️ Coverage Gaps (< 80%)\n\n"
            for module, data in low_coverage:
                report += f"- **`{module}`**: {data['percent']}% - needs {80 - data['percent']:.1f}% more\n"
    else:
        report += "*Coverage data not available. Ensure pytest-cov generated coverage.json*\n"
    
    report += "\n---\n\n"
    
    # Failed tests section
    if failures:
        report += f"## ❌ Failed Tests ({len(failures)})\n\n"
        for i, failure in enumerate(failures, 1):
            report += f"### Failure {i}\n\n"
            report += "```\n"
            report += failure[:1000]  # Limit length
            if len(failure) > 1000:
                report += "\n... (truncated)"
            report += "\n```\n\n"
    else:
        report += "## ✅ All Tests Passed!\n\nNo failures to report.\n\n"
    
    # Recommendations
    report += "---\n\n## 💡 Recommendations\n\n"
    
    if stats['failed'] > 0:
        report += "1. **Fix Failed Tests**: Address failing tests before merging code\n"
    
    if coverage_by_module:
        low_cov_count = len([d for d in coverage_by_module.values() if d['percent'] < 80])
        if low_cov_count > 0:
            report += f"2. **Improve Coverage**: {low_cov_count} module(s) below 80% coverage threshold\n"
    
    if stats['skipped'] > 0:
        report += f"3. **Review Skipped Tests**: {stats['skipped']} test(s) are being skipped\n"
    
    if stats['failed'] == 0 and all(d['percent'] >= 80 for d in coverage_by_module.values() if coverage_by_module):
        report += "✅ **Great job!** All tests passing and coverage above threshold.\n"
    
    report += "\n---\n\n"
    report += "## 📁 Detailed Reports\n\n"
    report += "- **HTML Coverage Report**: `htmlcov/index.html`\n"
    report += "- **JSON Coverage Data**: `coverage.json`\n"
    report += "- **Full Test Output**: See pytest output above\n"
    
    # Write report
    with open(report_file, 'w') as f:
        f.write(report)
    
    return report_file


def main():
    """Main execution function."""
    print("\n" + "=" * 80)
    print(" HRMS Test Suite Execution & Report Generator")
    print("=" * 80 + "\n")
    
    # Run tests
    exit_code, stdout, stderr = run_tests()
    
    # Parse results
    stats = parse_test_results(stdout)
    coverage_by_module = get_coverage_by_module()
    failures = extract_failures(stdout) if stats['failed'] > 0 else []
    
    # Generate report
    report_file = generate_report(stats, coverage_by_module, failures, stdout)
    
    print("\n" + "=" * 80)
    print(" Test Execution Complete")
    print("=" * 80)
    print(f"\n📄 Test Report: {report_file}")
    print(f"📊 Coverage Report: htmlcov/index.html")
    print(f"\n✅ Passed: {stats['passed']}")
    print(f"❌ Failed: {stats['failed']}")
    print(f"⏭️  Skipped: {stats['skipped']}")
    print(f"📈 Coverage: {stats['coverage']}")
    print("\n" + "=" * 80 + "\n")
    
    # Exit with same code as pytest
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
