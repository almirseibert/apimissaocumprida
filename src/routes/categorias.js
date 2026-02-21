const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- Rota para Listar Categorias (GET /api/categorias) ---
router.get('/', async (req, res) => {
    try {
        const [categorias] = await db.execute('SELECT * FROM categorias_servico WHERE ativo = TRUE');
        res.status(200).json(categorias);
    } catch (erro) {
        console.error('Erro ao buscar categorias:', erro);
        res.status(500).json({ erro: 'Erro ao carregar o catálogo de serviços.' });
    }
});

module.exports = router;