import GhostAdminAPI from '@tryghost/admin-api';
import dotenv from 'dotenv';
dotenv.config();

export const api = new GhostAdminAPI({
  url: process.env.GHOST_API_URL,
  key: process.env.GHOST_ADMIN_API_KEY,
  version: 'v3',
});
