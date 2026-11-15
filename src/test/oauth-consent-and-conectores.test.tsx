import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const hoisted = vi.hoisted(() => ({
  getAalMock: vi.fn(),
  listFactorsMock: vi.fn(),
  challengeAndVerifyMock: vi.fn(),
  refreshSessionMock: vi.fn(),
  downloadFromCloudMock: vi.fn(),
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    session: { access_token: 'supabase-session-jwt', user: { id: 'user-1', email: 'user@example.com' } },
    user: { id: 'user-1', email: 'user@example.com' },
    loading: false,
    mfaRequired: false,
    refreshSession: hoisted.refreshSessionMock,
    signOut: vi.fn(),
    checkMfaStatus: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFinanceData', () => ({
  useFinanceData: () => ({
    downloadFromCloud: hoisted.downloadFromCloudMock,
  }),
}));

vi.mock('@/lib/supabase', () => ({
  isSupabaseEnabled: true,
  supabase: {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: hoisted.getAalMock,
        listFactors: hoisted.listFactorsMock,
        challengeAndVerify: hoisted.challengeAndVerifyMock,
      },
    },
    rpc: hoisted.rpcMock,
    from: hoisted.fromMock,
  },
}));

import OAuthConsent from '@/pages/OAuthConsent';
import { ConectoresSection } from '@/pages/ajustes/secciones/ConectoresSection';

function renderWithQueryAndRouter(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Phase 4: OAuthConsent & ConectoresSection UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1' } });
    hoisted.listFactorsMock.mockResolvedValue({ data: { all: [] } });
    hoisted.challengeAndVerifyMock.mockResolvedValue({ error: null });
    hoisted.refreshSessionMock.mockResolvedValue(undefined);
    hoisted.downloadFromCloudMock.mockResolvedValue({});
  });

  it('defaults OAuthConsent to Solo Lectura and submits approve decision via fetch', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ redirectTo: 'https://claude.ai/api/mcp/auth_callback?code=abc&state=st1' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const consentPath =
      '/oauth/consent?client_id=fp_claude&client_name=Claude&redirect_uri=' +
      encodeURIComponent('https://claude.ai/api/mcp/auth_callback') +
      '&state=st1&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&scope=' +
      encodeURIComponent('mcp:read:overview mcp:write:transactions mcp:delete:soft');

    renderWithQueryAndRouter(<OAuthConsent />, [consentPath]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Autorizar conector/i })).toBeEnabled();
    });

    const readOnlySwitch = screen.getByRole('switch', { name: /Modo Solo Lectura/i });
    expect(readOnlySwitch).toHaveAttribute('aria-checked', 'true');

    // Soft-delete checkbox must remain disabled & unchecked by default in Solo Lectura
    const softDeleteBox = screen.getByLabelText(/Enviar un registro a la papelera/i);
    expect(softDeleteBox).toBeDisabled();
    expect(softDeleteBox).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Autorizar conector/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/oauth/consent-decision');
    const body = JSON.parse(String(init.body)) as {
      decision: string;
      read_only: boolean;
      scopes: string[];
    };
    expect(body.decision).toBe('approve');
    expect(body.read_only).toBe(true);
    expect(body.scopes.every((s) => s.startsWith('mcp:read:'))).toBe(true);
    expect(body.scopes).not.toContain('mcp:delete:soft');

    vi.unstubAllGlobals();
  });

  it('requires inline TOTP AAL2 verification on OAuthConsent when MFA is enrolled at AAL1', async () => {
    hoisted.getAalMock.mockResolvedValue({ data: { currentLevel: 'aal1' } });
    hoisted.listFactorsMock.mockResolvedValue({
      data: { all: [{ id: 'factor-1', factor_type: 'totp', status: 'verified' }] },
    });

    const consentPath =
      '/oauth/consent?client_id=fp_claude&client_name=Claude&redirect_uri=' +
      encodeURIComponent('https://claude.ai/api/mcp/auth_callback') +
      '&state=st2&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256';

    renderWithQueryAndRouter(<OAuthConsent />, [consentPath]);

    await waitFor(() => {
      expect(screen.getByText(/Verificación 2FA requerida/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Autorizar conector/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Código TOTP 2FA/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar 2FA/i }));

    await waitFor(() => {
      expect(hoisted.challengeAndVerifyMock).toHaveBeenCalledWith({
        factorId: 'factor-1',
        code: '123456',
      });
      expect(screen.getByRole('button', { name: /Autorizar conector/i })).toBeEnabled();
    });
  });

  it('renders ConectoresSection with Kill Switch, active grant controls, and restores items from 30d Trash', async () => {
    const grantRow = {
      id: 'grant-1',
      user_id: 'user-1',
      client_id: 'fp_claude',
      client_name: 'Claude Web',
      scopes: ['mcp:read:overview', 'mcp:read:transactions'],
      read_only: true,
      resource: 'https://finance-pal.app/mcp',
      aal2_verified_at: '2026-11-15T12:00:00Z',
      last_used_at: '2026-11-15T12:05:00Z',
      revoked_at: null,
      created_at: '2026-11-15T12:00:00Z',
      updated_at: '2026-11-15T12:00:00Z',
    };

    const updateEqSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    hoisted.fromMock.mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { mcp_enabled: true }, error: null }),
            }),
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'mcp_oauth_grants') {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                order: async () => ({ data: [grantRow], error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: updateEqSpy,
          }),
        };
      }
      if (table === 'mcp_audit_log') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    hoisted.rpcMock.mockImplementation(async (fnName: string) => {
      if (fnName === 'list_soft_deleted_items') {
        return {
          data: [
            {
              entity_type: 'transaction',
              entity_id: 'tx-deleted-1',
              title: 'Café borrado por error',
              subtitle: 'Cafetería',
              amount: 95,
              deleted_at: '2026-11-15T10:00:00Z',
              days_remaining: 30,
            },
          ],
          error: null,
        };
      }
      if (fnName === 'restore_soft_deleted_item') {
        return {
          data: { restored: true, entity_type: 'transaction', entity_id: 'tx-deleted-1' },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    renderWithQueryAndRouter(<ConectoresSection onBack={vi.fn()} />);

    expect(await screen.findByText('Claude Web')).toBeInTheDocument();
    expect(screen.getByText('Café borrado por error')).toBeInTheDocument();
    expect(screen.getByText(/Expira en 30 día/i)).toBeInTheDocument();

    // Restore soft-deleted transaction
    fireEvent.click(screen.getByRole('button', { name: /Restaurar/i }));

    await waitFor(() => {
      expect(hoisted.rpcMock).toHaveBeenCalledWith('restore_soft_deleted_item', {
        p_entity_type: 'transaction',
        p_entity_id: 'tx-deleted-1',
      });
    });
    expect(hoisted.downloadFromCloudMock).toHaveBeenCalled();

    // Revoke active connector
    fireEvent.click(screen.getByRole('button', { name: /^Revocar$/i }));
    await waitFor(() => {
      expect(updateEqSpy).toHaveBeenCalled();
    });
  });
});
