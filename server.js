// ============================================================================
// PROJETO: MISSÃO CUMPRIDA - Backend API (Node.js + Express)
// ARQUIVO: server.js
// OBJETIVO: Conectar ao MySQL, iniciar o servidor e fornecer as rotas iniciais
// ============================================================================

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // Usando a versão baseada em Promises
const bcrypt = require('bcryptjs'); // Para criptografar senhas
const crypto = require('crypto'); // Nativo do Node para gerar UUIDs

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais
app.use(cors()); // Permite que o app Expo se comunique com a API
app.use(express.json()); // Permite receber dados no formato JSON

// ============================================================================
// 1. CONFIGURAÇÃO DO BANCO DE DADOS (Pool de Conexões)
// Dados configurados para rodar internamente no Easypanel
// ============================================================================
const db = mysql.createPool({
    host: process.env.DB_HOST || 'sites_missaocumprida',
    user: process.env.DB_USER || 'missaocumprida2026',
    password: process.env.DB_PASSWORD || 'Nicol@s08102010',
    database: process.env.DB_NAME || 'missaocumprida',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testa a conexão ao iniciar o servidor
db.getConnection()
    .then(conn => {
        console.log('✅ Conectado ao banco de dados MySQL com sucesso!');
        conn.release(); // Libera a conexão de volta pro pool
    })
    .catch(err => {
        console.error('❌ Erro ao conectar no MySQL:', err.message);
        console.error('Dica: Se estiver testando no PC local, o host "sites_missaocumprida" não funcionará. Use o Host Externo do Easypanel.');
    });

// ============================================================================
// 2. ROTAS DA API
// ============================================================================

// Rota de Health Check (Teste para ver se a API está online)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', mensagem: 'API Missão Cumprida rodando 100%!' });
});

// Primeira Rota Real: Cadastro de Usuário (Cliente ou Prestador)
app.post('/api/usuarios/registrar', async (req, res) => {
    try {
        // Extrai os dados enviados pelo aplicativo (frontend)
        const { tipo, nome, email, telefone, senha, cpf_cnpj, aceitou_termos } = req.body;

        // Validação básica
        if (!tipo || !nome || !email || !senha) {
            return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });
        }

        // 1. Verifica se o e-mail já existe
        const [usuariosExistentes] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (usuariosExistentes.length > 0) {
            return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
        }

        // 2. Criptografa a senha para segurança
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);

        // 3. Gera o UUID para o novo usuário
        const idUsuario = crypto.randomUUID();
        
        // 4. Salva a data do aceite dos termos se for true
        const dataAceiteTermos = aceitou_termos ? new Date() : null;

        // 5. Insere no banco de dados MySQL
        const queryInsert = `
            INSERT INTO usuarios (id, tipo, nome, email, telefone, senha_hash, cpf_cnpj, aceitou_termos, data_aceite_termos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.execute(queryInsert, [
            idUsuario, tipo, nome, email, telefone, senhaHash, cpf_cnpj || null, aceitou_termos || false, dataAceiteTermos
        ]);

        // Retorna sucesso para o app (SEM DEVOLVER A SENHA!)
        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario: {
                id: idUsuario,
                nome,
                email,
                tipo
            }
        });

    } catch (erro) {
        console.error('Erro no cadastro:', erro);
        res.status(500).json({ erro: 'Erro interno no servidor ao tentar cadastrar o usuário.' });
    }
});

// ============================================================================
// 3. INICIALIZAÇÃO DO SERVIDOR
// ============================================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Teste a saúde da API em: http://localhost:${PORT}/health`);
});