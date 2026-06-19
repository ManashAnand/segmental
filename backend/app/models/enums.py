"""Domain enumerations."""

from enum import Enum


class ExtractionField(str, Enum):
    GEOGRAPHIC_REVENUE = "geographic_revenue"
    SEGMENT_REVENUE = "segment_revenue"
    RND_EXPENSE = "rnd_expense"


class ExtractionVersion(str, Enum):
    V1 = "v1"
    V2 = "v2"


class ErrorCategory(str, Enum):
    WRONG_PAGE_RETRIEVED = "wrong_page_retrieved"
    CORRECT_PAGE_WRONG_VALUE = "correct_page_wrong_value"
    MULTIPLE_FISCAL_YEARS = "multiple_fiscal_years"
    TABLE_PARSING_FAILURE = "table_parsing_failure"
    DIFFERENT_TERMINOLOGY = "different_terminology"
