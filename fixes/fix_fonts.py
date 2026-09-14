import os
import re

# Font configurations
STANDARD_SANS = "'Inter', 'Roboto', 'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif"
STANDARD_SERIF = "Georgia, 'Times New Roman', Times, serif"

# Some handwriting/cursive fonts have equivalents, but let's just make sure they fall back cleanly
CURSIVE = "'Dancing Script', 'Pacifico', cursive"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # We want to replace lines like: font-family: 'PingFang SC', ...;
    # with font-family: STANDARD_SANS;
    
    # Patterns for sans-serif Chinese fonts
    sans_patterns = [
        r"font-family:\s*[^;]*(PingFang SC|Microsoft YaHei|Source Han Sans|Noto Sans SC)[^;]*;",
    ]
    
    # Patterns for serif/cursive Chinese fonts
    serif_patterns = [
        r"font-family:\s*[^;]*(Noto Serif SC|SimSun|FangSong|ArtisticFont)[^;]*;",
    ]
    
    cursive_patterns = [
        r"font-family:\s*[^;]*(Ma Shan Zheng|ZCOOL KuaiLe|Liu Jian Mao Cao|ZCOOL XiaoWei)[^;]*;",
    ]

    for pattern in sans_patterns:
        content = re.sub(pattern, f"font-family: {STANDARD_SANS};", content)
        
    for pattern in serif_patterns:
        content = re.sub(pattern, f"font-family: {STANDARD_SERIF};", content)
        
    for pattern in cursive_patterns:
        content = re.sub(pattern, f"font-family: {CURSIVE};", content)

    # Some hardcoded ones we found in grep
    content = re.sub(r"font-family:\s*'Inter',\s*-apple-system,\s*BlinkMacSystemFont,\s*sans-serif;", f"font-family: {STANDARD_SANS};", content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    templates_dir = os.path.join(root_dir, 'templates')
    for root, dirs, files in os.walk(templates_dir):
        for file in files:
            if file.endswith(".html"):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
