#!/usr/bin/env node
/**
 * seed_supabase.js
 * Node.js seed script — tạo tài khoản Auth + seed toàn bộ database
 *
 * Cách dùng:
 *   npx tsx tmp/seed_supabase.ts
 *
 * Yêu cầu trong .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
 *
 * ⚠️  Chỉ dùng cho môi trường PHÁT TRIỂN. Service Role Key không được đặt trong frontend.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl   = process.env.NEXT_PUBLIC_SUPABASE_URL   || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client dùng Service Role — bỏ qua RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Client dùng Anon Key — để verify login sau seed
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const PASSWORD = 'Admin@123';

// ── Tài khoản cần tạo ──────────────────────────────────────────
const ACCOUNTS = [
  // Admin
  { phone: '0999999999', name: 'Nguyễn Văn Minh',   role: 'admin', email: 'admin_0999999999@aerorefund.com' },
  { phone: '0383165313', name: 'Trần Thị Lan',      role: 'admin', email: 'admin_0383165313@aerorefund.com' },
  { phone: '0968686868', name: 'Lê Hoàng Nam',      role: 'admin', email: 'admin_0968686868@aerorefund.com' },
  // User
  { phone: '0912345678', name: 'Phạm Thị Mai',       role: 'user',  email: 'phamthimai@gmail.com' },
  { phone: '0933888999', name: 'Hoàng Đức Anh',     role: 'user',  email: 'hoangducanh@yahoo.com' },
];

// ── Basedata PNR seed ──────────────────────────────────────────
const BASEDATA = [
  { order_code: 'VN-2024-SGN-HAN-001', amount: 1450000, passenger_name: 'Nguyễn Văn Minh',  flight_number: 'VN601',  status: 'valid'   },
  { order_code: 'VN-2024-HAN-SGN-002', amount: 1380000, passenger_name: 'Trần Thị Lan',     flight_number: 'VN602',  status: 'valid'   },
  { order_code: 'VJ-2024-SGN-DAD-003', amount: 890000,  passenger_name: 'Lê Hoàng Nam',     flight_number: 'VJ541',  status: 'valid'   },
  { order_code: 'QH-2024-HAN-UIH-004', amount: 650000,  passenger_name: 'Phạm Thị Mai',      flight_number: 'QH1523', status: 'valid'   },
  { order_code: 'VN-2024-DAD-SGN-005', amount: 1720000, passenger_name: 'Hoàng Đức Anh',     flight_number: 'VN683',  status: 'valid'   },
  { order_code: 'VJ-2024-SGN-PXU-006', amount: 780000,  passenger_name: 'Nguyễn Thị Hương', flight_number: 'VJ311',  status: 'valid'   },
  { order_code: 'VN-2024-HAN-CXR-007', amount: 1100000, passenger_name: 'Trần Đình Khoa',    flight_number: 'VN1892', status: 'valid'   },
  { order_code: 'QH-2024-SGN-PQC-008', amount: 550000,  passenger_name: 'Lê Thị Thu',         flight_number: 'QH1841', status: 'valid'   },
  { order_code: 'VJ-2024-HAN-DAD-009', amount: 950000,  passenger_name: 'Phạm Văn Hùng',      flight_number: 'VJ241',  status: 'valid'   },
  { order_code: 'VN-2024-SGN-VCA-010', amount: 720000,  passenger_name: 'Ngô Thị Lan',        flight_number: 'VN1403', status: 'valid'   },
  { order_code: 'VN-2024-HAN-SGN-011', amount: 1500000, passenger_name: 'Đặng Đức Thắng',     flight_number: 'VN605',  status: 'valid'   },
  { order_code: 'VJ-2024-SGN-HAN-012', amount: 1250000, passenger_name: 'Vũ Thị Mai',         flight_number: 'VJ501',  status: 'valid'   },
  { order_code: 'VN-2024-SGN-HAN-013', amount: 1350000, passenger_name: 'Bùi Văn Tân',        flight_number: 'VN609',  status: 'refunded' },
  { order_code: 'VN-2024-DAD-HAN-014', amount: 1050000, passenger_name: 'Trịnh Thị Phương',  flight_number: 'VN1632', status: 'valid'   },
  { order_code: 'QH-2024-SGN-DAD-015', amount: 820000,  passenger_name: 'Nguyễn Đình Hùng',  flight_number: 'QH151',  status: 'valid'   },
];

// ── Refund request seed ────────────────────────────────────────
const REFUND_STATUSES = ['pending', 'approved', 'processing', 'completed', 'rejected'];
const BANKS = ['Vietcombank', 'Techcombank', 'VPBank', 'ACB', 'MB Bank', 'TPBank', 'Vietinbank', 'BIDV', 'Sacombank', 'Eximbank'];

// ── Helper: delay ──────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Main ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🚀 SEED SUPABASE DATABASE\n');
  console.log(`   URL: ${supabaseUrl}\n`);

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Thiếu biến môi trường. Kiểm tra .env.local:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL=...');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=...');
    process.exit(1);
  }

  // 1. Seed basedata
  console.log('📦 [1/4] Seed basedata (PNR)...');
  const { error: bdErr } = await supabase.from('basedata').upsert(BASEDATA, { onConflict: 'order_code' });
  if (bdErr) {
    console.error('   ⚠️  basedata upsert error:', bdErr.message);
  } else {
    console.log(`   ✅ ${BASEDATA.length} PNR seeded`);
  }

  // 2. Seed config
  console.log('📦 [2/4] Seed config...');
  const { error: cfgErr } = await supabase.from('config').upsert({
    id: 'system',
    support_phone: '1900 6091',
    support_email: 'hotro@aerorefund.com',
    working_hours: '0h - 24h',
    brand_name: 'TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM',
    footer_description: 'Hệ thống quản lý đại lý & hoàn vé máy bay tự động',
    copyright: '© 2026 TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM — Hệ thống quản lý đại lý & hoàn vé tự động.',
  }, { onConflict: 'id' });
  if (cfgErr) {
    console.error('   ⚠️  config upsert error:', cfgErr.message);
  } else {
    console.log('   ✅ config seeded');
  }

  // 3. Tạo Auth accounts + user profiles
  console.log('👤 [3/4] Tạo tài khoản Auth + Profiles...');
  const userIds: Record<string, string> = {};

  for (const acct of ACCOUNTS) {
    // Kiểm tra đã tồn tại chưa
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users.find(u => u.email === acct.email);

    if (found) {
      userIds[acct.phone] = found.id;
      console.log(`   ⏭️  ${acct.role.toUpperCase()} ${acct.name} (${acct.phone}) — đã tồn tại`);
    } else {
      // Tạo mới
      const { data, error } = await supabase.auth.admin.createUser({
        email: acct.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: acct.name, phone: acct.phone },
      });

      if (error) {
        console.error(`   ❌ ${acct.role.toUpperCase()} ${acct.name}: ${error.message}`);
        continue;
      }

      const uid = data.user!.id;
      userIds[acct.phone] = uid;
      console.log(`   ✅ ${acct.role.toUpperCase()} ${acct.name} (${acct.phone})`);

      // Upsert profile
      await supabase.from('users').upsert({
        id: uid,
        sdt: acct.phone,
        display_name: acct.name,
        email: acct.email,
        role: acct.role,
        status: 'active',
      }, { onConflict: 'id' });

      await delay(500); // tránh rate limit
    }
  }

  // 4. Seed refund requests (lấy user uid để link)
  console.log('📋 [4/4] Seed refund requests...');
  const userPhones = ACCOUNTS.filter(a => a.role === 'user');
  const refundRows = userPhones.flatMap((u, ui) =>
    [0, 1].map((ri) => ({
      user_id: userIds[u.phone],
      user_sdt: u.phone,
      user_email: u.email,
      display_name: u.name,
      bank_name: BANKS[(ui * 2 + ri) % BANKS.length],
      account_number: `123456${String(ui * 2 + ri + 1).padStart(4, '0')}`,
      account_holder: u.name,
      amount: [1450000, 1380000, 890000, 650000][(ui * 2 + ri) % 4] || 1000000,
      order_code: BASEDATA[(ui * 2 + ri) % BASEDATA.length].order_code,
      status: REFUND_STATUSES[(ui * 2 + ri) % REFUND_STATUSES.length],
      refund_reason: 'Hủy chuyến do công việc đột xuất',
      flight_date: new Date(Date.now() + 86400000 * (ui + 1)).toLocaleDateString('vi-VN'),
      ticket_number: `689${String(ui * 2 + ri + 1).padStart(10, '0')}`,
      passenger_name: u.name,
      created_at: new Date(Date.now() - 3600000 * (ui * 2 + ri + 1)).toISOString(),
    }))
  );

  if (refundRows.length > 0 && userIds[userPhones[0]?.phone]) {
    const { error: rrErr } = await supabase.from('refund_requests').insert(refundRows);
    if (rrErr) {
      console.error('   ⚠️  refund_requests insert error:', rrErr.message);
    } else {
      console.log(`   ✅ ${refundRows.length} refund requests seeded`);
    }
  }

  // ── Verify: thử đăng nhập ──────────────────────────────────
  console.log('\n🔐 Verify: thử đăng nhập Admin 1...');
  const { error: loginErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'admin_0999999999@aerorefund.com',
    password: PASSWORD,
  });
  if (loginErr) {
    console.error(`   ❌ Login failed: ${loginErr.message}`);
    console.error('   (Có thể bcrypt hash chưa được Supabase hỗ trợ. Thử chạy SQL seed script trong Supabase SQL Editor thay thế.)');
  } else {
    console.log('   ✅ Đăng nhập thành công!');
  }

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════');
  console.log('✅ SEED HOÀN TẤT');
  console.log('══════════════════════════════════════════');
  console.log('\n📋 Tài khoản đăng nhập:');
  console.log('   Admin 1 — SĐT: 0999999999 — Mật khẩu: Admin@123');
  console.log('   Admin 2 — SĐT: 0383165313 — Mật khẩu: Admin@123');
  console.log('   Admin 3 — SĐT: 0968686868 — Mật khẩu: Admin@123');
  console.log('   User 1  — SĐT: 0912345678 — Mật khẩu: Admin@123');
  console.log('   User 2  — SĐT: 0933888999 — Mật khẩu: Admin@123');
  console.log('\n💡 Nếu đăng nhập thất bại, hãy dùng file:');
  console.log('   tmp/supabase_seed.sql → chạy trong Supabase SQL Editor');
  console.log('');
}

seed().catch(console.error);
