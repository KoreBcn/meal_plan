import io
import json
import unittest
from urllib.error import HTTPError
from unittest.mock import patch

from scripts import categorize_receipts as categorizer


class CategorizeReceiptTests(unittest.TestCase):
    def setUp(self):
        environment = patch.dict("os.environ", {
            "CLOUDFLARE_ACCOUNT_ID": "test-account",
            "CLOUDFLARE_API_TOKEN": "test-token",
        })
        environment.start()
        self.addCleanup(environment.stop)

    def test_reads_all_pages_and_finds_blank_categories(self):
        first_page = [
            {"id": str(i), "name": "item", "category": "Dairy"}
            for i in range(categorizer.PAGE_SIZE)
        ]
        second_page = [
            {"id": "null", "name": "Milk", "category": None},
            {"id": "blank", "name": "Bread", "category": "  "},
        ]
        with patch.object(
            categorizer, "send_supabase_request", side_effect=[first_page, second_page]
        ) as request:
            items = categorizer.read_uncategorized_items("url", "key", "token")
        self.assertEqual([item["id"] for item in items], ["null", "blank"])
        self.assertIn("offset=500", request.call_args_list[1].args[4])

    def test_model_response_and_cloudflare_request(self):
        content = {"items": [
            {"index": 1, "category": None, "confidence": "low"},
            {"index": 0, "category": "Dairy", "confidence": "high"},
        ]}
        for value in (content, json.dumps(content)):
            with self.subTest(value=value):
                response = io.BytesIO(json.dumps({
                    "success": True, "result": {"response": value}
                }).encode())
                with patch.object(categorizer, "urlopen", return_value=response) as urlopen:
                    result = categorizer.categorize_batch([{"name": "Milk"}, {"name": "?"}])
                request = urlopen.call_args.args[0]
                self.assertEqual(
                    request.full_url,
                    "https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/"
                    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
                )
                self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
                payload = json.loads(request.data)
                self.assertEqual(payload["response_format"]["type"], "json_schema")
                self.assertIn("Milk", payload["prompt"])
                self.assertEqual(result, content["items"])

    def test_rejects_malformed_or_incomplete_predictions(self):
        items = [{"name": "Milk"}, {"name": "Bread"}]
        cases = [
            [{"index": 0, "category": "Dairy", "confidence": "high"}],
            [{"index": 0, "category": "Dairy", "confidence": "high"}] * 2,
            [{"index": 0, "category": "Invented", "confidence": "high"},
             {"index": 1, "category": "Bakery", "confidence": "high"}],
        ]
        for predictions in cases:
            with self.subTest(predictions=predictions):
                response = io.BytesIO(json.dumps({
                    "success": True, "result": {"response": {"items": predictions}}
                }).encode())
                with patch.object(categorizer, "urlopen", return_value=response):
                    with self.assertRaisesRegex(RuntimeError, "Invalid Cloudflare"):
                        categorizer.categorize_batch(items)

    def test_cloudflare_errors_are_reported(self):
        response = io.BytesIO(json.dumps({
            "success": False, "errors": [{"message": "Model unavailable"}]
        }).encode())
        with patch.object(categorizer, "urlopen", return_value=response):
            with self.assertRaisesRegex(RuntimeError, "Model unavailable"):
                categorizer.categorize_batch([{"name": "Milk"}])
        error = HTTPError("https://example.test", 429, "Too Many Requests", {}, io.BytesIO(b"quota exceeded"))
        with patch.object(categorizer, "urlopen", side_effect=error):
            with self.assertRaisesRegex(RuntimeError, "HTTP 429.*quota exceeded"):
                categorizer.categorize_batch([{"name": "Milk"}])

    def test_missing_cloudflare_credentials_fail_before_request(self):
        with (
            patch.dict("os.environ", {"CLOUDFLARE_API_TOKEN": ""}),
            patch.object(categorizer, "urlopen") as urlopen,
        ):
            with self.assertRaisesRegex(ValueError, "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"):
                categorizer.categorize_batch([{"name": "Milk"}])
        urlopen.assert_not_called()

    def test_no_items_does_not_call_cloudflare(self):
        with (
            patch.object(categorizer, "authenticate_supabase", return_value=("url", "key", "token")),
            patch.object(categorizer, "read_uncategorized_items", return_value=[]),
            patch.object(categorizer, "categorize_batch") as model,
            patch("sys.stdout", new_callable=io.StringIO) as stdout,
        ):
            categorizer.main()
        self.assertIn("No uncategorized receipt items", stdout.getvalue())
        model.assert_not_called()

    def test_only_high_confidence_items_are_conditionally_updated(self):
        items = [
            {"id": "a", "name": "Milk", "category": None},
            {"id": "b", "name": "Bread", "category": "  "},
            {"id": "c", "name": "Unknown", "category": None},
            {"id": "d", "name": "Maybe", "category": None},
        ]
        predictions = [
            {"index": 0, "category": "Dairy", "confidence": "high"},
            {"index": 1, "category": "Bakery", "confidence": "high"},
            {"index": 2, "category": None, "confidence": "low"},
            {"index": 3, "category": "Fruit", "confidence": "low"},
        ]
        with (
            patch.object(categorizer, "categorize_batch", return_value=predictions),
            patch.object(categorizer, "send_supabase_request", side_effect=[[{"id": "a"}], []]) as request,
        ):
            updated, uncertain = categorizer.categorize_items("url", "key", "token", items)
        self.assertEqual((updated, uncertain), (1, 2))
        self.assertEqual(request.call_count, 2)
        self.assertIn("id=eq.a&category=is.null", request.call_args_list[0].args[4])
        self.assertIn("id=eq.b&category=eq.%20%20", request.call_args_list[1].args[4])
        self.assertEqual(request.call_args_list[0].args[5], {"category": "Dairy"})


if __name__ == "__main__":
    unittest.main()
