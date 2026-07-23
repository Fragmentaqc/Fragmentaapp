const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const migrations = fs
  .readdirSync(path.join(root, 'supabase', 'migrations'))
  .filter((name) => name.endsWith('.sql'))
  .sort()
  .map((name) => read(path.join('supabase', 'migrations', name)))
  .join('\n');

test('la création de profil et les preuves légales restent côté serveur', () => {
  const authContext = read(path.join('context', 'auth-context.tsx'));
  const lifecycle = read(path.join('supabase', 'migrations', '20260722073000_harden_account_lifecycle.sql'));

  assert.doesNotMatch(authContext, /\.from\(['"]profiles['"]\)\s*\.insert/s);
  assert.match(lifecycle, /create or replace function public\.handle_new_user\(\)/i);
  assert.match(lifecycle, /revoke insert[\s\S]*on table public\.profiles from authenticated/i);
  assert.match(lifecycle, /terms_accepted_at[\s\S]*now\(\)/i);
  assert.match(lifecycle, /adult_confirmed_at[\s\S]*now\(\)/i);
});

test('la suppression exige une reconnexion et une session récente', () => {
  const screen = read(path.join('app', 'delete-account.tsx'));
  const lifecycle = read(path.join('supabase', 'migrations', '20260722073000_harden_account_lifecycle.sql'));

  assert.match(screen, /signInWithPassword/);
  assert.match(lifecycle, /last_sign_in_at/i);
  assert.match(lifecycle, /interval '10 minutes'/i);
  assert.match(lifecycle, /confirmation <> 'SUPPRIMER'/i);
});

test('les fonctions sensibles ne sont jamais exécutables anonymement', () => {
  for (const signature of [
    'delete_own_account(text)',
    'export_my_data()',
    'review_report(uuid,text,text)',
  ]) {
    const flexibleSignature = signature
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replaceAll(',', ',\\s*');
    assert.match(migrations, new RegExp(`revoke all on function public\\.${flexibleSignature} from public, anon`, 'i'));
  }
});

test('les images de contenu et les conversations restent privées', () => {
  assert.match(migrations, /set\s+public\s*=\s*false[\s\S]*where id in \('adventure-images', 'curiosity-images', 'fragment-images'\)/i);
  assert.match(migrations, /Conversation participants receive private broadcast/i);
  assert.match(migrations, /Conversation participants send private broadcast/i);
  assert.match(migrations, /Blocked profiles cannot be followed/i);
});

test('les données de rôle, paiement et identité restent hors des profils publics', () => {
  const privateMigration = read(path.join('supabase', 'migrations', '20260722050000_move_profile_security_private.sql'));

  assert.match(privateMigration, /create table if not exists private\.account_security/i);
  for (const column of ['role', 'identity_status', 'premium_status', 'stripe_verification_session_id']) {
    assert.match(privateMigration, new RegExp(`drop column if exists ${column}`, 'i'));
  }
  assert.match(privateMigration, /revoke all on table private\.account_security from public, anon, authenticated/i);
});

test('chaque fonction security definer ajoutée fixe explicitement son search_path', () => {
  const functionBlocks = migrations.match(/create or replace function[\s\S]*?\$\$;/gi) ?? [];
  const securityDefiners = functionBlocks.filter((block) => /security definer/i.test(block));

  assert.ok(securityDefiners.length > 0);
  for (const block of securityDefiners) {
    assert.match(block, /set search_path\s*=\s*(?:''|public(?:,\s*auth)?)/i);
  }
});
