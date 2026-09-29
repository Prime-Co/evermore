import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const SETTINGS_FILE = path.join(__dirname, 'platform-settings.json');
const ADMINS_FILE = path.join(__dirname, 'admins.json');
const USERS_FILE = path.join(__dirname, 'users.json');

function getUsersFromFile() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (e) {}
  saveUsersToFile([]);
  return [];
}

function saveUsersToFile(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users || [], null, 2), 'utf8');
    return users || [];
  } catch (e) {
    return users || [];
  }
}

const DEFAULT_SETTINGS = {
  bankName: 'KUDA MFB',
  accountNumber: '3004350517',
  accountName: 'VICTORBLOG SERVICES-EVERMORE',
  price: '₦14,850',
  activationFee: '₦14,850',
  telegramLink: 'https://t.me/evermoreai...',
  amount: 14850,
  opayNotification: true,
  updatedAt: new Date().toISOString()
};

const DEFAULT_ADMINS = [
  {
    uid: 'admin_tuniprime01',
    email: 'tuniprime01@gmail.com',
    role: 'superadmin',
    appointedBy: 'Root Owner Clearance',
    createdAt: new Date().toISOString()
  },
  {
    uid: 'admin_mrvictor433',
    email: 'mrvictor433@gmail.com',
    role: 'superadmin',
    appointedBy: 'Root Owner Clearance',
    createdAt: new Date().toISOString()
  }
];

function getAdminsFromFile() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8'));
      if (Array.isArray(data) && data.length > 0) {
        // Ensure root superadmins tuniprime01@gmail.com and mrvictor433@gmail.com are always present
        if (!data.some(a => (a.email || '').toLowerCase() === 'tuniprime01@gmail.com')) {
          data.unshift(DEFAULT_ADMINS[0]);
        }
        if (!data.some(a => (a.email || '').toLowerCase() === 'mrvictor433@gmail.com')) {
          data.splice(1, 0, DEFAULT_ADMINS[1]);
        }
        return data;
      }
    }
  } catch (e) {}
  return DEFAULT_ADMINS;
}

function saveAdminsToFile(admins) {
  try {
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2), 'utf8');
    return admins;
  } catch (e) {
    return admins;
  }
}

function getSettingsFromFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (e) {}
  return DEFAULT_SETTINGS;
}

