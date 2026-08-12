from unittest.mock import Mock, patch

from django.test import TestCase
from django.contrib.auth import get_user_model

from notifications.models import DeviceToken
from notifications.push_service import ExpoPushError, _send_expo, send_push_notification

User = get_user_model()


def _response(status_code=200, json_data=None):
    resp = Mock()
    resp.status_code = status_code
    resp.json.return_value = json_data or {}
    if status_code >= 400:
        resp.raise_for_status.side_effect = Exception(f'HTTP {status_code}')
    else:
        resp.raise_for_status.return_value = None
    return resp


class SendExpoTests(TestCase):
    """_send_expo — the real Expo Push API call (Lot 4.1/4.2)."""

    @patch('notifications.push_service.requests.post')
    def test_success_posts_to_expo_relay(self, mock_post):
        mock_post.return_value = _response(json_data={'data': {'status': 'ok', 'id': 'ticket-1'}})

        _send_expo('ExponentPushToken[abc]', 'Titre', 'Corps', {'job_id': 1})

        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs['json']['to'], 'ExponentPushToken[abc]')
        self.assertEqual(kwargs['json']['title'], 'Titre')
        self.assertEqual(kwargs['json']['data'], {'job_id': 1})

    @patch('notifications.push_service.requests.post')
    def test_device_not_registered_raises_with_matching_phrase(self, mock_post):
        # Expo returns HTTP 200 with a per-ticket error — never an HTTP error —
        # for a stale/uninstalled token. The raised message must contain
        # "not registered" verbatim so _is_token_invalid_error() catches it.
        mock_post.return_value = _response(json_data={
            'data': {'status': 'error', 'details': {'error': 'DeviceNotRegistered'}},
        })

        with self.assertRaises(ExpoPushError) as ctx:
            _send_expo('ExponentPushToken[stale]', 'Titre', 'Corps', {})

        self.assertIn('not registered', str(ctx.exception))

    @patch('notifications.push_service.requests.post')
    def test_other_ticket_error_raises(self, mock_post):
        mock_post.return_value = _response(json_data={
            'data': {'status': 'error', 'details': {'error': 'MessageTooBig'}, 'message': 'too big'},
        })

        with self.assertRaises(ExpoPushError):
            _send_expo('ExponentPushToken[x]', 'Titre', 'Corps', {})


class SendPushNotificationModeTests(TestCase):
    """4.4 — sandbox deliveries must never be counted as real 'sent'."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='push_user',
            email='push@test.tn',
            password='SecurePass123!',
            role='TRANSPORTER',
        )
        DeviceToken.objects.create(
            user=self.user,
            platform='ANDROID',
            token='ExponentPushToken[live]',
        )

    def test_sandbox_mode_counts_as_logged_not_sent(self):
        with patch('notifications.push_service.PUSH_MODE', 'SANDBOX'):
            result = send_push_notification(self.user, 'Titre', 'Corps', {})

        self.assertEqual(result['mode'], 'SANDBOX')
        self.assertEqual(result['sent'], 0)
        self.assertEqual(result['logged'], 1)
        self.assertEqual(result['failed'], 0)

    @patch('notifications.push_service._send_expo')
    def test_production_mode_counts_as_sent(self, mock_send_expo):
        mock_send_expo.return_value = None
        with patch('notifications.push_service.PUSH_MODE', 'PRODUCTION'):
            result = send_push_notification(self.user, 'Titre', 'Corps', {})

        self.assertEqual(result['sent'], 1)
        self.assertEqual(result['logged'], 0)
        mock_send_expo.assert_called_once()

    @patch('notifications.push_service._send_expo')
    def test_production_mode_deactivates_unregistered_token(self, mock_send_expo):
        mock_send_expo.side_effect = ExpoPushError('Expo push token not registered: xyz')
        with patch('notifications.push_service.PUSH_MODE', 'PRODUCTION'):
            result = send_push_notification(self.user, 'Titre', 'Corps', {})

        self.assertEqual(result['failed'], 1)
        self.assertFalse(
            DeviceToken.objects.get(user=self.user).is_active,
            'a DeviceNotRegistered error must deactivate the token',
        )
