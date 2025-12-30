---
description: Automatically updates README.md based on code changes and reviews
---

# Update README Workflow

This workflow intelligently updates the README.md file based on code changes, maintaining consistency with the current structure.

## When to Use This Workflow

- After completing major features or modules
- After significant code reviews or refactoring
- When coding guidelines or architecture changes
- After dependency updates
- When adding new APIs or endpoints

## Prerequisites

1. Complete the code changes/review you want to document
2. Ensure all tests pass
3. Review any relevant documentation updates needed

## Workflow Steps

### Step 1: Analyze Current README Structure

Read and understand the existing README.md:
```bash
# View the current README
cat README.md
```

**Action:** Identify the following sections:
- Project overview and description
- Tech stack and dependencies
- Module/feature descriptions
- Setup instructions
- API documentation references
- Architecture details
- Contribution guidelines

### Step 2: Identify Changes to Document

Review recent changes that need README updates:

**Check for:**
- New modules or services added
- New API endpoints
- Changed dependencies in `requirements.txt` or `package.json`
- Updated coding guidelines
- New environment variables
- Changed setup procedures
- New testing frameworks or tools

**Sources to check:**
- `git log --oneline -20` (recent commits)
- `docs/reviews/` directory for review documents
- `docs/CODING_GUIDELINES.md` for guideline changes
- Recent code review findings

### Step 3: Draft README Updates

For each section that needs updates:

**A. Project Description Section**
- Update if project scope changed
- Add new high-level features
- Keep existing overview intact

**B. Tech Stack Section**
- Add new frameworks or libraries
- Update versions if major changes
- Group by category (Backend, Frontend, Database, etc.)

**C. Features/Modules Section**
- Add new modules with brief description
- Update existing module descriptions if functionality changed
- Maintain consistent format with existing entries

**D. Setup/Installation Section**
- Add new environment variables
- Update dependency installation if changed
- Add new configuration steps
- Keep existing steps that haven't changed

**E. API Documentation Section**
- Reference new API documentation if added
- Update links to API specs
- Note major endpoint changes

**F. Architecture Section**
- Update if architecture patterns changed
- Add new design patterns adopted
- Document major refactoring

### Step 4: Make Incremental Updates

**IMPORTANT RULES:**
1. **DO NOT** rewrite entire sections - only add or modify what changed
2. **PRESERVE** existing structure and formatting
3. **MAINTAIN** consistency with existing content style
4. **ADD** new content in appropriate sections
5. **UPDATE** only specific lines that need changes

**Example of Good Update:**
```markdown
# Before
## Modules
- HR Management
- Leave Management

# After
## Modules
- HR Management
- Leave Management
- Goals Management (NEW - Employee goal tracking and evaluation)
- Skills Management (NEW - Employee skills and competencies tracking)
```

### Step 5: Update Specific Sections

**For New Modules:**
```markdown
Add to the relevant section:
### [Module Name]
Brief description of what this module does.

**Key Features:**
- Feature 1
- Feature 2

**Main Components:**
- Component 1
- Component 2
```

**For dependency updates:**
```markdown
Update the tech Stack section:
- Flask 2.x.x → 3.x.x
- SQLAlchemy 1.4.x → 2.0.x (if changed)
```

**For New Environment Variables:**
```markdown
Add to Configuration section:
| Variable | Description | Example |
|----------|-------------|---------|
| NEW_VAR_NAME | What it does | `value` |
```

### Step 6: Verify Consistency

**Check that:**
- [ ] Formatting matches existing style (headers, lists, code blocks)
- [ ] Links are valid and working
- [ ] Code examples use correct syntax highlighting
- [ ] Table of Contents updated if modified (if present)
- [ ] Version numbers are accurate
- [ ] No duplicate information
- [ ] Grammar and spelling are correct

### Step 7: Review and Commit

**Final Review:**
1. Read the entire README to ensure flow
2. Verify all links work
3. Check that technical details are accurate
4. Ensure no sensitive information exposed

**Commit the changes:**
```bash
git add README.md
git commit -m "docs: update README with [brief description of changes]"
```

## Examples

### Example 1: Adding a New Module

**Context:** Added Goals Management module

**Update:**
```markdown
# In the Modules section, add:

### Goals Management
Enables employees and managers to set, track, and evaluate professional goals.

**Features:**
- Create and assign goals
- Track progress towards goals
- Goal evaluation and scoring
- Integration with performance reviews

**Technologies:** Flask, SQLAlchemy ORM, APScheduler
```

### Example 2: Updating Tech Stack

**Context:** Migrated logging to centralized Logger

**Update:**
```markdown
# In the Architecture or Tech Stack section:

### Logging
- Centralized Logger utility (`app/utils/logger.py`)
- Structured logging with metadata
- Different log levels (DEBUG, INFO, WARNING, ERROR)
- Consistent logging across all services
```

### Example 3: Adding Environment Variables

**Context:** Added email configuration variables

**Update:**
```markdown
# In the Configuration section:

#### Email Configuration
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MAIL_USERNAME` | Yes | SMTP username | `your-email@example.com` |
| `MAIL_PASSWORD` | Yes | SMTP password | `your-password` |
| `MAIL_SERVER` | No | SMTP server | `smtp.gmail.com` |
| `MAIL_PORT` | No | SMTP port | `587` |
```

## Common Mistakes to Avoid

❌ **DON'T:**
- Rewrite entire sections unnecessarily
- Change existing working examples
- Remove or modify unchanged features
- Use inconsistent formatting
- Add redundant information
- Copy-paste without adapting to README style

✅ **DO:**
- Make targeted, specific updates
- Preserve existing structure
- Maintain consistent tone and style
- Add value with each change
- Keep information current and accurate
- Cross-reference with other documentation

## Tips for Maintaining README Quality

1. **Keep it concise** - README should be scannable
2. **Link to detailed docs** - Don't duplicate extensive documentation
3. **Use examples** - Show, don't just tell
4. **Update regularly** - Don't let it get stale
5. **Version appropriately** - Note major version changes
6. **Test instructions** - Ensure setup steps actually work

## Auto-Update Checklist

Use this checklist when running the workflow:

- [ ] Read entire README.md
- [ ] Identify sections needing updates
- [ ] Review recent code changes (git log, reviews)
- [ ] Draft updates for each affected section
- [ ] Apply updates incrementally (not wholesale rewrite)
- [ ] Verify formatting consistency
- [ ] Check all links
- [ ] Update Table of Contents if needed
- [ ] Review for accuracy
- [ ] Commit with descriptive message

---

**Last Updated:** 2025-12-30
**Workflow Version:** 1.0
