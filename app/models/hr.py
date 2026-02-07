from .. import db
from datetime import datetime
from .base import BaseModel


class Employee(BaseModel):
    __tablename__ = 'employee'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(50), nullable=False)
    middle_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50), nullable=False)
    date_of_birth = db.Column(db.Date)
    contact_number = db.Column(db.String(15))
    emergency_contact_number = db.Column(db.String(15))
    emergency_contact_person = db.Column(db.String(50))
    emergency_contact_relation = db.Column(db.String(50))
    email = db.Column(db.String(100))
    personal_email = db.Column(db.String(100))
    gender = db.Column(db.String(1))
    blood_group = db.Column(db.String(10))
    date_of_joining = db.Column(db.Date)
    ctc = db.Column(db.Numeric(18, 2))
    team_lead_id = db.Column(db.String(20))
    highest_qualification = db.Column(db.String(100))
    employment_status = db.Column(db.String(50))
    sub_role = db.Column(db.Integer, db.ForeignKey('master_sub_role.sub_role_id'))
    lob_lead = db.Column(db.String(50), db.ForeignKey('lob.lob_lead'))
    is_lead = db.Column(db.Boolean, default=False)
    qualification_year_month = db.Column(db.String(10))
    full_stack_ready = db.Column(db.Boolean, default=False)
    date_of_resignation = db.Column(db.Date)
    lwd = db.Column(db.Date)
    lwp = db.Column(db.Integer)
    internship_end_date = db.Column(db.Date)
    probation_end_date = db.Column(db.Date)
    privilege_leaves = db.Column(db.Integer)
    sick_leaves = db.Column(db.Integer)
    remaining_leaves = db.Column(db.Integer)
    profile_image = db.Column(db.LargeBinary)
    profile_image_type = db.Column(db.String(20))


class EmployeeHistory(db.Model):
    """Audit table to track all changes to Employee records"""
    __tablename__ = 'employee_history'
    
    # History metadata
    history_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    operation_type = db.Column(db.String(10), nullable=False)  # INSERT, UPDATE, DELETE
    operation_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    changed_by = db.Column(db.String(20))  # Employee ID who made the change
    
    # Mirror all Employee table columns
    id = db.Column(db.Integer)
    employee_id = db.Column(db.String(20))
    first_name = db.Column(db.String(50))
    middle_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    date_of_birth = db.Column(db.Date)
    contact_number = db.Column(db.String(15))
    emergency_contact_number = db.Column(db.String(15))
    emergency_contact_person = db.Column(db.String(50))
    emergency_contact_relation = db.Column(db.String(50))
    email = db.Column(db.String(100))
    personal_email = db.Column(db.String(100))
    gender = db.Column(db.String(1))
    blood_group = db.Column(db.String(10))
    date_of_joining = db.Column(db.Date)
    ctc = db.Column(db.Numeric(18, 2))
    team_lead_id = db.Column(db.String(20))
    highest_qualification = db.Column(db.String(100))
    employment_status = db.Column(db.String(50))
    sub_role = db.Column(db.Integer)
    lob_lead = db.Column(db.String(50))
    is_lead = db.Column(db.Boolean)
    qualification_year_month = db.Column(db.String(10))
    full_stack_ready = db.Column(db.Boolean)
    date_of_resignation = db.Column(db.Date)
    lwd = db.Column(db.Date)
    lwp = db.Column(db.Integer)
    internship_end_date = db.Column(db.Date)
    probation_end_date = db.Column(db.Date)
    privilege_leaves = db.Column(db.Integer)
    sick_leaves = db.Column(db.Integer)
    remaining_leaves = db.Column(db.Integer)
    profile_image_type = db.Column(db.String(20))


# SQLAlchemy event listeners for automatic audit logging
from sqlalchemy import event

# Guard flag to prevent duplicate listener registration
_listeners_registered = False

