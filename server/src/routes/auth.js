const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

const DEFAULT_ICON = 'quill';
const ALLOWED_ICONS = new Set(['quill', 'candle', 'scroll', 'pen', 'key', 'heart', 'coffee', 'moon']);
const APP_SERVICES_APP_ID = String(process.env.APP_SERVICES_APP_ID || '').trim();
const APP_SERVICES_BASE_URL = String(process.env.APP_SERVICES_BASE_URL || 'https://services.cloud.mongodb.com')
  .trim()
  .replace(/\/$/, '');

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizeIcon(icon = DEFAULT_ICON) {
  const normalized = String(icon).trim().toLowerCase();
  return ALLOWED_ICONS.has(normalized) ? normalized : DEFAULT_ICON;
}

function normalizeProviders(user) {
  const providers = new Set(Array.isArray(user.authProviders) ? user.authProviders : []);

  if (user.passwordHash) {
    providers.add('password');
  }

  if (providers.size === 0) {
    providers.add('password');
  }

  user.authProviders = Array.from(providers);
  return user.authProviders;
}

function ensureProvider(user, provider) {
  normalizeProviders(user);

  if (!user.authProviders.includes(provider)) {
    user.authProviders.push(provider);
  }
}

function buildProfile(user) {
  const fallbackEmail = user.email || user.username || '';
  const fallbackName = user.displayName || fallbackEmail.split('@')[0] || 'Guest';
  const authProviders = normalizeProviders(user);

  return {
    id: user._id,
    email: fallbackEmail,
    displayName: fallbackName,
    icon: normalizeIcon(user.icon),
    authProviders
  };
}

function buildToken(user) {
  return jwt.sign(
    {
      _id: user._id,
      email: user.email || user.username,
      displayName: user.displayName || user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function handleAuthError(res, err) {
  if (err?.code === 11000) {
    return res.status(400).json({ error: 'Esse email ja esta em uso.' });
  }

  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: 'Os dados enviados sao invalidos.' });
  }

  console.error('Auth route error:', err);
  return res.status(500).json({
    error: 'Erro no servidor',
    details: err?.message || 'Sem detalhes adicionais.'
  });
}

function decodeJwtPayload(token) {
  const [, payloadSegment] = String(token || '').split('.');

  if (!payloadSegment) {
    throw new Error('Token do Google invalido.');
  }

  const normalized = payloadSegment
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(payloadSegment.length / 4) * 4, '=');

  return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
}

