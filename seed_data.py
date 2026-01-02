"""
Master Data Seeding Script
Run directly from command line: python seed_data.py

This script populates master/reference tables with initial data.
"""
import sys
import os

# Add the parent directory to the path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text


def seed_master_roles():
    """Seeds master roles table."""
    print("Seeding master roles...")
    
    roles_sql = text("""
        INSERT INTO master_role(role_id, role_name)
        VALUES (1, N'Lead'), (2, N'Employee'), (3, N'HR'), (4, 'Admin')
        ON CONFLICT (role_name) DO NOTHING;
    """)
    
    db.session.execute(roles_sql)
    print("✓ Master roles seeded")

def seed_master_sub_roles():
    """Seeds master sub-roles table."""
    print("Seeding master sub-roles...")
    
    sub_roles_sql = text("""
        INSERT INTO master_sub_role (sub_role_id, sub_role_name) VALUES
        (1, N'Software Engineer'),
        (2, N'Data Scientist'),
        (3, N'Testers'),
        (4, N'DevOps Engineer'),
        (5, N'Human Resource Manager');
    """)
    
    db.session.execute(sub_roles_sql)
    print("✓ Master sub-roles seeded")

def seed_master_skills():
    """Seeds master skills table."""
    print("Seeding master skills...")
    
    skills_sql = text("""
        INSERT INTO master_skills (skill_id, skill_name, skill_type, skill_category, is_master_skill) VALUES
        (1, N'Python', N'Technical', N'Programming Languages & Frameworks', true),
        (2, N'Java', N'Technical', N'Programming Languages & Frameworks', true),
        (3, N'JavaScript', N'Technical', N'Programming Languages & Frameworks', true),
        (4, N'C#', N'Technical', N'Programming Languages & Frameworks', true),
        (5, N'C++', N'Technical', N'Programming Languages & Frameworks', true),
        (6, N'C', N'Technical', N'Programming Languages & Frameworks', true),
        (7, N'PHP', N'Technical', N'Programming Languages & Frameworks', true),
        (8, N'Go', N'Technical', N'Programming Languages & Frameworks', true),
        (9, N'Ruby', N'Technical', N'Programming Languages & Frameworks', true),
        (10, N'Swift', N'Technical', N'Programming Languages & Frameworks', true),
        (11, N'Kotlin', N'Technical', N'Programming Languages & Frameworks', true),
        (12, N'TypeScript', N'Technical', N'Programming Languages & Frameworks', true),
        (13, N'VB.NET', N'Technical', N'Programming Languages & Frameworks', true),
        (14, N'Apex', N'Technical', N'Programming Languages & Frameworks', true),
        (15, N'HTML', N'Technical', N'Web Development', true),
        (16, N'CSS', N'Technical', N'Web Development', true),
        (17, N'React', N'Technical', N'Web Development', true),
        (18, N'Angular', N'Technical', N'Web Development', true),
        (19, N'Vue.js', N'Technical', N'Web Development', true),
        (20, N'Next.js', N'Technical', N'Web Development', true),
        (21, N'Node.js', N'Technical', N'Web Development', true),
        (22, N'Express.js', N'Technical', N'Web Development', true),
        (23, N'Django', N'Technical', N'Web Development', true),
        (24, N'Flask API', N'Technical', N'Web Development', true),
        (25, N'Spring Boot', N'Technical', N'Web Development', true),
        (26, N'ASP.NET', N'Technical', N'Web Development', true),
        (27, N'.NET Framework / .NET', N'Technical', N'Web Development', true),
        (28, N'Strapi', N'Technical', N'Web Development', true),
        (29, N'AJAX', N'Technical', N'Web Development', true),
        (30, N'Web Services / RESTful APIs / GraphQL', N'Technical', N'Web Development', true),
        (31, N'MVC', N'Technical', N'Web Development', true),
        (32, N'JSP', N'Technical', N'Web Development', true),
        (33, N'Servlet', N'Technical', N'Web Development', true),
        (34, N'J2EE / JEE', N'Technical', N'Web Development', true),
        (35, N'Redux Toolkit', N'Technical', N'Web Development', true),
        (36, N'Android (JAVA)', N'Technical', N'Mobile Development', true),
        (37, N'Flutter', N'Technical', N'Mobile Development', true),
        (38, N'React Native', N'Technical', N'Mobile Development', true),
        (39, N'Swift UI / Kotlin Multiplatform', N'Technical', N'Mobile Development', true),
        (40, N'Xamarin', N'Technical', N'Mobile Development', true),
        (41, N'Mobile UI/UXánhDesign Principles', N'Technical', N'Mobile Development', true),
        (42, N'Mobile Security', N'Technical', N'Mobile Development', true),
        (43, N'SQL', N'Technical', N'Database & Data Management', true),
        (44, N'SQL Server / MSSQL', N'Technical', N'Database & Data Management', true),
        (45, N'MySQL', N'Technical', N'Database & Data Management', true),
        (46, N'PostgreSQL', N'Technical', N'Database & Data Management', true),
        (47, N'Oracle', N'Technical', N'Database & Data Management', true),
        (48, N'PL/SQL', N'Technical', N'Database & Data Management', true),
        (49, N'MongoDB / NoSQL', N'Technical', N'Database & Data Management', true),
        (50, N'Neo4j', N'Technical', N'Database & Data Management', true),
        (51, N'Elasticsearch', N'Technical', N'Database & Data Management', true),
        (52, N'Database Administration', N'Technical', N'Database & Data Management', true),
        (53, N'Data Modeling', N'Technical', N'Database & Data Management', true),
        (54, N'Data Extraction', N'Technical', N'Database & Data Management', true),
        (55, N'ETL', N'Technical', N'Database & Data Management', true),
        (56, N'Data Warehousing', N'Technical', N'Database & Data Management', true),
        (57, N'DevOps', N'Technical', N'DevOps & Cloud', true),
        (58, N'Kubernetes / K8s', N'Technical', N'DevOps & Cloud', true),
        (59, N'Docker / Containerization', N'Technical', N'DevOps & Cloud', true),
        (60, N'AWS', N'Technical', N'DevOps & Cloud', true),
        (61, N'Azure', N'Technical', N'DevOps & Cloud', true),
        (62, N'IaC (Infrastructure as Code)', N'Technical', N'DevOps & Cloud', true),
        (63, N'Terraform', N'Technical', N'DevOps & Cloud', true),
        (64, N'Ansible', N'Technical', N'DevOps & Cloud', true),
        (65, N'CI/CD', N'Technical', N'DevOps & Cloud', true),
        (66, N'Jenkins', N'Technical', N'DevOps & Cloud', true),
        (67, N'Prometheus', N'Technical', N'DevOps & Cloud', true),
        (68, N'Grafana', N'Technical', N'DevOps & Cloud', true),
        (69, N'Cloud Security', N'Technical', N'DevOps & Cloud', true),
        (70, N'System Administration (Linux / Windows)', N'Technical', N'DevOps & Cloud', true),
        (71, N'GCP', N'Technical', N'DevOps & Cloud', true),
        (72, N'Azure Function', N'Technical', N'DevOps & Cloud', true),
        (73, N'Machine Learning (ML)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (74, N'Deep Learning (DL)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (75, N'Neural Networks (Basics)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (76, N'NLP (Natural Language Processing)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (77, N'GenAI (Generative AI)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (78, N'LLM (Large Language Models)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (79, N'LLM Deployments', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (80, N'BERT', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (81, N'Scikit-learn (Sklearn)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (82, N'Pandas', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (83, N'NumPy', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (84, N'OpenCV', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (85, N'Matlab', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (86, N'Model Building (in ML)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (87, N'EDA (Exploratory Data Analysis)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (88, N'FAISS Indexing', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (89, N'GraphRAG', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (90, N'RAG (Retrieval Augmented Generation)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (91, N'Prompt Engineering', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (92, N'MLOps', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (93, N'Computer Vision', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (94, N'Reinforcement Learning', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (95, N'Google Vertex AI Workbench', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (96, N'Agentic AI', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (97, N'LangChain', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (98, N'Data Science', N'Technical', N'Data Science & Analytics', true),
        (99, N'Data Structures (DS)', N'Technical', N'Data Science & Analytics', true),
        (100, N'Visualization / Data Visualization', N'Technical', N'Data Science & Analytics', true),
        (101, N'Google Data Studio / Looker / PowerBI', N'Technical', N'Data Science & Analytics', true),
        (102, N'Google BigQuery', N'Technical', N'Data Science & Analytics', true),
        (103, N'Google Cloud Storage', N'Technical', N'Data Science & Analytics', true),
        (104, N'Snowflake', N'Technical', N'Data Science & Analytics', true),
        (105, N'PySpark', N'Technical', N'Data Science & Analytics', true),
        (106, N'Statistical Analysis', N'Technical', N'Data Science & Analytics', true),
        (107, N'A/B Testing', N'Technical', N'Data Science & Analytics', true),
        (108, N'Big Data Technologies (e.g., Hadoop, Spark)', N'Technical', N'Data Science & Analytics', true),
        (109, N'Testing', N'Technical', N'Testing & Quality Assurance', true),
        (110, N'API Testing', N'Technical', N'Testing & Quality Assurance', true),
        (111, N'Automation Testing', N'Technical', N'Testing & Quality Assurance', true),
        (112, N'Selenium', N'Technical', N'Testing & Quality Assurance', true),
        (113, N'Appium', N'Technical', N'Testing & Quality Assurance', true),
        (114, N'Apache JMeter', N'Technical', N'Testing & Quality Assurance', true),
        (115, N'Unit Testing', N'Technical', N'Testing & Quality Assurance', true),
        (116, N'Integration Testing', N'Technical', N'Testing & Quality Assurance', true),
        (117, N'End-to-end Testing', N'Technical', N'Testing & Quality Assurance', true),
        (118, N'Payment Integration', N'Technical', N'E-commerce & Payments', true),
        (119, N'Twilio', N'Technical', N'E-commerce & Payments', true),
        (120, N'Razorpay', N'Technical', N'E-commerce & Payments', true),
        (121, N'Stripe', N'Technical', N'E-commerce & Payments', true),
        (122, N'n8n', N'Technical', N'Automation & Workflow', true),
        (123, N'Software Development Life Cycle (SDLC)', N'Technical', N'Other Technical Skills', true),
        (124, N'Microservices', N'Technical', N'Other Technical Skills', true),
        (125, N'Postman', N'Technical', N'Other Technical Skills', true),
        (126, N'Git / Version Control', N'Technical', N'Other Technical Skills', true),
        (127, N'IDEs (e.g., IntelliJ, VS Code, Android Studio, Xcode)', N'Technical', N'Other Technical Skills', true),
        (128, N'JSS (JavaScript Style Sheets)', N'Technical', N'Other Technical Skills', true),
        (129, N'Game Development', N'Technical', N'Other Technical Skills', true),
        (130, N'Unity Engine', N'Technical', N'Other Technical Skills', true),
        (131, N'Electrical Engineering', N'Technical', N'Other Technical Skills', true),
        (132, N'Communication', N'Other', N'Soft Skills & Process', true),
        (133, N'Project Management', N'Other', N'Soft Skills & Process', true),
        (134, N'Agile/Scrum Methodologies', N'Other', N'Soft Skills & Process', true),
        (135, N'Problem-Solving', N'Other', N'Soft Skills & Process', true),
        (136, N'Collaboration / Teamwork', N'Other', N'Soft Skills & Process', true),
        (137, N'Time Management', N'Other', N'Soft Skills & Process', true),
        (138, N'Adaptability', N'Other', N'Soft Skills & Process', true),
        (139, N'Critical Thinking', N'Other', N'Soft Skills & Process', true),
        (140, N'Domain Knowledge / Business Acumen', N'Other', N'Soft Skills & Process', true),
        (141, N'Technical Documentation', N'Other', N'Soft Skills & Process', true),
        (142, N'Mentorship / Training', N'Other', N'Soft Skills & Process', true),
        (143, N'Recruiting / Recruitment', N'Other', N'Soft Skills & Process', true),
        (144, N'Finance', N'Other', N'Soft Skills & Process', true),
        (145, N'Digital Marketing', N'Other', N'Soft Skills & Process', true),
        (146, N'Marketing', N'Other', N'Soft Skills & Process', true),
        (147, N'Shared Services', N'Other', N'Soft Skills & Process', true),
        (148, N'Snowflake Certifications', N'Other', N'Technical', true),
        (149, N'REST API Integration', N'Other', N'Soft Skills & Process', true),
        (150, N'Message Queue Integration', N'Technical', N'Other Technical Skills', true),
        (151, N'WhatsApp Integration', N'Technical', N'Other Technical Skills', true),
        (152, N'GraphQL', N'Technical', N'Other Technical Skills', true),
        (153, N'SQL Database', N'Technical', N'Database & Data Management', true),
        (154, N'Google Sheet', N'Other', N'Soft Skills & Process', true),
        (155, N'Windows Form', N'Technical', N'Other Technical Skills', true),
        (156, N'Power BI', N'Technical', N'Data Science & Analytics', true),
        (157, N'Looker', N'Technical', N'Data Science & Analytics', true),
        (158, N'Google Data Studio', N'Technical', N'Data Science & Analytics', true),
        (159, N'Streamlit', N'Technical', N'Data Science & Analytics', true),
        (160, N'Maven', N'Technical', N'Mobile Development', true),
        (161, N'Test goal', N'Other', NULL, false),
        (162, N'Evaluation of Pooja for her confirmation', N'Other', NULL, false),
        (163, N'Confirm final approach to go with Grid layout to overcome limit rung issue', N'Other', NULL, false),
        (164, N'Advanced SQL', N'Other', NULL, false),
        (165, N'Investment Banking Concepts - Asset Classes ,Major Data Providers & Feed Types', N'Other', NULL, false),
        (166, N'IB Trade Life Cycle - Front Office,Regulatory Reporting (US,EU,MIS)', N'Other', NULL, false);
    """)
    
    db.session.execute(skills_sql)
    print("✓ Master skills seeded")

