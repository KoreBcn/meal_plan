"""Import Gmail receipt line items into Supabase."""

import base64
import argparse
import getpass
import hashlib
import json
import os
import re
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from email.header import decode_header, make_header
from email.message import Message
from email import policy
from email.parser import BytesParser
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request as URLRequest, urlopen

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


ACCOUNT_EMAIL = "c2015465@gmail.com"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
GMAIL_QUERY = "{subject:receipt subject:kvittering}"
RECEIPT_HISTORY_QUERY = (
    '{subject:"Netto receipts history" subject:"Anna receipt history"}'
)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CLIENT_SECRET_FILE = PROJECT_ROOT / "credentials.json"
TOKEN_FILE = PROJECT_ROOT / "token.json"
SUPABASE_CONFIG_FILE = PROJECT_ROOT / "supabase" / "supabase-config.js"
ITEM_DIMENSION_TABLE = "receipt_item_dimension"
FACT_TABLE = "receipt_item_facts"
DANISH_MONTHS = {
    name: number
    for number, name in enumerate(
        (
            "januar",
            "februar",
            "marts",
            "april",
            "maj",
            "juni",
            "juli",
            "august",
            "september",
            "oktober",
            "november",
            "december",
        ),
        start=1,
    )
}
PRICE_RE = re.compile(
    r"^\s*(?:(?:DKK|EUR|USD|GBP)\s*|[€$£]\s*)?"
    r"-?\d[\d., ]*\d{2}\s*"
    r"(?:(?:DKK|EUR|USD|GBP)|kr\.?|[€$£])?\s*$",
    re.I,
)
QUANTITY_RE = re.compile(
    r"^\s*(\d+(?:[.,]\d+)?)\s*([A-Za-zÆØÅæøå]+)?\s*$"
)
TRANSACTION_ID_RE = re.compile(
    r"\b(?:payment\s+reference|transaction(?:\s+(?:id|reference))?|"
    r"transaktions(?:id|nummer))\s*[:#]\s*([A-Z0-9-]+)",
    re.I,
)
DISCOUNT_LABEL_RE = re.compile(r"netto\s*plus\s*rabat|rabat", re.I)
DISCOUNT_AMOUNT_RE = re.compile(r"[-−]?\s*\d[\d., ]*\d{2}")


class ReceiptHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self.text: list[str] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tr":
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []
        elif tag == "br":
            self.text.append(" ")
            if self._cell is not None:
                self._cell.append(" ")

    def handle_endtag(self, tag: str) -> None:
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append(" ".join(" ".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if any(self._row):
                self.rows.append(self._row)
            self._row = None
        elif tag in ("p", "div", "h1", "h2", "h3", "h4", "li"):
            self.text.append(" ")

    def handle_data(self, data: str) -> None:
        normalized = " ".join(data.split())
        if normalized:
            self.text.append(normalized)
            if self._cell is not None:
                self._cell.append(normalized)


def load_supabase_config() -> tuple[str, str]:
    environment_url = os.environ.get("SUPABASE_URL")
    environment_key = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    if environment_url or environment_key:
        if not environment_url or not environment_key:
            raise ValueError(
                "Both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required."
            )
        return environment_url.rstrip("/"), environment_key

    if not SUPABASE_CONFIG_FILE.is_file():
        raise FileNotFoundError(
            f"Supabase config file not found: {SUPABASE_CONFIG_FILE}"
        )
    contents = SUPABASE_CONFIG_FILE.read_text(encoding="utf-8")
    url_match = re.search(r"url\s*:\s*['\"]([^'\"]+)['\"]", contents)
    key_match = re.search(
        r"publishableKey\s*:\s*['\"]([^'\"]+)['\"]", contents
    )
    if not url_match or not key_match:
        raise ValueError(
            f"{SUPABASE_CONFIG_FILE.name} must define url and publishableKey."
        )
    return url_match.group(1).rstrip("/"), key_match.group(1)


def send_supabase_request(
    base_url: str,
    publishable_key: str,
    access_token: str | None,
    method: str,
    path: str,
    payload=None,
    prefer: str | None = None,
):
    headers = {
        "apikey": publishable_key,
        "Accept": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    data = (
        json.dumps(payload, ensure_ascii=False).encode("utf-8")
        if payload is not None
        else None
    )
    request = URLRequest(
        f"{base_url}/{path.lstrip('/')}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=60) as response:
            response_body = response.read()
    except HTTPError as error:
        detail = error.read().decode("utf-8", "replace")
        raise RuntimeError(
            f"Supabase {method} {path} failed with HTTP {error.code}: {detail}"
        ) from error
    except URLError as error:
        raise RuntimeError(f"Could not connect to Supabase: {error.reason}") from error
    if not response_body:
        return None
    try:
        return json.loads(response_body)
    except json.JSONDecodeError as error:
        raise RuntimeError(
            f"Supabase returned invalid JSON for {method} {path}."
        ) from error


def authenticate_supabase() -> tuple[str, str, str]:
    base_url, publishable_key = load_supabase_config()
    email = os.environ.get("SUPABASE_EMAIL", "").strip()
    password = os.environ.get("SUPABASE_PASSWORD", "")
    if email or password:
        if not email or not password:
            raise ValueError(
                "Both SUPABASE_EMAIL and SUPABASE_PASSWORD are required."
            )
    elif os.environ.get("GITHUB_ACTIONS") == "true":
        raise ValueError(
            "Set SUPABASE_EMAIL and SUPABASE_PASSWORD in GitHub Actions secrets."
        )
    else:
        email = input("Supabase household account email: ").strip()
        password = getpass.getpass("Supabase account password: ")
    if not email or not password:
        raise ValueError("A Supabase account email and password are required.")
    result = send_supabase_request(
        base_url,
        publishable_key,
        None,
        "POST",
        "auth/v1/token?grant_type=password",
        {"email": email, "password": password},
    )
    access_token = result.get("access_token") if result else None
    if not access_token:
        raise RuntimeError("Supabase sign-in did not return an access token.")
    return base_url, publishable_key, access_token


def read_item_dimension(
    base_url: str, publishable_key: str, access_token: str
) -> list[dict]:
    return send_supabase_request(
        base_url,
        publishable_key,
        access_token,
        "GET",
        f"rest/v1/{ITEM_DIMENSION_TABLE}?select=id,name,normalized_name,category&limit=2000",
    )


def ensure_item_dimensions(
    base_url: str,
    publishable_key: str,
    access_token: str,
    imported_rows: list[dict[str, str]],
) -> dict[str, dict]:
    names = {}
    for row in imported_rows:
        name = " ".join(row["item"].split())
        normalized_name = normalized_item_name(name)
        if normalized_name:
            names.setdefault(normalized_name, name)
    if names:
        payload = [
            {"name": name, "normalized_name": normalized_name}
            for normalized_name, name in names.items()
        ]
        send_supabase_request(
            base_url,
            publishable_key,
            access_token,
            "POST",
            f"rest/v1/{ITEM_DIMENSION_TABLE}?on_conflict=normalized_name",
            payload,
            "resolution=ignore-duplicates,return=minimal",
        )
    dimensions = read_item_dimension(base_url, publishable_key, access_token)
    return {row["normalized_name"]: row for row in dimensions}


def write_receipt_facts(
    base_url: str,
    publishable_key: str,
    access_token: str,
    imported_rows: list[dict[str, str]],
) -> int:
    if not imported_rows:
        return 0
    dimensions = ensure_item_dimensions(
        base_url, publishable_key, access_token, imported_rows
    )
    facts = []
    for row in imported_rows:
        normalized_name = normalized_item_name(row["item"])
        dimension = dimensions.get(normalized_name)
        if not dimension:
            raise RuntimeError(
                f"Supabase item dimension did not return {row['item']!r}."
            )
        facts.append(
            {
                "source_key": row["source_key"],
                "purchase_date": row["date"],
                "item_id": dimension["id"],
                "amount": row["amount"],
                "price": row["price"],
                "price_per_unit": calculate_price_per_unit(
                    row["amount"], row["price"]
                ),
                "owner": row["owner"],
                "transaction_id": row.get("transaction_id") or None,
                "discount": row.get("discount") or None,
                "discount_plus": row.get("discount_plus") or None,
            }
        )
    inserted = send_supabase_request(
        base_url,
        publishable_key,
        access_token,
        "POST",
        f"rest/v1/{FACT_TABLE}?on_conflict=source_key",
        facts,
        "resolution=ignore-duplicates,return=representation",
    )
    sync_receipt_fact_owners(
        base_url, publishable_key, access_token, facts
    )
    return len(inserted or [])


def sync_receipt_fact_owners(
    base_url: str,
    publishable_key: str,
    access_token: str,
    facts: list[dict],
) -> None:
    source_keys_by_owner = {"A": [], "C": []}
    for fact in facts:
        source_keys_by_owner[fact["owner"]].append(fact["source_key"])

    for owner, source_keys in source_keys_by_owner.items():
        for offset in range(0, len(source_keys), 100):
            batch = source_keys[offset : offset + 100]
            if not batch:
                continue
            send_supabase_request(
                base_url,
                publishable_key,
                access_token,
                "PATCH",
                f"rest/v1/{FACT_TABLE}?source_key=in.({','.join(batch)})",
                {"owner": owner},
                "return=minimal",
            )


def clear_receipt_facts(
    base_url: str, publishable_key: str, access_token: str
) -> None:
    confirmation = input(
        "Type DELETE ALL RECEIPT FACTS to clear facts before reimport: "
    )
    if confirmation != "DELETE ALL RECEIPT FACTS":
        raise RuntimeError("Reset cancelled; no receipt facts were deleted.")
    send_supabase_request(
        base_url,
        publishable_key,
        access_token,
        "DELETE",
        f"rest/v1/{FACT_TABLE}?id=not.is.null",
        prefer="return=minimal",
    )


def get_gmail_service():
    """Return an authenticated Gmail API client from env credentials or local OAuth."""
    credentials = None
    environment_credentials = {
        "GMAIL_CLIENT_ID": os.environ.get("GMAIL_CLIENT_ID"),
        "GMAIL_CLIENT_SECRET": os.environ.get("GMAIL_CLIENT_SECRET"),
        "GMAIL_REFRESH_TOKEN": os.environ.get("GMAIL_REFRESH_TOKEN"),
    }
    if any(environment_credentials.values()):
        missing = [
            name for name, value in environment_credentials.items() if not value
        ]
        if missing:
            raise ValueError(
                "Missing GitHub Actions Gmail credential(s): "
                + ", ".join(missing)
            )
        credentials = Credentials(
            token=None,
            refresh_token=environment_credentials["GMAIL_REFRESH_TOKEN"],
            token_uri="https://oauth2.googleapis.com/token",
            client_id=environment_credentials["GMAIL_CLIENT_ID"],
            client_secret=environment_credentials["GMAIL_CLIENT_SECRET"],
            scopes=SCOPES,
        )
        credentials.refresh(Request())
    else:
        if TOKEN_FILE.exists():
            credentials = Credentials.from_authorized_user_file(
                str(TOKEN_FILE), SCOPES
            )

        if credentials and not credentials.has_scopes(SCOPES):
            credentials = None

        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        elif not credentials or not credentials.valid:
            if os.environ.get("GITHUB_ACTIONS") == "true":
                raise ValueError(
                    "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and "
                    "GMAIL_REFRESH_TOKEN in GitHub Actions secrets."
                )
            if not CLIENT_SECRET_FILE.exists():
                raise FileNotFoundError(
                    f"OAuth client file not found: {CLIENT_SECRET_FILE}. "
                    "Download a Desktop app OAuth client from Google Cloud and "
                    "save it as credentials.json."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                str(CLIENT_SECRET_FILE), SCOPES
            )
            credentials = flow.run_local_server(port=0)

        TOKEN_FILE.write_text(credentials.to_json(), encoding="utf-8")
    return build("gmail", "v1", credentials=credentials, cache_discovery=False)


def get_receipt_messages(service, query: str = GMAIL_QUERY) -> list[dict]:
    """Return all message references matching a Gmail search."""
    profile = service.users().getProfile(userId="me").execute()
    authenticated_email = profile["emailAddress"]
    if authenticated_email.casefold() != ACCOUNT_EMAIL.casefold():
        raise RuntimeError(
            f"Authenticated as {authenticated_email}, not {ACCOUNT_EMAIL}. "
            "Remove token.json and run again to choose the correct account."
        )

    messages = []
    page_token = None
    while True:
        response = (
            service.users()
            .messages()
            .list(
                userId="me",
                q=query,
                pageToken=page_token,
                maxResults=500,
            )
            .execute()
        )
        messages.extend(response.get("messages", []))
        page_token = response.get("nextPageToken")
        if not page_token:
            return messages


def iter_parts(part: dict):
    if part.get("parts"):
        for child in part["parts"]:
            yield from iter_parts(child)
    elif part.get("body", {}).get("data"):
        yield part


def decode_part(part: dict) -> str:
    encoded = part["body"]["data"]
    content = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4))
    content_type = next(
        (
            header["value"]
            for header in part.get("headers", [])
            if header["name"].casefold() == "content-type"
        ),
        part.get("mimeType", ""),
    )
    message = Message()
    message["Content-Type"] = content_type
    return content.decode(message.get_content_charset() or "utf-8", "replace")


def parse_plain_price(value: str) -> str | None:
    value = value.strip()
    if not PRICE_RE.fullmatch(value):
        return None

    value = re.sub(r"^(?:(?:DKK|EUR|USD|GBP)\s*|[€$£]\s*)", "", value, flags=re.I)
    value = re.sub(
        r"\s*(?:(?:DKK|EUR|USD|GBP)|kr\.?|[€$£])$", "", value, flags=re.I
    )
    value = value.replace(" ", "")
    if "," in value and "." in value:
        decimal_separator = "," if value.rfind(",") > value.rfind(".") else "."
        thousands_separator = "." if decimal_separator == "," else ","
        value = value.replace(thousands_separator, "")
        value = value.replace(decimal_separator, ".")
    else:
        value = value.replace(",", ".")
    return value


def parse_price_components(value: str) -> tuple[str | None, str | None, str | None]:
    pant = re.search(r"\+\s*pant\s*(.+?)\s*$", value, re.I)
    if not pant:
        price = parse_plain_price(value)
        return price, price, None

    deposit = parse_plain_price(pant.group(1))
    if deposit is None:
        return None, None, None
    base_text = value[:pant.start()].strip()
    base_price = parse_plain_price(base_text) if base_text else None
    total = Decimal(base_price or "0") + Decimal(deposit)
    return f"{total:.2f}", base_price, deposit


def parse_price(value: str) -> str | None:
    return parse_price_components(value)[0]


def extract_transaction_id(text: str) -> str:
    match = TRANSACTION_ID_RE.search(text)
    return match.group(1).strip() if match else ""


def normalized_item_name(value: str) -> str:
    return " ".join(value.casefold().split())


def parse_quantity(value: str) -> str | None:
    match = QUANTITY_RE.fullmatch(value)
    if not match:
        return None
    quantity = match.group(1).replace(",", ".")
    unit = match.group(2)
    return f"{quantity} {unit}" if unit else quantity


def calculate_price_per_unit(amount: str, price: str) -> str:
    match = QUANTITY_RE.fullmatch(amount)
    if not match:
        raise ValueError(f"Cannot calculate unit price from amount {amount!r}.")
    quantity = Decimal(match.group(1).replace(",", "."))
    if quantity <= 0:
        raise ValueError(f"Cannot calculate unit price from amount {amount!r}.")
    unit_price = (Decimal(price) / quantity).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return f"{unit_price:.2f}"


def receipt_owner(subject: str) -> str:
    decoded_subject = str(make_header(decode_header(subject)))
    return "A" if "kvittering" in decoded_subject.casefold() else "C"


def parse_row_discounts(cells: list[str]) -> tuple[dict[str, str], set[int]]:
    discounts = {"discount": "", "discount_plus": ""}
    consumed_cells = set()

    for cell_index, cell in enumerate(cells):
        labels = list(DISCOUNT_LABEL_RE.finditer(cell))
        for label_index, label in enumerate(labels):
            segment_end = (
                labels[label_index + 1].start()
                if label_index + 1 < len(labels)
                else len(cell)
            )
            value_text = cell[label.end() : segment_end]
            amount_match = DISCOUNT_AMOUNT_RE.search(value_text)
            if amount_match is None:
                for next_index in range(cell_index + 1, len(cells)):
                    candidate = cells[next_index].strip()
                    if not candidate:
                        continue
                    amount_match = DISCOUNT_AMOUNT_RE.search(candidate)
                    if amount_match:
                        consumed_cells.add(next_index)
                    break
            if amount_match is None:
                continue

            amount = parse_plain_price(
                amount_match.group().replace("−", "-").replace(" ", "")
            )
            if amount is None:
                continue
            field = (
                "discount_plus"
                if "netto" in label.group().casefold()
                else "discount"
            )
            total = Decimal(discounts[field] or "0") + abs(Decimal(amount))
            discounts[field] = f"{total:.2f}"

    return discounts, consumed_cells


def remove_discount_annotations(value: str) -> str:
    labels = list(DISCOUNT_LABEL_RE.finditer(value))
    return value[: labels[0].start()] if labels else value


def add_discount(current: str, value: str) -> str:
    return f"{Decimal(current or '0') + Decimal(value):.2f}"


def parse_item_rows(
    rows: list[list[str]],
) -> list[tuple[str, str, str, str | None, str, str]]:
    items = []
    for cells in rows:
        item = next((cell.strip() for cell in cells if cell.strip()), "")
        if not item:
            continue

        discounts, consumed_discount_cells = parse_row_discounts(cells)
        quantity = next(
            (parsed for cell in cells if (parsed := parse_quantity(cell))),
            None,
        )
        prices = []
        deposits = []
        for cell_index, cell in enumerate(cells):
            if cell_index in consumed_discount_cells:
                continue
            price_cell = remove_discount_annotations(cell)
            price, base_price, deposit = parse_price_components(price_cell)
            if price and base_price is not None:
                prices.append(base_price)
            if deposit:
                deposits.append(deposit)

        if quantity and (prices or deposits) and not re.search(
            r"\b(total|moms|subtotal|betaling|heraf)\b", item, re.I
        ):
            base_price = prices[-1] if prices else "0.00"
            deposit_total = sum((Decimal(value) for value in deposits), Decimal("0"))
            total_price = Decimal(base_price) + deposit_total
            items.append(
                (
                    item,
                    quantity,
                    f"{total_price:.2f}",
                    base_price if deposits else None,
                    discounts["discount"],
                    discounts["discount_plus"],
                )
            )
        elif any(discounts.values()) and items:
            previous = items[-1]
            items[-1] = (
                previous[0],
                previous[1],
                previous[2],
                previous[3],
                add_discount(previous[4], discounts["discount"])
                if discounts["discount"]
                else previous[4],
                add_discount(previous[5], discounts["discount_plus"])
                if discounts["discount_plus"]
                else previous[5],
            )
    return items


def parse_purchase_date(
    text: str, headers: dict, internal_date: str | None
) -> str:
    danish_date = re.search(
        r"\b(\d{1,2})\.\s*([A-Za-zÆØÅæøå]+)\s+(\d{4})\b", text, re.I
    )
    if danish_date:
        day, month_name, year = danish_date.groups()
        month = DANISH_MONTHS.get(month_name.casefold())
        if month:
            return date(int(year), month, int(day)).isoformat()

    iso_date = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
    if iso_date:
        return date.fromisoformat(iso_date.group(1)).isoformat()

    header_date = headers.get("date")
    if header_date:
        return parsedate_to_datetime(header_date).date().isoformat()
    if internal_date is None:
        return ""
    return datetime.fromtimestamp(
        int(internal_date) / 1000, tz=timezone.utc
    ).date().isoformat()


def extract_receipt(message: dict) -> list[dict[str, str]]:
    payload = message["payload"]
    parts = list(iter_parts(payload))
    html_bodies = [
        decode_part(part)
        for part in parts
        if part.get("mimeType") == "text/html"
    ]
    text_bodies = [
        decode_part(part)
        for part in parts
        if part.get("mimeType") == "text/plain"
    ]

    parsed_html = []
    for body in html_bodies:
        parser = ReceiptHTMLParser()
        parser.feed(body)
        parsed_html.append((parser, parse_item_rows(parser.rows)))

    if parsed_html:
        parser, items = max(parsed_html, key=lambda result: len(result[1]))
        body_text = " ".join(parser.text)
    else:
        body_text = " ".join(text_bodies)
        items = []

    headers = {
        header["name"].casefold(): header["value"]
        for header in payload.get("headers", [])
    }
    owner = receipt_owner(headers.get("subject", ""))
    purchase_date = parse_purchase_date(
        body_text, headers, message["internalDate"]
    )
    transaction_id = extract_transaction_id(body_text)
    receipt_identity = (
        transaction_id
        or next(
            (
                header["value"]
                for header in payload.get("headers", [])
                if header["name"].casefold() == "message-id"
            ),
            "",
        )
        or hashlib.sha256(body_text.encode("utf-8")).hexdigest()
    )
    return [
        {
            "date": purchase_date,
            "item": item,
            "category": "",
            "amount": amount,
            "price": price,
            "owner": owner,
            "transaction_id": transaction_id,
            "discount": discount,
            "discount_plus": discount_plus,
            "source_key": hashlib.sha256(
                f"{receipt_identity}:{purchase_date}:{line_number}".encode("utf-8")
            ).hexdigest(),
            "_pant_base_price": pant_base_price,
        }
        for line_number, (
            item,
            amount,
            price,
            pant_base_price,
            discount,
            discount_plus,
        ) in enumerate(items)
    ]


def extract_eml_receipt(raw_message: bytes) -> list[dict[str, str]]:
    """Extract receipt items from an attached .eml message."""
    email_message = BytesParser(policy=policy.default).parsebytes(raw_message)
    html_bodies = []
    text_bodies = []
    if email_message.is_multipart():
        parts = email_message.walk()
    else:
        parts = (email_message,)

    for part in parts:
        if part.get_content_maintype() == "multipart":
            continue
        if part.get_content_type() == "text/html":
            html_bodies.append(part.get_content())
        elif part.get_content_type() == "text/plain":
            text_bodies.append(part.get_content())

    headers = {
        key.casefold(): str(value)
        for key, value in email_message.items()
    }
    owner = receipt_owner(headers.get("subject", ""))
    message_date = headers.get("date")
    internal_date = None
    if message_date:
        internal_date = str(
            int(parsedate_to_datetime(message_date).timestamp() * 1000)
        )

    parsed_html = []
    for body in html_bodies:
        parser = ReceiptHTMLParser()
        parser.feed(body)
        parsed_html.append((parser, parse_item_rows(parser.rows)))

    if parsed_html:
        parser, items = max(parsed_html, key=lambda result: len(result[1]))
        body_text = " ".join(parser.text)
    else:
        body_text = " ".join(text_bodies)
        items = []

    purchase_date = parse_purchase_date(body_text, headers, internal_date)
    if not purchase_date:
        raise ValueError("Attached receipt has no recognizable purchase date.")
    transaction_id = extract_transaction_id(body_text)
    receipt_identity = (
        transaction_id
        or headers.get("message-id", "")
        or hashlib.sha256(raw_message).hexdigest()
    )

    return [
        {
            "date": purchase_date,
            "item": item,
            "category": "",
            "amount": amount,
            "price": price,
            "owner": owner,
            "transaction_id": transaction_id,
            "discount": discount,
            "discount_plus": discount_plus,
            "source_key": hashlib.sha256(
                f"{receipt_identity}:{purchase_date}:{line_number}".encode("utf-8")
            ).hexdigest(),
            "_pant_base_price": pant_base_price,
        }
        for line_number, (
            item,
            amount,
            price,
            pant_base_price,
            discount,
            discount_plus,
        ) in enumerate(items)
    ]


def iter_attachment_parts(part: dict):
    if part.get("filename") and part.get("body", {}).get("attachmentId"):
        yield part
    for child in part.get("parts", []):
        yield from iter_attachment_parts(child)


def read_netto_receipt_history(service) -> tuple[list[dict], int, int]:
    """Parse receipt .eml attachments from the Netto and Anna history emails."""
    history_messages = get_receipt_messages(service, RECEIPT_HISTORY_QUERY)
    if not history_messages:
        raise RuntimeError(
            "No Gmail message found with subject containing "
            '"Netto receipts history" or "Anna receipt history".'
        )

    imported_rows = []
    unparsed_count = 0
    skipped_count = 0

    for reference in history_messages:
        history_id = reference["id"]
        history_message = (
            service.users()
            .messages()
            .get(userId="me", id=history_id, format="full")
            .execute()
        )
        for attachment in iter_attachment_parts(history_message["payload"]):
            attachment_id = attachment["body"]["attachmentId"]
            if (
                attachment.get("mimeType") != "message/rfc822"
                and not attachment["filename"].casefold().endswith(".eml")
            ):
                skipped_count += 1
                continue

            attachment_data = (
                service.users()
                .messages()
                .attachments()
                .get(userId="me", messageId=history_id, id=attachment_id)
                .execute()
            )
            raw_message = base64.urlsafe_b64decode(
                attachment_data["data"]
                + "=" * (-len(attachment_data["data"]) % 4)
            )
            try:
                rows = extract_eml_receipt(raw_message)
            except (ValueError, TypeError):
                unparsed_count += 1
                continue

            if not rows:
                unparsed_count += 1
                continue
            imported_rows.extend(rows)

    print(f"Found {len(history_messages)} receipt-history email(s).")
    if skipped_count:
        print(f"Skipped {skipped_count} non-EML attachment(s).")
    if unparsed_count:
        print(
            f"Could not parse {unparsed_count} EML attachment(s)."
        )
    return imported_rows, unparsed_count, skipped_count


def read_regular_receipt_rows(service) -> tuple[list[dict], list[str], int]:
    message_refs = get_receipt_messages(service)
    imported_rows = []
    unparsed = []
    for reference in message_refs:
        message = (
            service.users()
            .messages()
            .get(userId="me", id=reference["id"], format="full")
            .execute()
        )
        rows = extract_receipt(message)
        if rows:
            imported_rows.extend(rows)
            continue
        subject = next(
            (
                header["value"]
                for header in message["payload"].get("headers", [])
                if header["name"].casefold() == "subject"
            ),
            "(no subject)",
        )
        unparsed.append(subject)
    return imported_rows, unparsed, len(message_refs)


def main() -> None:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    mode = argument_parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--netto-history",
        action="store_true",
        help="Import EML receipt attachments from the Netto and Anna history emails into Supabase.",
    )
    mode.add_argument(
        "--reset-and-netto-history",
        action="store_true",
        help="Parse both history emails, confirm deleting all receipt facts, then reimport them.",
    )
    args = argument_parser.parse_args()

    base_url, publishable_key, access_token = authenticate_supabase()
    service = get_gmail_service()
    if args.netto_history or args.reset_and_netto_history:
        imported_rows, unparsed_count, _ = read_netto_receipt_history(service)
        if args.reset_and_netto_history:
            if not imported_rows or unparsed_count:
                raise RuntimeError(
                    "Refusing to reset receipt facts because the history "
                    "attachments were empty or not all parsed successfully."
                )
            clear_receipt_facts(base_url, publishable_key, access_token)
        inserted_count = write_receipt_facts(
            base_url, publishable_key, access_token, imported_rows
        )
        print(
            f"Parsed {len(imported_rows)} line items; inserted "
            f"{inserted_count} new receipt facts into Supabase."
        )
        return

    imported_rows, unparsed, message_count = read_regular_receipt_rows(service)
    inserted_count = write_receipt_facts(
        base_url, publishable_key, access_token, imported_rows
    )
    print(f"Connected to {ACCOUNT_EMAIL} with read-only Gmail access.")
    print(
        f"Found {message_count} email(s) matching {GMAIL_QUERY!r}; "
        f"parsed {len(imported_rows)} line items and inserted "
        f"{inserted_count} new receipt facts into Supabase."
    )
    if unparsed:
        print(
            f"Could not identify line items in {len(unparsed)} message(s); "
            "they can be retried after parser updates."
        )
        for subject in unparsed:
            print(f"  - {subject}")


if __name__ == "__main__":
    main()
