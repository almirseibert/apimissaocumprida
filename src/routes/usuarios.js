const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db'); // Importa a conexão com o banco

// --- Rota de Cadastro de Usuário (POST /api/usuarios/registrar) ---
router.post('/registrar', async (req, res) => {
    try {
        const { tipo, nome, email, telefone, senha, cpf_cnpj, aceitou_termos } = req.body;

        if (!tipo || !nome || !email || !senha) {
            return res.status(400).json({ erro: 'Campos obrigatórios faltando.' });
        }

        const [usuariosExistentes] = await db.execute('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (usuariosExistentes.length > 0) {
            return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senha, salt);
        const idUsuario = crypto.randomUUID();
        const dataAceiteTermos = aceitou_termos ? new Date() : null;

        const queryInsert = `
            INSERT INTO usuarios (id, tipo, nome, email, telefone, senha_hash, cpf_cnpj, aceitou_termos, data_aceite_termos)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await db.execute(queryInsert, [
            idUsuario, tipo, nome, email, telefone, senhaHash, cpf_cnpj || null, aceitou_termos || false, dataAceiteTermos
        ]);

        res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            usuario: { id: idUsuario, nome, email, tipo }
        });

    } catch (erro) {
        console.error('Erro no cadastro:', erro);
        res.status(500).json({ erro: 'Erro interno no servidor ao tentar cadastrar o usuário.' });
    }
});

// --- Rota de Login de Usuário (POST /api/usuarios/login) ---
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ erro: 'Email e palavra-passe são obrigatórios.' });
        }

        const [usuarios] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        
        if (usuarios.length === 0) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
        
        if (!senhaValida) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const token = jwt.sign(
            { id: usuario.id, tipo: usuario.tipo },
            process.env.JWT_SECRET,
            { expiresIn: '7d' } 
        );

        res.status(200).json({
            mensagem: 'Login efetuado com sucesso!',
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, tipo: usuario.tipo }
        });

    } catch (erro) {
        console.error('Erro no login:', erro);
        res.status(500).json({ erro: 'Erro interno no servidor ao tentar fazer login.' });
    }
});

module.exports = router;