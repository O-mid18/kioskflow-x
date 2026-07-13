import subprocess

files = ["app/api/connect/route.ts", "app/api/checkout/route.ts", "app/layout.tsx"]
changed = []

for path in files:
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    new = content.replace("https://vendoro.vercel.app", "https://kioskflow-x.vercel.app")
    if new != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
        changed.append(path)
        print(f"OK: {path}")
    else:
        print(f"SKIP: {path} (already correct)")

if changed:
    subprocess.run(["git", "add"] + changed)
    subprocess.run(["git", "commit", "-m", "fix: CRITICAL - restore correct domain fallback (vendoro.vercel.app doesn't exist)"])

result = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
print("Push:", result.stdout or result.stderr)
print("Done!")
