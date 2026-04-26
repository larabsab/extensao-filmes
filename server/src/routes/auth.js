const router = require('express').Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');
const admin = require('firebase-admin');
let nodemailer = null;

try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

// 1. Inicializa o Firebase Admin usando as variáveis do .env
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
});

const DEFAULT_ICON = 'quill';
const ALLOWED_ICONS = new Set(['quill', 'candle', 'scroll', 'pen', 'key', 'heart', 'coffee', 'moon']);
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || '').trim();
const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || '').trim();

// --- FUNÇÕES AUXILIARES MANTIDAS ---

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function normalizeIcon(icon = DEFAULT_ICON) {
  const normalized = String(icon).trim().toLowerCase();
  return ALLOWED_ICONS.has(normalized) ? normalized : DEFAULT_ICON;
}

function normalizeAvatarUrl(avatarUrl) {
  const normalized = String(avatarUrl || '').trim();
  return normalized || null;
}

function normalizeAvatarPublicId(avatarPublicId) {
  const normalized = String(avatarPublicId || '').trim();
  return normalized || null;
}

function normalizeProviders(user) {
  const providers = new Set(Array.isArray(user.authProviders) ? user.authProviders : []);
  if (user.passwordHash) providers.add('password');
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
    avatarUrl: normalizeAvatarUrl(user.avatarUrl),
    avatarPublicId: normalizeAvatarPublicId(user.avatarPublicId),
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

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function mapFirebaseProvider(provider = '') {
  if (provider === 'google.com') return 'google';
  if (provider === 'password') return 'password';
  return 'firebase';
}

function canSendResetEmail() {
  return Boolean(
    nodemailer &&
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.RESET_EMAIL_FROM
  );
}

async function sendResetCodeEmail(email, resetCode) {
  if (!canSendResetEmail()) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.RESET_EMAIL_FROM,
    to: email,
    subject: 'Codigo para redefinir sua senha',
    text: `Seu codigo de redefinicao e ${resetCode}. Ele expira em 15 minutos.`
  });

  return true;
}

async function deleteCloudinaryAsset(publicId) {
  const normalizedPublicId = normalizeAvatarPublicId(publicId);

  if (!normalizedPublicId || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHash('sha1')
    .update(`public_id=${normalizedPublicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`)
    .digest('hex');

  const body = new URLSearchParams({
    public_id: normalizedPublicId,
    api_key: CLOUDINARY_API_KEY,
    timestamp: String(timestamp),
    signature
  });

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Nao foi possivel remover a imagem antiga do Cloudinary.');
  }

  return true;
}

function handleAuthError(res, err) {
  if (err?.code === 11000) {
    return res.status(400).json({ error: 'Esse email já está em uso.' });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: 'Os dados enviados são inválidos.' });
  }
  console.error('Auth route error:', err);
  return res.status(500).json({
    error: 'Erro no servidor',
    details: err?.message || 'Sem detalhes adicionais.'
  });
}

// --- ROTAS PADRÃO MANTIDAS ---

router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password || '';
    const displayName = String(req.body.displayName || email.split('@')[0] || '').trim();
    const icon = normalizeIcon(req.body.icon);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
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
        error: 'Essa conta ainda não tem senha vinculada. Entre pelo login do Google e adicione uma senha no perfil.'
      });
    }

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) {
      return res.status(400).json({ error: 'Email ou senha incorretos.' });
    }

    user.username = user.email = normalizeEmail(user.email || user.username);
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

