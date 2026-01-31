#!/usr/bin/env python3
"""
Video Signal Flow — Smoke Test
Runs basic validation checks after code changes.
Usage: python3 tests/smoke-test.py
"""

import json
import os
import re
import sys

# Paths relative to project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACKAGE_JSON = os.path.join(PROJECT_ROOT, "package.json")
INDEX_HTML = os.path.join(PROJECT_ROOT, "index.html")
CHANGELOG_TS = os.path.join(PROJECT_ROOT, "src", "changelog.ts")
TYPES_INDEX = os.path.join(PROJECT_ROOT, "src", "types", "index.ts")
NODES_INDEX = os.path.join(PROJECT_ROOT, "src", "components", "nodes", "index.ts")
NODE_CATEGORIES = os.path.join(PROJECT_ROOT, "src", "data", "nodeCategories.ts")
TSCONFIG = os.path.join(PROJECT_ROOT, "tsconfig.json")
TSCONFIG_APP = os.path.join(PROJECT_ROOT, "tsconfig.app.json")
TSCONFIG_NODE = os.path.join(PROJECT_ROOT, "tsconfig.node.json")
SRC_DIR = os.path.join(PROJECT_ROOT, "src")

passed = 0
failed = 0
warnings = 0


def ok(msg):
    global passed
    passed += 1
    print(f"  PASS  {msg}")


def fail(msg):
    global failed
    failed += 1
    print(f"  FAIL  {msg}")


def warn(msg):
    global warnings
    warnings += 1
    print(f"  WARN  {msg}")


