#!/usr/bin/env python3
"""
BookStudio Blueprint Verification Script
Verifies that all required architecture documents, PRD, FR issues, and AGENTS.md exist.
"""

import os
import sys

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

REQUIRED_FILES = [
    "AGENTS.md",
    "docs/Project_Requirements.md",
    "docs/Coding_Guidelines.md",
    "docs/Builder_Prompt.md",
    "docs/issues/FR-001.md",
    "docs/issues/FR-002.md",
    "docs/issues/FR-003.md",
    "docs/issues/FR-004.md",
    "docs/issues/FR-005.md",
    "docs/issues/FR-006.md",
    "docs/issues/FR-007.md",
    "docs/issues/FR-008.md",
    "docs/issues/FR-009.md",
    "docs/issues/FR-010.md",
]

def verify():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"🔍 Verifying BookStudio Genesis files in: {root}")
    
    missing = []
    for file_rel in REQUIRED_FILES:
        full_path = os.path.join(root, file_rel)
        if os.path.exists(full_path):
            print(f"  ✅ Found: {file_rel}")
        else:
            print(f"  ❌ Missing: {file_rel}")
            missing.append(file_rel)

    if missing:
        print(f"\n❌ Verification failed! {len(missing)} files missing.")
        sys.exit(1)
    else:
        print(f"\n🎉 All {len(REQUIRED_FILES)} blueprint files verified successfully!")
        sys.exit(0)

if __name__ == "__main__":
    verify()
