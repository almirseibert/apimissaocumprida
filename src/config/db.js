const mysql = require('mysql2/promise');

// Cria o pool de conexões com os dados do .env
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

// Testa a conexão ao inicializar
db.getConnection()
    .then(conn => {
        console.log('✅ Conectado ao banco de dados MySQL com sucesso (Módulo DB)!');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Erro ao conectar no MySQL:', err.message);
    });

module.exports = db;