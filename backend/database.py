import sqlite3
import os

DATABASE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mits_exam.db")

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Rooms table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        block TEXT NOT NULL,
        room_name TEXT NOT NULL,
        rows INTEGER NOT NULL,
        columns INTEGER NOT NULL,
        benches_per_row INTEGER DEFAULT 1,
        students_per_bench INTEGER DEFAULT 1,
        filling_strategy TEXT DEFAULT 'column_wise',
        capacity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        UNIQUE(session_id, block, room_name)
    )
    """)
    
    # 3. Seating Ranges table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seating_ranges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        room_id INTEGER NOT NULL,
        roll_prefix TEXT NOT NULL,
        start_num TEXT NOT NULL,
        end_num TEXT NOT NULL,
        padding INTEGER DEFAULT 2,
        exam_date TEXT,
        exam_time TEXT,
        subject TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
    """)

    # 4. Settings table (for storing API keys and configs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
    
    # 5. Student Registrations table (completely additive)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_registrations (
        session_id INTEGER NOT NULL,
        roll_number TEXT NOT NULL,
        subject TEXT NOT NULL,
        PRIMARY KEY (session_id, roll_number, subject),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    """)

    # 6. Exam Schedules table (completely additive)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exam_schedules (
        session_id INTEGER NOT NULL,
        exam_date TEXT NOT NULL,
        exam_time TEXT NOT NULL,
        subject TEXT NOT NULL,
        PRIMARY KEY (session_id, exam_date, exam_time, subject),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    """)
    
    # Insert default admin password if not exists
    cursor.execute("SELECT COUNT(*) FROM settings WHERE key = 'admin_password'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO settings (key, value) VALUES ('admin_password', 'admin123')")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
