const express = require('express');
const mysql = require('mysql2/promise');

const PORT = 3000;
const DB_CONFIG = {
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'appdb',
};

async function main() {
  // [핵심] 앱 시작 시점에 DB에 "즉시" 연결을 시도한다.
  // 재시도(retry) 로직이 없으므로, DB가 아직 준비되지 않았다면
  // ECONNREFUSED 에러와 함께 아래 catch로 떨어져 프로세스가 종료된다.
  console.log(`[app] DB 연결 시도 -> ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('[app] DB 연결 성공!');

  const app = express();

  app.get('/health', async (req, res) => {
    try {
      await conn.query('SELECT 1');
      res.json({ status: 'ok', db: 'connected' });
    } catch (err) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.listen(PORT, () => {
    console.log(`[app] 서버 시작: http://localhost:${PORT}/health`);
  });
}

main().catch((err) => {
  console.error('[app] DB 연결 실패:', err.code || err.message);
  console.error('[app] 프로세스를 종료합니다. (exit code 1)');
  process.exit(1);
});
