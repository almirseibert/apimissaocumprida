const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const verificarToken = require('../middlewares/auth');

// --- Criar uma Avaliação (POST /api/avaliacoes) ---
router.post('/', verificarToken, async (req, res) => {
    try {
        const { pedido_id, avaliado_id, nota, comentario } = req.body;
        const avaliador_id = req.usuario.id;

        if (!pedido_id || !avaliado_id || !nota) {
            return res.status(400).json({ erro: 'Pedido, utilizador avaliado e nota são obrigatórios.' });
        }

        if (nota < 1 || nota > 5) {
            return res.status(400).json({ erro: 'A nota deve ser entre 1 e 5.' });
        }

        // 1. Verifica se o pedido está FINALIZADO
        const [pedidos] = await db.execute('SELECT status FROM pedidos WHERE id = ?', [pedido_id]);
        if (pedidos.length === 0 || pedidos[0].status !== 'FINALIZADO') {
            return res.status(400).json({ erro: 'Só é possível avaliar serviços finalizados.' });
        }

        // 2. Insere a avaliação na base de dados
        const idAvaliacao = crypto.randomUUID();
        const query = `
            INSERT INTO avaliacoes (id, pedido_id, avaliador_id, avaliado_id, nota, comentario)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.execute(query, [idAvaliacao, pedido_id, avaliador_id, avaliado_id, nota, comentario || null]);

        res.status(201).json({ mensagem: 'Avaliação submetida com sucesso!' });

    } catch (erro) {
        console.error('Erro ao submeter avaliação:', erro);
        // Tratamento para erro de "Unique Constraint" (utilizador tentar avaliar duas vezes)
        if (erro.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ erro: 'Já submeteu uma avaliação para este pedido.' });
        }
        res.status(500).json({ erro: 'Erro interno ao submeter a avaliação.' });
    }
});

module.exports = router;