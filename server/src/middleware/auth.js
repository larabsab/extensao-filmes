const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // A extensão vai mandar o token no header: "Authorization: Bearer <token>"
  const authHeader = req.header('Authorization');
  if (!authHeader) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

  const token = authHeader.split(' ')[1];

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Adiciona os dados do usuário na requisição
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token inválido ou expirado.' });
  }
};