router.post('/forgot-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ error: 'Email e obrigatorio.' });
    }

    const user = await User.findOne({
      $or: [{ email }, { username: email }]
    });

    if (!user) {
      return res.status(200).json({
        message: 'Se existir uma conta com esse email, um codigo de redefinicao foi gerado.'
      });
    }

    const resetCode = generateResetCode();
    const salt = await bcrypt.genSalt(10);

    user.passwordResetCodeHash = await bcrypt.hash(resetCode, salt);
    user.passwordResetExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    await user.save();

    const emailSent = await sendResetCodeEmail(email, resetCode).catch((err) => {
      console.error('Password reset email error:', err);
      return false;
    });

    console.log(`[auth] Reset code for ${email}: ${resetCode}`);

    const payload = {
      message: emailSent
        ? 'Se existir uma conta com esse email, enviamos um codigo de redefinicao.'
        : 'Se existir uma conta com esse email, um codigo de redefinicao foi gerado.'
    };

    if (!emailSent && process.env.NODE_ENV !== 'production') {
      payload.devResetCode = resetCode;
    }

    return res.status(200).json(payload);
  } catch (err) {
    handleAuthError(res, err);
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, codigo e nova senha sao obrigatorios.' });
    }

    const user = await User.findOne({
      $or: [{ email }, { username: email }]
    });

    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
    }

    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      user.passwordResetCodeHash = null;
      user.passwordResetExpiresAt = null;
      await user.save();
      return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
    }

    const validCode = await bcrypt.compare(code, user.passwordResetCodeHash);
    if (!validCode) {
      return res.status(400).json({ error: 'Codigo invalido ou expirado.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.passwordResetCodeHash = null;
    user.passwordResetExpiresAt = null;
    ensureProvider(user, 'password');
    await user.save();

    return res.status(200).json({
      message: 'Sua senha foi atualizada. Voce ja pode entrar com a nova senha.'
    });
  } catch (err) {
    handleAuthError(res, err);
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
    res.json({ user: buildProfile(user) });
  } catch (err) {
    handleAuthError(res, err);
  }
});

router.put('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const nextEmail = normalizeEmail(user.email || user.username);
    const nextDisplayName = String(req.body.displayName || '').trim();
    const nextIcon = normalizeIcon(req.body.icon);
    const nextAvatarUrl = normalizeAvatarUrl(req.body.avatarUrl);
    const nextAvatarPublicId = normalizeAvatarPublicId(req.body.avatarPublicId);
    const nextPassword = req.body.password || '';
    const currentPassword = req.body.currentPassword || '';
    const previousAvatarPublicId = normalizeAvatarPublicId(user.avatarPublicId);

    if (!nextEmail) return res.status(400).json({ error: 'Email é obrigatório.' });

    const duplicate = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ email: nextEmail }, { username: nextEmail }]
    });

    if (duplicate) return res.status(400).json({ error: 'Esse email já está em uso.' });

    user.email = user.username = nextEmail;
    user.displayName = nextDisplayName || nextEmail.split('@')[0];
    user.icon = nextIcon;
    user.avatarUrl = nextAvatarUrl;
    user.avatarPublicId = nextAvatarPublicId;
    normalizeProviders(user);

    if (nextPassword) {
      if (user.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Informe sua senha atual para definir uma nova senha.' });
        }

        const validCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!validCurrentPassword) {
          return res.status(400).json({ error: 'A senha atual informada nao confere.' });
        }
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(nextPassword, salt);
      ensureProvider(user, 'password');
    }

    await user.save();

    if (previousAvatarPublicId && previousAvatarPublicId !== nextAvatarPublicId) {
      deleteCloudinaryAsset(previousAvatarPublicId).catch((error) => {
        console.error('Cloudinary cleanup error:', error);
      });
    }

    const token = buildToken(user);
    res.json({ token, user: buildProfile(user) });
  } catch (err) {
    handleAuthError(res, err);
  }
});

// --- NOVA ROTA DO FIREBASE (Substitui a antiga /google) ---

