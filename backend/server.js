const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
// Note: We don't require cookie-parser. We'll set cookies via res.cookie and parse incoming cookies manually.
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.json());

// CORS: allow credentials and common dev origins (including Capacitor scheme)
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return cb(null, true);
        // Always allow capacitor/electron style schemes
        if (origin.startsWith('capacitor://') || origin.startsWith('ionic://') || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return cb(null, true);
        }
        if (allowedOrigins.length === 0) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
    },
    credentials: true
}));

// DB connection will be initialized after configuration and function definitions

// Configuração do Banco
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'focusnow'
};

// Helpers para cookies JWT
const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || 'focusnow_secret';
const cookieName = process.env.AUTH_COOKIE_NAME || 'focusnow_token';
let cookieSecure = (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : isProd);
let cookieSameSite = (process.env.COOKIE_SAMESITE || (cookieSecure ? 'none' : 'lax')).toLowerCase();
if (cookieSameSite === 'none' && !cookieSecure) {
    console.warn('[AUTH] COOKIE_SAMESITE is "none" but COOKIE_SECURE is false. Adjusting SameSite to "lax" to satisfy browser requirements for non-HTTPS.');
    cookieSameSite = 'lax';
}

function setAuthCookie(res, token) {
    const options = {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: cookieSameSite,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        path: '/',
    };
    res.cookie(cookieName, token, options);
}

function clearAuthCookie(res) {
    res.clearCookie(cookieName, { path: '/', httpOnly: true, secure: cookieSecure, sameSite: cookieSameSite });
}

function parseCookie(header) {
    const out = {};
    if (!header) return out;
    const parts = header.split(';');
    for (const p of parts) {
        const idx = p.indexOf('=');
        if (idx > -1) {
            const k = p.slice(0, idx).trim();
            const v = p.slice(idx + 1).trim();
            out[k] = decodeURIComponent(v);
        }
    }
    return out;
}

function getTokenFromRequest(req) {
    const authHeader = req.headers['authorization'];
    const bearer = authHeader && authHeader.split(' ')[1];
    if (bearer) return bearer;
    const cookies = parseCookie(req.headers['cookie']);
    return cookies[cookieName];
}

// Middleware de autenticação (suporta Authorization: Bearer e cookie HttpOnly)
const authenticateToken = (req, res, next) => {
    const token = getTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }
    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// Conexão com o banco
let db;
async function connectDB() {
    try {
        // Primeiro conecta sem especificar o banco para criar se necessário
        const connectionWithoutDB = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        // Criar database se não existir
        await connectionWithoutDB.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        console.log(`Database '${dbConfig.database}' criado/verificado com sucesso`);
        
        // Fechar conexão temporária
        await connectionWithoutDB.end();

        // Agora conectar ao database específico
        db = await mysql.createConnection(dbConfig);
        console.log('Conectado ao MySQL e database focusnow');

        // Criar tabelas se não existirem
        await createTables();
        
    } catch (error) {
        console.error('Erro ao conectar com o banco:', error);
    }
}

// Middleware para garantir conexão com o DB
async function ensureDBConnected(req, res, next) {
    if (!db) {
        console.warn('DB connection missing. Attempting to reconnect...');
        try {
            await connectDB();
        } catch (e) {
            console.error('Failed to reconnect DB:', e);
        }
    }
    if (!db) {
        return res.status(503).json({ error: 'Serviço indisponível: banco de dados não conectado' });
    }
    next();
}

