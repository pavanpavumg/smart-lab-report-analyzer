from app.services.reference_parser import parse_reference


def test_numeric_range():
    parsed = parse_reference("12.0 - 15.0")
    assert parsed.low == 12.0
    assert parsed.high == 15.0


def test_upto_range():
    parsed = parse_reference("Upto 31")
    assert parsed.low is None
    assert parsed.high == 31


def test_less_than_range():
    parsed = parse_reference("<200")
    assert parsed.high == 200


def test_greater_than_range():
    parsed = parse_reference(">45")
    assert parsed.low == 45


def test_space_delimited_range():
    parsed = parse_reference("2.3 6.1")
    assert parsed.low == 2.3
    assert parsed.high == 6.1


def test_gender_selection_space_delimited():
    from app.services.reference_parser import select_gender_range
    raw = "Male:3.6 -8.2 Female:2.3 6.1"
    assert select_gender_range(raw, "Female") == "2.3 - 6.1"
    assert select_gender_range(raw, "Male") == "3.6 -8.2"

