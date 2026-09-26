import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

const SETTINGS_FILE = path.join(__dirname, 'platform-settings.json');

const DEFAULT_SETTINGS = {
  bankName: 'HOOD BANK',
  accountNumber: '1234567890',
  accountName: 'YOUR (BIZ) NAME',
  price: '₦14,850',
  activationFee: '₦14,850',
  amount: 14850,
  updatedAt: new Date().toISOString()
};

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
    const merged = {
      ...current,
      ...settings,
      price: price || current.price,
      activationFee: price || current.activationFee || current.price,
      amount: amount || current.amount,
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
