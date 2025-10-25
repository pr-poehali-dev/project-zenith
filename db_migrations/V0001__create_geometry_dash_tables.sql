-- Players table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    total_stars INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    level_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
    music_url VARCHAR(500),
    obstacles JSONB NOT NULL,
    duration INTEGER NOT NULL
);

-- Player progress table
CREATE TABLE IF NOT EXISTS player_progress (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    level_id INTEGER REFERENCES levels(id),
    completed BOOLEAN DEFAULT FALSE,
    best_time INTEGER,
    attempts INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    UNIQUE(player_id, level_id)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INTEGER NOT NULL
);

-- Player achievements table
CREATE TABLE IF NOT EXISTS player_achievements (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    achievement_id INTEGER REFERENCES achievements(id),
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, achievement_id)
);

-- Insert default levels
INSERT INTO levels (level_number, name, difficulty, music_url, obstacles, duration) VALUES
(1, 'Neon Start', 1, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', '[]', 25),
(2, 'Electric Flow', 2, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', '[]', 30),
(3, 'Cyber Jump', 3, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', '[]', 35),
(4, 'Digital Chaos', 4, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', '[]', 40),
(5, 'Quantum Dash', 5, 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', '[]', 45)
ON CONFLICT (level_number) DO NOTHING;

-- Insert default achievements
INSERT INTO achievements (name, description, icon, requirement_type, requirement_value) VALUES
('First Jump', 'Complete your first level', 'Trophy', 'levels_completed', 1),
('Star Collector', 'Collect 5 stars', 'Star', 'total_stars', 5),
('Neon Master', 'Complete all levels', 'Award', 'levels_completed', 5),
('Speed Demon', 'Complete a level in under 20 seconds', 'Zap', 'best_time', 20),
('Persistent', 'Make 100 attempts', 'Target', 'total_attempts', 100)
ON CONFLICT DO NOTHING;