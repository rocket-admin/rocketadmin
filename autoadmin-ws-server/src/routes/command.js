const express = require('express');
const router = express.Router();

const commandController = require('../controllers/command');
const { authByToken } = require('../middleware/auth');

router.post('/', authByToken, commandController.executeCommand);

module.exports = router;
