---
description: Runs automated tests and generates comprehensive report in reviews folder
---

# Run Tests and Generate Report Workflow

This workflow executes the test suite and automatically generates a detailed test report in `docs/reviews/`.

## Quick Start

**Option 1: Use the automated script**
```bash
# turbo
python scripts/run_tests_with_report.py
```

**Option 2: Manual execution**
```bash
# turbo
pytest tests/ -v --tb=short --cov=app --cov-report=html --cov-report=term > test_results.txt 2>&1
python scripts/generate_test_report.py
```

## What This Workflow Does

1. ✅ Runs entire test suite with pytest
2. ✅ Generates code coverage report (HTML + terminal)
3. ✅ Creates detailed test report in `docs/reviews/TEST_REPORT_[DATE].md`
4. ✅ Includes:
   - Test summary (passed/failed/skipped)
   - Coverage statistics by module
   - Failed test details
   - Coverage gaps
   - Recommendations

## Report Structure

The generated report includes:

```markdown
# Test Execution Report - [DATE]

## Executive Summary
- Total Tests: X
- Passed: X (XX%)
- Failed: X
- Skipped: X
- Coverage: XX%

## Coverage by Module
[Detailed coverage for each module]

## Failed Tests
[Details of any failures]

## Coverage Gaps
[Modules with <80% coverage]

## Recommendations
[Action items to improve coverage]
```

## Usage Examples

### Run Tests for Specific Module

```bash
# Test specific service
pytest tests/test_policy.py -v --cov=app.services.policy_service

# Test specific controller
pytest tests/test_hr.py -v --cov=app.controllers.hr_controller

# Test specific function
pytest tests/test_leave.py::test_apply_leave_success -v
```

### Generate Report After Manual Test Run

```bash
# 1. Run tests with output
pytest tests/ -v --cov=app --cov-report=html > test_output.txt 2>&1

# 2. Generate report
python scripts/generate_test_report.py
```

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Tests
  run: python scripts/run_tests_with_report.py

- name: Upload Coverage Report
  uses: actions/upload-artifact@v2
  with:
    name: test-coverage
    path: htmlcov/

- name: Upload Test Report
  uses: actions/upload-artifact@v2
  with:
    name: test-report
    path: docs/reviews/TEST_REPORT_*.md
```

## Interpreting the Report

### Coverage Thresholds

- 🟢 **≥ 80%**: Good coverage
- 🟡 **60-79%**: Needs improvement
- 🔴 **< 60%**: Critical - add tests immediately

### Test Status

- ✅ **Passed**: Test executed successfully
- ❌ **Failed**: Test assertion failed or error occurred
- ⏭️ **Skipped**: Test marked with @pytest.skip

### Common Failure Patterns

1. **ImportError**: Missing dependencies
2. **AssertionError**: Expected vs actual mismatch
3. **AttributeError**: Mocking issue or missing attribute
4. **SQLAlchemyError**: Database connection or query issue

## Customization

### Change Report Location

Edit `scripts/generate_test_report.py`:
```python
REPORT_DIR = "docs/reviews"  # Change this
```

### Coverage Threshold

Edit `pytest.ini` or `setup.cfg`:
```ini
[tool:pytest]
addopts = --cov-fail-under=80
```

### Report Format

Modify the report template in `scripts/generate_test_report.py` to customize output format.

## Troubleshooting

**Issue**: No report generated
- **Solution**: Check that `docs/reviews/` directory exists
- **Solution**: Verify pytest ran successfully

**Issue**: Coverage shows 0%
- **Solution**: Ensure tests are actually running
- **Solution**: Check coverage configuration in `pytest.ini`

**Issue**: Report shows old data
- **Solution**: Delete `htmlcov/` directory and re-run
- **Solution**: Check timestamp on report file

## Best Practices

1. **Run Before Commits**: Always run tests before committing
2. **Review Reports**: Don't just run - analyze the results
3. **Track Trends**: Compare coverage over time
4. **Fix Failures First**: Don't ignore failed tests
5. **Aim for 80%+**: Maintain good coverage across all modules

## Integration with Code Review

1. Run tests before creating PR
2. Include test report in PR description
3. Address any coverage drops
4. Add tests for new features

---

**Last Updated:** 2025-12-30  
**Workflow Version:** 1.0
