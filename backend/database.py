import sqlite3
import os

DATABASE_URL = os.environ.get("DATABASE_URL")
DATABASE_PATH = os.environ.get("DATABASE_PATH") or os.environ.get("DATA_DIR")

IS_POSTGRES = False
if DATABASE_URL:
    IS_POSTGRES = True
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

class DictRow(dict):
    def __getitem__(self, key):
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)

class UnifiedCursor:
    def __init__(self, raw_cursor, is_postgres):
        self._cursor = raw_cursor
        self._is_postgres = is_postgres
        self.lastrowid = None

    def execute(self, sql, params=()):
        if self._is_postgres:
            sql_pg = sql.replace("?", "%s")
            
            # Convert SQLite autoincrement keywords if present
            sql_pg = sql_pg.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "SERIAL PRIMARY KEY")
            
            # Handle INSERT OR IGNORE
            if "INSERT OR IGNORE INTO student_registrations" in sql_pg:
                sql_pg = sql_pg.replace("INSERT OR IGNORE INTO", "INSERT INTO") + " ON CONFLICT (session_id, roll_number, subject) DO NOTHING"
            elif "INSERT OR IGNORE INTO exam_schedules" in sql_pg:
                sql_pg = sql_pg.replace("INSERT OR IGNORE INTO", "INSERT INTO") + " ON CONFLICT (session_id, exam_date, exam_time, subject) DO NOTHING"
            elif "INSERT OR IGNORE INTO" in sql_pg:
                sql_pg = sql_pg.replace("INSERT OR IGNORE INTO", "INSERT INTO") + " ON CONFLICT DO NOTHING"
                
            # Handle INSERT OR REPLACE
            if "INSERT OR REPLACE INTO rooms" in sql_pg:
                sql_pg = sql_pg.replace("INSERT OR REPLACE INTO rooms", "INSERT INTO rooms") + " ON CONFLICT (session_id, block, room_name) DO UPDATE SET rows=EXCLUDED.rows, columns=EXCLUDED.columns, benches_per_row=EXCLUDED.benches_per_row, students_per_bench=EXCLUDED.students_per_bench, filling_strategy=EXCLUDED.filling_strategy, capacity=EXCLUDED.capacity"
            elif "INSERT OR REPLACE INTO sessions" in sql_pg:
                sql_pg = sql_pg.replace("INSERT OR REPLACE INTO sessions", "INSERT INTO sessions") + " ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, is_active=EXCLUDED.is_active"
            elif "INSERT OR REPLACE INTO settings" in sql_pg:
                sql_pg = sql_pg.replace("INSERT OR REPLACE INTO settings", "INSERT INTO settings") + " ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value"
            elif "INSERT OR REPLACE INTO" in sql_pg:
                sql_pg = sql_pg.replace("INSERT OR REPLACE INTO", "INSERT INTO")

            # Handle RETURNING id for lastrowid
            if sql_pg.strip().upper().startswith("INSERT INTO") and "RETURNING" not in sql_pg.upper():
                sql_pg_ret = sql_pg + " RETURNING id"
                try:
                    self._cursor.execute(sql_pg_ret, params)
                    res = self._cursor.fetchone()
                    if res:
                        if isinstance(res, dict):
                            self.lastrowid = res.get("id")
                        elif isinstance(res, (tuple, list)):
                            self.lastrowid = res[0]
                    return self
                except Exception:
                    self._cursor.execute(sql_pg, params)
                    return self
            
            self._cursor.execute(sql_pg, params)
            return self
        else:
            self._cursor.execute(sql, params)
            self.lastrowid = self._cursor.lastrowid
            return self

    def fetchone(self):
        row = self._cursor.fetchone()
        if row is None:
            return None
        if isinstance(row, sqlite3.Row):
            return dict(row)
        if isinstance(row, dict):
            return DictRow(row)
        if hasattr(self._cursor, 'description') and self._cursor.description:
            colnames = [desc[0] for desc in self._cursor.description]
            d = dict(zip(colnames, row))
            return DictRow(d)
        return row

    def fetchall(self):
        rows = self._cursor.fetchall()
        if not rows:
            return []
        res = []
        for r in rows:
            if isinstance(r, sqlite3.Row):
                res.append(dict(r))
            elif isinstance(r, dict):
                res.append(DictRow(r))
            elif hasattr(self._cursor, 'description') and self._cursor.description:
                colnames = [desc[0] for desc in self._cursor.description]
                res.append(DictRow(dict(zip(colnames, r))))
            else:
                res.append(r)
        return res

class UnifiedConnection:
    def __init__(self, conn, is_postgres):
        self._conn = conn
        self._is_postgres = is_postgres

    def cursor(self):
        if self._is_postgres:
            import psycopg2.extras
            return UnifiedCursor(self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor), True)
        else:
            return UnifiedCursor(self._conn.cursor(), False)

    def execute(self, sql, params=()):
        c = self.cursor()
        c.execute(sql, params)
        return c

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()

def get_db_connection():
    if IS_POSTGRES:
        import psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        return UnifiedConnection(conn, True)
    else:
        if DATABASE_PATH:
            if os.path.isdir(DATABASE_PATH):
                db_file = os.path.join(DATABASE_PATH, "mits_exam.db")
            else:
                db_file = DATABASE_PATH
        else:
            db_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mits_exam.db")
        os.makedirs(os.path.dirname(os.path.abspath(db_file)), exist_ok=True)
        conn = sqlite3.connect(db_file)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return UnifiedConnection(conn, False)

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
    
    # 5. Student Registrations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_registrations (
        session_id INTEGER NOT NULL,
        roll_number TEXT NOT NULL,
        subject TEXT NOT NULL,
        PRIMARY KEY (session_id, roll_number, subject),
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    """)

    # 6. Exam Schedules table
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
    
    cursor.execute("SELECT value FROM settings WHERE key = 'admin_password'")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO settings (key, value) VALUES ('admin_password', 'admin123')")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
