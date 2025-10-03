const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuração do Banco
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'focusnow'
};

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'focusnow_secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido' });
        req.user = user;
        next();
    });
};

// Conexão com o banco
let db;
async function connectDB() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Conectado ao MySQL');
    } catch (error) {
        console.error('Erro ao conectar com o banco:', error);
    }
}

// Rotas de Autenticação
app.post('/api/register', async (req, res) => {
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
            process.env.JWT_SECRET || 'focusnow_secret',
            { expiresIn: '24h' }
        );

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
            process.env.JWT_SECRET || 'focusnow_secret',
            { expiresIn: '24h' }
        );

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

// Rotas do Timer e Progresso
app.post('/api/ciclos', authenticateToken, async (req, res) => {
    try {
        const { tipo, duracao, completado } = req.body;
        const userId = req.user.userId;

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
            const novoNivel = Math.floor(user[0].xp / 100) + 1;

            if (novoNivel > user[0].nivel) {
                await db.execute('UPDATE usuarios SET nivel = ? WHERE id = ?', [novoNivel, userId]);
            }
        }

        res.json({ message: 'Ciclo salvo com sucesso', cicloId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar ciclo' });
    }
});

app.get('/api/historico', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const [ciclos] = await db.execute(
            'SELECT * FROM ciclos_pomodoro WHERE usuario_id = ? ORDER BY data_criacao DESC LIMIT 50',
            [userId]
        );
        res.json(ciclos);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
});

app.get('/api/estatisticas', authenticateToken, async (req, res) => {
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
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// Recuperação de Senha (simplificada)
app.post('/api/recuperar-senha', async (req, res) => {
    try {
        const { email } = req.body;

        const [users] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.json({ message: 'Se o email existir, enviaremos instruções' });
        }

        // Em produção, enviaria email real
        const token = jwt.sign(
            { userId: users[0].id, type: 'password_reset' },
            process.env.JWT_SECRET || 'focusnow_secret',
            { expiresIn: '1h' }
        );

        console.log(`Link de recuperação para ${email}: http://localhost:3000/reset-password?token=${token}`);

        res.json({ message: 'Instruções enviadas para seu email' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar recuperação' });
    }
});

const PORT = process.env.PORT || 3000;
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
});