// Função para criar tabelas automaticamente
async function createTables() {
    try {
        // Tabela usuarios
        await db.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                objetivo VARCHAR(50),
                nivel INT DEFAULT 1,
                xp INT DEFAULT 0,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabela ciclos_pomodoro
        await db.execute(`
            CREATE TABLE IF NOT EXISTS ciclos_pomodoro (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT,
                tipo ENUM('foco', 'pausa_curta', 'pausa_longa'),
                duracao INT,
                completado BOOLEAN DEFAULT false,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `);

        // Tabela configuracoes
        await db.execute(`
            CREATE TABLE IF NOT EXISTS configuracoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT UNIQUE,
                tempo_foco INT DEFAULT 25,
                tempo_pausa_curta INT DEFAULT 5,
                tempo_pausa_longa INT DEFAULT 15,
                intervalo_pausa_longa INT DEFAULT 4,
                tema VARCHAR(20) DEFAULT 'claro',
                notificacoes BOOLEAN DEFAULT true,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `);

        // Sons desbloqueados por usuário
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_unlocked_sounds (
                user_id INT NOT NULL,
                sound_id VARCHAR(100) NOT NULL,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, sound_id),
                FOREIGN KEY (user_id) REFERENCES usuarios(id)
            )
        `);

        // Playlist do usuário (ordem pela coluna position)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_playlists (
                user_id INT NOT NULL,
                position INT NOT NULL,
                sound_id VARCHAR(100) NOT NULL,
                PRIMARY KEY (user_id, position),
                FOREIGN KEY (user_id) REFERENCES usuarios(id)
            )
        `);

        // Conquistas do usuário
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_achievements (
                user_id INT NOT NULL,
                \`key\` VARCHAR(100) NOT NULL,
                achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                seen BOOLEAN DEFAULT FALSE,
                PRIMARY KEY (user_id, \`key\`),
                FOREIGN KEY (user_id) REFERENCES usuarios(id)
            )
        `);

        // Indexes to speed up calendar/day queries
        try {
            await db.execute(`CREATE INDEX idx_ciclos_user_date ON ciclos_pomodoro (usuario_id, data_criacao)`);
        } catch (e) { /* ignore if exists */ }
        try {
            await db.execute(`CREATE INDEX idx_ciclos_user_tipo_date ON ciclos_pomodoro (usuario_id, tipo, data_criacao)`);
        } catch (e) { /* ignore if exists */ }

        console.log('✅ Todas as tabelas e índices criados/verificados com sucesso');
        
    } catch (error) {
        console.error('Erro ao criar tabelas:', error);
    }
}

