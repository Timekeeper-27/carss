const request = require('supertest');
const app = require('../app');

describe('POST /scrape', () => {
  test('should return 400 when body is missing', async () => {
    const res = await request(app).post('/scrape');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