def register_employee_history_listeners():
    """Register event listeners for Employee history tracking (only once)"""
    global _listeners_registered
    if _listeners_registered:
        return
    _listeners_registered = True
    
    @event.listens_for(Employee, 'after_insert')
    def log_employee_insert(mapper, connection, target):
        """Log INSERT operations on Employee table"""
        from sqlalchemy import text
        connection.execute(
            text("""
                INSERT INTO employee_history (
                    operation_type, operation_timestamp, changed_by, id, employee_id, first_name, 
                    middle_name, last_name, date_of_birth, contact_number, emergency_contact_number,
                    emergency_contact_person, emergency_contact_relation, email, personal_email,
                    gender, blood_group, date_of_joining, ctc, team_lead_id, highest_qualification,
                    employment_status, sub_role, lob_lead, is_lead, qualification_year_month,
                    full_stack_ready, date_of_resignation, lwd, lwp, internship_end_date,
                    probation_end_date, privilege_leaves, sick_leaves, remaining_leaves, profile_image_type
                ) VALUES (
                    :op_type, :op_time, :changed_by, :id, :employee_id, :first_name,
                    :middle_name, :last_name, :date_of_birth, :contact_number, :emergency_contact_number,
                    :emergency_contact_person, :emergency_contact_relation, :email, :personal_email,
                    :gender, :blood_group, :date_of_joining, :ctc, :team_lead_id, :highest_qualification,
                    :employment_status, :sub_role, :lob_lead, :is_lead, :qualification_year_month,
                    :full_stack_ready, :date_of_resignation, :lwd, :lwp, :internship_end_date,
                    :probation_end_date, :privilege_leaves, :sick_leaves, :remaining_leaves, :profile_image_type
                )
            """),
            {
                'op_type': 'INSERT', 'op_time': datetime.utcnow(), 'changed_by': None,
                'id': target.id, 'employee_id': target.employee_id, 'first_name': target.first_name,
                'middle_name': target.middle_name, 'last_name': target.last_name,
                'date_of_birth': target.date_of_birth, 'contact_number': target.contact_number,
                'emergency_contact_number': target.emergency_contact_number,
                'emergency_contact_person': target.emergency_contact_person,
                'emergency_contact_relation': target.emergency_contact_relation,
                'email': target.email, 'personal_email': target.personal_email,
                'gender': target.gender, 'blood_group': target.blood_group,
                'date_of_joining': target.date_of_joining, 'ctc': target.ctc,
                'team_lead_id': target.team_lead_id, 'highest_qualification': target.highest_qualification,
                'employment_status': target.employment_status, 'sub_role': target.sub_role,
                'lob_lead': target.lob_lead, 'is_lead': target.is_lead,
                'qualification_year_month': target.qualification_year_month,
                'full_stack_ready': target.full_stack_ready, 'date_of_resignation': target.date_of_resignation,
                'lwd': target.lwd, 'lwp': target.lwp, 'internship_end_date': target.internship_end_date,
                'probation_end_date': target.probation_end_date, 'privilege_leaves': target.privilege_leaves,
                'sick_leaves': target.sick_leaves, 'remaining_leaves': target.remaining_leaves,
                'profile_image_type': target.profile_image_type
            }
        )

    @event.listens_for(Employee, 'after_update')
    def log_employee_update(mapper, connection, target):
        """Log UPDATE operations on Employee table"""
        from sqlalchemy import text
        connection.execute(
            text("""
                INSERT INTO employee_history (
                    operation_type, operation_timestamp, changed_by, id, employee_id, first_name, 
                    middle_name, last_name, date_of_birth, contact_number, emergency_contact_number,
                    emergency_contact_person, emergency_contact_relation, email, personal_email,
                    gender, blood_group, date_of_joining, ctc, team_lead_id, highest_qualification,
                    employment_status, sub_role, lob_lead, is_lead, qualification_year_month,
                    full_stack_ready, date_of_resignation, lwd, lwp, internship_end_date,
                    probation_end_date, privilege_leaves, sick_leaves, remaining_leaves, profile_image_type
                ) VALUES (
                    :op_type, :op_time, :changed_by, :id, :employee_id, :first_name,
                    :middle_name, :last_name, :date_of_birth, :contact_number, :emergency_contact_number,
                    :emergency_contact_person, :emergency_contact_relation, :email, :personal_email,
                    :gender, :blood_group, :date_of_joining, :ctc, :team_lead_id, :highest_qualification,
                    :employment_status, :sub_role, :lob_lead, :is_lead, :qualification_year_month,
                    :full_stack_ready, :date_of_resignation, :lwd, :lwp, :internship_end_date,
                    :probation_end_date, :privilege_leaves, :sick_leaves, :remaining_leaves, :profile_image_type
                )
            """),
            {
                'op_type': 'UPDATE', 'op_time': datetime.utcnow(), 'changed_by': None,
                'id': target.id, 'employee_id': target.employee_id, 'first_name': target.first_name,
                'middle_name': target.middle_name, 'last_name': target.last_name,
                'date_of_birth': target.date_of_birth, 'contact_number': target.contact_number,
                'emergency_contact_number': target.emergency_contact_number,
                'emergency_contact_person': target.emergency_contact_person,
                'emergency_contact_relation': target.emergency_contact_relation,
                'email': target.email, 'personal_email': target.personal_email,
                'gender': target.gender, 'blood_group': target.blood_group,
                'date_of_joining': target.date_of_joining, 'ctc': target.ctc,
                'team_lead_id': target.team_lead_id, 'highest_qualification': target.highest_qualification,
                'employment_status': target.employment_status, 'sub_role': target.sub_role,
                'lob_lead': target.lob_lead, 'is_lead': target.is_lead,
                'qualification_year_month': target.qualification_year_month,
                'full_stack_ready': target.full_stack_ready, 'date_of_resignation': target.date_of_resignation,
                'lwd': target.lwd, 'lwp': target.lwp, 'internship_end_date': target.internship_end_date,
                'probation_end_date': target.probation_end_date, 'privilege_leaves': target.privilege_leaves,
                'sick_leaves': target.sick_leaves, 'remaining_leaves': target.remaining_leaves,
                'profile_image_type': target.profile_image_type
            }
        )

    @event.listens_for(Employee, 'after_delete')
    def log_employee_delete(mapper, connection, target):
        """Log DELETE operations on Employee table"""
        from sqlalchemy import text
        connection.execute(
            text("""
                INSERT INTO employee_history (
                    operation_type, operation_timestamp, changed_by, id, employee_id, first_name, 
                    middle_name, last_name, date_of_birth, contact_number, emergency_contact_number,
                    emergency_contact_person, emergency_contact_relation, email, personal_email,
                    gender, blood_group, date_of_joining, ctc, team_lead_id, highest_qualification,
                    employment_status, sub_role, lob_lead, is_lead, qualification_year_month,
                    full_stack_ready, date_of_resignation, lwd, lwp, internship_end_date,
                    probation_end_date, privilege_leaves, sick_leaves, remaining_leaves, profile_image_type
                ) VALUES (
                    :op_type, :op_time, :changed_by, :id, :employee_id, :first_name,
                    :middle_name, :last_name, :date_of_birth, :contact_number, :emergency_contact_number,
                    :emergency_contact_person, :emergency_contact_relation, :email, :personal_email,
                    :gender, :blood_group, :date_of_joining, :ctc, :team_lead_id, :highest_qualification,
                    :employment_status, :sub_role, :lob_lead, :is_lead, :qualification_year_month,
                    :full_stack_ready, :date_of_resignation, :lwd, :lwp, :internship_end_date,
                    :probation_end_date, :privilege_leaves, :sick_leaves, :remaining_leaves, :profile_image_type
                )
            """),
            {
                'op_type': 'DELETE', 'op_time': datetime.utcnow(), 'changed_by': None,
                'id': target.id, 'employee_id': target.employee_id, 'first_name': target.first_name,
                'middle_name': target.middle_name, 'last_name': target.last_name,
                'date_of_birth': target.date_of_birth, 'contact_number': target.contact_number,
                'emergency_contact_number': target.emergency_contact_number,
                'emergency_contact_person': target.emergency_contact_person,
                'emergency_contact_relation': target.emergency_contact_relation,
                'email': target.email, 'personal_email': target.personal_email,
                'gender': target.gender, 'blood_group': target.blood_group,
                'date_of_joining': target.date_of_joining, 'ctc': target.ctc,
                'team_lead_id': target.team_lead_id, 'highest_qualification': target.highest_qualification,
                'employment_status': target.employment_status, 'sub_role': target.sub_role,
                'lob_lead': target.lob_lead, 'is_lead': target.is_lead,
                'qualification_year_month': target.qualification_year_month,
                'full_stack_ready': target.full_stack_ready, 'date_of_resignation': target.date_of_resignation,
                'lwd': target.lwd, 'lwp': target.lwp, 'internship_end_date': target.internship_end_date,
                'probation_end_date': target.probation_end_date, 'privilege_leaves': target.privilege_leaves,
                'sick_leaves': target.sick_leaves, 'remaining_leaves': target.remaining_leaves,
                'profile_image_type': target.profile_image_type
            }
        )

