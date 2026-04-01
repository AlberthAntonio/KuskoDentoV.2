#!/usr/bin/env ts-node
/**
 * SMOKE TESTS: Validación rápida de endpoints críticos
 * Ejecuta: npm run test:smoke
 */

const API_BASE = process.env.SMOKE_BASE_URL || process.env.API_BASE_URL || 'http://localhost:9002';
const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD;
const SMOKE_CLINIC_ID = process.env.SMOKE_CLINIC_ID;

const hasAuthConfig = Boolean(SMOKE_EMAIL && SMOKE_PASSWORD && SMOKE_CLINIC_ID);
let passed = 0;
let failed = 0;
let skipped = 0;

interface TestResult {
  name: string;
  passed: boolean;
  skipped?: boolean;
  message: string;
  time: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const time = Date.now() - start;
    results.push({ name, passed: true, message: 'OK', time });
    passed++;
    console.log(`✅ ${name} (${time}ms)`);
  } catch (err: any) {
    const time = Date.now() - start;
    results.push({ name, passed: false, message: err.message, time });
    failed++;
    console.log(`❌ ${name}: ${err.message}`);
  }
}

function skipTest(name: string, reason: string): void {
  results.push({ name, passed: true, skipped: true, message: reason, time: 0 });
  skipped++;
  console.log(`⏭️ ${name}: ${reason}`);
}

async function req(method: string, path: string, body?: any, headers?: any): Promise<any> {
  const url = `${API_BASE}${path}`;
  const options: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';

  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      if (contentType.includes('application/json')) {
        throw new Error(`Invalid JSON body (status ${res.status}): ${text.slice(0, 200)}`);
      }
    }
  }

  return {
    status: res.status,
    headers: res.headers,
    body: parsed,
    rawBody: text,
    contentType,
  };
}