router.post('/firebase', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token do Firebase não enviado.' });
    }

    // 1. Valida o token com o Google/Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email: rawEmail, name } = decodedToken;
    const email = normalizeEmail(rawEmail);
    const displayName = String(req.body.displayName || name || email.split('@')[0] || '').trim();
    const icon = normalizeIcon(req.body.icon || DEFAULT_ICON);
    const avatarUrl = normalizeAvatarUrl(req.body.avatarUrl);
    const avatarPublicId = normalizeAvatarPublicId(req.body.avatarPublicId);
    const provider = mapFirebaseProvider(decodedToken.firebase?.sign_in_provider);

    // 2. Busca o usuário pelo UID do Firebase ou pelo email (para vincular contas antigas)
    let user = await User.findOne({
      $or: [{ firebaseUid: uid }, { email }, { username: email }]
    });

    if (!user) {
      // Usuário 100% novo
      user = new User({
        firebaseUid: uid,
        email,
        username: email,
        displayName,
        authProviders: provider ? [provider] : [],
        icon,
        avatarUrl,
        avatarPublicId,
        passwordHash: null
      });
    } else {
      // Usuário existente (criado via email/senha ou pelo Google antigo)
      user.firebaseUid = uid;
      user.email = user.username = email || user.email || user.username;
      user.displayName = req.body.displayName ? displayName : (user.displayName || displayName);
      user.icon = normalizeIcon(req.body.icon || user.icon || DEFAULT_ICON);
      user.avatarUrl = avatarUrl !== null ? avatarUrl : user.avatarUrl || null;
      user.avatarPublicId = avatarPublicId !== null ? avatarPublicId : user.avatarPublicId || null;
      ensureProvider(user, provider);
    }

    await user.save();

    // 3. Usa a sua função existente para gerar o token padrão do sistema
    const appToken = buildToken(user);
    
    res.json({
      token: appToken,
      user: buildProfile(user),
      message: 'Sessao Firebase sincronizada com sucesso.'
    });
  } catch (err) {
    console.error('Erro na autenticação Firebase:', err);
    res.status(401).json({ 
      error: 'Não foi possível validar a conta Google.',
      details: 'O token expirou ou é inválido.'
    });
  }
});

module.exports = router;

// const DEFAULT_ICON = 'quill';
// const ALLOWED_ICONS = new Set(['quill', 'candle', 'scroll', 'pen', 'key', 'heart', 'coffee', 'moon']);
// const APP_SERVICES_APP_ID = String(process.env.APP_SERVICES_APP_ID || '').trim();
// const APP_SERVICES_BASE_URL = String(process.env.APP_SERVICES_BASE_URL || 'https://services.cloud.mongodb.com')
//   .trim()
//   .replace(/\/$/, '');

// function normalizeEmail(email = '') {
//   return String(email).trim().toLowerCase();
// }

// function normalizeIcon(icon = DEFAULT_ICON) {
//   const normalized = String(icon).trim().toLowerCase();
//   return ALLOWED_ICONS.has(normalized) ? normalized : DEFAULT_ICON;
// }

// function normalizeProviders(user) {
//   const providers = new Set(Array.isArray(user.authProviders) ? user.authProviders : []);

//   if (user.passwordHash) {
//     providers.add('password');
//   }

//   if (providers.size === 0) {
//     providers.add('password');
//   }

//   user.authProviders = Array.from(providers);
//   return user.authProviders;
// }

// function ensureProvider(user, provider) {
//   normalizeProviders(user);

//   if (!user.authProviders.includes(provider)) {
//     user.authProviders.push(provider);
//   }
// }

// function buildProfile(user) {
//   const fallbackEmail = user.email || user.username || '';
//   const fallbackName = user.displayName || fallbackEmail.split('@')[0] || 'Guest';
//   const authProviders = normalizeProviders(user);

//   return {
//     id: user._id,
//     email: fallbackEmail,
//     displayName: fallbackName,
//     icon: normalizeIcon(user.icon),
//     authProviders
//   };
// }

// function buildToken(user) {
//   return jwt.sign(
//     {
//       _id: user._id,
//       email: user.email || user.username,
//       displayName: user.displayName || user.username
//     },
//     process.env.JWT_SECRET,
//     { expiresIn: '24h' }
//   );
// }

// function handleAuthError(res, err) {
//   if (err?.code === 11000) {
//     return res.status(400).json({ error: 'Esse email ja esta em uso.' });
//   }

//   if (err?.name === 'ValidationError') {
//     return res.status(400).json({ error: 'Os dados enviados sao invalidos.' });
//   }

//   console.error('Auth route error:', err);
//   return res.status(500).json({
//     error: 'Erro no servidor',
//     details: err?.message || 'Sem detalhes adicionais.'
//   });
// }

// function decodeJwtPayload(token) {
//   const [, payloadSegment] = String(token || '').split('.');