# Register listeners on module load
register_employee_history_listeners()


class EmployeeAddress(BaseModel):
    __tablename__ = 'employee_address'
    employee_id = db.Column(db.String(20), primary_key=True)
    address_type = db.Column(db.String(50), primary_key=True)
    state = db.Column(db.String(50))
    city = db.Column(db.String(50))
    address1 = db.Column(db.String(255))
    address2 = db.Column(db.String(255))
    is_same_permanant = db.Column(db.Boolean)
    zip_code = db.Column(db.String(6))
    counter = db.Column(db.Integer, default=0)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        {}
    )


class MasterSkill(BaseModel):
    __tablename__ = 'master_skills'
    skill_id = db.Column(db.Integer, primary_key=True)
    skill_name = db.Column(db.String(100), nullable=False)
    skill_type = db.Column(db.String(50), nullable=False, default='Technical')
    skill_category = db.Column(db.String(255))
    is_master_skill = db.Column(db.Boolean)

    __table_args__ = (
        db.UniqueConstraint('skill_name', name='uq_skill_name'),
        {}
    )


class EmployeeSkill(BaseModel):
    __tablename__ = 'employee_skill'
    employee_skill_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), nullable=False)
    skill_id = db.Column(db.Integer, nullable=False)
    skill_level = db.Column(db.String(50))
    skill_category = db.Column(db.String(50))
    is_ready = db.Column(db.Boolean, nullable=False, default=False)
    is_ready_date = db.Column(db.DateTime)
    self_evaluation = db.Column(db.Numeric(5, 2))
    score_by_lead = db.Column(db.Numeric(5, 2))
    full_stack_ready = db.Column(db.Boolean, default=False)
    
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'skill_id', name='uq_employee_skill'),
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['skill_id'], ['master_skills.skill_id']),
        {}
    )