def seed_master_designation():
    """Seeds master designations"""
    print("Seeding master designations")

    designation_sql = text("""
        INSERT INTO master_designation (designation_id, designation_name) VALUES
        (1, N'Technology Lead'),
        (2, N'Sr Project / Service Manager'),
        (3, N'Sr. Project / Service Lead (SPL)'),
        (4, N'Associate Technology Architect'),
        (5, N'Project / Service Lead (PL)'),
        (6, N'Lead Coordinator'),
        (7, N'Module / Team Lead'),
        (8, N'Project / Service Manager (PM)'),
        (9, N'Intern (I)'),
        (10, N'Sr. Associate (SA)'),
        (11, N'Associate (A)'),
        (12, N'Trainee Associate (TA)'),
        (13, N'Finance');
    """)
    db.session.execute(designation_sql)
    print("✓ Master designation seeded")

def seed_holidays():
    """Seeds holidays"""
    print("Seeding holidays")
    holiday_sql = text("""
        INSERT INTO holiday (holiday_id, holiday_date, holiday_name, added_by, added_on) VALUES
        (1, '2024-05-01', N'Maharashtra Day', N'manager', '2024-10-16 07:29:02.930'),
        (2, '2024-06-17', N'Bakri Eid', N'manager', '2024-10-16 07:29:02.930'),
        (3, '2024-08-15', N'Independence Day', N'manager', '2024-10-16 07:29:02.930'),
        (4, '2024-09-17', N'Anant Chaturthi', N'manager', '2024-10-16 07:29:02.930'),
        (5, '2024-10-02', N'Gandhi Jayanti', N'manager', '2024-10-16 07:29:02.930'),
        (6, '2024-10-12', N'Dussehra', N'manager', '2024-10-16 07:29:02.930'),
        (7, '2024-10-31', N'Diwali', N'manager', '2024-10-16 07:29:02.930'),
        (8, '2024-11-01', N'Diwali', N'manager', '2024-10-16 07:29:02.930'),
        (9, '2025-01-01', N'New Year', N'manager', '2024-10-16 07:29:02.930'),
        (10, '2025-01-26', N'Republic Day', N'manager', '2024-10-16 07:29:02.930'),
        (11, '2025-05-01', N'Maharashtra Day', N'Manager', '2025-03-28 07:09:01.273'),
        (12, '2025-08-15', N'Independence Day', N'Manager', '2025-03-28 07:09:01.273'),
        (13, '2025-08-27', N'Ganesh Jayanti', N'Manager', '2025-03-28 07:09:01.273'),
        (14, '2025-10-02', N'Dussehra/ Gandhi Jayanti', N'Manager', '2025-03-28 07:09:01.273'),
        (15, '2025-10-20', N'Diwali', N'Manager', '2025-03-28 07:09:01.273'),
        (16, '2025-10-21', N'Diwali', N'Manager', '2025-03-28 07:09:01.273'),
        (17, '2025-10-22', N'Diwali', N'Manager', '2025-03-28 07:09:01.273'),
        (18, '2025-12-25', N'Christmas', N'Manager', '2025-03-28 07:09:01.273'),
        (19, '2026-01-26', N'Republic Day', N'Manager', '2025-03-28 07:09:01.273'),
        (20, '2026-03-04', N'Holi', N'Manager', '2025-03-28 07:09:01.273');
    """)
    db.session.execute(holiday_sql)
    print("✓ Holidays seeded")

