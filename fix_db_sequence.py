from app import create_app, db
from sqlalchemy import text

app = create_app('dev')

with app.app_context():
    try:
        print("Attempting to fix employee_documents id sequence...")
        
        # 1. Create sequence if not exists
        db.session.execute(text("CREATE SEQUENCE IF NOT EXISTS employee_documents_id_seq;"))
        
        # 2. Alter column to use sequence
        db.session.execute(text("ALTER TABLE employee_documents ALTER COLUMN id SET DEFAULT nextval('employee_documents_id_seq');"))
        
        # 3. Sync sequence value
        # If table is empty (MAX=NULL), COALESCE returns 0. 0+1=1. setval(1, false) -> nextval returns 1.
        # If table has max=5, COALESCE returns 5. 5+1=6. setval(6, false) -> nextval returns 6.
        sql = "SELECT setval('employee_documents_id_seq', COALESCE((SELECT MAX(id) FROM employee_documents), 0) + 1, false);"
        db.session.execute(text(sql))
        
        db.session.commit()
        print("Successfully fixed employee_documents id sequence.")
        
    except Exception as e:
        print(f"Error executing fix: {e}")
        db.session.rollback()
