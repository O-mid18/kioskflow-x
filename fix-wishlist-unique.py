import subprocess

addition = '''
-- ── 23. wishlist: unique constraint (user_id, product_id) ────────
alter table wishlist
  add constraint wishlist_user_product_unique unique (user_id, product_id);
'''

with open("supabase-rls.sql", "r", encoding="utf-8") as f:
    content = f.read()

if "wishlist_user_product_unique" not in content:
    with open("supabase-rls.sql", "a", encoding="utf-8") as f:
        f.write(addition)
    print("OK: wishlist unique constraint documented")
    subprocess.run(["git", "add", "supabase-rls.sql"])
    subprocess.run(["git", "commit", "-m", "fix: add missing wishlist unique constraint"])
else:
    print("Already documented")

result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
print("Push:", result.stdout or result.stderr)
print("Done!")
