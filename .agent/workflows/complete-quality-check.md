---
description: Master workflow orchestrating code review, testing, and documentation updates with human checkpoints
---

# Complete Code Quality Workflow (Pre-Commit/Pre-Merge)

This master workflow orchestrates all quality assurance steps before committing or merging code. It includes strategic human-in-the-loop checkpoints to ensure comprehensive coverage.

## 🎯 Purpose

Execute a complete quality check including:
- ✅ Code review against guidelines
- ✅ Test coverage updates
- ✅ Automated test execution
- ✅ API documentation updates
- ✅ README maintenance

## 📋 Quick Start

```bash
# Follow this workflow step-by-step
# Each step references a detailed sub-workflow
```

---

## 🔄 Workflow Stages

### Stage 1: Code Review
**Sub-workflow:** [code-review.md](./code-review.md)

**Actions:**
1. Run automated code review
2. Check against coding guidelines
3. Review for security, efficiency, consistency

**Human Checkpoint 1: Review Code Review Report** 🛑

**Review Location:** `docs/reviews/REVIEW_[DATE].md`

**Decision Points:**
- [ ] Are there critical violations?
- [ ] Are there security issues?
- [ ] Is code maintainable?

**Actions:**
```bash
# Review the generated report
cat docs/reviews/REVIEW_$(date +%Y_%m_%d).md

# If issues found, fix them before proceeding
# Re-run code review after fixes
```

**Proceed when:** ✅ All critical issues resolved

---

### Stage 2: Update Test Cases
**Sub-workflow:** [update-tests.md](./update-tests.md)

**Actions:**
1. Identify code changes requiring tests
2. Update existing tests
3. Add new test cases
4. Review test coverage gaps

**Human Checkpoint 2: Review Test Updates** 🛑

**Review:**
- [ ] New tests cover all new code paths
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] Mock usage is appropriate

**Actions:**
```bash
# Review changes to test files
git diff tests/

# Check which tests were added/modified
git status tests/
```

**Proceed when:** ✅ Test coverage is comprehensive

---

### Stage 3: Run Tests & Generate Report
**Sub-workflow:** [run-tests.md](./run-tests.md)

**Actions:**
```bash
# turbo
python scripts/run_tests_with_report.py
```

**Automated Outputs:**
- Test execution report: `docs/reviews/TEST_REPORT_[DATE].md`
- Coverage report: `htmlcov/index.html`
- Coverage JSON: `coverage.json`

**Human Checkpoint 3: Review Test Results** 🛑

**Review Location:** `docs/reviews/TEST_REPORT_[DATE].md`

**Decision Points:**
- [ ] All tests passing?
- [ ] Coverage >= 80% overall?
- [ ] No coverage gaps in modified modules?
- [ ] No skipped tests without good reason?

**If Tests Fail:**
```bash
# Review failed test details in report
# Fix the code or tests
# Re-run from Stage 2
```

**If Coverage Low:**
```bash
# Check coverage report
open htmlcov/index.html

# Add tests for uncovered lines
# Re-run from Stage 2
```

**Proceed when:** ✅ All tests pass AND coverage >= 80%

---

### Stage 4: Update API Documentation
**Sub-workflow:** [update-api-documentation.md](./update-api-documentation.md)

**Actions:**
1. Identify new/modified API endpoints
2. Update `docs/api-docs.json`
3. Document request/response schemas
4. Add examples

**Human Checkpoint 4: Review API Documentation** 🛑

**Review:**
- [ ] All new endpoints documented
- [ ] Request schemas complete
- [ ] Response examples provided
- [ ] Status codes documented (200, 400, 401, 403, 404, 500)
- [ ] Authentication requirements clear

**Actions:**
```bash
# Review API documentation changes
git diff docs/api-docs.json

# Verify completeness
# - Check all new routes in app/routes/
# - Ensure consistency with code
```

**Proceed when:** ✅ API docs are complete and accurate

---

### Stage 5: Update README
**Sub-workflow:** [update-readme.md](./update-readme.md)

**Actions:**
1. Read current README structure
2. Identify sections needing updates
3. Add new features/modules
4. Update tech stack if changed
5. Update setup instructions if needed

**Human Checkpoint 5: Review README Updates** 🛑

**Review:**
- [ ] New features mentioned
- [ ] Tech stack current
- [ ] Setup instructions accurate
- [ ] Links working
- [ ] Formatting consistent
- [ ] No sensitive information exposed

**Actions:**
```bash
# Review README changes
git diff README.md

# Verify changes are:
# - Accurate
# - Complete
# - Consistent with existing style
```

**Proceed when:** ✅ README accurately reflects current state

---

## 🏁 Final Checkpoint

**Human Checkpoint 6: Final Review** 🛑

**Before Committing:**
Review all changes together:

```bash
# View all modified files
git status

# Review complete diff
git diff

# Check all reports generated
ls -la docs/reviews/
```

**Final Checklist:**
- [ ] Code review passed
- [ ] Tests updated and passing
- [ ] Coverage >= 80%
- [ ] API documentation complete
- [ ] README updated
- [ ] No debugging code left (console.logs, print statements)
- [ ] No commented-out code
- [ ] No TODO comments without context
- [ ] Git commit message is descriptive

