import re
from dataclasses import dataclass


@dataclass
class ExtractedMeasurement:
    value: float
    unit: str
    raw_text: str
    context: str


# Map of unit patterns to their canonical forms
UNIT_PATTERNS = {
    # Volume
    r"\b(mL|milliliters?|millilitres?)\b": "mL",
    r"\b(μL|microliters?|microlitres?)\b": "μL",
    r"\b(L|liters?|litres?)\b": "L",
    # Mass
    r"\b(μg|micrograms?)\b": "μg",
    r"\b(mg|milligrams?)\b": "mg",
    r"\b(g|grams?)\b": "g",
    r"\b(kg|kilograms?)\b": "kg",
    # Moles
    r"\b(mmol|millimoles?)\b": "mmol",
    r"\b(mol|moles?)\b": "mol",
    # Temperature
    r"\b(°C|degrees?\s*[Cc]elsius|degrees?\s*[Cc]entigrade)\b": "°C",
    r"\b(°F|degrees?\s*[Ff]ahrenheit)\b": "°F",
    r"\b(K|[Kk]elvin)\b": "K",
    # Concentration
    r"\b(pH)\b": "pH",
    r"\b(M|molar)\b": "M",
    r"\b(ppm|parts?\s*per\s*million)\b": "ppm",
    r"\b(ppb|parts?\s*per\s*billion)\b": "ppb",
    # Pressure
    r"\b(psi)\b": "psi",
    r"\b(bar)\b": "bar",
    # Speed/frequency
    r"\b(rpm|RPM)\b": "rpm",
    r"\b(Hz|hertz)\b": "Hz",
    # Length
    r"\b(nm|nanometers?|nanometres?)\b": "nm",
    r"\b(μm|micrometers?|micrometres?|microns?)\b": "μm",
    r"\b(mm|millimeters?|millimetres?)\b": "mm",
    r"\b(cm|centimeters?|centimetres?)\b": "cm",
    r"\b(m|meters?|metres?)\b": "m",
    # Percentage
    r"\b(%|percent)\b": "%",
}

# Number words for converting spoken numbers
WORD_TO_NUM = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000,
}


def _spoken_number_to_float(text: str) -> float | None:
    """Try to convert spoken number words to a float value."""
    text = text.strip().lower()

    # Handle "point" for decimals: "five point three" -> 5.3
    if " point " in text:
        parts = text.split(" point ", 1)
        integer_part = _spoken_number_to_float(parts[0])
        decimal_text = parts[1].strip()
        if integer_part is None:
            return None
        # Decimal digits: "three" -> 3, "one five" -> 15 (as .15)
        decimal_digits = []
        for word in decimal_text.split():
            if word in WORD_TO_NUM and WORD_TO_NUM[word] < 10:
                decimal_digits.append(str(WORD_TO_NUM[word]))
            else:
                return None
        if decimal_digits:
            return integer_part + float("0." + "".join(decimal_digits))
        return integer_part

    # Simple number word conversion
    words = text.split()
    if not words:
        return None

    total = 0
    current = 0
    for word in words:
        word = word.replace("-", "")
        if word not in WORD_TO_NUM:
            return None
        val = WORD_TO_NUM[word]
        if val == 100:
            current = (current if current else 1) * 100
        elif val == 1000:
            current = (current if current else 1) * 1000
            total += current
            current = 0
        else:
            current += val

    return float(total + current)


def _get_context(text: str, match_start: int, match_end: int, window: int = 80) -> str:
    """Extract surrounding context around a match."""
    start = max(0, match_start - window)
    end = min(len(text), match_end + window)
    context = text[start:end].strip()
    if start > 0:
        context = "..." + context
    if end < len(text):
        context = context + "..."
    return context


def extract_measurements(transcript: str) -> list[ExtractedMeasurement]:
    """Extract measurements with units from a transcript."""
    if not transcript:
        return []

    measurements = []
    used_spans = set()

    # Build combined unit regex
    all_units = "|".join(f"(?:{pattern})" for pattern in UNIT_PATTERNS.keys())

    # Pattern 1: Numeric value followed by unit (e.g., "5.3 mL", "100mg")
    numeric_pattern = rf"(\d+\.?\d*)\s*({all_units})"
    for match in re.finditer(numeric_pattern, transcript, re.IGNORECASE):
        span = (match.start(), match.end())
        if any(s[0] <= span[0] < s[1] or s[0] < span[1] <= s[1] for s in used_spans):
            continue

        value_str = match.group(1)
        unit_text = match.group(2)

        # Resolve canonical unit
        canonical_unit = _resolve_unit(unit_text)
        if canonical_unit:
            measurements.append(ExtractedMeasurement(
                value=float(value_str),
                unit=canonical_unit,
                raw_text=match.group(0).strip(),
                context=_get_context(transcript, match.start(), match.end()),
            ))
            used_spans.add(span)

    # Pattern 2: Spoken number words followed by unit
    # e.g., "five point three milliliters"
    number_words = "|".join(WORD_TO_NUM.keys())
    spoken_pattern = rf"((?:(?:{number_words})[\s-]*(?:point\s+)?)+)\s+({all_units})"
    for match in re.finditer(spoken_pattern, transcript, re.IGNORECASE):
        span = (match.start(), match.end())
        if any(s[0] <= span[0] < s[1] or s[0] < span[1] <= s[1] for s in used_spans):
            continue

        number_text = match.group(1)
        unit_text = match.group(2)

        value = _spoken_number_to_float(number_text)
        canonical_unit = _resolve_unit(unit_text)

        if value is not None and canonical_unit:
            measurements.append(ExtractedMeasurement(
                value=value,
                unit=canonical_unit,
                raw_text=match.group(0).strip(),
                context=_get_context(transcript, match.start(), match.end()),
            ))
            used_spans.add(span)

    return measurements


def _resolve_unit(unit_text: str) -> str | None:
    """Resolve a unit string to its canonical form."""
    for pattern, canonical in UNIT_PATTERNS.items():
        if re.match(pattern, unit_text, re.IGNORECASE):
            return canonical
    return None
