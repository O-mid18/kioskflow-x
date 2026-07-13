import subprocess

addition = '''
-- ── 21. reviews: prevent duplicate reviews per user/product ────────────
alter table reviews
  add constraint reviews_one_per_user_per_product unique (user_id, product_id);
'''

with open("supabase-rls.sql", "r", encoding="utf-8") as f:
    content = f.read()

if "reviews_one_per_user_per_product" not in content:
    with open("supabase-rls.sql", "a", encoding="utf-8") as f:
        f.write(addition)
    print("OK: reviews unique constraint documented")
    subprocess.run(["git", "add", "supabase-rls.sql"])
    subprocess.run(["git", "commit", "-m", "fix: prevent duplicate reviews via unique constraint"])
else:
    print("Already documented")

result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
print("Push:", result.stdout or result.stderr)
print("Done!")