def seed_hr_employee():
    """Seeds an HR employee with complete profile including addresses and skills."""
    print("Seeding HR employee...")
    
    from app.services.hr.employee_service import EmployeeService
    
    hr_employee_data = {
        "first_name": "HR",
        "last_name": "Manager",
        "email": "hr@flairminds.com",
        "contact_number": "1234567890",
        "password": "pass@123",
        "date_of_birth": "2022-04-01",
        "date_of_joining": "2022-04-01",
        "sub_role": 5,
        "role_id": 3,
        "band": 10
    }
    
    try:
        employee_id = EmployeeService.insert_employee(hr_employee_data)
        print(f"✓ HR employee seeded successfully (ID: {employee_id})")
    except Exception as e:
        print(f"✗ Error seeding HR employee: {str(e)}")
        raise

def seed_leave_types():
    """Seeds leave types"""
    print("Seeding leave types")
    leave_type_sql = text("""
        INSERT INTO master_leave_types (leave_type_id, leave_name, yearly_allocation, monthly_allocation, requires_customer_approval, leave_cards_flag, quarterly_allocation, is_deleted) VALUES
        (1, N'Sick/Emergency Leave', 8, 0, false, true, 2, false),
        (2, N'Privilege Leave', 12, 1, false, true, NULL, false),
        (3, N'Work From Home', 36, 0, false, true, NULL, false),
        (4, N'Customer Approved Comp-off', 0, 0, true, false, NULL, false),
        (5, N'Customer Approved Work From Home', 0, 0, true, false, NULL, false),
        (6, N'Customer Holiday', 0, 0, true, false, NULL, false),
        (7, N'Working Late Today', 0, 0, false, false, NULL, false),
        (8, N'Visiting Client Location', 0, 0, false, false, NULL, false),
        (9, N'Casual Leave', 0, 0, false, false, NULL, true),
        (10, N'Swap Leave', 0, 0, false, false, NULL, true),
        (11, N'Exempt Work From Home', 0, 0, false, false, NULL, true),
        (12, N'Unpaid Sick/Emergency Leave', 0, 0, false, true, NULL, true),
        (13, N'Unpaid Privilege Leave', 0, 0, false, true, NULL, true),
        (14, N'Missed Door Entry', 12, 0, false, true, 3, false);
    """)
    db.session.execute(leave_type_sql)
    print("✓ Leave types seeded")

def seed_all():
    """Seeds all master data tables."""
    print("\n" + "="*50)
    print("Starting Master Data Seeding")
    print("="*50 + "\n")
    
    try:
        seed_master_roles()
        seed_master_sub_roles()
        seed_master_skills()
        seed_master_designation()
        seed_holidays()
        seed_leave_types()
        seed_hr_employee()
        
        db.session.commit()
        
        print("\n" + "="*50)
        print("✓ All master data seeded successfully!")
        print("="*50 + "\n")
        
    except Exception as e:
        db.session.rollback()
        print(f"\n✗ Error seeding master data: {str(e)}\n")
        raise

if __name__ == '__main__':
    # Create Flask app context with dev config
    app = create_app('dev')
    
    with app.app_context():
        if len(sys.argv) > 1:
            command = sys.argv[1]
            
            if command == 'seed':
                seed_all()
            else:
                print(f"Unknown command: {command}")
                print("\nUsage:")
                print("  python seed_data.py seed    - Seed all master data")
        else:
            print("Usage:")
            print("  python seed_data.py seed    - Seed all master data")
