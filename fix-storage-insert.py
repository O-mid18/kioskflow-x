import subprocess

addition = '''
-- ── 19. storage.objects (product-images bucket): fix INSERT policy ───
drop policy if exists "Authenticated upload product images" on storage.objects;

create policy "Authenticated upload product images"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
'''

with open("supabase-rls.sql", "r", encoding="utf-8") as f:
    content = f.read()

if "storage.objects (product-images bucket): fix INSERT" not in content:
    with open("supabase-rls.sql", "a", encoding="utf-8") as f:
        f.write(addition)
    print("OK: storage INSERT policy fix documented")
    subprocess.run(["git", "add", "supabase-rls.sql"])
    subprocess.run(["git", "commit", "-m", "fix: storage INSERT policy - restrict uploads to own folder"])
else:
    print("Already documented")

result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
print("Push:", result.stdout or result.stderr)
print("Done!")