# ---------------------------------------------------------------------------
# 1. package.json validation
# ---------------------------------------------------------------------------
def check_package_json():
    print("\n--- package.json ---")

    if not os.path.exists(PACKAGE_JSON):
        fail("package.json not found")
        return None

    try:
        with open(PACKAGE_JSON, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        fail(f"package.json is not valid JSON: {e}")
        return None

    ok("package.json is valid JSON")

    name = data.get("name")
    if not name:
        fail("package.json missing 'name' field")
    else:
        ok(f"package.json name: {name}")

    version = data.get("version")
    if not version:
        fail("package.json missing 'version' field")
        return None

    if not re.match(r"^\d+\.\d+\.\d+$", version):
        fail(f"package.json version '{version}' doesn't match X.X.X format")
    else:
        ok(f"package.json version format valid: {version}")

    scripts = data.get("scripts", {})
    for script_name in ["build", "dev"]:
        if script_name in scripts:
            ok(f"package.json has scripts.{script_name}")
        else:
            fail(f"package.json missing scripts.{script_name}")

    deps = data.get("dependencies", {})
    if deps:
        ok(f"package.json has {len(deps)} dependencies")
    else:
        fail("package.json has no dependencies")

    return version


# ---------------------------------------------------------------------------
# 2. Changelog version sync
# ---------------------------------------------------------------------------
def check_changelog_sync(expected_version):
    print("\n--- Changelog sync ---")

    if not os.path.exists(CHANGELOG_TS):
        fail("src/changelog.ts not found")
        return

    with open(CHANGELOG_TS, "r") as f:
        content = f.read()

    versions = re.findall(r"'(\d+\.\d+\.\d+)':\s*\[", content)

    if not versions:
        fail("No version entries found in changelog.ts")
        return

    latest_version = versions[0]

    if expected_version and latest_version != expected_version:
        fail(f"changelog.ts latest version '{latest_version}' != package.json '{expected_version}'")
    elif expected_version:
        ok(f"changelog.ts latest version matches package.json: {latest_version}")
    else:
        warn(f"changelog.ts latest version is {latest_version} but couldn't verify against package.json")


# ---------------------------------------------------------------------------
# 3. HTML structure validation
# ---------------------------------------------------------------------------
def check_html_structure():
    print("\n--- HTML structure ---")

    if not os.path.exists(INDEX_HTML):
        fail("index.html not found")
        return

    with open(INDEX_HTML, "r") as f:
        content = f.read()

    # Check DOCTYPE (Vite uses lowercase)
    if content.strip().lower().startswith("<!doctype html>"):
        ok("DOCTYPE present")
    else:
        fail("Missing <!doctype html>")

    # Check essential tags
    for tag in ["<html", "</html>", "<head>", "</head>", "<body", "</body>"]:
        if tag in content:
            ok(f"Found {tag}")
        else:
            fail(f"Missing {tag}")

    # Check React mount point
    if re.search(r'<div\s+id="root"', content):
        ok("Found <div id=\"root\"> mount point")
    else:
        fail("Missing <div id=\"root\"> mount point")

    # Check Vite entry point
    if re.search(r'<script\s+type="module"\s+src="/src/main\.tsx"', content):
        ok("Found module script pointing to src/main.tsx")
    else:
        fail("Missing <script type=\"module\" src=\"/src/main.tsx\">")


# ---------------------------------------------------------------------------
# 4. Node type registry consistency
# ---------------------------------------------------------------------------
def check_node_type_registry():
    print("\n--- Node type registry ---")

    # Extract keys from nodeTypes object
    if not os.path.exists(NODES_INDEX):
        fail("src/components/nodes/index.ts not found")
        return None

    with open(NODES_INDEX, "r") as f:
        nodes_content = f.read()

    # Extract the nodeTypes block
    match = re.search(r"export const nodeTypes\s*=\s*\{(.*?)\}", nodes_content, re.DOTALL)
    if not match:
        fail("Could not find nodeTypes object in nodes/index.ts")
        return None

    node_types_block = match.group(1)
    registry_types = set(re.findall(r"(\w+):\s*\w+", node_types_block))

    if not registry_types:
        fail("nodeTypes object appears empty")
        return None

    ok(f"nodeTypes registry has {len(registry_types)} types: {', '.join(sorted(registry_types))}")

    # Extract CustomNodeType union members
    if not os.path.exists(TYPES_INDEX):
        fail("src/types/index.ts not found")
        return registry_types

    with open(TYPES_INDEX, "r") as f:
        types_content = f.read()

    # Find the CustomNodeType block
    type_match = re.search(r"export type CustomNodeType\s*=(.*?);", types_content, re.DOTALL)
    if not type_match:
        fail("Could not find CustomNodeType union in types/index.ts")
        return registry_types

    type_block = type_match.group(1)
    union_types = set(re.findall(r"'(\w+)'", type_block))

    if not union_types:
        fail("CustomNodeType union appears empty")
        return registry_types

    ok(f"CustomNodeType union has {len(union_types)} types: {', '.join(sorted(union_types))}")

    # Compare the two sets
    in_registry_only = registry_types - union_types
    in_union_only = union_types - registry_types

    if in_registry_only:
        for t in sorted(in_registry_only):
            fail(f"'{t}' is in nodeTypes registry but missing from CustomNodeType union")

    if in_union_only:
        for t in sorted(in_union_only):
            fail(f"'{t}' is in CustomNodeType union but missing from nodeTypes registry")

    if not in_registry_only and not in_union_only:
        ok("nodeTypes registry and CustomNodeType union are in sync")

    return registry_types


# ---------------------------------------------------------------------------
# 5. Node category presets validation
# ---------------------------------------------------------------------------
def check_node_category_presets(registry_types):
    print("\n--- Node category presets ---")

    if not os.path.exists(NODE_CATEGORIES):
        fail("src/data/nodeCategories.ts not found")
        return

    if not registry_types:
        warn("Skipping preset validation — could not extract registry types")
        return

    with open(NODE_CATEGORIES, "r") as f:
        content = f.read()

    # Match only top-level preset type fields (on their own line),
    # not connector type fields inside inline { name: ..., type: ... } objects
    preset_types = set(re.findall(r"^\s+type:\s*'(\w+)'", content, re.MULTILINE))

    if not preset_types:
        fail("No preset type values found in nodeCategories.ts")
        return

    invalid_types = preset_types - registry_types
    if invalid_types:
        for t in sorted(invalid_types):
            fail(f"Preset references unknown node type '{t}'")
    else:
        ok(f"All {len(preset_types)} preset types are valid: {', '.join(sorted(preset_types))}")


# ---------------------------------------------------------------------------
# 6. Critical source file existence
# ---------------------------------------------------------------------------
def check_source_files():
    print("\n--- Critical source files ---")

    critical_files = [
        "src/App.tsx",
        "src/main.tsx",
        "src/changelog.ts",
        "src/types/index.ts",
        "src/components/nodes/index.ts",
        "src/data/nodeCategories.ts",
        "src/store/db.ts",
        "src/components/Sidebar.tsx",
        "src/components/edges/StyledEdge.tsx",
        "src/utils/createNodeFromPreset.ts",
        "src/hooks/useHistory.ts",
        "src/hooks/useClipboard.ts",
        "src/hooks/useEdgeColorSync.ts",
        "src/hooks/useExportPNG.ts",
        "src/hooks/useGearBuilder.ts",
        "src/hooks/useCascadeLock.ts",
        "src/hooks/useCanvasSettings.ts",
        "src/contexts/CascadeLockContext.ts",
        "vite.config.ts",
    ]

    missing = []
    for f in critical_files:
        full_path = os.path.join(PROJECT_ROOT, f)
        if not os.path.exists(full_path):
            missing.append(f)

    if missing:
        for f in missing:
            fail(f"Missing critical file: {f}")
    else:
        ok(f"All {len(critical_files)} critical source files exist")


# ---------------------------------------------------------------------------
# 7. Dangerous patterns check
# ---------------------------------------------------------------------------
def check_dangerous_patterns():
    print("\n--- Dangerous patterns ---")

    dangerous = {
        r"\beval\s*\(": "eval() usage",
        r"\bnew\s+Function\s*\(": "Function() constructor",
        r"\bdocument\.write\s*\(": "document.write()",
        r"\.innerHTML\s*=": "innerHTML assignment",
    }

    found_any = False
    for root, _dirs, files in os.walk(SRC_DIR):
        # Skip node_modules if somehow nested
        if "node_modules" in root:
            continue
        for filename in files:
            if not filename.endswith((".ts", ".tsx")):
                continue
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, PROJECT_ROOT)
            with open(filepath, "r") as f:
                lines = f.readlines()

            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith("//") or stripped.startswith("*"):
                    continue
                for pattern, desc in dangerous.items():
                    if re.search(pattern, line):
                        warn(f"{rel_path}:{i}: {desc} — {stripped[:80]}")
                        found_any = True

    if not found_any:
        ok("No dangerous patterns found across source files")


