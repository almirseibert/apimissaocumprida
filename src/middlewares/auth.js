const jwt = require('jsonwebtoken');

// Middleware para proteger as rotas
const verificarToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(403).json({ erro: 'Acesso negado. Token não fornecido.' });
    }

    try {
        const tokenLimpo = token.replace('Bearer ', '');
        const verificado = jwt.verify(tokenLimpo, process.env.JWT_SECRET);
        
        req.usuario = verificado; 
        next(); 
    } catch (erro) {
        res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
};

module.exports = verificarToken;