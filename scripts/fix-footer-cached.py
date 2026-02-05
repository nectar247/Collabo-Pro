#!/usr/bin/env python3
"""
Script to replace <FooterCached ...props... /> with <FooterCached />
"""

import re
import glob
import os

def fix_footer_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content

    # Pattern to match <FooterCached with any props and closing />
    pattern = r'<FooterCached\s+[^>]*?/>'
    content = re.sub(pattern, '<FooterCached />', content)

    # Pattern to match <FooterCached with props and separate closing tag
    pattern2 = r'<FooterCached\s+[^>]*?>\s*</FooterCached>'
    content = re.sub(pattern2, '<FooterCached />', content, flags=re.DOTALL)

    # Pattern for multi-line FooterCached with props
    pattern3 = r'<FooterCached\s+[^>]*?(?:\n\s*[^>]*?)*\s*/>'
    content = re.sub(pattern3, '<FooterCached />', content, flags=re.MULTILINE | re.DOTALL)

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"✅ Fixed: {filepath}")
        return True
    return False

def main():
    # Find all .tsx files in app directory
    files = glob.glob('app/**/*.tsx', recursive=True)

    fixed_count = 0
    for filepath in files:
        if fix_footer_in_file(filepath):
            fixed_count += 1

    print(f"\n🎉 Fixed {fixed_count} files")

if __name__ == '__main__':
    main()
