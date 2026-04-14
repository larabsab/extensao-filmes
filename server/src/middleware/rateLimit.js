const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Limita cada IP a 100 requisições por janela
  message: { error: 'Muitas requisições deste IP, tente novamente mais tarde.' }
});

module.exports = apiLimiter;