from .. import db
from datetime import datetime
from .base import BaseModel


class EmployeeGoal(BaseModel):
    """Enhanced employee goal model supporting skill and custom goals"""
    __tablename__ = 'employee_goal'
    
    goal_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    for_employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, index=True)
    set_by_employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    
    # Goal type and details
    goal_type = db.Column(db.String(20), nullable=False)  # 'skill' or 'other'
    skill_id = db.Column(db.Integer, db.ForeignKey('master_skills.skill_id'), nullable=True)  # Only for skill type
    goal_title = db.Column(db.String(255), nullable=True)  # Required for 'other' type
    goal_description = db.Column(db.Text)
    goal_category = db.Column(db.String(100))  # e.g., 'certification', 'soft_skill', 'career_development'
    
    # Progress tracking
    status = db.Column(db.String(20), nullable=False, default='pending')  # pending, in_progress, completed, cancelled
    progress_percentage = db.Column(db.Numeric(5, 2), default=0)  # 0-100
    deadline = db.Column(db.Date, nullable=False, index=True)
    completion_date = db.Column(db.DateTime)
    
    # Metadata
    notes = db.Column(db.Text)
    created_on = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    modified_on = db.Column(db.DateTime, onupdate=db.func.now())
    
    __table_args__ = (
        db.Index('ix_employee_goal_status_deadline', 'for_employee_id', 'status', 'deadline'),
        {}
    )


class EmployeeGoalComment(BaseModel):
    """Comments on employee goals"""
    __tablename__ = 'employee_goal_comment'
    
    comment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('employee_goal.goal_id', ondelete='CASCADE'), nullable=False, index=True)
    commented_by_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    comment_text = db.Column(db.Text, nullable=False)
    comment_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    
    __table_args__ = (
        db.Index('ix_employee_goal_comment_goal_date', 'goal_id', 'comment_date'),
        {}
    )


class EmployeeGoalReview(BaseModel):
    """Reviews/ratings for completed goals"""
    __tablename__ = 'employee_goal_review'
    
    review_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('employee_goal.goal_id', ondelete='CASCADE'), nullable=False, index=True)
    reviewed_by_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    rating = db.Column(db.Numeric(3, 2))  # 1-5 scale
    review_text = db.Column(db.Text)
    review_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now())


class EmployeeFeedback(BaseModel):
    """Peer-to-peer feedback system"""
    __tablename__ = 'employee_feedback'
    
    feedback_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    for_employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, index=True)
    feedback_by_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    
    # Categorization
    feedback_category = db.Column(db.String(50), nullable=False)  # skill, performance, behavior, goal, general
    related_skill_id = db.Column(db.Integer, db.ForeignKey('master_skills.skill_id'), nullable=True)
    related_goal_id = db.Column(db.Integer, db.ForeignKey('employee_goal.goal_id', ondelete='CASCADE'), nullable=True)
    
    # Content
    rating = db.Column(db.Numeric(3, 2))  # 1-5 scale, nullable
    feedback_text = db.Column(db.Text, nullable=False)
    is_visible_to_employee = db.Column(db.Boolean, default=True, nullable=False)
    
    # Metadata
    feedback_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), index=True)
    modified_date = db.Column(db.DateTime, onupdate=db.func.now())
    
    __table_args__ = (
        db.Index('ix_employee_feedback_for_date', 'for_employee_id', 'feedback_date'),
        {}
    )


class EmployeePerformanceMetrics(BaseModel):
    """Performance scorecard metrics over time"""
    __tablename__ = 'employee_performance_metrics'
    
    metric_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, index=True)
    
    # Period definition
    period_type = db.Column(db.String(20), nullable=False)  # monthly, quarterly, yearly
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    
    # Calculated metrics
    skill_proficiency_score = db.Column(db.Numeric(5, 2))  # Average skill scores
    goal_completion_rate = db.Column(db.Numeric(5, 2))  # % of goals completed on time
    peer_feedback_score = db.Column(db.Numeric(5, 2))  # Average peer feedback rating
    overall_performance_score = db.Column(db.Numeric(5, 2))  # Weighted combination
    
    # Supporting counts
    goals_set_count = db.Column(db.Integer, default=0)
    goals_completed_count = db.Column(db.Integer, default=0)
    skills_evaluated_count = db.Column(db.Integer, default=0)
    feedback_received_count = db.Column(db.Integer, default=0)
    
    # Metadata
    calculated_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'period_type', 'period_start', 'period_end', 
                          name='uq_employee_performance_metrics_period'),
        db.Index('ix_employee_performance_metrics_period', 'employee_id', 'period_type', 'period_start'),
        {}
    )


class SkillProgressLog(BaseModel):
    """Audit log for skill evaluation changes"""
    __tablename__ = 'skill_progress_log'
    
    log_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_skill_id = db.Column(db.Integer, db.ForeignKey('employee_skill.employee_skill_id'), nullable=False, index=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('master_skills.skill_id'), nullable=False)
    
    # Change tracking
    previous_level = db.Column(db.String(50))
    new_level = db.Column(db.String(50))
    previous_score = db.Column(db.Numeric(5, 2))
    new_score = db.Column(db.Numeric(5, 2))
    
    # Who made the change
    updated_by_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    update_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), index=True)
    notes = db.Column(db.Text)
    
    __table_args__ = (
        db.Index('ix_skill_progress_log_skill_date', 'employee_skill_id', 'update_date'),
        {}
    )


class EmployeeReview(BaseModel):
    """Employee review records for HR/Admin"""
    __tablename__ = 'employee_review'
    
    review_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, index=True)
    
    # Review Schedule
    review_date = db.Column(db.Date, nullable=False) # Scheduled date
    reviewed_date = db.Column(db.Date) # Actual reviewed date
    
    # Content
    review_comment = db.Column(db.Text)
    other_comments = db.Column(db.Text)
    file_link = db.Column(db.Text) # External link for review documents
    
    # Status
    status = db.Column(db.String(50), default='Pending', nullable=False)
    
    # Metadata
    created_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, onupdate=db.func.now())
    
    __table_args__ = (
        db.Index('ix_employee_review_date', 'employee_id', 'review_date'),
        {}
    )


class MasterCapabilityGroup(BaseModel):
    """Master list of capability groups (e.g. Frontend Engineer, AI/ML Specialist)"""
    __tablename__ = 'master_capability_group'

    group_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_name = db.Column(db.String(150), nullable=False, unique=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, nullable=False, default=True)


class EmployeeCapabilityGroup(BaseModel):
    """Current capability group assignment for each employee (one active row per employee)"""
    __tablename__ = 'employee_capability_group'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, unique=True, index=True)
    group_id = db.Column(db.Integer, db.ForeignKey('master_capability_group.group_id'), nullable=False)
    assigned_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    assigned_on = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    notes = db.Column(db.Text)


class EmployeeCapabilityGroupHistory(BaseModel):
    """History of all capability group assignments per employee"""
    __tablename__ = 'employee_capability_group_history'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, index=True)
    group_id = db.Column(db.Integer, db.ForeignKey('master_capability_group.group_id'), nullable=False)
    assigned_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    assigned_on = db.Column(db.DateTime, nullable=False)
    removed_on = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    notes = db.Column(db.Text)

    __table_args__ = (
        db.Index('ix_emp_cap_group_history_emp_date', 'employee_id', 'removed_on'),
        {}
    )
