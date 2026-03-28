import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'SQL/migrations/core-platform/20260327_admin_tiered_rls.sql'
);

const sql = readFileSync(migrationPath, 'utf8');

describe('admin tiered rls migration', () => {
  it('defines tier helper functions', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_admin()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_standard_admin()');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_super_admin()');
  });

  it('creates governance tables with rls enabled', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.admin_financial_audit');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.monthly_financial_snapshot');
    expect(sql).toContain('ALTER TABLE public.admin_financial_audit ENABLE ROW LEVEL SECURITY;');
    expect(sql).toContain('ALTER TABLE public.monthly_financial_snapshot ENABLE ROW LEVEL SECURITY;');
  });

  it('grants standard admin operational read policies', () => {
    const standardPolicies = [
      'CREATE POLICY "workers: standard admin reads all"',
      'CREATE POLICY "appeals: standard admin reads all"',
      'CREATE POLICY "companies: standard admin reads all"',
      'CREATE POLICY "jobs: standard admin reads all"',
      'CREATE POLICY "allocations: standard admin reads all"',
      'CREATE POLICY "messages: standard admin reads all"',
    ];

    for (const policy of standardPolicies) {
      expect(sql).toContain(policy);
    }
  });

  it('grants financial access to super admin only', () => {
    const superPolicies = [
      'CREATE POLICY "payments: super admin reads all"',
      'CREATE POLICY "payment_methods: super admin reads all"',
      'CREATE POLICY "penalty_fees: super admin reads all"',
      'CREATE POLICY "job_quotes: super admin reads all"',
    ];

    for (const policy of superPolicies) {
      expect(sql).toContain(policy);
    }

    expect(sql).not.toContain('CREATE POLICY "payments: standard admin reads all"');
    expect(sql).not.toContain('CREATE POLICY "payment_methods: standard admin reads all"');
    expect(sql).not.toContain('CREATE POLICY "penalty_fees: standard admin reads all"');
    expect(sql).not.toContain('CREATE POLICY "job_quotes: standard admin reads all"');
  });

  it('provides super-admin-only financial aggregate entrypoint', () => {
    expect(sql).toContain('CREATE OR REPLACE VIEW public.v_financial_overview_monthly AS');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.get_financial_overview_monthly()');
    expect(sql).toContain('WHERE public.is_super_admin();');
  });
});
