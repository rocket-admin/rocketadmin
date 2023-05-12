import { Router } from 'express';
const router = Router();

import { executeCommand } from '../controllers/command.js';
import { authByToken } from '../middleware/auth.js';

router.post('/', authByToken, executeCommand);

export default router;