class Project(BaseModel):
    __tablename__ = 'projects'
    project_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    client = db.Column(db.String(50))
    lead_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date) # Optional
    project_status = db.Column(db.String(50), nullable=False, default='Active')

class ProjectHistory(BaseModel):
    __tablename__ = 'project_history'
    history_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_id = db.Column(db.Integer)
    project_name = db.Column(db.String(100))
    description = db.Column(db.Text)
    client = db.Column(db.String(50))
    lead_by = db.Column(db.String(20))
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    project_status = db.Column(db.String(50))
    action = db.Column(db.String(10), nullable=False)  # INSERT, UPDATE, DELETE
    modified_by = db.Column(db.String(50))  # User ID or 'System'
    modified_on = db.Column(db.DateTime, server_default=db.func.now())

def register_project_history_listeners():
     if not _listeners_registered:
        from sqlalchemy import inspect
        
        def log_project_change(mapper, connection, target, action):
             # Basic implementation that logs changes. 
             # In a real app with Flask-Login, we'd get current_user here.
             # For now, we'll try to get it if available, else system.
             user_id = 'System'
             # Note: Accessing flask global 'g' might fail if outside context
             
             history = ProjectHistory(
                 project_id=target.project_id,
                 project_name=target.project_name,
                 description=target.description,
                 client=target.client,
                 lead_by=target.lead_by,
                 start_date=target.start_date,
                 end_date=target.end_date,
                 project_status=target.project_status,
                 action=action,
                 modified_by=user_id
             )
             connection.execute(
                 ProjectHistory.__table__.insert(),
                 {
                     'project_id': history.project_id,
                     'project_name': history.project_name,
                     'description': history.description,
                     'client': history.client,
                     'lead_by': history.lead_by,
                     'start_date': history.start_date,
                     'end_date': history.end_date,
                     'project_status': history.project_status,
                     'action': history.action,
                     'modified_by': history.modified_by
                 }
             )

        event.listen(Project, 'after_insert', lambda m, c, t: log_project_change(m, c, t, 'INSERT'))
        event.listen(Project, 'after_update', lambda m, c, t: log_project_change(m, c, t, 'UPDATE'))
        event.listen(Project, 'after_delete', lambda m, c, t: log_project_change(m, c, t, 'DELETE'))