async function loginWithAppServicesGoogle(idToken) {
  if (!APP_SERVICES_APP_ID) {
    throw new Error('APP_SERVICES_APP_ID nao configurado.');
  }

  const response = await fetch(
    `${APP_SERVICES_BASE_URL}/api/client/v2.0/app/${APP_SERVICES_APP_ID}/auth/providers/oauth2-google/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ id_token: idToken })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const reason = [data.error, data.error_code, data.details].filter(Boolean).join(': ');
    const error = new Error(reason || 'Falha ao autenticar no MongoDB App Services.');
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    const displayName = String(req.body.displayName || email.split('@')[0] || '').trim();
    const icon = normalizeIcon(req.body.icon);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios.' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username: email }]
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (existingUser) {
      existingUser.email = email;
      existingUser.username = email;
      existingUser.displayName = existingUser.displayName || displayName;
      existingUser.icon = normalizeIcon(existingUser.icon || icon);
      existingUser.passwordHash = existingUser.passwordHash || passwordHash;
      ensureProvider(existingUser, 'password');

      await existingUser.save();

      const token = buildToken(existingUser);
      return res.status(200).json({
        token,
        user: buildProfile(existingUser),
        message: 'Conta existente encontrada e vinculada ao login por senha.'
      });
    }

    const newUser = new User({
      email,
      username: email,
      displayName,
      authProviders: ['password'],
      icon,
      passwordHash
    });

    await newUser.save();

    const token = buildToken(newUser);
    res.status(201).json({ token, user: buildProfile(newUser) });
  } catch (err) {
    handleAuthError(res, err);
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email || req.body.username);
    const password = req.body.password || '';

    const user = await User.findOne({
      $or: [{ email }, { username: email }]
    });

    if (!user) {
      return res.status(400).json({ error: 'Email ou senha incorretos.' });
    }

    normalizeProviders(user);

    if (!user.passwordHash) {
      return res.status(400).json({
        error: 'Essa conta ainda nao tem senha vinculada. Entre pelo login automatico e depois adicione uma senha.'
      });
    }

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) {
      return res.status(400).json({ error: 'Email ou senha incorretos.' });
    }

    if (!user.email) {
      user.email = normalizeEmail(user.username);
    }

    user.username = user.email;
    user.displayName = String(user.displayName || user.email.split('@')[0] || '').trim();
    user.icon = normalizeIcon(user.icon);
    ensureProvider(user, 'password');

    await user.save();

    const token = buildToken(user);
    res.json({ token, user: buildProfile(user) });
  } catch (err) {
    handleAuthError(res, err);
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }

    res.json({ user: buildProfile(user) });
  } catch (err) {
    handleAuthError(res, err);
  }
});

router.post('/google', async (req, res) => {
  try {
    if (!APP_SERVICES_APP_ID) {
      return res.status(500).json({
        error: 'Google login nao configurado.',
        details: 'Defina APP_SERVICES_APP_ID no servidor e habilite o provider Google no MongoDB App Services.'
      });
    }

    const credential = String(req.body.credential || '').trim();

    if (!credential) {
      return res.status(400).json({ error: 'Token do Google nao enviado.' });
    }

    const appServicesAuth = await loginWithAppServicesGoogle(credential);
    const payload = decodeJwtPayload(credential);

    if (!payload?.sub || !payload?.email) {
      return res.status(400).json({ error: 'Nao foi possivel validar a conta Google.' });
    }

    const email = normalizeEmail(payload.email);
    const googleId = String(payload.sub);
    const displayName = String(payload.name || email.split('@')[0] || '').trim();
    const appServicesUserId = String(appServicesAuth.user_id || appServicesAuth.userId || '').trim();

    const googleLookup = [{ googleId }, { email }, { username: email }];

    if (appServicesUserId) {
      googleLookup.unshift({ appServicesUserId });
    }

    let user = await User.findOne({
      $or: googleLookup
    });

    if (!user) {
      user = new User({
        email,
        username: email,
        displayName,
        googleId,
        appServicesUserId: appServicesUserId || undefined,
        authProviders: ['google'],
        icon: DEFAULT_ICON,
        passwordHash: null
      });
    } else {
      user.email = user.email || email;
      user.username = user.email || email;
      user.displayName = user.displayName || displayName;
      user.googleId = googleId;
      if (appServicesUserId) {
        user.appServicesUserId = appServicesUserId;
      }
      user.icon = normalizeIcon(user.icon || DEFAULT_ICON);
      ensureProvider(user, 'google');
    }

    await user.save();

    const token = buildToken(user);
    res.json({
      token,
      user: buildProfile(user),
      message: 'Conta Google conectada com sucesso.'
    });
  } catch (err) {
    if (err?.statusCode === 401 || err?.statusCode === 400) {
      return res.status(401).json({
        error: 'Nao foi possivel autenticar com o Google no MongoDB App Services.',
        details: 'Verifique se o provider Google esta habilitado com OpenID Connect e se o Client ID usado no front e o mesmo configurado no App Services.'
      });
    }

    handleAuthError(res, err);
  }
});

router.put('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }

    const nextEmail = normalizeEmail(req.body.email || user.email || user.username);
    const nextDisplayName = String(req.body.displayName || '').trim();
    const nextIcon = normalizeIcon(req.body.icon);
    const nextPassword = req.body.password || '';

    if (!nextEmail) {
      return res.status(400).json({ error: 'Email e obrigatorio.' });
    }

    const duplicate = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ email: nextEmail }, { username: nextEmail }]
    });

    if (duplicate) {
      return res.status(400).json({ error: 'Esse email ja esta em uso.' });
    }

    user.email = nextEmail;
    user.username = nextEmail;
    user.displayName = nextDisplayName || nextEmail.split('@')[0];
    user.icon = nextIcon;
    normalizeProviders(user);

    if (nextPassword) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(nextPassword, salt);
      ensureProvider(user, 'password');
    }

    await user.save();

    const token = buildToken(user);
    res.json({ token, user: buildProfile(user) });
  } catch (err) {
    handleAuthError(res, err);
  }
});

module.exports = router;