//   if (!payloadSegment) {
//     throw new Error('Token do Google invalido.');
//   }

//   const normalized = payloadSegment
//     .replace(/-/g, '+')
//     .replace(/_/g, '/')
//     .padEnd(Math.ceil(payloadSegment.length / 4) * 4, '=');

//   return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
// }

// async function loginWithAppServicesGoogle(idToken) {
//   if (!APP_SERVICES_APP_ID) {
//     throw new Error('APP_SERVICES_APP_ID nao configurado.');
//   }

//   const response = await fetch(
//     `${APP_SERVICES_BASE_URL}/api/client/v2.0/app/${APP_SERVICES_APP_ID}/auth/providers/oauth2-google/login`,
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Accept: 'application/json'
//       },
//       body: JSON.stringify({ id_token: idToken })
//     }
//   );

//   const data = await response.json().catch(() => ({}));

//   if (!response.ok) {
//     const reason = [data.error, data.error_code, data.details].filter(Boolean).join(': ');
//     const error = new Error(reason || 'Falha ao autenticar no MongoDB App Services.');
//     error.statusCode = response.status;
//     throw error;
//   }

//   return data;
// }

// router.post('/register', async (req, res) => {
//   try {
//     const email = normalizeEmail(req.body.email);
//     const password = req.body.password || '';
//     const displayName = String(req.body.displayName || email.split('@')[0] || '').trim();
//     const icon = normalizeIcon(req.body.icon);

//     if (!email || !password) {
//       return res.status(400).json({ error: 'Email e senha sao obrigatorios.' });
//     }

//     const existingUser = await User.findOne({
//       $or: [{ email }, { username: email }]
//     });

//     const salt = await bcrypt.genSalt(10);
//     const passwordHash = await bcrypt.hash(password, salt);

//     if (existingUser) {
//       existingUser.email = email;
//       existingUser.username = email;
//       existingUser.displayName = existingUser.displayName || displayName;
//       existingUser.icon = normalizeIcon(existingUser.icon || icon);
//       existingUser.passwordHash = existingUser.passwordHash || passwordHash;
//       ensureProvider(existingUser, 'password');

//       await existingUser.save();

//       const token = buildToken(existingUser);
//       return res.status(200).json({
//         token,
//         user: buildProfile(existingUser),
//         message: 'Conta existente encontrada e vinculada ao login por senha.'
//       });
//     }

//     const newUser = new User({
//       email,
//       username: email,
//       displayName,
//       authProviders: ['password'],
//       icon,
//       passwordHash
//     });

//     await newUser.save();

//     const token = buildToken(newUser);
//     res.status(201).json({ token, user: buildProfile(newUser) });
//   } catch (err) {
//     handleAuthError(res, err);
//   }
// });

// router.post('/login', async (req, res) => {
//   try {
//     const email = normalizeEmail(req.body.email || req.body.username);
//     const password = req.body.password || '';

//     const user = await User.findOne({
//       $or: [{ email }, { username: email }]
//     });

//     if (!user) {
//       return res.status(400).json({ error: 'Email ou senha incorretos.' });
//     }

//     normalizeProviders(user);

//     if (!user.passwordHash) {
//       return res.status(400).json({
//         error: 'Essa conta ainda nao tem senha vinculada. Entre pelo login automatico e depois adicione uma senha.'
//       });
//     }

//     const validPass = await bcrypt.compare(password, user.passwordHash);
//     if (!validPass) {
//       return res.status(400).json({ error: 'Email ou senha incorretos.' });
//     }

//     if (!user.email) {
//       user.email = normalizeEmail(user.username);
//     }

//     user.username = user.email;
//     user.displayName = String(user.displayName || user.email.split('@')[0] || '').trim();
//     user.icon = normalizeIcon(user.icon);
//     ensureProvider(user, 'password');

//     await user.save();

//     const token = buildToken(user);
//     res.json({ token, user: buildProfile(user) });
//   } catch (err) {
//     handleAuthError(res, err);
//   }
// });

// router.get('/me', verifyToken, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     if (!user) {
//       return res.status(404).json({ error: 'Usuario nao encontrado.' });
//     }

