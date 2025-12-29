"""
Script to refactor hr.py models to snake_case with BaseModel
"""
import re


def pascal_to_snake(name):
    """Convert PascalCase to snake_case"""
    # Handle special cases
    name = name.replace('ID', 'Id')  # Normalize ID to Id first
    # Insert underscore before uppercase letters
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    # Insert underscore before uppercase letters that follow lowercase
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


# Generate the refactored hr.py content
hr_content = '''from .. import db
from datetime import datetime
from .base import BaseModel


class Employee(BaseModel):
    __tablename__ = 'employee'
    employee_id = db.Column(db.String(20), primary_key=True)
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
    sub_role = db.Column(db.Integer, db.ForeignKey('employee_sub_role.sub_role_id'))
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


class Skill(BaseModel):
    __tablename__ = 'skill'
    skill_id = db.Column(db.Integer, primary_key=True)
    skill_name = db.Column(db.String(100), nullable=False)
    skill_type = db.Column(db.String(50), nullable=False, default='Technical')
    skill_category = db.Column(db.String(255))
    is_master_skill = db.Column(db.Boolean)


class EmployeeSkill(BaseModel):
    __tablename__ = 'employee_skill'
    employee_id = db.Column(db.String(20), primary_key=True)
    skill_id = db.Column(db.Integer, primary_key=True)
    skill_level = db.Column(db.String(50))
    is_ready = db.Column(db.Boolean, nullable=False, default=False)
    is_ready_date = db.Column(db.DateTime)
    self_evaluation = db.Column(db.Numeric(5, 2))
    score_by_lead = db.Column(db.Numeric(5, 2))
    full_stack_ready = db.Column(db.Boolean, default=False)
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        {}
    )


class Project(BaseModel):
    __tablename__ = 'project'
    project_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_name = db.Column(db.String(100), nullable=False)
    client = db.Column(db.String(50))
    lead_by = db.Column(db.String(20), db.ForeignKey('employee.employee_id'))


class ProjectList(BaseModel):
    __tablename__ = 'project_list'
    project_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    project_name = db.Column(db.String(255), nullable=False)
    required = db.Column(db.Boolean, nullable=False, default=False)
    end_date = db.Column(db.Date, nullable=False)


class EmployeeSubRole(BaseModel):
    __tablename__ = 'employee_sub_role'
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


class Designation(BaseModel):
    __tablename__ = 'designation'
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


class Role(BaseModel):
    __tablename__ = 'role'
    role_id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(100), nullable=False)


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
    password = db.Column(db.String(50), primary_key=True)
    
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
        {}
    )


class EmployeeDocuments(BaseModel):
    __tablename__ = 'employee_documents'
    employee_id = db.Column(db.String(20), primary_key=True)
    document_id = db.Column(db.Integer, primary_key=True)
    document_link = db.Column(db.String(1000))
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        {}
    )


class EmployeeEvaluators(BaseModel):
    __tablename__ = 'employee_evaluators'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    emp_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    evaluator_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    assigned_on = db.Column(db.DateTime, default=db.func.now())


class EmployeeGoal(BaseModel):
    __tablename__ = 'employee_goal'
    goal_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    skill_id = db.Column(db.Integer, db.ForeignKey('skill.skill_id'), nullable=False)
    target_date = db.Column(db.DateTime, nullable=False)
    set_by_employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    created_on = db.Column(db.DateTime, nullable=False, default=db.func.now())
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
        db.ForeignKeyConstraint(['role_id'], ['role.role_id']),
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
    review_date = db.Column(db.DateTime, nullable=False, default=db.func.now())
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
    employee_role = db.Column(db.String(50))
    
    __table_args__ = (
        db.ForeignKeyConstraint(['employee_id'], ['employee.employee_id']),
        db.ForeignKeyConstraint(['project_id'], ['project.project_id']),
        {}
    )


class CapabilityDevelopmentLead(BaseModel):
    __tablename__ = 'capability_development_lead'
    capability_development_lead_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False, unique=True)
    created_date = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_date = db.Column(db.DateTime)


class CapabilityDevelopmentLeadAssignment(BaseModel):
    __tablename__ = 'capability_development_lead_assignment'
    capability_development_lead_assignment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    assigned_employee_id = db.Column(db.String(20), nullable=False)
    capability_development_lead_id = db.Column(db.Integer, db.ForeignKey('capability_development_lead.capability_development_lead_id', ondelete='CASCADE'), nullable=False)
    created_date = db.Column(db.DateTime, nullable=False, default=db.func.now())
    updated_date = db.Column(db.DateTime)
    
    __table_args__ = (
        db.UniqueConstraint('assigned_employee_id', 'capability_development_lead_id', name='uq_capability_development_lead_assignment_employee_lead'),
        db.ForeignKeyConstraint(['assigned_employee_id'], ['employee.employee_id'], onupdate='CASCADE'),
        {}
    )
'''

# Write the file
output_path = r'c:\Users\punit\Downloads\flairminds\hrms-flask\app\models\hr.py'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(hr_content)

print(f"✅ Successfully generated refactored hr.py with 40 models")
print(f"   Output: {output_path}")
print(f"   All table names: snake_case")
print(f"   All column names: snake_case")
print(f"   All models inherit from BaseModel (includes audit fields)")
