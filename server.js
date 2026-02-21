// ============================================================================
// PROJETO: MISSÃO CUMPRIDA - Backend API (Node.js + Express)
// ARQUIVO: server.js
// OBJETIVO: Ponto de entrada da aplicação, super enxuto e modular.
// ============================================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importação das rotas modularizadas
const usuariosRoutes = require('./src/routes/usuarios');
const categoriasRoutes = require('./src/routes/categorias');
const pedidosRoutes = require('./src/routes/pedidos');
const avaliacoesRoutes = require('./src/routes/avaliacoes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares Globais
app.use(cors()); // Permite que o app Expo se comunique com a API
app.use(express.json()); // Permite receber dados no formato JSON

// ============================================================================
// ROTAS DA API
// ============================================================================

// Rota de Health Check (Teste de Saúde da API)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', mensagem: 'API Missão Cumprida rodando 100% e modularizada!' });
});

// Aplicação das rotas importadas
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);

// ============================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Teste a saúde da API em: http://localhost:${PORT}/health`);
});