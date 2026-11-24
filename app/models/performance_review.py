from .. import db

"""
Performance Review (Employee Review v2) models.

Mirrors migrations/performance_review_tables.sql exactly — see that file for
the schema rationale (versioned JSON section/question config; one perf_review
per employee per cycle, itself a single JSON blob holding the frozen
questions snapshot plus every reviewer's scores/answers/comments).
"""


class PerfReviewCycle(db.Model):
    __tablename__ = 'perf_review_cycle'

    cycle_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    status = db.Column(db.String(20), nullable=False, default='active')  # draft | active | closed
    created_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    modified_at = db.Column(db.DateTime, onupdate=db.func.now())


class PerfReviewConfig(db.Model):
    """One full, self-contained snapshot of the sections/questions config.

    Every edit in the "Configure Parameters & Questions" screen inserts a
    NEW row here — never an update-in-place — so the whole edit history is
    preserved. `applicable_date` says from which date this snapshot takes
    effect; the config in effect for a given date is the row with the
    latest `applicable_date` that is <= that date. `comments` lets whoever
    made the change record why.
    """
    __tablename__ = 'perf_review_config'

    config_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    config = db.Column(db.JSON, nullable=False)  # the full sections/questions tree
    applicable_date = db.Column(db.Date, nullable=False)
    comments = db.Column(db.Text)
    created_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())


class PerfReview(db.Model):
    """One review per employee per cycle, stored as a single JSON blob.

    `review` holds everything: the sections/questions snapshot frozen at the
    moment the review was created (so a later edit to perf_review_config
    doesn't retroactively change what this review is scored against, since
    weightage/questions can change), plus each reviewer's (self/lead(s)/HR)
    scores, written answers and section comments. Updated in place as
    reviewers work — unlike perf_review_config, this is a single current
    record per review, not a versioned history.

    Shape of `review`:
        {
          "sections": [ {id, title, description, isOthers,
                          questions: [{id, text, weight}],
                          writtenQuestions: [{id, text}]}, ... ],
          "self": {"employeeId": str, "name": str, "submitted": bool,
                    "submittedAt": iso-str|None,
                    "scores": {questionId: 1-5}, "answers": {questionId: str},
                    "comments": {sectionId: str}},
          "leads": [ <same shape as self, one per project lead> ],
          "hr": <same shape as self, employeeId always None>
        }
    """
    __tablename__ = 'perf_review'

    review_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    cycle_id = db.Column(db.Integer, db.ForeignKey('perf_review_cycle.cycle_id'), nullable=False, index=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, index=True)
    review = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    modified_at = db.Column(db.DateTime, onupdate=db.func.now())

    __table_args__ = (
        db.UniqueConstraint('cycle_id', 'employee_id', name='uq_perf_review_cycle_employee'),
    )


class PerfReviewConfigActivity(db.Model):
    __tablename__ = 'perf_review_config_activity'

    activity_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    actor_employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    action = db.Column(db.String(20), nullable=False)  # added | updated | removed
    ref = db.Column(db.String(50))
    summary = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
