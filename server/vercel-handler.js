import { api } from './api.js';
import { getPostgresDatabase } from './postgres.js';

export default {
  async fetch(request) {
    try { return await api(request, getPostgresDatabase()); }
    catch (error) {
      console.error('Compasso API unavailable:', error.name);
      return Response.json({ error: 'O serviço está temporariamente indisponível. Tente novamente em instantes.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  },
};
