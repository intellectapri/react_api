/**
 * Database connection (application-wide singleton)
 */

const mysql = require("mysql2");
let _pool = false;

const init = () => {
    if (!_pool) {
        _pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }
};

const get = () => {
    if (!_pool) throw new Error(`Database has not been initialized yet`);
    return _pool;
};

const end = (cb) => {
    if (!_pool) throw new Error(`Database has not been initialized yet`);
    _pool.end(cb);
};

module.exports = { get, init, end };