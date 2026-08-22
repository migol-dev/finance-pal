# Security Incident Response Runbook
**Finance Pal** — v1.17.8+
**Classification:** CONFIDENTIAL — Internal Use Only
**Last Updated:** 2025

---

## 📋 Table of Contents
1. [Incident Classification](#incident-classification)
2. [Response Team](#response-team)
3. [Communication Plan](#communication-plan)
4. [Playbooks by Incident Type](#playbooks-by-incident-type)
5. [Forensic Evidence Preservation](#forensic-evidence-preservation)
6. [Post-Incident Process](#post-incident-process)

---

## 🚨 Incident Classification

| Severity | SLA Response | SLA Resolution | Examples |
|----------|--------------|----------------|----------|
| **P0 - Critical** | 15 min | 2 hours | Active data breach, RCE, auth bypass affecting all users |
| **P1 - High** | 1 hour | 8 hours | PII exposure, MFA bypass, Supabase RLS failure |
| **P2 - Medium** | 4 hours | 24 hours | Rate limit bypass, stored XSS, CSP bypass |
| **P3 - Low** | 24 hours | 72 hours | Info disclosure, deprecated endpoint, minor config drift |

---

## 👥 Response Team

| Role | Primary | Backup | Contact |
|------|---------|--------|---------|
| **Incident Commander** | Lead Developer | Senior Dev | Slack #security-incidents |
| **Security Engineer** | Security Lead | DevOps | PagerDuty: security-oncall |
| **Communications** | Product Manager | CEO | Email: security@financepal.com |
| **Legal/Compliance** | External Counsel | DPO | As needed |

**Escalation Path:** P0 → CTO → CEO → Legal → Regulators (if required)

---

## 📢 Communication Plan

### Internal
- **Slack:** `#security-incidents` (real-time)
- **Status Page:** `status.financepal.com` (customer-facing)
- **War Room:** Google Meet link in Slack topic

### External (if P0/P1)
- **Customers:** Email + in-app banner within 4 hours
- **Regulators:** GDPR Art. 33 (72 hours) via DPO
- **Supabase:** Security team via dashboard

### Templates
- **Initial Alert:** "We're investigating a potential security issue. No action needed."
- **Resolution:** "Issue resolved. Root cause: X. Mitigation: Y. No data compromised."

---

## 🎯 Playbooks by Incident Type

### 1. Suspicious Authentication Activity
**Trigger:** Multiple failed logins, impossible travel, MFA fatigue

```bash
# Immediate containment
1. Revoke affected user sessions: supabase.auth.admin.signOut(userId)
2. Force MFA re-enrollment: supabase.auth.mfa.unenroll(factorId)
3. Check audit logs: audit.queryAuditLogs({ action: 'auth.login', since: '1h' })
4. Block suspicious IPs at WAF/CDN level
```

**Investigation:**
- Query `user_sessions` table for anomalous devices
- Check `audit_log` for `auth.mfa_disabled` + `auth.login` sequences
- Review rate limiter stats: `rateLimiter.getStats(clientId, 'auth')`

### 2. Data Exfiltration / PII Exposure
**Trigger:** Unusual export volume, audit log `data.export` spikes, customer report

```bash
# Immediate containment
1. Disable exports: setSyncEnabled(false) + feature flag
2. Revoke Supabase anon key, rotate service role key
3. Enable strict RLS: verify all policies with `SET ROLE authenticated`
4. Enable audit log integrity check: audit.verifyAuditIntegrity()
```

**Investigation:**
- Query audit logs: `audit.queryAuditLogs({ action: 'data.export', since: '24h' })`
- Check Supabase logs for `SELECT * FROM` without WHERE
- Verify column-level views (`accounts_safe`, `transactions_safe`) in use

### 3. Supabase RLS Policy Bypass
**Trigger:** Cross-user data access, unauthorized mutations

```bash
# Immediate containment
1. Enable `supabase.realtime` RLS: ALTER PUBLICATION ... SET ROW SECURITY
2. Run RLS test suite: `npm run test:rls`
3. Verify `SECURITY DEFINER` functions: `cleanup_stale_sessions()` has `SET search_path = ''`
4. Check for policy gaps: `SELECT * FROM pg_policies WHERE schemaname = 'public'`
```

**Investigation:**
- Test with `SET ROLE authenticated; SELECT * FROM accounts;`
- Verify `user_id = auth.uid()` on ALL policies
- Check for `USING (true)` or missing `WITH CHECK`

### 4. Receipt/Storage Compromise
**Trigger:** Signed URL enumeration, bucket policy misconfiguration

```bash
# Immediate containment
1. Rotate all signed URLs: regenerate with 1hr TTL
2. Verify bucket RLS: `SELECT * FROM storage.policies WHERE bucket_id = 'receipts'`
3. Check storage paths: ensure `userId/` prefix enforced
4. Scan for malware: `clamscan` on uploaded receipts
```

**Investigation:**
- Audit `supabase.storage` signed URL creation logs
- Verify `generateSecurePath()` uses crypto.randomUUID()
- Check `deleteReceipt()` ownership validation

### 5. Dependency Vulnerability (Supply Chain)
**Trigger:** `npm audit` high/critical, Dependabot alert, CVE announcement

```bash
# Immediate containment
1. Run `npm audit fix --force` in isolated branch
2. Check for breaking changes in CHANGELOG
3. Deploy to staging, run full test suite
4. If unpatchable: add to `dependabot.yml` ignore, implement WAF rule
```

**Investigation:**
- Check `npm audit --json` for affected packages
- Verify no malicious code in `node_modules` (compare hashes)
- Review `package-lock.json` for integrity

---

## 🔍 Forensic Evidence Preservation

### Do Immediately
1. **Snapshot Supabase:** Dashboard → Backups → Manual backup
2. **Export Audit Logs:** `audit.exportAuditLogs(userId)` → store in encrypted S3
3. **Capture Browser Logs:** HAR files from affected users
4. **Preserve Network Logs:** Vercel/Cloudflare access logs (7-day retention)

### Chain of Custody
- All evidence hashed (SHA-256) at collection
- Stored in encrypted vault with access logging
- Timestamped with RFC3339 + timezone

### Legal Hold
- Notify legal within 1 hour of P0/P1
- Preserve all logs for 2 years minimum
- GDPR Art. 30 records of processing activities

---

## 📝 Post-Incident Process

### Within 24 Hours
- [ ] Incident timeline documented (Markdown in `/docs/incidents/YYYY-MM-DD-description.md`)
- [ ] Root cause analysis (5 Whys)
- [ ] Action items with owners + due dates

### Within 72 Hours
- [ ] Customer notification sent (if required)
- [ ] Regulator notification sent (if GDPR)
- [ ] Security improvements deployed

### Within 2 Weeks
- [ ] Retrospective meeting
- [ ] Runbook updated
- [ ] Penetration test scope updated
- [ ] Team training completed

---

## 🛠️ Useful Commands

```bash
# Audit log integrity
npm run audit:verify

# RLS policy test
npm run test:rls

# Dependency audit
npm audit --json > audit-report.json

# Supabase session cleanup
supabase functions invoke cleanup_stale_sessions

# Rotate encryption keys
npm run security:rotate-keys

# Full security scan
npm run security:scan
```

---

## 📞 Emergency Contacts

| Service | Contact | SLA |
|---------|---------|-----|
| **Supabase Support** | dashboard.supabase.com/support | 1h (Pro) |
| **Vercel Support** | vercel.com/support | 30min |
| **Cloudflare** | dash.cloudflare.com | 15min (Ent) |
| **AWS/GCP** | Respective consoles | Per contract |
| **Legal (DPO)** | dpo@financepal.com | 2h |
| **CERT/CSIRT** | cert@financepal.com | ASAP |

---

## 📚 References
- [OWASP Incident Response](https://owasp.org/www-project-incident-response/)
- [NIST SP 800-61 Rev. 2](https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final)
- [GDPR Art. 33-34](https://gdpr.eu/article-33-notification/)
- [Supabase Security Docs](https://supabase.com/docs/guides/platform/security)

---

*Document Version: 1.0 | Review Cycle: Quarterly | Owner: Security Team*