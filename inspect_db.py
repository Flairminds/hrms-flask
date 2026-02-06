from app import create_app, db
from sqlalchemy import inspect
import sys

app = create_app('dev')

with app.app_context():
    inspector = inspect(db.engine)
    columns = [c['name'] for c in inspector.get_columns('project')]
    print(f"Project columns: {columns}")
    
    alloc_columns = [c['name'] for c in inspector.get_columns('project_allocation')]
    print(f"ProjectAllocation columns: {alloc_columns}")
    
    if 'description' not in columns:
        print("MISSING: description in project")
    else:
        print("FOUND: description in project")
        
    if 'start_date' not in alloc_columns:
        print("MISSING: start_date in project_allocation")
    else:
        print("FOUND: start_date in project_allocation")
