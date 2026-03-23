import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDb } from './server/database.js';
import path from 'path';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const db = await initDb();

  // Middleware to authenticate token
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Middleware to check roles
  const authorizeRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }
      next();
    };
  };

  // Auth Routes
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Senha incorreta.' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, group_id: user.group_id }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, email: user.email, role: user.role, group_id: user.group_id } });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/auth/change-password', authenticateToken, async (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      const validPassword = await bcrypt.compare(oldPassword, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Senha atual incorreta.' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
      res.json({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  // User Management Routes (SuperAdmin/Admin)
  app.get('/api/users', authenticateToken, authorizeRole(['superadmin', 'admin']), async (req: any, res) => {
    try {
      let users;
      if (req.user.role === 'superadmin') {
        users = await db.all('SELECT users.id, users.email, users.role, users.created_at, users.group_id, groups.name as group_name FROM users LEFT JOIN groups ON users.group_id = groups.id');
      } else {
        users = await db.all('SELECT id, email, role, created_at, group_id FROM users WHERE role = "user" AND group_id = ?', [req.user.group_id]);
      }
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/users', authenticateToken, authorizeRole(['superadmin', 'admin']), async (req: any, res) => {
    const { email, password, role, group_id } = req.body;
    try {
      if (req.user.role === 'admin' && role !== 'user') {
        return res.status(403).json({ error: 'Admins só podem criar usuários normais.' });
      }
      
      const targetGroupId = req.user.role === 'superadmin' ? (group_id || 1) : req.user.group_id;

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run('INSERT INTO users (email, password, role, group_id) VALUES (?, ?, ?, ?)', [email, hashedPassword, role, targetGroupId]);
      res.json({ message: 'Usuário criado com sucesso.' });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.delete('/api/users/:id', authenticateToken, authorizeRole(['superadmin', 'admin']), async (req: any, res) => {
    try {
      const targetUser = await db.get('SELECT role, group_id FROM users WHERE id = ?', [req.params.id]);
      if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado.' });

      if (req.user.role === 'admin') {
        if (targetUser.role !== 'user') return res.status(403).json({ error: 'Admins só podem deletar usuários normais.' });
        if (targetUser.group_id !== req.user.group_id) return res.status(403).json({ error: 'Usuário pertence a outro grupo.' });
      }
      
      if (targetUser.role === 'superadmin') {
        return res.status(403).json({ error: 'Não é possível deletar o superadmin.' });
      }

      await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ message: 'Usuário deletado com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  // Config Routes (Admin/SuperAdmin)
  app.get('/api/config', authenticateToken, authorizeRole(['superadmin', 'admin']), async (req: any, res) => {
    try {
      const config = await db.get('SELECT client_id, client_secret, environment, cpf_usuario FROM groups WHERE id = ?', [req.user.group_id]);
      res.json(config || {});
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/config', authenticateToken, authorizeRole(['superadmin', 'admin']), async (req: any, res) => {
    const { client_id, client_secret, environment, cpf_usuario } = req.body;
    try {
      await db.run(
        'UPDATE groups SET client_id = ?, client_secret = ?, environment = ?, cpf_usuario = ? WHERE id = ?',
        [client_id, client_secret, environment, cpf_usuario, req.user.group_id]
      );
      res.json({ message: 'Configurações atualizadas com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  // Groups Routes (SuperAdmin)
  app.get('/api/groups', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    try {
      const groups = await db.all('SELECT id, name, environment, created_at FROM groups');
      res.json(groups);
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/groups', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    const { name } = req.body;
    try {
      await db.run('INSERT INTO groups (name) VALUES (?)', [name]);
      res.json({ message: 'Grupo criado com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  // History Routes
  app.get('/api/history', authenticateToken, async (req: any, res) => {
    try {
      const search = req.query.search ? `%${req.query.search}%` : null;
      let query = 'SELECT * FROM history WHERE ';
      const params: any[] = [];

      if (req.user.role === 'admin') {
        query += 'group_id = ?';
        params.push(req.user.group_id);
      } else if (req.user.role === 'superadmin') {
        query += '1=1'; // Superadmin sees all
      } else {
        query += 'user_id = ?';
        params.push(req.user.id);
      }

      if (search) {
        query += ' AND (documento LIKE ? OR nome_razao LIKE ? OR nome LIKE ? OR documento_usuario LIKE ?)';
        params.push(search, search, search, search);
      }

      query += ' ORDER BY created_at DESC LIMIT 100';
      
      const history = await db.all(query, params);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  // ONR API Proxy Routes (Normal Users)
  const getOnrToken = async (groupId: number) => {
    const config = await db.get('SELECT * FROM groups WHERE id = ?', [groupId]);
    if (!config || !config.client_id || !config.client_secret) {
      throw new Error('Configurações do ONR não definidas para este grupo.');
    }

    const authUrl = 'https://auth.id.onr.org.br/connect/token';

    try {
      const response = await axios.post(authUrl, new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.client_id,
        client_secret: config.client_secret,
        scope: 'cnib-serventia-api'
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      return { token: response.data.access_token, config };
    } catch (err: any) {
      console.error('ONR Auth API Error:', err.response?.data || err.message);
      throw err;
    }
  };

  const getBaseUrl = (env: string) => {
    return env === 'prod' ? 'https://serventia-api.onr.org.br' : 'https://stg-serventia-api.onr.org.br';
  };

  app.post('/api/onr/consultar', authenticateToken, async (req: any, res) => {
    try {
      const { token, config } = await getOnrToken(req.user.group_id);
      const baseUrl = getBaseUrl(config.environment);
      
      const payload = {
        ...req.body,
        cpf_usuario: config.cpf_usuario?.replace(/\D/g, '')
      };

      const response = await axios.post(`${baseUrl}/api/ordem/consultar`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Save history if success
      if (response.data && response.data.success && response.data.data) {
        const d = response.data.data;
        const u = d.dados_usuario || {};
        await db.run(`
          INSERT INTO history (
            user_id, group_id, documento, nome_razao, indisponivel, qtd_ordens, 
            protocolos, hash, data, nome, documento_usuario, organizacao, filtros
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          req.user.id,
          req.user.group_id,
          d.documento,
          d.nomeRazao,
          d.indisponivel ? 1 : 0,
          d.qtdOrdens,
          JSON.stringify(d.protocolos || []),
          u.hash,
          u.data,
          u.nome,
          u.documento,
          u.organizacao,
          JSON.stringify(u.filtros || null)
        ]);
      }

      res.json(response.data);
    } catch (err: any) {
      console.error('ONR API Error (/consultar):', err.response?.data || err.message);
      res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
  });

  app.post('/api/onr/responder', authenticateToken, async (req: any, res) => {
    try {
      const { token, config } = await getOnrToken(req.user.group_id);
      const baseUrl = getBaseUrl(config.environment);
      
      const payload = {
        ...req.body,
        cpf_usuario: config.cpf_usuario?.replace(/\D/g, '')
      };

      const response = await axios.post(`${baseUrl}/api/ordem/responder`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      res.json(response.data);
    } catch (err: any) {
      res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
  });

  app.post('/api/onr/responder/lista', authenticateToken, async (req: any, res) => {
    try {
      const { token, config } = await getOnrToken(req.user.group_id);
      const baseUrl = getBaseUrl(config.environment);
      
      const payload = {
        ...req.body,
        cpf_usuario: config.cpf_usuario?.replace(/\D/g, '')
      };

      const response = await axios.post(`${baseUrl}/api/ordem/responder/lista`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      res.json(response.data);
    } catch (err: any) {
      res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
  });

  app.post('/api/onr/documentos/tipos', authenticateToken, async (req: any, res) => {
    try {
      const { token, config } = await getOnrToken(req.user.group_id);
      const baseUrl = getBaseUrl(config.environment);
      
      const response = await axios.post(`${baseUrl}/api/documentos/tipos`, req.body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      res.json(response.data);
    } catch (err: any) {
      res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