# Register immediately
register_project_history_listeners()


class ProjectList(BaseModel):
    __tablename__ = 'project_list'
    project_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_name = db.Column(db.String(255), nullable=False)
    required = db.Column(db.Boolean, nullable=False, default=False)
    end_date = db.Column(db.Date, nullable=False)


class MasterSubRole(BaseModel):
    __tablename__ = 'master_sub_role'
    sub_role_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sub_role_name = db.Column(db.String(100))


class EmployeeRelievingLetters(BaseModel):
    __tablename__ = 'employee_relieving_letters'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    emp_id = db.Column(db.String(50), nullable=False)
    employee_name = db.Column(db.String(100), nullable=False)
    designation = db.Column(db.String(100), nullable=False)
    letter_type = db.Column(db.String(50), nullable=False)
    creation_date = db.Column(db.Date, nullable=False)
    last_working_date = db.Column(db.Date, nullable=False)
    relieving_date = db.Column(db.Date, nullable=False)
    resignation_date = db.Column(db.Date, nullable=False)
    ctc_salary = db.Column(db.Numeric(15, 2), nullable=False)
    bonus = db.Column(db.Numeric(15, 2), nullable=False)
    variables = db.Column(db.Numeric(15, 2), nullable=False)
    pdf_path = db.Column(db.String(255), nullable=False)
    employee_email = db.Column(db.String(100), nullable=False)


class Client(BaseModel):
    __tablename__ = 'client'
    client_id = db.Column(db.Integer, primary_key=True)
    clientname = db.Column(db.String(50))


class MasterDesignation(BaseModel):
    __tablename__ = 'master_designation'
    designation_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    designation_name = db.Column(db.String(255), nullable=False)


class EmployeeScoreCard(BaseModel):
    __tablename__ = 'employee_score_card'
    employee_id = db.Column(db.String(10), primary_key=True)
    score_card_link = db.Column(db.Text)


class EmployeeShiftDetails(BaseModel):
    __tablename__ = 'employee_shift_details'
    id = db.Column(db.String(50), primary_key=True)
    from_date = db.Column(db.Date)
    to_date = db.Column(db.Date)
    emp_id = db.Column(db.String(10))
    emp_name = db.Column(db.String(100))
    shift_start_from_time = db.Column(db.Time)


class Lob(BaseModel):
    __tablename__ = 'lob'
    lob_lead = db.Column(db.String(50), primary_key=True)
    lob = db.Column(db.String(55), nullable=False)


class MasterRole(BaseModel):
    __tablename__ = 'master_role'
    role_id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(100), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('role_name', name='uq_role_name'),
        {}
    )


class WorkCategories(BaseModel):
    __tablename__ = 'work_categories'
    category_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    category_name = db.Column(db.String(50), nullable=False, unique=True)


class EmployeeAllocations(BaseModel):
    __tablename__ = 'employee_allocations'
    allocation_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project_list.project_id'))
    work_category_id = db.Column(db.Integer, db.ForeignKey('work_categories.category_id'))
    allocation = db.Column(db.Numeric(3, 1))


class EmployeeCredentials(BaseModel):
    __tablename__ = 'employee_credentials'
    employee_id = db.Column(db.String(20), primary_key=True)
    password_hash = db.Column(db.String(256), nullable=False)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        {}
    )


