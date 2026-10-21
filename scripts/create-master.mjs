// Creates (or promotes) a Master. Usage:
//   node --env-file=.env.local scripts/create-master.mjs email@empresa.com "Nome Completo" [senha]
// With a password, the login account is created right away (handy locally).
// Without one, the person signs in with Google or asks for an access link on the login page.
import { createClient } from "@supabase/supabase-js";

const [email, name = "", password] = process.argv.slice(2);
if (!email) {
  console.error('Uso: node --env-file=.env.local scripts/create-master.mjs email "Nome" [senha]');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const normalized = email.trim().toLowerCase();

const { error } = await supabase
  .from("members")
  .upsert({ email: normalized, full_name: name, level: "master", active: true }, { onConflict: "email" });
if (error) {
  console.error("Não foi possível gravar o Master:", error.message);
  process.exit(1);
}

if (password) {
  const res = await supabase.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (res.error && !/already/i.test(res.error.message)) {
    console.error("Master gravado, mas a conta de login falhou:", res.error.message);
    process.exit(1);
  }
}

console.log(`Master pronto: ${normalized}${password ? " (login com senha criado)" : ""}`);