# ---------------------------------------------------------------------------
# 8. TypeScript config validation
# ---------------------------------------------------------------------------
def check_tsconfig():
    print("\n--- TypeScript config ---")

    for config_path, name in [
        (TSCONFIG, "tsconfig.json"),
        (TSCONFIG_APP, "tsconfig.app.json"),
        (TSCONFIG_NODE, "tsconfig.node.json"),
    ]:
        if not os.path.exists(config_path):
            fail(f"{name} not found")
            continue

        try:
            with open(config_path, "r") as f:
                content = f.read()
                # Strip block comments /* ... */ and line comments //
                stripped = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
                stripped = re.sub(r"//.*$", "", stripped, flags=re.MULTILINE)
                # Strip trailing commas before } or ]
                stripped = re.sub(r",\s*([}\]])", r"\1", stripped)
                data = json.loads(stripped)
        except json.JSONDecodeError as e:
            fail(f"{name} is not valid JSON: {e}")
            continue

        ok(f"{name} is valid JSON")

    # Check tsconfig.app.json specifics
    if os.path.exists(TSCONFIG_APP):
        try:
            with open(TSCONFIG_APP, "r") as f:
                content = f.read()
                stripped = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
                stripped = re.sub(r"//.*$", "", stripped, flags=re.MULTILINE)
                stripped = re.sub(r",\s*([}\]])", r"\1", stripped)
                data = json.loads(stripped)

            compiler_opts = data.get("compilerOptions", {})

            if compiler_opts.get("strict") is True:
                ok("tsconfig.app.json has strict: true")
            else:
                fail("tsconfig.app.json missing strict: true")

            if compiler_opts.get("jsx") == "react-jsx":
                ok("tsconfig.app.json has jsx: react-jsx")
            else:
                fail("tsconfig.app.json missing jsx: react-jsx")
        except json.JSONDecodeError:
            pass  # Already reported above


# ---------------------------------------------------------------------------
# 9. Console.log audit (warnings only)
# ---------------------------------------------------------------------------
def check_console_logs():
    print("\n--- Console.log audit ---")

    pattern = re.compile(r"console\.(log|debug)\s*\(")
    total_found = 0
    files_with_logs = set()

    for root, _dirs, files in os.walk(SRC_DIR):
        if "node_modules" in root:
            continue
        for filename in files:
            if not filename.endswith((".ts", ".tsx")):
                continue
            filepath = os.path.join(root, filename)
            rel_path = os.path.relpath(filepath, PROJECT_ROOT)
            with open(filepath, "r") as f:
                lines = f.readlines()

            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                if stripped.startswith("//") or stripped.startswith("*"):
                    continue
                if pattern.search(line):
                    warn(f"{rel_path}:{i}: {stripped[:80]}")
                    total_found += 1
                    files_with_logs.add(rel_path)

    if total_found == 0:
        ok("No console.log/debug statements found")
    else:
        warn(f"Found {total_found} console.log/debug statements in {len(files_with_logs)} files")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("=" * 60)
    print("Video Signal Flow — Smoke Test")
    print("=" * 60)

    pkg_version = check_package_json()
    check_changelog_sync(pkg_version)
    check_html_structure()
    registry_types = check_node_type_registry()
    check_node_category_presets(registry_types)
    check_source_files()
    check_dangerous_patterns()
    check_tsconfig()
    check_console_logs()

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {warnings} warnings")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
