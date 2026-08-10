const authService = require('../services/authService');

const authController = {
  async register(req, res, next) {
    try {
      const { username, email, password } = req.body;
      const data = await authService.register({ username, email, password });
      res.status(201).json(data);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async login(req, res, next) {
    try {
      const { email, username, identifier, password } = req.body;
      const data = await authService.login({ email, username, identifier, password });
      res.json(data);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = authController;
