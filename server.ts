import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initDb } from './server/database.ts';
import path from 'path';
import axios from 'axios';
import nodemailer from 'nodemailer';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

async function sendEmail(db: any, to: string, subject: string, html: string) {
  const settings = await db.get('SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_email, smtp_from_name FROM system_settings LIMIT 1');
  
  if (!settings || !settings.smtp_host || !settings.smtp_user || !settings.smtp_pass) {
    console.log(`[MOCK EMAIL] Para: ${to}\nAssunto: ${subject}\nCorpo: ${html}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: settings.smtp_port || 587,
    secure: Boolean(settings.smtp_secure),
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  const from = settings.smtp_from_name 
    ? `"${settings.smtp_from_name}" <${settings.smtp_from_email || settings.smtp_user}>`
    : settings.smtp_from_email || settings.smtp_user;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}

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
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name, cpf } = req.body;
    try {
      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser) return res.status(400).json({ error: 'E-mail já cadastrado.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const confirmationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });

      // Create a new group for this client
      const groupResult = await db.run('INSERT INTO groups (name) VALUES (?)', [`Grupo de ${name}`]);
      const groupId = groupResult.lastID;

      await db.run(
        'INSERT INTO users (email, password, name, cpf, role, group_id, confirmation_token, is_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, name, cpf, 'admin', groupId, confirmationToken, 0]
      );

      // Send confirmation email
      let appUrl = req.headers.origin;
      if (!appUrl || appUrl === 'null') {
        appUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
      }
      const confirmationLink = `${appUrl}/confirm-email?token=${confirmationToken}`;
      
      const emailHtml = `
        <h2>Confirme seu cadastro</h2>
        <p>Olá ${name},</p>
        <p>Obrigado por se cadastrar. Por favor, clique no link abaixo para confirmar seu e-mail e ativar sua conta:</p>
        <p><a href="${confirmationLink}">${confirmationLink}</a></p>
        <p>Se você não solicitou este cadastro, ignore este e-mail.</p>
      `;
      
      await sendEmail(db, email, 'Confirme seu cadastro', emailHtml);

      res.json({ message: 'Cadastro realizado com sucesso. Verifique seu e-mail para confirmar.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.get('/api/auth/confirm/:token', async (req, res) => {
    const { token } = req.params;
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await db.get('SELECT * FROM users WHERE email = ? AND confirmation_token = ?', [decoded.email, token]);
      
      if (!user) return res.status(400).json({ error: 'Token inválido ou expirado.' });
      if (user.is_confirmed) return res.json({ message: 'E-mail já confirmado.' });

      const settings = await db.get('SELECT trial_days FROM system_settings LIMIT 1');
      const trialDays = settings?.trial_days || 0;
      
      let expirationDate = null;
      if (trialDays > 0) {
        const date = new Date();
        date.setDate(date.getDate() + trialDays);
        expirationDate = date.toISOString();
      }

      await db.run('UPDATE users SET is_confirmed = 1, confirmation_token = NULL WHERE id = ?', [user.id]);
      if (expirationDate) {
        await db.run('UPDATE groups SET expiration_date = ? WHERE id = ?', [expirationDate, user.group_id]);
      }

      res.json({ message: 'E-mail confirmado com sucesso! Você já pode fazer login.' });
    } catch (err) {
      res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
  });

  app.post('/api/auth/recover-password', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (user) {
        const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
        await db.run('UPDATE users SET confirmation_token = ? WHERE email = ?', [resetToken, email]);
        
        let appUrl = req.headers.origin;
        if (!appUrl || appUrl === 'null') {
          appUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
        }
        const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
        
        const emailHtml = `
          <h2>Recuperação de Senha</h2>
          <p>Olá ${user.name || 'Usuário'},</p>
          <p>Você solicitou a recuperação de senha. Clique no link abaixo para criar uma nova senha:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>Se você não solicitou a recuperação de senha, ignore este e-mail.</p>
        `;
        
        await sendEmail(db, email, 'Recuperação de Senha', emailHtml);
      }
      // Always return success to prevent email enumeration
      res.json({ message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const user = await db.get('SELECT * FROM users WHERE email = ? AND confirmation_token = ?', [decoded.email, token]);
      
      if (!user) return res.status(400).json({ error: 'Token inválido ou expirado.' });

      const hashedPassword = await bcrypt.hash(password, 10);
      await db.run('UPDATE users SET password = ?, confirmation_token = NULL WHERE id = ?', [hashedPassword, user.id]);

      res.json({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
      res.status(400).json({ error: 'Token inválido ou expirado.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });

      if (user.role !== 'superadmin' && !user.is_confirmed) {
        return res.status(400).json({ error: 'Por favor, confirme seu e-mail antes de fazer login.' });
      }

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
  app.get('/api/payments', authenticateToken, authorizeRole(['superadmin']), async (req: any, res) => {
    try {
      const payments = await db.all(`
        SELECT 
          p.id, 
          p.amount, 
          p.status, 
          p.days, 
          p.payment_method, 
          p.updated_at, 
          g.name as group_name
        FROM payments p
        LEFT JOIN groups g ON p.group_id = g.id
        WHERE p.status = 'approved'
        ORDER BY p.updated_at DESC
      `);
      res.json(payments);
    } catch (err) {
      console.error('Error fetching payments:', err);
      res.status(500).json({ error: 'Erro ao buscar pagamentos.' });
    }
  });

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
      await db.run('INSERT INTO users (email, password, role, group_id, is_confirmed) VALUES (?, ?, ?, ?, ?)', [email, hashedPassword, role, targetGroupId, 1]);
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
      const config = await db.get('SELECT client_id, client_secret, environment, cpf_usuario, template_positive, template_negative FROM groups WHERE id = ?', [req.user.group_id]);
      res.json(config || {});
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.get('/api/config/templates', authenticateToken, async (req: any, res) => {
    try {
      const config = await db.get('SELECT template_positive, template_negative, expiration_date FROM groups WHERE id = ?', [req.user.group_id]);
      res.json(config || {});
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/config', authenticateToken, authorizeRole(['superadmin', 'admin']), async (req: any, res) => {
    const { client_id, client_secret, environment, cpf_usuario, template_positive, template_negative } = req.body;
    try {
      await db.run(
        'UPDATE groups SET client_id = ?, client_secret = ?, environment = ?, cpf_usuario = ?, template_positive = ?, template_negative = ? WHERE id = ?',
        [client_id, client_secret, environment, cpf_usuario, template_positive, template_negative, req.user.group_id]
      );
      res.json({ message: 'Configurações atualizadas com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  // Groups Routes (SuperAdmin)
  app.get('/api/groups', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    try {
      const groups = await db.all(`
        SELECT g.id, g.name, g.environment, g.created_at, g.expiration_date,
        (SELECT email FROM users WHERE group_id = g.id AND role = 'admin' LIMIT 1) as admin_email
        FROM groups g
      `);
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

  app.put('/api/groups/:id/expiration', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    const { expiration_date } = req.body;
    try {
      await db.run('UPDATE groups SET expiration_date = ? WHERE id = ?', [expiration_date, req.params.id]);
      res.json({ message: 'Data de expiração atualizada com sucesso.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  // System Settings Routes (SuperAdmin)
  app.get('/api/system-settings', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    try {
      const settings = await db.get('SELECT * FROM system_settings LIMIT 1');
      res.json(settings || {});
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/system-settings', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    const { 
      mp_access_token, mp_public_key, price_30, price_90, price_180, price_365, trial_days,
      smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_email, smtp_from_name
    } = req.body;
    try {
      await db.run(
        `UPDATE system_settings SET 
          mp_access_token = ?, mp_public_key = ?, price_30 = ?, price_90 = ?, price_180 = ?, price_365 = ?, trial_days = ?,
          smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_pass = ?, smtp_secure = ?, smtp_from_email = ?, smtp_from_name = ?
         WHERE id = 1`,
        [
          mp_access_token, mp_public_key, price_30, price_90, price_180, price_365, trial_days,
          smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure ? 1 : 0, smtp_from_email, smtp_from_name
        ]
      );
      res.json({ message: 'Configurações do sistema atualizadas.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/system-settings/test-email', authenticateToken, authorizeRole(['superadmin']), async (req: any, res) => {
    const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, smtp_from_email, smtp_from_name, test_email_to } = req.body;

    if (!smtp_host || !smtp_user || !smtp_pass) {
      return res.status(400).json({ error: 'Preencha os campos obrigatórios (Host, Usuário e Senha) para testar.' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port || 587,
        secure: Boolean(smtp_secure),
        auth: {
          user: smtp_user,
          pass: smtp_pass,
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      });

      const from = smtp_from_name 
        ? `"${smtp_from_name}" <${smtp_from_email || smtp_user}>`
        : smtp_from_email || smtp_user;

      await transporter.sendMail({
        from,
        to: test_email_to || req.user.email,
        subject: 'Teste de Configuração SMTP - Sistema ONR',
        html: '<p>Este é um e-mail de teste para verificar as configurações SMTP do Sistema ONR.</p><p>Se você recebeu esta mensagem, suas configurações estão corretas!</p>',
      });

      res.json({ message: 'E-mail de teste enviado com sucesso!' });
    } catch (err: any) {
      console.error('Erro ao enviar e-mail de teste:', err);
      res.status(500).json({ error: `Falha ao enviar: ${err.message}` });
    }
  });

  // Database Config Routes (SuperAdmin)
  app.get('/api/db-config', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    try {
      const configPath = path.join(process.cwd(), 'server', 'db-config.json');
      let dbType = 'sqlite';
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.type === 'mysql') dbType = 'mysql';
      }
      res.json({ type: dbType });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao ler configuração do banco de dados.' });
    }
  });

  app.post('/api/db-config', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    const { type } = req.body;
    if (type !== 'sqlite' && type !== 'mysql') {
      return res.status(400).json({ error: 'Tipo de banco de dados inválido.' });
    }
    try {
      const configPath = path.join(process.cwd(), 'server', 'db-config.json');
      fs.writeFileSync(configPath, JSON.stringify({ type }, null, 2));
      res.json({ message: 'Configuração atualizada. Reinicie o servidor para aplicar.' });
    } catch (err) {
      res.status(500).json({ error: 'Erro ao salvar configuração do banco de dados.' });
    }
  });

  app.post('/api/db-migrate', authenticateToken, authorizeRole(['superadmin']), async (req, res) => {
    const { from, to } = req.body;
    if ((from !== 'sqlite' && from !== 'mysql') || (to !== 'sqlite' && to !== 'mysql') || from === to) {
      return res.status(400).json({ error: 'Parâmetros de migração inválidos.' });
    }

    try {
      const { migrateData } = await import('./server/migrate.ts');
      await migrateData(from, to);
      res.json({ message: 'Migração concluída com sucesso.' });
    } catch (err: any) {
      console.error('Migration error:', err);
      res.status(500).json({ error: `Erro na migração: ${err.message}` });
    }
  });

  // Billing Routes
  app.get('/api/billing/plans', authenticateToken, async (req: any, res) => {
    try {
      const settings = await db.get('SELECT mp_public_key, price_30, price_90, price_180, price_365 FROM system_settings LIMIT 1');
      const group = await db.get('SELECT expiration_date FROM groups WHERE id = ?', [req.user.group_id]);
      res.json({
        plans: {
          30: settings?.price_30 || 0,
          90: settings?.price_90 || 0,
          180: settings?.price_180 || 0,
          365: settings?.price_365 || 0
        },
        mp_public_key: settings?.mp_public_key,
        expiration_date: group?.expiration_date
      });
    } catch (err) {
      res.status(500).json({ error: 'Erro no servidor.' });
    }
  });

  app.post('/api/billing/create-preference', authenticateToken, async (req: any, res) => {
    const { days } = req.body;
    if (![30, 90, 180, 365].includes(days)) {
      return res.status(400).json({ error: 'Plano inválido.' });
    }

    try {
      const settings = await db.get('SELECT * FROM system_settings LIMIT 1');
      if (!settings || !settings.mp_access_token) {
        return res.status(400).json({ error: 'Mercado Pago não configurado.' });
      }

      const price = settings[`price_${days}`];
      if (!price || price <= 0) {
        return res.status(400).json({ error: 'Preço não configurado para este plano.' });
      }

      const external_reference = `${req.user.group_id}_${days}_${Date.now()}`;
      
      let appUrl = req.headers.origin;
      if (!appUrl || appUrl === 'null') {
        appUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;
      }
      appUrl = appUrl.replace(/\/$/, '');
      
      const preferenceData: any = {
        items: [
          {
            title: `Licença de ${days} dias - Sistema ONR`,
            quantity: 1,
            unit_price: Number(price),
            currency_id: 'BRL'
          }
        ],
        back_urls: {
          success: `${appUrl}/billing?status=success`,
          failure: `${appUrl}/billing?status=failure`,
          pending: `${appUrl}/billing?status=pending`
        },
        auto_return: 'approved',
        external_reference: external_reference
      };

      if (appUrl.startsWith('https://')) {
        preferenceData.notification_url = `${appUrl}/api/webhooks/mercadopago`;
      }

      console.log('Sending preference to MP:', JSON.stringify(preferenceData, null, 2));

      const mpRes = await axios.post('https://api.mercadopago.com/checkout/preferences', preferenceData, {
        headers: {
          'Authorization': `Bearer ${settings.mp_access_token.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      await db.run(
        'INSERT INTO payments (group_id, mp_preference_id, external_reference, status, days, amount) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.group_id, mpRes.data.id, external_reference, 'pending', days, price]
      );

      res.json({ init_point: mpRes.data.init_point, preference_id: mpRes.data.id });
    } catch (err: any) {
      console.error('Erro ao criar preferência MP:', err.response?.data || err.message);
      const mpError = err.response?.data?.message || err.response?.data?.error || err.message;
      res.status(500).json({ error: `Erro do Mercado Pago: ${mpError}` });
    }
  });

  app.post('/api/billing/verify-payment', authenticateToken, async (req: any, res) => {
    const { payment_id, external_reference } = req.body;
    
    if (!payment_id || !external_reference) {
      return res.status(400).json({ error: 'Dados inválidos.' });
    }

    try {
      const settings = await db.get('SELECT mp_access_token FROM system_settings LIMIT 1');
      if (!settings || !settings.mp_access_token) {
        return res.status(400).json({ error: 'Mercado Pago não configurado.' });
      }

      const mpRes = await axios.get(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
        headers: { 'Authorization': `Bearer ${settings.mp_access_token}` }
      });

      const paymentData = mpRes.data;
      const status = paymentData.status;
      const paymentExternalRef = paymentData.external_reference;
      const paymentMethod = paymentData.payment_method_id || 'N/A';

      if (paymentExternalRef !== external_reference) {
        return res.status(400).json({ error: 'Referência externa não confere.' });
      }

      const [groupIdStr, daysStr] = external_reference.split('_');
      const groupId = parseInt(groupIdStr);
      const days = parseInt(daysStr);

      if (groupId !== req.user.group_id) {
        return res.status(403).json({ error: 'Acesso negado.' });
      }

      // Update payment record
      const updateRes = await db.run(
        'UPDATE payments SET status = ?, mp_payment_id = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE external_reference = ? AND status = "pending"',
        [status, payment_id, paymentMethod, external_reference]
      );

      if (status === 'approved' && updateRes.changes && updateRes.changes > 0) {
        // Add days to group's expiration_date
        const group = await db.get('SELECT expiration_date FROM groups WHERE id = ?', [groupId]);
        let newExpiration = new Date();
        
        if (group && group.expiration_date) {
          const currentExpiration = new Date(group.expiration_date);
          if (currentExpiration > newExpiration) {
            newExpiration = currentExpiration;
          }
        }
        
        newExpiration.setDate(newExpiration.getDate() + days);
        
        await db.run(
          'UPDATE groups SET expiration_date = ? WHERE id = ?',
          [newExpiration.toISOString(), groupId]
        );
        
        return res.json({ status: 'approved', expiration_date: newExpiration.toISOString() });
      }

      // If already processed or not approved
      const group = await db.get('SELECT expiration_date FROM groups WHERE id = ?', [groupId]);
      res.json({ status, expiration_date: group?.expiration_date });
    } catch (err) {
      console.error('Verify payment error:', err);
      res.status(500).json({ error: 'Erro ao verificar pagamento.' });
    }
  });

  // Webhook Mercado Pago
  app.post('/api/webhooks/mercadopago', async (req, res) => {
    const action = req.body.action || req.query.topic || req.query.action;
    const type = req.body.type || req.query.type;
    const dataId = req.body.data?.id || req.query['data.id'] || req.query.id;
    
    // Always return 200 OK to Mercado Pago immediately
    res.status(200).send('OK');

    if (type === 'payment' || action === 'payment' || action === 'payment.created' || action === 'payment.updated') {
      try {
        const paymentId = dataId;
        if (!paymentId) return;

        const settings = await db.get('SELECT mp_access_token FROM system_settings LIMIT 1');
        if (!settings || !settings.mp_access_token) return;

        const mpRes = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${settings.mp_access_token}` }
        });

        const paymentData = mpRes.data;
        const external_reference = paymentData.external_reference;
        const status = paymentData.status;
        const paymentMethod = paymentData.payment_method_id || 'N/A';

        if (!external_reference) return;

        const [groupIdStr, daysStr] = external_reference.split('_');
        const groupId = parseInt(groupIdStr);
        const days = parseInt(daysStr);

        // Update payment record
        const updateRes = await db.run(
          'UPDATE payments SET status = ?, mp_payment_id = ?, payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE external_reference = ? AND status = "pending"',
          [status, paymentId, paymentMethod, external_reference]
        );

        if (status === 'approved' && updateRes.changes && updateRes.changes > 0) {
          // Add days to group's expiration_date
          const group = await db.get('SELECT expiration_date FROM groups WHERE id = ?', [groupId]);
          let newExpiration = new Date();
          
          if (group && group.expiration_date) {
            const currentExpiration = new Date(group.expiration_date);
            if (currentExpiration > newExpiration) {
              newExpiration = currentExpiration;
            }
          }
          
          newExpiration.setDate(newExpiration.getDate() + days);
          
          await db.run(
            'UPDATE groups SET expiration_date = ? WHERE id = ?',
            [newExpiration.toISOString(), groupId]
          );
        }
      } catch (err) {
        console.error('Webhook processing error:', err);
      }
    }
  });

  // History Routes
  app.get('/api/history', authenticateToken, async (req: any, res) => {
    try {
      const search = req.query.search ? `%${req.query.search}%` : null;
      let query = 'SELECT history.*, users.name as user_name, users.email as user_email FROM history JOIN users ON history.user_id = users.id WHERE ';
      const params: any[] = [];

      if (req.user.role === 'admin') {
        query += 'history.group_id = ? AND users.role != "superadmin"';
        params.push(req.user.group_id);
      } else if (req.user.role === 'superadmin') {
        query += '1=1'; // Superadmin sees all
      } else {
        query += 'history.user_id = ?';
        params.push(req.user.id);
      }

      if (search) {
        query += ' AND (history.documento LIKE ? OR history.nome_razao LIKE ? OR history.nome LIKE ? OR history.documento_usuario LIKE ?)';
        params.push(search, search, search, search);
      }

      query += ' ORDER BY history.created_at DESC LIMIT 100';
      
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
      if (err.response?.data?.error === 'invalid_client') {
        throw new Error('Credenciais inválidas (invalid_client). Verifique se o Client ID e Client Secret estão corretos nas configurações.');
      }
      throw err;
    }
  };

  const getBaseUrl = () => {
    return 'https://serventia-api.onr.org.br';
  };

  app.post('/api/onr/consultar', authenticateToken, async (req: any, res) => {
    try {
      // Check expiration
      const group = await db.get('SELECT expiration_date FROM groups WHERE id = ?', [req.user.group_id]);
      if (req.user.role !== 'superadmin' && group && group.expiration_date) {
        const expDate = new Date(group.expiration_date);
        if (expDate < new Date()) {
          return res.status(403).json({ error: 'Sua licença expirou. Por favor, renove sua assinatura para continuar utilizando o sistema.' });
        }
      }

      const { token, config } = await getOnrToken(req.user.group_id);
      const baseUrl = getBaseUrl();
      
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
      const baseUrl = getBaseUrl();
      
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
      const baseUrl = getBaseUrl();
      
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
      const baseUrl = getBaseUrl();
      
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
