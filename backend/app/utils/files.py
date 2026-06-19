"""Filesystem helpers."""

import re
from pathlib import Path

# Tokens stripped when deriving company slug from upload filename.
_FILENAME_NOISE = frozenset(
    {
        "10k",
        "10-k",
        "10_k",
        "annual",
        "report",
        "filing",
        "form",
        "inc",
        "corp",
        "corporation",
        "ltd",
        "llc",
        "co",
        "company",
    }
)


def slugify_company(name: str) -> str:
    slug = name.strip().lower().replace(" ", "_")
    return re.sub(r"[^\w\-]", "", slug)


def derive_company_from_filename(filename: str) -> str:
    """
    Derive a company slug from a PDF filename.

    Examples:
        apple-10k.pdf       -> apple
        amazon_10k_2024.pdf -> amazon
        Salesforce.pdf      -> salesforce
    """
    stem = Path(filename).stem
    tokens = re.split(r"[\s\-_]+", stem.lower())

    for token in tokens:
        cleaned = re.sub(r"[^\w]", "", token)
        if not cleaned:
            continue
        if re.fullmatch(r"20\d{2}", cleaned) or re.fullmatch(r"fy\d{2}", cleaned):
            continue
        if cleaned in _FILENAME_NOISE:
            continue
        slug = slugify_company(cleaned)
        if slug:
            return slug

    fallback = slugify_company(re.sub(r"[\s\-_]+", "_", stem.lower()))
    for noise in _FILENAME_NOISE:
        fallback = re.sub(rf"(^|_){noise}(_|$)", "_", fallback)
    fallback = re.sub(r"_+", "_", fallback).strip("_")
    return fallback


def resolve_company_slug(company: str | None, filename: str) -> tuple[str, bool]:
    """
    Resolve company slug from explicit input or filename.

    Swagger UI often sends the literal placeholder "string" — treat that as omitted.
    Returns (slug, was_derived_from_filename).
    """
    if company:
        normalized = company.strip().lower()
        if normalized not in {"", "string", "null", "none"}:
            slug = slugify_company(company)
            if slug:
                return slug, False

    slug = derive_company_from_filename(filename)
    return slug, True


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path