class EmployeeDesignation(BaseModel):
    __tablename__ = 'employee_designation'
    employee_id = db.Column(db.String(20), primary_key=True)
    designation_id = db.Column(db.Integer, primary_key=True)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['designation_id'], ['master_designation.designation_id']),
        {}
    )

class EmployeeEvaluators(BaseModel):
    __tablename__ = 'employee_evaluators'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    emp_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    evaluator_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    assigned_on = db.Column(db.DateTime, server_default=db.func.now())


class EmployeeGoal(BaseModel):
    __tablename__ = 'employee_goal'
    goal_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('master_skills.skill_id'), nullable=False)
    target_date = db.Column(db.DateTime, nullable=False)
    set_by_employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    created_on = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    modified_on = db.Column(db.DateTime)


class EmployeePolicyAcknowledgementStatus(BaseModel):
    __tablename__ = 'employee_policy_acknowledgement_status'
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), primary_key=True)
    leave_policy_acknowledged = db.Column(db.Boolean, default=False)
    work_from_home_policy_acknowledged = db.Column(db.Boolean, default=False)
    exit_policy_and_process_acknowledged = db.Column(db.Boolean, default=False)
    salary_advance_recovery_policy_acknowledged = db.Column(db.Boolean, default=False)
    probation_to_confirmation_policy_acknowledged = db.Column(db.Boolean, default=False)
    salary_and_appraisal_policy_acknowledged = db.Column(db.Boolean, default=False)
    warning_count = db.Column(db.Integer, default=0)


class EmployeePreviousExperience(BaseModel):
    __tablename__ = 'employee_previous_experience'
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), primary_key=True)
    company_name = db.Column(db.String(100), primary_key=True, nullable=False)
    company_address = db.Column(db.String(255))
    previous_designation = db.Column(db.String(100))
    from_date = db.Column(db.Date, nullable=False)
    to_date = db.Column(db.Date)
    comments = db.Column(db.String(255))


class WFHCheckList(BaseModel):
    __tablename__ = 'wfh_check_list'
    employee_id = db.Column(db.String(20), primary_key=True)
    from_date = db.Column(db.DateTime)


class EmployeeProject(BaseModel):
    __tablename__ = 'employee_project'
    employee_id = db.Column(db.String(20), primary_key=True)
    project_id = db.Column(db.Integer, primary_key=True)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        {}
    )


class EmployeeRole(BaseModel):
    __tablename__ = 'employee_role'
    employee_id = db.Column(db.String(20), primary_key=True)
    role_id = db.Column(db.Integer, primary_key=True)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['role_id'], ['master_role.role_id']),
        {}
    )


class EmployeeSkillReview(BaseModel):
    __tablename__ = 'employee_skill_review'
    review_id = db.Column(db.String(36), primary_key=True)
    employee_id = db.Column(db.String(20), nullable=False)
    skill_id = db.Column(db.Integer, nullable=False)
    evaluator_id = db.Column(db.String(20), nullable=False)
    evaluator_score = db.Column(db.Numeric(5, 2))
    comments = db.Column(db.String(500))
    is_ready = db.Column(db.Boolean, nullable=False, default=False)
    status = db.Column(db.String(50), nullable=False, default='Not Reviewed')
    review_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    is_new = db.Column(db.Boolean, nullable=False, default=False)
    
    __table_args__ = (
        db.UniqueConstraint('employee_id', 'skill_id', name='uq_employee_skill_evaluator'),
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['evaluator_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['skill_id', 'employee_id'], ['employee_skill.skill_id', 'employee_skill.employee_id']),
        db.Index('ix_employee_skill_review_employee_skill', 'employee_id', 'skill_id'),
        db.Index('ix_employee_skill_review_evaluator', 'evaluator_id'),
        {}
    )


class LateralAndExempt(BaseModel):
    __tablename__ = 'lateral_and_exempt'
    employee_id = db.Column(db.String(20), primary_key=True)
    from_date = db.Column(db.Date)
    to_date = db.Column(db.Date)
    shift_start_from_time = db.Column(db.String(20))
    lateral_hire = db.Column(db.Boolean, default=False)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        {}
    )


