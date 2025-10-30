CREATE DATABASE IF NOT EXISTS focusnow;
USE focusnow;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    objetivo VARCHAR(50),
    nivel INT DEFAULT 1,
    xp INT DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ciclos_pomodoro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    tipo ENUM('foco', 'pausa_curta', 'pausa_longa'),
    duracao INT,
    completado BOOLEAN DEFAULT false,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE configuracoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNIQUE,
    tempo_foco INT DEFAULT 25,
    tempo_pausa_curta INT DEFAULT 5,
    tempo_pausa_longa INT DEFAULT 15,
    intervalo_pausa_longa INT DEFAULT 4,
    tema VARCHAR(20) DEFAULT 'claro',
    notificacoes BOOLEAN DEFAULT true,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Sons desbloqueados por usuário
CREATE TABLE IF NOT EXISTS user_unlocked_sounds (
    user_id INT NOT NULL,
    sound_id VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, sound_id),
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

-- Playlist do usuário (ordem preservada pelo campo position)
CREATE TABLE IF NOT EXISTS user_playlists (
    user_id INT NOT NULL,
    position INT NOT NULL,
    sound_id VARCHAR(100) NOT NULL,
    PRIMARY KEY (user_id, position),
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

-- Conquistas do usuário (achieved + flag seen)
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id INT NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    seen BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, `key`),
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
);