const request = require('supertest');
const app = require('../app');

jest.setTimeout(30000);

let server;

beforeAll(done => {
  const http = require('http');
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <div class="listing">
        <span class="title">Test Car</span>
        <span class="price">$9999</span>
        <a href="http://example.com">link</a>
      </div>
    `);
  }).listen(5000, done);
});

afterAll(done => {
  server.close(done);
});

describe('POST /scrape', () => {
  test('should return 400 when body is missing', async () => {
    const res = await request(app).post('/scrape');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('should scrape listings from a local page', async () => {
    const res = await request(app)
      .post('/scrape')
      .send({ url: 'http://localhost:5000' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.listings)).toBe(true);
    expect(res.body.listings.length).toBeGreaterThan(0);
    expect(res.body.listings[0].title).toContain('Test Car');
  });
});
