import subprocess

# Fix 1: messages page maxLength
with open("app/messages/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()
old = '<input value={text} onChange={e => setText(e.target.value)}'
new = '<input value={text} onChange={e => setText(e.target.value)} maxLength={2000}'
if old in content and "maxLength" not in content.split(old)[1][:50]:
    content = content.replace(old, new, 1)
    with open("app/messages/page.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: messages maxLength added")
else:
    print("SKIP: messages (already has maxLength or pattern changed)")

# Fix 2: review textarea maxLength
with open("app/product/[id]/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()
old2 = '<textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Deine Bewertung..." rows={4}'
new2 = '<textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Deine Bewertung..." rows={4} maxLength={1000}'
if old2 in content:
    content = content.replace(old2, new2)
    with open("app/product/[id]/page.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("OK: review maxLength added")
else:
    print("SKIP: review textarea (already updated or pattern changed)")

# Fix 3: document DB constraints
addition = '''
-- ── 22. messages & reviews: DB-level length limits ─────────────
alter table messages add constraint message_length check (char_length(content) <= 2000);
alter table reviews  add constraint comment_length check (char_length(comment) <= 1000);
'''
with open("supabase-rls.sql", "r", encoding="utf-8") as f:
    sql_content = f.read()
if "message_length" not in sql_content:
    with open("supabase-rls.sql", "a", encoding="utf-8") as f:
        f.write(addition)
    print("OK: length constraints documented")

subprocess.run(["git", "add", "app/messages/page.tsx", "app/product/[id]/page.tsx", "supabase-rls.sql"])
subprocess.run(["git", "commit", "-m", "fix: add length limits to messages/reviews (client + DB level)"])
result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
print("Push:", result.stdout or result.stderr)
print("Done!")
