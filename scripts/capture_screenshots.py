import subprocess
import os
import shutil

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
screenshots_dir = os.path.abspath("docs/screenshots")
brain_dir = os.path.abspath(r"C:\Users\Avijit Singh\.gemini\antigravity\brain\1b4f059a-fa83-4ad1-969d-d59b1d9313f9")

os.makedirs(screenshots_dir, exist_ok=True)
os.makedirs(brain_dir, exist_ok=True)

targets = [
    ("player_intelligence_page.png", "http://localhost:5173/players"),
    ("player_profile_modal.png", "http://localhost:5173/players?player=94d042cb-a0f2-45f3-bdca-42fab73cfef5"),
    ("combat_analysis_page.png", "http://localhost:5173/combat"),
    ("region_intelligence_page.png", "http://localhost:5173/regions"),
]

for filename, url in targets:
    out_path = os.path.join(screenshots_dir, filename)
    cmd = [
        edge_path,
        "--headless=new",
        "--disable-gpu",
        "--virtual-time-budget=8000",
        "--window-size=1600,1050",
        f"--screenshot={out_path}",
        url
    ]
    print(f"Capturing {filename} from {url}...")
    subprocess.run(cmd, check=True)
    if os.path.exists(out_path):
        brain_path = os.path.join(brain_dir, filename)
        shutil.copy2(out_path, brain_path)
        print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes) -> copied to {brain_path}")
    else:
        print(f"Error: {out_path} not found!")

print("All screenshots captured successfully.")
