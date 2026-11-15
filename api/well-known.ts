import { getServerEnv } from './_lib/env.js';
import { MCP_ALL_SCOPES } from './_lib/oauth/scopes.js';
import { applySecurityHeaders } from './_lib/security.js';

export async function handleWellKnownRequest(request: Request): Promise<Response> {
  const env = getServerEnv();
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  applySecurityHeaders(headers, '*', 'GET, OPTIONS');
  headers.set('Cache-Control', 'public, max-age=300');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== 'GET') {
    headers.set('Allow', 'GET, OPTIONS');
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  }

  const url = new URL(request.url, env.mcpIssuer);
  const kind = url.searchParams.get('kind');
  const pathname = url.pathname;

  const isProtectedResource =
    kind === 'protected-resource' || pathname.includes('/oauth-protected-resource');
  const isAuthorizationServer =
    kind === 'authorization-server' || pathname.includes('/oauth-authorization-server');

  if (isProtectedResource) {
    return new Response(
      JSON.stringify({
        resource: env.mcpResource,
        authorization_servers: [env.mcpIssuer],
        bearer_methods_supported: ['header'],
        scopes_supported: [...MCP_ALL_SCOPES],
        resource_name: 'Finance Pal MCP',
        resource_documentation: `${env.mcpIssuer}/ajustes`,
      }),
      { status: 200, headers },
    );
  }

  if (isAuthorizationServer) {
    return new Response(
      JSON.stringify({
        issuer: env.mcpIssuer,
        authorization_endpoint: `${env.mcpIssuer}/oauth/authorize`,
        token_endpoint: `${env.mcpIssuer}/oauth/token`,
        registration_endpoint: `${env.mcpIssuer}/oauth/register`,
        revocation_endpoint: `${env.mcpIssuer}/oauth/revoke`,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: [...MCP_ALL_SCOPES],
        client_id_metadata_document_supported: true,
        authorization_response_iss_parameter_supported: true,
      }),
      { status: 200, headers },
    );
  }

  return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers });
}

export default {
  fetch: handleWellKnownRequest,
};