//     res.json({ user: buildProfile(user) });
//   } catch (err) {
//     handleAuthError(res, err);
//   }
// });

// router.post('/google', async (req, res) => {
//   try {
//     if (!APP_SERVICES_APP_ID) {
//       return res.status(500).json({
//         error: 'Google login nao configurado.',
//         details: 'Defina APP_SERVICES_APP_ID no servidor e habilite o provider Google no MongoDB App Services.'
//       });
//     }

//     const credential = String(req.body.credential || '').trim();

//     if (!credential) {
//       return res.status(400).json({ error: 'Token do Google nao enviado.' });
//     }

//     const appServicesAuth = await loginWithAppServicesGoogle(credential);
//     const payload = decodeJwtPayload(credential);

//     if (!payload?.sub || !payload?.email) {
//       return res.status(400).json({ error: 'Nao foi possivel validar a conta Google.' });
//     }

//     const email = normalizeEmail(payload.email);
//     const googleId = String(payload.sub);
//     const displayName = String(payload.name || email.split('@')[0] || '').trim();
//     const appServicesUserId = String(appServicesAuth.user_id || appServicesAuth.userId || '').trim();

//     const googleLookup = [{ googleId }, { email }, { username: email }];

//     if (appServicesUserId) {
//       googleLookup.unshift({ appServicesUserId });
//     }

//     let user = await User.findOne({
//       $or: googleLookup
//     });

//     if (!user) {
//       user = new User({
//         email,
//         username: email,
//         displayName,
//         googleId,
//         appServicesUserId: appServicesUserId || undefined,
//         authProviders: ['google'],
//         icon: DEFAULT_ICON,
//         passwordHash: null
//       });
//     } else {
//       user.email = user.email || email;
//       user.username = user.email || email;
//       user.displayName = user.displayName || displayName;
//       user.googleId = googleId;
//       if (appServicesUserId) {
//         user.appServicesUserId = appServicesUserId;
//       }
//       user.icon = normalizeIcon(user.icon || DEFAULT_ICON);
//       ensureProvider(user, 'google');
//     }

//     await user.save();

//     const token = buildToken(user);
//     res.json({
//       token,
//       user: buildProfile(user),
//       message: 'Conta Google conectada com sucesso.'
//     });
//   } catch (err) {
//     if (err?.statusCode === 401 || err?.statusCode === 400) {
//       return res.status(401).json({
//         error: 'Nao foi possivel autenticar com o Google no MongoDB App Services.',
//         details: 'Verifique se o provider Google esta habilitado com OpenID Connect e se o Client ID usado no front e o mesmo configurado no App Services.'
//       });
//     }

//     handleAuthError(res, err);
//   }
// });

// router.put('/me', verifyToken, async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);
//     if (!user) {
//       return res.status(404).json({ error: 'Usuario nao encontrado.' });
//     }

//     const nextEmail = normalizeEmail(req.body.email || user.email || user.username);
//     const nextDisplayName = String(req.body.displayName || '').trim();
//     const nextIcon = normalizeIcon(req.body.icon);
//     const nextPassword = req.body.password || '';

//     if (!nextEmail) {
//       return res.status(400).json({ error: 'Email e obrigatorio.' });
//     }

//     const duplicate = await User.findOne({
//       _id: { $ne: user._id },
//       $or: [{ email: nextEmail }, { username: nextEmail }]
//     });

//     if (duplicate) {
//       return res.status(400).json({ error: 'Esse email ja esta em uso.' });
//     }

//     user.email = nextEmail;
//     user.username = nextEmail;
//     user.displayName = nextDisplayName || nextEmail.split('@')[0];
//     user.icon = nextIcon;
//     normalizeProviders(user);

//     if (nextPassword) {
//       const salt = await bcrypt.genSalt(10);
//       user.passwordHash = await bcrypt.hash(nextPassword, salt);
//       ensureProvider(user, 'password');
//     }

//     await user.save();

//     const token = buildToken(user);
//     res.json({ token, user: buildProfile(user) });
//   } catch (err) {
//     handleAuthError(res, err);
//   }
// });

// module.exports = router;