// Rotas de Autenticação
app.post('/api/register', async (req, res) => {
    // Debug log (can be removed later)
    // console.log('Register body:', req.body);
    try {
        const { nome, email, senha, objetivo } = req.body;

        // Verificar se usuário já existe
        const [existing] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Usuário já existe' });
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(senha, 10);

        // Inserir usuário
        const [result] = await db.execute(
            'INSERT INTO usuarios (nome, email, senha, objetivo, nivel, xp) VALUES (?, ?, ?, ?, 1, 0)',
            [nome, email, hashedPassword, objetivo]
        );

        const token = jwt.sign(
            { userId: result.insertId, email },
            jwtSecret,
            { expiresIn: '24h' }
        );

        // Seta cookie HttpOnly e também retorna token para compatibilidade
        try { setAuthCookie(res, token); } catch (e) { /* ignore */ }
        res.json({ token, user: { id: result.insertId, nome, email, objetivo, nivel: 1, xp: 0 } });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        const [users] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(senha, user.senha);
        if (!validPassword) {
            return res.status(400).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '24h' }
        );

        // Seta cookie HttpOnly e também retorna token para compatibilidade
        try { setAuthCookie(res, token); } catch (e) { /* ignore */ }
        res.json({
            token,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                objetivo: user.objetivo,
                nivel: user.nivel,
                xp: user.xp
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Logout: limpa cookie
app.post('/api/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
});

// Rotas do Timer e Progresso
app.post('/api/ciclos', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const { tipo, duracao, completado } = req.body;
        const userId = req.user.userId;

        // Verificar se usuario existe (evita erro de FK)
        const [exists] = await db.execute('SELECT id FROM usuarios WHERE id = ? LIMIT 1', [userId]);
        if (!exists || exists.length === 0) {
            return res.status(400).json({ error: 'Usuário não encontrado' });
        }

        const [result] = await db.execute(
            'INSERT INTO ciclos_pomodoro (usuario_id, tipo, duracao, completado) VALUES (?, ?, ?, ?)',
            [userId, tipo, duracao, completado]
        );

        // Atualizar XP e nível do usuário
        if (completado) {
            const xpGanho = tipo === 'foco' ? 25 : 10;
            await db.execute(
                'UPDATE usuarios SET xp = xp + ? WHERE id = ?',
                [xpGanho, userId]
            );

            // Verificar se subiu de nível (100 XP por nível)
            const [user] = await db.execute('SELECT xp, nivel FROM usuarios WHERE id = ?', [userId]);
            const xpAtual = user[0].xp;
            const nivelAtual = user[0].nivel;
            const novoNivel = Math.floor(xpAtual / 100) + 1;

            let levelUp = false;
            if (novoNivel > nivelAtual) {
                await db.execute('UPDATE usuarios SET nivel = ? WHERE id = ?', [novoNivel, userId]);
                levelUp = true;
            }

            // Após atualizar XP/nível, calcular sons desbloqueados no servidor
            const unlockRules = [
                { id: 'Sons da Floresta', minLevel: 1 },
                { id: 'Sons de Chuva', minCycles: 2 },
                { id: 'Quiet Resource - Evelyn', minLevel: 2 },
                { id: 'Saudade - Gabriel Albuquerque', minLevel: 3 },
                { id: 'Mix de Frases #1', minCycles: 4 },
                { id: 'Mix de Frases #2', minLevel: 4 }
            ];

            // Total de ciclos completados do usuário (qualquer tipo, completado = 1)
            const [stats] = await db.execute(
                `SELECT COUNT(*) AS ciclos_completados FROM ciclos_pomodoro WHERE usuario_id = ? AND completado = 1`,
                [userId]
            );
            const totalCompleted = stats[0]?.ciclos_completados || 0;
            const effectiveLevel = levelUp ? novoNivel : nivelAtual;

            // Obter sons já desbloqueados
            const [already] = await db.execute(
                `SELECT sound_id FROM user_unlocked_sounds WHERE user_id = ?`,
                [userId]
            );
            const owned = new Set(already.map(r => r.sound_id));
            const newlyUnlocked = [];
            for (const rule of unlockRules) {
                if (owned.has(rule.id)) continue;
                const meetsLevel = typeof rule.minLevel === 'number' ? effectiveLevel >= rule.minLevel : true;
                const meetsCycles = typeof rule.minCycles === 'number' ? totalCompleted >= rule.minCycles : true;
                if (meetsLevel && meetsCycles) {
                    newlyUnlocked.push(rule.id);
                }
            }

            if (newlyUnlocked.length) {
                const values = newlyUnlocked.map(id => [userId, id]);
                // Bulk insert ignoring duplicates
                await db.query(
                    `INSERT IGNORE INTO user_unlocked_sounds (user_id, sound_id) VALUES ?`,
                    [values]
                );
            }

            // Return updated xp/nivel and newly unlocked list
            return res.json({
                message: 'Ciclo salvo com sucesso',
                cicloId: result.insertId,
                xp: xpAtual,
                nivel: levelUp ? novoNivel : nivelAtual,
                levelUp,
                newlyUnlocked
            });
        }
        // Se não completado, apenas retorna sucesso básico
        res.json({ message: 'Ciclo salvo com sucesso', cicloId: result.insertId });
    } catch (error) {
        console.error('Erro ao salvar ciclo:', error);
        const message = error && error.message ? error.message : 'Erro ao salvar ciclo';
        res.status(500).json({ error: message });
    }
});

app.get('/api/historico', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [ciclos] = await db.execute(
            'SELECT * FROM ciclos_pomodoro WHERE usuario_id = ? ORDER BY data_criacao DESC LIMIT 50',
            [userId]
        );
        res.json(ciclos);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ error: error?.message || 'Erro ao buscar histórico' });
    }
});