async function runSmokeTests() {
  console.log('\n🧪 SMOKE TESTS: Validando endpoints críticos\n');
  console.log(`🔗 API_BASE: ${API_BASE}`);

  await test('Preflight API reachability', async () => {
    try {
      await req('GET', '/api/health');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`No se pudo conectar a ${API_BASE}. Detalle: ${message}`);
    }
  });

  // 1. Health Check
  await test('GET /api/health', async () => {
    const res = await req('GET', '/api/health');
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!res.body || typeof res.body !== 'object') throw new Error(`Expected JSON object, got: ${res.rawBody?.slice(0, 200) || '<empty>'}`);
    if (!res.body.status) throw new Error('Missing status in response');
  });

  // 2. Login con credenciales correctas
  let authToken: string;
  if (!hasAuthConfig) {
    skipTest('POST /api/auth/login (valid)', 'Configurar SMOKE_EMAIL, SMOKE_PASSWORD y SMOKE_CLINIC_ID para habilitar pruebas autenticadas');
    skipTest('POST /api/auth/login (invalid)', 'Requiere credenciales de smoke configuradas');
    skipTest('GET /api/auth/me (no auth)', 'Requiere suite autenticada completa');
    skipTest('GET /api/patients (no auth)', 'Requiere suite autenticada completa');
    skipTest('GET /api/patients (valid)', 'Requiere suite autenticada completa');
    skipTest('POST /api/patients (create)', 'Requiere suite autenticada completa');
    skipTest('GET /api/treatments', 'Requiere suite autenticada completa');
    skipTest('GET /api/appointments', 'Requiere suite autenticada completa');
    skipTest('GET /api/payments', 'Requiere suite autenticada completa');
    skipTest('POST /api/auth/logout', 'Requiere suite autenticada completa');
    skipTest('POST /api/auth/logout verification', 'Requiere suite autenticada completa');
  } else {
    await test('POST /api/auth/login (valid)', async () => {
      const res = await req('POST', '/api/auth/login', {
        email: SMOKE_EMAIL,
        password: SMOKE_PASSWORD,
        clinic_id: SMOKE_CLINIC_ID,
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.body.user)
        throw new Error('Missing user in response');
      // Extraer token de cookie
      const setCookie = res.headers.get('set-cookie');
      if (!setCookie) throw new Error('No auth cookie set');
      authToken = setCookie.split(';')[0].split('=')[1];
    });

    // 3. Login con credenciales incorrectas (debe fallar)
    await test('POST /api/auth/login (invalid)', async () => {
      const res = await req('POST', '/api/auth/login', {
        email: SMOKE_EMAIL,
        password: 'WrongPassword',
        clinic_id: SMOKE_CLINIC_ID,
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    // 4. GET /api/auth/me sin token (debe fallar)
    await test('GET /api/auth/me (no auth)', async () => {
      const res = await req('GET', '/api/auth/me');
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    // 5. GET /api/patients (sin autenticación - debe fallar)
    await test('GET /api/patients (no auth)', async () => {
      const res = await req('GET', '/api/patients');
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    // 6. GET /api/patients (con autenticación)
    await test('GET /api/patients (valid)', async () => {
      const res = await req('GET', '/api/patients', null, {
        Cookie: `auth_token=${authToken}`,
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const items = Array.isArray(res.body) ? res.body : res.body?.items;
      if (!Array.isArray(items)) throw new Error(`Expected array or {items:[]}, got: ${res.rawBody?.slice(0, 200) || '<empty>'}`);
    });

    // 7. POST /api/patients (crear paciente)
    let patientId: string;
    await test('POST /api/patients (create)', async () => {
      const res = await req(
        'POST',
        '/api/patients',
        {
          dni: `TEST${Date.now()}`,
          full_name: 'Test Patient',
          phone: '555-1234',
          address: 'Test Street 123',
        },
        {
          Cookie: `auth_token=${authToken}`,
        }
      );
      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}`);
      if (!res.body.id) throw new Error('Missing patient ID in response');
      patientId = res.body.id;
      if (!patientId) throw new Error('No se genero patientId');
    });

    // 8. GET /api/treatments
    await test('GET /api/treatments', async () => {
      const res = await req('GET', '/api/treatments', null, {
        Cookie: `auth_token=${authToken}`,
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const items = Array.isArray(res.body) ? res.body : res.body?.items;
      if (!Array.isArray(items)) throw new Error(`Expected array or {items:[]}, got: ${res.rawBody?.slice(0, 200) || '<empty>'}`);
    });

    // 9. GET /api/appointments
    await test('GET /api/appointments', async () => {
      const res = await req('GET', '/api/appointments', null, {
        Cookie: `auth_token=${authToken}`,
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const items = Array.isArray(res.body) ? res.body : res.body?.items;
      if (!Array.isArray(items)) throw new Error(`Expected array or {items:[]}, got: ${res.rawBody?.slice(0, 200) || '<empty>'}`);
    });

    // 10. GET /api/payments
    await test('GET /api/payments', async () => {
      const res = await req('GET', '/api/payments', null, {
        Cookie: `auth_token=${authToken}`,
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      if (!res.body.items) throw new Error('Missing items in response');
    });

    // 11. Logout
    await test('POST /api/auth/logout', async () => {
      const res = await req('POST', '/api/auth/logout', null, {
        Cookie: `auth_token=${authToken}`,
      });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
      const setCookie = res.headers.get('set-cookie') || '';
      if (!setCookie.includes('auth_token=') || (!setCookie.toLowerCase().includes('max-age=0') && !setCookie.toLowerCase().includes('expires='))) {
        throw new Error('Logout did not invalidate auth cookie');
      }
    });

    // 12. Verify logout (sin cookie, como quedaria el cliente tras limpiar cookie)
    await test('POST /api/auth/logout verification', async () => {
      const res = await req('GET', '/api/patients');
      if (res.status !== 401) throw new Error(`Expected 401 after logout, got ${res.status}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 RESULTADOS:\n   ✅ Pasadas: ${passed}\n   ⏭️ Omitidas: ${skipped}\n   ❌ Fallidas: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ SMOKE TESTS FALLARON');
    process.exitCode = 1;
  } else {
    console.log('\n✅ TODOS LOS SMOKE TESTS PASARON');
    process.exitCode = 0;
  }
}

runSmokeTests().catch((err) => {
  console.error('❌ Error ejecutando tests:', err);
  process.exitCode = 1;
});
