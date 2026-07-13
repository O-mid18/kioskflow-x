import subprocess

addition = '''
-- ── 20. products: DB-level CHECK constraints (defense in depth) ────
alter table products
  add constraint price_positive check (price > 0),
  add constraint stock_non_negative check (stock >= 0);
'''

with open("supabase-rls.sql", "r", encoding="utf-8") as f:
    content = f.read()

if "price_positive" not in content:
    with open("supabase-rls.sql", "a", encoding="utf-8") as f:
        f.write(addition)
    print("OK: DB constraints documented")
    subprocess.run(["git", "add", "supabase-rls.sql"])
    subprocess.run(["git", "commit", "-m", "fix: add DB-level CHECK constraints for products price/stock"])
else:
    print("Already documented")

result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
print("Push:", result.stdout or result.stderr)
print("Done!")