app.get('/api/estatisticas', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_ciclos,
        SUM(CASE WHEN tipo = 'foco' THEN 1 ELSE 0 END) as ciclos_foco,
        SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) as ciclos_completados,
        SUM(duracao) as total_minutos
      FROM ciclos_pomodoro 
      WHERE usuario_id = ?
    `, [userId]);

        const [sequencia] = await db.execute(`
      SELECT COUNT(*) as dias_sequencia 
      FROM (
        SELECT DATE(data_criacao) as dia 
        FROM ciclos_pomodoro 
        WHERE usuario_id = ? AND completado = 1 
        GROUP BY DATE(data_criacao) 
        ORDER BY dia DESC 
        LIMIT 7
      ) as ultimos_dias
    `, [userId]);

        res.json({
            ...stats[0],
            ...sequencia[0]
        });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: error?.message || 'Erro ao buscar estatísticas' });
    }
});

// Rota para solicitar a recuperação de senha
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const userId = users[0].id;
        const token = jwt.sign(
            { userId, type: 'password_reset' },
            process.env.JWT_SECRET || 'focusnow_secret',
            { expiresIn: '1h' }
        );

        // Em um projeto real, você enviaria um e-mail com o link de recuperação
        // Para o MVP, vamos retornar o token
        res.json({ message: 'Token de recuperação gerado', token });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar a solicitação' });
    }
});

// Rota para redefinir a senha
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, novaSenha } = req.body;

        if (!token || !novaSenha) {
            return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'focusnow_secret');

        if (decoded.type !== 'password_reset') {
            return res.status(400).json({ error: 'Token inválido' });
        }

        const hashedPassword = await bcrypt.hash(novaSenha, 10);
        await db.execute('UPDATE usuarios SET senha = ? WHERE id = ?', [hashedPassword, decoded.userId]);

        res.json({ message: 'Senha redefinida com sucesso' });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao redefinir a senha' });
    }
});


const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
});

// Dias de foco (agregados por dia, para calendários)
app.get('/api/dias-foco', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        // Parse date range from query or default to current month
        const { start, end, tzOffset } = req.query;
        const offsetMin = Number.isFinite(parseInt(tzOffset)) ? parseInt(tzOffset) : 0; // minutes, can be negative

        function toISODate(d) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }

        let startDate, endDate;
        if (start && end) {
            startDate = new Date(start);
            endDate = new Date(end);
        } else {
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        const startStr = toISODate(startDate);
        const endStr = toISODate(endDate);

        const [rows] = await db.execute(`
            SELECT 
                DATE(DATE_ADD(data_criacao, INTERVAL ? MINUTE)) as dia,
                SUM(CASE WHEN tipo = 'foco' AND completado = 1 THEN duracao ELSE 0 END) as minutos_foco,
                SUM(CASE WHEN tipo = 'foco' AND completado = 1 THEN 1 ELSE 0 END) as ciclos_foco,
                SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) as ciclos_completados,
                SUM(CASE WHEN tipo = 'pausa_curta' AND completado = 1 THEN 1 ELSE 0 END) as pausas_curtas,
                SUM(CASE WHEN tipo = 'pausa_longa' AND completado = 1 THEN 1 ELSE 0 END) as pausas_longas
            FROM ciclos_pomodoro
            WHERE usuario_id = ?
            GROUP BY DATE(DATE_ADD(data_criacao, INTERVAL ? MINUTE))
            HAVING DATE(dia) BETWEEN ? AND ?
            ORDER BY dia ASC
        `, [offsetMin, userId, offsetMin, startStr, endStr]);

        res.json({ range: { start: startStr, end: endStr }, days: rows });
    } catch (error) {
        console.error('Erro ao buscar dias de foco:', error);
        res.status(500).json({ error: error?.message || 'Erro ao buscar dias de foco' });
    }
});

// True streak (consecutive days with at least one completed focus cycle)
app.get('/api/streak', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        // Fetch focus cycles (completed) for a reasonable window (e.g., last 400 days)
        const [rows] = await db.execute(`
            SELECT data_criacao
            FROM ciclos_pomodoro
            WHERE usuario_id = ? AND tipo = 'foco' AND completado = 1
            AND data_criacao >= DATE_SUB(CURRENT_DATE, INTERVAL 400 DAY)
            ORDER BY data_criacao DESC
        `, [userId]);

        // Build a set of distinct days (YYYY-MM-DD)
        const dayKey = (d) => {
            const date = new Date(d);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        const daySet = new Set(rows.map(r => dayKey(r.data_criacao)));
        const days = Array.from(daySet).sort(); // ascending

        // Compute current streak: consecutive days up to today
        const today = new Date();
        const keyFor = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        let currentStreak = 0;
        // Must have focus today to have a non-zero streak
        const todayKey = keyFor(today);
        if (daySet.has(todayKey)) {
            currentStreak = 1;
            const d = new Date(today);
            while (true) {
                d.setDate(d.getDate() - 1);
                const k = keyFor(d);
                if (daySet.has(k)) currentStreak++;
                else break;
            }
        }

        // Compute best streak historically
        let bestStreak = 0;
        let run = 0;
        let prev = null;
        for (const k of days) {
            const [y, m, d] = k.split('-').map(Number);
            const curDate = new Date(Date.UTC(y, m - 1, d));
            if (prev) {
                const diffDays = Math.round((curDate - prev) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) run += 1; else run = 1;
            } else {
                run = 1;
            }
            if (run > bestStreak) bestStreak = run;
            prev = curDate;
        }

        const lastFocusDate = days.length ? days[days.length - 1] : null;
        res.json({ currentStreak, bestStreak, lastFocusDate });
    } catch (error) {
        console.error('Erro ao calcular streak:', error);
        res.status(500).json({ error: error?.message || 'Erro ao calcular streak' });
    }
});

// --- User config (timer) ---
app.get('/api/me/timer-config', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.execute(`SELECT tempo_foco, tempo_pausa_curta, tempo_pausa_longa, intervalo_pausa_longa FROM configuracoes WHERE usuario_id = ?`, [userId]);
        if (rows.length === 0) {
            // Create default record
            await db.execute(`INSERT INTO configuracoes (usuario_id) VALUES (?)`, [userId]);
            return res.json({ pomodoro: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 });
        }
        const c = rows[0];
        return res.json({ pomodoro: c.tempo_foco, shortBreak: c.tempo_pausa_curta, longBreak: c.tempo_pausa_longa, longBreakInterval: c.intervalo_pausa_longa });
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao carregar configurações' });
    }
});

app.put('/api/me/timer-config', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { pomodoro, shortBreak, longBreak, longBreakInterval } = req.body || {};
        // Upsert
        await db.execute(`INSERT INTO configuracoes (usuario_id, tempo_foco, tempo_pausa_curta, tempo_pausa_longa, intervalo_pausa_longa) VALUES (?, ?, ?, ?, ?) 
            ON DUPLICATE KEY UPDATE tempo_foco = VALUES(tempo_foco), tempo_pausa_curta = VALUES(tempo_pausa_curta), tempo_pausa_longa = VALUES(tempo_pausa_longa), intervalo_pausa_longa = VALUES(intervalo_pausa_longa)`,
            [userId, pomodoro || 25, shortBreak || 5, longBreak || 15, longBreakInterval || 4]
        );
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao salvar configurações' });
    }
});

// --- Unlocks ---
app.get('/api/me/unlocks', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.execute(`SELECT sound_id FROM user_unlocked_sounds WHERE user_id = ? ORDER BY unlocked_at ASC`, [userId]);
        res.json(rows.map(r => r.sound_id));
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao carregar desbloqueios' });
    }
});

app.put('/api/me/unlocks', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const items = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.items) ? req.body.items : []);
        if (!items.length) return res.json({ ok: true, inserted: 0 });
        const values = items.map(id => [userId, id]);
        await db.query(`INSERT IGNORE INTO user_unlocked_sounds (user_id, sound_id) VALUES ?`, [values]);
        res.json({ ok: true, inserted: values.length });
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao salvar desbloqueios' });
    }
});

// --- Playlist ---
app.get('/api/me/playlist', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.execute(`SELECT sound_id FROM user_playlists WHERE user_id = ? ORDER BY position ASC`, [userId]);
        res.json(rows.map(r => r.sound_id));
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao carregar playlist' });
    }
});

app.put('/api/me/playlist', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const items = Array.isArray(req.body) ? req.body : (Array.isArray(req.body?.items) ? req.body.items : []);
        // replace playlist
        await db.execute(`DELETE FROM user_playlists WHERE user_id = ?`, [userId]);
        if (items.length) {
            const values = items.map((id, idx) => [userId, idx, id]);
            await db.query(`INSERT INTO user_playlists (user_id, position, sound_id) VALUES ?`, [values]);
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao salvar playlist' });
    }
});

// --- Achievements ---
app.get('/api/me/achievements', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [rows] = await db.execute(`SELECT \`key\`, seen, achieved_at FROM user_achievements WHERE user_id = ?`, [userId]);
        const map = {};
        for (const r of rows) map[r.key] = { seen: !!r.seen, achieved_at: r.achieved_at };
        res.json(map);
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao carregar conquistas' });
    }
});

app.post('/api/me/achievements/achieve', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { key } = req.body || {};
        if (!key) return res.status(400).json({ error: 'key é obrigatório' });
        await db.execute(`INSERT IGNORE INTO user_achievements (user_id, \`key\`, seen) VALUES (?, ?, 0)`, [userId, key]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao registrar conquista' });
    }
});

app.post('/api/me/achievements/seen', ensureDBConnected, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { key } = req.body || {};
        if (!key) return res.status(400).json({ error: 'key é obrigatório' });
        await db.execute(`UPDATE user_achievements SET seen = 1 WHERE user_id = ? AND \`key\` = ?`, [userId, key]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e?.message || 'Erro ao marcar como visto' });
    }
});