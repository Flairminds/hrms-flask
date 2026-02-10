-- Capability Development Tables Migration
-- Run this script manually to create the capability development tables

-- 1. Enhanced Employee Goals Table
CREATE TABLE IF NOT EXISTS employee_goal_enhanced (
    goal_id SERIAL PRIMARY KEY,
    for_employee_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    set_by_employee_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    
    -- Goal type and details
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('skill', 'other')),
    skill_id INTEGER REFERENCES master_skills(skill_id),
    goal_title VARCHAR(255),
    goal_description TEXT,
    goal_category VARCHAR(100),
    
    -- Progress tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    progress_percentage NUMERIC(5, 2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    deadline DATE NOT NULL,
    completion_date TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    created_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_on TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_employee_goal_enhanced_for_employee ON employee_goal_enhanced(for_employee_id);
CREATE INDEX IF NOT EXISTS ix_employee_goal_enhanced_deadline ON employee_goal_enhanced(deadline);
CREATE INDEX IF NOT EXISTS ix_employee_goal_enhanced_status_deadline ON employee_goal_enhanced(for_employee_id, status, deadline);

-- 2. Goal Comments Table
CREATE TABLE IF NOT EXISTS goal_comment (
    comment_id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES employee_goal_enhanced(goal_id) ON DELETE CASCADE,
    commented_by_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    comment_text TEXT NOT NULL,
    comment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_goal_comment_goal ON goal_comment(goal_id);
CREATE INDEX IF NOT EXISTS ix_goal_comment_goal_date ON goal_comment(goal_id, comment_date);

-- 3. Goal Reviews Table
CREATE TABLE IF NOT EXISTS goal_review (
    review_id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES employee_goal_enhanced(goal_id) ON DELETE CASCADE,
    reviewed_by_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    rating NUMERIC(3, 2) CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_goal_review_goal ON goal_review(goal_id);

-- 4. Employee Feedback Table (Peer-to-Peer)
CREATE TABLE IF NOT EXISTS employee_feedback (
    feedback_id SERIAL PRIMARY KEY,
    for_employee_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    feedback_by_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    
    -- Categorization
    feedback_category VARCHAR(50) NOT NULL CHECK (feedback_category IN ('skill', 'performance', 'behavior', 'goal', 'general')),
    related_skill_id INTEGER REFERENCES master_skills(skill_id),
    related_goal_id INTEGER REFERENCES employee_goal_enhanced(goal_id),
    
    -- Content
    rating NUMERIC(3, 2) CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT NOT NULL,
    is_visible_to_employee BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    feedback_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_employee_feedback_for_employee ON employee_feedback(for_employee_id);
CREATE INDEX IF NOT EXISTS ix_employee_feedback_date ON employee_feedback(feedback_date);
CREATE INDEX IF NOT EXISTS ix_employee_feedback_for_date ON employee_feedback(for_employee_id, feedback_date);

-- 5. Employee Performance Metrics Table
CREATE TABLE IF NOT EXISTS employee_performance_metrics (
    metric_id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    
    -- Period definition
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Calculated metrics
    skill_proficiency_score NUMERIC(5, 2),
    goal_completion_rate NUMERIC(5, 2),
    peer_feedback_score NUMERIC(5, 2),
    overall_performance_score NUMERIC(5, 2),
    
    -- Supporting counts
    goals_set_count INTEGER DEFAULT 0,
    goals_completed_count INTEGER DEFAULT 0,
    skills_evaluated_count INTEGER DEFAULT 0,
    feedback_received_count INTEGER DEFAULT 0,
    
    -- Metadata
    calculated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_employee_performance_metrics_period UNIQUE (employee_id, period_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS ix_employee_performance_metrics_employee ON employee_performance_metrics(employee_id);
CREATE INDEX IF NOT EXISTS ix_employee_performance_metrics_period ON employee_performance_metrics(employee_id, period_type, period_start);

-- 6. Skill Progress Log Table
CREATE TABLE IF NOT EXISTS skill_progress_log (
    log_id SERIAL PRIMARY KEY,
    employee_skill_id INTEGER NOT NULL REFERENCES employee_skill(employee_skill_id),
    employee_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    skill_id INTEGER NOT NULL REFERENCES master_skills(skill_id),
    
    -- Change tracking
    previous_level VARCHAR(50),
    new_level VARCHAR(50),
    previous_score NUMERIC(5, 2),
    new_score NUMERIC(5, 2),
    
    -- Who made the change
    updated_by_id VARCHAR(20) NOT NULL REFERENCES employee(employee_id),
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS ix_skill_progress_log_employee_skill ON skill_progress_log(employee_skill_id);
CREATE INDEX IF NOT EXISTS ix_skill_progress_log_date ON skill_progress_log(update_date);
CREATE INDEX IF NOT EXISTS ix_skill_progress_log_skill_date ON skill_progress_log(employee_skill_id, update_date);

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