---

## 📝 Commit Changes

**If all checkpoints passed:**

```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "feat: [descriptive message]

- Code review: All guidelines met
- Tests: Added/updated, all passing, 85% coverage
- API docs: Updated for new endpoints
- README: Added new module documentation

Refs: #issue-number"

# Push to remote
git push origin feature-branch
```

**Commit Message Format:**
```
<type>: <short summary>

<detailed description>

- Code review: <status>
- Tests: <status>
- Coverage: <percentage>
- API docs: <status>
- README: <status>

Refs: #<issue-number>
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

---

## 🔁 Workflow Diagram

```
┌─────────────────────────────────────────────────┐
│  Start: Code Changes Made                      │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│  Stage 1: Code Review                          │
│  Run: code-review.md                           │
└─────────────┬───────────────────────────────────┘
              │
              ▼
       🛑 Checkpoint 1: Review Report
              │
              ▼ (Issues fixed)
┌─────────────────────────────────────────────────┐
│  Stage 2: Update Tests                         │
│  Run: update-tests.md                          │
└─────────────┬───────────────────────────────────┘
              │
              ▼
       🛑 Checkpoint 2: Review Tests
              │
              ▼ (Tests adequate)
┌─────────────────────────────────────────────────┐
│  Stage 3: Run Tests                            │
│  Run: python scripts/run_tests_with_report.py │
└─────────────┬───────────────────────────────────┘
              │
              ▼
       🛑 Checkpoint 3: Review Results
              │
              ▼ (All pass, coverage good)
┌─────────────────────────────────────────────────┐
│  Stage 4: Update API Docs                      │
│  Run: update-api-documentation.md              │
└─────────────┬───────────────────────────────────┘
              │
              ▼
       🛑 Checkpoint 4: Review API Docs
              │
              ▼ (Docs complete)
┌─────────────────────────────────────────────────┐
│  Stage 5: Update README                        │
│  Run: update-readme.md                         │
└─────────────┬───────────────────────────────────┘
              │
              ▼
       🛑 Checkpoint 5: Review README
              │
              ▼ (README current)
┌─────────────────────────────────────────────────┐
│  🛑 Final Checkpoint: Complete Review          │
└─────────────┬───────────────────────────────────┘
              │
              ▼ (All approved)
┌─────────────────────────────────────────────────┐
│  ✅ Commit & Push                              │
└─────────────────────────────────────────────────┘
```

---

## 🚨 Failure Handling

### If Stage 1 (Code Review) Fails:
1. Fix code violations
2. Re-run code review
3. Don't proceed until clean

### If Stage 2 (Test Updates) Inadequate:
1. Add missing test cases
2. Review coverage requirements
3. Consult with team if unsure

### If Stage 3 (Tests) Fail:
1. Check test report for failures
2. Fix code or tests
3. Go back to Stage 2
4. Re-run tests

### If Stage 4 (API Docs) Incomplete:
1. Review all route changes
2. Complete documentation
3. Verify against code

### If Stage 5 (README) Inaccurate:
1. Re-read current README
2. Make targeted updates
3. Verify accuracy

---

## ⚡ Quick Mode (For Small Changes)

For minor changes (typos, small refactors):

**Abbreviated Workflow:**
```bash
# 1. Quick code review
#    Check: No guideline violations

# 2. Run existing tests (no new tests needed)
python scripts/run_tests_with_report.py

# 3. Skip API docs if no endpoint changes

# 4. Skip README if no feature changes

# 5. Commit
git commit -m "fix: [small change description]"
```

**Use Quick Mode ONLY if:**
- No new features
- No API changes
- No business logic changes
- Just refactoring or bug fixes

---

## 📊 Success Metrics

Track these metrics over time:

- **Code Review Pass Rate**: Should increase over time
- **First-Time Test Pass Rate**: Aim for > 90%
- **Coverage Trend**: Should stay >= 80%
- **Documentation Completeness**: 100% of endpoints documented
- **Commit Quality**: Proper messages, complete changes

---

## 🎓 Best Practices

1. **Run Locally First**: Don't rely on CI/CD alone
2. **Small Commits**: Easier to review and test
3. **One Feature Per Branch**: Simpler workflow execution
4. **Review Your Own Code**: Catch issues before review
5. **Don't Skip Checkpoints**: They catch issues early
6. **Keep Reports**: Track quality over time
7. **Update Workflows**: Improve this process continuously

---

## 🔧 Troubleshooting

**"Workflow takes too long"**
- Run stages in parallel where possible
- Focus on changed modules only
- Use Quick Mode for minor changes

**"Keep failing at same stage"**
- Review that stage's workflow in detail
- Ask for help if needed
- Update tool configuration

**"Uncertainty at checkpoints"**
- Consult coding guidelines
- Ask team for review
- Document decision for future

---

## 📚 Related Documentation

- [Coding Guidelines](../../docs/CODING_GUIDELINES.md)
- [Testing Strategy](../../docs/TESTING.md)
- [API Documentation](../../docs/api-docs.json)
- [README](../../README.md)

---

**Last Updated:** 2025-12-30  
**Workflow Version:** 1.0  
**Estimated Time:** 30-60 minutes for full workflow
