"""
Business: Save and retrieve player progress (completed levels, best times, stars)
Args: event - dict with httpMethod, body (JSON), queryStringParameters
      context - object with request_id attribute
Returns: HTTP response with progress data
"""
import json
import os
from typing import Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            player_id = params.get('player_id')
            
            if not player_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'player_id required'})
                }
            
            cursor.execute("""
                SELECT pp.*, l.level_number, l.name, l.difficulty
                FROM player_progress pp
                JOIN levels l ON pp.level_id = l.id
                WHERE pp.player_id = %s
                ORDER BY l.level_number
            """, (player_id,))
            
            progress = [dict(row) for row in cursor.fetchall()]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'progress': progress}, default=serialize_datetime)
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            player_id = body_data.get('player_id')
            level_id = body_data.get('level_id')
            completed = body_data.get('completed', False)
            time_seconds = body_data.get('time_seconds', 0)
            
            if not player_id or not level_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'player_id and level_id required'})
                }
            
            cursor.execute("""
                INSERT INTO player_progress (player_id, level_id, completed, best_time, attempts, completed_at)
                VALUES (%s, %s, %s, %s, 1, CURRENT_TIMESTAMP)
                ON CONFLICT (player_id, level_id) 
                DO UPDATE SET 
                    completed = EXCLUDED.completed,
                    best_time = CASE 
                        WHEN player_progress.best_time IS NULL THEN EXCLUDED.best_time
                        WHEN EXCLUDED.best_time < player_progress.best_time THEN EXCLUDED.best_time
                        ELSE player_progress.best_time
                    END,
                    attempts = player_progress.attempts + 1,
                    completed_at = CASE WHEN EXCLUDED.completed THEN CURRENT_TIMESTAMP ELSE player_progress.completed_at END
                RETURNING *
            """, (player_id, level_id, completed, time_seconds))
            
            conn.commit()
            result = cursor.fetchone()
            
            if completed:
                cursor.execute("""
                    SELECT difficulty FROM levels WHERE id = %s
                """, (level_id,))
                level = cursor.fetchone()
                
                if level:
                    cursor.execute("""
                        UPDATE players 
                        SET total_stars = (
                            SELECT COALESCE(SUM(l.difficulty), 0)
                            FROM player_progress pp
                            JOIN levels l ON pp.level_id = l.id
                            WHERE pp.player_id = %s AND pp.completed = true
                        )
                        WHERE id = %s
                        RETURNING total_stars
                    """, (player_id, player_id))
                    conn.commit()
                    player = cursor.fetchone()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'progress': dict(result),
                            'total_stars': player['total_stars'] if player else 0
                        }, default=serialize_datetime)
                    }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'progress': dict(result)}, default=serialize_datetime)
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
        
    finally:
        cursor.close()
        conn.close()