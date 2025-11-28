"""SQLite database operations"""

import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
from dotenv import load_dotenv

load_dotenv()

DATABASE_PATH = os.getenv('DATABASE_PATH', './calls.db')


def get_db_connection():
    """Get SQLite database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialize database schema"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create calls table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS calls (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # Create transcripts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transcripts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_id TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            speaker TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (call_id) REFERENCES calls(id)
        )
    ''')

    # Create compliance_reports table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS compliance_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            call_id TEXT NOT NULL,
            report TEXT NOT NULL,
            issues_found INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (call_id) REFERENCES calls(id)
        )
    ''')

    conn.commit()
    conn.close()


def create_call(call_id: str) -> None:
    """Create a new call record"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    cursor.execute('''
        INSERT INTO calls (id, started_at, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (call_id, now, 'active', now, now))

    conn.commit()
    conn.close()


def update_call_status(call_id: str, status: str, ended_at: Optional[str] = None) -> None:
    """Update call status"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    if ended_at:
        cursor.execute('''
            UPDATE calls
            SET status = ?, ended_at = ?, updated_at = ?
            WHERE id = ?
        ''', (status, ended_at, now, call_id))
    else:
        cursor.execute('''
            UPDATE calls
            SET status = ?, updated_at = ?
            WHERE id = ?
        ''', (status, now, call_id))

    conn.commit()
    conn.close()


def save_transcript(call_id: str, text: str, timestamp: str, speaker: Optional[str] = None) -> None:
    """Save transcript segment"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    cursor.execute('''
        INSERT INTO transcripts (call_id, text, timestamp, speaker, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (call_id, text, timestamp, speaker, now))

    conn.commit()
    conn.close()


def save_compliance_report(call_id: str, report: Dict[str, Any], issues_found: int) -> None:
    """Save compliance report"""
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    report_json = json.dumps(report)

    cursor.execute('''
        INSERT INTO compliance_reports (call_id, report, issues_found, created_at)
        VALUES (?, ?, ?, ?)
    ''', (call_id, report_json, issues_found, now))

    conn.commit()
    conn.close()


def get_call_transcripts(call_id: str) -> List[Dict[str, Any]]:
    """Get all transcripts for a call"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT text, timestamp, speaker, created_at
        FROM transcripts
        WHERE call_id = ?
        ORDER BY timestamp ASC
    ''', (call_id,))

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_compliance_report(call_id: str) -> Optional[Dict[str, Any]]:
    """Get compliance report for a call"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT report, issues_found, created_at
        FROM compliance_reports
        WHERE call_id = ?
        ORDER BY created_at DESC
        LIMIT 1
    ''', (call_id,))

    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            'report': json.loads(row['report']),
            'issues_found': row['issues_found'],
            'created_at': row['created_at']
        }
    return None