class LeadAssignedByHR(BaseModel):
    __tablename__ = 'lead_assigned_by_hr'
    emp_id = db.Column(db.String(20), primary_key=True)
    lead_id = db.Column(db.String(20), primary_key=True, nullable=False)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['emp_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['lead_id'], ['employee.employee_id']),
        {}
    )


class ProjectAllocation(BaseModel):
    __tablename__ = 'project_allocation'
    employee_id = db.Column(db.String(20), primary_key=True)
    project_id = db.Column(db.Integer, primary_key=True)
    project_allocation = db.Column(db.Numeric(10, 2), nullable=False)
    project_billing = db.Column(db.Numeric(10, 2), nullable=False)
    is_billing = db.Column(db.Boolean, default=False)
    employee_role = db.Column(db.String(50))
    is_trainee = db.Column(db.Boolean, default=False)
    comments = db.Column(db.Text)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    relevant_skills = db.Column(db.Text)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['project_id'], ['projects.project_id']),
        {}
    )

class ProjectAllocationHistory(BaseModel):
    __tablename__ = 'project_allocation_history'
    history_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20))
    project_id = db.Column(db.Integer)
    project_allocation = db.Column(db.Numeric(10, 2))
    project_billing = db.Column(db.Numeric(10, 2))
    is_billing = db.Column(db.Boolean)
    employee_role = db.Column(db.String(50))
    is_trainee = db.Column(db.Boolean)
    comments = db.Column(db.Text)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    relevant_skills = db.Column(db.Text)
    action = db.Column(db.String(10), nullable=False)
    modified_by = db.Column(db.String(50))
    modified_on = db.Column(db.DateTime, server_default=db.func.now())

def register_allocation_history_listeners():
     if not _listeners_registered:

        def log_allocation_change(mapper, connection, target, action):
             user_id = 'System'
             
             connection.execute(
                 ProjectAllocationHistory.__table__.insert(),
                 {
                     'employee_id': target.employee_id,
                     'project_id': target.project_id,
                     'project_allocation': target.project_allocation,
                     'project_billing': target.project_billing,
                     'is_billing': target.is_billing,
                     'employee_role': target.employee_role,
                     'is_trainee': target.is_trainee,
                     'comments': target.comments,
                     'start_date': target.start_date,
                     'end_date': target.end_date,
                     'relevant_skills': target.relevant_skills,
                     'action': action,
                     'modified_by': user_id
                 }
             )

        event.listen(ProjectAllocation, 'after_insert', lambda m, c, t: log_allocation_change(m, c, t, 'INSERT'))
        event.listen(ProjectAllocation, 'after_update', lambda m, c, t: log_allocation_change(m, c, t, 'UPDATE'))
        event.listen(ProjectAllocation, 'after_delete', lambda m, c, t: log_allocation_change(m, c, t, 'DELETE'))

# Register immediately
register_allocation_history_listeners()


class CapabilityDevelopmentLead(BaseModel):
    __tablename__ = 'capability_development_lead'
    capability_development_lead_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, unique=True)
    created_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_date = db.Column(db.DateTime)


class CapabilityDevelopmentLeadAssignment(BaseModel):
    __tablename__ = 'capability_development_lead_assignment'
    capability_development_lead_assignment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    assigned_employee_id = db.Column(db.String(20), nullable=False)
    capability_development_lead_id = db.Column(db.Integer, db.ForeignKey('capability_development_lead.capability_development_lead_id', ondelete='CASCADE'), nullable=False)
    created_date = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_date = db.Column(db.DateTime)
    
    __table_args__ = (
        db.UniqueConstraint('assigned_employee_id', 'capability_development_lead_id', name='uq_capability_development_lead_assignment_employee_lead'),
        db.ForeignKeyConstraint(['assigned_employee_id'], ['employee.employee_id'], onupdate='CASCADE'),
        {}
    )


class Reports(BaseModel):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_type = db.Column(db.String(100), nullable=False, default='Monthly Leave Report')
    generated_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    generated_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    data = db.Column(db.JSON)
    blob_link = db.Column(db.String(500)) # Stores Azure Blob URL
    reference_reports = db.Column(db.JSON) # List of {id, name}
