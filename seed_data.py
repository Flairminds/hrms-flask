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
        INSERT INTO master_sub_role (sub_role_name) VALUES
        (N'Software Engineer'),
        (N'Data Scientist'),
        (N'Testers'),
        (N'DevOps Engineer'),
        (N'Human Resource Manager');
    """)
    
    db.session.execute(sub_roles_sql)
    print("✓ Master sub-roles seeded")

def seed_master_skills():
    """Seeds master skills table."""
    print("Seeding master skills...")
    
    skills_sql = text("""
        INSERT INTO master_skills (skill_name, skill_type, skill_category, is_master_skill) VALUES
        (N'Python', N'Technical', N'Programming Languages & Frameworks', true),
        (N'Java', N'Technical', N'Programming Languages & Frameworks', true),
        (N'JavaScript', N'Technical', N'Programming Languages & Frameworks', true),
        (N'C#', N'Technical', N'Programming Languages & Frameworks', true),
        (N'C++', N'Technical', N'Programming Languages & Frameworks', true),
        (N'C', N'Technical', N'Programming Languages & Frameworks', true),
        (N'PHP', N'Technical', N'Programming Languages & Frameworks', true),
        (N'Go', N'Technical', N'Programming Languages & Frameworks', true),
        (N'Ruby', N'Technical', N'Programming Languages & Frameworks', true),
        (N'Swift', N'Technical', N'Programming Languages & Frameworks', true),
        (N'Kotlin', N'Technical', N'Programming Languages & Frameworks', true),
        (N'TypeScript', N'Technical', N'Programming Languages & Frameworks', true),
        (N'VB.NET', N'Technical', N'Programming Languages & Frameworks', true),
        (N'Apex', N'Technical', N'Programming Languages & Frameworks', true),
        (N'HTML', N'Technical', N'Web Development', true),
        (N'CSS', N'Technical', N'Web Development', true),
        (N'React', N'Technical', N'Web Development', true),
        (N'Angular', N'Technical', N'Web Development', true),
        (N'Vue.js', N'Technical', N'Web Development', true),
        (N'Next.js', N'Technical', N'Web Development', true),
        (N'Node.js', N'Technical', N'Web Development', true),
        (N'Express.js', N'Technical', N'Web Development', true),
        (N'Django', N'Technical', N'Web Development', true),
        (N'Flask API', N'Technical', N'Web Development', true),
        (N'Spring Boot', N'Technical', N'Web Development', true),
        (N'ASP.NET', N'Technical', N'Web Development', true),
        (N'.NET Framework / .NET', N'Technical', N'Web Development', true),
        (N'Strapi', N'Technical', N'Web Development', true),
        (N'AJAX', N'Technical', N'Web Development', true),
        (N'Web Services / RESTful APIs / GraphQL', N'Technical', N'Web Development', true),
        (N'MVC', N'Technical', N'Web Development', true),
        (N'JSP', N'Technical', N'Web Development', true),
        (N'Servlet', N'Technical', N'Web Development', true),
        (N'J2EE / JEE', N'Technical', N'Web Development', true),
        (N'Redux Toolkit', N'Technical', N'Web Development', true),
        (N'Android (JAVA)', N'Technical', N'Mobile Development', true),
        (N'Flutter', N'Technical', N'Mobile Development', true),
        (N'React Native', N'Technical', N'Mobile Development', true),
        (N'Swift UI / Kotlin Multiplatform', N'Technical', N'Mobile Development', true),
        (N'Xamarin', N'Technical', N'Mobile Development', true),
        (N'Mobile UI/UXánhDesign Principles', N'Technical', N'Mobile Development', true),
        (N'Mobile Security', N'Technical', N'Mobile Development', true),
        (N'SQL', N'Technical', N'Database & Data Management', true),
        (N'SQL Server / MSSQL', N'Technical', N'Database & Data Management', true),
        (N'MySQL', N'Technical', N'Database & Data Management', true),
        (N'PostgreSQL', N'Technical', N'Database & Data Management', true),
        (N'Oracle', N'Technical', N'Database & Data Management', true),
        (N'PL/SQL', N'Technical', N'Database & Data Management', true),
        (N'MongoDB / NoSQL', N'Technical', N'Database & Data Management', true),
        (N'Neo4j', N'Technical', N'Database & Data Management', true),
        (N'Elasticsearch', N'Technical', N'Database & Data Management', true),
        (N'Database Administration', N'Technical', N'Database & Data Management', true),
        (N'Data Modeling', N'Technical', N'Database & Data Management', true),
        (N'Data Extraction', N'Technical', N'Database & Data Management', true),
        (N'ETL', N'Technical', N'Database & Data Management', true),
        (N'Data Warehousing', N'Technical', N'Database & Data Management', true),
        (N'DevOps', N'Technical', N'DevOps & Cloud', true),
        (N'Kubernetes / K8s', N'Technical', N'DevOps & Cloud', true),
        (N'Docker / Containerization', N'Technical', N'DevOps & Cloud', true),
        (N'AWS', N'Technical', N'DevOps & Cloud', true),
        (N'Azure', N'Technical', N'DevOps & Cloud', true),
        (N'IaC (Infrastructure as Code)', N'Technical', N'DevOps & Cloud', true),
        (N'Terraform', N'Technical', N'DevOps & Cloud', true),
        (N'Ansible', N'Technical', N'DevOps & Cloud', true),
        (N'CI/CD', N'Technical', N'DevOps & Cloud', true),
        (N'Jenkins', N'Technical', N'DevOps & Cloud', true),
        (N'Prometheus', N'Technical', N'DevOps & Cloud', true),
        (N'Grafana', N'Technical', N'DevOps & Cloud', true),
        (N'Cloud Security', N'Technical', N'DevOps & Cloud', true),
        (N'System Administration (Linux / Windows)', N'Technical', N'DevOps & Cloud', true),
        (N'GCP', N'Technical', N'DevOps & Cloud', true),
        (N'Azure Function', N'Technical', N'DevOps & Cloud', true),
        (N'Machine Learning (ML)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Deep Learning (DL)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Neural Networks (Basics)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'NLP (Natural Language Processing)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'GenAI (Generative AI)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'LLM (Large Language Models)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'LLM Deployments', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'BERT', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Scikit-learn (Sklearn)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Pandas', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'NumPy', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'OpenCV', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Matlab', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Model Building (in ML)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'EDA (Exploratory Data Analysis)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'FAISS Indexing', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'GraphRAG', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'RAG (Retrieval Augmented Generation)', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Prompt Engineering', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'MLOps', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Computer Vision', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Reinforcement Learning', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Google Vertex AI Workbench', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Agentic AI', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'LangChain', N'Technical', N'Artificial Intelligence & Machine Learning', true),
        (N'Data Science', N'Technical', N'Data Science & Analytics', true),
        (N'Data Structures (DS)', N'Technical', N'Data Science & Analytics', true),
        (N'Visualization / Data Visualization', N'Technical', N'Data Science & Analytics', true),
        (N'Google Data Studio / Looker / PowerBI', N'Technical', N'Data Science & Analytics', true),
        (N'Google BigQuery', N'Technical', N'Data Science & Analytics', true),
        (N'Google Cloud Storage', N'Technical', N'Data Science & Analytics', true),
        (N'Snowflake', N'Technical', N'Data Science & Analytics', true),
        (N'PySpark', N'Technical', N'Data Science & Analytics', true),
        (N'Statistical Analysis', N'Technical', N'Data Science & Analytics', true),
        (N'A/B Testing', N'Technical', N'Data Science & Analytics', true),
        (N'Big Data Technologies (e.g., Hadoop, Spark)', N'Technical', N'Data Science & Analytics', true),
        (N'Testing', N'Technical', N'Testing & Quality Assurance', true),
        (N'API Testing', N'Technical', N'Testing & Quality Assurance', true),
        (N'Automation Testing', N'Technical', N'Testing & Quality Assurance', true),
        (N'Selenium', N'Technical', N'Testing & Quality Assurance', true),
        (N'Appium', N'Technical', N'Testing & Quality Assurance', true),
        (N'Apache JMeter', N'Technical', N'Testing & Quality Assurance', true),
        (N'Unit Testing', N'Technical', N'Testing & Quality Assurance', true),
        (N'Integration Testing', N'Technical', N'Testing & Quality Assurance', true),
        (N'End-to-end Testing', N'Technical', N'Testing & Quality Assurance', true),
        (N'Payment Integration', N'Technical', N'E-commerce & Payments', true),
        (N'Twilio', N'Technical', N'E-commerce & Payments', true),
        (N'Razorpay', N'Technical', N'E-commerce & Payments', true),
        (N'Stripe', N'Technical', N'E-commerce & Payments', true),
        (N'n8n', N'Technical', N'Automation & Workflow', true),
        (N'Software Development Life Cycle (SDLC)', N'Technical', N'Other Technical Skills', true),
        (N'Microservices', N'Technical', N'Other Technical Skills', true),
        (N'Postman', N'Technical', N'Other Technical Skills', true),
        (N'Git / Version Control', N'Technical', N'Other Technical Skills', true),
        (N'IDEs (e.g., IntelliJ, VS Code, Android Studio, Xcode)', N'Technical', N'Other Technical Skills', true),
        (N'JSS (JavaScript Style Sheets)', N'Technical', N'Other Technical Skills', true),
        (N'Game Development', N'Technical', N'Other Technical Skills', true),
        (N'Unity Engine', N'Technical', N'Other Technical Skills', true),
        (N'Electrical Engineering', N'Technical', N'Other Technical Skills', true),
        (N'Communication', N'Other', N'Soft Skills & Process', true),
        (N'Project Management', N'Other', N'Soft Skills & Process', true),
        (N'Agile/Scrum Methodologies', N'Other', N'Soft Skills & Process', true),
        (N'Problem-Solving', N'Other', N'Soft Skills & Process', true),
        (N'Collaboration / Teamwork', N'Other', N'Soft Skills & Process', true),
        (N'Time Management', N'Other', N'Soft Skills & Process', true),
        (N'Adaptability', N'Other', N'Soft Skills & Process', true),
        (N'Critical Thinking', N'Other', N'Soft Skills & Process', true),
        (N'Domain Knowledge / Business Acumen', N'Other', N'Soft Skills & Process', true),
        (N'Technical Documentation', N'Other', N'Soft Skills & Process', true),
        (N'Mentorship / Training', N'Other', N'Soft Skills & Process', true),
        (N'Recruiting / Recruitment', N'Other', N'Soft Skills & Process', true),
        (N'Finance', N'Other', N'Soft Skills & Process', true),
        (N'Digital Marketing', N'Other', N'Soft Skills & Process', true),
        (N'Marketing', N'Other', N'Soft Skills & Process', true),
        (N'Shared Services', N'Other', N'Soft Skills & Process', true),
        (N'Snowflake Certifications', N'Other', N'Technical', true),
        (N'REST API Integration', N'Other', N'Soft Skills & Process', true),
        (N'Message Queue Integration', N'Technical', N'Other Technical Skills', true),
        (N'WhatsApp Integration', N'Technical', N'Other Technical Skills', true),
        (N'GraphQL', N'Technical', N'Other Technical Skills', true),
        (N'SQL Database', N'Technical', N'Database & Data Management', true),
        (N'Google Sheet', N'Other', N'Soft Skills & Process', true),
        (N'Windows Form', N'Technical', N'Other Technical Skills', true),
        (N'Power BI', N'Technical', N'Data Science & Analytics', true),
        (N'Looker', N'Technical', N'Data Science & Analytics', true),
        (N'Google Data Studio', N'Technical', N'Data Science & Analytics', true),
        (N'Streamlit', N'Technical', N'Data Science & Analytics', true),
        (N'Maven', N'Technical', N'Mobile Development', true),
        (N'Test goal', N'Other', NULL, false),
        (N'Evaluation of Pooja for her confirmation', N'Other', NULL, false),
        (N'Confirm final approach to go with Grid layout to overcome limit rung issue', N'Other', NULL, false),
        (N'Advanced SQL', N'Other', NULL, false),
        (N'Investment Banking Concepts - Asset Classes ,Major Data Providers & Feed Types', N'Other', NULL, false),
        (N'IB Trade Life Cycle - Front Office,Regulatory Reporting (US,EU,MIS)', N'Other', NULL, false);
    """)
    
    db.session.execute(skills_sql)
    print("✓ Master skills seeded")


def seed_all():
    """Seeds all master data tables."""
    print("\n" + "="*50)
    print("Starting Master Data Seeding")
    print("="*50 + "\n")
    
    try:
        seed_master_roles()
        seed_master_sub_roles()
        seed_master_skills()
        
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
