from app import create_app, db
from sqlalchemy import text

app = create_app('dev')

with app.app_context():
    try:
        # Check if table exists
        result = db.session.execute(text("SELECT to_regclass('public.alembic_version')")).scalar()
        if result:
            db.session.execute(text("DELETE FROM alembic_version"))
            db.session.commit()
            print("Successfully cleared alembic_version table.")
        else:
            print("alembic_version table not found.")
            
        # Check if project_history exists, to be safe. If so, drop it so upgrade can recreate.
        result_h = db.session.execute(text("SELECT to_regclass('public.project_history')")).scalar()
        if result_h:
             print("Dropping existing project_history table to allow upgrade...")
             db.session.execute(text("DROP TABLE project_history"))
             
        result_ah = db.session.execute(text("SELECT to_regclass('public.project_allocation_history')")).scalar()
        if result_ah:
             print("Dropping existing project_allocation_history table to allow upgrade...")
             db.session.execute(text("DROP TABLE project_allocation_history"))
        
        db.session.commit()
        
    except Exception as e:
        print(f"Error: {e}")
        db.session.rollback()
