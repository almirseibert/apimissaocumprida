const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const verificarToken = require('../middlewares/auth');

// --- 1. Criar um Pedido de Serviço (POST /api/pedidos) ---
router.post('/', verificarToken, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'CLIENTE') return res.status(403).json({ erro: 'Apenas clientes podem solicitar serviços.' });

        const { categoria_id, descricao_problema, tamanho_estimado, tempo_estimado_horas, endereco_texto, endereco_lat, endereco_lng } = req.body;

        if (!categoria_id || !descricao_problema || !endereco_texto) return res.status(400).json({ erro: 'Categoria, descrição e endereço são obrigatórios.' });

        const [categorias] = await db.execute('SELECT valor_minimo_base, taxa_plataforma_percentual FROM categorias_servico WHERE id = ?', [categoria_id]);
        if (categorias.length === 0) return res.status(404).json({ erro: 'Categoria de serviço inválida.' });

        const categoria = categorias[0];
        const valor_servico = parseFloat(categoria.valor_minimo_base); 
        const valor_taxa_app = valor_servico * (parseFloat(categoria.taxa_plataforma_percentual) / 100);
        const valor_total = valor_servico + valor_taxa_app;
        const idPedido = crypto.randomUUID();

        const queryInsert = `
            INSERT INTO pedidos (
                id, cliente_id, categoria_id, descricao_problema, tamanho_estimado, tempo_estimado_horas, 
                endereco_texto, endereco_lat, endereco_lng, valor_servico, valor_taxa_app, valor_total, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ABERTO')
        `;

        await db.execute(queryInsert, [
            idPedido, req.usuario.id, categoria_id, descricao_problema, tamanho_estimado || null, tempo_estimado_horas || null, 
            endereco_texto, endereco_lat || null, endereco_lng || null, valor_servico, valor_taxa_app, valor_total
        ]);

        res.status(201).json({ mensagem: 'Pedido publicado com sucesso!', pedido_id: idPedido });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro interno ao publicar o pedido.' });
    }
});

// --- 2. Listar Pedidos em Aberto (GET /api/pedidos/abertos) ---
router.get('/abertos', verificarToken, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'PRESTADOR') return res.status(403).json({ erro: 'Acesso negado.' });

        const query = `
            SELECT p.id, p.descricao_problema, p.tamanho_estimado, p.tempo_estimado_horas,
                   p.endereco_texto, p.valor_servico, p.criado_em, c.nome AS categoria_nome, u.nome AS cliente_nome
            FROM pedidos p
            JOIN categorias_servico c ON p.categoria_id = c.id
            JOIN usuarios u ON p.cliente_id = u.id
            WHERE p.status = 'ABERTO' ORDER BY p.criado_em DESC
        `;
        const [pedidosAbertos] = await db.execute(query);
        res.status(200).json(pedidosAbertos);
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao buscar pedidos.' });
    }
});

// --- 3. Aceitar um Pedido (POST /api/pedidos/:id/aceitar) ---
router.post('/:id/aceitar', verificarToken, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'PRESTADOR') return res.status(403).json({ erro: 'Acesso negado.' });

        const [resultado] = await db.execute(
            `UPDATE pedidos SET status = 'AGUARDANDO_PAGAMENTO', prestador_id = ? WHERE id = ? AND status = 'ABERTO'`,
            [req.usuario.id, req.params.id]
        );

        if (resultado.affectedRows === 0) return res.status(409).json({ erro: 'Pedido já não está disponível.' });
        res.status(200).json({ mensagem: 'Pedido aceite! Aguarde o pagamento do cliente.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao aceitar pedido.' });
    }
});

// --- 4. Simular Pagamento do Cliente (POST /api/pedidos/:id/pagar) ---
// Em produção, isto seria um Webhook do Mercado Pago
router.post('/:id/pagar', verificarToken, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'CLIENTE') return res.status(403).json({ erro: 'Acesso negado.' });

        const [resultado] = await db.execute(
            `UPDATE pedidos SET status = 'PAGO_RETIDO', mp_status_pagamento = 'approved' WHERE id = ? AND cliente_id = ? AND status = 'AGUARDANDO_PAGAMENTO'`,
            [req.params.id, req.usuario.id]
        );

        if (resultado.affectedRows === 0) return res.status(400).json({ erro: 'Não foi possível processar o pagamento.' });
        res.status(200).json({ mensagem: 'Pagamento retido com sucesso! O prestador já tem acesso ao seu endereço.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao processar pagamento.' });
    }
});

// --- 5. Prestador Inicia o Serviço (POST /api/pedidos/:id/iniciar) ---
router.post('/:id/iniciar', verificarToken, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'PRESTADOR') return res.status(403).json({ erro: 'Acesso negado.' });

        const [resultado] = await db.execute(
            `UPDATE pedidos SET status = 'EM_EXECUCAO' WHERE id = ? AND prestador_id = ? AND status = 'PAGO_RETIDO'`,
            [req.params.id, req.usuario.id]
        );

        if (resultado.affectedRows === 0) return res.status(400).json({ erro: 'Não foi possível iniciar o serviço.' });
        res.status(200).json({ mensagem: 'Serviço iniciado!' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao iniciar serviço.' });
    }
});

// --- 6. Prestador Conclui o Serviço (POST /api/pedidos/:id/concluir) ---
router.post('/:id/concluir', verificarToken, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'PRESTADOR') return res.status(403).json({ erro: 'Acesso negado.' });

        const [resultado] = await db.execute(
            `UPDATE pedidos SET status = 'CONCLUIDO_PRESTADOR' WHERE id = ? AND prestador_id = ? AND status = 'EM_EXECUCAO'`,
            [req.params.id, req.usuario.id]
        );

        if (resultado.affectedRows === 0) return res.status(400).json({ erro: 'Não foi possível concluir o serviço.' });
        res.status(200).json({ mensagem: 'Serviço marcado como concluído. A aguardar aprovação do cliente.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao concluir serviço.' });
    }
});

// --- 7. Cliente Aprova e Finaliza o Serviço (POST /api/pedidos/:id/aprovar) ---
// Aqui o dinheiro seria libertado (Split) para a conta do prestador
router.post('/:id/aprovar', verificarToken, async (req, res) => {
    try {
        if (req.usuario.tipo !== 'CLIENTE') return res.status(403).json({ erro: 'Acesso negado.' });

        const [resultado] = await db.execute(
            `UPDATE pedidos SET status = 'FINALIZADO' WHERE id = ? AND cliente_id = ? AND status = 'CONCLUIDO_PRESTADOR'`,
            [req.params.id, req.usuario.id]
        );

        if (resultado.affectedRows === 0) return res.status(400).json({ erro: 'Não foi possível finalizar o serviço.' });
        
        // TODO: Chamar API do Mercado Pago para libertar o dinheiro (Split)
        
        res.status(200).json({ mensagem: 'Serviço finalizado! O pagamento foi libertado para o prestador. Por favor, avalie o serviço.' });
    } catch (erro) {
        res.status(500).json({ erro: 'Erro ao finalizar serviço.' });
    }
});

module.exports = router;