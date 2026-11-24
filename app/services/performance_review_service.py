import copy
import uuid
from datetime import datetime, date, timezone

from sqlalchemy.orm.attributes import flag_modified

from .. import db
from ..models.hr import Employee, Project, ProjectAllocation
from ..models.performance_review import (
    PerfReviewCycle, PerfReviewConfig, PerfReview, PerfReviewConfigActivity,
)
from ..utils.logger import Logger

OTHERS_TITLE = 'Others'
ROLES = ('self', 'lead', 'hr')


def _now():
    return datetime.now(timezone.utc)


def _employee_name(emp):
    if not emp:
        return None
    return ' '.join(filter(None, [emp.first_name, emp.last_name])).strip()


class PerformanceReviewService:
    """Service for the multi-role weighted Performance Review feature.

    See migrations/performance_review_tables.sql for the schema and the
    design notes (versioned JSON section/question config, one perf_review
    per employee per cycle, one perf_reviewer row per Self/Lead/HR
    participant).
    """

    # ------------------------------------------------------------------
    # Config: sections & questions
    #
    # The whole sections/questions tree lives as JSON in a PerfReviewConfig
    # row. Every edit below loads whichever snapshot is in effect today,
    # applies the requested change to an in-memory copy, and inserts that as
    # a brand-new row (never updates one in place) — so the full edit
    # history is kept and each version says from which date it took effect
    # and (optionally) why.
    # ------------------------------------------------------------------

    @staticmethod
    def _new_id(prefix):
        return f'{prefix}_{uuid.uuid4().hex[:10]}'

    @staticmethod
    def _default_config():
        return [{
            'id': 'p-others',
            'title': OTHERS_TITLE,
            'description': 'Questions that do not belong to a specific competency.',
            'isOthers': True,
            'questions': [],
            'writtenQuestions': [],
        }]

    @staticmethod
    def _get_latest_config_row(as_of=None):
        as_of = as_of or date.today()
        return (
            PerfReviewConfig.query
            .filter(PerfReviewConfig.applicable_date <= as_of)
            .order_by(PerfReviewConfig.applicable_date.desc(), PerfReviewConfig.config_id.desc())
            .first()
        )

    @staticmethod
    def _load_sections(as_of=None):
        """The full sections list in effect for `as_of` (default: today), as
        a plain, mutable Python structure — safe to edit without touching
        whatever the ORM has cached for the source row."""
        row = PerformanceReviewService._get_latest_config_row(as_of)
        if not row or not row.config:
            return PerformanceReviewService._default_config()
        return copy.deepcopy(row.config)

    @staticmethod
    def _parse_applicable_date(data):
        raw = data.get('applicableDate')
        if not raw:
            raise ValueError("'applicableDate' is required")
        try:
            applicable_date = datetime.strptime(raw, '%Y-%m-%d').date()
        except (TypeError, ValueError):
            raise ValueError("'applicableDate' must be a valid date (YYYY-MM-DD)")
        if applicable_date < date.today():
            raise ValueError('Applicable date cannot be in the past')
        return applicable_date

    @staticmethod
    def _save_new_version(sections, applicable_date, comments, actor_id):
        row = PerfReviewConfig(
            config=sections,
            applicable_date=applicable_date,
            comments=(comments or '').strip() or None,
            created_by=actor_id,
        )
        db.session.add(row)
        return row

    @staticmethod
    def _find_or_create_others(sections):
        for s in sections:
            if s.get('isOthers'):
                return s
        others = {
            'id': PerformanceReviewService._new_id('sec'),
            'title': OTHERS_TITLE,
            'description': 'Questions that do not belong to a specific competency.',
            'isOthers': True,
            'questions': [],
            'writtenQuestions': [],
        }
        sections.append(others)
        return others

    @staticmethod
    def get_config(as_of=None):
        """`as_of` (a date, or an ISO 'YYYY-MM-DD' string) resolves the config
        that will be in effect on that date — e.g. when previewing what a
        review scheduled for a future date will actually ask. Defaults to
        today when omitted."""
        if isinstance(as_of, str):
            try:
                as_of = datetime.strptime(as_of, '%Y-%m-%d').date()
            except ValueError:
                raise ValueError("'asOf' must be a valid date (YYYY-MM-DD)")
        return PerformanceReviewService._load_sections(as_of)

    @staticmethod
    def _log_activity(actor_id, action, ref, summary):
        db.session.add(PerfReviewConfigActivity(
            actor_employee_id=actor_id, action=action, ref=ref, summary=summary,
        ))

    @staticmethod
    def get_activity_log(limit=200):
        rows = (
            PerfReviewConfigActivity.query
            .order_by(PerfReviewConfigActivity.created_at.desc())
            .limit(limit)
            .all()
        )
        actor_ids = {r.actor_employee_id for r in rows if r.actor_employee_id}
        names = {
            e.employee_id: _employee_name(e)
            for e in Employee.query.filter(Employee.employee_id.in_(actor_ids)).all()
        } if actor_ids else {}
        return [
            {
                'id': r.activity_id,
                'action': r.action,
                'ref': r.ref,
                'summary': r.summary,
                'actor': names.get(r.actor_employee_id, r.actor_employee_id or 'System'),
                'at': r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]

    @staticmethod
    def get_config_versions(limit=100):
        """Version history for the config, newest first — lets HR see what
        changed, when it took/takes effect, who made the change, and why."""
        rows = (
            PerfReviewConfig.query
            .order_by(PerfReviewConfig.applicable_date.desc(), PerfReviewConfig.config_id.desc())
            .limit(limit)
            .all()
        )
        actor_ids = {r.created_by for r in rows if r.created_by}
        names = {
            e.employee_id: _employee_name(e)
            for e in Employee.query.filter(Employee.employee_id.in_(actor_ids)).all()
        } if actor_ids else {}
        today = date.today()
        return [
            {
                'id': r.config_id,
                'applicableDate': r.applicable_date.isoformat(),
                'comments': r.comments,
                'createdBy': names.get(r.created_by, r.created_by),
                'createdAt': r.created_at.isoformat() if r.created_at else None,
                'isCurrent': r.applicable_date <= today,
                'sectionCount': len(r.config or []),
            }
            for r in rows
        ]

    @staticmethod
    def create_section(data, actor_id):
        title = (data.get('title') or '').strip()
        if not title:
            raise ValueError("'title' is required")
        applicable_date = PerformanceReviewService._parse_applicable_date(data)

        questions = []
        for q in (data.get('questions') or []):
            text = (q.get('text') or '').strip()
            if not text:
                continue
            questions.append({'id': PerformanceReviewService._new_id('q'), 'text': text, 'weight': q.get('weight')})
        if not questions:
            raise ValueError('Add at least one scored question.')

        sections = PerformanceReviewService._load_sections()
        new_section = {
            'id': PerformanceReviewService._new_id('sec'),
            'title': title,
            'description': (data.get('description') or '').strip(),
            'isOthers': False,
            'questions': questions,
            'writtenQuestions': [],
        }
        # Keep "Others" last, matching how it's always displayed.
        others_idx = next((i for i, s in enumerate(sections) if s.get('isOthers')), None)
        sections.insert(others_idx if others_idx is not None else len(sections), new_section)

        PerformanceReviewService._log_activity(
            actor_id, 'added', f"Section {new_section['id']}",
            f'Added section "{title}" with {len(questions)} question(s), effective {applicable_date.isoformat()}',
        )
        PerformanceReviewService._save_new_version(sections, applicable_date, data.get('comments'), actor_id)
        db.session.commit()
        return new_section

    @staticmethod
    def add_questions_to_section(section_id, data, actor_id):
        applicable_date = PerformanceReviewService._parse_applicable_date(data)
        sections = PerformanceReviewService._load_sections()
        section = next((s for s in sections if s['id'] == section_id), None)
        if not section:
            raise ValueError('Section not found')

        added = []
        for q in (data.get('questions') or []):
            text = (q.get('text') or '').strip()
            if not text:
                continue
            added.append({'id': PerformanceReviewService._new_id('q'), 'text': text, 'weight': q.get('weight')})
        if not added:
            raise ValueError('Add at least one scored question.')
        section.setdefault('questions', []).extend(added)

        PerformanceReviewService._log_activity(
            actor_id, 'added', f'Section {section_id}',
            f'Added {len(added)} question(s) to section "{section["title"]}", effective {applicable_date.isoformat()}',
        )
        PerformanceReviewService._save_new_version(sections, applicable_date, data.get('comments'), actor_id)
        db.session.commit()
        return section

    @staticmethod
    def update_section(section_id, data, actor_id):
        applicable_date = PerformanceReviewService._parse_applicable_date(data)
        sections = PerformanceReviewService._load_sections()
        section = next((s for s in sections if s['id'] == section_id), None)
        if not section:
            raise ValueError('Section not found')

        if not section.get('isOthers') and 'title' in data:
            new_title = (data.get('title') or '').strip()
            if new_title and new_title != section['title']:
                PerformanceReviewService._log_activity(
                    actor_id, 'updated', f'Section {section_id}',
                    f'Renamed section "{section["title"]}" to "{new_title}", effective {applicable_date.isoformat()}',
                )
                section['title'] = new_title
        if 'description' in data:
            section['description'] = (data.get('description') or '').strip()

        if 'questions' in data:
            incoming = data.get('questions') or []
            existing_by_id = {q['id']: q for q in section.get('questions', [])}
            seen_ids = set()
            new_questions = []
            for q in incoming:
                text = (q.get('text') or '').strip()
                if not text:
                    continue
                qid = q.get('id')
                if qid and qid in existing_by_id:
                    old = existing_by_id[qid]
                    if old['text'] != text:
                        PerformanceReviewService._log_activity(
                            actor_id, 'updated', f'Question {qid}',
                            f'Changed question from "{old["text"]}" to "{text}", effective {applicable_date.isoformat()}',
                        )
                    new_questions.append({'id': qid, 'text': text, 'weight': q.get('weight')})
                    seen_ids.add(qid)
                else:
                    new_id = PerformanceReviewService._new_id('q')
                    new_questions.append({'id': new_id, 'text': text, 'weight': q.get('weight')})
                    PerformanceReviewService._log_activity(
                        actor_id, 'added', f'Question {new_id}',
                        f'Added question "{text}" to section "{section["title"]}", effective {applicable_date.isoformat()}',
                    )
            for qid, old in existing_by_id.items():
                if qid not in seen_ids:
                    PerformanceReviewService._log_activity(
                        actor_id, 'removed', f'Question {qid}',
                        f'Removed question "{old["text"]}" from section "{section["title"]}", effective {applicable_date.isoformat()}',
                    )
            section['questions'] = new_questions

        PerformanceReviewService._save_new_version(sections, applicable_date, data.get('comments'), actor_id)
        db.session.commit()
        return section

    @staticmethod
    def delete_section(section_id, data, actor_id):
        applicable_date = PerformanceReviewService._parse_applicable_date(data)
        sections = PerformanceReviewService._load_sections()
        section = next((s for s in sections if s['id'] == section_id), None)
        if not section or section.get('isOthers'):
            raise ValueError('Section not found or cannot be removed')
        sections = [s for s in sections if s['id'] != section_id]

        PerformanceReviewService._log_activity(
            actor_id, 'removed', f'Section {section_id}',
            f'Removed section "{section["title"]}", effective {applicable_date.isoformat()}',
        )
        PerformanceReviewService._save_new_version(sections, applicable_date, data.get('comments'), actor_id)
        db.session.commit()

    @staticmethod
    def distribute_equal_weightage(data, actor_id):
        applicable_date = PerformanceReviewService._parse_applicable_date(data)
        sections = PerformanceReviewService._load_sections()
        all_questions = [q for s in sections for q in s.get('questions', [])]
        total = len(all_questions)
        if not total:
            raise ValueError('Add some scored questions first.')
        base = 100 // total
        remainder = 100 - base * total
        for i, q in enumerate(all_questions):
            q['weight'] = base + (1 if i < remainder else 0)

        PerformanceReviewService._log_activity(
            actor_id, 'updated', 'Weightage',
            f'Distributed equal weightage across {total} scored question(s), effective {applicable_date.isoformat()}',
        )
        PerformanceReviewService._save_new_version(sections, applicable_date, data.get('comments'), actor_id)
        db.session.commit()
        return sections

    @staticmethod
    def save_written_question(data, actor_id):
        applicable_date = PerformanceReviewService._parse_applicable_date(data)
        text = (data.get('text') or '').strip()
        if not text:
            raise ValueError("'text' is required")

        sections = PerformanceReviewService._load_sections()
        section_id = data.get('sectionId')
        section = next((s for s in sections if s['id'] == section_id), None) if section_id else None
        if not section:
            section = PerformanceReviewService._find_or_create_others(sections)

        question_id = data.get('id')
        if question_id:
            from_section = next(
                (s for s in sections if any(q['id'] == question_id for q in s.get('writtenQuestions', []))), None,
            )
            if not from_section:
                raise ValueError('Question not found')
            old_q = next(q for q in from_section['writtenQuestions'] if q['id'] == question_id)
            moved = from_section['id'] != section['id']
            if old_q['text'] != text or moved:
                PerformanceReviewService._log_activity(
                    actor_id, 'updated', f'Question {question_id}',
                    f'Updated written question under section "{section["title"]}", effective {applicable_date.isoformat()}',
                )
            if moved:
                from_section['writtenQuestions'] = [
                    q for q in from_section['writtenQuestions'] if q['id'] != question_id
                ]
                section.setdefault('writtenQuestions', []).append({'id': question_id, 'text': text})
            else:
                old_q['text'] = text
        else:
            new_id = PerformanceReviewService._new_id('wq')
            section.setdefault('writtenQuestions', []).append({'id': new_id, 'text': text})
            PerformanceReviewService._log_activity(
                actor_id, 'added', f'Question {new_id}',
                f'Added written question under section "{section["title"]}", effective {applicable_date.isoformat()}',
            )

        PerformanceReviewService._save_new_version(sections, applicable_date, data.get('comments'), actor_id)
        db.session.commit()
        return section

    @staticmethod
    def delete_written_question(question_id, data, actor_id):
        applicable_date = PerformanceReviewService._parse_applicable_date(data)
        sections = PerformanceReviewService._load_sections()
        section = next(
            (s for s in sections if any(q['id'] == question_id for q in s.get('writtenQuestions', []))), None,
        )
        if not section:
            raise ValueError('Question not found')
        q = next(x for x in section['writtenQuestions'] if x['id'] == question_id)
        section['writtenQuestions'] = [x for x in section['writtenQuestions'] if x['id'] != question_id]

        PerformanceReviewService._log_activity(
            actor_id, 'removed', f'Question {question_id}',
            f'Removed written question "{q["text"]}", effective {applicable_date.isoformat()}',
        )
        PerformanceReviewService._save_new_version(sections, applicable_date, data.get('comments'), actor_id)
        db.session.commit()

    # ------------------------------------------------------------------
    # Cycles
    # ------------------------------------------------------------------

    @staticmethod
    def get_cycles(employee_id=None, viewer_id=None, viewer_role=None):
        """All cycles, newest period first (by actual start date — cycle_id
        order doesn't track period chronology since cycles get created in
        whatever order HR happens to initiate/visit them in).

        With `employee_id`, scoped to only the cycles this employee actually
        has an initiated review for (via the legacy employee_review link) —
        used by the review-taking screen's cycle picker so it can't be used
        to browse into (and thereby silently auto-create, see
        get_or_create_review) a review for a period nobody ever initiated
        for them."""
        query = PerfReviewCycle.query
        if employee_id:
            from ..models.capability_development import EmployeeReview
            cycle_ids = (
                db.session.query(EmployeeReview.perf_cycle_id)
                .filter(
                    EmployeeReview.employee_id == employee_id,
                    EmployeeReview.perf_cycle_id.isnot(None),
                )
                .distinct()
            )
            query = query.filter(PerfReviewCycle.cycle_id.in_(cycle_ids))
        cycles = query.order_by(
            PerfReviewCycle.start_date.desc().nullslast(), PerfReviewCycle.cycle_id.desc(),
        ).all()
        # Non-HR viewers only get the cycles of reviews they're allowed to see.
        if employee_id and viewer_id and (viewer_role or '').lower() not in ('admin', 'hr'):
            cycles = [
                c for c in cycles
                if PerformanceReviewService.can_view_review(
                    PerfReview.query.filter_by(cycle_id=c.cycle_id, employee_id=employee_id).first(),
                    viewer_id, viewer_role,
                )
            ]
        return [
            {
                'id': c.cycle_id, 'name': c.name,
                'startDate': c.start_date.isoformat() if c.start_date else None,
                'endDate': c.end_date.isoformat() if c.end_date else None,
                'status': c.status,
            }
            for c in cycles
        ]

    @staticmethod
    def create_cycle(data, actor_id):
        name = (data.get('name') or '').strip()
        if not name:
            raise ValueError("'name' is required")
        if PerfReviewCycle.query.filter_by(name=name).first():
            raise ValueError(f'Cycle "{name}" already exists')
        cycle = PerfReviewCycle(
            name=name,
            start_date=data.get('startDate'),
            end_date=data.get('endDate'),
            status=data.get('status') or 'active',
            created_by=actor_id,
        )
        db.session.add(cycle)
        db.session.commit()
        return {'id': cycle.cycle_id, 'name': cycle.name, 'status': cycle.status}

    @staticmethod
    def get_or_create_cycle(data, actor_id):
        """Like create_cycle, but returns the existing cycle instead of
        raising if one with this name already exists — periods (a given
        month/quarter) are shared across every employee reviewed in them, so
        initiating a second employee's review for an already-used period
        must reuse that cycle, not fail."""
        name = (data.get('name') or '').strip()
        if not name:
            raise ValueError("'name' is required")
        cycle = PerfReviewCycle.query.filter_by(name=name).first()
        if cycle:
            return cycle
        cycle = PerfReviewCycle(
            name=name,
            start_date=data.get('startDate'),
            end_date=data.get('endDate'),
            status=data.get('status') or 'active',
            created_by=actor_id,
        )
        db.session.add(cycle)
        db.session.commit()
        return cycle

    # ------------------------------------------------------------------
    # Reviews
    # ------------------------------------------------------------------

    @staticmethod
    def _overlapping_project_ids(employee_id, start_date, end_date):
        """Every project this employee was allocated to (current or
        historical) whose own allocation window overlaps [start_date,
        end_date] — an allocation that has since ended or changed still
        counts if it overlapped the review period."""
        from ..models.hr import ProjectAllocationHistory

        rows = list(
            db.session.query(ProjectAllocation.project_id, ProjectAllocation.start_date, ProjectAllocation.end_date)
            .filter(ProjectAllocation.employee_id == employee_id)
            .all()
        ) + list(
            db.session.query(
                ProjectAllocationHistory.project_id,
                ProjectAllocationHistory.start_date,
                ProjectAllocationHistory.end_date,
            )
            .filter(ProjectAllocationHistory.employee_id == employee_id)
            .all()
        )
        project_ids = set()
        for project_id, a_start, a_end in rows:
            if a_start is None:
                continue
            if a_start <= end_date and (a_end is None or a_end >= start_date):
                project_ids.add(project_id)
        return project_ids

    @staticmethod
    def _values_during(history_rows, current_value, start_date, end_date):
        """Shared point-in-time resolution for an audit-log-style history
        table: each row's value took effect at that row's own timestamp and
        held until the next row's timestamp (or indefinitely for the most
        recent one, which should match `current_value` on the live table).
        Returns every value whose effective window overlaps [start_date,
        end_date] — a value can appear more than once in the period if it
        was set, changed away, then changed back, but the result is a set
        so that's naturally deduplicated.

        `history_rows` must be a list of (value, changed_at) tuples already
        sorted oldest-first."""
        values = set()
        if not history_rows:
            if current_value:
                values.add(current_value)
            return values
        for i, (value, changed_at) in enumerate(history_rows):
            valid_from = changed_at.date() if hasattr(changed_at, 'date') else changed_at
            valid_to = history_rows[i + 1][1] if i + 1 < len(history_rows) else None
            valid_to = valid_to.date() if valid_to and hasattr(valid_to, 'date') else valid_to
            if value and valid_from <= end_date and (valid_to is None or valid_to > start_date):
                values.add(value)
        return values

    @staticmethod
    def _project_leads_during(project_id, start_date, end_date):
        """Every employee_id who was this project's lead_by at any point
        whose tenure overlaps [start_date, end_date]."""
        from ..models.hr import ProjectHistory

        history_rows = (
            db.session.query(ProjectHistory.lead_by, ProjectHistory.modified_on)
            .filter(ProjectHistory.project_id == project_id)
            .order_by(ProjectHistory.modified_on.asc())
            .all()
        )
        project = Project.query.get(project_id)
        current_lead_by = project.lead_by if project else None
        return PerformanceReviewService._values_during(
            list(history_rows), current_lead_by, start_date, end_date,
        )

    @staticmethod
    def _leave_approvers_during(employee_id, start_date, end_date):
        """Every employee_id who was this employee's leave approver
        (Employee.team_lead_id) at any point whose tenure overlaps
        [start_date, end_date]."""
        from ..models.hr import EmployeeHistory

        history_rows = (
            db.session.query(EmployeeHistory.team_lead_id, EmployeeHistory.operation_timestamp)
            .filter(EmployeeHistory.employee_id == employee_id)
            .order_by(EmployeeHistory.operation_timestamp.asc())
            .all()
        )
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        current_team_lead_id = employee.team_lead_id if employee else None
        return PerformanceReviewService._values_during(
            list(history_rows), current_team_lead_id, start_date, end_date,
        )

    @staticmethod
    def _resolve_reviewers_for_period(employee_id, start_date, end_date):
        """Every project lead AND leave approver this employee had at any
        point during [start_date, end_date] — for a monthly review that's
        the review month; for quarterly, the whole 3-month quarter window.
        Replaces resolving only today's current assignments, since someone
        who led/approved for part of the period should still get to review
        it even if that's since changed."""
        reviewer_ids = set()
        for project_id in PerformanceReviewService._overlapping_project_ids(employee_id, start_date, end_date):
            reviewer_ids |= PerformanceReviewService._project_leads_during(project_id, start_date, end_date)
        reviewer_ids |= PerformanceReviewService._leave_approvers_during(employee_id, start_date, end_date)
        reviewer_ids.discard(employee_id)  # never list the employee as their own reviewer
        if not reviewer_ids:
            return []
        return Employee.query.filter(Employee.employee_id.in_(reviewer_ids)).all()

    @staticmethod
    def preview_reviewers(employee_id, start_date=None, end_date=None):
        """Who would review this employee, without creating anything yet —
        for the "Initiate Review" wizard's preview step. Without a period
        window (start_date/end_date), falls back to just today, i.e.
        whoever is the current project lead/leave approver."""
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            raise ValueError('Employee not found')
        today = date.today()
        leads = PerformanceReviewService._resolve_reviewers_for_period(
            employee_id, start_date or today, end_date or today,
        )
        return {
            'self': {'employeeId': employee_id, 'name': _employee_name(employee)},
            'leads': (
                [{'employeeId': l.employee_id, 'name': _employee_name(l)} for l in leads]
                or [{'employeeId': None, 'name': 'Project Lead / Leave Approver (unassigned)'}]
            ),
            'hr': {'employeeId': None, 'name': 'HR'},
        }

    # Fiscal quarters start in November: Q1=Nov(year-1)-Jan(year),
    # Q2=Feb-Apr(year), Q3=May-Jul(year), Q4=Aug-Oct(year) — 'year' is the
    # calendar year most of the cycle (Q2-Q4, and Jan of Q1) falls in.
    QUARTER_START = {1: (11, -1), 2: (2, 0), 3: (5, 0), 4: (8, 0)}

    @staticmethod
    def _period_to_cycle_spec(period_type, month=None, quarter=None, year=None):
        """Turns a monthly/quarterly period selection into a cycle name plus
        its date range — e.g. monthly '2026-09' -> ('Sep 2026', 1-30 Sep
        2026); quarterly (quarter=1, year=2026) -> ('Q1 2026', 1 Nov 2025-31
        Jan 2026), since the fiscal year here starts in November."""
        import calendar

        if period_type == 'monthly':
            if not month:
                raise ValueError("'month' is required for a monthly review")
            try:
                year_part, month_part = month.split('-')
                y, m = int(year_part), int(month_part)
            except (ValueError, AttributeError):
                raise ValueError("'month' must be in YYYY-MM format")
            start = date(y, m, 1)
            end = date(y, m, calendar.monthrange(y, m)[1])
            return start.strftime('%b %Y'), start, end

        if period_type == 'quarterly':
            if not quarter or not year:
                raise ValueError("'quarter' and 'year' are required for a quarterly review")
            quarter, year = int(quarter), int(year)
            if quarter not in (1, 2, 3, 4):
                raise ValueError("'quarter' must be between 1 and 4")
            start_month, year_offset = PerformanceReviewService.QUARTER_START[quarter]
            start_year = year + year_offset
            start = date(start_year, start_month, 1)
            end_year, end_month = divmod(start_year * 12 + (start_month - 1) + 2, 12)
            end_month += 1
            end = date(end_year, end_month, calendar.monthrange(end_year, end_month)[1])
            return f'Q{quarter} {year}', start, end

        raise ValueError("'periodType' must be 'monthly' or 'quarterly'")

    @staticmethod
    def _assert_no_overlapping_review(employee_id, start, end, exclude_cycle_id=None):
        """Blocks initiating a review whose period overlaps one this
        employee already has in progress — two open reviews covering
        overlapping stretches of time is exactly the confusion this is meant
        to prevent (e.g. a Q3 review still pending when a Q4 one is started
        for the same employee)."""
        from ..models.capability_development import EmployeeReview

        rows = (
            db.session.query(EmployeeReview.perf_cycle_id)
            .filter(
                EmployeeReview.employee_id == employee_id,
                EmployeeReview.status.notin_(['Reviewed', 'Cancelled']),
                EmployeeReview.perf_cycle_id.isnot(None),
            )
            .distinct()
            .all()
        )
        cycle_ids = {r[0] for r in rows if r[0] and r[0] != exclude_cycle_id}
        if not cycle_ids:
            return
        overlapping = (
            PerfReviewCycle.query
            .filter(
                PerfReviewCycle.cycle_id.in_(cycle_ids),
                PerfReviewCycle.start_date <= end,
                PerfReviewCycle.end_date >= start,
            )
            .first()
        )
        if overlapping:
            raise ValueError(
                f'This employee already has a review in progress for "{overlapping.name}", which overlaps '
                'this period. Complete or cancel it before starting another one for the same time span.'
            )

    @staticmethod
    def initiate_review(data, actor_id):
        """Sets up the review period (monthly/quarterly), resolves/creates
        its cycle, and creates the employee's review + Self/Lead(s)/HR
        reviewer rows — the "Confirm" step of the Initiate Review wizard."""
        employee_id = data.get('employeeId')
        if not employee_id:
            raise ValueError("'employeeId' is required")
        if not data.get('reviewDate'):
            raise ValueError("'reviewDate' is required")

        name, start, end = PerformanceReviewService._period_to_cycle_spec(
            data.get('periodType'), month=data.get('month'), quarter=data.get('quarter'), year=data.get('year'),
        )
        existing_cycle = PerfReviewCycle.query.filter_by(name=name).first()
        PerformanceReviewService._assert_no_overlapping_review(
            employee_id, start, end, exclude_cycle_id=existing_cycle.cycle_id if existing_cycle else None,
        )
        cycle = PerformanceReviewService.get_or_create_cycle(
            {'name': name, 'startDate': start.isoformat(), 'endDate': end.isoformat()}, actor_id,
        )
        review = PerformanceReviewService.get_or_create_review(
            cycle.cycle_id, employee_id, override_leads=data.get('leads'),
        )
        return {
            'cycle': {
                'id': cycle.cycle_id, 'name': cycle.name,
                'startDate': start.isoformat(), 'endDate': end.isoformat(),
            },
            'review': review,
        }

    @staticmethod
    def _blank_reviewer(employee_id, name):
        return {
            'employeeId': employee_id, 'name': name, 'submitted': False, 'submittedAt': None,
            'scores': {}, 'answers': {}, 'comments': {},
        }

    @staticmethod
    def get_or_create_review(cycle_id, employee_id, override_leads=None):
        """`override_leads`, when given, is what HR edited the auto-resolved
        reviewer list down to in the Initiate Review wizard (a list of
        {employeeId, name}) — used as-is instead of re-resolving from
        project/leave-approver history. Only applies the first time a
        review is created; has no effect on an already-existing one."""
        cycle = PerfReviewCycle.query.get(cycle_id)
        if not cycle:
            raise ValueError('Review cycle not found')
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            raise ValueError('Employee not found')

        review = PerfReview.query.filter_by(cycle_id=cycle_id, employee_id=employee_id).first()
        if not review:
            # None means "not specified, auto-resolve"; an explicit (even
            # empty) list means HR has final say on exactly who's listed —
            # don't second-guess an intentional "remove everyone".
            if override_leads is not None:
                lead_entries = [
                    PerformanceReviewService._blank_reviewer(l.get('employeeId'), l.get('name') or 'Project Lead')
                    for l in override_leads if l.get('employeeId') or l.get('name')
                ]
            else:
                leads = PerformanceReviewService._resolve_reviewers_for_period(
                    employee_id, cycle.start_date, cycle.end_date,
                )
                lead_entries = (
                    [PerformanceReviewService._blank_reviewer(l.employee_id, _employee_name(l)) for l in leads]
                    or [PerformanceReviewService._blank_reviewer(None, 'Project Lead')]
                )
            # Freezes a copy of the sections/questions config as it stands
            # right now — later edits to perf_review_config must not change
            # what this review is scored against.
            review = PerfReview(
                cycle_id=cycle_id,
                employee_id=employee_id,
                review={
                    'sections': PerformanceReviewService._load_sections(),
                    'self': PerformanceReviewService._blank_reviewer(employee_id, _employee_name(employee)),
                    'leads': lead_entries,
                    'hr': PerformanceReviewService._blank_reviewer(None, 'HR'),
                },
            )
            db.session.add(review)
            db.session.commit()

        return PerformanceReviewService._serialize_review(review)

    @staticmethod
    def _schedule_row(cycle_id, employee_id):
        """The legacy employee_review row that tracks this review's meeting
        date / actual review date / status (null for very old reviews)."""
        from ..models.capability_development import EmployeeReview
        return (
            EmployeeReview.query
            .filter(EmployeeReview.perf_cycle_id == cycle_id, EmployeeReview.employee_id == employee_id,
                    EmployeeReview.status != 'Cancelled')
            .order_by(EmployeeReview.review_id.desc())
            .first()
        )

    @staticmethod
    def get_completion(cycle_id, employee_id):
        row = PerformanceReviewService._schedule_row(cycle_id, employee_id)
        return {
            'completed': bool(row and row.status == 'Reviewed'),
            'completedDate': row.reviewed_date.isoformat() if row and row.reviewed_date else None,
            'meetingDate': row.review_date.isoformat() if row and row.review_date else None,
            'meetingNotes': row.review_comment if row else None,
        }

    @staticmethod
    def complete_review(cycle_id, employee_id, data, actor_id):
        """HR closes the review after the meeting: records the actual meeting
        date and optional notes, marks it Reviewed (which locks the scorecard
        for everyone, see _get_review_and_reviewer)."""
        review = PerfReview.query.filter_by(cycle_id=cycle_id, employee_id=employee_id).first()
        if not review:
            raise ValueError('Review not found')
        row = PerformanceReviewService._schedule_row(cycle_id, employee_id)
        if not row:
            raise ValueError('No scheduled review found for this cycle')
        if row.status == 'Reviewed':
            raise ValueError('This review is already completed')
        serialized = PerformanceReviewService._serialize_review(review)
        slots = [serialized['self'], *serialized['leads'], serialized['hr']]
        if not all(s and s['submitted'] for s in slots):
            raise ValueError('Every reviewer must submit before the review can be completed')
        try:
            meeting = datetime.strptime(data.get('meetingDate') or '', '%Y-%m-%d').date()
        except ValueError:
            raise ValueError('A valid meeting date (YYYY-MM-DD) is required')
        row.reviewed_date = meeting
        row.status = 'Reviewed'
        notes = (data.get('notes') or '').strip()
        if notes:
            row.review_comment = notes
        db.session.commit()
        Logger.info('Performance review completed', cycle_id=cycle_id, employee_id=employee_id, actor_id=actor_id)
        return PerformanceReviewService.get_completion(cycle_id, employee_id)

    @staticmethod
    def _serialize_review(review):
        data = review.review or {}

        def serialize_reviewer(role, ref, r):
            if not r:
                return None
            return {
                'reviewerId': f'{review.review_id}:{role}:{ref}',
                'role': role,
                'employeeId': r.get('employeeId'),
                'name': r.get('name'),
                'submitted': bool(r.get('submitted')),
                'submittedAt': r.get('submittedAt'),
                'scores': r.get('scores') or {},
                'answers': r.get('answers') or {},
                'comments': r.get('comments') or {},
            }

        leads = data.get('leads') or []
        return {
            'reviewId': review.review_id,
            'cycleId': review.cycle_id,
            'employeeId': review.employee_id,
            # The sections/questions this specific review was actually
            # created with — frozen at creation time, not the live config.
            'sections': data.get('sections') or [],
            'self': serialize_reviewer('self', '-', data.get('self')),
            'leads': [serialize_reviewer('lead', i, l) for i, l in enumerate(leads)],
            'hr': serialize_reviewer('hr', '-', data.get('hr')),
            **PerformanceReviewService.get_completion(review.cycle_id, review.employee_id),
        }

    @staticmethod
    def can_view_review(review, actor_id, actor_role):
        """HR/Admin see every review; anyone else only a review they are part
        of — their own (as the employee) or one where they are an assigned
        lead/reviewer."""
        if not review:
            return False
        if (actor_role or '').lower() in ('admin', 'hr'):
            return True
        if review.employee_id == actor_id:
            return True
        return any(l.get('employeeId') == actor_id for l in (review.review or {}).get('leads') or [])

    @staticmethod
    def mask_review_for_viewer(serialized, actor_id, actor_role):
        """Blind-review rule, enforced server-side: until every reviewer has
        submitted, a viewer only gets the scores/answers/comments of the slot
        they fill in themselves; everyone else's are blanked (their
        submitted/pending status stays visible)."""
        if serialized.get('completed'):
            return serialized
        slots = [serialized.get('self'), *(serialized.get('leads') or []), serialized.get('hr')]
        slots = [s for s in slots if s]
        if slots and all(s.get('submitted') for s in slots) and serialized.get('leads'):
            return serialized

        is_hr = (actor_role or '').lower() in ('admin', 'hr')
        for slot in slots:
            mine = is_hr if slot['role'] == 'hr' else slot.get('employeeId') == actor_id
            if not mine:
                slot['scores'], slot['answers'], slot['comments'] = {}, {}, {}
        return serialized

    @staticmethod
    def get_my_reviewees(actor_id):
        """The people whose initiated review this user may open as a
        non-HR user: themselves (if they have one) and everyone they're an
        assigned lead/reviewer for. [{'employeeId', 'employeeName', 'isSelf'}],
        self first, then by name."""
        from ..models.capability_development import EmployeeReview
        from ..utils.constants import ActiveEmployees

        initiated = {
            (r.perf_cycle_id, r.employee_id)
            for r in EmployeeReview.query.filter(
                EmployeeReview.perf_cycle_id.isnot(None), EmployeeReview.status != 'Cancelled',
            ).all()
        }
        employee_ids = set()
        for review in PerfReview.query.all():
            if (review.cycle_id, review.employee_id) not in initiated:
                continue
            leads = (review.review or {}).get('leads') or []
            if review.employee_id == actor_id or any(l.get('employeeId') == actor_id for l in leads):
                employee_ids.add(review.employee_id)
        if not employee_ids:
            return []
        employees = Employee.query.filter(Employee.employee_id.in_(employee_ids)).all()
        result = [
            {'employeeId': e.employee_id, 'employeeName': _employee_name(e), 'isSelf': e.employee_id == actor_id}
            for e in employees
            if e.employee_id == actor_id or e.employment_status not in ActiveEmployees.STATUS_INACTIVE
        ]
        return sorted(result, key=lambda r: (not r['isSelf'], (r['employeeName'] or '').lower()))

    @staticmethod
    def get_review_list(actor_id, actor_role):
        """Every initiated review the viewer may see, newest period first, with
        per-reviewer submission status. HR/Admin get all employees; anyone else
        only reviews they are part of (their own, or ones they lead)."""
        from ..models.capability_development import EmployeeReview

        links = {}
        for r in EmployeeReview.query.filter(EmployeeReview.perf_cycle_id.isnot(None)).all():
            links[(r.perf_cycle_id, r.employee_id)] = r
        is_hr = (actor_role or '').lower() in ('admin', 'hr')

        rows = []
        for review in PerfReview.query.all():
            link = links.get((review.cycle_id, review.employee_id))
            if not link or link.status == 'Cancelled':
                continue
            if not PerformanceReviewService.can_view_review(review, actor_id, actor_role):
                continue
            data = review.review or {}
            slots = [('Self', data.get('self'), (data.get('self') or {}).get('employeeId') == actor_id)]
            for l in data.get('leads') or []:
                slots.append((f"Lead: {l.get('name') or l.get('employeeId')}", l, l.get('employeeId') == actor_id))
            slots.append(('HR', data.get('hr'), is_hr))
            slots = [(label, s, mine) for label, s, mine in slots if s]
            done = sum(1 for _, s, _ in slots if s.get('submitted'))
            all_submitted = bool(slots) and done == len(slots)
            if link.status == 'Reviewed':
                status = 'Completed'
            elif done:
                status = 'In Progress'
            else:
                status = 'Not Started'
            mine_slots = [s for _, s, mine in slots if mine]
            rows.append({
                'reviewId': review.review_id,
                'cycleId': review.cycle_id,
                'employeeId': review.employee_id,
                'meetingDate': link.review_date.isoformat() if link.review_date else None,
                'scheduleId': link.review_id,
                'scheduleStatus': link.status,
                'reviewedDate': link.reviewed_date.isoformat() if link.reviewed_date else None,
                'fileLink': link.file_link,
                'reviewComment': link.review_comment,
                'otherComments': link.other_comments,
                'status': status,
                'allSubmitted': all_submitted,
                'completedDate': link.reviewed_date.isoformat() if link.reviewed_date else None,
                'submittedCount': done,
                'totalCount': len(slots),
                'reviewers': [
                    {'label': label, 'submitted': bool(s.get('submitted'))} for label, s, _ in slots
                ],
                'myPending': bool(mine_slots) and not all(s.get('submitted') for s in mine_slots),
            })
        if not rows:
            return []

        cycles = {c.cycle_id: c for c in PerfReviewCycle.query.filter(
            PerfReviewCycle.cycle_id.in_({r['cycleId'] for r in rows})).all()}
        emps = {e.employee_id: e for e in Employee.query.filter(
            Employee.employee_id.in_({r['employeeId'] for r in rows})).all()}
        for r in rows:
            c, e = cycles.get(r['cycleId']), emps.get(r['employeeId'])
            r['cycleName'] = c.name if c else None
            r['startDate'] = c.start_date.isoformat() if c and c.start_date else None
            r['endDate'] = c.end_date.isoformat() if c and c.end_date else None
            r['employeeName'] = _employee_name(e) if e else r['employeeId']
            r['employmentStatus'] = e.employment_status if e else None
        rows.sort(key=lambda r: (r['employeeName'] or '').lower())
        rows.sort(key=lambda r: (r['startDate'] or '', r['endDate'] or '', r['cycleId']), reverse=True)
        return rows

    @staticmethod
    def _active_hr_employees():
        """Active employees holding the HR role — the people who can fill in
        the (shared) HR slot of a review."""
        from ..models.hr import EmployeeRole, MasterRole
        from ..utils.constants import ActiveEmployees

        return (
            Employee.query
            .join(EmployeeRole, EmployeeRole.employee_id == Employee.employee_id)
            .join(MasterRole, MasterRole.role_id == EmployeeRole.role_id)
            .filter(
                MasterRole.role_name == 'HR',
                Employee.employment_status.notin_(ActiveEmployees.STATUS_INACTIVE),
            )
            .all()
        )

    @staticmethod
    def get_review_participants(review, pending_only=False, include_hr=True):
        """Everyone who has to fill in this review — the employee (self),
        each assigned lead/leave approver, and (with `include_hr`) every
        active HR user (the HR slot is shared: one HR submission completes
        it for all of them).

        Returns [{'role': 'self'|'lead'|'hr', 'employeeId', 'name', 'email'}].
        With `pending_only`, drops reviewers whose slot is already submitted.
        Inactive employees, lead slots with no assigned employee, and people
        without an email are skipped."""
        from ..utils.constants import ActiveEmployees

        data = review.review or {}
        participants = []

        def add(role, slot, emp):
            if not emp or not emp.email:
                return
            if emp.employment_status in ActiveEmployees.STATUS_INACTIVE:
                return
            if pending_only and slot and slot.get('submitted'):
                return
            participants.append({
                'role': role, 'employeeId': emp.employee_id,
                'name': _employee_name(emp), 'email': emp.email,
            })

        self_slot = data.get('self') or {}
        add('self', self_slot, Employee.query.filter_by(employee_id=review.employee_id).first())

        for lead in data.get('leads') or []:
            if lead.get('employeeId'):
                add('lead', lead, Employee.query.filter_by(employee_id=lead['employeeId']).first())

        hr_slot = data.get('hr') or {}
        if include_hr and not (pending_only and hr_slot.get('submitted')):
            for hr_emp in PerformanceReviewService._active_hr_employees():
                add('hr', hr_slot, hr_emp)

        # An HR user can also be the employee's lead (or the employee) —
        # keep one entry per person, preferring the more specific role.
        seen, unique = set(), []
        for p in participants:
            if p['employeeId'] in seen:
                continue
            seen.add(p['employeeId'])
            unique.append(p)
        return unique

    @staticmethod
    def _parse_reviewer_id(reviewer_id):
        try:
            review_id_str, role, ref = str(reviewer_id).split(':', 2)
            review_id = int(review_id_str)
        except (ValueError, AttributeError):
            raise ValueError('Invalid reviewer id')
        if role not in ROLES:
            raise ValueError('Invalid reviewer id')
        return review_id, role, ref

    @staticmethod
    def _get_review_and_reviewer(reviewer_id):
        """Resolves a `{reviewId}:{role}:{ref}` reviewer id (see
        _serialize_review) back to the PerfReview row, its full JSON `data`,
        and the specific reviewer dict (self/one lead/hr) it refers to —
        `data[role]` mutated in place is what gets saved back."""
        review_id, role, ref = PerformanceReviewService._parse_reviewer_id(reviewer_id)
        review = PerfReview.query.get(review_id)
        if not review:
            raise ValueError('Reviewer not found')
        # Every caller mutates the review, and a completed review is frozen.
        if PerformanceReviewService.get_completion(review.cycle_id, review.employee_id)['completed']:
            raise PermissionError('This review has been completed by HR and is locked.')
        data = review.review or {}
        if role == 'lead':
            try:
                idx = int(ref)
            except ValueError:
                raise ValueError('Reviewer not found')
            leads = data.get('leads') or []
            if idx < 0 or idx >= len(leads):
                raise ValueError('Reviewer not found')
            reviewer = leads[idx]
        else:
            reviewer = data.get(role)
        if not reviewer:
            raise ValueError('Reviewer not found')
        return review, data, role, ref, reviewer

    @staticmethod
    def _save_reviewer(review, data, role, ref, reviewer):
        if role == 'lead':
            data['leads'][int(ref)] = reviewer
        else:
            data[role] = reviewer
        review.review = data
        flag_modified(review, 'review')
        db.session.commit()

    @staticmethod
    def _assert_can_edit(reviewer, role, actor_id, actor_role):
        """A reviewer entry can only be edited by whoever it actually
        belongs to: the HR slot has no assigned employee (any HR/Admin fills
        it), but Self and every Lead slot belong to one specific person, and
        only that person may edit or submit it — HR/Admin do NOT get a
        blanket override here, so HR can't change someone's self- or
        lead-rating on their behalf."""
        if role == 'hr':
            if actor_role in ('admin', 'hr'):
                return
            raise PermissionError('Only HR/Admin can fill in the HR review')
        if reviewer.get('employeeId') != actor_id:
            raise PermissionError('You can only edit your own review')
        if reviewer.get('submitted'):
            raise PermissionError('This review is submitted and locked. Unlock it first.')

    @staticmethod
    def upsert_score(reviewer_id, question_id, score, actor_id, actor_role):
        review, data, role, ref, reviewer = PerformanceReviewService._get_review_and_reviewer(reviewer_id)
        PerformanceReviewService._assert_can_edit(reviewer, role, actor_id, actor_role)
        if score is None or not (1 <= int(score) <= 5):
            raise ValueError('score must be between 1 and 5')
        reviewer.setdefault('scores', {})[str(question_id)] = int(score)
        PerformanceReviewService._save_reviewer(review, data, role, ref, reviewer)

    @staticmethod
    def upsert_answer(reviewer_id, question_id, text, actor_id, actor_role):
        review, data, role, ref, reviewer = PerformanceReviewService._get_review_and_reviewer(reviewer_id)
        PerformanceReviewService._assert_can_edit(reviewer, role, actor_id, actor_role)
        reviewer.setdefault('answers', {})[str(question_id)] = text
        PerformanceReviewService._save_reviewer(review, data, role, ref, reviewer)

    @staticmethod
    def upsert_comment(reviewer_id, section_id, text, actor_id, actor_role):
        review, data, role, ref, reviewer = PerformanceReviewService._get_review_and_reviewer(reviewer_id)
        PerformanceReviewService._assert_can_edit(reviewer, role, actor_id, actor_role)
        reviewer.setdefault('comments', {})[str(section_id)] = text
        PerformanceReviewService._save_reviewer(review, data, role, ref, reviewer)

    @staticmethod
    def reset_reviewer(reviewer_id, actor_id, actor_role):
        """Clears every score, written answer and section comment of an
        ongoing (not yet submitted) review. Same permission rule as editing:
        only the reviewer themself (or HR/Admin for the HR slot), and never
        on a submitted/locked review."""
        review, data, role, ref, reviewer = PerformanceReviewService._get_review_and_reviewer(reviewer_id)
        PerformanceReviewService._assert_can_edit(reviewer, role, actor_id, actor_role)
        reviewer['scores'] = {}
        reviewer['answers'] = {}
        reviewer['comments'] = {}
        PerformanceReviewService._save_reviewer(review, data, role, ref, reviewer)
        Logger.info('Performance review reset', reviewer_id=reviewer_id, role=role, actor_id=actor_id)

    @staticmethod
    def submit_reviewer(reviewer_id, actor_id, actor_role):
        review, data, role, ref, reviewer = PerformanceReviewService._get_review_and_reviewer(reviewer_id)
        PerformanceReviewService._assert_can_edit(reviewer, role, actor_id, actor_role)
        reviewer['submitted'] = True
        reviewer['submittedAt'] = _now().isoformat()
        PerformanceReviewService._save_reviewer(review, data, role, ref, reviewer)
        Logger.info('Performance review submitted', reviewer_id=reviewer_id, role=role)

    @staticmethod
    def unlock_reviewer(reviewer_id, actor_id, actor_role):
        review, data, role, ref, reviewer = PerformanceReviewService._get_review_and_reviewer(reviewer_id)
        # Unlocking is always allowed for the reviewer themself or HR/Admin —
        # deliberately not gated by _assert_can_edit's "submitted" check
        # (that check exists to block edits on a locked review, not unlocking it).
        if actor_role not in ('admin', 'hr') and reviewer.get('employeeId') != actor_id:
            raise PermissionError('You can only unlock your own review')
        reviewer['submitted'] = False
        reviewer['submittedAt'] = None
        PerformanceReviewService._save_reviewer(review, data, role, ref, reviewer)

    # ------------------------------------------------------------------
    # Summary (weighted averages)
    # ------------------------------------------------------------------

    @staticmethod
    def _parameter_avg(scores_by_qid, section_questions):
        rated = [(q, scores_by_qid[q['id']]) for q in section_questions if q['id'] in scores_by_qid]
        if not rated:
            return None
        total_weight = sum(float(q.get('weight') or 1) for q, _ in rated)
        if not total_weight:
            return None
        return sum(float(q.get('weight') or 1) * score for q, score in rated) / total_weight

    @staticmethod
    def get_summary(cycle_id, employee_id):
        review = PerfReview.query.filter_by(cycle_id=cycle_id, employee_id=employee_id).first()
        if not review:
            return {'selfAvg': None, 'leadAvg': None, 'hrAvg': None, 'combined': None}

        data = review.review or {}
        # The questions/weightage this review was actually scored against —
        # its own frozen snapshot, not whatever perf_review_config says today.
        sections = data.get('sections') or []

        def reviewer_avg(r):
            if not r or not r.get('submitted'):
                return None
            scores_by_qid = r.get('scores') or {}
            per_section = [
                PerformanceReviewService._parameter_avg(scores_by_qid, s.get('questions', []))
                for s in sections
            ]
            vals = [v for v in per_section if v is not None]
            return sum(vals) / len(vals) if vals else None

        leads = data.get('leads') or []
        submitted_leads = [l for l in leads if l.get('submitted')]

        self_avg = reviewer_avg(data.get('self'))
        hr_avg = reviewer_avg(data.get('hr'))
        lead_avgs = [v for v in (reviewer_avg(l) for l in submitted_leads) if v is not None]
        lead_avg = sum(lead_avgs) / len(lead_avgs) if lead_avgs else None

        role_avgs = [v for v in (self_avg, lead_avg, hr_avg) if v is not None]
        combined = sum(role_avgs) / len(role_avgs) if role_avgs else None

        return {
            'selfAvg': self_avg, 'leadAvg': lead_avg, 'hrAvg': hr_avg, 'combined': combined,
            'leadSubmitted': len(submitted_leads),
            'leadTotal': len(leads),
        }