function saveSettingsToFile(settings) {
  try {
    const rawPrice = settings.price || settings.activationFee;
    let price = rawPrice;
    let amount = settings.amount;
    if (rawPrice) {
      const num = parseInt(String(rawPrice).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        amount = num;
        price = '₦' + num.toLocaleString();
      }
    }
    const current = getSettingsFromFile();
    let opayNotification = current.opayNotification !== false;
    if (typeof settings.opayNotification === 'boolean') {
      opayNotification = settings.opayNotification;
    } else if (typeof settings.showOpayNotification === 'boolean') {
      opayNotification = settings.showOpayNotification;
    } else if (settings.opayNotification !== undefined) {
      opayNotification = String(settings.opayNotification).toLowerCase() === 'true';
    } else if (settings.showOpayNotification !== undefined) {
      opayNotification = String(settings.showOpayNotification).toLowerCase() === 'true';
    }

    const merged = {
      ...current,
      ...settings,
      price: price || current.price,
      activationFee: price || current.activationFee || current.price,
      telegramLink: settings.telegramLink || current.telegramLink || DEFAULT_SETTINGS.telegramLink,
      amount: amount || current.amount,
      opayNotification: opayNotification,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (e) {
    return settings;
  }
}

// API for platform settings
app.get('/api/settings', (req, res) => {
  res.json(getSettingsFromFile());
});

app.post('/api/settings', (req, res) => {
  const updated = saveSettingsToFile(req.body || {});
  res.json({ success: true, settings: updated });
});

// API for permanent admin list management
app.get('/api/admins', (req, res) => {
  res.json(getAdminsFromFile());
});

app.post('/api/admins', (req, res) => {
  const { email, role, uid, appointedBy } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const cleanEmail = email.trim().toLowerCase();
  const admins = getAdminsFromFile();
  const existingIdx = admins.findIndex(a => (a.email || '').toLowerCase() === cleanEmail);
  const newAdmin = {
    uid: uid || ('adm_' + Date.now()),
    email: cleanEmail,
    role: role === 'superadmin' ? 'superadmin' : 'admin',
    appointedBy: appointedBy || 'tuniprime01@gmail.com',
    createdAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    admins[existingIdx] = { ...admins[existingIdx], ...newAdmin, createdAt: admins[existingIdx].createdAt };
  } else {
    admins.push(newAdmin);
  }

  saveAdminsToFile(admins);
  res.json({ success: true, admin: newAdmin, admins });
});

app.delete('/api/admins/:emailOrUid', (req, res) => {
  const target = req.params.emailOrUid.toLowerCase();
  if (
    target === 'tuniprime01@gmail.com' ||
    target === 'admin_tuniprime01' ||
    target === 'mrvictor433@gmail.com' ||
    target === 'admin_mrvictor433'
  ) {
    return res.status(403).json({ error: 'Root superadmin cannot be removed' });
  }
  let admins = getAdminsFromFile();
  admins = admins.filter(a => (a.email || '').toLowerCase() !== target && a.uid !== target);
  saveAdminsToFile(admins);
  res.json({ success: true, admins });
});

// API for platform users & payment receipts
app.get('/api/users', (req, res) => {
  res.json(getUsersFromFile());
});

app.post('/api/users', (req, res) => {
  const user = req.body || {};
  if (!user.email && !user.id) {
    return res.status(400).json({ error: 'User email or ID is required' });
  }
  const users = getUsersFromFile();
  const existingIdx = users.findIndex(u =>
    (user.id && u.id === user.id) ||
    (user.email && (u.email || '').toLowerCase() === (user.email || '').toLowerCase())
  );

  const nowIso = new Date().toISOString();
  const updatedUser = {
    id: user.id || ('usr_' + Date.now()),
    fullName: user.fullName || 'Evermore Member',
    email: (user.email || '').toLowerCase().trim(),
    username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
    phone: user.phone || '',
    country: user.country || 'Nigeria',
    plan: user.plan || 'EVERMORE PREMIUM',
    status: user.status || 'pending_activation',
    referral: user.referral || 'Direct',
    paymentReceipt: user.paymentReceipt || null,
    receiptFileName: user.receiptFileName || (user.paymentReceipt ? 'receipt.jpg' : null),
    receiptUploadedAt: user.receiptUploadedAt || (user.paymentReceipt ? nowIso : null),
    createdAt: user.createdAt || nowIso,
    updatedAt: nowIso
  };

  if (existingIdx >= 0) {
    users[existingIdx] = {
      ...users[existingIdx],
      ...updatedUser,
      createdAt: users[existingIdx].createdAt || updatedUser.createdAt,
      // Preserve receipt if new one not supplied
      paymentReceipt: user.paymentReceipt || users[existingIdx].paymentReceipt,
      receiptFileName: user.receiptFileName || users[existingIdx].receiptFileName,
      receiptUploadedAt: user.receiptUploadedAt || users[existingIdx].receiptUploadedAt
    };
  } else {
    users.unshift(updatedUser);
  }

  saveUsersToFile(users);
  res.json({ success: true, user: updatedUser, users });
});

app.patch('/api/users/:id', (req, res) => {
  const targetId = req.params.id;
  const updates = req.body || {};
  const users = getUsersFromFile();
  const idx = users.findIndex(u => u.id === targetId || (u.email && u.email.toLowerCase() === targetId.toLowerCase()));

  if (idx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  users[idx] = {
    ...users[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveUsersToFile(users);
  res.json({ success: true, user: users[idx] });
});

app.delete('/api/users/:id', (req, res) => {
  const targetId = req.params.id;
  let users = getUsersFromFile();
  users = users.filter(u => u.id !== targetId && (u.email || '').toLowerCase() !== targetId.toLowerCase());
  saveUsersToFile(users);
  res.json({ success: true, users });
});

// Serve static files with html extension support
app.use(express.static(__dirname, {
  extensions: ['html', 'htm']
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Direct route for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Direct route for admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Fallback for 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Evermore static server running on http://${HOST}:${PORT}`);
});
