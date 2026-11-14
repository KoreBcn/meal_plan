import base64
import unittest
from unittest.mock import MagicMock, patch

from scripts import gmail_api


def gmail_message(subject, html):
    encoded = base64.urlsafe_b64encode(html.encode("utf-8")).decode("ascii")
    return {
        "internalDate": "1793232000000",
        "payload": {
            "headers": [
                {"name": "Subject", "value": subject},
                {"name": "Message-ID", "value": "<test@example.test>"},
            ],
            "mimeType": "text/html",
            "body": {"data": encoded},
        },
    }


class ReceiptImportTests(unittest.TestCase):
    def test_fotex_receipt_combined_quantity_and_price(self):
        message = gmail_message(
            "Fwd: Receipt from Føtex",
            """
            <p>29. oktober 2026</p><table>
            <tr><td>Potatoes<br>3 x 17,00</td><td>3 stk<br>51,00</td></tr>
            <tr><td>Oranges</td><td>1 stk<br>20,00</td></tr>
            <tr><td>HERAF PANT IALT</td><td>1,50</td></tr>
            <tr><td>TOTAL</td><td>71,00</td></tr>
            </table>
            """,
        )
        rows = gmail_api.extract_receipt(message)
        self.assertEqual(
            [(r["item"], r["amount"], r["price"]) for r in rows],
            [("Potatoes", "3 stk", "51.00"), ("Oranges", "1 stk", "20.00")],
        )
        self.assertTrue(all(r["date"] == "2026-10-29" for r in rows))
        self.assertTrue(all(r["supermarket"] == "Føtex" for r in rows))
        self.assertEqual(rows, gmail_api.extract_receipt(message))

    def test_existing_netto_format_and_subject_priority(self):
        rows = gmail_api.extract_receipt(
            gmail_message(
                "Netto Receipt",
                "<p>2026-10-29</p><table>"
                "<tr><td>Milk</td><td>2 stk</td><td>24,00</td></tr>"
                "</table>",
            )
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["supermarket"], "Netto")
        self.assertEqual((rows[0]["amount"], rows[0]["price"]), ("2 stk", "24.00"))
        self.assertEqual(gmail_api.receipt_supermarket("Kvittering"), "")

    def test_extracts_arbitrary_supermarket_and_parses_mixed_layouts(self):
        message = gmail_message(
            "Fwd: Receipt from Netto City",
            "<p>2026-10-29</p><table>"
            "<tr><td>Milk</td><td>2 stk</td><td>24,00</td></tr>"
            "<tr><td>Bread</td><td>1 stk 15,00</td></tr>"
            "</table>",
        )
        rows = gmail_api.extract_receipt(message)
        self.assertEqual([r["item"] for r in rows], ["Milk", "Bread"])
        self.assertTrue(all(r["supermarket"] == "Netto City" for r in rows))
        self.assertEqual(gmail_api.receipt_supermarket("Receipt"), "")
        self.assertEqual(
            gmail_api.receipt_supermarket("Receipt from =?utf-8?q?F=C3=B8tex?="),
            "Føtex",
        )
        self.assertEqual(
            gmail_api.receipt_supermarket(
                "Receipt from Føtex Rødovre - 29. oktober 2026"
            ),
            "Føtex",
        )
        self.assertEqual(
            gmail_api.receipt_supermarket("Receipt from Netto City - 2026-10-29"),
            "Netto City",
        )

    def test_discounts_are_stored_without_polluting_product_names(self):
        rows = gmail_api.extract_receipt(
            gmail_message(
                "Receipt from Føtex",
                "<p>2026-10-29</p><table>"
                "<tr><td>Milk<br>Rabat: -7,00</td><td>1 stk<br>25,00</td></tr>"
                "<tr><td>Bread<br>2 x 10,00<br>Rabat: -2,50</td>"
                "<td>2 stk<br>17,50</td></tr>"
                "<tr><td>Netto Plus rabat</td><td>-1,00</td></tr>"
                "<tr><td>Eggs</td><td>1 stk</td><td>20,00</td></tr>"
                "</table>",
            )
        )
        self.assertEqual(
            [(r["item"], r["price"], r["discount"], r["discount_plus"]) for r in rows],
            [
                ("Milk", "25.00", "7.00", ""),
                ("Bread", "17.50", "2.50", "1.00"),
                ("Eggs", "20.00", "", ""),
            ],
        )

    def test_eml_fotex_receipt(self):
        raw = (
            b"Subject: Receipt from =?utf-8?q?F=C3=B8tex?=\n"
            b"Date: Thu, 29 Oct 2026 10:00:00 +0000\n"
            b"Message-ID: <test@example.test>\n"
            b"Content-Type: text/html; charset=utf-8\n\n"
            b"<table><tr><td>Milk</td><td>1 stk 12,00</td></tr></table>"
        )
        rows = gmail_api.extract_eml_receipt(raw)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["supermarket"], "Føtex")
        self.assertEqual(rows[0]["price"], "12.00")

    def test_netto_history_overrides_generic_receipt_subject(self):
        raw = (
            b"Subject: Receipt\n"
            b"Date: Thu, 29 Oct 2026 10:00:00 +0000\n"
            b"Content-Type: text/html; charset=utf-8\n\n"
            b"<table><tr><td>Milk</td><td>1 stk</td><td>12,00</td></tr></table>"
        )
        service = MagicMock()
        messages = service.users.return_value.messages.return_value
        messages.get.return_value.execute.return_value = {
            "payload": {
                "parts": [{
                    "filename": "receipt.eml",
                    "mimeType": "message/rfc822",
                    "body": {"attachmentId": "attachment"},
                }]
            }
        }
        messages.attachments.return_value.get.return_value.execute.return_value = {
            "data": base64.urlsafe_b64encode(raw).decode("ascii")
        }
        with patch.object(gmail_api, "get_receipt_messages", return_value=[{"id": "history"}]):
            rows, unparsed, _ = gmail_api.read_netto_receipt_history(service)
        self.assertEqual(unparsed, 0)
        self.assertEqual(rows[0]["supermarket"], "Netto")

    def test_existing_facts_refresh_known_supermarket_without_clearing_unknown(self):
        facts = [
            {"source_key": "a", "owner": "C", "supermarket": "Føtex"},
            {"source_key": "b", "owner": "A", "supermarket": None},
        ]
        with patch.object(gmail_api, "send_supabase_request") as request:
            gmail_api.sync_receipt_fact_metadata("url", "key", "token", facts)
        self.assertEqual(request.call_count, 2)
        self.assertEqual(
            request.call_args_list[0].args[5],
            {"owner": "C", "supermarket": "Føtex"},
        )
        self.assertEqual(request.call_args_list[1].args[5], {"owner": "A"})

    def test_write_sends_supermarket_with_fact(self):
        row = {
            "source_key": "a",
            "date": "2026-10-29",
            "item": "Milk",
            "amount": "2 stk",
            "price": "24.00",
            "owner": "C",
            "supermarket": "Føtex",
        }
        with (
            patch.object(
                gmail_api, "ensure_item_dimensions", return_value={"milk": {"id": "id"}}
            ),
            patch.object(gmail_api, "send_supabase_request", return_value=[{}]) as request,
        ):
            self.assertEqual(gmail_api.write_receipt_facts("url", "key", "token", [row]), 1)
        fact = request.call_args_list[0].args[5][0]
        self.assertEqual(fact["supermarket"], "Føtex")
        self.assertEqual(fact["price_per_unit"], "12.00")

    def test_reimport_refreshes_discounts_and_corrected_product(self):
        row = {
            "source_key": "a",
            "date": "2026-10-29",
            "item": "Milk",
            "amount": "1 stk",
            "price": "25.00",
            "owner": "C",
            "supermarket": "Føtex",
            "discount": "7.00",
            "discount_plus": "1.00",
        }
        with (
            patch.object(
                gmail_api, "ensure_item_dimensions", return_value={"milk": {"id": "id"}}
            ),
            patch.object(gmail_api, "send_supabase_request", return_value=[]) as request,
        ):
            self.assertEqual(gmail_api.write_receipt_facts("url", "key", "token", [row]), 0)
        fact = request.call_args_list[0].args[5][0]
        self.assertEqual((fact["discount"], fact["discount_plus"]), ("7.00", "1.00"))
        self.assertEqual(
            request.call_args_list[2].args[5],
            {"item_id": "id", "discount": "7.00", "discount_plus": "1.00"},
        )


if __name__ == "__main__":
    unittest.main()
