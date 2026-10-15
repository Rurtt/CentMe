"""Build and verify the curated documentation-only team handoff."""

from pathlib import Path
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "exports" / "team-package"
ARCHIVE = ROOT / "exports" / "p2p-our-team-handoff-2026-10-15.zip"
PREFIX = ARCHIVE.stem

source_api = (ROOT / "docs" / "api-contract.md").read_text(encoding="utf-8")
packaged_api = source_api
replacements = {
    "superpowers/specs/2026-10-15-p2p-sandbox-scope-and-next-steps.md": "current-scope.md",
    "[friend's technical specification](research/2026-10-15-friend-handoff/TECHNICAL-SPEC.md)":
        "friend's earlier technical specification (see the [merged-v2 comparison](handoff-comparison.md))",
    "Backend owner implements the envelope, session/ownership rules, schema/uniqueness, money math, transitions and simulator modules. Frontend owner consumes the same snapshots and keeps idempotency keys stable across a retried logical action. Blockchain owner implements persisted signing and receipt verification behind a server-only module. QA/presentation owner tests arithmetic, two-session isolation, replay/conflict behavior, expiry, refresh/resume, known failure and unknown outcome.":
        "Slot 2 implements sessions/ownership helpers, recipients, quote math and quote expiry. Slot 3 owns shared schema, envelopes, transfer uniqueness, transitions, simulators and integration. Slot 1 consumes the shared snapshots and keeps idempotency keys stable across a retried logical action. Slot 4 implements persisted signing and receipt verification behind a server-only module. All four owners test their modules and share end-to-end QA and presentation work; see the team handoff for proposed boundaries.",
}
for old, new in replacements.items():
    assert packaged_api.count(old) == 1, f"Expected one API text replacement: {old[:60]}"
    packaged_api = packaged_api.replace(old, new)
(PACKAGE / "docs" / "api-contract.md").write_text(packaged_api, encoding="utf-8", newline="\n")

json_pattern = re.compile(r"```json\s*\n(.*?)```", re.DOTALL)
assert json_pattern.findall(source_api) == json_pattern.findall(packaged_api), "API JSON examples changed"

expected_content = {
    "README.md", "docs/current-scope.md", "docs/team-handoff.md", "docs/api-contract.md",
    "docs/handoff-comparison.md", "docs/acceptance-checklist.md", "docs/cost-and-sponsor-notes.md",
    "docs/backend-fuji-integration.md",
}
content_files = sorted(p for p in PACKAGE.rglob("*") if p.is_file() and p.name != "MANIFEST.json")
assert {p.relative_to(PACKAGE).as_posix() for p in content_files} == expected_content

link_count = 0
json_count = 0
for path in content_files:
    content = path.read_text(encoding="utf-8")
    for target in re.findall(r"\]\(([^)]+)\)", content):
        if re.match(r"(?:https?://|mailto:|#)", target):
            continue
        relative_target = target.split("#", 1)[0]
        resolved = (path.parent / relative_target).resolve()
        assert resolved.is_relative_to(PACKAGE.resolve()), f"Escaping link: {path}: {target}"
        assert resolved.is_file(), f"Broken local link: {path}: {target}"
        link_count += 1
    for example in json_pattern.findall(content):
        json.loads(example)
        json_count += 1
    assert "PRIVATE KEY-----" not in content
    assert not re.search(r"\b(?:sk_live_|sk_test_)[A-Za-z0-9]{16,}\b", content)

manifest = {
    "package": PREFIX,
    "preparedDate": "2026-10-15",
    "timezone": "Asia/Bangkok",
    "status": "Documentation only; proposed interfaces; no product tests or transactions verified",
    "source": "Current workspace documentation and review of user-supplied merged-v2 archive",
    "apiChanges": "Relative references and proposed ownership paragraph only; all JSON examples preserved",
    "validation": {
        "relativeMarkdownLinks": link_count,
        "parseableJsonExamples": json_count,
        "apiJsonExamplesUnchanged": True,
        "archivePayloadAllowlist": True,
    },
    "files": [
        {"path": p.relative_to(PACKAGE).as_posix(), "bytes": p.stat().st_size,
         "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
        for p in content_files
    ],
}
(PACKAGE / "MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(PACKAGE.rglob("*")):
        if path.is_file():
            archive.write(path, PREFIX + "/" + path.relative_to(PACKAGE).as_posix())

with zipfile.ZipFile(ARCHIVE) as archive:
    assert archive.testzip() is None, "Archive CRC failure"
    names = archive.namelist()
    assert len(names) == len(set(names)) == len(expected_content) + 1
    assert set(names) == {PREFIX + "/" + p for p in expected_content | {"MANIFEST.json"}}
    reread = json.loads(archive.read(PREFIX + "/MANIFEST.json"))
    for record in reread["files"]:
        payload = archive.read(PREFIX + "/" + record["path"])
        assert len(payload) == record["bytes"]
        assert hashlib.sha256(payload).hexdigest() == record["sha256"]

print(json.dumps({
    "archive": str(ARCHIVE), "bytes": ARCHIVE.stat().st_size,
    "archiveFiles": len(names), "markdownFiles": len(content_files),
    "relativeLinksVerified": link_count, "jsonExamplesParsed": json_count,
    "apiExamplesUnchanged": True, "archiveCrcAndManifestHashes": "PASS",
}, indent=2))
