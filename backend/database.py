import sqlite3
import os
import re

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
    def __init__(self, raw_cursor, is_postgres, parent_conn=None):
        self._cursor = raw_cursor
        self._is_postgres = is_postgres
        self._parent_conn = parent_conn
        self.lastrowid = None

    def execute(self, sql, params=()):
        if self._is_postgres:
            sql_pg = sql.replace("?", "%s")
            
            # Robust regex replacement for SQLite AUTOINCREMENT -> SERIAL PRIMARY KEY
            sql_pg = re.sub(r'INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT', 'SERIAL PRIMARY KEY', sql_pg, flags=re.IGNORECASE)
            sql_pg = re.sub(r'PRIMARY\s+KEY\s+AUTOINCREMENT', 'SERIAL PRIMARY KEY', sql_pg, flags=re.IGNORECASE)
            sql_pg = re.sub(r'\bAUTOINCREMENT\b', '', sql_pg, flags=re.IGNORECASE)
            
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
                    if self._parent_conn:
                        try:
                            self._parent_conn.rollback()
                        except Exception:
                            pass
                    self._cursor.execute(sql_pg, params)
                    return self
            
            try:
                self._cursor.execute(sql_pg, params)
            except Exception as e:
                if self._parent_conn:
                    try:
                        self._parent_conn.rollback()
                    except Exception:
                        pass
                raise e
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
            return UnifiedCursor(self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor), True, self._conn)
        else:
            return UnifiedCursor(self._conn.cursor(), False, self._conn)

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
    
    tables = [
        # 1. Sessions table
        """
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            is_active INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        # 2. Rooms table
        """
        CREATE TABLE IF NOT EXISTS rooms (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL,
            block VARCHAR(255) NOT NULL,
            room_name VARCHAR(255) NOT NULL,
            rows INTEGER NOT NULL,
            columns INTEGER NOT NULL,
            benches_per_row INTEGER DEFAULT 1,
            students_per_bench INTEGER DEFAULT 1,
            filling_strategy VARCHAR(255) DEFAULT 'column_wise',
            capacity INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            CONSTRAINT unique_session_block_room UNIQUE(session_id, block, room_name)
        )
        """,
        # 3. Seating Ranges table
        """
        CREATE TABLE IF NOT EXISTS seating_ranges (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL,
            room_id INTEGER NOT NULL,
            roll_prefix VARCHAR(255) NOT NULL,
            start_num VARCHAR(255) NOT NULL,
            end_num VARCHAR(255) NOT NULL,
            padding INTEGER DEFAULT 2,
            exam_date VARCHAR(255),
            exam_time VARCHAR(255),
            subject VARCHAR(255),
            order_index INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
        )
        """,
        # 4. Settings table
        """
        CREATE TABLE IF NOT EXISTS settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT
        )
        """,
        # 5. Student Registrations table
        """
        CREATE TABLE IF NOT EXISTS student_registrations (
            session_id INTEGER NOT NULL,
            roll_number VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            PRIMARY KEY (session_id, roll_number, subject),
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
        """,
        # 6. Exam Schedules table
        """
        CREATE TABLE IF NOT EXISTS exam_schedules (
            session_id INTEGER NOT NULL,
            exam_date VARCHAR(255) NOT NULL,
            exam_time VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            PRIMARY KEY (session_id, exam_date, exam_time, subject),
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        )
        """
    ]

    for stmt in tables:
        try:
            cursor.execute(stmt)
            conn.commit()
        except Exception as e:
            print(f"Notice on table init: {e}")
            conn.rollback()

    try:
        cursor.execute("SELECT value FROM settings WHERE key = 'admin_password'")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO settings (key, value) VALUES ('admin_password', 'admin123')")
            conn.commit()
    except Exception as e:
        print(f"Notice on settings init: {e}")
        conn.rollback()

    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
